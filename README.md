# ClipMind AI — AI Video Summarization & Key Moments Detection Platform

ClipMind AI turns an uploaded video into a searchable, navigable set of
insights: a timestamped transcript, a short and a detailed summary, key
moments, highlights, keywords, chapters, bookmarks, downloadable clips,
transcript-grounded Q&A, multilingual translation, a PDF report, and
usage analytics.

> **Honesty note on this README:** every claim below about what works
> was checked by actually running the code in this repository (real
> `pytest` runs, a real `npm run build`, a real FastAPI app import with
> its live route table, and a real end-to-end HTTP flow against an
> in-memory database). Anything that could **not** be verified in the
> sandbox this was built in — because it needs real MongoDB, real model
> weights, or a GPU — is called out explicitly rather than assumed to
> work. See [`PROJECT_STATUS.md`](PROJECT_STATUS.md) and
> [`docs/TESTING.md`](docs/TESTING.md) for the full, itemized picture.

## 1. Features

**Core pipeline (Milestones 1–3)**
- Email/password auth with JWT, role-based access control (Content
  Creator / Learner / Educator / Administrator)
- Video upload with format/size validation, per-user ownership
- FFmpeg audio extraction, Whisper speech-to-text with timestamped
  segments
- **Locally-run** summarization (short + detailed, genuinely
  different) via `facebook/bart-large-cnn` — no OpenAI key required
- Key moment detection, highlight generation, keyword extraction,
  chapter generation — all local/rule-based, no external API
- Per-video and dashboard analytics, content insights, usage reports —
  computed from real stored data, not hardcoded

**Additional features**
- Real video playback with timestamp/chapter/key-moment/highlight
  seeking
- Transcript search with jump-to-timestamp
- Bookmarks (create/update/delete, per-user, owned-video only)
- Clip generation (FFmpeg stream-copy with re-encode fallback) and
  download
- Video library: search, filter, sort, processing status, history
- Multilingual summary translation (Telugu, Hindi, Tamil, Kannada,
  Malayalam, Bengali)
- PDF export of the full report (Unicode-aware)
- Transcript-grounded Q&A with "insufficient information" fallback
  instead of hallucinated answers
- **ClipMind Story** — turn a processed video into a Comic, Storybook,
  Study Notes or Storyboard made of real frames + transcript text, each
  panel jumping back to its exact moment (see section 11)
- **Light / Dark theme** with a persisted choice, applied app-wide

## 2. Architecture

```
React (Vite) frontend
        │  fetch, JWT bearer token
        ▼
FastAPI REST API  ──►  Auth / RBAC (JWT, role + ownership checks)
        │
        ▼
Business services (transcript, summary, key moments, highlights,
keywords, chapters, bookmarks, clips, analytics, PDF, Q&A, translation)
        │
        ▼
FFmpeg (audio/clip) + Whisper (transcription) + local BART model
(summarization)  +  optional OpenAI client (Q&A / translation only)
        │
        ▼
MongoDB (Beanie ODM) + local filesystem (uploaded_videos/,
generated_clips/)
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and
[`docs/AI_PIPELINE.md`](docs/AI_PIPELINE.md) for the full breakdown,
and [`docs/API.md`](docs/API.md) for every endpoint.

## 3. Folder structure

```
ClipMind-AI/
├── backend/            FastAPI app (app/), tests/, requirements*.txt, .env.example
├── frontend/            React (Vite) app (src/), .env.example
├── docker/               Dockerfile.backend, Dockerfile.frontend
├── docker-compose.yml    mongo + backend + frontend
├── docs/                 Architecture, API, database, AI pipeline, milestones, testing, etc.
└── PROJECT_STATUS.md     Feature-by-feature status, honestly labeled
```

## 4. Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router 7 |
| Backend | FastAPI, Beanie (MongoDB ODM) / Motor |
| Auth | JWT (python-jose), bcrypt password hashing |
| Transcription | OpenAI Whisper (local, `base` model by default) |
| Summarization | Hugging Face `facebook/bart-large-cnn` (local, no API key) |
| Video/audio | FFmpeg |
| PDF export | fpdf2 |
| Optional cloud AI | None — no cloud AI dependency of any kind |
| Database | MongoDB |

## 5. Why every AI feature is local — and what was fixed

An earlier version of this project's summarization, Q&A, and
translation all called OpenAI (`gpt-4o-mini`) directly, even though a
working local `facebook/bart-large-cnn` implementation already existed
for summarization but was never wired in. **OpenAI has since been
removed from the application entirely** — not just made optional.

| Feature | Now runs on |
|---|---|
| Transcription | Whisper (local, `openai-whisper` package — the name refers to the open-source model, not a cloud API) |
| Summarization | `facebook/bart-large-cnn` (local, via `transformers`) |
| Q&A | TF-IDF retrieval + extractive answer (local, `scikit-learn`, no model download needed) |
| Translation | `facebook/nllb-200-distilled-600M` (local, via `transformers`) |

There is no `OPENAI_API_KEY` setting, no `openai` package in
`requirements.txt`, and no import of `openai` anywhere in the runtime
code — verified with `grep -rn "openai" backend/app --include="*.py"`,
which returns only comments documenting its absence. See
[`docs/AI_PIPELINE.md`](docs/AI_PIPELINE.md) for how each local model
works, including how the local Q&A avoids hallucination by
construction (its answer can only ever contain text literally present
in the transcript).

## 6. Installation

### Prerequisites
- Python 3.11+
- Node.js 20+
- MongoDB 6/7 (local install or Docker)
- FFmpeg on PATH
- ~3 GB free disk for the Whisper + BART model weights (downloaded on
  first use from Hugging Face / OpenAI's Whisper release, so the
  machine running the backend needs outbound internet access the
  first time each model is used)

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# edit .env: set SECRET_KEY, MONGO_URI, etc.
uvicorn app.main:app --reload
```
API docs (Swagger UI) at `http://127.0.0.1:8000/docs`.

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# edit .env if the backend isn't at http://127.0.0.1:8000
npm run dev
```
App at `http://127.0.0.1:5173`.

