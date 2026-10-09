"""Request and response schemas for adaptive memory cards."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class MemoryCardOut(BaseModel):
    id: str
    video_id: str
    video_filename: str
    prompt: str
    answer: str
    source_label: str
    source_start: float
    source_end: float
    strength: str
    review_count: int
    last_reviewed_at: datetime | None
    next_review_at: datetime
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class MemoryReviewIn(BaseModel):
    strength: Literal["strong", "needs_review", "forgotten"]


class ExplainAttemptIn(BaseModel):
    explanation: str = Field(min_length=1, max_length=3000)


class ExplainAttemptOut(BaseModel):
    matched_terms: list[str]
    missing_terms: list[str]
    feedback: str
    source_start: float
    source_end: float
    source_excerpt: str