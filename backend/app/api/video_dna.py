from fastapi import APIRouter
from app.main import db

router = APIRouter(
    prefix="/video-dna",
    tags=["Video DNA"]
)


@router.get("/{video_id}")
async def get_video_dna(video_id: str):

    sections = []

    cursor = db.key_moments.find(
        {"video_id": video_id}
    ).sort("timestamp", 1)

    async for moment in cursor:

        sections.append({
            "id": str(moment["_id"]),
            "video_id": moment.get("video_id", video_id),

            "title": moment.get(
                "title",
                moment.get(
                    "segment",
                    "Untitled Section"
                )
            ),

            "topic": moment.get(
                "topic",
                ""
            ),

            "segment": moment.get(
                "segment",
                ""
            ),

            "timestamp": moment.get(
                "timestamp",
                ""
            ),

            "start": moment.get(
                "start",
                moment.get("timestamp", "")
            ),

            "end": moment.get(
                "end",
                ""
            ),

            "highlight": moment.get(
                "highlight",
                ""
            ),

            "importance": moment.get(
                "importance",
                ""
            ),

            "information_density": moment.get(
                "information_density",
                0
            )
        })

    return {
        "video_id": video_id,
        "sections": sections,
        "total_sections": len(sections)
    }