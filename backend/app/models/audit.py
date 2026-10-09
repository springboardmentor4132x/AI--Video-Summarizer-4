"""AuditLog -- who did what to whom. Written by administrator actions."""

from datetime import datetime, timezone
from typing import Any, Dict

from beanie import Document, Indexed
from pydantic import Field


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AuditLog(Document):
    actor_id: Indexed(str)
    actor_email: str
    action: str                      # e.g. user.role_changed, user.disabled, video.deleted
    target_type: str                 # user | video
    target_id: str
    detail: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "audit_logs"
