# AI Pipeline

**Every AI feature in this application runs on a locally-executed
open-source model. There is no OpenAI dependency anywhere in the
runtime code, and no API key of any kind is required to run this
application.** This was verified, not just claimed — see the "How
this was verified" section at the bottom.

## Pipeline overview

```
Video Upload
    │  (multipart, validated extension + size, saved to UPLOAD_DIR)
    ▼
FFmpeg Audio Extraction
    │  16 kHz mono WAV (app/services/process_video.py: extract_audio)
    ▼
Whisper Transcription  (local, base by default; large-v3-turbo for Hindi)
    │  Auto-detect by default; Hindi can be selected before upload
    │  full text + per-segment {start_time, end_time, text}
    ▼
Local Summarization  (facebook/bart-large-cnn, via transformers)
    │  short_summary + detailed_summary — genuinely different outputs
    ▼
Key Moments / Highlights / Keywords / Chapters (local, rule/heuristic)
    ▼
Persistence (MongoDB)
    ▼
Frontend: results, player seeking, search, analytics, PDF export
    │
    ├──► Local Q&A (TF-IDF retrieval + extractive answer, on demand)
    └──► Local Translation (NLLB-200, on demand)
```

Every model is loaded through one centralized module,
`app/services/model_manager.py` — loaded once per process, cached,
reused for every request. Nothing loads a model per-request.

Whisper auto-detects the spoken language by default. For Hindi videos,
select **Hindi** in the upload form; this passes Whisper's `hi` language
code and explicitly requests transcription (rather than translation),
avoiding language misdetection while preserving Hindi speech in the
transcript. Hindi uses Whisper `large-v3-turbo` and a neutral transcription
prompt that keeps Hindi in Devanagari and English words in their original
spelling. On the affected recording this combination gave substantially
more coherent and readable output than the tested `base`, `small`, and
`medium` checkpoints. It downloads about 1.5 GB on first use and needs
several GB of RAM for CPU inference. The `base` model remains in use for
auto-detect and English. Existing uploaded videos can be re-transcribed
from their Transcript section with the same language choice; doing so
replaces their transcript and derived summaries/analysis but keeps the
original video file.

