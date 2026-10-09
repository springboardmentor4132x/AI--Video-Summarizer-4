"""
Video upload, processing, status, transcript and analysis routes.
"""

import os
import uuid
from typing import List, Literal
from beanie import PydanticObjectId
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

from datetime import datetime, timezone
from app.api.deps import get_current_user, require_role
from app.core.config import settings
from app.core.roles import CONTENT_CREATOR, EDUCATOR, ADMINISTRATOR
from app.models.user import User
from app.models.share import VideoShare
from app.models.video import Video
from app.schemas.video import (
    ChapterOut,
    KeyMomentOut,
    KeywordOut,
    SummaryTranslationOut,
    TranscriptSegmentOut,
    VideoOut,
)
from app.services import process_video, generate_summary
from app.services.highlight_service import generate_highlights
from app.services.key_moments_service import detect_key_moments
from app.services.keyword_service import extract_keywords
from app.services.chapter_service import generate_chapters
from app.services.translation_service import translate_summary, SUPPORTED_LANGUAGES
from app.services.qa_service import answer_question
from app.services.evidence_service import answer_with_evidence  # Evidence Lens
from app.services.pdf_service import build_report_pdf
from app.services.model_manager import ModelUnavailable


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
        transcription_language=video.transcription_language,
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
        chapters=[
            ChapterOut(
                title=chapter.title,
                start_time=chapter.start_time,
                end_time=chapter.end_time,
            )
            for chapter in video.chapters
        ],
        translations={
            lang: SummaryTranslationOut(short=entry.short, detailed=entry.detailed)
            for lang, entry in video.translations.items()
        },
        error_message=video.error_message,
        transcript_edited_at=video.transcript_edited_at,
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


