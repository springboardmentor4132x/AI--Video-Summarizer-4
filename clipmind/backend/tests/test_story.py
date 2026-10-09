"""
Tests for ClipMind Story: panel selection (pure logic) and the
/api/story routes end-to-end -- including REAL FFmpeg frame extraction
from a real MP4 generated on the fly (no mocked images).
"""

import os
import shutil
import subprocess

import pytest
import pytest_asyncio

from app.services.story_service import MODES, build_story_panels, split_sentences, truncate

pytestmark = pytest.mark.asyncio

NO_FFMPEG = shutil.which("ffmpeg") is None


# --------------------------------------------------------------- test data

SEGMENTS = [
    # (start, end, text) -- a 60s "lecture" about neural networks
    (0.0, 6.0, "Welcome to this lecture on neural networks."),
    (6.0, 14.0, "A neural network learns by adjusting its internal weights. It finds patterns in data."),
    (14.0, 22.0, "The input layer receives the features of each example."),
    (22.0, 30.0, "Hidden layers combine those features into more abstract representations."),
    (30.0, 38.0, "Training uses gradient descent to reduce the error on every pass."),
    (38.0, 46.0, "Backpropagation sends the error backwards so each weight gets updated."),
    (46.0, 54.0, "Finally the output layer produces the prediction for the network."),
    (54.0, 60.0, "In summary, neural networks learn weights from data."),
]
SEGMENT_DICTS = [{"start_time": a, "end_time": b, "text": t} for a, b, t in SEGMENTS]
KEYWORDS = [
    {"word": "neural", "score": 1.0}, {"word": "network", "score": 0.9},
    {"word": "weights", "score": 0.6}, {"word": "error", "score": 0.4},
]


# ------------------------------------------------------ pure service tests

def test_panels_cover_video_in_order_and_use_real_timestamps():
    panels = build_story_panels(SEGMENT_DICTS, keywords=KEYWORDS, mode="comic")
    assert 2 <= len(panels) <= 6
    starts = [p["timestamp"] for p in panels]
    assert starts == sorted(starts)
    assert [p["panel_number"] for p in panels] == list(range(1, len(panels) + 1))
    # Every panel timestamp is a real segment boundary from the transcript.
    real_starts = {a for a, _, _ in SEGMENTS}
    assert all(any(abs(s - r) < 0.01 for r in real_starts) for s in starts)
    # Story spans the video rather than clustering at the start.
    assert starts[0] < 15 and starts[-1] > 30


def test_panel_text_comes_from_the_transcript():
    full = " ".join(t for _, _, t in SEGMENTS).lower()
    for mode in MODES:
        for p in build_story_panels(SEGMENT_DICTS, keywords=KEYWORDS, mode=mode):
            assert p["transcript_excerpt"].rstrip("…").lower() in full
            assert p["caption"].rstrip("…").lower() in full
            assert p["title"]


def test_modes_shape_the_caption():
    comic = build_story_panels(SEGMENT_DICTS, keywords=KEYWORDS, mode="comic")
    story = build_story_panels(SEGMENT_DICTS, keywords=KEYWORDS, mode="storybook")
    board = build_story_panels(SEGMENT_DICTS, keywords=KEYWORDS, mode="storyboard")
    assert all(len(p["caption"]) <= 131 for p in comic)
    assert all(len(p["caption"]) <= 91 for p in board)
    # Storybook narrates more than a comic speech bubble does.
    assert max(len(p["caption"]) for p in story) >= max(len(p["caption"]) for p in comic)


def test_concept_uses_video_keywords():
    panels = build_story_panels(SEGMENT_DICTS, keywords=KEYWORDS, mode="study_notes")
    concepts = " ".join(p["concept"].lower() for p in panels)
    assert "neural" in concepts or "weights" in concepts


def test_key_moment_importance_pulls_a_scene_in():
    moments = [{"start_time": 38.0, "end_time": 46.0, "importance": 0.95, "label": "", "text": ""}]
    panels = build_story_panels(SEGMENT_DICTS, key_moments=moments, mode="comic", max_panels=3)
    assert any(abs(p["timestamp"] - 38.0) < 0.5 or p["start_time"] <= 38.0 < p["end_time"] for p in panels)


def test_empty_or_blank_transcript_gives_no_panels():
    assert build_story_panels([], mode="comic") == []
    blanks = [{"start_time": 0, "end_time": 5, "text": "   "}]
    assert build_story_panels(blanks, mode="comic") == []


def test_short_video_returns_fewer_panels_not_padding():
    one = [{"start_time": 0.0, "end_time": 4.0, "text": "Just one short sentence here."}]
    assert len(build_story_panels(one, mode="comic")) == 1


