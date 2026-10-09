# Milestone 2 — Transcription and Summarization

## Transcription
- `app/services/process_video.py::transcribe_audio()` runs local
  Whisper (`WHISPER_MODEL_NAME`, default `base`; Hindi uses
  `WHISPER_HINDI_MODEL_NAME`, default `large-v3-turbo`) on the extracted
  audio
- Returns both the flat `text` and per-segment
  `{start_time, end_time, text}` — the segments are what
  `key_moments_service.py` uses for real timestamp-based detection
  (not an equal-chunk fallback) and what the frontend uses for
  click-to-seek transcript search
- Persisted on the `Video` document (`transcript`,
  `transcript_segments`)
- `GET /api/videos/{id}/transcript` — retrieval; the frontend's
  `Transcript` page implements client-side search/highlight/jump
- Long videos: Whisper handles long audio natively; no truncation is
  applied before transcription
- Errors (missing model weights, corrupt audio, etc.) are caught in
  `process_video()` and reflected as `status="failed"` with a real
  message, not silently swallowed

## Summary
- `app/services/summary_service.py::generate_summaries()` — **local**
  `facebook/bart-large-cnn` (see `docs/AI_PIPELINE.md` for the full
  story on why, and what was fixed)
- Long transcripts are chunked (`CHUNK_TOKENS`) so length is never
  limited by BART's context window; chunk summaries are combined for
  the detailed pass
- Short and detailed summaries are genuinely different outputs (see
  `docs/AI_PIPELINE.md` "How short vs. detailed summaries actually
  differ") — not the same text truncated twice
- Deterministic fallback: if the transcript is empty (e.g. silent
  video), a clear placeholder string is returned instead of calling
  the model on nothing
- Model failures don't fail the whole video: `process_video()` catches
  summary-stage exceptions, leaves `summary`/`short_summary` empty, and
  records what happened in `error_message`, while the transcript
  (already-completed work) is preserved

## Summary quality / evaluation
No automated summary-quality scoring (ROUGE or similar) is implemented
in this project. Computing a real, meaningful ROUGE score requires
reference/gold summaries to compare against, which this project's
dataset (arbitrary user-uploaded videos) doesn't have — inventing a
"quality score" without ground truth would be exactly the kind of
fabricated metric the project brief asks not to produce. If reference
summaries become available (e.g. a labeled evaluation set), `rouge-score`
or similar could be added straightforwardly against
`summary_service.py`'s output. This limitation is also listed in
`PROJECT_STATUS.md`.
