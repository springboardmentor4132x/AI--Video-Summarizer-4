# Additional Features

## Real video player
`components/VideoPlayer.jsx` wraps a real `<video>` element streaming
from `GET /api/videos/{id}/file`, exposing a seek API used by
transcript clicks, key moment/highlight/chapter clicks, and bookmark
jump-to.

## Transcript search
Client-side search over `transcript_segments` in the `Transcript`
page: matches are highlighted and clicking a match seeks the player to
that segment's `start_time`.

## Bookmarks
`POST/GET/PATCH/DELETE /api/bookmarks*` — per-user, and (after a real
bug found and fixed by this project's test suite — see
`docs/TESTING.md`) the video referenced by a new bookmark is now
verified to exist and be owned by the caller before the bookmark is
created, so a request can't create an orphaned bookmark against a
nonexistent or someone else's video.

## Clip generation
`app/services/clip_service.py::generate_clip()` — validates
`0 <= start < end`, tries FFmpeg stream-copy first (`-c copy`, fast,
no re-encode) and falls back to a full re-encode
(`libx264`/`aac`) if the copy produces an empty/invalid file. Clip
metadata is persisted (`Clip` document); download is served through
`GET /api/clips/{id}/download`, ownership-checked like everything
else.

## Video library / history / processing status
`UploadHistory` lists the caller's videos with status; `Dashboard` and
`ProcessingStatus` reflect the same real per-stage progress fields
(`upload_progress`, `audio_progress`, `transcription_progress`,
`summary_progress`, `key_moments_progress`, `highlights_progress`,
`keywords_progress`) that `process_video()` updates as it runs, so the
frontend shows genuine progress, not a fake animated bar.

## Multilingual translation
`app/services/translation_service.py::translate_summary()` supports
Telugu, Hindi, Tamil, Kannada, Malayalam, Bengali (`SUPPORTED_LANGUAGES`),
via the local, open-source `facebook/nllb-200-distilled-600M` model —
no OpenAI, no API key. Operates on the video's already-generated
`short_summary`/`summary` — not on raw/unrelated text — and results
are cached per language on `Video.translations` so a repeat request
doesn't re-run the model. Returns 503 only if the local model fails to
load (e.g. weights not downloaded yet on this machine).

## PDF export
`app/services/pdf_service.py::build_report_pdf()` (fpdf2) includes
title, filename, date, short + detailed summary, chapters, key
moments, keywords. Unicode handling: full Unicode PDF rendering
(e.g. for a translated Telugu summary) needs a Unicode TTF font
configured via `PDF_UNICODE_FONT_PATH`; without one, English-language
export works out of the box and non-Latin scripts degrade gracefully
rather than raising an unhandled encoding error — see the in-file
comment in `pdf_service.py` for exactly how that fallback is
implemented.

## Q&A
`app/services/qa_service.py::answer_question()` is fully local — no
OpenAI, no API key, no model download needed at all. It TF-IDF-ranks
transcript segments against the question and returns the most
relevant excerpts (with timestamps) as the answer; because the answer
can only ever contain text literally present in the transcript, it
cannot fabricate a fact. If nothing scores above the relevance
threshold, it returns an explicit "not enough information" response.
Covered by real, passing unit tests in
`backend/tests/test_qa_service.py` (no model dependency, so these run
anywhere).

## Video search / filter / sort
Implemented client-side in `UploadHistory`/`Dashboard` over the
caller's own video list returned by `/api/videos/history`.

## Full frontend–backend integration
`frontend/src/api.js` is the **single** canonical API client — every
page imports from it, and its base URL is configurable
(`VITE_API_BASE_URL`, see `frontend/.env.example`) rather than
hardcoded per-component. No page constructs its own fetch URL.
