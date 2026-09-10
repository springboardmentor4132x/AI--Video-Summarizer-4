from fastapi import APIRouter
from pydantic import BaseModel
from app.main import db
from datetime import datetime, timezone
from bson import ObjectId

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"]
)


# =========================
# Analytics Data Model
# =========================

class AnalyticsCreate(BaseModel):
    video_id: str
    duration_seconds: float
    processing_time_seconds: float
    word_count: int
    keyword_count: int
    key_moment_count: int
    summary_generated: bool


# =========================
# CREATE ANALYTICS
# =========================

@router.post("/")
async def create_analytics(data: AnalyticsCreate):

    analytics_data = {
        "video_id": data.video_id,
        "duration_seconds": data.duration_seconds,
        "processing_time_seconds": data.processing_time_seconds,
        "word_count": data.word_count,
        "keyword_count": data.keyword_count,
        "key_moment_count": data.key_moment_count,
        "summary_generated": data.summary_generated,
        "created_at": datetime.now(timezone.utc)
    }

    result = await db.analytics.insert_one(analytics_data)

    return {
        "message": "Analytics data stored successfully",
        "analytics_id": str(result.inserted_id),
        "video_id": data.video_id
    }


# =========================
# ANALYTICS OVERVIEW
# =========================

@router.get("/stats/overview")
async def analytics_overview():

    total_videos = await db.videos.count_documents({})

    total_keywords = await db.keywords.count_documents({})

    total_key_moments = await db.key_moments.count_documents({})

    videos_with_summary = await db.analytics.count_documents({
        "summary_generated": True
    })

    return {
        "total_videos": total_videos,
        "total_keywords": total_keywords,
        "total_key_moments": total_key_moments,
        "videos_with_summary": videos_with_summary
    }


# =========================
# PROCESSING STATISTICS
# =========================

@router.get("/stats/processing")
async def processing_statistics():

    pipeline = [
        {
            "$group": {
                "_id": None,
                "average_processing_time": {
                    "$avg": "$processing_time_seconds"
                },
                "total_processed_videos": {
                    "$sum": 1
                }
            }
        }
    ]

    cursor = await db.analytics.aggregate(pipeline)

    result = await cursor.to_list(length=1)

    if not result:
        return {
            "total_processed_videos": 0,
            "average_processing_time": 0
        }

    return {
        "total_processed_videos": result[0]["total_processed_videos"],
        "average_processing_time": result[0]["average_processing_time"]
    }


# =========================
# READ ANALYTICS BY VIDEO
# =========================

@router.get("/{video_id}")
async def get_analytics(video_id: str):

    analytics = await db.analytics.find_one({
        "video_id": video_id
    })

    if not analytics:
        return {
            "message": "Analytics not found",
            "video_id": video_id
        }

    return {
        "id": str(analytics["_id"]),
        "video_id": analytics["video_id"],
        "duration_seconds": analytics["duration_seconds"],
        "processing_time_seconds": analytics["processing_time_seconds"],
        "word_count": analytics["word_count"],
        "keyword_count": analytics["keyword_count"],
        "key_moment_count": analytics["key_moment_count"],
        "summary_generated": analytics["summary_generated"]
    }


# =========================
# UPDATE ANALYTICS
# =========================

@router.put("/{analytics_id}")
async def update_analytics(
    analytics_id: str,
    data: AnalyticsCreate
):

    if not ObjectId.is_valid(analytics_id):
        return {
            "message": "Invalid analytics ID"
        }

    result = await db.analytics.update_one(
        {
            "_id": ObjectId(analytics_id)
        },
        {
            "$set": {
                "video_id": data.video_id,
                "duration_seconds": data.duration_seconds,
                "processing_time_seconds": data.processing_time_seconds,
                "word_count": data.word_count,
                "keyword_count": data.keyword_count,
                "key_moment_count": data.key_moment_count,
                "summary_generated": data.summary_generated,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    if result.matched_count == 0:
        return {
            "message": "Analytics not found"
        }

    return {
        "message": "Analytics updated successfully",
        "analytics_id": analytics_id
    }


# =========================
# DELETE ANALYTICS
# =========================

@router.delete("/{analytics_id}")
async def delete_analytics(analytics_id: str):

    if not ObjectId.is_valid(analytics_id):
        return {
            "message": "Invalid analytics ID"
        }

    result = await db.analytics.delete_one(
        {
            "_id": ObjectId(analytics_id)
        }
    )

    if result.deleted_count == 0:
        return {
            "message": "Analytics not found"
        }

    return {
        "message": "Analytics deleted successfully",
        "analytics_id": analytics_id
    }