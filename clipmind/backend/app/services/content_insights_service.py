"""
Content insights computation (Module 6).

Same approach as analytics_service.py / usage_service.py: computed
on-the-fly from existing Video documents, no new AI model or
collection needed for this first version.
"""

from collections import Counter
from datetime import datetime, timezone
from typing import List
def _video_duration_seconds(video) -> float:
    """Estimate duration from the last transcript segment's end_time, if available."""
    if video.transcript_segments:
        return video.transcript_segments[-1].end_time
    return 0.0
def compute_content_insights(videos: List) -> dict:
    total_videos = len(videos)

    videos_with_data = [v for v in videos if v.status == "done"]
    analyzed_count = len(videos_with_data)

    # Top topics: count how many DIFFERENT videos each keyword appears in
    # (not raw frequency within one video) to surface broad, recurring themes.
    topic_video_counts = Counter()
    for video in videos_with_data:
        unique_words_this_video = {kw.word for kw in video.keywords}
        for word in unique_words_this_video:
            topic_video_counts[word] += 1

    top_topics = [
        {"word": word, "frequency": count}
        for word, count in topic_video_counts.most_common(10)
    ]

    # Key moments per minute, averaged across videos that have both
    # key moments and a usable duration.
    density_values = []
    for video in videos_with_data:
        duration = _video_duration_seconds(video)
        if duration > 0:
            density_values.append(len(video.key_moments) / (duration / 60))

    avg_density = (
        round(sum(density_values) / len(density_values), 2)
        if density_values else 0.0
    )

    avg_keywords = (
        round(sum(len(v.keywords) for v in videos_with_data) / analyzed_count, 2)
        if analyzed_count else 0.0
    )

    short = medium = long = 0
    for video in videos_with_data:
        duration = _video_duration_seconds(video)
        if duration == 0:
            continue
        elif duration < 60:
            short += 1
        elif duration <= 300:
            medium += 1
        else:
            long += 1

    return {
        "total_videos_analyzed": analyzed_count,
        "top_topics": top_topics,
        "average_key_moments_per_minute": avg_density,
        "average_keywords_per_video": avg_keywords,
        "length_distribution": {"short": short, "medium": medium, "long": long},
        "generated_at": datetime.now(timezone.utc),
    }