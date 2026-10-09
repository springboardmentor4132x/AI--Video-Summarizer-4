"""
ClipMind Daily: a time-boxed study plan built from the caller's own data
(unfinished videos, bookmarks, key moments, revisable content), stored per
day so completion can be tracked.
"""

import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.models.activity import VideoActivity
from app.models.bookmark import Bookmark
from app.models.memory_card import MemoryCard
from app.models.daily import DailyItem, DailyPlan
from app.models.user import User
from app.models.video import Video
from app.services.daily_service import MAX_MINUTES, MIN_MINUTES, build_daily_items

router = APIRouter(prefix="/api/daily", tags=["Daily"])

_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
EMPTY_NO_VIDEOS = ("There's nothing to plan yet. Upload a video and let it finish processing; "
                   "ClipMind Daily builds sessions from videos you've processed.")
EMPTY_NO_CONTENT = ("Your videos don't have anything to schedule yet: no key moments, bookmarks, weak Memory Deck cards or "
                    "partly watched videos. Open a video, bookmark moments you want to remember, and try again.")


class GenerateIn(BaseModel):
    minutes: int = Field(ge=MIN_MINUTES, le=MAX_MINUTES)
    date: str


class ItemPatch(BaseModel):
    completed: bool


def _check_date(date: str) -> str:
    if not _DATE.match(date):
        raise HTTPException(status_code=422, detail="date must look like YYYY-MM-DD.")
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=422, detail="That isn't a real calendar date.")
    return date


def _plan_out(plan: DailyPlan) -> dict:
    done = sum(1 for i in plan.items if i.completed)
    return {
        "id": str(plan.id), "date": plan.date, "minutes": plan.minutes,
        "planned_minutes": sum(i.minutes for i in plan.items),
        "completed_count": done, "total_count": len(plan.items),
        "completed_minutes": sum(i.minutes for i in plan.items if i.completed),
        "started_at": plan.started_at, "created_at": plan.created_at,
        "items": [i.model_dump() for i in plan.items],
    }


async def _own_plan(plan_id: str, user: User) -> DailyPlan:
    try:
        plan = await DailyPlan.get(plan_id)
    except Exception:
        plan = None
    if plan is None or plan.user_id != str(user.id):
        raise HTTPException(status_code=404, detail="Daily plan not found.")
    return plan


@router.post("/generate")
async def generate(payload: GenerateIn, current_user: User = Depends(get_current_user)):
    date = _check_date(payload.date)
    uid = str(current_user.id)

    videos = await Video.find(Video.user_id == uid, Video.status == "done").to_list()
    videos = [v for v in videos if v.transcript_segments]
    if not videos:
        return {"plan": None, "empty_reason": EMPTY_NO_VIDEOS}

    activity = {a.video_id: a for a in await VideoActivity.find(VideoActivity.user_id == uid).to_list()}
    bookmarks = await Bookmark.find(Bookmark.user_id == uid).to_list()

    vdicts = [{
        "id": str(v.id), "filename": v.filename, "uploaded_at": v.uploaded_at,
        "duration": max((s.end_time for s in v.transcript_segments), default=0.0),
        "key_moments": [m.model_dump() for m in v.key_moments],
        "keywords": [k.model_dump() for k in v.keywords],
        "segments": [{"start_time": s.start_time, "end_time": s.end_time, "text": s.text} for s in v.transcript_segments],
    } for v in videos]
    act = {k: {"last_position": a.last_position, "duration": a.duration, "last_opened_at": a.last_opened_at}
           for k, a in activity.items()}
    bms = [{"video_id": b.video_id, "timestamp": b.timestamp, "note": b.note, "created_at": b.created_at}
           for b in bookmarks]

    mem_cards = [
        {"video_id": c.video_id, "prompt": c.prompt, "strength": c.strength, "source_start": c.source_start,
         "source_end": c.source_end, "next_review_at": c.next_review_at}
        for c in await MemoryCard.find(MemoryCard.user_id == uid).to_list()
    ]

    built = build_daily_items(payload.minutes, vdicts, bms, act, mem_cards)
    if not built:
        return {"plan": None, "empty_reason": EMPTY_NO_CONTENT}

    items = [DailyItem(item_id=uuid.uuid4().hex, **i) for i in built]
    plan = await DailyPlan.find_one(DailyPlan.user_id == uid, DailyPlan.date == date)
    if plan is None:
        plan = DailyPlan(user_id=uid, date=date, minutes=payload.minutes, items=items)
        await plan.insert()
    else:                                    # regenerate: replace today's plan (progress resets)
        plan.minutes, plan.items, plan.started_at = payload.minutes, items, None
        plan.created_at = datetime.now(timezone.utc)
        await plan.save()
    return {"plan": _plan_out(plan), "empty_reason": None}


@router.get("/today")
async def get_today(date: str = Query(...), current_user: User = Depends(get_current_user)):
    plan = await DailyPlan.find_one(DailyPlan.user_id == str(current_user.id), DailyPlan.date == _check_date(date))
    if plan is None:
        raise HTTPException(status_code=404, detail="No plan for this day yet.")
    return _plan_out(plan)


@router.get("/history")
async def history(current_user: User = Depends(get_current_user)):
    plans = await DailyPlan.find(DailyPlan.user_id == str(current_user.id)).sort("-date").limit(14).to_list()
    return [{"id": str(p.id), "date": p.date, "minutes": p.minutes,
             "completed_count": sum(1 for i in p.items if i.completed), "total_count": len(p.items)} for p in plans]


@router.post("/{plan_id}/start")
async def start(plan_id: str, current_user: User = Depends(get_current_user)):
    plan = await _own_plan(plan_id, current_user)
    if plan.started_at is None:
        plan.started_at = datetime.now(timezone.utc)
        await plan.save()
    return _plan_out(plan)


@router.patch("/{plan_id}/items/{item_id}")
async def set_item(plan_id: str, item_id: str, payload: ItemPatch, current_user: User = Depends(get_current_user)):
    plan = await _own_plan(plan_id, current_user)
    item = next((i for i in plan.items if i.item_id == item_id), None)
    if item is None:
        raise HTTPException(status_code=404, detail="That item isn't part of this plan.")
    item.completed = payload.completed
    item.completed_at = datetime.now(timezone.utc) if payload.completed else None
    if payload.completed and plan.started_at is None:
        plan.started_at = datetime.now(timezone.utc)
    await plan.save()
    return _plan_out(plan)
