# Requirements status (honest checklist)

**Status: IMPLEMENTATION COMPLETE FOR THE FEATURES BELOW -- VERIFICATION LIMITED.**

This tree merges the canonical ClipMind project (the "Story + Daily + Time
Machine + Compare" version) with Amrita's Memory Deck / Real-Time Workspace /
UI, Harika's Video DNA and Tejashwini's Evidence Lens. The test counts quoted
in earlier versions of this file (backend 89, frontend 69) belong to the
pre-merge code and have **not** been re-run on this tree.

## What was actually run on the merged tree
- Python syntax check of all backend files and Babel parse of all frontend files.
- A static check that every relative import resolves and every `api.*` call exists.
- 44 pure-logic backend tests (no DB/HTTP): all passed, including the new
  Evidence Lens and Daily x Memory Deck tests.
- The Video DNA response format against a sample transcript.

## Features in the tree
| Feature | Source | Notes |
|---|---|---|
| Auth, roles, upload, FFmpeg + Whisper pipeline, transcript, summary, key moments, keywords, analytics, bookmarks, clips, chapters, translation, PDF export, Q&A | canonical | |
| Story (4 modes, real frames, Watch seeks) | canonical | |
| Memory Deck | Amrita | built from real key moments; Daily schedules weak cards |
| Real-Time Workspace | Amrita | real FFmpeg + Whisper chunking; needs network, yt-dlp |
| Video DNA | Harika's page | endpoint rewritten to compute from canonical data |
| Evidence Lens | Tejashwini | extends `/ask`; "no evidence found" state |
| 5-Minute Revision, I Don't Understand | canonical | extractive |
| Daily, Time Machine, Version Comparison | canonical | lexical comparison, stated in the UI |
| Light / Dark theme | canonical | teammates' CSS mapped onto theme tokens |

Duplicate canonical Video DNA / Evidence routes (`/api/learn/*/dna`,
`/evidence`) and the old `/insights` page were removed; `/insights` URLs
redirect to `/revision`.

## Not built
- Optional Learning Map, Knowledge Graph, Narrative Arc.
- Administrator tooling (user/role management, audit logs, monitoring,
  platform settings) and Educator tooling (transcript editing, sharing,
  classroom analytics): not present in any supplied project.

## NOT VERIFIED (needs a real environment)
- Backend `pytest` against the database fixtures (needs `mongomock-motor`,
  `httpx`, Beanie), including `test_memory_deck.py` and `test_live_summaries.py`.
- Frontend `npm test`, `npm run lint`, `npm run build`.
- Real Whisper transcription, a real MongoDB server and the upload -> process ->
  summary pipeline end to end.
- Real-Time Workspace against a live stream (network, yt-dlp, FFmpeg).
- Visual rendering: light/dark contrast and mobile layout were never seen on a
  screen. Amrita's live workspace is a dark panel by design.
- The full user journey (register -> ... -> logout -> persistence).
