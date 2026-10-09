"""
VideoComparison -- saved result of comparing two of a user's videos.
"""

from datetime import datetime, timezone
from typing import List, Optional

from beanie import Document, Indexed
from pydantic import BaseModel, Field


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ComparisonItem(BaseModel):
    # new | removed | changed | unchanged
    status: str
    text: str                              # the sentence (new-video wording when it exists)
    old_text: Optional[str] = None
    old_start: Optional[float] = None
    old_end: Optional[float] = None
    new_start: Optional[float] = None
    new_end: Optional[float] = None
    similarity: Optional[float] = None
    explanation: str = ""


class VideoComparison(Document):
    user_id: Indexed(str)
    old_video_id: Indexed(str)
    new_video_id: Indexed(str)
    old_filename: str = ""
    new_filename: str = ""

    counts: dict = {}
    similarity: float = 0.0
    verdict: str = ""
    truncated: bool = False
    items: List[ComparisonItem] = []

    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "video_comparisons"
