"""API schemas for live video transcript and summary sessions."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.live_summary import LiveTranscriptSegment


class LiveSummaryCreate(BaseModel):
    url: str = Field(min_length=8, max_length=2048)


class LiveSummaryOut(BaseModel):
    id: str
    source_kind: str
    status: str
    transcript: str
    transcript_segments: list[LiveTranscriptSegment]
    short_summary: str
    summary: str
    elapsed_seconds: float
    error_message: str
    created_at: datetime
    updated_at: datetime