import pytest
from beanie import PydanticObjectId

from app.models.video import KeyMoment, Keyword, TranscriptSegment, Video
from app.services.memory_deck_service import _topic_for

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
    video.keywords = [
        Keyword(word="networks", score=1.0),
        Keyword(word="patterns", score=0.8),
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


async def test_generation_uses_focused_sections_and_refreshes_legacy_cards(client, auth_headers):
    video_id = await _create_processed_video(client, auth_headers)
    initial = await client.post(
        f"/api/memory-deck/videos/{video_id}/generate", headers=auth_headers
    )
    assert initial.status_code == 201
    initial_card_id = initial.json()[0]["id"]

    video = await Video.get(PydanticObjectId(video_id))
    video.transcript_segments = [
        TranscriptSegment(
            start_time=42.0,
            end_time=48.0,
            text="Neural networks learn patterns from examples.",
        ),
        TranscriptSegment(
            start_time=48.5,
            end_time=55.0,
            text="Training data helps networks recognize patterns.",
        ),
    ]
    video.key_moments = [
        KeyMoment(
            start_time=42.0,
            end_time=55.0,
            label="Neural networks",
            text="Neural networks learn patterns from examples. "
                 "Training data helps networks recognize patterns.",
            importance=0.8,
        )
    ]
    await video.save()

    first = await client.post(
        f"/api/memory-deck/videos/{video_id}/generate", headers=auth_headers
    )
    assert first.status_code == 201
    cards = first.json()
    assert len(cards) == 2
    assert [card["source_start"] for card in cards] == [42.0, 48.5]
    assert [card["answer"] for card in cards] == [
        "Neural networks learn patterns from examples.",
        "Training data helps networks recognize patterns.",
    ]
    assert all(card["prompt"] not in card["answer"] for card in cards)
    assert all(card["prompt"].startswith("What ") for card in cards)
    assert "networks" in cards[0]["prompt"]
    assert any(term in cards[1]["prompt"].lower() for term in ("networks", "patterns"))
    assert cards[0]["id"] == initial_card_id

    repeated = await client.post(
        f"/api/memory-deck/videos/{video_id}/generate", headers=auth_headers
    )
    assert repeated.status_code == 201
    assert [card["id"] for card in repeated.json()] == [card["id"] for card in cards]


async def test_generation_uses_hindi_recall_prompt_for_hindi_segments(client, auth_headers):
    video_id = await _create_processed_video(client, auth_headers)
    video = await Video.get(PydanticObjectId(video_id))
    video.transcript_segments = [
        TranscriptSegment(
            start_time=5.0,
            end_time=10.0,
            text="मशीनें उदाहरणों से पैटर्न सीखती हैं।",
        )
    ]
    video.key_moments = []
    await video.save()

    response = await client.post(
        f"/api/memory-deck/videos/{video_id}/generate", headers=auth_headers
    )

    assert response.status_code == 201
    card = response.json()[0]
    assert card["prompt"] == "इस भाग का मुख्य विचार क्या है?"
    assert card["answer"] == "मशीनें उदाहरणों से पैटर्न सीखती हैं।"


async def test_topic_question_expands_capitalized_multiword_names():
    topic = _topic_for(
        "The Dartmouth Workshop established Artificial Intelligence as a field.",
        [Keyword(word="artificial", score=1.0)],
    )

    assert topic == "Artificial Intelligence"


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