from fastapi import APIRouter
from pydantic import BaseModel
from app.main import db
from datetime import datetime, timezone
from bson import ObjectId

router = APIRouter(
    prefix="/key-moments",
    tags=["Key Moments"]
)


class KeyMomentCreate(BaseModel):
    video_id: str
    timestamp: str
    segment: str
    highlight: str
    importance: str


@router.post("/")
async def create_key_moment(moment: KeyMomentCreate):

    new_moment = {
        "video_id": moment.video_id,
        "timestamp": moment.timestamp,
        "segment": moment.segment,
        "highlight": moment.highlight,
        "importance": moment.importance,
        "created_at": datetime.now(timezone.utc)
    }

    result = await db.key_moments.insert_one(new_moment)

    return {
        "message": "Key moment stored successfully",
        "key_moment_id": str(result.inserted_id),
        "video_id": moment.video_id
    }


@router.get("/{video_id}")
async def get_key_moments(video_id: str):

    moments = []

    cursor = db.key_moments.find(
        {"video_id": video_id}
    )

    async for moment in cursor:
        moments.append({
            "id": str(moment["_id"]),
            "video_id": moment["video_id"],
            "timestamp": moment["timestamp"],
            "segment": moment["segment"],
            "highlight": moment["highlight"],
            "importance": moment["importance"]
        })

    return {
        "video_id": video_id,
        "key_moments": moments
    }


@router.put("/{moment_id}")
async def update_key_moment(
    moment_id: str,
    moment: KeyMomentCreate
):

    if not ObjectId.is_valid(moment_id):
        return {"message": "Invalid key moment ID"}

    result = await db.key_moments.update_one(
        {"_id": ObjectId(moment_id)},
        {
            "$set": {
                "video_id": moment.video_id,
                "timestamp": moment.timestamp,
                "segment": moment.segment,
                "highlight": moment.highlight,
                "importance": moment.importance,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    if result.matched_count == 0:
        return {"message": "Key moment not found"}

    return {
        "message": "Key moment updated successfully",
        "key_moment_id": moment_id
    }


@router.delete("/{moment_id}")
async def delete_key_moment(moment_id: str):

    if not ObjectId.is_valid(moment_id):
        return {"message": "Invalid key moment ID"}

    result = await db.key_moments.delete_one(
        {"_id": ObjectId(moment_id)}
    )

    if result.deleted_count == 0:
        return {"message": "Key moment not found"}

    return {
        "message": "Key moment deleted successfully",
        "key_moment_id": moment_id
    }