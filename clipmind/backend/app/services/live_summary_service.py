"""Capture public YouTube Live/HLS audio and incrementally process it."""

import asyncio
import ipaddress
import logging
import os
import re
import shutil
import socket
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

from beanie import PydanticObjectId
from app.core.config import settings
from app.models.live_summary import LiveSummarySession, LiveTranscriptSegment
from app.services.model_manager import get_whisper_model
from app.services.process_video import _ffmpeg_path
from app.services.summary_service import generate_summaries

CHUNK_SECONDS = 15
SUMMARY_EVERY_CHUNKS = 3
YOUTUBE_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"}
logger = logging.getLogger(__name__)
_LIVE_TASKS: dict[str, asyncio.Task] = {}


def _assert_public_hostname(hostname: str) -> None:
    """Reject non-public DNS results before passing user URLs to FFmpeg."""
    try:
        addresses = {
            result[4][0]
            for result in socket.getaddrinfo(hostname, None, type=socket.SOCK_STREAM)
        }
    except OSError as exc:
        raise ValueError("The stream host could not be resolved.") from exc
    if not addresses or any(not ipaddress.ip_address(address).is_global for address in addresses):
        raise ValueError("Use a publicly reachable stream URL.")


def validate_live_source_url(url: str) -> str:
    """Return the supported source kind or reject unsupported/unsafe URLs."""
    value = url.strip()
    if len(value) > 2048:
        raise ValueError("The stream URL is too long.")
    try:
        parsed = urlsplit(value)
        host = (parsed.hostname or "").lower().rstrip(".")
        port = parsed.port
    except ValueError as exc:
        raise ValueError("Enter a valid YouTube Live or HLS stream URL.") from exc
    if parsed.scheme not in {"http", "https"} or not host or parsed.username or parsed.password:
        raise ValueError("Enter a valid YouTube Live or HLS stream URL.")

    if host in YOUTUBE_HOSTS:
        if parsed.scheme != "https":
            raise ValueError("YouTube Live links must use HTTPS.")
        return "youtube_live"

    if parsed.path.lower().endswith(".m3u8"):
        _assert_public_hostname(host)
        if port and not 1 <= port <= 65535:
            raise ValueError("The stream URL has an invalid port.")
        return "hls"

    raise ValueError("Supported sources are public YouTube Live links and direct HLS (.m3u8) streams.")


def _youtube_download_options() -> dict:
    options = {
        "format": "bestaudio/best",
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "skip_download": True,
        "socket_timeout": 15,
    }
    configured_cookie_file = settings.YOUTUBE_COOKIES_FILE.strip()
    if configured_cookie_file:
        cookie_file = Path(configured_cookie_file).expanduser().resolve()
        if not cookie_file.is_file():
            raise FileNotFoundError("Configured YOUTUBE_COOKIES_FILE does not exist.")
        options["cookiefile"] = str(cookie_file)
    return options


def _resolve_youtube_stream(url: str) -> str:
    """Resolve a YouTube Live page using optional, local viewer cookies."""
    import yt_dlp

    options = _youtube_download_options()
    with yt_dlp.YoutubeDL(options) as downloader:
        info = downloader.extract_info(url, download=False)
    if not info.get("is_live") and info.get("live_status") != "is_live":
        raise RuntimeError("This YouTube video is not currently live.")
    stream_url = info.get("url")
    if not stream_url and info.get("requested_formats"):
        stream_url = info["requested_formats"][0].get("url")
    if not stream_url:
        raise RuntimeError("YouTube did not provide a playable live audio stream.")
    return stream_url


async def mark_interrupted_live_sessions() -> None:
    """Mark captures from a previous server process so users can restart."""
    sessions = await LiveSummarySession.find(
        {"status": {"$in": ["starting", "live"]}}
    ).to_list()
    for session in sessions:
        session.status = "failed"
        session.error_message = "Live capture stopped when the backend restarted. Start a new session."
        await _save_session(session)


def schedule_live_capture(session: LiveSummarySession, url: str) -> None:
    session_id = str(session.id)
    task = asyncio.create_task(_capture_live_stream(session_id, url, session.source_kind))
    _LIVE_TASKS[session_id] = task
    task.add_done_callback(lambda _task: _LIVE_TASKS.pop(session_id, None))


