from fastapi import APIRouter, HTTPException, Query
from app.models import SummaryGenerateRequest, SummaryResponse, ProcessingStatus
from app.services.summary_service import summarize_transcript
from app import mock_db as db
router = APIRouter(prefix="/summary", tags=["Summary"])
@router.post("/generate", response_model=SummaryResponse)
def generate_summary(payload: SummaryGenerateRequest):
    video_id = payload.video_id
    user_id = payload.user_id

    # Summary depends on a completed transcript (transcript is never lost even if summary fails)
    transcript_record = db.get_transcript(video_id)
    if not transcript_record or transcript_record["status"] != ProcessingStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail="Transcript must be COMPLETED before generating a summary.",
        )
    if transcript_record["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="You are not authorized to access this video.")
    existing_summary = db.get_summary(video_id)
    if existing_summary and existing_summary["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="You are not authorized to access this video's summary.")
    
    # Prevent duplicate processing — don't start a second job while one is running
    if existing_summary and existing_summary["status"] == ProcessingStatus.PROCESSING:
        return SummaryResponse(**existing_summary)

    # Already completed -> return existing rather than silently regenerating
    if existing_summary and existing_summary["status"] == ProcessingStatus.COMPLETED:
        return SummaryResponse(**existing_summary)

    # NOT_STARTED or FAILED -> (re)start summarization (retry-safe)
    db.save_summary(video_id, user_id, status=ProcessingStatus.PROCESSING)

    try:
        short_summary, detailed_summary = summarize_transcript(transcript_record["transcript"])
    except Exception as e:
        record = db.save_summary(video_id, user_id, status=ProcessingStatus.FAILED, error=str(e))
        return SummaryResponse(**record)

    record = db.save_summary(
        video_id, user_id,
        status=ProcessingStatus.COMPLETED,
        short_summary=short_summary,
        detailed_summary=detailed_summary,
        error=None,
    )
    return SummaryResponse(**record)
@router.get("/{video_id}", response_model=SummaryResponse)
def get_summary(video_id: str, user_id: str = Query(..., description="Requesting user's ID, for authorization")):
    record = db.get_summary(video_id)
    if not record:
        raise HTTPException(status_code=404, detail="Summary not found for this video_id")
    if record["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="You are not authorized to access this video's summary.")
    return SummaryResponse(**record)