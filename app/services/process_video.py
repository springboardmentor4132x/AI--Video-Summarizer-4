import os

from app.services.transcript_service import extract_audio, transcribe_audio


async def process_video(video):
    """Extract audio and transcribe. Summary is generated on-demand via the API."""
    audio_path = None
    try:
        video.status = "processing"
        video.current_stage = "audio"
        video.progress = 25
        video.audio_progress = 10
        await video.save()

        audio_path = extract_audio(video.file_path)

        video.audio_progress = 100
        video.current_stage = "transcription"
        video.progress = 50
        video.transcription_progress = 10
        await video.save()

        transcript = transcribe_audio(audio_path)
        video.transcript = transcript
        video.transcription_progress = 100
        video.progress = 75
        video.current_stage = "transcription"
        video.status = "processing"
        await video.save()

    except Exception as exc:
        video.status = "failed"
        video.current_stage = "failed"
        video.error_message = str(exc)
        await video.save()

    finally:
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except OSError:
                pass
