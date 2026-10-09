from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "ClipMind AI Backend"

    # --- Database ---
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "clipmindAI"

    # --- Auth ---
    SECRET_KEY: str  # required - must be set in .env, no insecure default
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # --- Storage ---
    UPLOAD_DIR: str = "uploaded_videos"
    MAX_UPLOAD_SIZE_MB: int = 500

    # --- CORS ---
    # Comma-separated list of allowed frontend origins. Do NOT use "*"
    # together with allow_credentials=True in production (browsers
    # reject it, and it's an open CORS policy besides). Defaults to the
    # local Vite dev server.
    CORS_ORIGINS_RAW: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def CORS_ORIGINS(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS_RAW.split(",") if o.strip()]

    # --- Local AI pipeline (ALL AI features — no external API key required) ---
    SUMMARIZATION_MODEL_NAME: str = "facebook/bart-large-cnn"
    WHISPER_MODEL_NAME: str = "base"
    # Single model covers all 6 target languages (see translation_service.py)
    TRANSLATION_MODEL_NAME: str = "facebook/nllb-200-distilled-600M"

    # --- Real-Time Workspace (optional) ---
    # Private cookie export for YouTube streams that require viewer sign-in.
    YOUTUBE_COOKIES_FILE: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()