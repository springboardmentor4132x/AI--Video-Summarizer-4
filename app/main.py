
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, users, videos, summary, transcript
from app.core.config import settings
from app.db.database import init_db
app = FastAPI(title=settings.APP_NAME)
# Wide open for local dev so Harika's frontend (on a different port) can call this.
# Tighten this before anything goes near production.
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
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(videos.router)
app.include_router(summary.router)
app.include_router(transcript.router)
@app.get("/")
def health_check():
    return {"status": "ok", "service": settings.APP_NAME}