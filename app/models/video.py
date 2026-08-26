"""
Video collection - matches the schema VijayaLaxmi documented:
id, user_id, filename, file_path, status, uploaded_at

user_id is stored as a string version of the owning User's MongoDB id,
which is how the "User uploads Video" relationship is represented in
MongoDB (there's no foreign key like in SQL - we just store the reference).
"""
from datetime import datetime, timezone
from beanie import Document, Indexed
class Video(Document):
    user_id: Indexed(str)
    filename: str
    file_path: str
    status: str = "uploaded"  # uploaded | processing | done | failed
    uploaded_at: datetime = datetime.now(timezone.utc)
    class Settings:
        name = "videos"  # the MongoDB collection name