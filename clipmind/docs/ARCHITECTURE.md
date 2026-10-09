# Architecture

## System diagram

```
┌────────────────────┐
│  React (Vite) SPA  │  src/pages/*.jsx, src/components/*
│  - ProtectedRoute   │  - localStorage authToken
│  - src/api.js        │  - single canonical fetch wrapper
└──────────┬──────────┘
           │  HTTPS/JSON, Authorization: Bearer <JWT>
           ▼
┌─────────────────────────────────────────────┐
│  FastAPI app (backend/app/main.py)           │
│  ┌─────────────────────────────────────────┐ │
│  │ app/api/routes/*  (auth, users, videos,  │ │
│  │   bookmarks, clips, analytics)           │ │
│  └───────────────┬─────────────────────────┘ │
│  ┌───────────────▼─────────────────────────┐ │
│  │ app/api/deps.py: get_current_user,       │ │
│  │   require_role()  — JWT decode + RBAC    │ │
│  └───────────────┬─────────────────────────┘ │
│  ┌───────────────▼─────────────────────────┐ │
│  │ app/services/*  business logic:          │ │
│  │  process_video, summary_service,         │ │
│  │  transcript_service, key_moments_service,│ │
│  │  highlight_service, keyword_service,     │ │
│  │  chapter_service, clip_service,          │ │
│  │  analytics_service, content_insights_    │ │
│  │  service, usage_service, pdf_service,    │ │
│  │  qa_service (local TF-IDF), translation_ │ │
│  │  service (local NLLB), model_manager     │ │
│  │  (centralized local model loading)       │ │
│  └───┬─────────────┬─────────────┬─────────┘ │
│      │             │             │            │
│  FFmpeg        Whisper       transformers     │
│  (subprocess)  (local)       (local BART +    │
│                                local NLLB)     │
│                                                │
│  app/db/database.py: Beanie/Motor init        │
└───────────────────┬───────────────────────────┘
                     ▼
              MongoDB (per-user videos, bookmarks,
              clips — all ownership-scoped)
                     │
                     ▼
       Local filesystem: uploaded_videos/, generated_clips/
```

## Layering rules actually enforced in this codebase

- **Routes** (`app/api/routes/`) only: parse/validate request data,
  call one or more services, shape the response. They do not contain
  FFmpeg/Whisper/model calls directly.
- **Services** (`app/services/`) contain all the actual business logic
  and are the only place external processes/models are invoked.
- **Models** (`app/models/`) are Beanie `Document`s — the MongoDB
  schema. **Schemas** (`app/schemas/`) are Pydantic request/response
  shapes — kept separate so the API contract can evolve independently
  of the storage shape.
- **Ownership is enforced at the service/route boundary**, not trusted
  from the client: every video/bookmark/clip lookup filters by
  `user_id == current_user.id` (or fetches then checks), so a valid
  JWT for user A can never read/modify user B's resources. This is
  covered by `test_video_upload.py::test_cross_user_ownership_enforced`
  and `test_bookmarks.py::test_bookmark_requires_owned_video`.
- **All AI is local, loaded through one place**: `app/services/
  model_manager.py` is the only file that loads Whisper/BART/NLLB
  model weights, caching each at module level. No service imports
  `openai` — that package isn't even a dependency of this project
  anymore (see `docs/AI_PIPELINE.md`).

## Request lifecycle example: video upload

1. `POST /api/videos/upload` (role-gated: Content Creator / Educator /
   Administrator) validates extension + size, saves the file to
   `UPLOAD_DIR`, creates a `Video` document (`status="uploaded"`).
2. A FastAPI `BackgroundTasks` job calls `process_video()`, which walks
   through audio extraction → transcription → summarization → key
   moments → highlights → keywords, saving progress to the `Video`
   document at each stage so the frontend can poll
   `GET /api/videos/{id}/status` and show real progress.
3. The frontend's `ProcessingStatus` page polls that endpoint; once
   `status="done"`, `Results` fetches transcript/summary/key
   moments/etc. and renders them, including the real video player.

## Frontend structure

```
frontend/src/
├── api.js              single fetch wrapper; every page imports from here
├── App.jsx              routes, wraps authenticated routes in ProtectedRoute
├── ProtectedRoute.jsx    redirects to /login if no authToken
├── components/
│   ├── Layout.jsx        shared shell (NavBar + page content)
│   ├── NavBar.jsx
│   └── VideoPlayer.jsx   real <video> element with seek API
└── pages/
    Login, Register, Dashboard, VideoUpload, UploadHistory,
    ProcessingStatus, Results, KeyMoments, Summary, Transcript,
    Keywords, Analytics, ContentInsights, UsageReports
```

`Results.jsx` is the main hub page: it pulls the current video's id
from `localStorage.currentVideoId` (set on upload/selection) and
renders the player, transcript, summary, key moments, highlights,
bookmarks, clip creation, Q&A, translation and PDF export together.
