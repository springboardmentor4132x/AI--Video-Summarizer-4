from datetime import datetime

from pydantic import BaseModel, ConfigDict


class VideoOut(BaseModel):
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

    # Processing results
    transcript: str = ""
    summary: str = ""

    # Error information
    error_message: str = ""

    uploaded_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )