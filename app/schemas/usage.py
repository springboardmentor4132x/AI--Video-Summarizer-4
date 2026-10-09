"""
Pydantic response schemas for Usage Reports (Module 6).
"""

from datetime import datetime
from typing import List
from pydantic import BaseModel
class DailyUploadCount(BaseModel):
    """Number of videos uploaded on a single calendar day."""

    date: str  # ISO format YYYY-MM-DD
    count: int
class UsageReportOut(BaseModel):
    """Aggregated usage statistics across the current user's videos."""
    total_uploads: int
    uploads_by_day: List[DailyUploadCount] = []
    success_count: int
    failed_count: int
    in_progress_count: int
    success_rate: float  # 0.0 - 1.0
    total_storage_bytes: int
    average_file_size_bytes: float
    generated_at: datetime