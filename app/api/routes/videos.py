"""
Video upload, processing, status, transcript and analysis routes.
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
from app.schemas.video import (
    KeyMomentOut,
    KeywordOut,
    TranscriptSegmentOut,
    VideoOut,
)
from app.services import process_video, generate_summary
from app.services.highlight_service import generate_highlights
from app.services.key_moments_service import detect_key_moments
from app.services.keyword_service import extract_keywords


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
    """Convert a Video document into the API response schema."""

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
        transcript_segments=[
            TranscriptSegmentOut(
                start_time=segment.start_time,
                end_time=segment.end_time,
                text=segment.text,
            )
            for segment in video.transcript_segments
        ],
        short_summary=video.short_summary,
        summary=video.summary,
        key_moments=[
            KeyMomentOut(
                start_time=moment.start_time,
                end_time=moment.end_time,
                label=moment.label,
                text=moment.text,
                importance=moment.importance,
            )
            for moment in video.key_moments
        ],
        highlights=[
            KeyMomentOut(
                start_time=moment.start_time,
                end_time=moment.end_time,
                label=moment.label,
                text=moment.text,
                importance=moment.importance,
            )
            for moment in video.highlights
        ],
        keywords=[
            KeywordOut(
                word=keyword.word,
                score=keyword.score,
            )
            for keyword in video.keywords
        ],
        error_message=video.error_message,
        uploaded_at=video.uploaded_at,
    )


async def _find_owned_video(
    video_id: str,
    current_user: User,
) -> Video:
    """Find a video and verify ownership."""

    try:
        object_id = PydanticObjectId(video_id)
    except Exception:
        raise HTTPException(
            status_code=404,
            detail="Video not found.",
        )

    video = await Video.get(object_id)

    if video is None or video.user_id != str(current_user.id):
        raise HTTPException(
            status_code=404,
            detail="Video not found.",
        )

    return video


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
    """Upload a video and start background processing."""

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

    video = Video(
        user_id=str(current_user.id),
        filename=file.filename,
        file_path=file_path,
        status="uploaded",
        current_stage="upload",
        progress=0,
        upload_progress=100,
        audio_progress=0,
        transcription_progress=0,
        summary_progress=0,
        key_moments_progress=0,
        highlights_progress=0,
        keywords_progress=0,
        transcript="",
        transcript_segments=[],
        short_summary="",
        summary="",
        key_moments=[],
        highlights=[],
        keywords=[],
        error_message="",
    )

    await video.insert()

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
    """Return all videos belonging to the current user."""

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


@router.get(
    "/{video_id}/status",
    response_model=VideoOut,
)
async def video_status(
    video_id: str,
    current_user: User = Depends(get_current_user),
):
    """Return the current processing status of a video."""

    video = await _find_owned_video(
        video_id,
        current_user,
    )

    return _to_out(video)


@router.get(
    "/{video_id}/transcript",
    response_model=VideoOut,
)
async def get_transcript(
    video_id: str,
    current_user: User = Depends(get_current_user),
):
    """Return transcript and timestamped transcript segments."""

    video = await _find_owned_video(
        video_id,
        current_user,
    )

    if not video.transcript.strip():
        raise HTTPException(
            status_code=404,
            detail="Transcript is not available yet.",
        )

    return _to_out(video)


@router.post(
    "/{video_id}/summary",
    response_model=VideoOut,
)
async def generate_video_summary(
    video_id: str,
    current_user: User = Depends(get_current_user),
):
    """Generate or regenerate the AI summary."""

    video = await _find_owned_video(
        video_id,
        current_user,
    )

    if not video.transcript.strip():
        raise HTTPException(
            status_code=400,
            detail="Transcript is not available yet.",
        )

    try:
        video.current_stage = "summary"
        video.summary_progress = 10
        video.progress = 80
        video.status = "processing"
        video.error_message = ""

        await video.save()

        summary = generate_summary(video.transcript)

        video.summary = summary
        video.short_summary = summary
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

        raise HTTPException(
            status_code=502,
            detail=f"Summary generation failed: {exc}",
        )


@router.post(
    "/{video_id}/key-moments",
    response_model=VideoOut,
)
async def generate_video_key_moments(
    video_id: str,
    current_user: User = Depends(get_current_user),
):
    """Generate key moments from the video's transcript."""

    video = await _find_owned_video(
        video_id,
        current_user,
    )

    if not video.transcript.strip():
        raise HTTPException(
            status_code=400,
            detail="Transcript is not available yet.",
        )

    try:
        video.current_stage = "key_moments"
        video.key_moments_progress = 10
        video.status = "processing"
        await video.save()

        segments = [
            {
                "start": segment.start_time,
                "end": segment.end_time,
                "text": segment.text,
            }
            for segment in video.transcript_segments
        ]

        moments = detect_key_moments(
            video.transcript,
            segments,
        )

        video.key_moments = [
            {
                "start_time": moment["start_time"],
                "end_time": moment["end_time"],
                "label": moment.get("label", ""),
                "text": moment.get("text", ""),
                "importance": moment.get("importance", 0.0),
            }
            for moment in moments
        ]

        video.key_moments_progress = 100
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
        video.key_moments_progress = 0

        await video.save()

        raise HTTPException(
            status_code=500,
            detail=f"Key moment generation failed: {exc}",
        )


@router.post(
    "/{video_id}/highlights",
    response_model=VideoOut,
)
async def generate_video_highlights(
    video_id: str,
    current_user: User = Depends(get_current_user),
):
    """Generate highlights from existing key moments."""

    video = await _find_owned_video(
        video_id,
        current_user,
    )

    if not video.key_moments:
        raise HTTPException(
            status_code=400,
            detail="Key moments are not available yet.",
        )

    try:
        video.current_stage = "highlights"
        video.highlights_progress = 10
        video.status = "processing"
        await video.save()

        moments = [
            {
                "start_time": moment.start_time,
                "end_time": moment.end_time,
                "label": moment.label,
                "text": moment.text,
                "importance": moment.importance,
            }
            for moment in video.key_moments
        ]

        highlights = generate_highlights(moments)

        video.highlights = [
            {
                "start_time": highlight["start_time"],
                "end_time": highlight["end_time"],
                "label": highlight.get("label", ""),
                "text": highlight.get("text", ""),
                "importance": highlight.get("importance", 0.0),
            }
            for highlight in highlights
        ]

        video.highlights_progress = 100
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
        video.highlights_progress = 0

        await video.save()

        raise HTTPException(
            status_code=500,
            detail=f"Highlight generation failed: {exc}",
        )


@router.post(
    "/{video_id}/keywords",
    response_model=VideoOut,
)
async def generate_video_keywords(
    video_id: str,
    current_user: User = Depends(get_current_user),
):
    """Extract keywords from the video's transcript."""

    video = await _find_owned_video(
        video_id,
        current_user,
    )

    if not video.transcript.strip():
        raise HTTPException(
            status_code=400,
            detail="Transcript is not available yet.",
        )

    try:
        video.current_stage = "keywords"
        video.keywords_progress = 10
        video.status = "processing"
        await video.save()

        keywords = extract_keywords(
            video.transcript
        )

        video.keywords = [
            {
                "word": keyword["word"],
                "score": keyword.get("score", 0.0),
            }
            for keyword in keywords
        ]

        video.keywords_progress = 100
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
        video.keywords_progress = 0

        await video.save()

        raise HTTPException(
            status_code=500,
            detail=f"Keyword extraction failed: {exc}",
        )
