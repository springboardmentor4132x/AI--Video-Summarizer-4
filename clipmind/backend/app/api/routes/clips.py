"""
Real clip-generation routes: validates the requested range, calls
FFmpeg to extract an actual video segment (never a fake/placeholder
file), persists metadata, and lets only the owning user download it.
"""

import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from app.api.deps import get_current_user
from app.api.routes.videos import _find_owned_video
from app.core.config import settings
from app.models.clip import Clip
from app.models.user import User
from app.schemas.bookmark_clip import ClipCreate, ClipOut
from app.services.clip_service import generate_clip, validate_clip_range

router = APIRouter(prefix="/api/clips", tags=["Clips"])


def _to_out(clip: Clip) -> ClipOut:
    return ClipOut(
        id=str(clip.id),
        video_id=clip.video_id,
        source_start=clip.source_start,
        source_end=clip.source_end,
        filename=clip.filename,
        created_at=clip.created_at,
    )


@router.post("", response_model=ClipOut, status_code=201)
async def create_clip(
    payload: ClipCreate,
    current_user: User = Depends(get_current_user),
):
    video = await _find_owned_video(payload.video_id, current_user)

    video_duration = (
        video.transcript_segments[-1].end_time if video.transcript_segments else None
    )

    try:
        validate_clip_range(payload.start, payload.end, video_duration)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    output_dir = os.path.join(settings.UPLOAD_DIR, "clips")

    try:
        file_path, filename = generate_clip(video.file_path, payload.start, payload.end, output_dir)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    clip = Clip(
        user_id=str(current_user.id),
        video_id=payload.video_id,
        source_start=payload.start,
        source_end=payload.end,
        file_path=file_path,
        filename=filename,
    )
    await clip.insert()

    return _to_out(clip)


@router.get("/{clip_id}/download")
async def download_clip(
    clip_id: str,
    current_user: User = Depends(get_current_user),
):
    from beanie import PydanticObjectId

    try:
        object_id = PydanticObjectId(clip_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Clip not found.")

    clip = await Clip.get(object_id)

    if clip is None or clip.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Clip not found.")

    if not os.path.exists(clip.file_path):
        raise HTTPException(status_code=404, detail="Clip file no longer exists on disk.")

    return FileResponse(clip.file_path, media_type="video/mp4", filename=clip.filename)
