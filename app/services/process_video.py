"""
Core video-processing pipeline: audio extraction -> Whisper transcription
-> local summarization -> key moments -> highlights -> keywords.

None of this pipeline depends on OpenAI or any external paid API. All
AI in this project (transcription, summarization, Q&A, translation)
runs on locally-executed open-source models -- see
app/services/model_manager.py for centralized model loading, and
app/services/qa_service.py / translation_service.py for the local
Q&A and translation implementations.
"""

import os
import shutil
import subprocess

from app.core.config import settings
from app.models.video import Video, TranscriptSegment, KeyMoment, Keyword
from app.services.highlight_service import generate_highlights
from app.services.key_moments_service import detect_key_moments
from app.services.keyword_service import extract_keywords
from app.services.summary_service import generate_summaries
from app.services.model_manager import get_whisper_model


def _ffmpeg_path() -> str:
    path = shutil.which("ffmpeg")
    if path:
        return path
    winget_glob = os.path.join(
        os.environ.get("LOCALAPPDATA", ""),
        "Microsoft", "WinGet", "Packages",
    )
    if os.path.isdir(winget_glob):
        for root, _, files in os.walk(winget_glob):
            if "ffmpeg.exe" in files:
                return os.path.join(root, "ffmpeg.exe")
    raise FileNotFoundError(
        "FFmpeg not found. Install it and ensure ffmpeg is on your PATH."
    )


def get_whisper_model_cached():
    """Reuses the model_manager's cached Whisper instance instead of
    reloading it (slow, memory-hungry) per video."""
    return get_whisper_model(settings.WHISPER_MODEL_NAME)


async def update_progress(
    video: Video,
    *,
    status: str | None = None,
    current_stage: str | None = None,
    progress: int | None = None,
    upload_progress: int | None = None,
    audio_progress: int | None = None,
    transcription_progress: int | None = None,
    summary_progress: int | None = None,
):
    if status is not None:
        video.status = status

    if current_stage is not None:
        video.current_stage = current_stage

    if progress is not None:
        video.progress = progress

    if upload_progress is not None:
        video.upload_progress = upload_progress

    if audio_progress is not None:
        video.audio_progress = audio_progress

    if transcription_progress is not None:
        video.transcription_progress = transcription_progress

    if summary_progress is not None:
        video.summary_progress = summary_progress

    await video.save()


def extract_audio(video_path: str) -> str:
    audio_path = os.path.splitext(video_path)[0] + "_audio.wav"

    command = [
        _ffmpeg_path(),
        "-y",
        "-i",
        video_path,
        "-vn",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "16000",
        "-ac",
        "1",
        audio_path,
    ]

    subprocess.run(
        command,
        check=True,
        capture_output=True,
        text=True,
    )

    return audio_path


def transcribe_audio(audio_path: str) -> dict:
    """
    Run Whisper transcription and return BOTH the flat text and the
    per-segment timestamps (result["segments"]), which
    key_moments_service.detect_key_moments needs for real segment-based
    detection instead of the equal-chunk fallback.
    """
    model = get_whisper_model_cached()

    result = model.transcribe(audio_path)

    text = result["text"].strip()

    segments = [
        {
            "start_time": round(float(seg["start"]), 2),
            "end_time": round(float(seg["end"]), 2),
            "text": seg["text"].strip(),
        }
        for seg in result.get("segments", [])
    ]

    return {
        "text": text,
        "segments": segments,
    }


def generate_summary(transcript: str) -> tuple[str, str]:
    """Generate both a short overview and a genuinely distinct detailed
    summary, entirely locally via the Hugging Face BART pipeline in
    summary_service.py (no network call, no API key required).

    Returns (short_summary, detailed_summary).
    """
    if not transcript.strip():
        placeholder = "No speech was detected in the video."
        return placeholder, placeholder

    result = generate_summaries(transcript)
    return result["short_summary"], result["detailed_summary"]


