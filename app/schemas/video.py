from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict


class KeyMomentOut(BaseModel):
    start_time: float
    end_time: float
    label: str = ""
    text: str = ""
    importance: float = 0.0


class KeywordOut(BaseModel):
    word: str
    score: float = 0.0


class VideoOut(BaseModel):
    id: str
    filename: str

    # Overall processing state
    status: str
    current_stage: str = "upload"

    # Overall progress
    progress: int = 0

    # Individual stage progress
    upload_progress: int = 100
    audio_progress: int = 0
    transcription_progress: int = 0
    summary_progress: int = 0
    key_moments_progress: int = 0
    highlights_progress: int = 0
    keywords_progress: int = 0

    # Processing results
    transcript: str = ""
    short_summary: str = ""
    summary: str = ""  # detailed summary
    key_moments: List[KeyMomentOut] = []
    highlights: List[KeyMomentOut] = []
    keywords: List[KeywordOut] = []

    # Error information
    error_message: str = ""

    uploaded_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )