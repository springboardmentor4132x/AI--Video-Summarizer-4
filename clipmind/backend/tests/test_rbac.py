import pytest

pytestmark = pytest.mark.asyncio


async def test_learner_cannot_upload_video(client, learner_headers):
    """Learner is a consumer role; uploading is restricted to
    Content Creator / Educator / Administrator."""
    fake_video = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 1000
    files = {"file": ("clip.mp4", fake_video, "video/mp4")}
    r = await client.post("/api/videos/upload", headers=learner_headers, files=files)
    assert r.status_code == 403


async def test_content_creator_can_upload_video(client, auth_headers):
    fake_video = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 1000
    files = {"file": ("clip.mp4", fake_video, "video/mp4")}
    r = await client.post("/api/videos/upload", headers=auth_headers, files=files)
    assert r.status_code == 201


async def test_role_restricted_example_route_rejects_wrong_role(client, learner_headers):
    r = await client.get("/api/users/admin-only-example", headers=learner_headers)
    assert r.status_code == 403


async def test_role_restricted_example_route_allows_matching_role(client, learner_headers):
    r = await client.get("/api/users/learner-only-example", headers=learner_headers)
    assert r.status_code == 200
