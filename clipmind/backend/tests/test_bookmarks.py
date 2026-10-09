import pytest

pytestmark = pytest.mark.asyncio


async def _upload_video(client, headers):
    fake_video = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 1000
    files = {"file": ("clip.mp4", fake_video, "video/mp4")}
    r = await client.post("/api/videos/upload", headers=headers, files=files)
    return r.json()["id"]


async def test_create_and_list_bookmark(client, auth_headers):
    video_id = await _upload_video(client, auth_headers)

    r = await client.post("/api/bookmarks", headers=auth_headers, json={
        "video_id": video_id, "timestamp": 12.5, "note": "interesting part",
    })
    assert r.status_code == 201
    bookmark_id = r.json()["id"]

    r = await client.get(f"/api/bookmarks/video/{video_id}", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["id"] == bookmark_id


async def test_bookmark_requires_owned_video(client, auth_headers):
    r = await client.post("/api/bookmarks", headers=auth_headers, json={
        "video_id": "000000000000000000000000", "timestamp": 1.0, "note": "x",
    })
    assert r.status_code == 404


async def test_delete_bookmark(client, auth_headers):
    video_id = await _upload_video(client, auth_headers)
    r = await client.post("/api/bookmarks", headers=auth_headers, json={
        "video_id": video_id, "timestamp": 3.0, "note": "note",
    })
    bookmark_id = r.json()["id"]

    r = await client.delete(f"/api/bookmarks/{bookmark_id}", headers=auth_headers)
    assert r.status_code in (200, 204)

    r = await client.get(f"/api/bookmarks/video/{video_id}", headers=auth_headers)
    assert r.json() == []
