# Milestone 1 — Project Foundation, Auth, RBAC, Upload, FFmpeg

## Project foundation
- `backend/app/`: `api/` (routes), `core/` (config, security, roles),
  `db/` (Beanie/Motor init), `models/`, `schemas/`, `services/`
- `frontend/src/`: `pages/`, `components/`, `api.js`
- Config via `.env` / `Settings` (pydantic-settings) — `SECRET_KEY`
  required with no insecure default; everything else has a sane
  default (see `.env.example`)

## Authentication
- `POST /api/auth/register` — bcrypt-hashed password, duplicate-email
  rejected (400)
- `POST /api/auth/login` — OAuth2 password flow, returns a JWT
  (`ACCESS_TOKEN_EXPIRE_MINUTES`, default 60)
- `GET /api/users/me` — requires valid Bearer token
- Invalid/expired token → 401 (verified by
  `tests/test_auth.py::test_invalid_token_rejected`)
- Logout is client-side (clears `authToken`/`currentUser` from
  `localStorage` in `api.js`'s `logout()`), consistent with a
  stateless-JWT design — there's no server-side session to invalidate.

## RBAC
Four roles: `content_creator`, `learner`, `educator`, `administrator`
(`app/core/roles.py`). `app/api/deps.py::require_role(*roles)` is a
dependency factory that 403s if the current user's role isn't in the
allowed set.

**Applied to a real route, not just demonstrated:**
`POST /api/videos/upload` requires `content_creator`, `educator`, or
`administrator` — Learner is a consumer role and is rejected with 403
(`tests/test_rbac.py::test_learner_cannot_upload_video`). Four example
routes under `/api/users/*-only-example` also demonstrate the
mechanism for each role individually.

Ownership (a *different*, complementary check from role) is enforced
separately and universally: every video/bookmark/clip lookup filters
by the caller's user id, regardless of role.

## Video upload
- `POST /api/videos/upload`, multipart `file`
- Extension allowlist + size limit (`MAX_UPLOAD_SIZE_MB`) validated
  before saving
- Secure filename handling: original filename is not trusted for the
  on-disk path (UUID/id-based storage path)
- `Video` document created with `status="uploaded"`, then a background
  task drives it through `processing` → `done`/`failed`
- `GET /api/videos/history` — caller's own uploads
- `GET /api/videos/{id}/status` — processing status + per-stage
  progress percentages

## FFmpeg
- `app/services/process_video.py::_ffmpeg_path()` locates the `ffmpeg`
  binary (PATH, with a Windows WinGet fallback) and raises a clear
  `FileNotFoundError` if it isn't installed, rather than failing deep
  inside a subprocess call with an opaque error
- `extract_audio()` runs a real `ffmpeg` subprocess (verified in this
  project's sandbox against a real generated `.mp4` — see
  `docs/TESTING.md`), converts to 16 kHz mono WAV for Whisper
- Errors (`subprocess.CalledProcessError`) propagate up and are caught
  in `process_video()`, marking the video `status="failed"` with the
  real ffmpeg stderr as `error_message`
