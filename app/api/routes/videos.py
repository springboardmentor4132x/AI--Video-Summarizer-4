"""
Video upload + status + history.
FFmpeg processing itself is NOT wired up today (that's Nitesh's Day 2 task),
but the upload -> validate -> store -> "status" flow works end to end.
"""
import os
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from beanie import PydanticObjectId
from app.api.deps import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.video import Video
from app.schemas.video import VideoOut
router = APIRouter(prefix="/api/videos", tags=["Videos"])
ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv"}
MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB
def _to_out(video: Video) -> VideoOut:
    return VideoOut(id=str(video.id), filename=video.filename, status=video.status, uploaded_at=video.uploaded_at)
@router.post("/upload", response_model=VideoOut, status_code=201)
async def upload_video(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
    contents = file.file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File is too large. Maximum allowed size is 500 MB.")
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, stored_name)
    with open(file_path, "wb") as out_file:
        out_file.write(contents)
    video = Video(
        user_id=str(current_user.id),
        filename=file.filename,
        file_path=file_path,
        status="uploaded",
    )
    await video.insert()
    return _to_out(video)
@router.get("/history", response_model=List[VideoOut])
async def upload_history(current_user: User = Depends(get_current_user)):
    videos = await Video.find(Video.user_id == str(current_user.id)).sort(-Video.uploaded_at).to_list()
    return [_to_out(v) for v in videos]
@router.get("/{video_id}/status", response_model=VideoOut)
async def video_status(video_id: str, current_user: User = Depends(get_current_user)):
    video = await Video.get(PydanticObjectId(video_id))
    if not video or video.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Video not found")
    return _to_out(video)