def test_unknown_mode_rejected():
    with pytest.raises(ValueError):
        build_story_panels(SEGMENT_DICTS, mode="nope")


def test_text_helpers():
    assert split_sentences("One. Two! Three?") == ["One.", "Two!", "Three?"]
    assert truncate("short", 20) == "short"
    assert truncate("a very long sentence indeed", 12).endswith("…")


# ------------------------------------------------------------- API fixtures

@pytest.fixture(scope="session")
def real_video(tmp_path_factory):
    """A real 60s MP4 (same length as SEGMENTS) (test pattern with a running timer) built by FFmpeg."""
    if NO_FFMPEG:
        pytest.skip("FFmpeg not installed")
    path = tmp_path_factory.mktemp("vid") / "lecture.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi", "-i", "testsrc=duration=60:size=320x240:rate=10",
         "-pix_fmt", "yuv420p", str(path)],
        check=True, capture_output=True,
    )
    return str(path)


@pytest.fixture(autouse=True)
def isolated_upload_dir(tmp_path, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path / "uploads"))
    return tmp_path / "uploads"


async def _user_id(client, headers):
    r = await client.get("/api/users/me", headers=headers)
    return r.json()["id"]


async def _make_video(user_id, file_path, *, status="done", segments=True, filename="lecture.mp4"):
    from app.models.video import Video, TranscriptSegment, Keyword
    video = Video(
        user_id=user_id,
        filename=filename,
        file_path=file_path,
        status=status,
        transcript=" ".join(t for _, _, t in SEGMENTS) if segments else "",
        transcript_segments=[TranscriptSegment(start_time=a, end_time=b, text=t) for a, b, t in SEGMENTS]
        if segments else [],
        keywords=[Keyword(**k) for k in KEYWORDS],
    )
    await video.insert()
    return str(video.id)


@pytest_asyncio.fixture
async def video_id(client, auth_headers, real_video):
    return await _make_video(await _user_id(client, auth_headers), real_video)


@pytest_asyncio.fixture
async def other_headers(client):
    await client.post("/api/auth/register", json={
        "name": "Other", "email": "other-story@example.com",
        "password": "password123", "role": "content_creator",
    })
    r = await client.post("/api/auth/login", data={
        "username": "other-story@example.com", "password": "password123",
    })
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# ---------------------------------------------------------- generate: happy

async def test_generate_comic_returns_real_frames_and_timestamps(client, auth_headers, video_id):
    r = await client.post(f"/api/story/generate/{video_id}", headers=auth_headers, json={"mode": "comic"})
    assert r.status_code == 201, r.text
    story = r.json()
    assert story["mode"] == "comic" and story["video_id"] == video_id
    assert story["warnings"] == []
    panels = story["panels"]
    assert len(panels) >= 2

    real_starts = {a for a, _, _ in SEGMENTS}
    for p in panels:
        assert p["video_id"] == video_id and p["panel_id"]
        assert p["title"] and p["caption"] and p["transcript_excerpt"]
        assert any(abs(p["timestamp"] - s) < 0.01 for s in real_starts)
        assert p["frame_url"].startswith(f"/api/story/{video_id}/frames/comic/")

        img = await client.get(p["frame_url"], headers=auth_headers)
        assert img.status_code == 200
        assert img.headers["content-type"] == "image/jpeg"
        assert img.content[:3] == b"\xff\xd8\xff"          # a genuine JPEG


async def test_frames_are_different_moments_of_the_video(client, auth_headers, video_id):
    r = await client.post(f"/api/story/generate/{video_id}", headers=auth_headers, json={"mode": "storyboard"})
    panels = r.json()["panels"]
    blobs = set()
    for p in panels:
        blobs.add((await client.get(p["frame_url"], headers=auth_headers)).content)
    # testsrc draws a running timer, so frames from different times differ.
    assert len(blobs) == len(panels)


async def test_default_mode_is_comic(client, auth_headers, video_id):
    r = await client.post(f"/api/story/generate/{video_id}", headers=auth_headers)
    assert r.status_code == 201 and r.json()["mode"] == "comic"


async def test_get_story_and_panels(client, auth_headers, video_id):
    gen = (await client.post(f"/api/story/generate/{video_id}", headers=auth_headers, json={"mode": "storybook"})).json()

    r = await client.get(f"/api/story/{video_id}", headers=auth_headers)
    assert r.status_code == 200 and r.json()["id"] == gen["id"]

    r = await client.get(f"/api/story/{video_id}?mode=storybook", headers=auth_headers)
    assert r.status_code == 200 and r.json()["mode"] == "storybook"

    r = await client.get(f"/api/story/{video_id}/panels?mode=storybook", headers=auth_headers)
    assert r.status_code == 200
    assert [p["panel_id"] for p in r.json()] == [p["panel_id"] for p in gen["panels"]]


