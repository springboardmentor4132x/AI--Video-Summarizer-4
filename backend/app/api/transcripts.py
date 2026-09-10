from fastapi import APIRouter
from pydantic import BaseModel
from app.main import db
from datetime import datetime, timezone

router = APIRouter(
    prefix="/transcripts",
    tags=["Transcripts"]
)

class TranscriptCreate(BaseModel):
    video_id: str
    transcript: str

@router.post("/")
async def create_transcript(data: TranscriptCreate):
    transcript_data = {
        "video_id": data.video_id,
        "transcript": data.transcript,
        "created_at": datetime.now(timezone.utc)
    }

    result = await db.transcripts.insert_one(transcript_data)

    return {
        "message": "Transcript stored successfully",
        "transcript_id": str(result.inserted_id),
        "video_id": data.video_id
    }

@router.get("/{video_id}")
async def get_transcript(video_id: str):
    transcript = await db.transcripts.find_one({
        "video_id": video_id
    })

    if not transcript:
        return {
            "message": "Transcript not found",
            "video_id": video_id
        }

    return {
        "id": str(transcript["_id"]),
        "video_id": transcript["video_id"],
        "transcript": transcript["transcript"]
    }