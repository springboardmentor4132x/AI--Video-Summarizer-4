import socket

import pytest

from app.api.routes import live_summaries
from app.services.live_summary_service import (
    _capture_error_message,
    _ffmpeg_error_message,
    _youtube_download_options,
    mark_interrupted_live_sessions,
    validate_live_source_url,
)


def _resolved_address(address):
    return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (address, 0))]


def test_accepts_public_youtube_live_urls():
    assert validate_live_source_url("https://www.youtube.com/live/abc123") == "youtube_live"
    assert validate_live_source_url("https://youtu.be/abc123") == "youtube_live"


def test_accepts_public_hls_stream(monkeypatch):
    monkeypatch.setattr(socket, "getaddrinfo", lambda *args, **kwargs: _resolved_address("93.184.216.34"))

    assert validate_live_source_url("https://cdn.example/live/index.m3u8?token=one") == "hls"


@pytest.mark.parametrize("address", ["127.0.0.1", "10.1.2.3", "169.254.10.20", "::1"])
def test_rejects_non_public_hls_hosts(monkeypatch, address):
    family = socket.AF_INET6 if ":" in address else socket.AF_INET
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        lambda *args, **kwargs: [(family, socket.SOCK_STREAM, 6, "", (address, 0))],
    )

    with pytest.raises(ValueError, match="publicly reachable"):
        validate_live_source_url("http://stream.example/live/index.m3u8")


def test_rejects_unsupported_video_links():
    with pytest.raises(ValueError, match="Supported sources"):
        validate_live_source_url("https://example.com/video.mp4")


def test_rejects_embedded_url_credentials():
    with pytest.raises(ValueError, match="valid YouTube Live or HLS"):
        validate_live_source_url("https://user:password@cdn.example/live/index.m3u8")


def test_capture_failures_explain_public_youtube_is_not_enough():
    message = _capture_error_message("resolve", "DownloadError")

    assert "public" in message
    assert "active Live broadcast" in message


def test_youtube_bot_verification_has_specific_guidance():
    message = _capture_error_message(
        "resolve",
        "DownloadError",
        "Sign in to confirm you're not a bot.",
    )

    assert "blocking anonymous stream extraction" in message
    assert "direct HLS (.m3u8)" in message


def test_youtube_resolver_uses_configured_cookie_file(monkeypatch, tmp_path):
    from app.core.config import settings

    cookie_file = tmp_path / "private-youtube-cookies.txt"
    cookie_file.write_text("# Netscape HTTP Cookie File\n", encoding="utf-8")
    monkeypatch.setattr(settings, "YOUTUBE_COOKIES_FILE", str(cookie_file))

    assert _youtube_download_options()["cookiefile"] == str(cookie_file.resolve())


def test_youtube_resolver_rejects_missing_cookie_file(monkeypatch, tmp_path):
    from app.core.config import settings

    monkeypatch.setattr(
        settings,
        "YOUTUBE_COOKIES_FILE",
        str(tmp_path / "missing-cookies.txt"),
    )

    with pytest.raises(FileNotFoundError, match="YOUTUBE_COOKIES_FILE"):
        _youtube_download_options()


@pytest.mark.parametrize(
    ("stderr", "expected"),
    [
        ("HTTP error 403 Forbidden", "media server denied"),
        ("HTTP error 404 Not Found", "media stream was not found"),
        ("Connection timed out", "timed out"),
        ("Invalid data found when processing input", "did not provide a supported audio stream"),
    ],
)
def test_ffmpeg_failures_return_actionable_messages(stderr, expected):
    assert expected in _ffmpeg_error_message(stderr)


@pytest.mark.asyncio
async def test_live_session_lifecycle_and_ownership(
    client, auth_headers, learner_headers, monkeypatch
):
    monkeypatch.setattr(live_summaries, "schedule_live_capture", lambda *_args: None)

    async def no_op_stop(_session_id):
        return None

    monkeypatch.setattr(live_summaries, "stop_live_capture", no_op_stop)
    created = await client.post(
        "/api/live-summaries",
        headers=auth_headers,
        json={"url": "https://www.youtube.com/live/test-live-id"},
    )
    assert created.status_code == 202
    body = created.json()
    assert body["source_kind"] == "youtube_live"
    assert body["status"] == "starting"
    assert "url" not in body

    fetched = await client.get(
        f"/api/live-summaries/{body['id']}", headers=auth_headers
    )
    assert fetched.status_code == 200

    cross_user = await client.get(
        f"/api/live-summaries/{body['id']}", headers=learner_headers
    )
    assert cross_user.status_code == 404

    stopped = await client.post(
        f"/api/live-summaries/{body['id']}/stop", headers=auth_headers
    )
    assert stopped.status_code == 200
    assert stopped.json()["status"] == "stopped"


async def test_interrupted_sessions_are_marked_failed(
    client, auth_headers, monkeypatch
):
    monkeypatch.setattr(live_summaries, "schedule_live_capture", lambda *_args: None)
    created = await client.post(
        "/api/live-summaries",
        headers=auth_headers,
        json={"url": "https://www.youtube.com/live/interrupted"},
    )
    session_id = created.json()["id"]

    await mark_interrupted_live_sessions()

    fetched = await client.get(
        f"/api/live-summaries/{session_id}", headers=auth_headers
    )
    assert fetched.status_code == 200
    assert fetched.json()["status"] == "failed"
    assert "backend restarted" in fetched.json()["error_message"]