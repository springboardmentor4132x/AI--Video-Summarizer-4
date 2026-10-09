import pytest

from app.api.routes import videos

pytestmark = pytest.mark.asyncio


async def test_upload_rejects_unsupported_format(client, auth_headers):
    files = {"file": ("clip.exe", b"MZ\x00\x00", "application/octet-stream")}
    r = await client.post("/api/videos/upload", headers=auth_headers, files=files)
    assert r.status_code == 400
    assert "format" in r.json()["detail"].lower()


async def test_upload_accepts_valid_extension(client, auth_headers):
    fake_video = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 1000
    files = {"file": ("clip.mp4", fake_video, "video/mp4")}
    r = await client.post("/api/videos/upload", headers=auth_headers, files=files)
    assert r.status_code == 201
    body = r.json()
    assert body["status"] in ("uploaded", "processing")
    assert body["upload_progress"] == 100
    assert body["transcription_language"] == "auto"


async def test_upload_accepts_hindi_transcription_language(client, auth_headers):
    fake_video = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 1000
    files = {"file": ("hindi-clip.mp4", fake_video, "video/mp4")}
    r = await client.post(
        "/api/videos/upload",
        headers=auth_headers,
        files=files,
        data={"language": "hi"},
    )
    assert r.status_code == 201
    assert r.json()["transcription_language"] == "hi"


async def test_upload_rejects_unsupported_transcription_language(client, auth_headers):
    fake_video = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 1000
    files = {"file": ("clip.mp4", fake_video, "video/mp4")}
    r = await client.post(
        "/api/videos/upload",
        headers=auth_headers,
        files=files,
        data={"language": "unsupported"},
    )
    assert r.status_code == 422


async def test_retranscribe_restarts_video_with_selected_language(
    client, auth_headers, monkeypatch
):
    monkeypatch.setattr(videos, "process_video", lambda _video: None)
    fake_video = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 1000
    uploaded = await client.post(
        "/api/videos/upload",
        headers=auth_headers,
        files={"file": ("clip.mp4", fake_video, "video/mp4")},
    )
    assert uploaded.status_code == 201

    response = await client.post(
        f"/api/videos/{uploaded.json()['id']}/retranscribe",
        headers=auth_headers,
        data={"language": "hi"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "processing"
    assert response.json()["transcription_language"] == "hi"


async def test_retranscribe_rejects_video_already_processing(
    client, auth_headers, monkeypatch
):
    monkeypatch.setattr(videos, "process_video", lambda _video: None)
    fake_video = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 1000
    uploaded = await client.post(
        "/api/videos/upload",
        headers=auth_headers,
        files={"file": ("clip.mp4", fake_video, "video/mp4")},
    )
    video_id = uploaded.json()["id"]

    response = await client.post(
        f"/api/videos/{video_id}/retranscribe",
        headers=auth_headers,
        data={"language": "hi"},
    )
    assert response.status_code == 200

    response = await client.post(
        f"/api/videos/{video_id}/retranscribe",
        headers=auth_headers,
        data={"language": "hi"},
    )
    assert response.status_code == 409


async def test_upload_requires_auth(client):
    fake_video = b"\x00\x00\x00\x18ftypmp42"
    files = {"file": ("clip.mp4", fake_video, "video/mp4")}
    r = await client.post("/api/videos/upload", files=files)
    assert r.status_code == 401


async def test_history_starts_empty(client, auth_headers):
    r = await client.get("/api/videos/history", headers=auth_headers)
    assert r.status_code == 200
    assert r.json() == []


async def test_video_status_not_found(client, auth_headers):
    r = await client.get("/api/videos/000000000000000000000000/status", headers=auth_headers)
    assert r.status_code == 404


async def test_cross_user_ownership_enforced(client, auth_headers):
    # user 1 uploads a video
    fake_video = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 1000
    files = {"file": ("clip.mp4", fake_video, "video/mp4")}
    r = await client.post("/api/videos/upload", headers=auth_headers, files=files)
    video_id = r.json()["id"]

    # user 2 should not be able to see it
    await client.post("/api/auth/register", json={
        "name": "Eve", "email": "eve@example.com",
        "password": "password123", "role": "learner",
    })
    r2 = await client.post("/api/auth/login", data={
        "username": "eve@example.com", "password": "password123",
    })
    eve_headers = {"Authorization": f"Bearer {r2.json()['access_token']}"}

    r = await client.get(f"/api/videos/{video_id}/status", headers=eve_headers)
    assert r.status_code == 404
