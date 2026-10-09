"""
Playback activity: where the user last stopped in each video.
Feeds ClipMind Daily ("continue watching") and Time Machine ("last opened").
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.api.routes.videos import _find_accessible_video
from app.models.activity import VideoActivity
from app.models.user import User

router = APIRouter(prefix="/api/activity", tags=["Activity"])

# Activity is per-user: each person reads and writes only their OWN row. Shared
# students must be able to record it, otherwise educators could never see any
# engagement with videos they shared.


class ActivityIn(BaseModel):
    position: float = Field(ge=0)
    duration: Optional[float] = Field(default=None, ge=0)
    opened: bool = False          # true when the video page was just opened


class ActivityOut(BaseModel):
    video_id: str
    last_position: float
    duration: Optional[float]
    open_count: int
    last_opened_at: datetime


def _out(a: VideoActivity) -> ActivityOut:
    return ActivityOut(video_id=a.video_id, last_position=a.last_position, duration=a.duration,
                       open_count=a.open_count, last_opened_at=a.last_opened_at)


@router.put("/{video_id}", response_model=ActivityOut)
async def record_activity(video_id: str, payload: ActivityIn, current_user: User = Depends(get_current_user)):
    video = await _find_accessible_video(video_id, current_user)
    record = await VideoActivity.find_one(VideoActivity.user_id == str(current_user.id),
                                          VideoActivity.video_id == str(video.id))
    if record is None:
        record = VideoActivity(user_id=str(current_user.id), video_id=str(video.id))

    position = payload.position
    if payload.duration:
        record.duration = payload.duration
        position = min(position, payload.duration)          # never beyond the real end
    # Re-opening a video at 0:00 must not erase where the user had got to.
    if position > 0 or record.last_position == 0:
        record.last_position = position
    record.last_opened_at = datetime.now(timezone.utc)
    if payload.opened:
        record.open_count += 1
    await record.save()
    return _out(record)


@router.get("/{video_id}", response_model=ActivityOut)
async def get_activity(video_id: str, current_user: User = Depends(get_current_user)):
    video = await _find_accessible_video(video_id, current_user)
    record = await VideoActivity.find_one(VideoActivity.user_id == str(current_user.id),
                                          VideoActivity.video_id == str(video.id))
    if record is None:
        raise HTTPException(status_code=404, detail="This video hasn't been opened yet.")
    return _out(record)
