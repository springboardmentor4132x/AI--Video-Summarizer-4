"""
Bookmark document -- a user's saved timestamp + optional note on a video.

A separate Document (not embedded in Video) because bookmarks have their
own lifecycle (created/edited/deleted independently of video processing)
and their own ownership dimension distinct from the video itself: a
bookmark belongs to the user who made it, not to the video.
"""

from datetime import datetime, timezone

from beanie import Document, Indexed
from pydantic import Field


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Bookmark(Document):
    user_id: Indexed(str)
    video_id: Indexed(str)

    timestamp: float
    note: str = ""

    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "bookmarks"
