"""
MongoDB connection setup using Motor (the async MongoDB driver) and Beanie
(an ODM that lets us define models similarly to how SQLAlchemy worked,
but for MongoDB documents instead of SQL tables).
"""
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
client = AsyncIOMotorClient(settings.MONGO_URI)
database = client[settings.MONGO_DB_NAME]
async def init_db():
    """Called once when the app starts up. Connects Beanie's models to the database."""
    from beanie import init_beanie
    from app.models.user import User
    from app.models.video import Video
    from app.models.bookmark import Bookmark
    from app.models.clip import Clip
    from app.models.story import Story
    from app.models.activity import VideoActivity
    from app.models.daily import DailyPlan
    from app.models.comparison import VideoComparison
    from app.models.memory_card import MemoryCard
    from app.models.live_summary import LiveSummarySession
    from app.models.audit import AuditLog
    from app.models.share import VideoShare
    await init_beanie(database=database, document_models=[User, Video, Bookmark, Clip, Story, VideoActivity, DailyPlan, VideoComparison, MemoryCard, LiveSummarySession, AuditLog, VideoShare],
    )