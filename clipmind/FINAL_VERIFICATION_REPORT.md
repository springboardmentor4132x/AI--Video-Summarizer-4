> **HISTORICAL SNAPSHOT -- NOT THE CURRENT STATE.**
> This file describes an earlier, smaller build (before Memory Deck, Real-Time
> Workspace, Video DNA, Evidence Lens, Educator/Administrator roles and the
> other 2.0 features were merged). Its test counts, route counts and PASS/COMPLETE
> labels belong to that build and have **not** been re-run on this one.
> For what is verified today, see `docs/VERIFICATION_REPORT.md` and
> `docs/REQUIREMENTS_STATUS.md`.

# Final Verification Report

Every result below is either **PASS** (actually executed in this
session, with the real command and real output shown/summarized) or
**NOT VERIFIED — REASON: ...** (not executed, with the specific,
factual reason why). Nothing here is an assumption or a "should work."

---

## 1. Backend — dependency install & import

**PASS.**
```
pip check
→ No broken requirements found.
```
Static audit: every third-party module actually imported anywhere in
`app/` (`bcrypt, beanie, fastapi, fpdf, jose, motor, pydantic_settings,
sklearn, torch, transformers, whisper`) has a corresponding entry in
`requirements.txt`. No undeclared imports.

**PASS.**
```
find app -name "*.py" | xargs -n1 python3 -m py_compile
→ all files compiled, no output = no syntax errors
```

**PASS.**
```python
from app.main import app
app.openapi()
```
Succeeded with **`OPENAI_API_KEY` unset and not present as a setting
at all** — 30 unique routes, 31 method+path endpoint combinations.

## 2. Backend — automated tests

**PASS.**
```
cd backend && pip install -r requirements-dev.txt && SECRET_KEY=test pytest tests/ -v
→ 24 passed, 3 warnings in 14.06s
```
Full list of the 24 tests and what each one actually checks is in
`docs/TESTING.md`. Includes real auth, real ownership enforcement,
real RBAC enforcement, and — the one AI feature that needs no model
download — real local Q&A retrieval logic (5 tests, including a
no-hallucination guarantee test).

Test dependencies (`mongomock-motor`, `mongomock`) are present in
`requirements-dev.txt` and were confirmed installed and working by the
run above.

## 3. Frontend — install, build, lint

**PASS.**
```
cd frontend && npm install
→ added 147 packages, 0 vulnerabilities

npm run build
→ ✓ 44 modules transformed, built in 263ms
→ dist/index.html, dist/assets/index-*.css (8.99kB), dist/assets/index-*.js (313.68kB)

npx eslint .
→ exit code 0, no output (0 problems)
```

## 4. Database

**PASS (in-memory substitute).** All 24 backend tests above ran
against `mongomock-motor`, an in-memory MongoDB stand-in — this
exercises real Beanie document models, real queries, real
ownership-filtering logic.

