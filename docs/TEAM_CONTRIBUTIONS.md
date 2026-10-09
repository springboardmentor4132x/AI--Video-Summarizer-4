# Team Contributions

This is written from what is actually present in each contributor's
uploaded branch/zip, not assumed from a role description. Where the
branch evidence differs from an expected role list, that's noted
explicitly rather than silently corrected or silently accepted —
per-person git history/commit authorship wasn't available (only a zip
snapshot per person), so "contributed" below means "this branch
contains work in this area," not necessarily "wrote every line
unassisted."

## Abhigna
Branch contains:
- Backend: `analytics_service.py`, `highlight_service.py`,
  `key_moments_service.py`, `keyword_service.py` — i.e. a large part of
  the Milestone 3 AI-adjacent service layer
- Frontend: `ProcessingStatus`, `Summary`, `VideoUpload`,
  `UploadHistory`, `Dashboard`, `Login`, `Register`, `Transcript` pages
- A `legacy.py` service file (superseded by later work; not included
  in the final merged codebase)

## Amrita
Branch contains the fullest **foundational** scaffold of any single
branch reviewed:
- `app/core/config.py`, `security.py`, `roles.py` (RBAC role
  constants), `app/db/database.py`, `app/models/user.py`,
  `app/models/video.py`
- `app/services/process_video.py`, `summary_service.py`,
  `transcript_service.py` — i.e. Milestone 1/2 backend foundation and
  pipeline
- Frontend: `ProtectedRoute.jsx`, `App.jsx`, `App.css`

Note: the contribution list provided alongside the original request
described Amrita's work as frontend/UI (video player, search/filter,
bookmarks/clips UI). That is **not** what this branch's contents show
— this branch is backend/foundation-heavy. It's flagged here rather
than silently reconciled, since the branch snapshot is the only
verifiable evidence available; it's possible later frontend work
happened outside what was captured in this zip.

## Harika
Branch contains the most complete **frontend page set** of any single
branch reviewed:
- `KeyMoments`, `Keywords`, `Analytics`, `ContentInsights`,
  `ProcessingStatus`, `Summary`, `VideoUpload`, `Results`,
  `UploadHistory`, `Dashboard`, `Login`, `Register`, `Transcript`,
  `UsageReports` pages
- `docs/database-documentation.md`, `docs/database-design.md` (an
  earlier draft of the schema — superseded in this final repo by
  `docs/DATABASE.md`, rewritten to match the actual merged models)

This matches the "AI/ML processing, transcription/summarization
integration, chapters, Q&A, translation, PDF export, key moments"
description only partially — the branch evidence shown is primarily
**frontend pages + early DB documentation**, not the AI service
implementations themselves (those came from Abhigna's and
tejashwinigm's branches, and the Q&A/translation/PDF/chapter services
specifically came from a later, unattributed patch batch — see
"Unattributed work" below).

## Tejashwinigm
Branch contains the most complete **backend service layer** of any
single branch reviewed (used as this project's backend base):
- `app/services/transcript_service.py`, `summary_service.py`
  (**the local BART implementation that this final project wires
  in** — see `docs/AI_PIPELINE.md`), `key_moments_service.py`,
  `highlight_service.py`, `keyword_service.py`, `analytics_service.py`,
  `content_insights_service.py`, `usage_service.py`
- `Dockerfile`, `docker-compose.yml`, Postman collection

This matches the "MongoDB/database work, FastAPI/backend APIs,
FFmpeg, clip generation, analytics/reports, backend infrastructure"
description reasonably well for the backend-infrastructure and
analytics parts; clip generation itself is **not** in this branch (it
came from the later patch batch below).

## Vijayalaxmi
Branch contains a minimal frontend scaffold only (`App.jsx`,
`main.jsx`, config files — no page implementations). The `User` model
docstring elsewhere in the codebase (`app/models/user.py`) reads
*"matches the schema VijayaLaxmi documented"*, which suggests a schema/
documentation contribution not fully reflected in this particular
branch snapshot. **Labeled uncertain**: the branch itself doesn't show
substantial implementation work, but there's a direct code comment
attributing schema design to her, so the true scope of her
contribution likely isn't fully captured by this zip alone.

## Unattributed work (present in `APP.zip` / `files*.zip`, not in any
individual named branch)
A later round of work — bookmarks, clips, Q&A, translation, PDF
export, chapters, and a set of fix/audit reports (`FINAL_STATUS_
REPORT.md`, `API_CONTRACT_AND_FIXES.md`, `UI_POLISH_REPORT.md`,
`FINAL_MILESTONE_1_2_3_AUDIT.md`, etc.) — arrived as loose files with
no branch/author attached. This is the majority of the "additional
features" in `docs/ADDITIONAL_FEATURES.md` and much of the API-contract
cleanup described throughout these docs. It is **not** attributed to
any team member here because there's no evidence in the provided files
of who produced it — it's called out honestly as unattributed rather
than assigned to someone by guess.

## Summary of what could not be verified
- No git commit history was available for any branch (only a point-in-
  time zip per person), so exact authorship of individual lines/edits
  within a shared file cannot be determined from these files alone.
- The provided contribution-list-by-role (in the original prompt) was
  used as a starting hypothesis and checked against actual file
  contents; where they diverge, this document reflects the file
  evidence and flags the mismatch rather than silently trusting either
  source.

## Integration pass (merged tree)
- **Amrita:** Memory Deck and Real-Time Workspace (backend, services, tests, pages) and the Home / PublicNav design. Her page CSS was extracted into `memory.css`, `live.css`, `home.css` and mapped onto the shared theme tokens.
- **Harika:** the Video DNA page. Its backend was rewritten to compute from the canonical `Video` document (her original endpoint read a `key_moments` collection that the canonical schema does not have).
- **Tejashwini:** Evidence Lens (`evidence_service.py`, the `/ask` evidence response, `evidence.css`), now also a standalone page.
- Duplicate canonical Video DNA / Evidence implementations were removed in favour of these.
