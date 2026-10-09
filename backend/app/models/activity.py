"""
VideoActivity -- where a user last stopped in a video.

Recorded by the video page while it plays. It is the source of truth for
"recently watched" and "unfinished" in ClipMind Daily and Time Machine,
so those features reflect real viewing instead of guesses.
"""

from datetime import datetime, timezone
from typing import Optional

from beanie import Document, Indexed
from pydantic import Field


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class VideoActivity(Document):
    user_id: Indexed(str)
    video_id: Indexed(str)

    last_position: float = 0.0           # seconds
    duration: Optional[float] = None     # seconds, as reported by the player
    open_count: int = 0
    last_opened_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "video_activity"
