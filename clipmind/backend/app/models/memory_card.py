"""A user's timestamp-linked flashcard and adaptive review state."""

from datetime import datetime, timezone

from beanie import Document, Indexed
from pydantic import Field


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class MemoryCard(Document):
    user_id: Indexed(str)
    video_id: Indexed(str)
    video_filename: str
    prompt: str
    answer: str
    source_label: str = ""
    source_start: float
    source_end: float
    strength: str = "needs_review"
    review_count: int = 0
    last_reviewed_at: datetime | None = None
    next_review_at: datetime = Field(default_factory=_utcnow)
    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "memory_cards"