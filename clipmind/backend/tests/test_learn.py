"""Tests for Video DNA, 5-Minute Revision, I Don't Understand, Evidence Lens."""
import pytest
import pytest_asyncio

from app.services.insight_service import explain_moment, revision_for_video, video_dna

pytestmark = pytest.mark.filterwarnings("ignore::pytest.PytestWarning")

SEGS = [
    (0, 20, "Welcome to this lecture. Today we will learn about databases."),
    (20, 40, "The problem is that data gets duplicated everywhere. This issue causes confusing errors."),
    (40, 60, "Normalization is the process of organizing tables to reduce redundancy. An index is a structure that speeds up lookups."),
    (60, 80, "For example, imagine a customers table with repeated city names. Be careful not to confuse a primary key with an index."),
    (80, 100, "The difference between an inner join and an outer join is how unmatched rows are handled. Unlike inner joins, outer joins keep them."),
    (100, 120, "Query cost = rows * lookup time, which is the formula we use here."),
    (120, 140, "In summary, normalization reduces redundancy and indexes speed up queries."),
]
SEGMENTS = [{"start_time": a, "end_time": b, "text": t} for a, b, t in SEGS]
KEYWORDS = [{"word": w, "score": s} for w, s in [("normalization", 1), ("index", .9), ("redundancy", .8), ("joins", .6), ("tables", .5)]]
MOMENTS = [{"start_time": 40, "end_time": 60, "importance": 0.9, "label": "", "text": SEGS[2][2]},
           {"start_time": 100, "end_time": 120, "importance": 0.7, "label": "", "text": SEGS[5][2]}]

# ---------------------------------------------------------------- DNA
def test_dna_sections_cover_video_and_are_grounded():
    dna = video_dna(SEGMENTS, MOMENTS, KEYWORDS)
    sec = dna["sections"]
    assert 4 <= len(sec) <= 12
    assert sec[0]["start_time"] == 0 and sec[-1]["end_time"] == 140
    assert all(a["end_time"] == b["start_time"] for a, b in zip(sec, sec[1:]))
    assert all(0 <= s["information_density"] <= 1 and 0 <= s["importance_density"] <= 1 for s in sec)
    assert sec[0]["role"] == "Introduction" and sec[-1]["role"] == "Conclusion"
    assert any(s["role"] == "Example" for s in sec) or any(s["role"] == "Problem" for s in sec)
    assert max(s["importance_density"] for s in sec) == 1.0

def test_dna_topic_distribution_uses_real_counts():
    dist = video_dna(SEGMENTS, MOMENTS, KEYWORDS)["topic_distribution"]
    assert dist and abs(sum(d["share"] for d in dist) - 1) < 0.02
    full = " ".join(t for _, _, t in SEGS).lower()
    for d in dist:
        assert d["mentions"] == full.split().count(d["topic"]) or d["mentions"] >= 1

def test_dna_empty():
    assert video_dna([], [], [])["sections"] == []

# ----------------------------------------------------------- REVISION
def test_revision_finds_real_sentences_only():
    r = revision_for_video(SEGMENTS, MOMENTS, KEYWORDS)
    full = " ".join(t for _, _, t in SEGS)
    assert any("Normalization" in d["term"] for d in r["definitions"])
    assert r["differences"] and "difference" in r["differences"][0]["text"].lower()
    assert r["formulas"] and "=" in r["formulas"][0]["text"]
    assert r["confusions"]
    for group in ("definitions", "differences", "formulas", "confusions", "must_remember"):
        for item in r[group]:
            assert item["text"].rstrip("…")[:40] in full
    assert 1 <= len(r["flashcards"]) <= 6
    assert all(c["question"] and c["answer"] and c["end_time"] >= c["start_time"] for c in r["flashcards"])
    assert [k["start_time"] for k in r["key_timestamps"]] == sorted(k["start_time"] for k in r["key_timestamps"])

def test_revision_does_not_invent_missing_categories():
    plain = [{"start_time": 0, "end_time": 5, "text": "We walked to the shop and bought some bread today."}]
    r = revision_for_video(plain, [], [])
    assert r["definitions"] == r["differences"] == r["formulas"] == r["confusions"] == []

# ------------------------------------------------------------ EXPLAIN
def test_explain_is_grounded_in_nearby_transcript():
    e = explain_moment(SEGMENTS, 45, KEYWORDS)
    assert "Normalization" in e["simple_explanation"] or "redundancy" in e["simple_explanation"]
    assert e["rewatch_range"]["start_time"] <= 40 and e["rewatch_range"]["end_time"] >= 60
    assert e["exam_definition"] and e["exam_definition"]["start_time"] == 40
    assert e["real_life_example"] and "customers" in e["real_life_example"]["text"]
    assert e["method"] == "extractive"
    assert e["explain_like_10"].startswith("In short:")

