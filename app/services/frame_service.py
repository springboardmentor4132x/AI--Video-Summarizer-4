"""
Real video-frame extraction via FFmpeg (one JPEG per requested timestamp).

Reuses clip_service._ffmpeg_path() -- the project's existing FFmpeg
discovery logic -- rather than adding a second copy of it. Like the
clip service, this module has no Whisper/model dependency.

Never writes a fake or placeholder image: if FFmpeg cannot produce a
real frame, a RuntimeError is raised and the caller decides how to
degrade.
"""

import os
import subprocess
from typing import Optional

from app.services.clip_service import _ffmpeg_path

FRAME_WIDTH = 960  # downscale wide sources; keeps files small for the UI


def probe_duration(source_path: str) -> Optional[float]:
    """Best-effort video duration in seconds via ffprobe; None if unavailable."""
    try:
        ffmpeg = _ffmpeg_path()
        ffprobe = os.path.join(
            os.path.dirname(ffmpeg),
            "ffprobe.exe" if ffmpeg.lower().endswith(".exe") else "ffprobe",
        )
        if not os.path.exists(ffprobe):
            ffprobe = "ffprobe"
        result = subprocess.run(
            [
                ffprobe, "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                source_path,
            ],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode != 0:
            return None
        return float(result.stdout.strip())
    except (FileNotFoundError, ValueError, subprocess.SubprocessError, OSError):
        return None


def _extract_once(ffmpeg: str, source_path: str, timestamp: float, output_path: str) -> bool:
    cmd = [
        ffmpeg, "-y",
        "-ss", f"{max(timestamp, 0.0):.3f}",   # input-side seek: fast on long videos
        "-i", source_path,
        "-frames:v", "1",
        "-vf", f"scale='min({FRAME_WIDTH},iw)':-2",
        "-q:v", "3",
        output_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    ok = (
        result.returncode == 0
        and os.path.exists(output_path)
        and os.path.getsize(output_path) > 0
    )
    if not ok and os.path.exists(output_path):
        os.remove(output_path)
    return ok


def extract_frame(
    source_path: str,
    timestamp: float,
    output_path: str,
    duration: Optional[float] = None,
) -> float:
    """Write one JPEG frame of source_path near `timestamp` to output_path.

    Returns the timestamp the frame was actually taken at. If the exact
    time yields nothing (e.g. it is at/after the real end of the file),
    it retries slightly earlier, then at the very start, before giving
    up with RuntimeError. Raises FileNotFoundError if the source file or
    FFmpeg itself is missing.
    """
    if not os.path.exists(source_path):
        raise FileNotFoundError("Source video file not found on disk.")

    ffmpeg = _ffmpeg_path()  # raises FileNotFoundError if FFmpeg is missing
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    first = timestamp
    if duration is not None and duration > 0:
        first = min(first, max(duration - 0.2, 0.0))

    attempts = []
    for t in (first, first - 1.5, 0.0):
        t = max(t, 0.0)
        if t not in attempts:
            attempts.append(t)

    for t in attempts:
        if _extract_once(ffmpeg, source_path, t, output_path):
            return t

    raise RuntimeError("FFmpeg could not extract a frame from the video.")