async def test_each_mode_is_stored_separately(client, auth_headers, video_id):
    for mode in ("comic", "study_notes"):
        await client.post(f"/api/story/generate/{video_id}", headers=auth_headers, json={"mode": mode})
    comic = (await client.get(f"/api/story/{video_id}?mode=comic", headers=auth_headers)).json()
    notes = (await client.get(f"/api/story/{video_id}?mode=study_notes", headers=auth_headers)).json()
    assert comic["id"] != notes["id"]
    assert (await client.get(f"/api/story/{video_id}?mode=storyboard", headers=auth_headers)).status_code == 404


async def test_regenerating_replaces_story_and_cleans_old_frames(client, auth_headers, video_id, isolated_upload_dir):
    first = (await client.post(f"/api/story/generate/{video_id}", headers=auth_headers, json={"mode": "comic"})).json()
    frame_dir = isolated_upload_dir / "story_frames" / video_id / "comic"
    old_files = set(os.listdir(frame_dir))

    second = (await client.post(f"/api/story/generate/{video_id}", headers=auth_headers, json={"mode": "comic"})).json()
    assert second["id"] == first["id"]                       # same document updated, not duplicated
    new_files = set(os.listdir(frame_dir))
    assert not (old_files & new_files)                       # old frames removed
    assert len(new_files) == len(second["panels"])
    # Old image URLs no longer resolve; new ones do.
    assert (await client.get(first["panels"][0]["frame_url"], headers=auth_headers)).status_code == 404
    assert (await client.get(second["panels"][0]["frame_url"], headers=auth_headers)).status_code == 200


async def test_delete_story_removes_record_and_frames(client, auth_headers, video_id, isolated_upload_dir):
    await client.post(f"/api/story/generate/{video_id}", headers=auth_headers, json={"mode": "comic"})
    await client.post(f"/api/story/generate/{video_id}", headers=auth_headers, json={"mode": "storybook"})

    r = await client.delete(f"/api/story/{video_id}?mode=comic", headers=auth_headers)
    assert r.status_code == 200 and r.json() == {"deleted": 1}
    assert (await client.get(f"/api/story/{video_id}?mode=comic", headers=auth_headers)).status_code == 404
    assert (await client.get(f"/api/story/{video_id}?mode=storybook", headers=auth_headers)).status_code == 200

    r = await client.delete(f"/api/story/{video_id}", headers=auth_headers)
    assert r.json() == {"deleted": 1}
    assert not (isolated_upload_dir / "story_frames" / video_id).exists()

    assert (await client.delete(f"/api/story/{video_id}", headers=auth_headers)).status_code == 404


# ------------------------------------------------------------ auth/ownership

async def test_requires_authentication(client, video_id):
    assert (await client.post(f"/api/story/generate/{video_id}", json={"mode": "comic"})).status_code == 401
    assert (await client.get(f"/api/story/{video_id}")).status_code == 401
    assert (await client.get(f"/api/story/{video_id}/panels")).status_code == 401
    assert (await client.delete(f"/api/story/{video_id}")).status_code == 401


async def test_other_users_cannot_read_generate_or_download(client, auth_headers, other_headers, video_id):
    gen = (await client.post(f"/api/story/generate/{video_id}", headers=auth_headers, json={"mode": "comic"})).json()
    frame_url = gen["panels"][0]["frame_url"]

    assert (await client.post(f"/api/story/generate/{video_id}", headers=other_headers, json={"mode": "comic"})).status_code == 404
    assert (await client.get(f"/api/story/{video_id}", headers=other_headers)).status_code == 404
    assert (await client.get(f"/api/story/{video_id}/panels", headers=other_headers)).status_code == 404
    assert (await client.delete(f"/api/story/{video_id}", headers=other_headers)).status_code == 404
    assert (await client.get(frame_url, headers=other_headers)).status_code == 404
    # ...and the owner's story is untouched.
    assert (await client.get(f"/api/story/{video_id}", headers=auth_headers)).status_code == 200


# ------------------------------------------------------------- error states

async def test_invalid_and_unknown_video_ids(client, auth_headers):
    r = await client.post("/api/story/generate/not-an-id", headers=auth_headers, json={"mode": "comic"})
    assert r.status_code == 404 and r.json()["detail"] == "Video not found."
    r = await client.get("/api/story/000000000000000000000000", headers=auth_headers)
    assert r.status_code == 404


