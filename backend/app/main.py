from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pymongo import AsyncMongoClient
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# --------------------------------------------------
# FastAPI application
# --------------------------------------------------

app = FastAPI(
    title="ClipMind AI Backend"
)

# --------------------------------------------------
# CORS configuration
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# MongoDB configuration
# --------------------------------------------------

MONGO_URI = os.getenv("MONGO_URI")

MONGO_DB_NAME = os.getenv(
    "MONGO_DB_NAME",
    "clipmindAI"
)

# Create MongoDB client
client = AsyncMongoClient(
    MONGO_URI
)

# Select database
db = client[
    MONGO_DB_NAME
]

# --------------------------------------------------
# Root endpoint
# --------------------------------------------------

@app.get("/")
async def root():
    return {
        "message":
        "ClipMind AI Backend is running"
    }


# --------------------------------------------------
# MongoDB test endpoint
# --------------------------------------------------

@app.get("/test-db")
async def test_db():

    result = await client.admin.command(
        "ping"
    )

    return {
        "message":
        "MongoDB Atlas connected successfully!",
        "ping": result["ok"]
    }


# --------------------------------------------------
# API Routers
# --------------------------------------------------

from app.api.users import (
    router as users_router
)

from app.api.videos import (
    router as videos_router
)

from app.api.key_moments import (
    router as key_moments_router
)

from app.api.keywords import (
    router as keywords_router
)

from app.api.analytics import (
    router as analytics_router
)

from app.api.transcripts import (
    router as transcripts_router
)

from app.api.summaries import (
    router as summaries_router
)

from app.api.video_dna import (
    router as video_dna_router
)


# --------------------------------------------------
# Register routers
# --------------------------------------------------

app.include_router(
    users_router
)

app.include_router(
    videos_router
)

app.include_router(
    key_moments_router
)

app.include_router(
    keywords_router
)

app.include_router(
    analytics_router
)

app.include_router(
    transcripts_router
)

app.include_router(
    summaries_router
)

app.include_router(
    video_dna_router
)