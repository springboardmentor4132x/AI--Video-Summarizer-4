import os
import subprocess
import tempfile

import whisper

from app.core.config import settings
from app.models.video import Video


_whisper_model = None


def get_whisper_model():
    global _whisper_model

    if _whisper_model is None:
        _whisper_model = whisper.load_model("base")

    return _whisper_model


def extract_audio(video_path: str) -> str:
    audio_path = os.path.splitext(video_path)[0] + "_audio.wav"

    command = [
        "ffmpeg",
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


def transcribe_audio(audio_path: str) -> str:
    model = get_whisper_model()
    result = model.transcribe(audio_path)
    return result["text"].strip()


async def process_video(video: Video) -> None:
    audio_path = None

    try:
        video.status = "processing"
        video.error_message = ""
        await video.save()

        audio_path = extract_audio(video.file_path)

        transcript = transcribe_audio(audio_path)

        video.transcript = transcript
        video.status = "done"
        await video.save()

    except Exception as exc:
        video.status = "failed"
        video.error_message = str(exc)
        await video.save()

    finally:
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except OSError:
                pass