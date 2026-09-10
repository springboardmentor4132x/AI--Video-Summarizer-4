from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pymongo import AsyncMongoClient
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(title="ClipMind AI Backend")

# CORS configuration
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

# MongoDB Atlas configuration
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "clipmindAI")

client = AsyncMongoClient(MONGO_URI)
db = client[MONGO_DB_NAME]


# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "ClipMind AI Backend is running"
    }


# MongoDB connection test
@app.get("/test-db")
async def test_db():
    result = await client.admin.command("ping")

    return {
        "message": "MongoDB Atlas connected successfully!",
        "ping": result["ok"]
    }


# User APIs
from app.api.users import router as users_router
app.include_router(users_router)


# Video APIs
from app.api.videos import router as videos_router
app.include_router(videos_router)


# Key Moments APIs
from app.api.key_moments import router as key_moments_router
app.include_router(key_moments_router)


# Keywords APIs
from app.api.keywords import router as keywords_router
app.include_router(keywords_router)


# Analytics APIs
from app.api.analytics import router as analytics_router
app.include_router(analytics_router)