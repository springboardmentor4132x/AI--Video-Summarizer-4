import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.highlight_service import generate_highlights, MAX_HIGHLIGHTS


def make_moment(start, importance, text="sample text"):
    return {"start_time": start, "end_time": start + 3, "label": text[:8], "text": text, "importance": importance}


def test_highlights_are_generated_and_sorted_by_importance():
    moments = [
        make_moment(0, 0.2),
        make_moment(10, 0.9),
        make_moment(20, 0.5),
        make_moment(30, 0.8),
    ]
    highlights = generate_highlights(moments)

    assert len(highlights) == MAX_HIGHLIGHTS
    importances = [h["importance"] for h in highlights]
    assert importances == sorted(importances, reverse=True)


def test_highlights_empty_when_no_key_moments():
    assert generate_highlights([]) == []


def test_highlights_never_exceed_available_key_moments():
    moments = [make_moment(0, 0.5)]
    highlights = generate_highlights(moments)
    assert len(highlights) == 1
