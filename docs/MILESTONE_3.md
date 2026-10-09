# Milestone 3 — Key Moments, Highlights, Keywords, Chapters, Analytics

## Key moments
`app/services/key_moments_service.py::detect_key_moments()` — local,
no external API. Uses the real Whisper segment timestamps
(`start_time`/`end_time`/`text` per segment) to identify important
points in the transcript, producing `{start_time, end_time, label,
text, importance}` entries. Persisted embedded on the `Video`
document; the frontend's `KeyMoments` page renders them and seeks the
`VideoPlayer` to the clicked timestamp.

## Highlights
`app/services/highlight_service.py::generate_highlights()` derives a
curated subset from the detected key moments (e.g. by importance),
also timestamp-linked for real player seeking — same `KeyMoment` shape,
stored separately as `Video.highlights`.

## Keywords
`app/services/keyword_service.py::extract_keywords()` — local
extraction from the transcript, `{word, score}`, persisted and
displayed on the `Keywords` page.

## Chapters
`app/services/chapter_service.py::generate_chapters()` — groups
transcript segments into `{title, start_time, end_time}` chapters,
generated on demand via `POST /api/videos/{id}/chapters` and cached on
the video document; the player seeks to a chapter's `start_time` on
click.

## Analytics
- `GET /api/analytics/videos/{video_id}` — per-video stats
- `GET /api/analytics/dashboard` — caller's aggregate stats across
  their videos
- `GET /api/analytics/usage-report` — usage over time
- `GET /api/analytics/content-insights` — content-level insights
  (e.g. keyword frequency, processing outcomes)

**All four are computed from real stored `Video` (and where relevant
`Bookmark`/`Clip`) documents at request time** in
`analytics_service.py`, `usage_service.py`, and
`content_insights_service.py` — there is no hardcoded number anywhere
in these files (verified: `grep -n "return {" -A3` on
`analytics_service.py` shows the response built entirely from queried
counts/fields). A new user with zero videos gets a report with real
zeros, not placeholder sample data.
