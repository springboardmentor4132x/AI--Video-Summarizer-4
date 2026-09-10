from fastapi import APIRouter
from pydantic import BaseModel
from app.main import db
from datetime import datetime, timezone
from bson import ObjectId

router = APIRouter(
    prefix="/keywords",
    tags=["Keywords"]
)


class KeywordCreate(BaseModel):
    video_id: str
    keyword: str
    relevance: str


@router.post("/")
async def create_keyword(data: KeywordCreate):

    new_keyword = {
        "video_id": data.video_id,
        "keyword": data.keyword,
        "relevance": data.relevance,
        "created_at": datetime.now(timezone.utc)
    }

    result = await db.keywords.insert_one(new_keyword)

    return {
        "message": "Keyword stored successfully",
        "keyword_id": str(result.inserted_id),
        "video_id": data.video_id
    }


@router.get("/{video_id}")
async def get_keywords(video_id: str):

    keywords = []

    cursor = db.keywords.find(
        {"video_id": video_id}
    )

    async for item in cursor:
        keywords.append({
            "id": str(item["_id"]),
            "video_id": item["video_id"],
            "keyword": item["keyword"],
            "relevance": item["relevance"]
        })

    return {
        "video_id": video_id,
        "keywords": keywords
    }


@router.put("/{keyword_id}")
async def update_keyword(
    keyword_id: str,
    data: KeywordCreate
):

    if not ObjectId.is_valid(keyword_id):
        return {
            "message": "Invalid keyword ID"
        }

    result = await db.keywords.update_one(
        {"_id": ObjectId(keyword_id)},
        {
            "$set": {
                "video_id": data.video_id,
                "keyword": data.keyword,
                "relevance": data.relevance,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    if result.matched_count == 0:
        return {
            "message": "Keyword not found"
        }

    return {
        "message": "Keyword updated successfully",
        "keyword_id": keyword_id
    }


@router.delete("/{keyword_id}")
async def delete_keyword(keyword_id: str):

    if not ObjectId.is_valid(keyword_id):
        return {
            "message": "Invalid keyword ID"
        }

    result = await db.keywords.delete_one(
        {"_id": ObjectId(keyword_id)}
    )

    if result.deleted_count == 0:
        return {
            "message": "Keyword not found"
        }

    return {
        "message": "Keyword deleted successfully",
        "keyword_id": keyword_id
    }