from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class VideoAnalyticsOut(BaseModel):
    """Analytics for a single video."""
    video_id: str
    filename: str
    status: str

    transcript_word_count: int
    short_summary_word_count: int
    summary_word_count: int

    key_moments_count: int
    highlights_count: int
    keywords_count: int

    top_keywords: List[str] = []

    uploaded_at: datetime


class StatusBreakdown(BaseModel):
    uploaded: int = 0
    processing: int = 0
    done: int = 0
    failed: int = 0


class DashboardAnalyticsOut(BaseModel):
    """Aggregated analytics across all of the current user's videos."""
    total_videos: int
    videos_by_status: StatusBreakdown

    total_transcript_words: int
    total_key_moments: int
    total_highlights: int

    average_key_moments_per_video: float

    most_common_keywords: List[str] = []

    last_upload_at: Optional[datetime] = None