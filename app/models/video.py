"""
Video document for uploaded videos and processing results.
"""

from datetime import datetime, timezone

from beanie import Document, Indexed


class Video(Document):
    user_id: Indexed(str)
    filename: str
    file_path: str

    status: str = "uploaded"
    # uploaded | processing | done | failed

    transcript: str = ""
    summary: str = ""
    error_message: str = ""

    uploaded_at: datetime = datetime.now(timezone.utc)

    class Settings:
        name = "videos"