async def test_invalid_mode_rejected(client, auth_headers, video_id):
    r = await client.post(f"/api/story/generate/{video_id}", headers=auth_headers, json={"mode": "poem"})
    assert r.status_code == 422
    r = await client.get(f"/api/story/{video_id}?mode=poem", headers=auth_headers)
    assert r.status_code == 422


async def test_story_not_generated_yet(client, auth_headers, video_id):
    r = await client.get(f"/api/story/{video_id}", headers=auth_headers)
    assert r.status_code == 404
    assert "No story" in r.json()["detail"]


@pytest.mark.parametrize("status", ["uploaded", "processing"])
async def test_video_not_processed_yet(client, auth_headers, real_video, status):
    vid = await _make_video(await _user_id(client, auth_headers), real_video, status=status)
    r = await client.post(f"/api/story/generate/{vid}", headers=auth_headers, json={"mode": "comic"})
    assert r.status_code == 409 and "still being processed" in r.json()["detail"]


async def test_failed_video(client, auth_headers, real_video):
    vid = await _make_video(await _user_id(client, auth_headers), real_video, status="failed")
    r = await client.post(f"/api/story/generate/{vid}", headers=auth_headers, json={"mode": "comic"})
    assert r.status_code == 409 and "failed to process" in r.json()["detail"]


async def test_empty_transcript(client, auth_headers, real_video):
    vid = await _make_video(await _user_id(client, auth_headers), real_video, segments=False)
    r = await client.post(f"/api/story/generate/{vid}", headers=auth_headers, json={"mode": "comic"})
    assert r.status_code == 422 and "transcript" in r.json()["detail"].lower()


async def test_missing_video_file(client, auth_headers, tmp_path):
    vid = await _make_video(await _user_id(client, auth_headers), str(tmp_path / "gone.mp4"))
    r = await client.post(f"/api/story/generate/{vid}", headers=auth_headers, json={"mode": "comic"})
    assert r.status_code == 404 and "original video file" in r.json()["detail"]


async def test_corrupt_video_gives_friendly_error_not_ffmpeg_output(client, auth_headers, tmp_path):
    bad = tmp_path / "corrupt.mp4"
    bad.write_bytes(b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 1000)     # what the app's own upload tests use
    vid = await _make_video(await _user_id(client, auth_headers), str(bad))
    r = await client.post(f"/api/story/generate/{vid}", headers=auth_headers, json={"mode": "comic"})
    assert r.status_code == 500
    detail = r.json()["detail"]
    assert "Couldn't extract any frames" in detail
    # No raw FFmpeg stderr / stack trace leaks to the user.
    assert "Traceback" not in detail and "moov" not in detail and "Invalid data" not in detail
    # nothing half-saved
    assert (await client.get(f"/api/story/{vid}", headers=auth_headers)).status_code == 404


async def test_ffmpeg_missing_gives_503(client, auth_headers, video_id, monkeypatch):
    from app.api.routes import story as story_routes

    def boom(*a, **k):
        raise FileNotFoundError("FFmpeg not found. Install it and ensure ffmpeg is on your PATH.")

    monkeypatch.setattr(story_routes, "extract_frame", boom)
    r = await client.post(f"/api/story/generate/{video_id}", headers=auth_headers, json={"mode": "comic"})
    assert r.status_code == 503 and "FFmpeg" in r.json()["detail"]


async def test_partial_frame_failure_keeps_story_with_warning(client, auth_headers, video_id, monkeypatch):
    from app.api.routes import story as story_routes
    real = story_routes.extract_frame
    calls = {"n": 0}

    def flaky(*a, **k):
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("simulated failure")
        return real(*a, **k)

    monkeypatch.setattr(story_routes, "extract_frame", flaky)
    r = await client.post(f"/api/story/generate/{video_id}", headers=auth_headers, json={"mode": "comic"})
    assert r.status_code == 201
    body = r.json()
    assert len(body["warnings"]) == 1 and "could not be extracted" in body["warnings"][0]
    assert body["panels"][0]["frame_url"] is None
    assert all(p["frame_url"] for p in body["panels"][1:])


async def test_frame_route_blocks_path_traversal_and_bad_names(client, auth_headers, video_id):
    await client.post(f"/api/story/generate/{video_id}", headers=auth_headers, json={"mode": "comic"})
    for name in ("..%2F..%2Fsecret.jpg", "panel_01_zzzzzzzz.jpg", "panel_01_abcd1234.png", "x.jpg"):
        r = await client.get(f"/api/story/{video_id}/frames/comic/{name}", headers=auth_headers)
        assert r.status_code == 404
    r = await client.get(f"/api/story/{video_id}/frames/poem/panel_01_abcd1234.jpg", headers=auth_headers)
    assert r.status_code == 422
