"""
Clip document -- metadata for a real FFmpeg-generated video segment.

The generated clip FILE lives on disk (same convention as the source
video, under UPLOAD_DIR); this Document just tracks who made it, from
which video, what range, and where the file is, so ownership can be
enforced on download the same way it is everywhere else.
"""

from datetime import datetime, timezone

from beanie import Document, Indexed
from pydantic import Field


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Clip(Document):
    user_id: Indexed(str)
    video_id: Indexed(str)

    source_start: float
    source_end: float

    file_path: str
    filename: str

    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "clips"
