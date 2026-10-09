# Troubleshooting

**`FileNotFoundError: FFmpeg not found`**
Install FFmpeg and ensure it's on PATH (`ffmpeg -version` should work
in the same shell/environment the backend runs in). On the WinGet
install path on Windows, `_ffmpeg_path()` also checks the WinGet
packages folder automatically.

**Video upload succeeds but processing never finishes / status stuck
on `processing`**
Check the backend logs — the first real transcription/summarization
run needs to download model weights (a few GB) from Hugging Face and
the Whisper release; on a slow connection this can take a while the
first time. If the host has no internet access, this download will
fail — see "Model weights in production" in `docs/DEPLOYMENT.md`, and
note that when this happens, `process_video()` still marks the video
`status="done"` if transcription itself failed (it's marked `failed`)
or leaves the summary empty with an explanatory `error_message` if
only the summary step failed.

**`503` from `/translate` or `/ask`**
Both features are fully local (no API key involved at all) — a 503
here means the local model (NLLB for translate; TF-IDF needs no
download so `/ask` almost never 503s) couldn't be loaded, usually
because its weights haven't been downloaded yet on this machine and
there's no internet access right now. Give the backend host internet
access once so the model can download and cache, then retry.

**`401 Unauthorized` immediately after logging in on the frontend**
Check that `frontend/src/api.js` and `frontend/src/ProtectedRoute.jsx`
agree on the `localStorage` key (`authToken`) — this was a real bug
found and fixed during assembly (they previously disagreed:
`authToken` vs `accessToken`).

**CORS errors in the browser console**
`backend/app/core/config.py`'s `CORS_ORIGINS_RAW` must include the
exact frontend origin you're using (protocol + host + port). The
default covers the local Vite dev server (`http://localhost:5173`)
only.

**`SECRET_KEY` missing / app won't start**
`SECRET_KEY` has no default on purpose (an app should never ship with
a guessable default JWT signing key) — set it in `.env`. Generate one
with:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

**PDF export renders non-English text incorrectly / boxes instead of
characters**
Set `PDF_UNICODE_FONT_PATH` to a Unicode TTF font covering the target
script (see `docs/ADDITIONAL_FEATURES.md`). English export works
without this.

**`pytest` fails on `list_collection_names`**
Make sure `requirements-dev.txt` is installed (`mongomock-motor`,
`mongomock`) — the version pinned there is the one `conftest.py`'s
compatibility patch was written against.