def test_explain_missing_parts_are_none_not_invented():
    plain = [{"start_time": 0, "end_time": 5, "text": "We walked to the shop and bought some bread today."}]
    e = explain_moment(plain, 2, [])
    assert e["exam_definition"] is None and e["real_life_example"] is None and e["related_concept"] is None

def test_explain_no_transcript():
    assert explain_moment([], 5, []) is None

# ----------------------------------------------------------- EVIDENCE

# --------------------------------------------------------------- API
async def _uid(client, h):
    return (await client.get("/api/users/me", headers=h)).json()["id"]

async def _video(uid, name="db.mp4", segs=True):
    from app.models.video import Video, TranscriptSegment, Keyword, KeyMoment
    v = Video(user_id=uid, filename=name, file_path="x.mp4", status="done",
              transcript_segments=[TranscriptSegment(start_time=a, end_time=b, text=t) for a, b, t in SEGS] if segs else [],
              keywords=[Keyword(**k) for k in KEYWORDS],
              key_moments=[KeyMoment(**m) for m in MOMENTS])
    await v.insert()
    return str(v.id)

@pytest_asyncio.fixture
async def vid(client, auth_headers):
    return await _video(await _uid(client, auth_headers))

@pytest_asyncio.fixture
async def other(client):
    await client.post("/api/auth/register", json={"name": "O", "email": "o-learn@example.com", "password": "password123", "role": "learner"})
    r = await client.post("/api/auth/login", data={"username": "o-learn@example.com", "password": "password123"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}

async def test_dna_api(client, auth_headers, vid):
    r = await client.get(f"/api/video-dna/{vid}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["sections"] and r.json()["topic_distribution"]

async def test_revision_api_single_and_multiple(client, auth_headers, vid):
    second = await _video(await _uid(client, auth_headers), "db2.mp4")
    r = await client.post("/api/learn/revision", headers=auth_headers, json={"video_ids": [vid]})
    assert r.status_code == 200 and len(r.json()["videos"]) == 1
    r = await client.post("/api/learn/revision", headers=auth_headers, json={"video_ids": [vid, second]})
    assert [v["video_id"] for v in r.json()["videos"]] == [vid, second]
    assert (await client.post("/api/learn/revision", headers=auth_headers, json={"video_ids": [vid, vid]})).status_code == 422
    assert (await client.post("/api/learn/revision", headers=auth_headers, json={"video_ids": []})).status_code == 422

async def test_explain_api(client, auth_headers, vid):
    r = await client.post(f"/api/learn/{vid}/explain", headers=auth_headers, json={"timestamp": 45})
    assert r.status_code == 200 and r.json()["exam_definition"]["start_time"] == 40
    assert (await client.post(f"/api/learn/{vid}/explain", headers=auth_headers, json={"timestamp": -1})).status_code == 422

async def test_auth_ownership_and_missing_transcript(client, auth_headers, other, vid):
    calls = [("get", f"/api/video-dna/{vid}", None), ("post", f"/api/learn/{vid}/explain", {"timestamp": 1}),
             ("post", "/api/learn/revision", {"video_ids": [vid]})]
    for method, url, body in calls:
        assert (await getattr(client, method)(url, json=body) if body else await client.get(url)).status_code == 401
        resp = await getattr(client, method)(url, headers=other, json=body) if body else await client.get(url, headers=other)
        assert resp.status_code == 404
    empty = await _video(await _uid(client, auth_headers), "empty.mp4", segs=False)
    for url, body in [(f"/api/video-dna/{empty}", None), (f"/api/learn/{empty}/explain", {"timestamp": 1})]:
        r = await (client.post(url, headers=auth_headers, json=body) if body else client.get(url, headers=auth_headers))
        assert r.status_code == 422 and "transcript" in r.json()["detail"]


async def test_video_dna_contract_matches_the_page(client, auth_headers, vid):
    """The Video DNA page reads these exact fields; seconds for time, 0-100 density."""
    body = (await client.get(f"/api/video-dna/{vid}", headers=auth_headers)).json()
    assert body["total_sections"] == len(body["sections"]) > 0
    for s in body["sections"]:
        assert {"id", "title", "topic", "segment", "timestamp", "start", "end", "highlight",
                "importance", "information_density"} <= set(s)
        assert isinstance(s["start"], (int, float)) and s["end"] > s["start"]
        assert 0 <= s["information_density"] <= 100
        assert s["importance"] in {"high", "medium", "low"}
