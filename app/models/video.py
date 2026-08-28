"""
Video document for uploaded videos and processing results.
"""

from datetime import datetime, timezone

from beanie import Document, Indexed


class Video(Document):
    user_id: Indexed(str)

    filename: str
    file_path: str

    # Overall processing state
    # uploaded | processing | done | failed
    status: str = "uploaded"

    # Current processing stage
    # upload | audio | transcription | summary | done | failed
    current_stage: str = "upload"

    # Overall completion percentage
    progress: int = 0

    # Individual processing stage progress
    upload_progress: int = 100
    audio_progress: int = 0
    transcription_progress: int = 0
    summary_progress: int = 0

    # Processing results
    transcript: str = ""
    summary: str = ""

    # Error information
    error_message: str = ""

    uploaded_at: datetime = datetime.now(timezone.utc)

    class Settings:
        name = "videos"