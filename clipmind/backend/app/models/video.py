"""
Video document for uploaded videos and processing results.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional

from beanie import Document, Indexed
from pydantic import BaseModel, Field, field_validator


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TranscriptSegment(BaseModel):
    """One timestamped Whisper transcript segment."""

    start_time: float
    end_time: float
    text: str = ""


class KeyMoment(BaseModel):
    """One detected important moment in a video."""

    start_time: float
    end_time: float
    label: str = ""
    text: str = ""
    importance: float = 0.0


class Keyword(BaseModel):
    """One extracted keyword/topic and its relevance score."""

    word: str
    score: float = 0.0


class Chapter(BaseModel):
    """One auto-generated chapter marker."""

    title: str
    start_time: float
    end_time: float


class SummaryTranslation(BaseModel):
    """A cached translation of the short/detailed summary into one language."""

    short: str = ""
    detailed: str = ""


class Video(Document):
    user_id: Indexed(str)

    filename: str
    file_path: str

    # Overall processing state
    # uploaded | processing | done | failed
    status: str = "uploaded"

    # Current processing stage
    # upload | audio | transcription | summary | key_moments |
    # highlights | keywords | done | failed
    current_stage: str = "upload"

    # Overall completion percentage
    progress: int = 0

    # Individual processing stage progress
    upload_progress: int = 100
    audio_progress: int = 0
    transcription_progress: int = 0
    summary_progress: int = 0
    key_moments_progress: int = 0
    highlights_progress: int = 0
    keywords_progress: int = 0

    # Processing results
    transcription_language: str = "auto"
    transcript: str = ""
    transcript_segments: List[TranscriptSegment] = []

    # Summaries
    short_summary: str = ""
    summary: str = ""

    # Analysis
    key_moments: List[KeyMoment] = []
    highlights: List[KeyMoment] = []
    keywords: List[Keyword] = []

    # Error information
    error_message: str = ""

    # New (post-Milestone-3): auto-generated chapters, derived from key
    # moments/transcript once processing succeeds. Old documents simply
    # won't have this field populated -- default is an empty list so
    # they load fine and the frontend shows a "not generated yet" state.
    chapters: List[Chapter] = []

    # New (post-Milestone-3): cached summary translations, keyed by
    # ISO-639-1-ish language code ("te", "hi", "ta", "kn", "ml", "bn").
    # English is never stored here -- short_summary/summary ARE the
    # English version. Generated on demand and cached so we never call
    # the translation API more than once per (video, language).
    translations: Dict[str, SummaryTranslation] = {}

    # Set when someone edits transcript text; summary/key moments/flashcards
    # were generated from the earlier text until regenerated.
    transcript_edited_at: Optional[datetime] = None

    uploaded_at: datetime = Field(default_factory=_utcnow)

    @field_validator("key_moments", "highlights", mode="before")
    @classmethod
    def normalize_legacy_moments(cls, value: object) -> object:
        """Tolerate older documents whose moments lack start/end times."""
        if isinstance(value, list):
            normalized = []
            for moment in value:
                if isinstance(moment, dict) and (
                    "start_time" not in moment or "end_time" not in moment
                ):
                    moment = {
                        **moment,
                        "start_time": moment.get("start_time", 0.0),
                        "end_time": moment.get("end_time", 0.0),
                        "label": moment.get("label", "Key moment"),
                    }
                normalized.append(moment)
            return normalized
        return value

    @field_validator("keywords", mode="before")
    @classmethod
    def normalize_legacy_keywords(cls, value: object) -> object:
        """Older documents stored keywords as bare strings."""
        if isinstance(value, list):
            return [{"word": k} if isinstance(k, str) else k for k in value]
        return value

    class Settings:
        name = "videos"