async def _find_accessible_video(video_id: str, current_user: User) -> Video:
    """Owner, or someone the owner shared the video with (READ-ONLY routes only).

    Used for status, transcript, the video file and Q&A. Everything that
    creates or changes data still uses _find_owned_video.
    """
    try:
        object_id = PydanticObjectId(video_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Video not found.")

    video = await Video.get(object_id)
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found.")
    if video.user_id == str(current_user.id):
        return video
    shared = await VideoShare.find_one(
        VideoShare.video_id == str(video.id),
        VideoShare.student_id == str(current_user.id),
    )
    if shared is None:
        raise HTTPException(status_code=404, detail="Video not found.")   # same answer as "doesn't exist"
    return video


@router.post(
    "/upload",
    response_model=VideoOut,
    status_code=201,
)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    language: Literal["auto", "en", "hi"] = Form("auto"),
    # Uploading/producing content is restricted to the roles that make
    # sense as content producers in this platform; Learner is a
    # consumer role (still free to view, search, bookmark, clip, ask
    # Q&A about, and translate any video they were given access to).
    current_user: User = Depends(require_role(CONTENT_CREATOR, EDUCATOR, ADMINISTRATOR)),
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
        transcription_language=language,
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


@router.post(
    "/{video_id}/retranscribe",
    response_model=VideoOut,
)
async def retranscribe_video(
    video_id: str,
    background_tasks: BackgroundTasks,
    language: Literal["auto", "en", "hi"] = Form("auto"),
    current_user: User = Depends(
        require_role(CONTENT_CREATOR, EDUCATOR, ADMINISTRATOR)
    ),
):
    """Re-run the owned video's pipeline with an explicit speech language."""
    video = await _find_owned_video(video_id, current_user)
    if video.status == "processing":
        raise HTTPException(
            status_code=409,
            detail="This video is already being processed.",
        )
    if not os.path.isfile(video.file_path):
        raise HTTPException(
            status_code=410,
            detail="The original video file is no longer available to transcribe.",
        )

    video.transcription_language = language
    video.status = "processing"
    video.current_stage = "audio"
    video.progress = 10
    video.audio_progress = 0
    video.transcription_progress = 0
    video.summary_progress = 0
    video.key_moments_progress = 0
    video.highlights_progress = 0
    video.keywords_progress = 0
    video.transcript = ""
    video.transcript_segments = []
    video.short_summary = ""
    video.summary = ""
    video.key_moments = []
    video.highlights = []
    video.keywords = []
    video.chapters = []
    video.translations = {}
    video.transcript_edited_at = None
    video.error_message = ""
    await video.save()

    background_tasks.add_task(process_video, video)
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

    video = await _find_accessible_video(
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

    video = await _find_accessible_video(
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

        video.summary = summary[1]
        video.short_summary = summary[0]
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

        # NOTE: keys must be "start_time"/"end_time" to match what
        # key_moments_service._merge_segments / _detect_from_segments
        # expect. Using "start"/"end" here would silently produce
        # zero candidates (KeyError-safe via .get in some places, but
        # inconsistent with the service's real field names).
        segments = [
            {
                "start_time": segment.start_time,
                "end_time": segment.end_time,
                "text": segment.text,
            }
            for segment in video.transcript_segments
        ]

        # IMPORTANT: transcript_segments must be passed as a keyword
        # argument. detect_key_moments's signature is:
        #   detect_key_moments(transcript, video_duration_seconds=None,
        #                       transcript_segments=None)
        # Passing `segments` positionally lands it in
        # `video_duration_seconds` instead, which silently skips the
        # real segment-based detection and can crash the plain-text
        # fallback path (dividing a list by an int).
        moments = detect_key_moments(
            video.transcript,
            transcript_segments=segments,
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

# =====================================================================
# POST-MILESTONE-3 FEATURES: video file streaming, chapters,
# multilingual summary translation, transcript Q&A, PDF export.
# All reuse _find_owned_video / _to_out and the existing Video model --
# no second pipeline, no duplicate auth mechanism.
# =====================================================================


@router.get("/{video_id}/file")
async def get_video_file(
    video_id: str,
    current_user: User = Depends(get_current_user),
):
    """Serve the raw uploaded video file, for the frontend <video> player.

    There was previously no way to play back an uploaded video at all --
    this is the minimum needed for that, reusing the same ownership
    check as every other video route (owner, or shared with you).
    """
    video = await _find_accessible_video(video_id, current_user)

    if not video.file_path or not os.path.exists(video.file_path):
        raise HTTPException(status_code=404, detail="Video file not found on disk.")

    return FileResponse(video.file_path, media_type="video/mp4", filename=video.filename)


class TranslateRequest(BaseModel):
    language: str  # one of translation_service.SUPPORTED_LANGUAGES keys


@router.post("/{video_id}/translate", response_model=VideoOut)
async def translate_video_summary(
    video_id: str,
    payload: TranslateRequest,
    current_user: User = Depends(get_current_user),
):
    video = await _find_owned_video(video_id, current_user)

    if payload.language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language '{payload.language}'. "
            f"Supported: {', '.join(SUPPORTED_LANGUAGES)}",
        )

    # Cache hit: never call the translation API twice for the same
    # video+language.
    if payload.language in video.translations:
        return _to_out(video)

    if not video.summary.strip():
        raise HTTPException(
            status_code=400,
            detail="Summary is not available yet -- nothing to translate.",
        )

    try:
        short_t, detailed_t = translate_summary(
            video.short_summary, video.summary, payload.language
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except ModelUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Translation failed: {exc}")

    from app.models.video import SummaryTranslation

    video.translations[payload.language] = SummaryTranslation(short=short_t, detailed=detailed_t)
    await video.save()

    return _to_out(video)


@router.post("/{video_id}/chapters", response_model=VideoOut)
async def generate_video_chapters(
    video_id: str,
    current_user: User = Depends(get_current_user),
):
    """Generate (or return already-generated) chapters for this video."""
    video = await _find_owned_video(video_id, current_user)

    # Generate once, reuse after that -- no repeated work.
    if video.chapters:
        return _to_out(video)

    if not video.key_moments:
        raise HTTPException(
            status_code=400,
            detail="Key moments are not available yet -- chapters need them first.",
        )

    key_moment_dicts = [km.model_dump() for km in video.key_moments]
    video_duration = video.transcript_segments[-1].end_time if video.transcript_segments else None

    chapter_dicts = generate_chapters(key_moment_dicts, video_duration_seconds=video_duration)

    from app.models.video import Chapter

    video.chapters = [Chapter(**c) for c in chapter_dicts]
    await video.save()

    return _to_out(video)


class AskRequest(BaseModel):
    question: str


# ---- Evidence Lens: answer + the transcript evidence that supports it ----

class EvidenceItem(BaseModel):
    start_time: float
    end_time: float
    text: str
    score: float
    strength: str  # "strong" | "moderate" | "weak"
    matched_words: List[str] = []


class AskResponse(BaseModel):
    answer: str
    relevant_timestamps: List[float]  # kept for backward compatibility
    insufficient_info: bool
    evidence: List[EvidenceItem] = []


@router.post("/{video_id}/ask", response_model=AskResponse)
async def ask_about_video(
    video_id: str,
    payload: AskRequest,
    current_user: User = Depends(get_current_user),
):
    video = await _find_accessible_video(video_id, current_user)

    if not video.transcript_segments:
        raise HTTPException(
            status_code=400,
            detail="Transcript is not available yet -- nothing to answer from.",
        )

    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    segments = [
        {"start_time": s.start_time, "end_time": s.end_time, "text": s.text}
        for s in video.transcript_segments
    ]

    try:
        result = answer_with_evidence(payload.question, segments)
    except ModelUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Q&A failed: {exc}")

    return AskResponse(
        answer=result["answer"],
        relevant_timestamps=[e["start_time"] for e in result["evidence"]],
        insufficient_info=result["insufficient_info"],
        evidence=result["evidence"],
    )


@router.get("/{video_id}/export-pdf")
async def export_video_pdf(
    video_id: str,
    language: str | None = None,
    current_user: User = Depends(get_current_user),
):
    video = await _find_owned_video(video_id, current_user)

    if not video.summary.strip():
        raise HTTPException(
            status_code=400,
            detail="Summary is not available yet -- nothing to export.",
        )

    short_summary, detailed_summary = video.short_summary, video.summary
    language_name = None

    if language and language != "en":
        if language not in SUPPORTED_LANGUAGES:
            raise HTTPException(status_code=400, detail=f"Unsupported language '{language}'.")
        translation = video.translations.get(language)
        if translation is None:
            raise HTTPException(
                status_code=400,
                detail="This language hasn't been translated yet -- translate the summary first.",
            )
        short_summary, detailed_summary = translation.short, translation.detailed
        language_name = SUPPORTED_LANGUAGES[language]

    try:
        pdf_bytes = build_report_pdf(
            filename=video.filename,
            uploaded_at=video.uploaded_at,
            short_summary=short_summary,
            detailed_summary=detailed_summary,
            chapters=[c.model_dump() for c in video.chapters],
            key_moments=[m.model_dump() for m in video.key_moments],
            keywords=[k.model_dump() for k in video.keywords],
            language_code=language if language_name else None,
            language_name=language_name,
        )
    except RuntimeError as exc:
        # Honest failure (e.g. no Unicode font available for this
        # script) -- not a silently broken/garbled PDF.
        raise HTTPException(status_code=501, detail=str(exc))

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{video.filename}_report.pdf"'
        },
    )


# =====================================================================
# Transcript editing + owner deletion (original spec: "Transcript editing",
# "Manage uploaded videos"). Owner only; learners cannot edit transcripts.
# =====================================================================


class SegmentEdit(BaseModel):
    index: int
    text: str


class TranscriptEditRequest(BaseModel):
    edits: List[SegmentEdit]


@router.patch("/{video_id}/transcript", response_model=VideoOut)
async def edit_transcript(
    video_id: str,
    payload: TranscriptEditRequest,
    current_user: User = Depends(require_role(CONTENT_CREATOR, EDUCATOR, ADMINISTRATOR)),
):
    """Correct transcript TEXT. Timestamps never change, so every link back to
    the video stays accurate. The summary, key moments, keywords and flashcards
    were generated from the earlier text until they are regenerated."""
    from app.services.transcript_edit_service import apply_segment_edits, rebuild_transcript

    video = await _find_owned_video(video_id, current_user)
    if not video.transcript_segments:
        raise HTTPException(status_code=400, detail="This video has no transcript to edit yet.")

    current = [s.model_dump() for s in video.transcript_segments]
    try:
        updated, changed = apply_segment_edits(current, [e.model_dump() for e in payload.edits])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if changed:
        video.transcript_segments = [type(video.transcript_segments[0])(**seg) for seg in updated]
        video.transcript = rebuild_transcript(updated)
        video.transcript_edited_at = datetime.now(timezone.utc)
        await video.save()
    return _to_out(video)


@router.delete("/{video_id}", status_code=204)
async def delete_video(
    video_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete one of your own videos and everything generated from it."""
    from app.services.video_cleanup_service import delete_video_and_dependents

    video = await _find_owned_video(video_id, current_user)
    await delete_video_and_dependents(video)
    return Response(status_code=204)
