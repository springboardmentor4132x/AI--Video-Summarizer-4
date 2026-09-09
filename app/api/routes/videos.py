import os
import uuid
from typing import List

from beanie import PydanticObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile

from app.api.deps import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.video import Video, KeyMoment, Keyword
from app.schemas.video import VideoOut, KeyMomentOut, KeywordOut
from app.services.process_video import process_video
from app.services.summary_service import generate_summaries
from app.services.key_moments_service import detect_key_moments
from app.services.highlight_service import generate_highlights
from app.services.keyword_service import extract_keywords

router = APIRouter(prefix="/api/videos", tags=["Videos"])

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv"}
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
        key_moments_progress=video.key_moments_progress,
        highlights_progress=video.highlights_progress,
        keywords_progress=video.keywords_progress,
        transcript=video.transcript,
        short_summary=video.short_summary,
        summary=video.summary,
        key_moments=[KeyMomentOut(**km.model_dump()) for km in video.key_moments],
        highlights=[KeyMomentOut(**hl.model_dump()) for hl in video.highlights],
        keywords=[KeywordOut(**kw.model_dump()) for kw in video.keywords],
        error_message=video.error_message,
        uploaded_at=video.uploaded_at,
    )


@router.post("/upload", response_model=VideoOut, status_code=201)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Please select a video file.")

    extension = os.path.splitext(file.filename)[1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported video format.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File is too large.")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{extension}"
    file_path = os.path.join(settings.UPLOAD_DIR, stored_name)

    with open(file_path, "wb") as output_file:
        output_file.write(contents)

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
        key_moments_progress=0,
        highlights_progress=0,
        keywords_progress=0,
        transcript="",
        short_summary="",
        summary="",
        key_moments=[],
        highlights=[],
        keywords=[],
        error_message="",
    )
    await video.insert()

    background_tasks.add_task(process_video, video)
    return _to_out(video)


@router.get("/history", response_model=List[VideoOut])
async def upload_history(current_user: User = Depends(get_current_user)):
    videos = (
        await Video.find(Video.user_id == str(current_user.id))
        .sort(-Video.uploaded_at)
        .to_list()
    )
    return [_to_out(video) for video in videos]


