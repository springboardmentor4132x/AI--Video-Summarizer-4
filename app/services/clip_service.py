"""
Real clip generation via FFmpeg -- extracts an actual video segment,
never a fake/placeholder file.

Reuses the same _ffmpeg_path() discovery logic as process_video.py
(kept as a local copy rather than importing it, since process_video.py
imports whisper at module load time, which would make this service
unnecessarily pull that in too, and clip generation has no
Whisper/model dependency at all).
"""

import os
import shutil
import subprocess
import uuid


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


def validate_clip_range(start: float, end: float, video_duration: float | None) -> None:
    """Raise ValueError with a clear message for any invalid range."""
    if start < 0:
        raise ValueError("Start time must be 0 or later.")
    if end <= start:
        raise ValueError("End time must be after the start time.")
    if video_duration is not None and end > video_duration:
        raise ValueError(
            f"End time ({end}s) exceeds the video's duration ({video_duration}s)."
        )


def generate_clip(source_path: str, start: float, end: float, output_dir: str) -> tuple[str, str]:
    """Extract [start, end] seconds from source_path into a new file.

    Returns (file_path, filename). Raises RuntimeError with FFmpeg's own
    stderr on failure -- never silently produces an empty/fake file.
    Uses stream copy (-c copy) for speed; if that fails on a given file
    (some containers don't allow copy at arbitrary cut points), falls
    back to a real re-encode rather than giving up.
    """
    if not os.path.exists(source_path):
        raise FileNotFoundError("Source video file not found on disk.")

    os.makedirs(output_dir, exist_ok=True)
    filename = f"clip_{uuid.uuid4().hex}.mp4"
    output_path = os.path.join(output_dir, filename)

    duration = end - start
    base_cmd = [
        _ffmpeg_path(), "-y",
        "-ss", str(start),
        "-i", source_path,
        "-t", str(duration),
    ]

    # First attempt: fast stream copy.
    copy_cmd = base_cmd + ["-c", "copy", output_path]
    result = subprocess.run(copy_cmd, capture_output=True, text=True)

    if result.returncode != 0 or not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
        # Fall back to a real re-encode rather than leaving a broken/empty file.
        if os.path.exists(output_path):
            os.remove(output_path)
        reencode_cmd = base_cmd + [
            "-c:v", "libx264", "-c:a", "aac", output_path,
        ]
        result = subprocess.run(reencode_cmd, capture_output=True, text=True)

    if result.returncode != 0 or not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
        if os.path.exists(output_path):
            os.remove(output_path)
        raise RuntimeError(f"FFmpeg clip generation failed: {result.stderr[-500:]}")

    return output_path, filename