async def stop_live_capture(session_id: str) -> None:
    task = _LIVE_TASKS.get(session_id)
    if task is not None and not task.done():
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


async def _read_stderr(stream) -> str:
    recent = bytearray()
    while True:
        line = await stream.readline()
        if not line:
            break
        recent.extend(line)
        if len(recent) > 4096:
            del recent[:-4096]
    return recent.decode("utf-8", errors="replace")


def _transcribe_chunk(audio_path: str) -> list[dict]:
    model = get_whisper_model(settings.WHISPER_MODEL_NAME)
    result = model.transcribe(audio_path, fp16=False)
    return [
        {
            "start_time": float(segment["start"]),
            "end_time": float(segment["end"]),
            "text": segment["text"].strip(),
        }
        for segment in result.get("segments", [])
        if segment.get("text", "").strip()
    ]


def _capture_error_message(
    stage: str,
    exception_name: str = "",
    exception_detail: str = "",
) -> str:
    if stage == "resolve":
        normalized_detail = exception_detail.lower()
        if "youtube_cookies_file" in normalized_detail:
            return (
                "YOUTUBE_COOKIES_FILE is configured but the cookie file cannot be found. "
                "Check the path in backend/.env and restart the backend."
            )
        if "sign in to confirm" in normalized_detail or "not a bot" in normalized_detail:
            return (
                "YouTube is blocking anonymous stream extraction with a sign-in/bot verification. "
                "A public watch page can still block automated playback."
                " Configure YOUTUBE_COOKIES_FILE with a private local cookie export for an account allowed to view it, "
                "or use a publicly accessible direct HLS (.m3u8) stream."
            )
        return (
            "The YouTube page is public, but its live audio could not be resolved. "
            "Make sure it is an active Live broadcast, not a regular or scheduled video; "
            "age/region restrictions or YouTube changes can also block extraction."
        )
    if stage == "transcribe":
        return (
            "Audio was captured, but local Whisper could not transcribe it. "
            "Check that the Whisper model is available and try again."
        )
    if exception_name == "FileNotFoundError":
        return "FFmpeg is not available to capture this stream. Install FFmpeg and restart the backend."
    return (
        "The URL is public, but FFmpeg could not read its audio stream. "
        "For YouTube, use an active Live broadcast; for HLS, use a direct, openly accessible .m3u8 playlist."
    )


def _ffmpeg_error_message(stderr: str) -> str:
    detail = stderr.lower()
    if "403" in detail or "forbidden" in detail:
        return (
            "The public page resolved, but its media server denied FFmpeg access. "
            "Use an active YouTube Live URL or a direct HLS link that permits external playback."
        )
    if "404" in detail or "not found" in detail:
        return "The media stream was not found. Check that the broadcast is live and the HLS link is current."
    if "timed out" in detail or "timeout" in detail:
        return "The media stream timed out before audio could be captured. Check the stream and try again."
    if "invalid data" in detail or "unknown format" in detail:
        return "The resolved link did not provide a supported audio stream. Use an active YouTube Live or direct .m3u8 link."
    return _capture_error_message("capture")


async def _save_session(session: LiveSummarySession) -> None:
    session.updated_at = datetime.now(timezone.utc)
    await session.save()


async def _process_chunk(session: LiveSummarySession, audio_path: Path, chunk_index: int, speech_chunks: int) -> int:
    segments = await asyncio.to_thread(_transcribe_chunk, str(audio_path))
    offset = chunk_index * CHUNK_SECONDS
    if segments:
        additions = [
            LiveTranscriptSegment(
                start_time=round(offset + segment["start_time"], 2),
                end_time=round(offset + segment["end_time"], 2),
                text=segment["text"],
            )
            for segment in segments
        ]
        session.transcript_segments.extend(additions)
        session.transcript = " ".join(segment.text for segment in session.transcript_segments)
        session.elapsed_seconds = max(session.elapsed_seconds, offset + CHUNK_SECONDS)
        await _save_session(session)
        speech_chunks += 1

        if speech_chunks % SUMMARY_EVERY_CHUNKS == 0:
            try:
                summaries = await asyncio.to_thread(generate_summaries, session.transcript)
                session.short_summary = summaries["short_summary"]
                session.summary = summaries["detailed_summary"]
                await _save_session(session)
            except Exception:
                session.error_message = "Transcript is live; the local summary model is currently unavailable."
                await _save_session(session)
    return speech_chunks


