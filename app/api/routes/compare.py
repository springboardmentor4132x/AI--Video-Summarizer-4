"""
Video Version Comparison: compare what two of the caller's videos say.
Results are saved (one per old/new pair) so they can be reopened.
"""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.api.routes.videos import _find_owned_video
from app.models.comparison import ComparisonItem, VideoComparison
from app.models.user import User
from app.models.video import Video
from app.services.compare_service import InsufficientContent, compare_transcripts

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/compare", tags=["Compare"])


class CompareIn(BaseModel):
    old_video_id: str
    new_video_id: str


def _out(c: VideoComparison) -> dict:
    return {
        "id": str(c.id), "old_video_id": c.old_video_id, "new_video_id": c.new_video_id,
        "old_filename": c.old_filename, "new_filename": c.new_filename,
        "counts": c.counts, "similarity": c.similarity, "verdict": c.verdict, "truncated": c.truncated,
        "method_note": ("Compares the wording of the two transcripts. A point that was heavily rephrased "
                        "may appear as removed + new rather than changed."),
        "created_at": c.created_at, "items": [i.model_dump() for i in c.items],
    }


def _segments(video: Video) -> List[dict]:
    return [{"start_time": s.start_time, "end_time": s.end_time, "text": s.text} for s in video.transcript_segments]


def _check_ready(video: Video, role: str) -> None:
    if video.status == "failed":
        raise HTTPException(status_code=409, detail=f"The {role} video failed to process, so it can't be compared.")
    if video.status != "done":
        raise HTTPException(status_code=409, detail=f"The {role} video is still being processed.")
    if not any(s.text.strip() for s in video.transcript_segments):
        raise HTTPException(status_code=422, detail=f"The {role} video has no timestamped transcript to compare.")


@router.post("", status_code=201)
async def create_comparison(payload: CompareIn, current_user: User = Depends(get_current_user)):
    if payload.old_video_id == payload.new_video_id:
        raise HTTPException(status_code=422, detail="Pick two different videos to compare.")
    old = await _find_owned_video(payload.old_video_id, current_user)
    new = await _find_owned_video(payload.new_video_id, current_user)
    _check_ready(old, "older")
    _check_ready(new, "newer")

    try:
        result = compare_transcripts(_segments(old), _segments(new))
    except InsufficientContent as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception:
        logger.exception("Comparison failed for %s vs %s", old.id, new.id)
        raise HTTPException(status_code=500, detail="The comparison failed. Please try again.")

    uid = str(current_user.id)
    doc = await VideoComparison.find_one(VideoComparison.user_id == uid,
                                         VideoComparison.old_video_id == str(old.id),
                                         VideoComparison.new_video_id == str(new.id))
    fields = dict(old_filename=old.filename, new_filename=new.filename, counts=result["counts"],
                  similarity=result["similarity"], verdict=result["verdict"], truncated=result["truncated"],
                  items=[ComparisonItem(**i) for i in result["items"]])
    if doc is None:
        doc = VideoComparison(user_id=uid, old_video_id=str(old.id), new_video_id=str(new.id), **fields)
        await doc.insert()
    else:
        for k, v in fields.items():
            setattr(doc, k, v)
        await doc.save()
    return _out(doc)


@router.get("")
async def list_comparisons(current_user: User = Depends(get_current_user)):
    docs = await VideoComparison.find(VideoComparison.user_id == str(current_user.id)).sort("-created_at").limit(30).to_list()
    return [{"id": str(d.id), "old_filename": d.old_filename, "new_filename": d.new_filename, "verdict": d.verdict,
             "similarity": d.similarity, "counts": d.counts, "created_at": d.created_at} for d in docs]


async def _own(comparison_id: str, user: User) -> VideoComparison:
    try:
        doc = await VideoComparison.get(comparison_id)
    except Exception:
        doc = None
    if doc is None or doc.user_id != str(user.id):
        raise HTTPException(status_code=404, detail="Comparison not found.")
    return doc


@router.get("/{comparison_id}")
async def get_comparison(comparison_id: str, current_user: User = Depends(get_current_user)):
    return _out(await _own(comparison_id, current_user))


@router.delete("/{comparison_id}")
async def delete_comparison(comparison_id: str, current_user: User = Depends(get_current_user)):
    doc = await _own(comparison_id, current_user)
    await doc.delete()
    return {"deleted": 1}
