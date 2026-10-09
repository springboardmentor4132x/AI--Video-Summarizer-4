"""
Story document -- a generated "ClipMind Story" (comic / storybook /
study notes / storyboard) for one video.

One Story exists per (user, video, mode); regenerating a mode replaces
that mode's panels. Panel frame IMAGES live on disk (under
UPLOAD_DIR/story_frames/<video_id>/<mode>/, same convention as the
source video and generated clips); this document stores only the file
name so ownership can be enforced on every image download.
"""

from datetime import datetime, timezone
from typing import List, Optional

from beanie import Document, Indexed
from pydantic import BaseModel, Field


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class StoryPanel(BaseModel):
    """One panel: a real frame from the video + text derived from the transcript."""

    panel_id: str
    panel_number: int
    # Seek point for "Watch This Moment" (== start_time of the scene).
    timestamp: float
    start_time: float
    end_time: float
    # File name of the extracted JPEG, or None if frame extraction failed
    # for this specific panel (the UI then shows a timestamp placeholder).
    frame_file: Optional[str] = None
    title: str = ""
    concept: str = ""
    caption: str = ""
    transcript_excerpt: str = ""
    importance: float = 0.0


class Story(Document):
    user_id: Indexed(str)
    video_id: Indexed(str)

    # comic | storybook | study_notes | storyboard
    mode: str
    title: str = ""
    panels: List[StoryPanel] = []
    # Non-fatal problems, e.g. "2 of 6 frames could not be extracted."
    warnings: List[str] = []

    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "stories"
