"""
Educator routes: manage your own content, share it read-only with students,
and see how those students actually engage with it.

Everything is scoped to videos the educator OWNS. Engagement numbers come from
the real VideoActivity records learners generate while watching; students who
never opened a video are reported as such, never guessed.
"""

import re
from typing import List

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import require_role
from app.core.roles import ADMINISTRATOR, EDUCATOR, LEARNER
from app.models.activity import VideoActivity
from app.models.share import VideoShare
from app.models.user import User
from app.models.video import Video
from app.services.admin_service import engagement_for_video, summarize_videos
from app.services.video_cleanup_service import file_size, video_duration

router = APIRouter(prefix="/api/educator", tags=["Educator"])

educator_only = require_role(EDUCATOR, ADMINISTRATOR)


async def _owned(video_id: str, user: User) -> Video:
    try:
        video = await Video.get(PydanticObjectId(video_id))
    except Exception:
        video = None
    if video is None or video.user_id != str(user.id):
        raise HTTPException(status_code=404, detail="Video not found.")
    return video


async def _engagement(video: Video) -> dict:
    shares = await VideoShare.find(VideoShare.video_id == str(video.id)).to_list()
    ids = [PydanticObjectId(s.student_id) for s in shares]
    users = {str(u.id): u for u in await User.find({"_id": {"$in": ids}}).to_list()} if ids else {}
    students = [
        {"student_id": s.student_id, "name": users[s.student_id].name, "email": users[s.student_id].email,
         "shared_at": s.created_at}
        for s in shares if s.student_id in users
    ]
    acts = await VideoActivity.find(VideoActivity.video_id == str(video.id)).to_list() if students else []
    by_student = {
        a.user_id: {"last_position": a.last_position, "duration": a.duration or video_duration(video),
                    "open_count": a.open_count, "last_opened_at": a.last_opened_at}
        for a in acts
    }
    return engagement_for_video(students, by_student)


@router.get("/overview")
async def overview(user: User = Depends(educator_only)):
    videos = await Video.find(Video.user_id == str(user.id)).sort("-uploaded_at").to_list()
    rows = []
    for v in videos:
        eng = await _engagement(v)
        rows.append({
            "id": str(v.id), "filename": v.filename, "status": v.status, "current_stage": v.current_stage,
            "progress": v.progress, "duration": video_duration(v), "size_bytes": file_size(v),
            "uploaded_at": v.uploaded_at, "transcript_edited_at": v.transcript_edited_at,
            "has_transcript": bool(v.transcript_segments),
            "students_with_access": eng["students_with_access"], "students_opened": eng["students_opened"],
            "average_completion": eng["average_completion"],
        })
    totals = summarize_videos([{"status": r["status"], "duration": r["duration"], "size_bytes": r["size_bytes"]} for r in rows])
    return {
        "totals": {**totals, "students_reached": len({s.student_id for s in await VideoShare.find(VideoShare.owner_id == str(user.id)).to_list()})},
        "videos": rows,
    }


class ShareRequest(BaseModel):
    emails: List[str]


@router.post("/videos/{video_id}/share")
async def share_video(video_id: str, payload: ShareRequest, user: User = Depends(educator_only)):
    video = await _owned(video_id, user)
    result = {"shared": [], "already_shared": [], "not_found": [], "not_eligible": []}
    seen = set()
    for raw in payload.emails[:100]:
        email = raw.strip().lower()
        if not email or email in seen:
            continue
        seen.add(email)
        student = await User.find_one({"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}})
        if student is None:
            result["not_found"].append(email)
        elif student.role != LEARNER or not student.is_active or str(student.id) == str(user.id):
            result["not_eligible"].append(email)       # only active learner accounts can be students
        elif await VideoShare.find_one(VideoShare.video_id == str(video.id), VideoShare.student_id == str(student.id)):
            result["already_shared"].append(email)
        else:
            await VideoShare(video_id=str(video.id), owner_id=str(user.id), student_id=str(student.id)).insert()
            result["shared"].append(email)
    return result


@router.get("/videos/{video_id}/shares")
async def video_shares_and_engagement(video_id: str, user: User = Depends(educator_only)):
    video = await _owned(video_id, user)
    return {"video_id": str(video.id), "filename": video.filename, "duration": video_duration(video),
            **await _engagement(video)}


@router.delete("/videos/{video_id}/shares/{student_id}", status_code=204)
async def unshare_video(video_id: str, student_id: str, user: User = Depends(educator_only)):
    video = await _owned(video_id, user)
    share = await VideoShare.find_one(VideoShare.video_id == str(video.id), VideoShare.student_id == student_id)
    if share is None:
        raise HTTPException(status_code=404, detail="That student does not have access.")
    await share.delete()
