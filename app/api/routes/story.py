"""
ClipMind Story routes -- turn a processed video into an interactive
comic / storybook / study-notes / storyboard.

Every route enforces authentication (JWT via get_current_user) AND
ownership (the video must belong to the caller, and stories are always
looked up by the caller's user_id), exactly like bookmarks and clips.

Frames are real JPEGs extracted from the uploaded video with FFmpeg
(see frame_service). They are served through an authenticated route
rather than as public static files, because a plain <img src> can't
carry the Authorization header -- the frontend fetches them as blobs,
the same way it already does for the video file itself.
"""

import logging
import os
import re
import shutil
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse

from app.api.deps import get_current_user
from app.api.routes.videos import _find_owned_video
from app.core.config import settings
from app.models.story import Story, StoryPanel
from app.models.user import User
from app.models.video import Video
from app.schemas.story import (
    StoryDeleteOut,
    StoryGenerateRequest,
    StoryMode,
    StoryOut,
    StoryPanelOut,
)
from app.services.frame_service import extract_frame, probe_duration
from app.services.story_service import MODE_LABELS, build_story_panels

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/story", tags=["Story"])

_FRAME_NAME = re.compile(r"^panel_\d{2,3}_[0-9a-f]{8}\.jpg$")


# ------------------------------------------------------------------ helpers

def _frames_dir(video_id: str, mode: str) -> str:
    return os.path.join(settings.UPLOAD_DIR, "story_frames", video_id, mode)


def _frame_url(video_id: str, mode: str, filename: Optional[str]) -> Optional[str]:
    if not filename:
        return None
    return f"/api/story/{video_id}/frames/{mode}/{filename}"


def _panel_out(panel: StoryPanel, story: Story) -> StoryPanelOut:
    return StoryPanelOut(
        panel_id=panel.panel_id,
        video_id=story.video_id,
        panel_number=panel.panel_number,
        timestamp=panel.timestamp,
        start_time=panel.start_time,
        end_time=panel.end_time,
        frame_url=_frame_url(story.video_id, story.mode, panel.frame_file),
        title=panel.title,
        concept=panel.concept,
        caption=panel.caption,
        transcript_excerpt=panel.transcript_excerpt,
        importance=panel.importance,
    )


def _to_out(story: Story) -> StoryOut:
    return StoryOut(
        id=str(story.id),
        video_id=story.video_id,
        mode=story.mode,
        title=story.title,
        panels=[_panel_out(p, story) for p in story.panels],
        warnings=story.warnings,
        created_at=story.created_at,
        updated_at=story.updated_at,
    )


async def _find_story(video: Video, user: User, mode: Optional[str]) -> Optional[Story]:
    """The story for a given mode, or the most recently updated one if no mode."""
    conditions = [Story.user_id == str(user.id), Story.video_id == str(video.id)]
    if mode:
        conditions.append(Story.mode == mode)
        return await Story.find_one(*conditions)
    return await Story.find(*conditions).sort("-updated_at").first_or_none()


def _remove_files(directory: str, keep: set) -> None:
    if not os.path.isdir(directory):
        return
    for name in os.listdir(directory):
        if name not in keep:
            try:
                os.remove(os.path.join(directory, name))
            except OSError:
                logger.warning("Could not remove old story frame %s", name)


def _extract_all_frames(source_path: str, out_dir: str, panels: List[dict]) -> List[Optional[str]]:
    """Blocking: extract one frame per panel. Returns a filename (or None) per panel."""
    duration = probe_duration(source_path)
    results: List[Optional[str]] = []
    for panel in panels:
        filename = f"panel_{panel['panel_number']:02d}_{uuid.uuid4().hex[:8]}.jpg"
        try:
            extract_frame(source_path, panel["frame_time"], os.path.join(out_dir, filename), duration)
            results.append(filename)
        except FileNotFoundError:
            raise  # source video or FFmpeg itself is missing -> no point continuing
        except RuntimeError as exc:
            logger.warning("Frame extraction failed for panel %s: %s", panel["panel_number"], exc)
            results.append(None)
    return results


# ------------------------------------------------------------------- routes

