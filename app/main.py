"""
FastAPI entrypoint. Run with:
    uvicorn app.main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, users, videos, analytics
from app.core.config import settings
from app.db.database import init_db


app = FastAPI(title=settings.APP_NAME)


# Wide open for local development so the frontend
# running on a different port can call the backend.
# Tighten this before production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await init_db()


# Existing API routes
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(videos.router)

# Module 3/4 analytics routes
app.include_router(analytics.router)


@app.get("/")
def health_check():
    return {
        "status": "ok",
        "service": settings.APP_NAME,
    }