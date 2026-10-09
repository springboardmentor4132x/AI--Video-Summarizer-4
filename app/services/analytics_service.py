"""
Analytics computation.

Everything here is computed on-the-fly from data already stored on
Video documents (transcript, summaries, key_moments, highlights,
keywords) — no separate analytics collection or schema is needed for
this first version. If usage grows large enough that recomputing on
every request becomes slow, these could be cached or precomputed at
write-time later.
"""

from collections import Counter
from typing import List
def _word_count(text: str) -> int:
    return len(text.split()) if text else 0
def compute_video_analytics(video) -> dict:
    """
    Build the analytics dict for a single video. `video` is a Video
    document (from app.models.video).
    """
    top_keywords = sorted(
        video.keywords,
        key=lambda k: k.score,
        reverse=True,
    )[:5]
    return {
        "video_id": str(video.id),
        "filename": video.filename,
        "status": video.status,
        "transcript_word_count": _word_count(video.transcript),
        "short_summary_word_count": _word_count(video.short_summary),
        "summary_word_count": _word_count(video.summary),
        "key_moments_count": len(video.key_moments),
        "highlights_count": len(video.highlights),
        "keywords_count": len(video.keywords),
        "top_keywords": [kw.word for kw in top_keywords],
        "uploaded_at": video.uploaded_at,
    }
def compute_dashboard_analytics(videos: List) -> dict:
    """
    Build aggregated analytics across a list of Video documents
    (typically: all videos belonging to the current user).
    """
    total_videos = len(videos)
    status_counts = Counter(v.status for v in videos)
    total_transcript_words = sum(_word_count(v.transcript) for v in videos)
    total_key_moments = sum(len(v.key_moments) for v in videos)
    total_highlights = sum(len(v.highlights) for v in videos)
    average_key_moments = (
        round(total_key_moments / total_videos, 2) if total_videos else 0.0
    )
    all_keywords = [kw.word for v in videos for kw in v.keywords]
    most_common = [w for w, _ in Counter(all_keywords).most_common(10)]
    last_upload_at = max((v.uploaded_at for v in videos), default=None)
    return {
        "total_videos": total_videos,
        "videos_by_status": {
            "uploaded": status_counts.get("uploaded", 0),
            "processing": status_counts.get("processing", 0),
            "done": status_counts.get("done", 0),
            "failed": status_counts.get("failed", 0),
        },
        "total_transcript_words": total_transcript_words,
        "total_key_moments": total_key_moments,
        "total_highlights": total_highlights,
        "average_key_moments_per_video": average_key_moments,
        "most_common_keywords": most_common,
        "last_upload_at": last_upload_at,
    }