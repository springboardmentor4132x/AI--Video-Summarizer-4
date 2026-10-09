"""Time Machine, Daily, Version Comparison and playback activity."""
from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio

from app.services.compare_service import InsufficientContent, compare_transcripts
from app.services.daily_service import build_daily_items
from app.services.time_machine_service import search_history, stem, topic_evolution

NOW = datetime(2026, 10, 1, tzinfo=timezone.utc)


def seg(a, b, t):
    return {"start_time": a, "end_time": b, "text": t}


def vid(i, name, days, segs, kws=(), moments=()):
    return {"id": i, "filename": name, "uploaded_at": NOW + timedelta(days=days), "last_opened_at": None,
            "keywords": [{"word": w, "score": s} for w, s in kws], "segments": segs,
            "key_moments": list(moments), "duration": max((s["end_time"] for s in segs), default=0)}


DBMS1 = vid("v1", "DBMS Lecture 1", 0, [
    seg(0, 20, "Welcome to databases and the relational model."),
    seg(20, 40, "Normalization is the process of organizing tables to reduce redundancy."),
    seg(40, 60, "Joins combine rows from two tables."),
], [("normalization", 1), ("tables", .6), ("joins", .5)])
DBMS4 = vid("v2", "DBMS Lecture 4", 7, [
    seg(0, 30, "Today we look at second and third normal form, the next steps of normalization."),
    seg(30, 60, "An index speeds up lookups on large tables."),
    seg(60, 90, "Query optimization chooses the cheapest plan."),
], [("normalization", .9), ("index", .8), ("optimization", .7)])
COOK = vid("v3", "Cooking", 3, [seg(0, 30, "Whisk the eggs and add salt.")], [("eggs", 1)])


# ------------------------------------------------------------ time machine
def test_stem_basics():
    assert stem("joins") == stem("join") and stem("indexes") == stem("index")
    assert stem("normalization") == "normalization"


def test_search_spans_videos_with_exact_timestamps():
    res = search_history("normalization", [DBMS1, DBMS4, COOK])
    assert {r["video_id"] for r in res} == {"v1", "v2"}
    by = {r["video_id"]: r for r in res}
    assert by["v1"]["start_time"] == 20 and "Normalization" in by["v1"]["text"]
    assert by["v2"]["start_time"] == 0
    assert by["v1"]["concept"] == "Normalization"
    assert all(r["uploaded_at"] for r in res)


def test_search_matches_word_forms_and_ignores_unrelated():
    assert any(r["start_time"] == 40 for r in search_history("join", [DBMS1]))
    assert search_history("quantum entanglement", [DBMS1, DBMS4]) == []
    assert search_history("the", [DBMS1]) == []


def test_search_limits_hits_per_video():
    v = vid("x", "x", 0, [seg(i * 30, i * 30 + 30, f"Normalization point {i}.") for i in range(8)], [])
    assert len(search_history("normalization", [v], per_video=3)) == 3


def test_topic_evolution_in_learning_order():
    out = topic_evolution([DBMS4, COOK, DBMS1])
    assert out["enough_data"] is True
    names = [c["concept"] for c in out["concepts"]]
    # DBMS1 (day 0) concepts first, then cooking (day 3), then DBMS4's new ones (day 7)
    assert names.index("Normalization") < names.index("Eggs") < names.index("Index")
    norm = next(c for c in out["concepts"] if c["concept"] == "Normalization")
    assert [v["video_id"] for v in norm["videos"]] == ["v1", "v2"]          # seen in both
    assert norm["videos"][0]["first_time"] == 20


def test_topic_evolution_needs_real_data_and_skips_unsupported_keywords():
    assert topic_evolution([DBMS1])["enough_data"] is False
    ghost = vid("g", "g", 0, [seg(0, 10, "Nothing relevant here at all.")], [("blockchain", 1)])
    assert topic_evolution([ghost])["concepts"] == []


