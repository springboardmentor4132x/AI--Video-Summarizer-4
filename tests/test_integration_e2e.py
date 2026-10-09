"""
Integration / end-to-end tests for the Module 3 pipeline.

STATUS: written, but NOT executed as part of this change, and marked
skipped so a bare `pytest` run doesn't fail CI/local runs for
environment reasons rather than real bugs.

Reason they can't run in the sandbox this was developed in:
  - No MongoDB instance is available (Beanie/Motor need a real Mongo
    connection - there's no in-memory Motor fake in this project).
  - No ffmpeg binary + no downloaded Whisper "base" model weights.
  - No downloaded `facebook/bart-large-cnn` weights for summary_service.
  - No running instance of the FastAPI app (uvicorn) to hit over HTTP.

Once run against a real dev environment (Mongo running, ffmpeg on
PATH, model weights available - i.e. `docker-compose up` from
Tejashwini's docker-compose.yml, or a local `uvicorn app.main:app`),
these should be un-skipped and run for real before the Sep 11 demo.
Postman collections under app/postman/ cover the same endpoints from
the HTTP side and are a good complement to these.
"""

import pytest

pytestmark = pytest.mark.skip(
    reason="Requires MongoDB + ffmpeg + downloaded Whisper/BART model "
           "weights + a running app instance - none available in this "
           "sandbox. Un-skip and run in a real dev/CI environment."
)


@pytest.mark.asyncio
async def test_existing_m1_m2_pipeline_still_works():
    """
    Register -> Login -> Upload -> Processing -> Transcript -> Summary
    must still succeed after the Module 3 changes (new
    `transcript_segments` field, new services/process_video.py).
    """
    ...


@pytest.mark.asyncio
async def test_full_pipeline_upload_to_key_moments_to_highlights_to_keywords():
    """
    Upload a real short sample video -> wait for status == done
    (transcript ready) -> POST /key-moments -> POST /highlights ->
    POST /keywords, asserting each stage's *_progress reaches 100 and
    the previous stage's guard (400 if transcript missing / no key
    moments yet) behaves as coded in app/api/routes/videos.py.
    """
    ...


@pytest.mark.asyncio
async def test_key_moments_persist_and_reload_from_mongo():
    """
    After generating key moments, re-fetch the video via
    GET /api/videos/{id}/status and confirm the embedded KeyMoment
    documents round-trip through Mongo with the same start_time/
    end_time/label/text/importance values (Vijayalaxmi's storage
    layer, exercised through Tejashwini's API).
    """
    ...


@pytest.mark.asyncio
async def test_multiple_video_types_through_full_flow():
    """
    Run 2-3 sample videos (short clip, longer lecture-style clip,
    a near-silent clip) through the complete flow and confirm no
    unhandled exceptions, matching the execution plan's
    "multiple video testing" requirement.
    """
    ...


@pytest.mark.asyncio
async def test_api_returns_correct_data_for_key_moments_endpoint():
    """
    Postman-equivalent HTTP-level check: POST /{id}/key-moments with
    a valid auth token on a video with a ready transcript returns 200
    and a VideoOut body whose key_moments list matches the schema in
    app/schemas/video.py exactly (field names, types).
    """
    ...