### MongoDB
```bash
# Docker (simplest):
docker run -d -p 27017:27017 --name clipmind-mongo mongo:7
# or install MongoDB Community Server locally and run `mongod`.
```

### Docker Compose (mongo + backend + frontend together)
```bash
cp backend/.env.example backend/.env   # fill in SECRET_KEY at minimum
docker compose up --build
```
See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for details and
troubleshooting.

## 7. Running tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest tests/ -v
```
These 24 tests run against an **in-memory** MongoDB
(`mongomock-motor`), so they need no real database, network access, or
model weights — they exercise real auth, real ownership checks, real
route wiring, and (for `test_qa_service.py`) the actual local Q&A
retrieval logic with no mocking at all, since TF-IDF needs no
pretrained weights. See [`docs/TESTING.md`](docs/TESTING.md) for what
this does and does not cover, and exactly what was run in this
project's sandbox vs. what needs your machine.

```bash
cd frontend
npm run lint
npm run build
```

## 8. Known limitations

- Whisper/BART/NLLB model weights are downloaded from Hugging Face /
  the Whisper release on first use — the backend host needs outbound
  internet access at least once, or you can pre-download the weights
  and set `HF_HOME` / Whisper's cache dir accordingly for a fully
  offline deployment afterward. (~2.4 GB extra for NLLB-200 on top of
  Whisper + BART.)
- Local Q&A is extractive (returns the relevant transcript excerpt,
  not a generatively paraphrased answer) — this is a deliberate
  trade-off to guarantee no hallucination without needing a local
  generative LLM; see `docs/AI_PIPELINE.md`.
- No automated frontend test suite (component/E2E) exists yet —
  `npm run build` and `npm run lint` are the current frontend checks.
- Full real-video, real-Whisper, real-BART, real-NLLB end-to-end
  processing was **not** exercised in the sandbox this project was
  assembled in (outbound network there is restricted to a small
  package-registry allowlist that excludes Hugging Face). FFmpeg audio
  extraction itself **was** verified against a real generated video
  file, and the local Q&A retrieval logic **was** verified with real
  passing tests (it needs no model download). See `PROJECT_STATUS.md`.

## 9. Milestones

- [`docs/MILESTONE_1.md`](docs/MILESTONE_1.md) — foundation, auth, RBAC, upload, FFmpeg
- [`docs/MILESTONE_2.md`](docs/MILESTONE_2.md) — transcription, summarization
- [`docs/MILESTONE_3.md`](docs/MILESTONE_3.md) — key moments, highlights, keywords, chapters, analytics
- [`docs/ADDITIONAL_FEATURES.md`](docs/ADDITIONAL_FEATURES.md) — player, bookmarks, clips, Q&A, translation, PDF, library

## 10. Team

See [`docs/TEAM_CONTRIBUTIONS.md`](docs/TEAM_CONTRIBUTIONS.md) —
written from what's actually present in each contributor's branch,
with anything uncertain labeled as such rather than assumed.

## 11. ClipMind Story and Light/Dark theme

### What ClipMind Story does
Open a processed video, choose a mode, press **Generate Story**, and get
a set of panels. Every panel has a **real frame extracted from your
video**, a title, the concept, a caption, the transcript excerpt it came
from, its timestamp, and a **Watch This Moment** button that opens the
original video at that exact second.

| Mode | Look |
|---|---|
| Comic | Ink-outlined panels with speech-bubble captions; first panel runs full width |
| Storybook | Large facing pages, serif narration, "Page n of N" |
| Study Notes | Concept + key point + transcript quote per row |
| Storyboard | Letterboxed film frames with shot number, timecodes and shot length |

Open it from: the **ClipMind Story card** on a processed video's page,
the **ClipMind Story** button in the Video Library, the Dashboard card,
or the **Story** link in the navbar.

### How a story is generated (no new AI model, no API key)
Everything comes from data the existing pipeline already produced for
that video (`backend/app/services/story_service.py`):
1. Group the Whisper transcript segments into "scenes".
2. Score each scene by how many of the video's own **keywords** it
   contains, the **importance** of any overlapping key moment, and how
   much is actually said (filler is ignored).
3. Split the video timeline into N equal buckets and keep the best scene
   of each, so the story covers the *whole* video in order. Short videos
   simply get fewer panels.
4. Derive title / concept / caption / excerpt from the scene's own text,
   formatted for the mode. Nothing is invented: captions are transcript
   sentences.

Honest limitation: because it is extractive, titles are short phrases
taken from the transcript, not abstractive AI headlines.

### Timestamps and video seeking
A panel's `timestamp` is the start of its scene. **Watch This Moment**
navigates to `/video/<videoId>?t=<seconds>`; the video page loads that
video and the player seeks to `t` as soon as its metadata is ready (then
plays, and scrolls into view). The same `/video/:id` route works for any
shared link. The older `/results` page (which uses the stored current
video) is unchanged.

### Frame extraction
`backend/app/services/frame_service.py` reuses the project's existing
FFmpeg discovery (`clip_service._ffmpeg_path`) and writes one JPEG per
panel to `UPLOAD_DIR/story_frames/<video_id>/<mode>/`. If the exact
timestamp yields nothing it retries slightly earlier. A single failed
frame becomes a placeholder + a warning; if none can be extracted the API
returns a clear error. Frames are served only to the owner through an
authenticated route.

### Endpoints
`POST /api/story/generate/{video_id}`, `GET /api/story/{video_id}`,
`GET /api/story/{video_id}/panels`, `DELETE /api/story/{video_id}`,
`GET /api/story/{video_id}/frames/{mode}/{filename}` — details in
[`docs/API.md`](docs/API.md). Stories are stored in the new `stories`
MongoDB collection (one per user + video + mode).

### Environment variables
**None new.** Story uses the existing `SECRET_KEY`, `MONGO_URI`,
`MONGO_DB_NAME`, `UPLOAD_DIR`, and needs **FFmpeg on PATH** (already
required by the rest of the app).

### Light / Dark theme
A ☀ Light / 🌙 Dark switch sits in the navbar and on the login/register
pages. The choice is saved in `localStorage` (`clipmind-theme`), applied
as `<html data-theme="light|dark">` by a tiny script in `index.html`
*before* first paint (no flash on refresh), and falls back to the OS
preference until the user chooses. All colors are CSS variables
(`--background`, `--foreground`, `--card`, `--border`, `--primary`,
`--muted`, `--input`, `--accent`, plus the app's existing tokens) with
the dark palette defined once in `index.css` / `app.css`. The Dashboard
and Upload pages, which used hardcoded light-only colors, now use the
same tokens.

### How to run and test it
```bash
# backend (FFmpeg and MongoDB must be available)
cd backend && uvicorn app.main:app --reload
# frontend
cd frontend && npm install && npm run dev      # http://localhost:5173
```
1. Log in, upload a video and wait until processing is `done`.
2. Video Library → **ClipMind Story** → pick **Comic** → **Generate Story**.
3. Check frames/timestamps, click **Watch This Moment** → the video opens
   and jumps to that second. Repeat for the other three modes.
4. Toggle Dark, refresh — it stays Dark. Toggle Light, refresh — it stays Light.

Automated: `cd backend && pytest tests/test_story.py` (real FFmpeg on a
generated video) and `cd frontend && npm test`.

### Limitations
- Extractive, not generative: no AI-drawn images, titles are transcript phrases.
- Generation is synchronous (a few seconds for ~6–8 panels); very long
  videos still produce at most 12 panels.
- Only the video's own transcript is used, so story quality follows
  Whisper transcript quality.

## 12. Learning features (ClipMind 2.0)

Everything below is built from a video's own stored transcript, keywords and
key moments, and every result links back to the exact moment via
`/video/:id?t=SECONDS`. If the transcript doesn't support something, the
feature says so instead of inventing it.

| Feature | Route | Source |
|---|---|---|
| Story (comic / storybook / study notes / storyboard) | `/story` | canonical |
| Memory Deck (Strong / Needs Review / Forgotten, explain-it-yourself) | `/memory-deck` | Amrita |
| Video DNA (structure, topic distribution, density, clickable timeline) | `/video-dna/:videoId` | Harika (page), backend rewritten for canonical data |
| Evidence Lens (answer + transcript evidence + Watch) | `/evidence/:videoId`, also the Ask box on a video | Tejashwini |
| 5-Minute Revision | `/revision/:videoId` | canonical |
| I Don't Understand (video page, under the player) | on `/video/:id` | canonical |
| Daily (also schedules your Forgotten / Needs Review cards) | `/daily` | canonical + Memory Deck |
| Time Machine, Version Comparison | `/timemachine`, `/compare` | canonical |
| Real-Time Workspace (live transcript + rolling summary) | `/live-summaries` | Amrita |

Real-Time Workspace needs FFmpeg, Whisper and, for YouTube links, `yt-dlp`
plus network access. Streams that require sign-in can use a private cookie
export via `YOUTUBE_COOKIES_FILE` (never commit it).

Limitation: Revision, "I Don't Understand" and Video DNA are extractive.
"Explain like I'm 10" is a shortened restatement of the transcript, not a
rewrite in simpler words; that would need a generative model.
Tests: `backend/tests/test_learn.py`, `test_evidence_lens.py`,
`test_memory_deck.py`, `test_live_summaries.py`, `test_daily_memory.py`;
frontend `Revision`, `Evidence`, `VideoDNA` tests.

## 13. Time Machine, ClipMind Daily and Version Comparison

None of these need new environment variables or API keys.

**Time Machine** (`/timemachine`) searches every processed video you own and
returns the matching transcript passage with its video, upload date and a
Watch button that opens that video at that second. Matching is by word
(with simple plural/-ing handling), weighted so rarer words count more.
*Topic evolution* lists the stored keywords in the order you met them (video
upload date, then first mention); selecting one searches it. It only appears
when there are 2+ processed videos with keywords. "Date" is the upload date;
there is no separate "watched on" date beyond `last opened`.

**ClipMind Daily** (`/daily`) builds a session for the minutes you choose
(5-120) from your own data: bookmarks, key moments, videos you started but
didn't finish, and a closing quick-revision step if the chosen videos have
revisable content. "Started but not finished" comes from playback tracking:
the video page reports your position (`PUT /api/activity/{id}`) when it opens,
every 15 seconds and when you leave. Items open at their timestamp, can be
ticked off (saved), and the plan is stored per day. If you have little
material it says so rather than padding the plan. Plans use your local date.
The Memory Deck is a separate teammate feature that is not in this codebase
yet, so weak flashcards are not part of the plan; once it exists,
`build_daily_items` is the one place to add them.

**Version Comparison** (`/compare`, `/compare/:id`) compares two of your
videos by matching transcript sentences (TF-IDF cosine similarity) and labels
each point New, Removed, Changed (with what changed: added/removed wording and
changed numbers) or Unchanged, with timestamps for the old and new video.
Limitation: this is lexical. A point that was completely reworded appears as
one Removed plus one New rather than Changed, and the page says so.

New collections: `video_activity`, `daily_plans`, `video_comparisons`.
Tests: `backend/tests/test_history_features.py`,
`frontend/src/test/History.test.jsx`.