# ------------------------------------------------------------------- daily
def daily_data():
    segs = [seg(i * 60, (i + 1) * 60, "Normalization is the process of organizing tables." if i == 2 else f"Point number {i} about databases.")
            for i in range(10)]
    a = vid("a", "A.mp4", 0, segs, [("databases", 1)],
            [{"start_time": 120, "end_time": 150, "importance": .9, "label": "", "text": "Normalization is the process of organizing tables."},
             {"start_time": 400, "end_time": 430, "importance": .5, "label": "", "text": "Another idea."}])
    b = vid("b", "B.mp4", 1, [seg(0, 300, "Indexes speed up queries a lot.")], [("index", 1)],
            [{"start_time": 10, "end_time": 60, "importance": .8, "label": "", "text": "Indexes speed up queries a lot."}])
    return [a, b]


ACT = {"a": {"last_position": 200.0, "duration": 600.0, "last_opened_at": NOW}}
BMS = [{"video_id": "b", "timestamp": 200.0, "note": "remember this", "created_at": NOW}]


def test_daily_respects_budget_and_grounds_every_item():
    for minutes in (10, 20, 45):
        items = build_daily_items(minutes, daily_data(), BMS, ACT)
        assert items and sum(i["minutes"] for i in items) <= minutes
        for i in items:
            assert i["video_id"] in ("a", "b") and i["reason"] and i["title"]
            if i["kind"] != "revision":
                assert 0 <= i["start_time"] < i["end_time"] <= 600


def test_daily_uses_playback_and_bookmarks():
    items = build_daily_items(30, daily_data(), BMS, ACT)
    resume = next(i for i in items if i["kind"] == "resume")
    assert resume["video_id"] == "a" and resume["start_time"] == 200.0 and "03:20" in resume["reason"]
    bm = next(i for i in items if i["kind"] == "bookmark")
    assert bm["video_id"] == "b" and bm["start_time"] <= 200 <= bm["end_time"] and "remember this" in bm["reason"]
    assert [i["kind"] for i in items][-1] == "revision"            # wraps up
    assert items.index(resume) > items.index(bm)                   # review first, then continue


def test_daily_does_not_resume_finished_videos_or_overlap_items():
    done = {"a": {"last_position": 590.0, "duration": 600.0, "last_opened_at": NOW}}
    assert not any(i["kind"] == "resume" for i in build_daily_items(30, daily_data(), [], done))
    items = build_daily_items(60, daily_data(), BMS, ACT)
    for x in items:
        for y in items:
            if x is not y and x["video_id"] == y["video_id"] and x["start_time"] is not None and y["start_time"] is not None:
                assert not (x["start_time"] < y["end_time"] and x["end_time"] > y["start_time"])


def test_daily_empty_when_nothing_to_schedule_and_no_revision_without_content():
    bare = [vid("z", "z", 0, [seg(0, 100, "We walked to the shop and bought some bread today.")])]
    assert build_daily_items(20, bare, [], {}) == []
    only_resume = build_daily_items(20, bare, [], {"z": {"last_position": 30.0, "duration": 100.0, "last_opened_at": NOW}})
    assert [i["kind"] for i in only_resume] == ["resume"]


def test_daily_clamps_minutes():
    items = build_daily_items(9999, daily_data(), BMS, ACT)
    assert sum(i["minutes"] for i in items) <= 120


# ----------------------------------------------------------------- compare
OLD = [seg(0, 10, "Welcome to the database course for 2025."), seg(10, 20, "A table stores rows and columns of data."),
       seg(20, 30, "Normalization removes redundancy from tables."), seg(30, 40, "The course lasts 4 weeks and has 3 exams."),
       seg(40, 50, "Denormalization is never used in this course.")]
NEW = [seg(0, 10, "Welcome to the database course for 2026."), seg(10, 25, "A table stores rows and columns of data."),
       seg(25, 35, "Normalization removes redundancy from tables."), seg(35, 45, "The course lasts 6 weeks and has 3 exams."),
       seg(45, 60, "Indexes speed up queries on large tables.")]


