from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
client = AsyncIOMotorClient(settings.MONGO_URI)
database = client[settings.MONGO_DB_NAME]
async def init_db():
    """Called once when the app starts up. Connects Beanie's models to the database."""
    from beanie import init_beanie
    from app.models.user import User
    from app.models.video import Video
    await init_beanie(database=database, document_models=[User, Video])