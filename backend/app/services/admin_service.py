"""
Pure business rules for the Administrator and Educator dashboards.

No database access here -- the routes load the data and pass plain dicts in,
which keeps the rules easy to test and impossible to bypass by accident.
"""

from typing import Dict, Iterable, List, Optional

from app.core.roles import ADMINISTRATOR, VALID_ROLES

PROCESSING_STATUSES = ("uploaded", "processing")


# ------------------------------------------------------------------ safety rules

def check_role_change(
    actor_id: str,
    target_id: str,
    new_role: str,
    target_current_role: str,
    active_admin_count: int,
) -> None:
    """Raise ValueError (with a user-facing message) if the change is not allowed."""
    if new_role not in VALID_ROLES:
        raise ValueError(f"Role must be one of: {', '.join(VALID_ROLES)}")
    if actor_id == target_id:
        raise ValueError("You cannot change your own role.")
    if target_current_role == ADMINISTRATOR and new_role != ADMINISTRATOR and active_admin_count <= 1:
        raise ValueError("You cannot remove the last active administrator.")


def check_active_change(
    actor_id: str,
    target_id: str,
    is_active: bool,
    target_role: str,
    active_admin_count: int,
) -> None:
    if is_active:
        return
    if actor_id == target_id:
        raise ValueError("You cannot disable your own account.")
    if target_role == ADMINISTRATOR and active_admin_count <= 1:
        raise ValueError("You cannot disable the last active administrator.")


# ------------------------------------------------------------------ statistics

def summarize_users(users: Iterable[dict]) -> dict:
    """users: [{role, is_active}] -> counts per role and active/disabled totals."""
    by_role: Dict[str, int] = {r: 0 for r in VALID_ROLES}
    active = disabled = 0
    for u in users:
        by_role[u.get("role", "learner")] = by_role.get(u.get("role", "learner"), 0) + 1
        if u.get("is_active", True):
            active += 1
        else:
            disabled += 1
    return {"total": active + disabled, "active": active, "disabled": disabled, "by_role": by_role}


def summarize_videos(videos: Iterable[dict]) -> dict:
    """videos: [{status, duration, size_bytes}] -> content and processing totals."""
    by_status: Dict[str, int] = {}
    total = 0
    duration = 0.0
    size = 0
    for v in videos:
        total += 1
        st = v.get("status", "uploaded")
        by_status[st] = by_status.get(st, 0) + 1
        duration += float(v.get("duration") or 0.0)
        size += int(v.get("size_bytes") or 0)
    return {
        "total": total,
        "by_status": by_status,
        "processing": sum(by_status.get(s, 0) for s in PROCESSING_STATUSES),
        "failed": by_status.get("failed", 0),
        "done": by_status.get("done", 0),
        "total_duration_seconds": round(duration, 1),
        "storage_bytes": size,
    }


# ------------------------------------------------------------------ classroom engagement

def completion_ratio(last_position: Optional[float], duration: Optional[float]) -> Optional[float]:
    """0..1 share of the video the learner reached, or None if it can't be known."""
    if not duration or duration <= 0 or last_position is None:
        return None
    return round(max(0.0, min(1.0, float(last_position) / float(duration))), 3)


def engagement_for_video(students: List[dict], activity_by_student: Dict[str, dict]) -> dict:
    """
    students: [{student_id, name, email}] who have access to the video.
    activity_by_student: student_id -> {last_position, duration, open_count, last_opened_at}.
    Students with no activity are listed as not having opened it -- never guessed.
    """
    rows = []
    completions = []
    for s in students:
        act = activity_by_student.get(s["student_id"])
        if act is None:
            rows.append({**s, "opened": False, "completion": None, "last_position": None,
                         "open_count": 0, "last_opened_at": None})
            continue
        comp = completion_ratio(act.get("last_position"), act.get("duration"))
        if comp is not None:
            completions.append(comp)
        rows.append({**s, "opened": True, "completion": comp, "last_position": act.get("last_position"),
                     "open_count": act.get("open_count", 0), "last_opened_at": act.get("last_opened_at")})
    opened = sum(1 for r in rows if r["opened"])
    return {
        "students_with_access": len(rows),
        "students_opened": opened,
        "average_completion": round(sum(completions) / len(completions), 3) if completions else None,
        "students": rows,
    }