def test_compare_classifies_with_timestamps_from_both_videos():
    r = compare_transcripts(OLD, NEW)
    assert r["counts"] == {"changed": 2, "new": 1, "removed": 1, "unchanged": 2}
    by = {(i["status"], i["text"][:12]): i for i in r["items"]}
    same = by[("unchanged", "A table stor")]
    assert (same["old_start"], same["new_start"]) == (10, 10) and same["explanation"] == ""
    wk = next(i for i in r["items"] if "weeks" in i["text"])
    assert wk["status"] == "changed" and (wk["old_start"], wk["new_start"]) == (30, 35)
    assert "4" in wk["explanation"] and "6" in wk["explanation"]
    new = next(i for i in r["items"] if i["status"] == "new")
    assert new["new_start"] == 45 and new["old_start"] is None
    gone = next(i for i in r["items"] if i["status"] == "removed")
    assert gone["old_start"] == 40 and gone["new_start"] is None and "Denormalization" in gone["text"]
    assert r["verdict"] in ("Partly different", "Very similar")


def test_compare_identical_and_unrelated():
    same = compare_transcripts(OLD, OLD)
    assert same["counts"]["unchanged"] == 5 and same["similarity"] == 1.0 and same["verdict"] == "Very similar"
    other = [seg(i * 10, i * 10 + 10, t) for i, t in enumerate(
        ["Whisk the eggs with sugar.", "Bake the cake for forty minutes.", "Let the cake cool completely.", "Add frosting and berries."])]
    r = compare_transcripts(OLD, other)
    assert r["counts"]["unchanged"] == 0 and r["verdict"] == "Substantially different"


def test_compare_rejects_too_little_content():
    with pytest.raises(InsufficientContent):
        compare_transcripts(OLD, [seg(0, 5, "Just one sentence here today.")])


# ---------------------------------------------------------------------- API
pytestmark = pytest.mark.filterwarnings("ignore::pytest.PytestWarning")


async def _uid(client, h):
    return (await client.get("/api/users/me", headers=h)).json()["id"]


async def _video(uid, name, segs, *, status="done", keywords=(), moments=(), days=0):
    from app.models.video import Video, TranscriptSegment, Keyword, KeyMoment
    v = Video(user_id=uid, filename=name, file_path="x.mp4", status=status,
              uploaded_at=NOW + timedelta(days=days),
              transcript_segments=[TranscriptSegment(**s) for s in segs],
              keywords=[Keyword(word=w, score=s) for w, s in keywords],
              key_moments=[KeyMoment(**m) for m in moments])
    await v.insert()
    return str(v.id)


