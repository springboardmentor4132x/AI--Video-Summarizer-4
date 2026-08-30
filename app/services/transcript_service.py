import os
import shutil
import subprocess
import whisper

_whisper_model = None


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


def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        _whisper_model = whisper.load_model("base")
    return _whisper_model

def extract_audio(video_path: str) -> str:
    audio_path = os.path.splitext(video_path)[0] + "_audio.wav"
    command = [
        _ffmpeg_path(), "-y", "-i", video_path,
        "-vn", "-acodec", "pcm_s16le",
        "-ar", "16000", "-ac", "1", audio_path,
    ]
    subprocess.run(command, check=True, capture_output=True, text=True)
    return audio_path

def transcribe_audio(audio_path: str) -> str:
    model = get_whisper_model()
    result = model.transcribe(audio_path)
    return result["text"].strip()
