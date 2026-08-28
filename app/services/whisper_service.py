import time
from typing import Tuple


def transcribe_video(video_id: str) -> Tuple[str, str]:
    """
    MOCK Whisper transcription.
    Amrita/Nitesh: replace this body with the real FFmpeg -> Whisper pipeline.
    Keep the function name and signature the same.
    """
    time.sleep(0.2)  # simulate processing delay
    mock_transcript = (
        f"[MOCK TRANSCRIPT for video {video_id}] Machine learning is a branch of "
        "artificial intelligence that allows computers to learn patterns from data "
        "without being explicitly programmed. Replace this placeholder with real "
        "Whisper output once the pipeline is integrated."
    )
    return mock_transcript, "en"