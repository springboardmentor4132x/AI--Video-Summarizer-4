"""
DailyPlan -- one user's ClipMind Daily session for one calendar day.

Items are built from the user's real data (bookmarks, key moments,
unfinished videos) and stored with their completion state, so progress
survives refreshes and can be reviewed later.
"""

from datetime import datetime, timezone
from typing import List, Optional

from beanie import Document, Indexed
from pydantic import BaseModel, Field


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class DailyItem(BaseModel):
    item_id: str
    # memory_review | bookmark | key_moment | resume | revision
    kind: str
    video_id: str
    filename: str = ""
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    minutes: int = 1
    title: str = ""
    reason: str = ""
    completed: bool = False
    completed_at: Optional[datetime] = None


class DailyPlan(Document):
    user_id: Indexed(str)
    date: Indexed(str)                    # YYYY-MM-DD, the user's local day
    minutes: int                          # time the user said they had
    items: List[DailyItem] = []
    created_at: datetime = Field(default_factory=_utcnow)
    started_at: Optional[datetime] = None

    class Settings:
        name = "daily_plans"
