# Database Design

MongoDB, accessed via Beanie (async ODM over Motor). Database name:
`clipmindAI` (configurable via `MONGO_DB_NAME`).

This document was written directly from the current model files in
`backend/app/models/` — not carried over from an earlier draft — so it
matches the code exactly.

## Collections

### `users`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | str | |
| `email` | str, indexed unique | login identifier |
| `password` | str | bcrypt hash, never plaintext |
| `role` | str | one of `content_creator`, `learner`, `educator`, `administrator` |
| `created_at` | datetime | |

### `videos`
One document per uploaded video; transcript segments, key moments,
highlights, keywords, chapters and cached translations are **embedded**
sub-documents/arrays on the video, not separate collections — they
have no independent lifecycle and are always read together with their
parent video.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `user_id` | str, indexed | owner — every video route filters on this |
| `filename`, `file_path` | str | |
| `status` | str | `uploaded` / `processing` / `done` / `failed` |
| `current_stage` | str | `upload`/`audio`/`transcription`/`summary`/`key_moments`/`highlights`/`keywords`/`done`/`failed` |
| `progress`, `upload_progress`, `audio_progress`, `transcription_progress`, `summary_progress`, `key_moments_progress`, `highlights_progress`, `keywords_progress` | int | per-stage percentages the frontend polls |
| `transcript` | str | full text |
| `transcript_segments` | `[{start_time, end_time, text}]` | embedded |
| `short_summary`, `summary` | str | local BART output — genuinely different content |
| `key_moments`, `highlights` | `[{start_time, end_time, label, text, importance}]` | embedded |
| `keywords` | `[{word, score}]` | embedded |
| `chapters` | `[{title, start_time, end_time}]` | embedded, generated on demand |
| `translations` | `{lang_code: {short, detailed}}` | embedded, cached per language so repeat requests don't re-call the translation API |
| `error_message` | str | set on partial or full processing failure |
| `uploaded_at` | datetime | |

### `bookmarks`
A separate collection (not embedded in `videos`) because a bookmark's
lifecycle and ownership dimension (who created it) is independent of
the video's own processing lifecycle.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `user_id` | str, indexed | creator |
| `video_id` | str, indexed | must reference a video owned by the same user (enforced in the route, not just by convention) |
| `timestamp` | float | seconds |
| `note` | str | |
| `created_at` | datetime | |

### `clips`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `user_id`, `video_id` | str, indexed | |
| `source_start`, `source_end` | float | seconds, validated `0 <= start < end <= video duration` |
| `file_path`, `filename` | str | the actual FFmpeg-generated file on disk |
| `created_at` | datetime | |

## Relationships and ownership

```
User 1───* Video 1───* (embedded: TranscriptSegment, KeyMoment,
                          Highlight, Keyword, Chapter, Translation)
User 1───* Bookmark ──* references Video (by id, cross-checked owner)
User 1───* Clip ──────* references Video (by id, cross-checked owner)
```

Every query that returns a Video, Bookmark, or Clip filters by
`user_id == current_user.id` (or fetches by id then rejects if the
owner doesn't match) — enforced in the route/service layer, since
MongoDB itself has no row-level security. This is exercised by
`backend/tests/test_video_upload.py::test_cross_user_ownership_enforced`
and `backend/tests/test_bookmarks.py::test_bookmark_requires_owned_video`.

## Indexes

- `users.email` — unique index (registration/login lookups, duplicate
  prevention)
- `videos.user_id`, `bookmarks.user_id`, `bookmarks.video_id`,
  `clips.user_id`, `clips.video_id` — all declared `Indexed(str)` on
  their model fields for fast per-user/per-video lookups

## Why analytics isn't a collection

There is no `analytics` collection. Dashboard/usage/content-insight
numbers are computed at request time in `app/services/analytics_service.py`,
`usage_service.py`, and `content_insights_service.py` by querying the
caller's own `videos` (and where relevant `bookmarks`/`clips`)
documents — this guarantees the numbers can never drift from the
actual stored data, at the cost of doing the aggregation on read
instead of on write. For this project's scale that trade-off is fine;
a future optimization would be a materialized/cached analytics
collection updated on write.

## Added with Memory Deck and Real-Time Workspace
| Collection | Model | Purpose |
|---|---|---|
| `memory_cards` | `MemoryCard` | per-user flashcards from a video's key moments: prompt, answer, `strength`, source timestamps, review schedule |
| `live_summary_sessions` | `LiveSummarySession` | a live capture: source URL, status, timestamped transcript, rolling summaries. Sessions left running by a restart are marked interrupted on startup |

Both are registered in `init_db()` (`app/db/database.py`). No migration is
needed: MongoDB creates the collections on first write.

## Added for roles and sharing
| Collection | Model | Purpose |
|---|---|---|
| `audit_logs` | `AuditLog` | administrator actions: actor, action (`user.role_changed`, `user.disabled`, `video.deleted`...), target, details, time |
| `video_shares` | `VideoShare` | `video_id`, `owner_id`, `student_id`: read-only access an owner granted |

Changed documents: `users.is_active` (default `true`, so existing users stay active) and `videos.transcript_edited_at` (optional). No migration is required.

