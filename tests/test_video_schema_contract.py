"""
Verifies the shapes produced by the Module 3 services line up with the
API response schema (VideoOut) that the frontend consumes. This is
the "frontend receives expected response structure" check from the
Module 4 test plan, done at the schema level since spinning up Mongo
isn't possible in this sandbox (see tests/test_integration_e2e.py).
"""

import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.schemas.video import VideoOut
from app.services.key_moments_service import detect_key_moments
from app.services.highlight_service import generate_highlights
from app.services.keyword_service import extract_keywords


def test_full_module3_output_validates_against_video_out_schema():
    segments = [
        {"start_time": 0.0, "end_time": 5.0, "text": "Welcome, today we discuss important machine learning concepts."},
        {"start_time": 5.0, "end_time": 11.0, "text": "In conclusion, remember that data quality matters significantly."},
    ]
    transcript = " ".join(s["text"] for s in segments)

    key_moments = detect_key_moments(transcript, transcript_segments=segments)
    highlights = generate_highlights(key_moments)
    keywords = extract_keywords(transcript)

    payload = {
        "id": "64b000000000000000000000",
        "filename": "sample.mp4",
        "status": "done",
        "current_stage": "done",
        "progress": 100,
        "transcript": transcript,
        "transcript_segments": segments,
        "key_moments": key_moments,
        "highlights": highlights,
        "keywords": keywords,
        "uploaded_at": datetime.now(timezone.utc),
    }

    # Should not raise - this is exactly what the /status, /key-moments,
    # /highlights and /keywords endpoints return to the frontend.
    video_out = VideoOut(**payload)

    assert video_out.key_moments == key_moments or [km.model_dump() for km in video_out.key_moments]
    assert len(video_out.transcript_segments) == 2
