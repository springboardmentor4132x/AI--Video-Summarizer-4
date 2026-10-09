# Requirements status (honest checklist)

**Status: IMPLEMENTATION COMPLETE -- BACKEND / DATABASE / AI RUNTIME NOT VERIFIED.**

The frontend was built and driven in a real browser. The Python backend,
MongoDB and the AI models could not be started in the environment where this
was assembled (no network, no installable packages -- see
`docs/VERIFICATION_REPORT.md`). Run the commands in the README on a normal
machine before relying on those parts.

Earlier versions of this file quoted test counts (backend 89, frontend 69).
Those belonged to older code and are **not** claimed here.

## Verified (actually executed)
- Production bundle of the whole frontend (esbuild): all 58 source files and every CSS file resolve and compile.
- 65 real-browser checks (headless Chromium) of the built frontend, including role gating, the Admin and Educator workflows, sharing -> student viewing -> educator engagement, transcript editing, Video DNA and Evidence Lens seeking a real `<video>`, dark/light persistence and mobile layout. These ran against a stand-in API (see the report), so they prove the **frontend and the API contract**, not the server.
- 54 pure-logic backend tests (Evidence Lens, Video DNA mapping, Daily x Memory Deck, role/safety rules, transcript-edit rules, engagement maths, SECRET_KEY guard, revision/explain logic).
- Python syntax of every backend file; import/API-call resolution of every frontend file.
- **ESLint with the project's own config: exit 0, no warnings** (after fixing 6 genuine errors it found in new code).

## Written but NOT executed
- 49 existing database/HTTP backend tests and the new `test_roles_api.py` (need `mongomock-motor`, `httpx`, Beanie, bcrypt).
- `test_memory_deck.py`, `test_live_summaries.py`.
- All vitest suites and `npm run build` (Vite itself; the bundle above used esbuild, which is **not** the same thing).
- Real Whisper / summarisation / FFmpeg pipeline on an uploaded video, real MongoDB persistence and user isolation against a real database.
- Real-Time Workspace against a live stream (needs network, yt-dlp, FFmpeg, Whisper).
- Memory Deck, Story and the other features that need the database were not run in the browser.

## Features in the tree
| Area | Feature | Notes |
|---|---|---|
| Auth | register, login, JWT, protected routes | **registration can no longer create an administrator** (this was an open privilege escalation); disabled accounts are blocked |
| Roles | Learner, Content Creator, Educator, Administrator | server-enforced; see README section 11b |
| Videos | upload, validation, FFmpeg + Whisper pipeline, transcript, summary, key moments, keywords, chapters, analytics, bookmarks, clips, Q&A, translation, PDF | canonical |
| Videos | transcript **editing**, owner **delete** (cascade) | new; spec: "Transcript editing", "Manage uploaded videos" |
| Educator | dashboard, share with students, real engagement | new |
| Administrator | users and roles, enable/disable, all content + delete, processing, statistics, audit log | new |
| 2.0 | Story, Memory Deck, Daily, Time Machine, Version Comparison, I Don't Understand, 5-Minute Revision | Daily also schedules weak Memory Deck cards |
| 2.0 | Video DNA (Harika), Evidence Lens (Tejashwini), Real-Time Workspace + Memory Deck (Amrita) | integrated, see TEAM_CONTRIBUTIONS |
| UI | light/dark theme, grouped navigation, mobile menu | |

## Not built (reasons)
- Learning Map, Knowledge Graph, Narrative Arc: optional in the 2.0 document and not present in any supplied project. Building them without being able to run the backend would risk fake output, so they are not exposed.
- Platform settings page: no configurable platform settings exist yet.
- "Explain like I'm 10", revision and Video DNA are extractive (selected transcript text), not generative rewrites.
- After a transcript edit the summary, key moments and flashcards are not regenerated automatically; the UI says so.
- Shared students get read-only access to the player, summary, transcript, key moments and Q&A; their own Story/Memory Deck/DNA work only on videos they own.
