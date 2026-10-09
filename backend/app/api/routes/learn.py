"""
Learning-insight routes: 5-Minute Revision and "I Don't Understand".

(Video DNA lives in video_dna.py and Evidence Lens in videos.py /ask +
evidence_service.py -- the teammates' implementations replaced the earlier
duplicates that used to be here.)

All of them read the video's already-stored transcript / keywords / key
moments (the same data Summary, Story and Q&A use) and enforce the same
auth + ownership rules as every other video route. Results are computed
on demand from that stored data, so they always reflect the current
transcript; nothing extra is cached.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.api.routes.videos import _find_owned_video
from app.models.user import User
from app.models.video import Video
from app.services.insight_service import (
    explain_moment,
    revision_for_video,
)

router = APIRouter(prefix="/api/learn", tags=["Learn"])

MAX_REVISION_VIDEOS = 5


def _segments(video: Video) -> List[dict]:
    return [{"start_time": s.start_time, "end_time": s.end_time, "text": s.text} for s in video.transcript_segments]


def _require_transcript(video: Video) -> List[dict]:
    segs = [s for s in _segments(video) if s["text"].strip()]
    if not segs:
        raise HTTPException(
            status_code=422,
            detail="This video has no timestamped transcript yet, so there is nothing to analyze.",
        )
    return segs


class ExplainRequest(BaseModel):
    timestamp: float = Field(ge=0)


class RevisionRequest(BaseModel):
    video_ids: List[str] = Field(min_length=1, max_length=MAX_REVISION_VIDEOS)


@router.post("/revision")
async def five_minute_revision(payload: RevisionRequest, current_user: User = Depends(get_current_user)):
    """Compact revision sheet for one or several of the caller's videos."""
    if len(set(payload.video_ids)) != len(payload.video_ids):
        raise HTTPException(status_code=422, detail="Each video can only be included once.")

    videos = []
    for vid in payload.video_ids:
        video = await _find_owned_video(vid, current_user)   # 404 for unknown / not yours
        _require_transcript(video)
        videos.append(video)

    sheets = []
    for video in videos:
        sheet = revision_for_video(
            _segments(video),
            [m.model_dump() for m in video.key_moments],
            [k.model_dump() for k in video.keywords],
        )
        sheets.append({"video_id": str(video.id), "filename": video.filename, **sheet})
    return {"videos": sheets}


@router.post("/{video_id}/explain")
async def i_dont_understand(video_id: str, payload: ExplainRequest, current_user: User = Depends(get_current_user)):
    video = await _find_owned_video(video_id, current_user)
    segs = _require_transcript(video)
    result = explain_moment(segs, payload.timestamp, [k.model_dump() for k in video.keywords])
    return {"video_id": str(video.id), **result}

