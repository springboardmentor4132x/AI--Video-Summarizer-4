from fastapi import APIRouter
from pydantic import BaseModel
from app.main import db
from datetime import datetime, timezone

router = APIRouter(
    prefix="/summaries",
    tags=["Summaries"]
)


class SummaryCreate(BaseModel):
    video_id: str
    short_summary: str
    detailed_summary: str


@router.post("/")
async def create_summary(data: SummaryCreate):

    summary_data = {
        "video_id": data.video_id,
        "short_summary": data.short_summary,
        "detailed_summary": data.detailed_summary,
        "created_at": datetime.now(timezone.utc)
    }

    result = await db.summaries.insert_one(summary_data)

    return {
        "message": "Summary stored successfully",
        "summary_id": str(result.inserted_id),
        "video_id": data.video_id
    }


@router.get("/{video_id}")
async def get_summary(video_id: str):

    summary = await db.summaries.find_one({
        "video_id": video_id
    })

    if not summary:
        return {
            "message": "Summary not found",
            "video_id": video_id
        }

    return {
        "id": str(summary["_id"]),
        "video_id": summary["video_id"],
        "short_summary": summary["short_summary"],
        "detailed_summary": summary["detailed_summary"]
    }