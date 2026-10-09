# Testing

This document lists exactly what was actually executed while building
this repository (in the sandbox this project was assembled in), and
what needs to be run on your own machine because it needs real
MongoDB, real model weights, or unrestricted internet access that
sandbox didn't have.

## What was actually run and passed, in this project's build sandbox

**Backend, static:**
```
find app -name "*.py" | xargs -n1 python3 -m py_compile   → all files compiled
```

**Backend, real app import:**
```python
from app.main import app
app.openapi()   # succeeded, produced the real route table in docs/API.md
```
This is a genuine check: if any router, model, or service had a broken
import, this would have raised.

**Backend, real automated tests (pytest + mongomock-motor, an
in-memory MongoDB stand-in — real Beanie models, real FastAPI routes,
real JWT/bcrypt, only the DB driver is swapped):**
```
cd backend && pip install -r requirements-dev.txt && pytest tests/ -v
→ 24 passed
```
Covers: register, login, wrong-password rejection, duplicate-email
rejection, missing/invalid token rejection, authenticated `/me`, video
upload format/size validation, upload requiring auth, empty history
for a new user, 404 for a nonexistent video, **cross-user ownership
enforcement** (user B cannot see user A's video), bookmark
create/list/delete, **bookmark creation rejecting an unowned/
nonexistent video** (a real bug this test suite found — see below),
**RBAC** (`learner` blocked from uploading with 403, `content_
creator` allowed, the example role-gated routes behaving correctly),
and **the local Q&A retrieval logic itself** (`test_qa_service.py`, 5
tests — this one needs no model download at all, since TF-IDF has no
pretrained weights, so it's fully exercised for real, including a
no-hallucination guarantee test).

**A real bug this test suite found and that was then fixed:**
`POST /api/bookmarks` originally created a bookmark for any
`video_id` string without checking it existed or belonged to the
caller. `test_bookmarks.py::test_bookmark_requires_owned_video` failed
against the original code (`201` instead of the expected `404`); the
route was fixed to look up the video and check ownership first, and
the test now passes. This is the kind of real, verified fix — not just
a code review comment — this project asked for.

**Backend, real FFmpeg (not mocked):**
```
ffmpeg -f lavfi -i testsrc... -f lavfi -i sine...  test_real.mp4   # generated
extract_audio('test_real.mp4')                                     # ran the real subprocess
→ produced a real 16kHz mono WAV, correct byte size for 3s of audio
```

**Frontend, real build:**
```
cd frontend && npm install && npm run build
→ 44 modules transformed, built successfully
npm run lint (eslint)
→ 0 problems
```
One real bug found and fixed this way: pages imported `../api`, but
`api.js` had been placed at `src/services/api.js` during assembly —
the build failed with a module-not-found error until `api.js` was
moved to `src/api.js`.

## What was NOT run in that sandbox, and why

- **Real Whisper transcription, real BART summarization, and real
  NLLB translation.** All three need to download model weights (from
  the Whisper release / Hugging Face) on first use, and the sandbox
  this project was built in has network access restricted to a small
  package-registry allowlist (pypi.org, npmjs.org, github.com, etc.)
  that does not include those download hosts. Loading the Whisper
  `base` model and the NLLB tokenizer were both attempted directly and
  both failed with a connection error from that network policy — a
  real, observed failure, not an assumption. **On a normal developer
  machine or server with normal internet access, this works** — only
  this specific build sandbox's network policy blocks it. The local
  Q&A logic (`qa_service.py`) is the one AI feature that needed no
  such download and so **was** fully tested for real (see above).
- **A real MongoDB instance.** Tests use `mongomock-motor` instead
  (see above) — this validates real application code but not MongoDB
  driver edge cases (e.g. real index creation, real Atlas-specific
  behavior). Running `docker compose up mongodb` and re-running the
  same `pytest` suite against `MONGO_URI=mongodb://localhost:27017`
  (removing the mongomock patch in `conftest.py`) would close this
  gap.
- **The 29-step full end-to-end user journey** (register → upload a
  real video → wait for real transcription/summarization/key moments →
  play → search transcript → bookmark → clip → ask Q&A → translate →
  export PDF → check analytics → logout/login → verify persistence)
  requires real Whisper/BART/NLLB model weights + ideally real MongoDB
  and was therefore not run end-to-end in this sandbox. Every *segment*
  of that journey that doesn't require model weights (auth, upload
  validation, ownership, RBAC, bookmarks, and the local Q&A retrieval
  logic itself) **was** exercised, as detailed above.
- **Frontend component/E2E tests.** None exist in this repository yet
  — only build + lint were run. Adding Vitest/React Testing Library or
  Playwright is a reasonable next step, not currently implemented.

## How to run the full, real thing yourself

```bash
# 1. Start MongoDB
docker run -d -p 27017:27017 --name clipmind-mongo mongo:7

# 2. Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # set a real SECRET_KEY
uvicorn app.main:app --reload
# first request that needs Whisper/BART/NLLB will download the model
# weights (~5-6GB total combined) - this needs real internet access once.

# 3. Frontend
cd frontend
npm install
cp .env.example .env
npm run dev

# 4. Walk through: register → login → upload a real short video →
#    watch ProcessingStatus reach "done" → open Results → play the
#    video → search the transcript → bookmark a moment → create a
#    clip → ask a question (fully local, no key needed) → translate
#    (fully local, no key needed) → export PDF → check Analytics/Dashboard →
#    logout → log back in → confirm the video is still there.
```

## Re-running the automated suite

```bash
cd backend
pip install -r requirements-dev.txt
pytest tests/ -v
```

## ClipMind Story + theme
- `backend/tests/test_story.py` — panel-selection logic plus the `/api/story`
  routes end-to-end (auth, ownership, every error state, regeneration,
  delete, path-traversal) using a **real MP4 generated with FFmpeg**, so
  frame extraction is exercised for real.
- `frontend/src/test/` (`cd frontend && npm test`, Vitest + Testing
  Library) — theme persistence, the Story page (modes, generate, loading
  stages, errors, Watch-This-Moment navigation) and player seeking via
  `/video/:id?t=`.

## Time Machine, Daily, Comparison
- `backend/tests/test_history_features.py`: search ranking and word forms,
  learning-order topic evolution, daily-plan budget/grounding/overlap/empty
  states, comparison classification and timestamps, and every API route
  including ownership, validation and regeneration.
- `frontend/src/test/History.test.jsx`: the three pages (including error and
  empty states, Watch navigation to the right video + second) and playback
  tracking from the video page.
