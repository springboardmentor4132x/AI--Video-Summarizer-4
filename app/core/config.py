"""
Centralized app settings, loaded from environment variables / .env file.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "ClipMind AI Backend"

    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "clipmindAI"

    SECRET_KEY: str = "change-this-secret-key-please"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    UPLOAD_DIR: str = "uploaded_videos"

    # AI summarization
    OPENAI_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()