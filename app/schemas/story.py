"""
Pydantic request/response schemas for the ClipMind Story APIs.
"""

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel

StoryMode = Literal["comic", "storybook", "study_notes", "storyboard"]


class StoryGenerateRequest(BaseModel):
    mode: StoryMode = "comic"


class StoryPanelOut(BaseModel):
    panel_id: str
    video_id: str
    panel_number: int
    timestamp: float
    start_time: float
    end_time: float
    # Server-absolute path of the (auth-protected) frame image, e.g.
    # /api/story/<video_id>/frames/comic/panel_01_ab12cd34.jpg
    # None when frame extraction failed for this panel.
    frame_url: Optional[str] = None
    title: str
    concept: str
    caption: str
    transcript_excerpt: str
    importance: float = 0.0


class StoryOut(BaseModel):
    id: str
    video_id: str
    mode: StoryMode
    title: str
    panels: List[StoryPanelOut]
    warnings: List[str] = []
    created_at: datetime
    updated_at: datetime


class StoryDeleteOut(BaseModel):
    deleted: int
