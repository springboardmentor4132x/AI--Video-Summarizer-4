"""Adaptive flashcard generation and review endpoints."""

from datetime import datetime, timedelta, timezone

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.models.memory_card import MemoryCard
from app.models.user import User
from app.models.video import Video
from app.schemas.memory_deck import (
    ExplainAttemptIn,
    ExplainAttemptOut,
    MemoryCardOut,
    MemoryReviewIn,
)
from app.services.memory_deck_service import (
    build_card_sources,
    explain_against_source,
    explanation_feedback,
)

router = APIRouter(prefix="/api/memory-deck", tags=["Memory Deck"])
REVIEW_INTERVAL_DAYS = {"needs_review": 1, "strong": 3}


def _to_out(card: MemoryCard) -> MemoryCardOut:
    return MemoryCardOut(
        id=str(card.id),
        video_id=card.video_id,
        video_filename=card.video_filename,
        prompt=card.prompt,
        answer=card.answer,
        source_label=card.source_label,
        source_start=card.source_start,
        source_end=card.source_end,
        strength=card.strength,
        review_count=card.review_count,
        last_reviewed_at=card.last_reviewed_at,
        next_review_at=card.next_review_at,
        created_at=card.created_at,
    )


async def _find_owned_card(card_id: str, current_user: User) -> MemoryCard:
    try:
        card = await MemoryCard.get(PydanticObjectId(card_id))
    except Exception:
        card = None
    if card is None or card.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Memory card not found.")
    return card


@router.get("", response_model=list[MemoryCardOut])
async def list_memory_cards(
    due_only: bool = True,
    current_user: User = Depends(get_current_user),
):
    cards = await MemoryCard.find(
        MemoryCard.user_id == str(current_user.id)
    ).sort("+next_review_at").to_list()
    if due_only:
        now = datetime.now(timezone.utc)
        cards = [
            card
            for card in cards
            if (
                card.next_review_at.replace(tzinfo=timezone.utc)
                if card.next_review_at.tzinfo is None
                else card.next_review_at
            ) <= now
        ]
    return [_to_out(card) for card in cards]


@router.post("/videos/{video_id}/generate", response_model=list[MemoryCardOut], status_code=201)
async def generate_memory_cards(
    video_id: str,
    current_user: User = Depends(get_current_user),
):
    try:
        video = await Video.get(PydanticObjectId(video_id))
    except Exception:
        video = None
    if video is None or video.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Video not found.")
    if not video.transcript_segments:
        raise HTTPException(status_code=400, detail="Timestamped transcript is not available yet.")

    sources = build_card_sources(video)
    if not sources:
        raise HTTPException(status_code=400, detail="No timestamped transcript content is available.")

    existing = await MemoryCard.find(
        MemoryCard.user_id == str(current_user.id),
        MemoryCard.video_id == video_id,
    ).to_list()

    now = datetime.now(timezone.utc)
    unmatched = list(existing)
    cards = []
    for source in sources:
        card_index = next(
            (
                index for index, card in enumerate(unmatched)
                if abs(card.source_start - source["start"]) <= 0.5
            ),
            None,
        )
        if card_index is None:
            card = MemoryCard(
                user_id=str(current_user.id),
                video_id=video_id,
                video_filename=video.filename,
                prompt=source["prompt"],
                answer=source["text"],
                source_label=source["label"],
                source_start=source["start"],
                source_end=source["end"],
                next_review_at=now,
            )
            await card.insert()
        else:
            card = unmatched.pop(card_index)
            card.video_filename = video.filename
            card.prompt = source["prompt"]
            card.answer = source["text"]
            card.source_label = source["label"]
            card.source_start = source["start"]
            card.source_end = source["end"]
            await card.save()
        cards.append(card)

    for stale_card in unmatched:
        if stale_card.review_count == 0:
            await stale_card.delete()
        else:
            cards.append(stale_card)
    return [_to_out(card) for card in cards]


@router.post("/{card_id}/review", response_model=MemoryCardOut)
async def review_memory_card(
    card_id: str,
    payload: MemoryReviewIn,
    current_user: User = Depends(get_current_user),
):
    card = await _find_owned_card(card_id, current_user)
    now = datetime.now(timezone.utc)
    card.strength = payload.strength
    card.review_count += 1
    card.last_reviewed_at = now
    if payload.strength == "forgotten":
        interval = timedelta(minutes=10)
    elif payload.strength == "strong":
        interval = min(30, 3 * (2 ** max(0, card.review_count - 1)))
        interval = timedelta(days=interval)
    else:
        interval = timedelta(days=REVIEW_INTERVAL_DAYS[payload.strength])
    card.next_review_at = now + interval
    await card.save()
    return _to_out(card)


@router.post("/{card_id}/explain", response_model=ExplainAttemptOut)
async def explain_memory_card(
    card_id: str,
    payload: ExplainAttemptIn,
    current_user: User = Depends(get_current_user),
):
    card = await _find_owned_card(card_id, current_user)
    matched, missing = explain_against_source(payload.explanation, card.answer)
    return ExplainAttemptOut(
        matched_terms=matched,
        missing_terms=missing,
        feedback=explanation_feedback(matched, missing),
        source_start=card.source_start,
        source_end=card.source_end,
        source_excerpt=card.answer,
    )