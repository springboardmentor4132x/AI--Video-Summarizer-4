"""
Pydantic response schema for Content Insights (Module 6).
"""

from datetime import datetime
from typing import List
from pydantic import BaseModel
class TopTopic(BaseModel):
    word: str
    frequency: int  # how many videos this keyword appeared in
class LengthDistribution(BaseModel):
    short: int   # under 60 seconds
    medium: int  # 60-300 seconds
    long: int    # over 300 seconds
class ContentInsightsOut(BaseModel):
    """Aggregated content-level insights across the current user's videos."""
    total_videos_analyzed: int
    top_topics: List[TopTopic] = []
    average_key_moments_per_minute: float
    average_keywords_per_video: float
    length_distribution: LengthDistribution
    generated_at: datetime