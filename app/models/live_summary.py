"""Persistent status and transcript for a live-summary capture session."""

from datetime import datetime, timezone

from beanie import Document, Indexed
from pydantic import BaseModel, Field


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class LiveTranscriptSegment(BaseModel):
    start_time: float
    end_time: float
    text: str


class LiveSummarySession(Document):
    user_id: Indexed(str)
    source_kind: str
    status: str = "starting"
    transcript: str = ""
    transcript_segments: list[LiveTranscriptSegment] = []
    short_summary: str = ""
    summary: str = ""
    elapsed_seconds: float = 0.0
    error_message: str = ""
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "live_summary_sessions"