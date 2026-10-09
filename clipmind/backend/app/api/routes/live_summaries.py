"""Start, poll, and stop authenticated live-summary sessions."""

from datetime import datetime, timezone

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.models.live_summary import LiveSummarySession
from app.models.user import User
from app.schemas.live_summary import LiveSummaryCreate, LiveSummaryOut
from app.services.live_summary_service import schedule_live_capture, stop_live_capture, validate_live_source_url

router = APIRouter(prefix="/api/live-summaries", tags=["Live Summaries"])
ACTIVE_STATES = {"starting", "live"}


def _to_out(session: LiveSummarySession) -> LiveSummaryOut:
    return LiveSummaryOut(
        id=str(session.id),
        source_kind=session.source_kind,
        status=session.status,
        transcript=session.transcript,
        transcript_segments=session.transcript_segments,
        short_summary=session.short_summary,
        summary=session.summary,
        elapsed_seconds=session.elapsed_seconds,
        error_message=session.error_message,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


async def _find_owned_session(session_id: str, user: User) -> LiveSummarySession:
    try:
        session = await LiveSummarySession.get(PydanticObjectId(session_id))
    except Exception:
        session = None
    if session is None or session.user_id != str(user.id):
        raise HTTPException(status_code=404, detail="Live summary session not found.")
    return session


@router.post("", response_model=LiveSummaryOut, status_code=202)
async def start_live_summary(
    payload: LiveSummaryCreate,
    current_user: User = Depends(get_current_user),
):
    try:
        source_kind = validate_live_source_url(payload.url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    existing = await LiveSummarySession.find(
        LiveSummarySession.user_id == str(current_user.id)
    ).to_list()
    if any(session.status in ACTIVE_STATES for session in existing):
        raise HTTPException(status_code=409, detail="Stop your current live summary before starting another.")

    session = LiveSummarySession(
        user_id=str(current_user.id),
        source_kind=source_kind,
        status="starting",
    )
    await session.insert()
    schedule_live_capture(session, payload.url.strip())
    return _to_out(session)


@router.get("/{session_id}", response_model=LiveSummaryOut)
async def get_live_summary(
    session_id: str,
    current_user: User = Depends(get_current_user),
):
    return _to_out(await _find_owned_session(session_id, current_user))


@router.post("/{session_id}/stop", response_model=LiveSummaryOut)
async def stop_live_summary(
    session_id: str,
    current_user: User = Depends(get_current_user),
):
    session = await _find_owned_session(session_id, current_user)
    if session.status in ACTIVE_STATES:
        await stop_live_capture(str(session.id))
        session = await _find_owned_session(session_id, current_user)
        session.status = "stopped"
        session.updated_at = datetime.now(timezone.utc)
        await session.save()
    return _to_out(session)