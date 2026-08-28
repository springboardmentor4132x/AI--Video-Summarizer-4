"""
Video upload, processing, status and history routes.
"""

import os
import uuid
from typing import List

from beanie import PydanticObjectId
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    UploadFile,
)

from app.api.deps import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.video import Video
from app.schemas.video import VideoOut
from app.services import process_video, generate_summary


router = APIRouter(
    prefix="/api/videos",
    tags=["Videos"],
)


ALLOWED_EXTENSIONS = {
    ".mp4",
    ".mov",
    ".avi",
    ".mkv",
}

MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024


def _to_out(video: Video) -> VideoOut:
    return VideoOut(
        id=str(video.id),
        filename=video.filename,
        status=video.status,
        current_stage=video.current_stage,
        progress=video.progress,
        upload_progress=video.upload_progress,
        audio_progress=video.audio_progress,
        transcription_progress=video.transcription_progress,
        summary_progress=video.summary_progress,
        transcript=video.transcript,
        summary=video.summary,
        error_message=video.error_message,
        uploaded_at=video.uploaded_at,
    )


@router.post(
    "/upload",
    response_model=VideoOut,
    status_code=201,
)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a video and start background processing.
    """

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Please select a video file.",
        )

    extension = os.path.splitext(file.filename)[1].lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported video format. "
                "Allowed formats: MP4, MOV, AVI and MKV."
            ),
        )

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="File is too large. Maximum allowed size is 500 MB.",
        )

    os.makedirs(
        settings.UPLOAD_DIR,
        exist_ok=True,
    )

    stored_name = f"{uuid.uuid4().hex}{extension}"

    file_path = os.path.join(
        settings.UPLOAD_DIR,
        stored_name,
    )

    with open(file_path, "wb") as output_file:
        output_file.write(contents)

    # ==============================================
    # CREATE VIDEO DOCUMENT
    # ==============================================

    video = Video(
        user_id=str(current_user.id),
        filename=file.filename,
        file_path=file_path,
        status="uploaded",
        progress=0,
        upload_progress=100,
        audio_progress=0,
        transcription_progress=0,
        summary_progress=0,
        transcript="",
        summary="",
        error_message="",
    )

    await video.insert()

    # ==============================================
    # START BACKGROUND PROCESSING
    # ==============================================

    background_tasks.add_task(
        process_video,
        video,
    )

    return _to_out(video)


@router.get(
    "/history",
    response_model=List[VideoOut],
)
async def upload_history(
    current_user: User = Depends(get_current_user),
):
    """
    Return all videos belonging to the current user.
    """

    videos = (
        await Video.find(
            Video.user_id == str(current_user.id)
        )
        .sort(-Video.uploaded_at)
        .to_list()
    )

    return [
        _to_out(video)
        for video in videos
    ]


# ==============================================
# VIDEO STATUS
# ==============================================

@router.get(
    "/{video_id}/status",
    response_model=VideoOut,
)
async def video_status(
    video_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Return the current processing status of a video.
    Only the owner can access the video.
    """

    # Validate MongoDB ObjectId
    try:
        object_id = PydanticObjectId(video_id)
    except Exception:
        raise HTTPException(
            status_code=404,
            detail="Video not found.",
        )

    # Find video
    video = await Video.get(object_id)

    if video is None:
        raise HTTPException(
            status_code=404,
            detail="Video not found.",
        )

    # Security check:
    # users can only access their own videos
    if video.user_id != str(current_user.id):
        raise HTTPException(
            status_code=404,
            detail="Video not found.",
        )

    return _to_out(video)


# ==============================================
# AI SUMMARY
# ==============================================

@router.post(
    "/{video_id}/summary",
    response_model=VideoOut,
)
async def generate_video_summary(
    video_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Generate or regenerate the AI summary
    for a completed transcript.

    AI summarization is intentionally left available
    but is not required for the current workflow.
    """

    # Validate video ID
    try:
        object_id = PydanticObjectId(video_id)
    except Exception:
        raise HTTPException(
            status_code=404,
            detail="Video not found.",
        )

    # Find video
    video = await Video.get(object_id)

    if not video:
        raise HTTPException(
            status_code=404,
            detail="Video not found.",
        )

    # Only the owner can generate/regenerate summary
    if video.user_id != str(current_user.id):
        raise HTTPException(
            status_code=404,
            detail="Video not found.",
        )

    # Transcript is required
    if not video.transcript.strip():
        raise HTTPException(
            status_code=400,
            detail="Transcript is not available yet.",
        )

    try:
        # Mark summary generation as processing
        video.current_stage = "summary"
        video.summary_progress = 10
        video.progress = 80
        video.status = "processing"
        video.error_message = ""

        await video.save()

        # Generate AI summary
        summary = generate_summary(video.transcript)

        # Save result
        video.summary = summary
        video.summary_progress = 100
        video.progress = 100
        video.current_stage = "done"
        video.status = "done"
        video.error_message = ""

        await video.save()

        return _to_out(video)

    except Exception as exc:
        # Keep transcript intact even if summary fails
        video.status = "failed"
        video.current_stage = "failed"
        video.error_message = str(exc)
        video.summary_progress = 0

        await video.save()

        raise HTTPException(
            status_code=502,
            detail=f"Summary generation failed: {exc}",
        )