@router.get("/{video_id}/status", response_model=VideoOut)
async def video_status(video_id: str, current_user: User = Depends(get_current_user)):
    try:
        object_id = PydanticObjectId(video_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Video not found.")

    video = await Video.get(object_id)
    if not video or video.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Video not found.")

    return _to_out(video)


@router.post("/{video_id}/summary", response_model=VideoOut)
async def generate_video_summary(video_id: str, current_user: User = Depends(get_current_user)):
    try:
        object_id = PydanticObjectId(video_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Video not found.")

    video = await Video.get(object_id)
    if not video or video.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Video not found.")

    # --- Duplicate-processing guard (Module 2, Section 10) ---
    if video.status == "processing" and video.current_stage == "summary":
        raise HTTPException(status_code=409, detail="Summary generation is already in progress.")

    if not video.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript is not available yet.")

    try:
        video.current_stage = "summary"
        video.summary_progress = 10
        video.progress = 80
        video.status = "processing"
        video.error_message = ""
        await video.save()

        summaries = generate_summaries(video.transcript)
        video.short_summary = summaries["short_summary"]
        video.summary = summaries["detailed_summary"]

        video.summary_progress = 100
        video.progress = 100
        video.current_stage = "done"
        video.status = "done"
        video.error_message = ""
        await video.save()

        return _to_out(video)

    except Exception as exc:
        video.status = "failed"
        video.current_stage = "failed"
        video.error_message = str(exc)
        video.summary_progress = 0
        await video.save()
        raise HTTPException(status_code=502, detail=f"Summary generation failed: {exc}")


@router.post("/{video_id}/key-moments", response_model=VideoOut)
async def generate_key_moments(video_id: str, current_user: User = Depends(get_current_user)):
    """
    Detect key moments (important segments + timestamps) for a video
    whose transcript is already available. Currently uses a placeholder
    detection algorithm (see app/services/key_moments_service.py) until
    the real timestamp-extraction logic is ready.
    """
    try:
        object_id = PydanticObjectId(video_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Video not found.")

    video = await Video.get(object_id)
    if not video or video.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Video not found.")

    # --- Duplicate-processing guard (Module 2, Section 10) ---
    if video.status == "processing" and video.current_stage == "key_moments":
        raise HTTPException(status_code=409, detail="Key moments generation is already in progress.")

    if not video.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript is not available yet.")

    try:
        video.current_stage = "key_moments"
        video.key_moments_progress = 10
        video.status = "processing"
        video.error_message = ""
        await video.save()

        raw_moments = detect_key_moments(video.transcript)
        video.key_moments = [KeyMoment(**m) for m in raw_moments]

        video.key_moments_progress = 100
        video.current_stage = "done"
        video.status = "done"
        video.error_message = ""
        await video.save()

        return _to_out(video)

    except Exception as exc:
        video.status = "failed"
        video.current_stage = "failed"
        video.error_message = str(exc)
        video.key_moments_progress = 0
        await video.save()
        raise HTTPException(status_code=502, detail=f"Key moments generation failed: {exc}")


@router.post("/{video_id}/highlights", response_model=VideoOut)
async def generate_video_highlights(video_id: str, current_user: User = Depends(get_current_user)):
    """
    Selects the most important key moments as highlights.
    Requires key moments to already exist — call
    POST /{video_id}/key-moments first.
    """
    try:
        object_id = PydanticObjectId(video_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Video not found.")

    video = await Video.get(object_id)
    if not video or video.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Video not found.")

    # --- Duplicate-processing guard (Module 2, Section 10) ---
    if video.status == "processing" and video.current_stage == "highlights":
        raise HTTPException(status_code=409, detail="Highlight generation is already in progress.")

    if not video.key_moments:
        raise HTTPException(
            status_code=400,
            detail="No key moments available yet. Generate key moments first.",
        )

    try:
        video.current_stage = "highlights"
        video.highlights_progress = 10
        video.status = "processing"
        video.error_message = ""
        await video.save()

        raw_key_moments = [km.model_dump() for km in video.key_moments]
        top_highlights = generate_highlights(raw_key_moments)
        video.highlights = [KeyMoment(**h) for h in top_highlights]

        video.highlights_progress = 100
        video.current_stage = "done"
        video.status = "done"
        video.error_message = ""
        await video.save()

        return _to_out(video)

    except Exception as exc:
        video.status = "failed"
        video.current_stage = "failed"
        video.error_message = str(exc)
        video.highlights_progress = 0
        await video.save()
        raise HTTPException(status_code=502, detail=f"Highlight generation failed: {exc}")


@router.post("/{video_id}/keywords", response_model=VideoOut)
async def generate_video_keywords(video_id: str, current_user: User = Depends(get_current_user)):
    """
    Extracts keywords/topics from the transcript. Currently uses a
    basic word-frequency placeholder (see
    app/services/keyword_service.py) until the real NLP-based
    extraction is ready.
    """
    try:
        object_id = PydanticObjectId(video_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Video not found.")

    video = await Video.get(object_id)
    if not video or video.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Video not found.")

    # --- Duplicate-processing guard (Module 2, Section 10) ---
    if video.status == "processing" and video.current_stage == "keywords":
        raise HTTPException(status_code=409, detail="Keyword extraction is already in progress.")

    if not video.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript is not available yet.")

    try:
        video.current_stage = "keywords"
        video.keywords_progress = 10
        video.status = "processing"
        video.error_message = ""
        await video.save()

        raw_keywords = extract_keywords(video.transcript)
        video.keywords = [Keyword(**k) for k in raw_keywords]

        video.keywords_progress = 100
        video.current_stage = "done"
        video.status = "done"
        video.error_message = ""
        await video.save()

        return _to_out(video)

    except Exception as exc:
        video.status = "failed"
        video.current_stage = "failed"
        video.error_message = str(exc)
        video.keywords_progress = 0
        await video.save()
        raise HTTPException(status_code=502, detail=f"Keyword extraction failed: {exc}")