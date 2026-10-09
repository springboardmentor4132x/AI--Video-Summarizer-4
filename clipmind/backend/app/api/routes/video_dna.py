"""
Video DNA (integrated from Harika's implementation).

Keeps the response contract her VideoDNA page was built against --
``{video_id, sections: [{id, title, topic, segment, timestamp, start, end,
highlight, importance, information_density}], total_sections}`` -- but, unlike
the original endpoint (which read a separate ``key_moments`` collection that does
not exist in the canonical schema), every value is computed on demand from the
video's stored transcript, key moments and keywords. Nothing is hardcoded.

Units: ``start`` / ``end`` / ``timestamp`` are seconds (so the UI can seek the
player directly); ``information_density`` is 0-100.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.api.routes.videos import _find_owned_video
from app.models.user import User
from app.services.insight_service import video_dna

router = APIRouter(prefix="/api/video-dna", tags=["Video DNA"])

HIGH_IMPORTANCE = 0.66
MEDIUM_IMPORTANCE = 0.33


def _importance_label(density: float) -> str:
    if density >= HIGH_IMPORTANCE:
        return "high"
    if density >= MEDIUM_IMPORTANCE:
        return "medium"
    return "low"


def to_sections(dna: dict) -> List[dict]:
    """Map the computed DNA onto the section shape the Video DNA page reads."""
    sections = []
    for s in dna["sections"]:
        topics = s.get("topics") or []
        role = s.get("role", "Explanation")
        sections.append({
            "id": f"s{s['index']}",
            "title": f"{role}: {', '.join(topics)}" if topics else role,
            "topic": topics[0] if topics else role,
            "segment": role,
            "timestamp": s["start_time"],
            "start": s["start_time"],
            "end": s["end_time"],
            "highlight": s.get("excerpt", ""),
            "importance": _importance_label(s.get("importance_density", 0.0)),
            "importance_density": s.get("importance_density", 0.0),
            "information_density": round(s.get("information_density", 0.0) * 100),
            "topics": topics,
        })
    return sections


@router.get("/{video_id}")
async def get_video_dna(video_id: str, current_user: User = Depends(get_current_user)):
    video = await _find_owned_video(video_id, current_user)
    segs = [
        {"start_time": s.start_time, "end_time": s.end_time, "text": s.text}
        for s in video.transcript_segments
        if s.text.strip()
    ]
    if not segs:
        raise HTTPException(
            status_code=422,
            detail="This video has no timestamped transcript yet, so there is nothing to analyze.",
        )
    dna = video_dna(
        segs,
        [m.model_dump() for m in video.key_moments],
        [k.model_dump() for k in video.keywords],
    )
    sections = to_sections(dna)
    return {
        "video_id": str(video.id),
        "filename": video.filename,
        "duration": dna["duration"],
        "sections": sections,
        "total_sections": len(sections),
        "topic_distribution": dna["topic_distribution"],
    }
