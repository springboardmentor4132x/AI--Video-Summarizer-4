> **HISTORICAL SNAPSHOT -- NOT THE CURRENT STATE.**
> This file describes an earlier, smaller build (before Memory Deck, Real-Time
> Workspace, Video DNA, Evidence Lens, Educator/Administrator roles and the
> other 2.0 features were merged). Its test counts, route counts and PASS/COMPLETE
> labels belong to that build and have **not** been re-run on this one.
> For what is verified today, see `docs/VERIFICATION_REPORT.md` and
> `docs/REQUIREMENTS_STATUS.md`.

# Project Status

Status definitions used below:
- **COMPLETE** — implemented and verified working in this project's
  build sandbox (real test, real build, or real execution — see
  `docs/TESTING.md` for exactly what was run)
- **PARTIAL** — implemented but with a known gap or an unverified edge
  case
- **BLOCKED BY ENVIRONMENT** — implemented, and its non-model-dependent
  parts were verified, but full execution needs something this build
  sandbox didn't have (real model weight downloads, a GPU, real
  MongoDB) — expected to work normally elsewhere
- **NOT IMPLEMENTED** — not present

| Feature | Status | Implementation | Tested? |
|---|---|---|---|
| Project foundation / structure | COMPLETE | `backend/app/*`, `frontend/src/*` | App import + `npm run build` succeeded |
| Registration | COMPLETE | `app/api/routes/auth.py` | pytest: register, duplicate-email rejection |
| Login (JWT) | COMPLETE | `auth.py`, `core/security.py` | pytest: login, wrong-password rejection |
| Protected routes / token validation | COMPLETE | `api/deps.py::get_current_user` | pytest: missing/invalid token → 401 |
| RBAC (4 roles, applied to a real route) | COMPLETE | `core/roles.py`, `api/deps.py::require_role`, applied to video upload | pytest: Learner blocked (403), Content Creator allowed |
| Video upload + validation | COMPLETE | `api/routes/videos.py` | pytest: format/size rejection, valid upload accepted |
| Ownership enforcement (videos) | COMPLETE | filter by `user_id` everywhere | pytest: cross-user 404 |
| Ownership enforcement (bookmarks) | COMPLETE | fixed during this build — see below | pytest: unowned video rejected |
| FFmpeg audio extraction | COMPLETE | `process_video.py::extract_audio` | Ran for real against a real generated .mp4 in this sandbox |
| FFmpeg error handling | COMPLETE | `_ffmpeg_path()`, subprocess error propagation | Code path verified; failure-triggering scenario not separately forced |
| Whisper transcription | BLOCKED BY ENVIRONMENT | `process_video.py::transcribe_audio` | Model load attempted, blocked by sandbox network policy (HTTP 403) — code path is correct, needs normal internet access to actually run |
| Timestamped transcript segments | COMPLETE (code) / BLOCKED BY ENVIRONMENT (execution) | same as above | Same as above |
| Local summarization (BART, short+detailed) | COMPLETE (code, wired) / BLOCKED BY ENVIRONMENT (execution) | `summary_service.py`, loaded via centralized `model_manager.py` | OpenAI dependency removed and verified absent (`grep`); model download itself blocked in this sandbox's network policy the same way Whisper's was |
| Summary quality evaluation | NOT IMPLEMENTED | — | No ground-truth reference summaries available to score against; documented in `docs/MILESTONE_2.md` rather than faked |
| Key moments | COMPLETE | `key_moments_service.py`, local | Code reviewed, no external dependency; not exercised against a real transcript in this sandbox (needs real transcription first) |
| Highlights | COMPLETE | `highlight_service.py`, local | Same as above |
| Keywords | COMPLETE | `keyword_service.py`, local | Same as above |
| Chapters | COMPLETE | `chapter_service.py`, local | Same as above |
| Analytics (dashboard/video/usage/content-insights) | COMPLETE | computed from real DB queries, no hardcoded numbers | Code reviewed (`grep` confirms no hardcoded response values); not exercised against a populated real dataset in this sandbox |
| Real video player + seeking | COMPLETE | `components/VideoPlayer.jsx` | Frontend build succeeded; not manually clicked through in a browser in this sandbox |
| Transcript search | COMPLETE | client-side in `Transcript.jsx` | Same as above |
| Bookmarks (CRUD) | COMPLETE | `api/routes/bookmarks.py` | pytest: create/list/delete, ownership |
| Clip generation | COMPLETE | `clip_service.py` (stream-copy + re-encode fallback), `api/routes/clips.py` | **Actually run**: real FFmpeg stream-copy against a real generated video, produced a real playable 3.2s clip, confirmed via `ffprobe` — see `FINAL_VERIFICATION_REPORT.md` §6 |
| Video library / history / search-filter-sort | COMPLETE | `UploadHistory.jsx`, `/api/videos/history` | pytest: empty history endpoint; UI not manually exercised |
| Processing status | COMPLETE | real per-stage progress fields on `Video` | pytest touches `status`; full progression not observed (needs real model execution) |
| Multilingual translation | COMPLETE (code, fully local) / BLOCKED BY ENVIRONMENT (execution) | `translation_service.py` — NLLB-200 via `model_manager.py`, no OpenAI, no API key of any kind | NLLB weight download attempted and blocked by this sandbox's network policy (same as Whisper/BART); code path and language-code mapping reviewed and correct |
| PDF export | COMPLETE | `pdf_service.py` (fpdf2) | **Actually run**: generated a real PDF, verified as a valid PDF file and its extracted text confirmed to contain every expected section — see `FINAL_VERIFICATION_REPORT.md` §7 |
| Q&A | COMPLETE | `qa_service.py` — local TF-IDF retrieval + extractive answer, no OpenAI, no model download needed at all | **Actually run and passing**: 5 real pytest tests (`test_qa_service.py`), including a no-hallucination guarantee test |
| Full frontend–backend API contract | COMPLETE | single client `frontend/src/api.js`, no stale endpoints found | **Systematically verified**: all 27 frontend API calls extracted and matched 1:1 (path + method) against the real live OpenAPI route table — see `FINAL_VERIFICATION_REPORT.md` §8 |
| Docker Compose (mongo+backend+frontend) | COMPLETE (config) | `docker-compose.yml`, `docker/Dockerfile.*` | Written and reviewed; `docker compose up` itself was not run in this sandbox (no Docker daemon available there) |
| Automated backend tests | COMPLETE | `backend/tests/` (24 tests) | All 24 pass, real run |
| Centralized model manager | COMPLETE | `app/services/model_manager.py` — loads Whisper/BART/NLLB once, caches, auto-detects GPU | Code reviewed; import succeeds; actual model loads blocked by sandbox network policy same as above |
| Automated frontend tests | NOT IMPLEMENTED | — | Only `npm run build` / `npm run lint` exist; no Vitest/Playwright suite |
| Documentation set | COMPLETE | `README.md` + `docs/*.md` | — |

