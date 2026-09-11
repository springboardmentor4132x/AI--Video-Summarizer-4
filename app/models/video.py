"""
Video document for uploaded videos and processing results.
"""

from datetime import datetime, timezone
from typing import List

from beanie import Document, Indexed
from pydantic import BaseModel, Field


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TranscriptSegment(BaseModel):
    """One timestamped Whisper transcript segment."""

    start_time: float
    end_time: float
    text: str = ""


class KeyMoment(BaseModel):
    """One detected important moment in a video."""

    start_time: float
    end_time: float
    label: str = ""
    text: str = ""
    importance: float = 0.0


class Keyword(BaseModel):
    """One extracted keyword/topic and its relevance score."""

    word: str
    score: float = 0.0


class Video(Document):
    user_id: Indexed(str)

    filename: str
    file_path: str

    # Overall processing state
    # uploaded | processing | done | failed
    status: str = "uploaded"

    # Current processing stage
    # upload | audio | transcription | summary | key_moments |
    # highlights | keywords | done | failed
    current_stage: str = "upload"

    # Overall completion percentage
    progress: int = 0

    # Individual processing stage progress
    upload_progress: int = 100
    audio_progress: int = 0
    transcription_progress: int = 0
    summary_progress: int = 0
    key_moments_progress: int = 0
    highlights_progress: int = 0
    keywords_progress: int = 0

    # Processing results
    transcript: str = ""
    transcript_segments: List[TranscriptSegment] = []

    # Module 3/4 summaries
    short_summary: str = ""
    summary: str = ""

    # Module 3/4 analysis
    key_moments: List[KeyMoment] = []
    highlights: List[KeyMoment] = []
    keywords: List[Keyword] = []

    # Error information
    error_message: str = ""

    uploaded_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "videos"