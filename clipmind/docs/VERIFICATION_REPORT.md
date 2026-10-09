# Verification report

What was run, where, and what each result does and does not prove.

## Environment limits (external blockers)
| Blocker | Evidence |
|---|---|
| No network | every outbound host returned `403 x-deny-reason: host_not_allowed` (pypi.org, registry.npmjs.org, files.pythonhosted.org, github.com, huggingface.co) |
| FastAPI / Beanie / Motor / pydantic not installable | only Windows builds were bundled in the supplied ZIPs; pydantic's Rust core is a Windows `.pyd` |
| No MongoDB server or mongomock | none on the machine |
| No Whisper / PyTorch / model weights | not installed, no network to fetch them |
| Vite cannot run | needs a native binary not present for Linux |

Available and used: FFmpeg 6.1, OpenCV, scikit-learn, esbuild 0.27, Playwright 1.56 with Chromium.

## 1. Frontend production bundle (esbuild)
`esbuild src/main.jsx --bundle --minify` produced a 417 KB script and 60 KB stylesheet from 58 source files with no unresolved import. This stands in for `npm run build`; it does not run ESLint.

## 1b. ESLint (real, with the project's config)
`node node_modules/eslint/bin/eslint.js .` using the repository's own `eslint.config.js` (ESLint 10 with react-hooks and react-refresh rules) initially reported **6 errors in 3 files, all in newly added or ported code**: a hook with a non-literal dependency list and setState inside effects (`AdminDashboard.jsx`, `VideoDNA.jsx`), and unused imports/variables (`Revision.jsx`, `VideoDNA.jsx`). They were fixed by restructuring (derived loading state, no rule suppression), after which it exits **0 with no warnings**. The browser suite below was rerun after those changes and still passes.

## 2. Real-browser run: 65 checks, all passing (last run, after the lint fixes)
Headless Chromium drove the built bundle against a **stand-in API server** that implements the same routes, response shapes and role rules as the backend and runs the **real** project modules for Evidence Lens, Video DNA mapping, transcript editing, admin rules and engagement maths. Its database is an in-memory dict and the test video is a generated 60-second WebM, so:
- proves: the UI, routing, role gating, error/empty states, `<video>` seeking, theme persistence, mobile layout, and that the frontend matches the API contract;
- does **not** prove: the FastAPI code, MongoDB queries, bcrypt/JWT handling, or real transcription.

Checks included: registration offers no administrator role; a learner with a tampered `localStorage` is still shown "Access denied" and gets 403 from the API; admin role change, own-role refusal and audit entry; educator share (unknown and ineligible emails reported), a student watching a shared video making the educator see "1 of 1 opened"; transcript edit keeps timestamps and persists; Video DNA section click and Evidence "Watch evidence" move the real player; an unanswerable question shows "No evidence found"; dark theme persists after reload; no sideways scroll at 390 px; the mobile menu.

Bugs this run found and fixed: Video DNA showed `--:--`/raw seconds for timestamps (and treated 0 as missing); a tall unusable mobile navigation; a style key that did not exist; activity recording rejected shared students (so engagement would always have been empty); `Optional` not imported in two modules; CSS class collisions between the old Insights styles and Evidence Lens.

## 3. Backend
54 pure-logic tests pass. 49 database/HTTP tests plus `test_roles_api.py`, `test_memory_deck.py` and `test_live_summaries.py` could not be imported here and are **unrun**.

## 4. Not covered at all
Real transcription, summarisation, FFmpeg processing of a real upload through the API, MongoDB persistence and restart, cross-user isolation against a real database, the live-stream workspace, Story/Memory Deck in a browser, accessibility audit, and cross-browser testing (Chromium only).

## To close the gap on your machine
    cd backend && pip install -r requirements-dev.txt && pytest -q
    cd frontend && npm install && npm test && npm run lint && npm run build
Then upload a short video and run the journey in the README. Send me any failure output and I will fix it.
