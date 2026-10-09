"""
Usage report computation (Module 6).

Follows the same approach as analytics_service.py: computed on-the-fly
from data already available on Video documents, no separate collection
needed for this first version.
"""

import os
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import List


def _file_size_or_zero(file_path: str) -> int:
    """Return the file's size in bytes, or 0 if it can't be read (e.g. already cleaned up)."""
    try:
        return os.path.getsize(file_path)
    except OSError:
        return 0


def compute_usage_report(videos: List) -> dict:
    """
    Build a usage report dict from a list of Video documents
    (typically: all videos belonging to the current user).
    """
    total_uploads = len(videos)

    # Uploads grouped by calendar day (YYYY-MM-DD), sorted chronologically.
    day_counts = Counter(
        video.uploaded_at.date().isoformat() for video in videos
    )
    uploads_by_day = [
        {"date": day, "count": count}
        for day, count in sorted(day_counts.items())
    ]

    status_counts = Counter(video.status for video in videos)
    success_count = status_counts.get("done", 0)
    failed_count = status_counts.get("failed", 0)
    in_progress_count = (
        status_counts.get("uploaded", 0) + status_counts.get("processing", 0)
    )

    success_rate = (
        round(success_count / total_uploads, 3) if total_uploads else 0.0
    )

    file_sizes = [_file_size_or_zero(video.file_path) for video in videos]
    total_storage_bytes = sum(file_sizes)
    average_file_size_bytes = (
        round(total_storage_bytes / total_uploads, 2) if total_uploads else 0.0
    )

    return {
        "total_uploads": total_uploads,
        "uploads_by_day": uploads_by_day,
        "success_count": success_count,
        "failed_count": failed_count,
        "in_progress_count": in_progress_count,
        "success_rate": success_rate,
        "total_storage_bytes": total_storage_bytes,
        "average_file_size_bytes": average_file_size_bytes,
        "generated_at": datetime.now(timezone.utc),
    }