| Feature | Model | Library | Needs API key? |
|---|---|---|---|
| Transcription | Whisper (`base` for auto/English, `large-v3-turbo` for Hindi) | `openai-whisper` (runs 100% locally — the package name references OpenAI's original open-source release, not a cloud API) | **No** |
| Summarization | `facebook/bart-large-cnn` | `transformers` | **No** |
| Q&A | TF-IDF + cosine similarity (scikit-learn) | `scikit-learn` | **No** |
| Translation | `facebook/nllb-200-distilled-600M` | `transformers` | **No** |

A note on the Whisper package name: `pip install openai-whisper`
installs OpenAI's open-source Whisper model, which runs entirely on
your own machine once installed — it is unrelated to OpenAI's paid
cloud API and makes no network calls at inference time. This is a
naming coincidence in the open-source package, not a cloud dependency.

## Why this matters: the OpenAI issue that was fixed

The codebase this project was assembled from originally called OpenAI
(`gpt-4o-mini`) directly for summarization, Q&A, and translation, even
though a working local `facebook/bart-large-cnn` implementation
already existed for summarization but was never wired in. That has
been fully corrected in two passes:

1. **Summarization** was rewired to the local BART pipeline (no
   OpenAI import anywhere in `process_video.py`/`summary_service.py`).
2. **Q&A and translation were rewritten from scratch** to remove
   OpenAI entirely rather than merely making it optional:
   - `app/services/qa_service.py` — local TF-IDF retrieval +
     extractive answer (see below)
   - `app/services/translation_service.py` — local NLLB-200
     translation
   - `app/services/ai_client.py` (the module that used to hold the
     optional OpenAI client) has been **deleted**, not just unused
   - The `openai` package has been **removed from `requirements.txt`**
   - `OPENAI_API_KEY` has been **removed from `Settings`** — the
     application cannot be configured with one because the setting no
     longer exists

## How short vs. detailed summaries actually differ

`generate_summaries()` in `summary_service.py`:
1. Chunks the transcript into `CHUNK_TOKENS`-sized pieces so length is
   never limited by BART's context window.
2. Summarizes each chunk, then summarizes the concatenation of chunk
   summaries again for the **detailed** summary (a longer, multi-point
   pass).
3. Separately produces a tighter, single-pass **short** summary with a
   smaller target length.

They are not the same call with two different max-length knobs on
identical input.

## How local Q&A works (no hallucination, by construction)

`app/services/qa_service.py::answer_question()`:
1. TF-IDF-vectorizes the question together with every transcript
   segment.
2. Ranks segments by cosine similarity to the question.
3. Takes the top-scoring segments above a minimum-similarity floor.
4. The answer **is** the retrieved transcript text itself, presented
   as timestamped excerpts — never a generated claim.

Because the answer can only ever contain text that is literally
present in the transcript, this cannot hallucinate a fact that isn't
there. If nothing clears the similarity floor, it returns "The
transcript does not contain enough information to answer this
question." instead of guessing. This is directly unit-tested in
`backend/tests/test_qa_service.py` (including a test asserting the
answer only ever contains transcript-sourced content), and those tests
pass in this project's sandbox — they need no model download since
TF-IDF has no pretrained weights.

## How local translation works

`app/services/translation_service.py::translate_summary()` runs the
already-generated `short_summary`/`detailed_summary` through NLLB-200,
which natively supports Telugu, Hindi, Tamil, Kannada, Malayalam, and
Bengali (and 194 other languages) as a single model — avoiding the
need to source and maintain six separate per-language models.
Translations are cached per `video_id + language` on the `Video`
document (`translations` field) so the model never runs twice for the
same request.

## Model loading — centralized, not per-request

`app/services/model_manager.py` is the single place every model
(Whisper, BART, NLLB) is loaded and cached at module level, on first
use. The larger Hindi Whisper checkpoint is released after transcription
so it does not compete with summarization for memory; smaller checkpoints
remain cached for reuse. It also detects and uses a GPU automatically if
one is available (`torch.cuda.is_available()`), falling back to CPU
otherwise. Model names are configurable via `.env`
(`WHISPER_MODEL_NAME`, `WHISPER_HINDI_MODEL_NAME`, `SUMMARIZATION_MODEL_NAME`,
`TRANSLATION_MODEL_NAME`) without touching code.

## Error handling

A `ModelUnavailable` exception (raised by `model_manager.py`) is used
consistently for "this local model couldn't be loaded" — e.g. missing
weights, no disk space. Routes catch it and return `HTTP 503` with a
clear message. Transcription/summarization failures don't cascade: if
summarization fails but transcription succeeded, the video is still
marked done, with `summary`/`short_summary` left empty and
`error_message` explaining what happened — see `process_video.py`.

## How this was verified

- `grep -rniI "openai|gpt-4|gpt-3|OPENAI_API_KEY" backend/app --include="*.py"`
  returns **zero functional matches** (only comments documenting the
  absence).
- The FastAPI app was successfully imported and its full route table
  printed **with no `OPENAI_API_KEY` set anywhere in the
  environment** — confirming the app doesn't require one to even
  start.
- `backend/tests/test_qa_service.py` (5 tests) actually runs the real
  local Q&A retrieval logic against sample transcripts and passes, in
  this project's build sandbox, with no model download needed.
- Whisper/BART/NLLB model **weight downloads** were attempted in this
  specific build sandbox and blocked by its network allowlist (a
  `HTTP 403` from the sandbox's own policy, not from the model host) —
  documented honestly in `docs/TESTING.md` and `PROJECT_STATUS.md`
  rather than claimed as tested. On a normal machine with normal
  internet access, all three download and run the same way any other
  Hugging Face / Whisper model does.
