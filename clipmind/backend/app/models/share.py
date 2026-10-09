"""VideoShare -- an educator (or any owner) shares a video read-only with a user."""

from datetime import datetime, timezone

from beanie import Document, Indexed
from pydantic import Field


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class VideoShare(Document):
    video_id: Indexed(str)
    owner_id: Indexed(str)
    student_id: Indexed(str)
    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "video_shares"
