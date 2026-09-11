"""
Service package exports.

Keeps the existing video-processing pipeline available while
also exposing the new Module 3/4 services.
"""

from app.services.legacy import (
    extract_audio,
    generate_summary,
    get_openai_client,
    get_whisper_model,
    process_video,
    transcribe_audio,
    update_progress,
)

__all__ = [
    "extract_audio",
    "generate_summary",
    "get_openai_client",
    "get_whisper_model",
    "process_video",
    "transcribe_audio",
    "update_progress",
]
