"""
User collection - matches the schema VijayaLaxmi documented:
id, name, email, password, role, created_at

In MongoDB, the id field is automatically provided as `_id` by Beanie/MongoDB
(accessible in code as `.id`), so it isn't declared explicitly below.
"""
from datetime import datetime, timezone
from beanie import Document, Indexed
from pydantic import EmailStr, Field
def _utcnow() -> datetime:
    return datetime.now(timezone.utc)
class User(Document):
    name: str
    email: Indexed(EmailStr, unique=True)
    password: str  # stores the HASHED password, never plain text
    role: str = "learner"  # content_creator | learner | educator | administrator
    created_at: datetime = Field(default_factory=_utcnow)
    class Settings:
        name = "users"  # the MongoDB collection name