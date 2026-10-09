# API Reference

Base URL: `http://127.0.0.1:8000` (configurable via the frontend's
`VITE_API_BASE_URL`). Full interactive docs are always available at
`/docs` (Swagger UI) and `/openapi.json` when the backend is running —
this file is a human-readable summary of that same, real, live route
table (captured by importing the actual FastAPI app in this repo, not
written from memory).

All routes except `/`, `/api/auth/register` and `/api/auth/login`
require a `Authorization: Bearer <token>` header.

## Auth
| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register` | body: `name, email, password, role` (role ∈ content_creator/learner/educator/administrator) |
| POST | `/api/auth/login` | form-encoded `username` (email), `password`. Returns `access_token`. |

## Users
| Method | Path | Notes |
|---|---|---|
| GET | `/api/users/me` | Current user profile |
| GET | `/api/users/admin-only-example` | Administrator only — demonstrates `require_role()` |
| GET | `/api/users/educator-only-example` | Educator or Administrator |
| GET | `/api/users/content-creator-only-example` | Content Creator or Administrator |
| GET | `/api/users/learner-only-example` | Learner or Administrator |

## Videos
| Method | Path | Notes |
|---|---|---|
| POST | `/api/videos/upload` | multipart `file`. **Restricted to Content Creator / Educator / Administrator.** Kicks off background processing (audio → transcript → summary → key moments → highlights → keywords). |
| GET | `/api/videos/history` | Caller's own videos |
| GET | `/api/videos/{video_id}/status` | Processing status + per-stage progress |
| GET | `/api/videos/{video_id}/file` | Stream the video file (for the player) |
| GET | `/api/videos/{video_id}/transcript` | Timestamped transcript segments |
| POST | `/api/videos/{video_id}/summary` | Re-run/fetch short + detailed summary (local BART) |
| POST | `/api/videos/{video_id}/key-moments` | Re-run/fetch key moments |
| POST | `/api/videos/{video_id}/highlights` | Re-run/fetch highlights |
| POST | `/api/videos/{video_id}/keywords` | Re-run/fetch keywords |
| POST | `/api/videos/{video_id}/chapters` | Generate chapters |
| POST | `/api/videos/{video_id}/translate` | body: `language`. Local NLLB-200 model, no API key. **503 only if the local model fails to load** (e.g. weights not downloaded yet). |
| POST | `/api/videos/{video_id}/ask` | body: `question`. Local TF-IDF-retrieval, transcript-grounded, extractive Q&A — no API key, no model download needed at all. |
| GET | `/api/videos/{video_id}/export-pdf` | Full report as PDF |

All `/api/videos/{video_id}/...` routes enforce that `video_id` belongs
to the caller (404, not 403, for someone else's video — avoids leaking
existence).

## Bookmarks
| Method | Path | Notes |
|---|---|---|
| POST | `/api/bookmarks` | body: `video_id, timestamp, note`. Video must exist and belong to caller. |
| GET | `/api/bookmarks/video/{video_id}` | List, sorted by timestamp |
| PATCH | `/api/bookmarks/{bookmark_id}` | Update note |
| DELETE | `/api/bookmarks/{bookmark_id}` | Owned bookmark only |

## Clips
| Method | Path | Notes |
|---|---|---|
| POST | `/api/clips` | body: `video_id, start, end`. FFmpeg stream-copy, re-encode fallback. |
| GET | `/api/clips/{clip_id}/download` | Download the generated clip file |

## Analytics
| Method | Path | Notes |
|---|---|---|
| GET | `/api/analytics/videos/{video_id}` | Per-video stats |
| GET | `/api/analytics/dashboard` | Caller's aggregate dashboard |
| GET | `/api/analytics/usage-report` | Caller's usage report |
| GET | `/api/analytics/content-insights` | Caller's content insights |

All analytics are computed from real stored documents at request time
— nothing here is a hardcoded number.

## ClipMind Story
All routes require auth and only ever touch the caller's own videos/stories.
`mode` ∈ `comic | storybook | study_notes | storyboard`.

| Method | Path | Notes |
|---|---|---|
| POST | `/api/story/generate/{video_id}` | body `{"mode": "comic"}` (default `comic`). Builds panels from the video's transcript and extracts a real frame per panel with FFmpeg. Creates or replaces that mode's story. `201` + story. Errors: `404` unknown/not-yours/file missing, `409` video not processed or failed, `422` no transcript / too little content, `503` FFmpeg unavailable, `500` no frame could be extracted |
| GET | `/api/story/{video_id}?mode=` | Saved story for that mode; without `mode`, the most recently updated one. `404` if none yet |
| GET | `/api/story/{video_id}/panels?mode=` | Just the panels array |
| DELETE | `/api/story/{video_id}?mode=` | Delete one mode's story (or all of the video's stories if `mode` omitted) and its frame images. Returns `{"deleted": n}` |
| GET | `/api/story/{video_id}/frames/{mode}/{filename}` | A panel's JPEG (owner only; filename is whitelisted — no path traversal). The frontend fetches it as a blob because `<img>` cannot send the auth header |

Panel fields: `panel_id, video_id, panel_number, timestamp, start_time, end_time, frame_url, title, concept, caption, transcript_excerpt, importance`.
`frame_url` is a server-absolute path (`/api/story/...`) or `null` if that single frame could not be extracted (the story then carries a `warnings` entry).

## Learning insights (5-Minute Revision, I Don't Understand)
All require auth and ownership. Computed on demand from the video's stored transcript, keywords and key moments (extractive, no external API). `422` = the video has no timestamped transcript yet.

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/learn/revision` | `{"video_ids": [1..5 ids]}` | `videos[]`, each with `must_remember`, `definitions`, `differences`, `formulas`, `confusions`, key timestamps and flashcards; empty categories stay empty |
| POST | `/api/learn/{video_id}/explain` | `{"timestamp": seconds}` | `simple_explanation`, `explain_like_10`, `exam_definition`, `real_life_example`, `related_concept`, `rewatch_range` |

