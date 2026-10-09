import pytest
from beanie import PydanticObjectId

from app.models.video import KeyMoment, TranscriptSegment, Video

pytestmark = pytest.mark.asyncio


async def _create_processed_video(client, headers):
    content = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 1000
    response = await client.post(
        "/api/videos/upload",
        headers=headers,
        files={"file": ("memory-lesson.mp4", content, "video/mp4")},
    )
    video_id = response.json()["id"]
    video = await Video.get(PydanticObjectId(video_id))
    video.transcript = "Neural networks learn patterns from examples."
    video.transcript_segments = [
        TranscriptSegment(
            start_time=42.0,
            end_time=55.0,
            text="Neural networks learn patterns from examples.",
        )
    ]
    video.key_moments = [
        KeyMoment(
            start_time=42.0,
            end_time=55.0,
            label="Neural networks",
            text="Neural networks learn patterns from examples.",
            importance=0.8,
        )
    ]
    await video.save()
    return video_id


async def test_generate_review_and_explain_memory_card(client, auth_headers):
    video_id = await _create_processed_video(client, auth_headers)

    response = await client.post(
        f"/api/memory-deck/videos/{video_id}/generate", headers=auth_headers
    )
    assert response.status_code == 201
    cards = response.json()
    assert len(cards) == 1
    card = cards[0]
    assert card["source_start"] == 42.0
    assert card["source_end"] == 55.0
    assert card["strength"] == "needs_review"

    repeated = await client.post(
        f"/api/memory-deck/videos/{video_id}/generate", headers=auth_headers
    )
    assert repeated.status_code == 201
    assert [item["id"] for item in repeated.json()] == [card["id"]]

    explanation = await client.post(
        f"/api/memory-deck/{card['id']}/explain",
        headers=auth_headers,
        json={"explanation": "Networks learn patterns from examples."},
    )
    assert explanation.status_code == 200
    assert "patterns" in explanation.json()["matched_terms"]
    assert explanation.json()["source_start"] == 42.0
    assert "Neural networks" in explanation.json()["source_excerpt"]

    reviewed = await client.post(
        f"/api/memory-deck/{card['id']}/review",
        headers=auth_headers,
        json={"strength": "strong"},
    )
    assert reviewed.status_code == 200
    assert reviewed.json()["strength"] == "strong"
    assert reviewed.json()["review_count"] == 1

    due_cards = await client.get("/api/memory-deck", headers=auth_headers)
    assert due_cards.status_code == 200
    assert due_cards.json() == []

    all_cards = await client.get(
        "/api/memory-deck?due_only=false", headers=auth_headers
    )
    assert len(all_cards.json()) == 1


async def test_memory_deck_enforces_ownership(client, auth_headers):
    video_id = await _create_processed_video(client, auth_headers)
    generated = await client.post(
        f"/api/memory-deck/videos/{video_id}/generate", headers=auth_headers
    )
    card_id = generated.json()[0]["id"]

    await client.post("/api/auth/register", json={
        "name": "Other User",
        "email": "memory-other@example.com",
        "password": "password123",
        "role": "learner",
    })
    login = await client.post("/api/auth/login", data={
        "username": "memory-other@example.com",
        "password": "password123",
    })
    other_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    assert (await client.get("/api/memory-deck", headers=other_headers)).json() == []
    response = await client.post(
        f"/api/memory-deck/{card_id}/review",
        headers=other_headers,
        json={"strength": "forgotten"},
    )
    assert response.status_code == 404
    response = await client.post(
        f"/api/memory-deck/videos/{video_id}/generate", headers=other_headers
    )
    assert response.status_code == 404