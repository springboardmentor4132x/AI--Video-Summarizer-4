"""
ClipMind Time Machine: search and topic history across all of the
caller's processed videos. Reads existing stored data only.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user
from app.models.activity import VideoActivity
from app.models.user import User
from app.models.video import Video
from app.services.time_machine_service import search_history, topic_evolution

router = APIRouter(prefix="/api/timemachine", tags=["Time Machine"])


async def _user_videos(user: User) -> List[dict]:
    videos = await Video.find(Video.user_id == str(user.id), Video.status == "done").to_list()
    activity = {a.video_id: a for a in await VideoActivity.find(VideoActivity.user_id == str(user.id)).to_list()}
    return [{
        "id": str(v.id), "filename": v.filename, "uploaded_at": v.uploaded_at,
        "last_opened_at": activity[str(v.id)].last_opened_at if str(v.id) in activity else None,
        "keywords": [k.model_dump() for k in v.keywords],
        "segments": [{"start_time": s.start_time, "end_time": s.end_time, "text": s.text} for s in v.transcript_segments],
    } for v in videos if v.transcript_segments]


@router.get("/search")
async def search(q: str = Query(min_length=1, max_length=200), current_user: User = Depends(get_current_user)):
    if not q.strip():
        raise HTTPException(status_code=422, detail="Enter a concept to search for.")
    videos = await _user_videos(current_user)
    return {"query": q.strip(), "videos_searched": len(videos), "results": search_history(q, videos)}


@router.get("/topics")
async def topics(current_user: User = Depends(get_current_user)):
    videos = await _user_videos(current_user)
    return {"videos_considered": len(videos), **topic_evolution(videos)}
