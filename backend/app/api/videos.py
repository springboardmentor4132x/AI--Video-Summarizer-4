from fastapi import APIRouter, UploadFile, File, Form
from app.main import db
from datetime import datetime, timezone
import os
import shutil

router = APIRouter(prefix="/videos", tags=["Videos"])

# Folder where uploaded videos will be stored
UPLOAD_DIR = "uploads"

os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    email: str = Form(...)
):
    # Check whether user exists
    user = await db.users.find_one({
        "email": email
    })

    if not user:
        return {
            "message": "User not found"
        }

    # Get uploaded filename
    filename = file.filename

    # Create file path
    file_path = os.path.join(UPLOAD_DIR, filename)

    # Save video file locally
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Store video information in MongoDB Atlas
    video = {
        "user_id": str(user["_id"]),
        "filename": filename,
        "file_path": file_path,
        "status": "Uploaded",
        "uploaded_at": datetime.now(timezone.utc)
    }

    result = await db.videos.insert_one(video)

    return {
        "message": "Video uploaded successfully",
        "video_id": str(result.inserted_id),
        "filename": filename,
        "status": "Uploaded"
    }