async def _terminate_process(process) -> None:
    if process is None or process.returncode is not None:
        return
    process.terminate()
    try:
        await asyncio.wait_for(process.wait(), timeout=3)
    except asyncio.TimeoutError:
        process.kill()
        await process.wait()


async def _capture_live_stream(session_id: str, url: str, source_kind: str) -> None:
    session = await LiveSummarySession.get(PydanticObjectId(session_id))
    if session is None:
        return
    temp_dir = tempfile.mkdtemp(prefix="clipmind-live-")
    process = None
    stderr_task = None
    processed: set[str] = set()
    stable_sizes: dict[str, tuple[int, int]] = {}
    speech_chunks = 0
    stage = "resolve" if source_kind == "youtube_live" else "capture"
    try:
        stream_url = url
        if source_kind == "youtube_live":
            stream_url = await asyncio.to_thread(_resolve_youtube_stream, url)
        stage = "capture"

        output_pattern = os.path.join(temp_dir, "audio_%06d.wav")
        command = [
            _ffmpeg_path(), "-nostdin", "-hide_banner", "-loglevel", "error",
            "-rw_timeout", "15000000",
            "-protocol_whitelist", "http,https,tcp,tls,crypto",
            "-i", stream_url,
            "-vn", "-ac", "1", "-ar", "16000",
            "-f", "segment", "-segment_time", str(CHUNK_SECONDS),
            "-reset_timestamps", "1", "-segment_format", "wav", output_pattern,
        ]
        process = await asyncio.create_subprocess_exec(
            *command,
            stdin=asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        stderr_task = asyncio.create_task(_read_stderr(process.stderr))
        session.status = "live"
        session.error_message = ""
        await _save_session(session)

        while process.returncode is None:
            for audio_path in sorted(Path(temp_dir).glob("audio_*.wav")):
                key = audio_path.name
                if key in processed:
                    continue
                try:
                    size = audio_path.stat().st_size
                except FileNotFoundError:
                    continue
                old_size, stable_count = stable_sizes.get(key, (-1, 0))
                stable_count = stable_count + 1 if old_size == size else 0
                stable_sizes[key] = (size, stable_count)
                if size <= 44 or stable_count < 2:
                    continue
                processed.add(key)
                chunk_match = re.search(r"_(\d+)\.wav$", key)
                chunk_index = int(chunk_match.group(1)) if chunk_match else len(processed) - 1
                stage = "transcribe"
                speech_chunks = await _process_chunk(session, audio_path, chunk_index, speech_chunks)
                stage = "capture"
                audio_path.unlink(missing_ok=True)

            if process.returncode is None:
                await asyncio.sleep(1)

        stderr = await stderr_task if stderr_task is not None else ""
        for audio_path in sorted(Path(temp_dir).glob("audio_*.wav")):
            if audio_path.name in processed or audio_path.stat().st_size <= 44:
                continue
            chunk_match = re.search(r"_(\d+)\.wav$", audio_path.name)
            chunk_index = int(chunk_match.group(1)) if chunk_match else len(processed)
            stage = "transcribe"
            speech_chunks = await _process_chunk(session, audio_path, chunk_index, speech_chunks)
            stage = "capture"
            audio_path.unlink(missing_ok=True)

        if process.returncode == 0:
            session.status = "ended"
            session.error_message = ""
        else:
            session.status = "failed"
            session.error_message = _ffmpeg_error_message(stderr)
        await _save_session(session)
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        logger.error("Live summary failed during %s (%s)", stage, type(exc).__name__)
        session.status = "failed"
        session.error_message = _capture_error_message(
            stage,
            type(exc).__name__,
            str(exc),
        )
        await _save_session(session)
    finally:
        await _terminate_process(process)
        if stderr_task is not None and not stderr_task.done():
            stderr_task.cancel()
        shutil.rmtree(temp_dir, ignore_errors=True)