@router.post("/generate/{video_id}", response_model=StoryOut, status_code=201)
async def generate_story(
    video_id: str,
    payload: Optional[StoryGenerateRequest] = None,
    current_user: User = Depends(get_current_user),
):
    """Generate (or regenerate) the story for one video in the chosen mode."""
    mode = (payload or StoryGenerateRequest()).mode
    video = await _find_owned_video(video_id, current_user)

    if video.status == "failed":
        raise HTTPException(
            status_code=409,
            detail="This video failed to process, so a story can't be created from it.",
        )
    if video.status != "done":
        raise HTTPException(
            status_code=409,
            detail="This video is still being processed. Try again once processing is complete.",
        )

    segments = [
        {"start_time": s.start_time, "end_time": s.end_time, "text": s.text}
        for s in video.transcript_segments
    ]
    if not any(s["text"].strip() for s in segments):
        raise HTTPException(
            status_code=422,
            detail="This video has no timestamped transcript, so there is nothing to build a story from.",
        )

    if not video.file_path or not os.path.exists(video.file_path):
        raise HTTPException(status_code=404, detail="The original video file could not be found on the server.")

    try:
        panel_data = build_story_panels(
            segments,
            key_moments=[m.model_dump() for m in video.key_moments],
            keywords=[k.model_dump() for k in video.keywords],
            mode=mode,
        )
    except Exception:
        logger.exception("Story panel selection failed for video %s", video_id)
        raise HTTPException(status_code=500, detail="Story generation failed. Please try again.")

    if not panel_data:
        raise HTTPException(
            status_code=422,
            detail="The transcript doesn't contain enough content to build a story.",
        )

    out_dir = _frames_dir(str(video.id), mode)
    try:
        frame_files = await run_in_threadpool(_extract_all_frames, video.file_path, out_dir, panel_data)
    except FileNotFoundError as exc:
        # FFmpeg not installed (or the file vanished mid-request).
        logger.error("Story frame extraction unavailable: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Frame extraction is unavailable on the server (is FFmpeg installed and on PATH?).",
        )
    except Exception:
        logger.exception("Unexpected error extracting story frames for video %s", video_id)
        raise HTTPException(status_code=500, detail="Story generation failed. Please try again.")

    created = {f for f in frame_files if f}
    if not created:
        raise HTTPException(
            status_code=500,
            detail="Couldn't extract any frames from this video. The file may be corrupted or in an unsupported format.",
        )

    failed = len(frame_files) - len(created)
    warnings = (
        [f"{failed} of {len(frame_files)} frames could not be extracted; those panels show a placeholder."]
        if failed else []
    )

    panels = [
        StoryPanel(
            panel_id=uuid.uuid4().hex,
            panel_number=p["panel_number"],
            timestamp=p["timestamp"],
            start_time=p["start_time"],
            end_time=p["end_time"],
            frame_file=frame_file,
            title=p["title"],
            concept=p["concept"],
            caption=p["caption"],
            transcript_excerpt=p["transcript_excerpt"],
            importance=p["importance"],
        )
        for p, frame_file in zip(panel_data, frame_files)
    ]

    title = f"{os.path.splitext(video.filename)[0]} — {MODE_LABELS[mode]}"
    story = await _find_story(video, current_user, mode)
    if story is None:
        story = Story(
            user_id=str(current_user.id),
            video_id=str(video.id),
            mode=mode,
            title=title,
            panels=panels,
            warnings=warnings,
        )
        await story.insert()
    else:
        story.title = title
        story.panels = panels
        story.warnings = warnings
        story.updated_at = datetime.now(timezone.utc)
        await story.save()

    # Only now that the new story is saved, drop frames from any previous run.
    _remove_files(out_dir, keep=created)

    return _to_out(story)


@router.get("/{video_id}", response_model=StoryOut)
async def get_story(
    video_id: str,
    mode: Optional[StoryMode] = None,
    current_user: User = Depends(get_current_user),
):
    """Return the saved story for this video (a specific mode, else the most recent)."""
    video = await _find_owned_video(video_id, current_user)
    story = await _find_story(video, current_user, mode)
    if story is None:
        raise HTTPException(status_code=404, detail="No story has been generated for this video yet.")
    return _to_out(story)


@router.get("/{video_id}/panels", response_model=List[StoryPanelOut])
async def get_story_panels(
    video_id: str,
    mode: Optional[StoryMode] = None,
    current_user: User = Depends(get_current_user),
):
    """Return only the panels of the saved story."""
    video = await _find_owned_video(video_id, current_user)
    story = await _find_story(video, current_user, mode)
    if story is None:
        raise HTTPException(status_code=404, detail="No story has been generated for this video yet.")
    return _to_out(story).panels


@router.delete("/{video_id}", response_model=StoryDeleteOut)
async def delete_story(
    video_id: str,
    mode: Optional[StoryMode] = None,
    current_user: User = Depends(get_current_user),
):
    """Delete one mode's story (or every story for the video) and its frame images."""
    video = await _find_owned_video(video_id, current_user)

    conditions = [Story.user_id == str(current_user.id), Story.video_id == str(video.id)]
    if mode:
        conditions.append(Story.mode == mode)
    stories = await Story.find(*conditions).to_list()
    if not stories:
        raise HTTPException(status_code=404, detail="No story has been generated for this video yet.")

    for story in stories:
        shutil.rmtree(_frames_dir(str(video.id), story.mode), ignore_errors=True)
        await story.delete()

    # Tidy up the now-empty per-video folder.
    video_dir = os.path.join(settings.UPLOAD_DIR, "story_frames", str(video.id))
    if os.path.isdir(video_dir) and not os.listdir(video_dir):
        os.rmdir(video_dir)

    return StoryDeleteOut(deleted=len(stories))


@router.get("/{video_id}/frames/{mode}/{filename}")
async def get_story_frame(
    video_id: str,
    mode: StoryMode,
    filename: str,
    current_user: User = Depends(get_current_user),
):
    """Serve one extracted frame image to the video's owner."""
    video = await _find_owned_video(video_id, current_user)

    # Strict whitelist of the exact names we generate -> no path traversal.
    if not _FRAME_NAME.match(filename):
        raise HTTPException(status_code=404, detail="Frame not found.")

    path = os.path.join(_frames_dir(str(video.id), mode), filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Frame not found.")

    return FileResponse(
        path,
        media_type="image/jpeg",
        headers={"Cache-Control": "private, max-age=3600"},
    )