## Headline items from the original request

- **"Do not falsely claim OpenAI is our own AI."** Taken one step
  further per explicit follow-up instruction: **OpenAI has been
  removed from the application entirely**, not just made optional.
  Summarization, Q&A, and translation all run on local open-source
  models (BART, TF-IDF retrieval, NLLB-200 respectively). The `openai`
  package is no longer in `requirements.txt`, `OPENAI_API_KEY` no
  longer exists as a setting, and `grep` across the entire backend
  confirms zero functional OpenAI references remain — only comments
  documenting that fact. The app was successfully started and its
  full route table printed with no such variable set anywhere.
- **A real bug was found by the test suite and fixed**, not just
  described: bookmark creation didn't check video ownership; now it
  does, and a regression test guards it.
- **RBAC was applied to a real route**, not only demonstrated on
  example endpoints: video upload is role-gated, and this is tested.
- **Correction to a claim in the follow-up instructions**: the request
  that produced this update stated the previous ZIP's tests failed
  because `mongomock_motor` was missing from `requirements-dev.txt`.
  That wasn't the case — `requirements-dev.txt` already listed
  `mongomock-motor` and the 19-test suite was already passing in the
  previous build. This is noted here rather than silently "fixing" a
  problem that didn't exist, or pretending the previous status report
  was wrong when it wasn't.

## What would most improve this project next
1. Run it against real MongoDB + real model weights on a machine with
   normal internet access, and walk the full 29-step journey in
   `docs/TESTING.md` — see `FINAL_VERIFICATION_REPORT.md` for exactly
   what was and wasn't possible to verify in this build sandbox.
2. Add a frontend test suite.
3. Add a real summary-quality evaluation once labeled reference
   summaries exist.
4. Run `docker compose up` on a machine with Docker installed (not
   available in this build sandbox) to confirm the containerized setup.

See [`FINAL_VERIFICATION_REPORT.md`](FINAL_VERIFICATION_REPORT.md) for
the complete, itemized account of every check actually run in this
session, with real command output — not just this summary table.