async def process_video(video: Video) -> None:
    audio_path = None

    try:
        # ---------------------------------------------
        # STEP 1 — PROCESSING STARTED
        # ---------------------------------------------

        await update_progress(
            video,
            status="processing",
            current_stage="audio",
            progress=10,
            upload_progress=100,
            audio_progress=0,
            transcription_progress=0,
            summary_progress=0,
        )

        # ---------------------------------------------
        # STEP 2 — AUDIO EXTRACTION
        # ---------------------------------------------

        await update_progress(
            video,
            current_stage="audio",
            progress=20,
            audio_progress=10,
        )

        audio_path = extract_audio(video.file_path)

        await update_progress(
            video,
            current_stage="audio",
            progress=40,
            audio_progress=100,
        )

        # ---------------------------------------------
        # STEP 3 — WHISPER TRANSCRIPTION (+ SEGMENTS)
        # ---------------------------------------------

        await update_progress(
            video,
            current_stage="transcription",
            progress=50,
            transcription_progress=10,
        )

        transcription = transcribe_audio(audio_path)

        video.transcript = transcription["text"]
        video.transcript_segments = [
            TranscriptSegment(**seg) for seg in transcription["segments"]
        ]
        video.error_message = ""

        await update_progress(
            video,
            current_stage="transcription",
            progress=75,
            transcription_progress=100,
        )

        # ---------------------------------------------
        # STEP 4 — LOCAL AI SUMMARY (facebook/bart-large-cnn)
        # ---------------------------------------------
        #
        # Summary is best-effort: if the local model fails to load or
        # errors out (e.g. insufficient memory), the transcript itself
        # is still considered a successful result rather than failing
        # the whole video.
        # ---------------------------------------------

        await update_progress(
            video,
            current_stage="summary",
            progress=80,
            summary_progress=10,
        )

        try:
            short_summary, detailed_summary = generate_summary(video.transcript)

            video.summary = detailed_summary
            video.short_summary = short_summary
            video.summary_progress = 100
            video.error_message = ""

            await video.save()

        except Exception as summary_error:
            # Do NOT fail the entire video because the
            # optional AI summary failed.
            video.summary = ""
            video.short_summary = ""
            video.summary_progress = 0
            video.error_message = (
                f"Transcript completed. AI summary unavailable: "
                f"{summary_error}"
            )

            await video.save()

        # ---------------------------------------------
        # STEP 5 — KEY MOMENTS, HIGHLIGHTS, KEYWORDS
        # ---------------------------------------------
        #
        # These run automatically as part of the pipeline (not only on
        # a separate manual API call) — best-effort like summary: a
        # failure here is recorded in error_message and does not fail
        # the whole video, since transcript + audio already succeeded.
        # ---------------------------------------------

        video.current_stage = "key_moments"
        video.key_moments_progress = 10
        await video.save()

        try:
            segments = [
                {
                    "start_time": segment.start_time,
                    "end_time": segment.end_time,
                    "text": segment.text,
                }
                for segment in video.transcript_segments
            ]

            moments = detect_key_moments(
                video.transcript,
                transcript_segments=segments,
            )

            video.key_moments = [KeyMoment(**m) for m in moments]
            video.key_moments_progress = 100

        except Exception as key_moment_error:
            video.key_moments = []
            video.key_moments_progress = 0
            video.error_message = (
                f"{video.error_message} Key moments unavailable: {key_moment_error}".strip()
            )

        await video.save()

        video.current_stage = "highlights"
        video.highlights_progress = 10
        await video.save()

        try:
            key_moment_dicts = [km.model_dump() for km in video.key_moments]
            highlight_dicts = generate_highlights(key_moment_dicts)

            video.highlights = [KeyMoment(**h) for h in highlight_dicts]
            video.highlights_progress = 100

        except Exception as highlight_error:
            video.highlights = []
            video.highlights_progress = 0
            video.error_message = (
                f"{video.error_message} Highlights unavailable: {highlight_error}".strip()
            )

        await video.save()

        video.current_stage = "keywords"
        video.keywords_progress = 10
        await video.save()

        try:
            keyword_dicts = extract_keywords(video.transcript)

            video.keywords = [Keyword(**k) for k in keyword_dicts]
            video.keywords_progress = 100

        except Exception as keyword_error:
            video.keywords = []
            video.keywords_progress = 0
            video.error_message = (
                f"{video.error_message} Keywords unavailable: {keyword_error}".strip()
            )

        await video.save()

        # ---------------------------------------------
        # STEP 6 — COMPLETED
        # ---------------------------------------------

        await update_progress(
            video,
            status="done",
            current_stage="done",
            progress=100,
            upload_progress=100,
            audio_progress=100,
            transcription_progress=100,
            summary_progress=video.summary_progress,
        )

    except Exception as exc:
        # These are actual processing failures:
        # upload/audio extraction/transcription errors.
        video.status = "failed"
        video.current_stage = "failed"
        video.error_message = str(exc)

        await video.save()

    finally:
        # ---------------------------------------------
        # CLEAN UP TEMPORARY AUDIO
        # ---------------------------------------------

        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except OSError:
                pass
