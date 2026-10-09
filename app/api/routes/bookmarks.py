"""
Bookmark CRUD routes. Every route enforces both:
  1. authentication (JWT, via get_current_user)
  2. ownership (a bookmark's user_id must match the caller)
so User A can never see, edit, or delete User B's bookmarks -- the exact
requirement called out explicitly in the feature spec.
"""

from typing import List

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.models.bookmark import Bookmark
from app.models.user import User
from app.models.video import Video
from app.schemas.bookmark_clip import BookmarkCreate, BookmarkOut, BookmarkUpdate

router = APIRouter(prefix="/api/bookmarks", tags=["Bookmarks"])


def _to_out(bookmark: Bookmark) -> BookmarkOut:
    return BookmarkOut(
        id=str(bookmark.id),
        video_id=bookmark.video_id,
        timestamp=bookmark.timestamp,
        note=bookmark.note,
        created_at=bookmark.created_at,
    )


async def _find_owned_bookmark(bookmark_id: str, current_user: User) -> Bookmark:
    try:
        object_id = PydanticObjectId(bookmark_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Bookmark not found.")

    bookmark = await Bookmark.get(object_id)

    if bookmark is None or bookmark.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Bookmark not found.")

    return bookmark


@router.post("", response_model=BookmarkOut, status_code=201)
async def create_bookmark(
    payload: BookmarkCreate,
    current_user: User = Depends(get_current_user),
):
    if payload.timestamp < 0:
        raise HTTPException(status_code=400, detail="Timestamp must be 0 or later.")

    # The video must exist AND belong to the caller -- otherwise this
    # silently created an orphan bookmark against a nonexistent or
    # someone else's video (found by the test suite).
    try:
        video_object_id = PydanticObjectId(payload.video_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Video not found.")

    video = await Video.get(video_object_id)
    if video is None or video.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Video not found.")

    bookmark = Bookmark(
        user_id=str(current_user.id),
        video_id=payload.video_id,
        timestamp=payload.timestamp,
        note=payload.note,
    )
    await bookmark.insert()
    return _to_out(bookmark)


@router.get("/video/{video_id}", response_model=List[BookmarkOut])
async def list_bookmarks_for_video(
    video_id: str,
    current_user: User = Depends(get_current_user),
):
    bookmarks = await Bookmark.find(
        Bookmark.user_id == str(current_user.id),
        Bookmark.video_id == video_id,
    ).sort("+timestamp").to_list()

    return [_to_out(b) for b in bookmarks]


@router.patch("/{bookmark_id}", response_model=BookmarkOut)
async def update_bookmark(
    bookmark_id: str,
    payload: BookmarkUpdate,
    current_user: User = Depends(get_current_user),
):
    bookmark = await _find_owned_bookmark(bookmark_id, current_user)
    bookmark.note = payload.note
    await bookmark.save()
    return _to_out(bookmark)


@router.delete("/{bookmark_id}", status_code=204)
async def delete_bookmark(
    bookmark_id: str,
    current_user: User = Depends(get_current_user),
):
    bookmark = await _find_owned_bookmark(bookmark_id, current_user)
    await bookmark.delete()
