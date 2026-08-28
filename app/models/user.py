from datetime import datetime, timezone
from beanie import Document, Indexed
from pydantic import EmailStr
class User(Document):
    name: str
    email: Indexed(EmailStr, unique=True)
    password: str  # stores the HASHED password, never plain text
    role: str = "learner"  # content_creator | learner | educator | administrator
    created_at: datetime = datetime.now(timezone.utc)
    class Settings:
        name = "users"  # the MongoDB collection name