"""Administrator / Educator / transcript-editing business rules (pure logic)."""
from app.core.roles import ADMINISTRATOR, SELF_REGISTRATION_ROLES, VALID_ROLES
from app.services.admin_service import (
    check_active_change, check_role_change, completion_ratio, engagement_for_video,
    summarize_users, summarize_videos,
)
from app.services.transcript_edit_service import apply_segment_edits, rebuild_transcript


def _raises(fn, *a):
    try:
        fn(*a)
    except ValueError as e:
        return str(e)
    raise AssertionError("expected ValueError")


# ---- registration can never create an administrator
def test_administrator_is_not_self_registrable():
    assert ADMINISTRATOR in VALID_ROLES and ADMINISTRATOR not in SELF_REGISTRATION_ROLES
    assert set(SELF_REGISTRATION_ROLES) == {"content_creator", "learner", "educator"}


# ---- admin safety rules
def test_cannot_change_own_role_or_use_unknown_role():
    assert "own role" in _raises(check_role_change, "a", "a", "learner", "administrator", 2)
    assert "Role must be one of" in _raises(check_role_change, "a", "b", "root", "learner", 2)


def test_last_active_administrator_cannot_be_demoted_or_disabled():
    assert "last active administrator" in _raises(check_role_change, "a", "b", "learner", "administrator", 1)
    check_role_change("a", "b", "learner", "administrator", 2)            # allowed when another admin remains
    assert "last active administrator" in _raises(check_active_change, "a", "b", False, "administrator", 1)
    assert "own account" in _raises(check_active_change, "a", "a", False, "learner", 3)
    check_active_change("a", "b", True, "administrator", 1)               # re-enabling is always fine


# ---- statistics come from the data, nothing else
def test_summaries_count_real_rows():
    u = summarize_users([{"role": "learner"}, {"role": "learner", "is_active": False}, {"role": "educator"}])
    assert u["total"] == 3 and u["disabled"] == 1 and u["by_role"]["learner"] == 2 and u["by_role"]["administrator"] == 0
    v = summarize_videos([{"status": "done", "duration": 60, "size_bytes": 10},
                          {"status": "processing"}, {"status": "failed", "duration": 5, "size_bytes": 2}])
    assert (v["total"], v["done"], v["processing"], v["failed"]) == (3, 1, 1, 1)
    assert v["total_duration_seconds"] == 65 and v["storage_bytes"] == 12
    assert summarize_videos([])["total"] == 0 and summarize_users([])["total"] == 0


# ---- engagement
def test_completion_ratio_is_clamped_and_unknown_is_none():
    assert completion_ratio(30, 60) == 0.5 and completion_ratio(90, 60) == 1.0
    assert completion_ratio(10, None) is None and completion_ratio(None, 60) is None and completion_ratio(5, 0) is None


def test_engagement_lists_students_who_never_opened_instead_of_guessing():
    students = [{"student_id": "s1", "name": "A", "email": "a@x"}, {"student_id": "s2", "name": "B", "email": "b@x"},
                {"student_id": "s3", "name": "C", "email": "c@x"}]
    act = {"s1": {"last_position": 30, "duration": 60, "open_count": 2, "last_opened_at": "t"},
           "s2": {"last_position": 60, "duration": 60, "open_count": 1, "last_opened_at": "t"}}
    r = engagement_for_video(students, act)
    assert r["students_with_access"] == 3 and r["students_opened"] == 2
    assert r["average_completion"] == 0.75
    never = next(s for s in r["students"] if s["student_id"] == "s3")
    assert never["opened"] is False and never["completion"] is None
    empty = engagement_for_video([], {})
    assert empty["students_with_access"] == 0 and empty["average_completion"] is None


# ---- transcript editing
SEGS = [{"start_time": 0, "end_time": 5, "text": "hello wrold"}, {"start_time": 5, "end_time": 9, "text": "second line"}]


def test_edit_changes_text_only_and_keeps_timestamps():
    new, changed = apply_segment_edits(SEGS, [{"index": 0, "text": "  hello   world "}])
    assert changed == 1 and new[0]["text"] == "hello world"
    assert (new[0]["start_time"], new[0]["end_time"]) == (0, 5) and new[1] == SEGS[1]
    assert SEGS[0]["text"] == "hello wrold"                      # input not mutated
    assert rebuild_transcript(new) == "hello world second line"


def test_identical_text_is_not_counted_as_a_change():
    assert apply_segment_edits(SEGS, [{"index": 1, "text": "second line"}])[1] == 0


def test_invalid_edits_are_rejected_and_nothing_is_applied():
    assert "does not exist" in _raises(apply_segment_edits, SEGS, [{"index": 2, "text": "x"}])
    assert "does not exist" in _raises(apply_segment_edits, SEGS, [{"index": -1, "text": "x"}])
    assert "does not exist" in _raises(apply_segment_edits, SEGS, [{"index": True, "text": "x"}])
    assert "empty" in _raises(apply_segment_edits, SEGS, [{"index": 0, "text": "   "}])
    assert "more than once" in _raises(apply_segment_edits, SEGS, [{"index": 0, "text": "a"}, {"index": 0, "text": "b"}])
    assert "too long" in _raises(apply_segment_edits, SEGS, [{"index": 0, "text": "x" * 2001}])
    assert "No edits" in _raises(apply_segment_edits, SEGS, [])
    assert "must be a string" in _raises(apply_segment_edits, SEGS, [{"index": 0, "text": 5}])


# ---- JWT signing key must be real
def test_example_or_short_secret_keys_are_refused():
    import importlib.util, pathlib, sys, types
    try:
        from app.core.config import check_secret_key
    except Exception:  # config imports pydantic_settings; load just the pure function when it is unavailable
        src = pathlib.Path(__file__).resolve().parents[1] / "app/core/config.py"
        text = src.read_text()
        start, end = text.index("PLACEHOLDER_SECRET"), text.index("class Settings")
        ns = {}
        exec(text[start:end], ns)
        check_secret_key = ns["check_secret_key"]
    assert "SECRET_KEY" in _raises(check_secret_key, "change-this-to-a-long-random-secret")
    assert "SECRET_KEY" in _raises(check_secret_key, "short")
    assert check_secret_key("test-secret-key-not-for-production") == "test-secret-key-not-for-production"