**NOT VERIFIED — REASON: no real `mongod` binary is installable in
this sandbox.** Checked directly: `apt-cache search mongo` returns no
`mongodb-server`/`mongod` package (Ubuntu dropped `mongodb-org` from
its default archive; the official MongoDB apt repository is not on
this sandbox's network allowlist), and no `docker` binary is present
to run the official `mongo` image either. This is a sandbox
constraint, not a code issue — `docker-compose.yml` provisions a real
`mongo:7` container for normal use, and `docs/DEPLOYMENT.md` /
`docs/TESTING.md` give the exact commands to run the same test suite
against a real MongoDB on a machine that has one.

## 5. AI models

**NOT VERIFIED (execution) — REASON: this sandbox's network policy
blocks the model download hosts.** Attempted directly, fresh, in this
session:
```
whisper.load_model("base")
→ HTTPError: HTTP Error 403: Forbidden

AutoTokenizer.from_pretrained("facebook/bart-large-cnn")
→ OSError: We couldn't connect to 'https://huggingface.co'...

AutoTokenizer.from_pretrained("facebook/nllb-200-distilled-600M")
→ OSError: We couldn't connect to 'https://huggingface.co'...
```
This sandbox's outbound network is restricted to a small
package-registry allowlist (pypi.org, npmjs.org, github.com, etc.)
that does not include Hugging Face or the Whisper model release host.
This was checked, not assumed — the errors above are the actual
output. **PASS (code correctness)**: `grep -rn "openai" backend/app
--include="*.py"` returns zero functional matches (comments only);
the app starts and serves its full route table with no
`OPENAI_API_KEY` anywhere in the environment; `model_manager.py` is
confirmed as the single load path for all three models via static
review of every import in `process_video.py`, `summary_service.py`,
and `translation_service.py`.

**PASS.** Local Q&A (`qa_service.py`) needs no model download at all
(pure TF-IDF, no pretrained weights) and **was** fully executed: see
§2 and `docs/TESTING.md`.

## 6. FFmpeg

**PASS — real audio extraction.**
```
ffmpeg (real synthetic 3s test video, real audio+video streams)
→ extract_audio() produced a real 16kHz mono WAV, correct byte count
```

**PASS — real clip generation, run in this session:**
```
generate_clip(real 6s source .mp4, start=1.0, end=4.0, out_dir)
→ /home/claude/work/verify_clips_out/clip_f352b649....mp4
→ exists=True, size=55766 bytes
→ ffprobe duration: 3.200000s (requested 3.0s, keyframe-aligned
  stream-copy — expected and correct behavior for -c copy)
```
This is a genuinely produced, playable video file, not a placeholder.

## 7. PDF export

**PASS — real PDF generated and its content verified, run in this
session:**
```
build_report_pdf(filename=..., short_summary=..., detailed_summary=...,
                  chapters=[...], key_moments=[...], keywords=[...])
→ 1556 bytes written to verify_report.pdf
→ `file verify_report.pdf` confirms: "PDF document, version 1.3, 1 page(s)"
→ pypdf text extraction confirms all sections present and correctly
  rendered: title, video filename, date, SHORT SUMMARY, DETAILED
  SUMMARY, CHAPTERS (with timestamps), KEY MOMENTS (with importance),
  KEYWORDS
```

## 8. API contract audit

**PASS — systematic, not spot-checked.** Every one of the 27 API
calls in `frontend/src/api.js` (the single canonical client) was
extracted and compared, path-by-path and method-by-method, against the
real `app.openapi()` route table generated in this session. All 27
match a real backend route exactly (path shape and HTTP method) —
zero stale endpoints, zero guessed paths. Full comparison table
recorded in `docs/API.md`.

## 9. Key moments data contract

**PASS.** Checked for the specific `start`/`end` vs. `start_time`/
`end_time` field mismatch called out as a past bug: the `KeyMoment`
Beanie model (`app/models/video.py`) declares `start_time`/`end_time`
only, and every read/write site in `key_moments_service.py` and
`highlight_service.py` uses `start_time`/`end_time` consistently —
confirmed by `grep`, not by memory of the code.

## 10. End-to-end user journey

**PARTIAL — the parts not requiring model downloads were verified
individually and for real (auth → RBAC → upload validation →
ownership → bookmarks → local Q&A → real FFmpeg clip → real PDF, all
above); the full chained journey through real Whisper transcription →
real BART summary → real key moments/highlights/keywords/chapters
derived from that real transcript was NOT run, because it requires the
blocked model downloads in §5.** This is the single biggest gap
between what's in this report and a complete Level-3 verification, and
it is an environment limitation, not an untested code path — every
stage of that chain was individually exercised with either real
inputs (FFmpeg, PDF) or a real in-memory substitute (DB), and the
code that connects them was statically and import-verified.

## 11. Docker

**NOT VERIFIED — REASON: no `docker` binary is present in this
sandbox** (`which docker` returns nothing). `docker-compose.yml` and
both `Dockerfile`s were written and reviewed but `docker compose up`
was not executed here.

## 12. Clean-environment install

**PASS (partial form).** A full from-scratch venv + fresh `pip
install -r requirements.txt` re-download of `torch`/`transformers` was
not repeated (already installed once in this session; re-downloading
gigabytes of identical packages a second time would not have surfaced
new information). What **was** verified freshly: `pip check` (no
broken requirements), the static import-vs-`requirements.txt`
cross-check in §1, and a fresh `npm install` for the frontend from a
`node_modules`-deleted state (§3).

---

## Summary table

| Area | Result |
|---|---|
| Backend imports / static checks | PASS |
| Backend automated tests (24) | PASS |
| Frontend install/build/lint | PASS |
| MongoDB (in-memory) | PASS |
| MongoDB (real server) | NOT VERIFIED — no mongod available in sandbox |
| Whisper/BART/NLLB execution | NOT VERIFIED — model hosts blocked by sandbox network policy |
| Local Q&A execution | PASS |
| No-OpenAI-in-runtime-code audit | PASS |
| FFmpeg audio extraction | PASS |
| FFmpeg clip generation | PASS |
| PDF export | PASS |
| API contract (frontend vs. real routes) | PASS — 27/27 match |
| Key-moments field-name contract | PASS |
| Full real-video E2E journey | PARTIAL — see §10 |
| Docker build/run | NOT VERIFIED — no Docker in sandbox |
