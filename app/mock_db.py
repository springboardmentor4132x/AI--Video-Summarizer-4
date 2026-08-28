import uuid
from datetime import datetime, timezone
from typing import Optional, Dict
_transcripts: Dict[str, dict] = {}   # video_id -> transcript record
_summaries: Dict[str, dict] = {}     # video_id -> summary record
def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
# ---------- Transcript storage ----------
def save_transcript(video_id: str, user_id: str, status: str,
                     transcript: Optional[str] = None,
                     language: Optional[str] = None,
                     error: Optional[str] = None) -> dict:
    existing = _transcripts.get(video_id)
    record = {
        "transcript_id": existing["transcript_id"] if existing else str(uuid.uuid4()),
        "video_id": video_id,
        "user_id": user_id,
        "status": status,
        "transcript": transcript if transcript is not None else (existing or {}).get("transcript"),
        "language": language if language is not None else (existing or {}).get("language"),
        "error": error,
        "created_at": existing["created_at"] if existing else _now(),
        "updated_at": _now(),
    }
    _transcripts[video_id] = record
    return record
def get_transcript(video_id: str) -> Optional[dict]:
    return _transcripts.get(video_id)
# ---------- Summary storage ----------
def save_summary(video_id: str, user_id: str, status: str,
                  short_summary: Optional[str] = None,
                  detailed_summary: Optional[str] = None,
                  error: Optional[str] = None) -> dict:
    existing = _summaries.get(video_id)
    record = {
        "summary_id": existing["summary_id"] if existing else str(uuid.uuid4()),
        "video_id": video_id,
        "user_id": user_id,
        "status": status,
        "short_summary": short_summary if short_summary is not None else (existing or {}).get("short_summary"),
        "detailed_summary": detailed_summary if detailed_summary is not None else (existing or {}).get("detailed_summary"),
        "error": error,
        "created_at": existing["created_at"] if existing else _now(),
        "updated_at": _now(),
    }
    _summaries[video_id] = record
    return record
def get_summary(video_id: str) -> Optional[dict]:
    return _summaries.get(video_id)