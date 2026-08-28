from fastapi import APIRouter, HTTPException, Query
from app.models import TranscriptGenerateRequest, TranscriptResponse, ProcessingStatus
from app.services.whisper_service import transcribe_video
from app import mock_db as db
router = APIRouter(prefix="/transcript", tags=["Transcript"])
@router.post("/generate", response_model=TranscriptResponse)
def generate_transcript(payload: TranscriptGenerateRequest):
    video_id = payload.video_id
    user_id = payload.user_id
    existing = db.get_transcript(video_id)

    # Ownership check if a record already exists under a different user
    if existing and existing["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="You are not authorized to access this video's transcript.")

    # Prevent duplicate processing
    if existing and existing["status"] == ProcessingStatus.PROCESSING:
        return TranscriptResponse(**existing)

    # Already completed -> don't silently redo work, just return it
    if existing and existing["status"] == ProcessingStatus.COMPLETED:
        return TranscriptResponse(**existing)

    # NOT_STARTED or FAILED -> (re)start transcription
    record = db.save_transcript(video_id, user_id, status=ProcessingStatus.PROCESSING)

    try:
        transcript_text, language = transcribe_video(video_id)
    except Exception as e:
        record = db.save_transcript(video_id, user_id, status=ProcessingStatus.FAILED, error=str(e))
        return TranscriptResponse(**record)

    record = db.save_transcript(
        video_id, user_id,
        status=ProcessingStatus.COMPLETED,
        transcript=transcript_text,
        language=language,
        error=None,
    )
    return TranscriptResponse(**record)
@router.get("/{video_id}", response_model=TranscriptResponse)
def get_transcript(video_id: str, user_id: str = Query(..., description="Requesting user's ID, for authorization")):
    record = db.get_transcript(video_id)
    if not record:
        raise HTTPException(status_code=404, detail="Transcript not found for this video_id")
    if record["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="You are not authorized to access this video's transcript.")
    return TranscriptResponse(**record)