## Video DNA (Harika's page, canonical data)
Auth + ownership. `422` if no timestamped transcript.

| Method | Path | Returns |
|---|---|---|
| GET | `/api/video-dna/{video_id}` | `video_id`, `filename`, `duration`, `total_sections`, `sections[]` (`id`, `title`, `topic`, `segment`, `timestamp`/`start`/`end` in **seconds**, `highlight`, `importance` high/medium/low, `importance_density` 0..1, `information_density` 0-100, `topics`), `topic_distribution[]` (`topic`, `mentions`, `share`) |

## Evidence Lens (Tejashwini's `evidence_service.py`)
`POST /api/videos/{video_id}/ask` with `{"question": "..."}` returns the original `answer` and `relevant_timestamps`, plus `evidence[]` (`start_time`, `end_time`, `text`, `score`, `strength` strong/moderate/weak, `matched_words`) and `insufficient_info`. When nothing in the transcript supports the question, `insufficient_info` is `true`, `evidence` is empty and no answer is invented.

## Memory Deck (Amrita)
Auth; cards are per user. Cards are built from a video's real key moments with the source timestamp.

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/memory-deck?due_only=true` | | cards (`prompt`, `answer`, `strength` strong/needs_review/forgotten, `video_id`, `source_start`, `source_end`, `next_review_at`) |
| POST | `/api/memory-deck/videos/{video_id}/generate` | | cards created for that video (201) |
| POST | `/api/memory-deck/{card_id}/review` | `{"strength": "..."}` | updated card |
| POST | `/api/memory-deck/{card_id}/explain` | `{"explanation": "..."}` | evaluation of the user's own explanation plus the source |

## Real-Time Video Workspace (Amrita)
Auth. Captures audio from a public live stream URL with FFmpeg, transcribes chunks with Whisper and keeps a rolling summary. Needs `yt-dlp` for YouTube links and outbound network access. Private/loopback hosts are rejected.

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/live-summaries` | `{"url": "..."}` | session (202); `status`, timestamped `transcript`, `short_summary`, `detailed_summary` |
| GET | `/api/live-summaries/{session_id}` | | current session state (poll) |
| POST | `/api/live-summaries/{session_id}/stop` | | stopped session |

## Time Machine, Daily, Version Comparison, Activity
All require auth; everything is scoped to the caller's own videos. Dates are the user's local day (`YYYY-MM-DD`).

| Method | Path | Notes |
|---|---|---|
| GET | `/api/timemachine/search?q=` | Ranked transcript passages across ALL processed videos: `video_id, filename, uploaded_at, last_opened_at, concept, start_time, end_time, text, context, score`. `422` for a blank query |
| GET | `/api/timemachine/topics` | `concepts[]` in the order first met (video upload date, then first mention), each with the videos + first timestamp that support it; `enough_data` is false until there are 2+ videos with keywords and 3+ concepts |
| PUT | `/api/activity/{video_id}` | `{position, duration?, opened?}` records where the viewer is (clamped to `duration`; reopening at 0:00 keeps the resume point). Sent by the video page |
| GET | `/api/activity/{video_id}` | `404` if never opened |
| POST | `/api/daily/generate` | `{minutes: 5-120, date}` -> `{plan, empty_reason}`. Builds a session from bookmarks, key moments, unfinished videos and a closing revision. `plan` is `null` with an explanation when there is nothing real to schedule. Regenerating the same day replaces it (progress resets) |
| GET | `/api/daily/today?date=` | The saved plan (`404` if none) |
| POST | `/api/daily/{plan_id}/start` | Marks the session started |
| PATCH | `/api/daily/{plan_id}/items/{item_id}` | `{completed: bool}` |
| GET | `/api/daily/history` | Last 14 plans with completion counts |
| POST | `/api/compare` | `{old_video_id, new_video_id}` -> items classified `new / removed / changed / unchanged`, each with old/new start+end, an explanation, plus `counts`, `similarity`, `verdict`, `method_note`. Same pair updates in place. `422` same video / no transcript / too little content, `409` not processed or failed, `404` unknown or not yours |
| GET | `/api/compare` / `/api/compare/{id}` / DELETE `/api/compare/{id}` | Saved comparisons |

## Error conventions
- `401` — missing/invalid/expired JWT
- `403` — authenticated but role/permission not sufficient
- `404` — resource doesn't exist, or exists but isn't owned by caller
- `400` — validation error (bad file format, bad timestamp range, etc.)
- `503` — a local model (Whisper/BART/NLLB) could not be loaded (e.g. weights not yet downloaded on this machine) — not an API-key issue, since none of this project's AI features use an external API
- `500` — unexpected server error (never includes a raw stack trace in
  the response body)
