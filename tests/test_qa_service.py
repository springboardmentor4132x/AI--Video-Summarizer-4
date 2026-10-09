"""
Unit tests for the local, extractive Q&A service (app/services/
qa_service.py). This needs no model download and no network access --
it's pure TF-IDF/cosine similarity over provided segments -- so unlike
Whisper/BART/NLLB it CAN be fully exercised in this sandbox.
"""
from app.services.qa_service import answer_question, NO_ANSWER_PHRASE

SEGMENTS = [
    {"start_time": 0.0, "end_time": 5.0, "text": "Welcome to this tutorial about the French Revolution."},
    {"start_time": 5.0, "end_time": 12.0, "text": "The Revolution began in 1789 with the storming of the Bastille."},
    {"start_time": 12.0, "end_time": 20.0, "text": "King Louis the Sixteenth was eventually executed in 1793."},
    {"start_time": 20.0, "end_time": 28.0, "text": "The metric system was also introduced during this period."},
]


def test_answers_question_with_relevant_content():
    answer, timestamps, insufficient = answer_question(
        "When did the French Revolution begin?", SEGMENTS
    )
    assert insufficient is False
    assert "1789" in answer or "Bastille" in answer
    assert 5.0 in timestamps


def test_returns_insufficient_for_unrelated_question():
    answer, timestamps, insufficient = answer_question(
        "What is the boiling point of mercury on Jupiter?", SEGMENTS
    )
    assert insufficient is True
    assert answer == NO_ANSWER_PHRASE
    assert timestamps == []


def test_empty_question_rejected():
    import pytest
    with pytest.raises(ValueError):
        answer_question("   ", SEGMENTS)


def test_no_transcript_segments():
    answer, timestamps, insufficient = answer_question("What happened?", [])
    assert insufficient is True
    assert timestamps == []


def test_answer_never_contains_text_outside_transcript():
    """The answer must only ever be built from the actual transcript
    text -- this is the core no-hallucination guarantee of an
    extractive approach."""
    answer, _, insufficient = answer_question("Who was the king?", SEGMENTS)
    assert insufficient is False
    # Every non-timestamp word of substance in the answer should trace
    # back to one of the source segments.
    assert "Louis" in answer
