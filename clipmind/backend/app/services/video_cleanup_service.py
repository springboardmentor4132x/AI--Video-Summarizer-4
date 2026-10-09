"""
Deleting a video everywhere it is referenced: the file on disk, its generated
clips and Story frames, and every per-user document that points at it.
Used by both the owner's DELETE /api/videos/{id} and the admin moderation route.
"""

import os
import shutil
from typing import Dict

from app.core.config import settings
from app.models.activity import VideoActivity
from app.models.bookmark import Bookmark
from app.models.clip import Clip
from app.models.comparison import VideoComparison
from app.models.memory_card import MemoryCard
from app.models.share import VideoShare
from app.models.story import Story
from app.models.video import Video


def video_duration(video: Video) -> float:
    """Seconds, from the last transcript segment (the Video document stores no duration)."""
    return max((s.end_time for s in video.transcript_segments), default=0.0)


def _inside_upload_dir(path: str) -> bool:
    root = os.path.abspath(settings.UPLOAD_DIR)
    target = os.path.abspath(path)
    return target == root or target.startswith(root + os.sep)


def _remove_file(path: str) -> bool:
    """Delete one file, but only ever inside UPLOAD_DIR."""
    if path and _inside_upload_dir(path) and os.path.isfile(path):
        try:
            os.remove(path)
            return True
        except OSError:
            return False
    return False


def file_size(video: Video) -> int:
    try:
        return os.path.getsize(video.file_path) if video.file_path and os.path.isfile(video.file_path) else 0
    except OSError:
        return 0


async def delete_video_and_dependents(video: Video) -> Dict[str, int]:
    vid = str(video.id)
    counts: Dict[str, int] = {}

    clips = await Clip.find(Clip.video_id == vid).to_list()
    counts["clip_files"] = sum(1 for c in clips if _remove_file(c.file_path))
    for model, name in ((Clip, "clips"), (Bookmark, "bookmarks"), (MemoryCard, "memory_cards"),
                        (VideoActivity, "activity"), (VideoShare, "shares"), (Story, "stories")):
        res = await model.find(model.video_id == vid).delete()
        counts[name] = getattr(res, "deleted_count", 0) or 0
    res = await VideoComparison.find({"$or": [{"old_video_id": vid}, {"new_video_id": vid}]}).delete()
    counts["comparisons"] = getattr(res, "deleted_count", 0) or 0

    frames = os.path.join(settings.UPLOAD_DIR, "story_frames", vid)
    if _inside_upload_dir(frames) and os.path.isdir(frames):
        shutil.rmtree(frames, ignore_errors=True)

    counts["video_file"] = 1 if _remove_file(video.file_path) else 0
    await video.delete()
    return counts
