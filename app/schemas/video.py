"""
Pydantic response schemas for video APIs.
"""

from datetime import datetime
from typing import Dict, List
from pydantic import BaseModel, ConfigDict
class TranscriptSegmentOut(BaseModel):
    """Timestamped transcript segment."""
    start_time: float
    end_time: float
    text: str = ""
class KeyMomentOut(BaseModel):
    """Detected important moment in a video."""
    start_time: float
    end_time: float
    label: str = ""
    text: str = ""
    importance: float = 0.0
class KeywordOut(BaseModel):
    """Extracted keyword and relevance score."""
    word: str
    score: float = 0.0
class ChapterOut(BaseModel):
    """Auto-generated chapter marker."""
    title: str
    start_time: float
    end_time: float
class SummaryTranslationOut(BaseModel):
    """Cached translation of the short/detailed summary."""
    short: str = ""
    detailed: str = ""
class VideoOut(BaseModel):
    """Video response returned by the API."""
    id: str
    filename: str
    # Overall processing state
    status: str
    current_stage: str = "upload"
    # Overall progress
    progress: int = 0
    # Individual stage progress
    upload_progress: int = 100
    audio_progress: int = 0
    transcription_progress: int = 0
    summary_progress: int = 0
    key_moments_progress: int = 0
    highlights_progress: int = 0
    keywords_progress: int = 0
    # Processing results
    transcript: str = ""
    transcript_segments: List[TranscriptSegmentOut] = []
    # Summaries
    short_summary: str = ""
    summary: str = ""  # detailed summary
    # Analysis
    key_moments: List[KeyMomentOut] = []
    highlights: List[KeyMomentOut] = []
    keywords: List[KeywordOut] = []
    # Chapters (empty list = not generated yet; frontend shows that state)
    chapters: List[ChapterOut] = []
    # Cached translations, keyed by language code. English is not a key
    # here -- it's short_summary/summary above.
    translations: Dict[str, SummaryTranslationOut] = {}
    # Error information
    error_message: str = ""
    uploaded_at: datetime
    model_config = ConfigDict(
        from_attributes=True
    )