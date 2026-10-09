# Deployment

## Docker Compose (recommended for a quick full-stack run)

```bash
cp backend/.env.example backend/.env
# edit backend/.env: SECRET_KEY at minimum; MONGO_URI is overridden by
# docker-compose.yml to point at the mongodb service automatically.
docker compose up --build
```

This starts three services (`docker-compose.yml`):
- `mongodb` — MongoDB 7, data persisted in the `mongo_data` volume
- `backend` — FastAPI on `:8000`, built from `docker/Dockerfile.backend`
  (installs CPU-only torch first to keep the image smaller, then the
  rest of `requirements.txt`; installs `ffmpeg` via apt)
- `frontend` — built with `npm run build` and served via nginx on
  `:5173` (mapped from container port 80), built from
  `docker/Dockerfile.frontend`

The frontend image is built with whatever `VITE_API_BASE_URL` is set
at *build* time (Vite inlines env vars into the bundle) — for a
non-local deployment, set it before `docker compose build`, e.g.:
```bash
VITE_API_BASE_URL=https://api.yourdomain.com/api docker compose build frontend
```

## Manual deployment

See the "Installation" section of the top-level `README.md` for
running backend/frontend/MongoDB independently without Docker — same
steps, just directly on the host instead of in containers.

## Model weights in production

Whisper and BART weights are downloaded on first use, into the
container/host's model cache directory. For a deployment without
outbound internet access after initial setup:
1. On a machine with internet access, run the backend once so the
   weights download and get cached (or manually download
   `facebook/bart-large-cnn` via `huggingface-cli` and the Whisper
   `base` checkpoint).
2. Copy the resulting cache directories (Hugging Face's default
   `~/.cache/huggingface`, Whisper's `~/.cache/whisper`) into the
   deployment image/volume.
3. Confirm `SUMMARIZATION_MODEL_NAME` / `WHISPER_MODEL_NAME` in `.env`
   match what was cached.

## Environment variables reference

See `backend/.env.example` and `frontend/.env.example` — every
variable is commented there with what it does and its default.

## Reverse proxy / HTTPS

Not configured in `docker-compose.yml` (it's a local/dev-oriented
setup). For production, put nginx/Caddy/Traefik in front of the
`backend` (port 8000) and `frontend` (port 5173/80) containers with
TLS termination, and update `CORS_ORIGINS_RAW` in `backend/.env` to
the real frontend origin (never leave it as `*` — see
`docs/TROUBLESHOOTING.md` and the security notes in
`PROJECT_STATUS.md`).

## Real-Time Workspace requirements
- FFmpeg (already installed by `docker/Dockerfile.backend`) and `yt-dlp` (in `backend/requirements.txt`).
- The backend container needs outbound internet access to reach the stream.
- Optional `YOUTUBE_COOKIES_FILE` for streams requiring sign-in: mount a private cookie export and point the variable at it. Do not commit it.
- Whisper models download on first use; allow time or pre-warm the container.

## First administrator
Registration cannot create administrators. After the backend can reach MongoDB:

    cd backend
    python -m app.scripts.create_admin you@example.com "Your Name"     # prompts for a password

or, in Docker: `docker compose exec backend python -m app.scripts.create_admin you@example.com "Your Name"`.
If the email already exists the account is promoted instead. The password is read from a prompt (or `ADMIN_PASSWORD`), never from the command line.
`SECRET_KEY` must be a real random value: the backend refuses to start with the example value or one shorter than 16 characters.

