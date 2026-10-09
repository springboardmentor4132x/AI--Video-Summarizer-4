"""
Pydantic response/request schemas for bookmarks and clips.
"""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class BookmarkCreate(BaseModel):
    video_id: str
    timestamp: float
    note: str = ""


class BookmarkUpdate(BaseModel):
    note: str


class BookmarkOut(BaseModel):
    id: str
    video_id: str
    timestamp: float
    note: str = ""
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ClipCreate(BaseModel):
    video_id: str
    start: float
    end: float


class ClipOut(BaseModel):
    id: str
    video_id: str
    source_start: float
    source_end: float
    filename: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