@pytest_asyncio.fixture
async def other(client):
    await client.post("/api/auth/register", json={"name": "O", "email": "o-hist@example.com", "password": "password123", "role": "learner"})
    r = await client.post("/api/auth/login", data={"username": "o-hist@example.com", "password": "password123"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


async def test_time_machine_api_only_searches_own_processed_videos(client, auth_headers, other):
    uid = await _uid(client, auth_headers)
    mine = await _video(uid, "mine", DBMS1["segments"], keywords=[("normalization", 1)])
    await _video(uid, "busy", DBMS4["segments"], status="processing")
    await _video(await _uid(client, other), "theirs", DBMS4["segments"])

    r = await client.get("/api/timemachine/search", params={"q": "normalization"}, headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["videos_searched"] == 1 and [x["video_id"] for x in body["results"]] == [mine]
    assert (await client.get("/api/timemachine/search", params={"q": "normalization"})).status_code == 401
    assert (await client.get("/api/timemachine/search", params={"q": "   "}, headers=auth_headers)).status_code == 422
    assert (await client.get("/api/timemachine/topics", headers=auth_headers)).json()["videos_considered"] == 1


async def test_activity_api(client, auth_headers, other):
    vid_id = await _video(await _uid(client, auth_headers), "a", OLD)
    assert (await client.get(f"/api/activity/{vid_id}", headers=auth_headers)).status_code == 404
    r = await client.put(f"/api/activity/{vid_id}", headers=auth_headers, json={"position": 42.5, "duration": 100, "opened": True})
    assert r.status_code == 200 and r.json()["last_position"] == 42.5 and r.json()["open_count"] == 1
    r = await client.put(f"/api/activity/{vid_id}", headers=auth_headers, json={"position": 500, "duration": 100})
    assert r.json()["last_position"] == 100 and r.json()["open_count"] == 1          # clamped; not an "open"
    r = await client.put(f"/api/activity/{vid_id}", headers=auth_headers, json={"position": 0, "opened": True})
    assert r.json()["last_position"] == 100 and r.json()["open_count"] == 2          # reopen at 0:00 keeps the resume point
    assert (await client.put(f"/api/activity/{vid_id}", headers=auth_headers, json={"position": -1})).status_code == 422
    assert (await client.put(f"/api/activity/{vid_id}", headers=other, json={"position": 1})).status_code == 404
    assert (await client.get(f"/api/activity/{vid_id}", headers=other)).status_code == 404


async def _daily_setup(client, h):
    from app.models.bookmark import Bookmark
    uid = await _uid(client, h)
    dd = daily_data()
    a = await _video(uid, "A.mp4", dd[0]["segments"], keywords=[("databases", 1)], moments=dd[0]["key_moments"])
    b = await _video(uid, "B.mp4", dd[1]["segments"], keywords=[("index", 1)], moments=dd[1]["key_moments"])
    await Bookmark(user_id=uid, video_id=b, timestamp=200.0, note="remember this").insert()
    await client.put(f"/api/activity/{a}", headers=h, json={"position": 200, "duration": 600, "opened": True})
    return a, b


async def test_daily_api_full_flow(client, auth_headers, other):
    a, b = await _daily_setup(client, auth_headers)
    r = await client.post("/api/daily/generate", headers=auth_headers, json={"minutes": 20, "date": "2026-10-06"})
    assert r.status_code == 200
    plan = r.json()["plan"]
    assert plan["planned_minutes"] <= 20 and plan["total_count"] == len(plan["items"]) >= 3
    assert {i["kind"] for i in plan["items"]} >= {"resume", "bookmark"}
    assert all(not i["completed"] for i in plan["items"])

    today = await client.get("/api/daily/today", params={"date": "2026-10-06"}, headers=auth_headers)
    assert today.json()["id"] == plan["id"]

    assert (await client.post(f"/api/daily/{plan['id']}/start", headers=auth_headers)).json()["started_at"]
    first = plan["items"][0]["item_id"]
    done = (await client.patch(f"/api/daily/{plan['id']}/items/{first}", headers=auth_headers, json={"completed": True})).json()
    assert done["completed_count"] == 1 and done["completed_minutes"] == plan["items"][0]["minutes"]
    undone = (await client.patch(f"/api/daily/{plan['id']}/items/{first}", headers=auth_headers, json={"completed": False})).json()
    assert undone["completed_count"] == 0

    await client.patch(f"/api/daily/{plan['id']}/items/{first}", headers=auth_headers, json={"completed": True})
    again = (await client.post("/api/daily/generate", headers=auth_headers, json={"minutes": 45, "date": "2026-10-06"})).json()["plan"]
    assert again["id"] == plan["id"] and again["minutes"] == 45 and again["completed_count"] == 0   # regenerated in place
    hist = (await client.get("/api/daily/history", headers=auth_headers)).json()
    assert len(hist) == 1 and hist[0]["date"] == "2026-10-06"

    # ownership
    assert (await client.post(f"/api/daily/{plan['id']}/start", headers=other)).status_code == 404
    assert (await client.patch(f"/api/daily/{plan['id']}/items/{first}", headers=other, json={"completed": True})).status_code == 404
    assert (await client.get("/api/daily/today", params={"date": "2026-10-06"}, headers=other)).status_code == 404
    assert (await client.patch(f"/api/daily/{plan['id']}/items/nope", headers=auth_headers, json={"completed": True})).status_code == 404


async def test_daily_api_empty_states_and_validation(client, auth_headers):
    body = {"minutes": 20, "date": "2026-10-06"}
    r = await client.post("/api/daily/generate", headers=auth_headers, json=body)
    assert r.status_code == 200 and r.json()["plan"] is None and "Upload a video" in r.json()["empty_reason"]

    await _video(await _uid(client, auth_headers), "bare", [seg(0, 100, "We walked to the shop and bought some bread today.")])
    r = await client.post("/api/daily/generate", headers=auth_headers, json=body)
    assert r.json()["plan"] is None and "bookmark" in r.json()["empty_reason"]

    for bad in ({"minutes": 2, "date": "2026-10-06"}, {"minutes": 500, "date": "2026-10-06"},
                {"minutes": 20, "date": "06/10/2026"}, {"minutes": 20, "date": "2026-13-45"}):
        assert (await client.post("/api/daily/generate", headers=auth_headers, json=bad)).status_code == 422
    assert (await client.post("/api/daily/generate", json=body)).status_code == 401
    assert (await client.get("/api/daily/today", params={"date": "2026-10-06"}, headers=auth_headers)).status_code == 404


async def test_compare_api_flow_and_errors(client, auth_headers, other):
    uid = await _uid(client, auth_headers)
    old = await _video(uid, "v2025.mp4", OLD)
    new = await _video(uid, "v2026.mp4", NEW)
    r = await client.post("/api/compare", headers=auth_headers, json={"old_video_id": old, "new_video_id": new})
    assert r.status_code == 201
    c = r.json()
    assert c["counts"] == {"changed": 2, "new": 1, "removed": 1, "unchanged": 2}
    assert c["old_filename"] == "v2025.mp4" and "wording" in c["method_note"]

    again = (await client.post("/api/compare", headers=auth_headers, json={"old_video_id": old, "new_video_id": new})).json()
    assert again["id"] == c["id"]                                         # same pair updates in place
    assert (await client.get(f"/api/compare/{c['id']}", headers=auth_headers)).json()["items"] == c["items"]
    assert len((await client.get("/api/compare", headers=auth_headers)).json()) == 1

    assert (await client.get(f"/api/compare/{c['id']}", headers=other)).status_code == 404
    assert (await client.delete(f"/api/compare/{c['id']}", headers=other)).status_code == 404
    assert (await client.delete(f"/api/compare/{c['id']}", headers=auth_headers)).json() == {"deleted": 1}
    assert (await client.get(f"/api/compare/{c['id']}", headers=auth_headers)).status_code == 404

    post = lambda o, n, h=auth_headers: client.post("/api/compare", headers=h, json={"old_video_id": o, "new_video_id": n})
    assert (await post(old, old)).status_code == 422
    assert (await post(old, "nope")).status_code == 404
    assert (await post(old, new, other)).status_code == 404               # can't compare someone else's videos
    busy = await _video(uid, "busy", OLD, status="processing")
    failed = await _video(uid, "failed", OLD, status="failed")
    empty = await _video(uid, "empty", [])
    tiny = await _video(uid, "tiny", [seg(0, 5, "Only one sentence here today.")])
    assert (await post(old, busy)).status_code == 409
    assert "failed" in (await post(failed, new)).json()["detail"]
    assert (await post(old, empty)).status_code == 422 and "no timestamped transcript" in (await post(old, empty)).json()["detail"]
    r = await post(old, tiny)
    assert r.status_code == 422 and "few sentences" in r.json()["detail"]
    assert (await client.post("/api/compare", json={"old_video_id": old, "new_video_id": new})).status_code == 401
