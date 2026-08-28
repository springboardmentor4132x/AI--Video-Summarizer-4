import os
import subprocess

from openai import OpenAI
import whisper

from app.core.config import settings
from app.models.video import Video


_whisper_model = None


def get_whisper_model():
    global _whisper_model

    if _whisper_model is None:
        _whisper_model = whisper.load_model("base")

    return _whisper_model


def get_openai_client():
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured.")

    return OpenAI(api_key=settings.OPENAI_API_KEY)


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


def generate_summary(transcript: str) -> str:
    if not transcript.strip():
        return "No speech was detected in the video."

    client = get_openai_client()

    response = client.responses.create(
        model="gpt-4o-mini",
        input=[
            {
                "role": "system",
                "content": (
                    "You are an expert video summarization assistant. "
                    "Create a clear, accurate and useful summary from "
                    "the provided transcript. Do not invent information "
                    "that is not present in the transcript."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Summarize this video transcript.\n\n"
                    "Provide:\n"
                    "1. A short overview in 2-3 sentences.\n"
                    "2. The main points as bullet points.\n"
                    "3. Important details or conclusions.\n\n"
                    f"Transcript:\n{transcript}"
                ),
            },
        ],
    )

    summary = response.output_text.strip()

    if not summary:
        raise RuntimeError("AI returned an empty summary.")

    return summary


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
        # STEP 3 — WHISPER TRANSCRIPTION
        # ---------------------------------------------

        await update_progress(
            video,
            current_stage="transcription",
            progress=50,
            transcription_progress=10,
        )

        transcript = transcribe_audio(audio_path)

        video.transcript = transcript
        video.error_message = ""

        await update_progress(
            video,
            current_stage="transcription",
            progress=75,
            transcription_progress=100,
        )

        # ---------------------------------------------
        # STEP 4 — AI SUMMARY
        # ---------------------------------------------
        #
        # Summary is OPTIONAL.
        #
        # If OpenAI quota is unavailable, the transcript
        # is still considered a successful result.
        # ---------------------------------------------

        await update_progress(
            video,
            current_stage="summary",
            progress=80,
            summary_progress=10,
        )

        try:
            summary = generate_summary(transcript)

            video.summary = summary
            video.summary_progress = 100
            video.error_message = ""

            await video.save()

        except Exception as summary_error:
            # Do NOT fail the entire video because the
            # optional AI summary failed.
            video.summary = ""
            video.summary_progress = 0
            video.error_message = (
                f"Transcript completed. AI summary unavailable: "
                f"{summary_error}"
            )

            await video.save()

        # ---------------------------------------------
        # STEP 5 — COMPLETED
        # ---------------------------------------------

        # The video is considered successfully processed
        # because audio extraction and transcription worked.
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