"""
Role-based access for Content Creator, Learner, Educator and Administrator,
plus sharing, transcript editing, deletion and the audit log.

These run against the in-memory Mongo stand-in from conftest.py, like the rest
of the API tests (they need `pip install -r requirements-dev.txt`).
"""
import pytest
import pytest_asyncio

from app.core.security import hash_password
from app.models.activity import VideoActivity
from app.models.bookmark import Bookmark
from app.models.user import User
from app.models.video import TranscriptSegment, Video

pytestmark = pytest.mark.asyncio


async def _login(client, email, password="password123"):
    r = await client.post("/api/auth/login", data={"username": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


async def _register(client, email, role):
    r = await client.post("/api/auth/register", json={"name": email.split("@")[0], "email": email,
                                                      "password": "password123", "role": role})
    assert r.status_code == 201, r.text
    return await _login(client, email), r.json()["id"]


@pytest_asyncio.fixture
async def admin(client):
    await User(name="Root", email="root@example.com", password=hash_password("password123"), role="administrator").insert()
    return await _login(client, "root@example.com")


@pytest_asyncio.fixture
async def educator(client):
    return await _register(client, "teach@example.com", "educator")


@pytest_asyncio.fixture
async def student(client):
    return await _register(client, "stud@example.com", "learner")


async def _video(owner_id, name="lecture.mp4"):
    segs = [TranscriptSegment(start_time=0, end_time=10, text="Indexes speed up lookups."),
            TranscriptSegment(start_time=10, end_time=20, text="Normalization reduces redundancy.")]
    v = Video(user_id=owner_id, filename=name, file_path="", status="done", transcript_segments=segs,
              transcript="Indexes speed up lookups. Normalization reduces redundancy.")
    await v.insert()
    return str(v.id)


# ------------------------------------------------------------------ registration safety

async def test_cannot_self_register_as_administrator(client):
    r = await client.post("/api/auth/register", json={"name": "X", "email": "x@example.com",
                                                      "password": "password123", "role": "administrator"})
    assert r.status_code == 422
    assert await User.find_one(User.email == "x@example.com") is None


# ------------------------------------------------------------------ admin is admin-only (server side)

@pytest.mark.parametrize("path", ["/api/admin/stats", "/api/admin/users", "/api/admin/videos",
                                  "/api/admin/processing", "/api/admin/audit"])
async def test_admin_routes_reject_other_roles_and_anonymous(client, auth_headers, learner_headers, educator, path):
    assert (await client.get(path)).status_code == 401
    assert (await client.get(path, headers=learner_headers)).status_code == 403
    assert (await client.get(path, headers=auth_headers)).status_code == 403        # content creator
    assert (await client.get(path, headers=educator[0])).status_code == 403


async def test_admin_stats_and_user_list_use_real_data(client, admin, learner_headers):
    s = (await client.get("/api/admin/stats", headers=admin)).json()
    assert s["users"]["by_role"]["administrator"] == 1 and s["users"]["by_role"]["learner"] == 1
    assert s["videos"]["total"] == 0
    users = (await client.get("/api/admin/users", headers=admin)).json()
    assert users["total"] == 2 and all("password" not in u for u in users["users"])
    found = (await client.get("/api/admin/users?search=learner", headers=admin)).json()
    assert [u["email"] for u in found["users"]] == ["pytest-learner@example.com"]


async def test_role_change_is_audited_and_protected(client, admin, student):
    sid = student[1]
    assert (await client.patch(f"/api/admin/users/{sid}/role", json={"role": "educator"}, headers=admin)).status_code == 200
    me = (await client.get("/api/users/me", headers=student[0])).json()
    assert me["role"] == "educator"
    audit = (await client.get("/api/admin/audit", headers=admin)).json()
    assert audit[0]["action"] == "user.role_changed" and audit[0]["detail"]["to"] == "educator"
    assert (await client.patch(f"/api/admin/users/{sid}/role", json={"role": "root"}, headers=admin)).status_code == 400
    my_id = (await client.get("/api/users/me", headers=admin)).json()["id"]
    r = await client.patch(f"/api/admin/users/{my_id}/role", json={"role": "learner"}, headers=admin)
    assert r.status_code == 400 and "own role" in r.json()["detail"]


async def test_disabled_account_cannot_log_in_or_use_an_old_token(client, admin, student):
    sid = student[1]
    assert (await client.patch(f"/api/admin/users/{sid}/active", json={"is_active": False}, headers=admin)).status_code == 200
    assert (await client.get("/api/users/me", headers=student[0])).status_code == 403
    r = await client.post("/api/auth/login", data={"username": "stud@example.com", "password": "password123"})
    assert r.status_code == 403
    my_id = (await client.get("/api/users/me", headers=admin)).json()["id"]
    assert (await client.patch(f"/api/admin/users/{my_id}/active", json={"is_active": False}, headers=admin)).status_code == 400


async def test_admin_can_delete_any_video_and_it_is_audited(client, admin, auth_headers):
    owner_id = (await client.get("/api/users/me", headers=auth_headers)).json()["id"]
    vid = await _video(owner_id)
    listed = (await client.get("/api/admin/videos", headers=admin)).json()
    assert listed["total"] == 1 and listed["videos"][0]["owner_email"] == "pytest-user@example.com"
    assert (await client.delete(f"/api/admin/videos/{vid}", headers=admin)).status_code == 200
    assert await Video.get(vid) is None
    assert (await client.get("/api/admin/audit", headers=admin)).json()[0]["action"] == "video.deleted"


# ------------------------------------------------------------------ educator sharing + engagement

async def test_educator_shares_with_student_who_can_then_read_but_not_change(client, educator, student):
    t_headers, t_id = educator
    s_headers, s_id = student
    vid = await _video(t_id)

    assert (await client.get(f"/api/videos/{vid}/status", headers=s_headers)).status_code == 404   # not shared yet
    r = (await client.post(f"/api/educator/videos/{vid}/share",
                           json={"emails": ["stud@example.com", "nobody@example.com", "teach@example.com"]},
                           headers=t_headers)).json()
    assert r["shared"] == ["stud@example.com"] and r["not_found"] == ["nobody@example.com"]
    assert r["not_eligible"] == ["teach@example.com"]
    again = (await client.post(f"/api/educator/videos/{vid}/share", json={"emails": ["stud@example.com"]}, headers=t_headers)).json()
    assert again["already_shared"] == ["stud@example.com"]

    listed = (await client.get("/api/shared", headers=s_headers)).json()
    assert [v["id"] for v in listed] == [vid] and listed[0]["shared_by"] == "teach"
    assert (await client.get(f"/api/videos/{vid}/status", headers=s_headers)).status_code == 200
    assert (await client.get(f"/api/videos/{vid}/transcript", headers=s_headers)).status_code == 200
    ask = await client.post(f"/api/videos/{vid}/ask", json={"question": "what do indexes do"}, headers=s_headers)
    assert ask.status_code == 200
    # read-only: a shared student cannot edit, delete, or use owner-only features
    assert (await client.patch(f"/api/videos/{vid}/transcript", headers=s_headers,
                               json={"edits": [{"index": 0, "text": "x"}]})).status_code == 403
    assert (await client.delete(f"/api/videos/{vid}", headers=s_headers)).status_code == 404
    assert (await client.get(f"/api/video-dna/{vid}", headers=s_headers)).status_code == 404

    # unsharing removes access
    assert (await client.delete(f"/api/educator/videos/{vid}/shares/{s_id}", headers=t_headers)).status_code == 204
    assert (await client.get(f"/api/videos/{vid}/status", headers=s_headers)).status_code == 404


async def test_engagement_reports_real_activity_and_never_guesses(client, educator, student):
    t_headers, t_id = educator
    s_headers, s_id = student
    vid = await _video(t_id)
    await client.post(f"/api/educator/videos/{vid}/share", json={"emails": ["stud@example.com"]}, headers=t_headers)

    before = (await client.get(f"/api/educator/videos/{vid}/shares", headers=t_headers)).json()
    assert before["students_with_access"] == 1 and before["students_opened"] == 0
    assert before["average_completion"] is None and before["students"][0]["completion"] is None

    await VideoActivity(user_id=s_id, video_id=vid, last_position=10, duration=20, open_count=3).insert()
    after = (await client.get(f"/api/educator/videos/{vid}/shares", headers=t_headers)).json()
    assert after["students_opened"] == 1 and after["average_completion"] == 0.5
    assert after["students"][0]["open_count"] == 3

    ov = (await client.get("/api/educator/overview", headers=t_headers)).json()
    assert ov["totals"]["total"] == 1 and ov["totals"]["students_reached"] == 1
    assert ov["videos"][0]["students_opened"] == 1


async def test_educator_routes_reject_learners_and_other_educators_videos(client, educator, student, auth_headers):
    t_headers, t_id = educator
    vid = await _video(t_id)
    assert (await client.get("/api/educator/overview", headers=student[0])).status_code == 403
    assert (await client.get("/api/educator/overview", headers=auth_headers)).status_code == 403      # creator
    other, _ = await _register(client, "teach2@example.com", "educator")
    r = await client.post(f"/api/educator/videos/{vid}/share", json={"emails": ["stud@example.com"]}, headers=other)
    assert r.status_code == 404                                                                        # not their video


# ------------------------------------------------------------------ transcript editing + deletion

async def test_creator_edits_transcript_text_but_timestamps_stay(client, auth_headers):
    owner_id = (await client.get("/api/users/me", headers=auth_headers)).json()["id"]
    vid = await _video(owner_id)
    r = await client.patch(f"/api/videos/{vid}/transcript", headers=auth_headers,
                           json={"edits": [{"index": 0, "text": "Database indexes speed up lookups."}]})
    assert r.status_code == 200
    body = r.json()
    assert body["transcript_segments"][0]["text"] == "Database indexes speed up lookups."
    assert (body["transcript_segments"][0]["start_time"], body["transcript_segments"][0]["end_time"]) == (0, 10)
    assert body["transcript"].startswith("Database indexes speed up lookups.") and body["transcript_edited_at"]
    bad = await client.patch(f"/api/videos/{vid}/transcript", headers=auth_headers, json={"edits": [{"index": 9, "text": "x"}]})
    assert bad.status_code == 400


async def test_learner_cannot_edit_and_users_cannot_touch_each_others_videos(client, auth_headers, learner_headers):
    owner_id = (await client.get("/api/users/me", headers=auth_headers)).json()["id"]
    vid = await _video(owner_id)
    e = {"edits": [{"index": 0, "text": "hacked"}]}
    assert (await client.patch(f"/api/videos/{vid}/transcript", headers=learner_headers, json=e)).status_code == 403
    assert (await client.get(f"/api/videos/{vid}/status", headers=learner_headers)).status_code == 404   # isolation
    assert (await client.delete(f"/api/videos/{vid}", headers=learner_headers)).status_code == 404
    assert (await Video.get(vid)) is not None


async def test_owner_delete_cascades_to_dependents(client, auth_headers):
    me = (await client.get("/api/users/me", headers=auth_headers)).json()["id"]
    vid = await _video(me)
    await Bookmark(user_id=me, video_id=vid, timestamp=5.0, note="n").insert()
    await VideoActivity(user_id=me, video_id=vid, last_position=1.0).insert()
    assert (await client.delete(f"/api/videos/{vid}", headers=auth_headers)).status_code == 204
    assert await Video.get(vid) is None
    assert await Bookmark.find(Bookmark.video_id == vid).count() == 0
    assert await VideoActivity.find(VideoActivity.video_id == vid).count() == 0
    assert (await client.delete(f"/api/videos/{vid}", headers=auth_headers)).status_code == 404


async def test_student_watching_a_shared_video_feeds_the_educators_engagement_numbers(client, educator, student):
    """End to end: share -> student's player reports progress -> educator sees it."""
    t_headers, t_id = educator
    s_headers, _ = student
    vid = await _video(t_id)
    await client.post(f"/api/educator/videos/{vid}/share", json={"emails": ["stud@example.com"]}, headers=t_headers)

    r = await client.put(f"/api/activity/{vid}", headers=s_headers, json={"position": 15, "duration": 20, "opened": True})
    assert r.status_code == 200
    eng = (await client.get(f"/api/educator/videos/{vid}/shares", headers=t_headers)).json()
    assert eng["students_opened"] == 1 and eng["average_completion"] == 0.75

    # the educator's own activity row is separate: it does not count as a student
    await client.put(f"/api/activity/{vid}", headers=t_headers, json={"position": 20, "duration": 20, "opened": True})
    assert (await client.get(f"/api/educator/videos/{vid}/shares", headers=t_headers)).json()["average_completion"] == 0.75


async def test_activity_still_requires_access_to_the_video(client, educator, learner_headers):
    vid = await _video(educator[1])                     # never shared with this learner
    r = await client.put(f"/api/activity/{vid}", headers=learner_headers, json={"position": 5, "opened": True})
    assert r.status_code == 404
