"""
Video document for uploaded videos and processing results.
"""

from datetime import datetime, timezone
from typing import List

from beanie import Document, Indexed
from pydantic import BaseModel, Field


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class KeyMoment(BaseModel):
    """
    One detected 'important moment' in a video. Embedded inside the
    Video document (same pattern as transcript/summary being plain
    fields, not a separate collection). Also reused for highlights,
    since a highlight is just a top-ranked key moment.
    """
    start_time: float          # seconds from video start
    end_time: float            # seconds from video start
    label: str = ""            # short human-readable title
    text: str = ""             # transcript excerpt this moment covers
    importance: float = 0.0    # 0.0-1.0 relevance/importance score


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
    # upload | audio | transcription | summary | key_moments | highlights | keywords | done | failed
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
    short_summary: str = ""
    summary: str = ""  # detailed summary
    key_moments: List[KeyMoment] = []
    highlights: List[KeyMoment] = []
    keywords: List[Keyword] = []

    # Error information
    error_message: str = ""

    uploaded_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "videos"