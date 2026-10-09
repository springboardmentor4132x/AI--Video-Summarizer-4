"""
FastAPI entrypoint. Run with:
    uvicorn app.main:app --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, users, videos, analytics, bookmarks, clips, story, learn, activity, timemachine, daily, compare, memory_deck, live_summaries, video_dna, admin, educator, shared
from app.core.config import settings
from app.db.database import init_db
from app.services.live_summary_service import mark_interrupted_live_sessions

app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await init_db()
    await mark_interrupted_live_sessions()


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(videos.router)
app.include_router(analytics.router)
app.include_router(bookmarks.router)
app.include_router(clips.router)
app.include_router(story.router)
app.include_router(learn.router)
app.include_router(activity.router)
app.include_router(timemachine.router)
app.include_router(daily.router)
app.include_router(compare.router)
app.include_router(memory_deck.router)
app.include_router(live_summaries.router)
app.include_router(video_dna.router)
app.include_router(admin.router)
app.include_router(educator.router)
app.include_router(shared.router)


@app.get("/")
def health_check():
    return {"status": "ok", "service": settings.APP_NAME}
