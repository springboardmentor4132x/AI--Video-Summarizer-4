from typing import Optional
from pydantic import BaseModel
from app.models.transcript import ProcessingStatus
class SummaryGenerateRequest(BaseModel):
    video_id: str
    user_id: str
class SummaryResponse(BaseModel):
    video_id: str
    user_id: str
    status: ProcessingStatus
    short_summary: Optional[str] = None
    detailed_summary: Optional[str] = None
    error: Optional[str] = None