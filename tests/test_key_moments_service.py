"""
Unit tests for app/services/key_moments_service.py.

These test the pure detection logic directly and do NOT require
MongoDB, ffmpeg, Whisper or any model download - they can run with
just `pytest` installed. See tests/test_integration_e2e.py for the
tests that DO need those services (documented there, not executable
in this sandbox).
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.key_moments_service import detect_key_moments


def make_segments(pairs):
    """Helper: build transcript_segments from (start, end, text) tuples."""
    return [{"start_time": s, "end_time": e, "text": t} for s, e, t in pairs]


# ---------------------------------------------------------------------------
# 1. Transcript segments have timestamps / 2. key moments are generated
# ---------------------------------------------------------------------------

def test_key_moments_are_generated_from_real_segments():
    segments = make_segments([
        (0.0, 4.0, "Welcome to this tutorial on machine learning basics."),
        (4.0, 9.5, "Today we will cover neural networks and deep learning."),
        (9.5, 14.0, "This is important: always normalize your input data."),
        (14.0, 18.0, "Remember, in conclusion, gradient descent minimizes loss."),
        (18.0, 20.0, "Okay so um yeah."),
    ])
    transcript = " ".join(s["text"] for s in segments)

    moments = detect_key_moments(transcript, transcript_segments=segments)

    assert len(moments) > 0
    for m in moments:
        assert set(m.keys()) == {"start_time", "end_time", "label", "text", "importance"}


# ---------------------------------------------------------------------------
# 3. Key moments have valid timestamps
# ---------------------------------------------------------------------------

def test_key_moment_timestamps_are_valid():
    segments = make_segments([
        (0.0, 5.0, "This is a crucial and significant point about our results."),
        (5.0, 10.0, "The numbers show a 42 percent improvement this quarter."),
        (10.0, 15.0, "Thanks for watching, that's it for today."),
    ])
    transcript = " ".join(s["text"] for s in segments)

    moments = detect_key_moments(transcript, transcript_segments=segments)

    assert len(moments) > 0
    for m in moments:
        assert m["start_time"] >= 0
        assert m["end_time"] >= m["start_time"]
        assert 0.0 <= m["importance"] <= 1.0


# ---------------------------------------------------------------------------
# 4. Key moments do not overlap unnecessarily / avoid adjacent duplicates
# ---------------------------------------------------------------------------

def test_key_moments_do_not_cluster_on_adjacent_segments():
    # Many short, near-duplicate, keyword-dense segments back-to-back -
    # detection should not just return all of them.
    segments = make_segments([
        (i * 2.0, i * 2.0 + 1.8, "This important crucial significant machine learning point matters.")
        for i in range(20)
    ])
    transcript = " ".join(s["text"] for s in segments)

    moments = detect_key_moments(transcript, transcript_segments=segments)

    starts = [m["start_time"] for m in moments]
    for a, b in zip(starts, starts[1:]):
        assert (b - a) >= 4.0, "selected moments should not be closer than the configured gap"
    assert len(moments) <= 8  # MAX_KEY_MOMENTS


# ---------------------------------------------------------------------------
# 6. Empty transcript is handled
# ---------------------------------------------------------------------------

def test_empty_transcript_returns_no_key_moments():
    assert detect_key_moments("", transcript_segments=[]) == []
    assert detect_key_moments("   ", transcript_segments=None) == []


def test_empty_segments_list_falls_back_to_plain_transcript():
    # transcript has words but there are literally no timestamped
    # segments (e.g. legacy record) - should not error, should fall
    # back to the estimate-based path rather than returning nothing.
    transcript = "word " * 100
    moments = detect_key_moments(transcript, video_duration_seconds=60, transcript_segments=[])
    assert len(moments) > 0


# ---------------------------------------------------------------------------
# 7. Short video is handled
# ---------------------------------------------------------------------------

def test_short_video_single_segment():
    segments = make_segments([(0.0, 3.0, "Hello and welcome.")])
    transcript = segments[0]["text"]

    moments = detect_key_moments(transcript, transcript_segments=segments)
    # A single short filler-like segment may legitimately score 0
    # importance and produce no key moments - this must not raise.
    assert isinstance(moments, list)


def test_short_video_with_one_substantive_segment():
    segments = make_segments([
        (0.0, 6.0, "The critical result is a 30 percent increase in efficiency."),
    ])
    transcript = segments[0]["text"]

    moments = detect_key_moments(transcript, transcript_segments=segments)
    assert len(moments) == 1
    assert moments[0]["start_time"] == 0.0


# ---------------------------------------------------------------------------
# 8. Normal video is handled (mixed filler + substantive content)
# ---------------------------------------------------------------------------

def test_normal_video_mixed_content():
    segments = make_segments([
        (0.0, 3.0, "Um okay so."),
        (3.0, 9.0, "Let's talk about the important results from our 2026 study."),
        (9.0, 13.0, "Yeah okay um."),
        (13.0, 20.0, "In conclusion, the key finding is a significant cost reduction."),
        (20.0, 24.0, "Thanks everyone."),
    ])
    transcript = " ".join(s["text"] for s in segments)

    moments = detect_key_moments(transcript, transcript_segments=segments)

    assert len(moments) >= 1
    texts = " ".join(m["text"] for m in moments).lower()
    assert "important" in texts or "conclusion" in texts
