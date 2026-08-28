from enum import Enum
from typing import Optional
from pydantic import BaseModel
class ProcessingStatus(str, Enum):
    NOT_STARTED = "NOT_STARTED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
class TranscriptGenerateRequest(BaseModel):
    video_id: str
    user_id: str
class TranscriptResponse(BaseModel):
    video_id: str
    user_id: str
    status: ProcessingStatus
    transcript: Optional[str] = None
    language: Optional[str] = None
    error: Optional[str] = None