"""
Administrator routes: user and role management, content oversight, processing
monitoring, platform statistics and the audit log.

Authorization lives HERE, on the server: the whole router requires the
administrator role, so no individual route can be left open by mistake, and a
learner who types /api/admin/... gets 403 no matter what the UI shows.
"""

import os
import re
from typing import List, Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import require_role
from app.core.roles import ADMINISTRATOR, VALID_ROLES
from app.models.audit import AuditLog
from app.models.user import User
from app.models.video import Video
from app.services.admin_service import (
    PROCESSING_STATUSES, check_active_change, check_role_change, summarize_users, summarize_videos,
)
from app.services.video_cleanup_service import delete_video_and_dependents

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"],
    dependencies=[Depends(require_role(ADMINISTRATOR))],
)

_VIDEO_PROJECTION = {
    "$project": {
        "user_id": 1, "filename": 1, "status": 1, "current_stage": 1, "progress": 1,
        "file_path": 1, "error_message": 1, "uploaded_at": 1,
        "duration": {"$ifNull": [{"$max": "$transcript_segments.end_time"}, 0]},
    }
}


def _size(path: Optional[str]) -> int:
    try:
        return os.path.getsize(path) if path and os.path.isfile(path) else 0
    except OSError:
        return 0


async def _video_rows(match: Optional[dict] = None, skip: int = 0, limit: Optional[int] = None) -> List[dict]:
    pipeline: List[dict] = []
    if match:
        pipeline.append({"$match": match})
    pipeline += [_VIDEO_PROJECTION, {"$sort": {"uploaded_at": -1}}]
    if skip:
        pipeline.append({"$skip": skip})
    if limit:
        pipeline.append({"$limit": limit})
    rows = await Video.find_all().aggregate(pipeline).to_list()
    for r in rows:
        r["id"] = str(r.pop("_id"))
        r["size_bytes"] = _size(r.pop("file_path", None))
    return rows


async def _audit(actor: User, action: str, target_type: str, target_id: str, detail: Optional[dict] = None) -> None:
    await AuditLog(actor_id=str(actor.id), actor_email=actor.email, action=action,
                   target_type=target_type, target_id=target_id, detail=detail or {}).insert()


async def _load_user(user_id: str) -> User:
    try:
        user = await User.get(PydanticObjectId(user_id))
    except Exception:
        user = None
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


async def _active_admin_count() -> int:
    return await User.find(User.role == ADMINISTRATOR, User.is_active == True).count()  # noqa: E712


# ------------------------------------------------------------------ statistics

@router.get("/stats")
async def platform_stats():
    users = await User.find_all().project(_UserFlags).to_list()
    videos = await _video_rows()
    failures = [
        {"id": v["id"], "filename": v["filename"], "error_message": v.get("error_message", ""),
         "uploaded_at": v["uploaded_at"]}
        for v in videos if v["status"] == "failed"
    ][:5]
    return {
        "users": summarize_users([{"role": u.role, "is_active": u.is_active} for u in users]),
        "videos": summarize_videos(videos),
        "recent_failures": failures,
    }


class _UserFlags(BaseModel):
    role: str = "learner"
    is_active: bool = True


# ------------------------------------------------------------------ users

@router.get("/users")
async def list_users(
    search: str = Query("", max_length=100),
    role: str = Query("", max_length=30),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    query: dict = {}
    if role:
        if role not in VALID_ROLES:
            raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(VALID_ROLES)}")
        query["role"] = role
    if search.strip():
        rx = {"$regex": re.escape(search.strip()), "$options": "i"}
        query["$or"] = [{"name": rx}, {"email": rx}]

    total = await User.find(query).count()
    users = await User.find(query).sort("-created_at").skip(skip).limit(limit).to_list()

    counts = {
        row["_id"]: row["n"]
        for row in await Video.find_all().aggregate([{"$group": {"_id": "$user_id", "n": {"$sum": 1}}}]).to_list()
    }
    return {
        "total": total,
        "users": [
            {"id": str(u.id), "name": u.name, "email": u.email, "role": u.role, "is_active": u.is_active,
             "created_at": u.created_at, "video_count": counts.get(str(u.id), 0)}
            for u in users
        ],
    }


class RoleChange(BaseModel):
    role: str


class ActiveChange(BaseModel):
    is_active: bool


@router.patch("/users/{user_id}/role")
async def change_user_role(user_id: str, payload: RoleChange, admin: User = Depends(require_role(ADMINISTRATOR))):
    target = await _load_user(user_id)
    try:
        check_role_change(str(admin.id), str(target.id), payload.role, target.role, await _active_admin_count())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    old = target.role
    target.role = payload.role
    await target.save()
    await _audit(admin, "user.role_changed", "user", str(target.id), {"email": target.email, "from": old, "to": payload.role})
    return {"id": str(target.id), "role": target.role}


@router.patch("/users/{user_id}/active")
async def set_user_active(user_id: str, payload: ActiveChange, admin: User = Depends(require_role(ADMINISTRATOR))):
    target = await _load_user(user_id)
    try:
        check_active_change(str(admin.id), str(target.id), payload.is_active, target.role, await _active_admin_count())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    target.is_active = payload.is_active
    await target.save()
    await _audit(admin, "user.enabled" if payload.is_active else "user.disabled", "user", str(target.id),
                 {"email": target.email})
    return {"id": str(target.id), "is_active": target.is_active}


# ------------------------------------------------------------------ content oversight

@router.get("/videos")
async def list_all_videos(
    status: str = Query("", max_length=20),
    search: str = Query("", max_length=100),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    match: dict = {}
    if status:
        match["status"] = status
    if search.strip():
        match["filename"] = {"$regex": re.escape(search.strip()), "$options": "i"}
    total = await Video.find(match).count()
    rows = await _video_rows(match, skip, limit)
    owners = {str(u.id): u for u in await User.find_all().to_list()}
    for r in rows:
        o = owners.get(r["user_id"])
        r["owner_name"], r["owner_email"] = (o.name, o.email) if o else ("(deleted user)", "")
    return {"total": total, "videos": rows}


@router.delete("/videos/{video_id}")
async def delete_any_video(video_id: str, admin: User = Depends(require_role(ADMINISTRATOR))):
    try:
        video = await Video.get(PydanticObjectId(video_id))
    except Exception:
        video = None
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found.")
    detail = {"filename": video.filename, "owner_id": video.user_id}
    removed = await delete_video_and_dependents(video)
    await _audit(admin, "video.deleted", "video", video_id, {**detail, "removed": removed})
    return {"deleted": True, "removed": removed}


@router.get("/processing")
async def processing_jobs():
    active = await _video_rows({"status": {"$in": list(PROCESSING_STATUSES)}})
    failed = await _video_rows({"status": "failed"}, limit=20)
    return {"active": active, "failed": failed}


# ------------------------------------------------------------------ audit

@router.get("/audit")
async def audit_log(limit: int = Query(50, ge=1, le=200)):
    logs = await AuditLog.find_all().sort("-created_at").limit(limit).to_list()
    return [
        {"id": str(a.id), "actor_email": a.actor_email, "action": a.action, "target_type": a.target_type,
         "target_id": a.target_id, "detail": a.detail, "created_at": a.created_at}
        for a in logs
    ]
