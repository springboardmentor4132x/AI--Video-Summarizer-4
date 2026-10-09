"""Learner side of sharing: the videos other people have shared with me."""

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.share import VideoShare
from app.models.user import User
from app.models.video import Video

router = APIRouter(prefix="/api/shared", tags=["Shared"])


@router.get("")
async def shared_with_me(current_user: User = Depends(get_current_user)):
    shares = await VideoShare.find(VideoShare.student_id == str(current_user.id)).sort("-created_at").to_list()
    if not shares:
        return []
    videos = {str(v.id): v for v in await Video.find({"_id": {"$in": [PydanticObjectId(s.video_id) for s in shares]}}).to_list()}
    owners = {str(u.id): u for u in await User.find({"_id": {"$in": [PydanticObjectId(s.owner_id) for s in shares]}}).to_list()}
    out = []
    for s in shares:
        v = videos.get(s.video_id)
        if v is None:                       # video was deleted after sharing
            continue
        out.append({
            "id": s.video_id, "filename": v.filename, "status": v.status, "short_summary": v.short_summary,
            "shared_by": owners[s.owner_id].name if s.owner_id in owners else "Unknown",
            "shared_at": s.created_at,
        })
    return out
