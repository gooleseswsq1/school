# Worker + Redis Deployment Guide (Railway / Render / Fly)

This guide enables true async `QUEUED -> PROCESSING -> COMPLETED` behavior while keeping the current fallback sync behavior unchanged.

## 1) Current behavior (kept as-is)
- If queue infra is available (`REDIS_URL` + worker running), parse routes enqueue jobs.
- If queue infra is unavailable, routes fallback to sync parse.
- No code change is required to keep fallback.

## 2) Required environment variables

Set these in BOTH places:
- Vercel project env (for API enqueue endpoints)
- Worker service env (Railway/Render/Fly)

Required:
- `REDIS_URL`: Redis connection string used by BullMQ
- `DATABASE_URL`: Same database used by your app
- `INTERNAL_API_BASE_URL`: Production app URL, e.g. `https://school-one-sandy.vercel.app`

Optional:
- `JOB_NOTIFY_WEBHOOK_URL`: Webhook for job notifications
- `CRON_SECRET` (or `VERCEL_CRON_SECRET`): Protect cleanup endpoint

## 3) Vercel settings

Add env in Vercel:
- `REDIS_URL`

Recommended:
- Keep `CRON_SECRET` configured if you call cleanup manually.

Important:
- Current `vercel.json` cron is once/day (Hobby-compatible).

## 4) Redis provider

You can use any Redis provider. Common options:
- Upstash Redis
- Railway Redis
- Render Key Value
- Fly Redis / external Redis

After creating Redis, copy the connection URL into `REDIS_URL`.

## 5) Deploy worker on Railway

Files included:
- `Dockerfile.worker`
- `railway.json`

Steps:
1. Create a new Railway service from this repo.
2. Railway will build using `Dockerfile.worker`.
3. Set env vars:
   - `REDIS_URL`
   - `DATABASE_URL`
   - `INTERNAL_API_BASE_URL`
   - optional `JOB_NOTIFY_WEBHOOK_URL`
4. Deploy and ensure logs show worker ready/completed/failed events.

## 6) Deploy worker on Render

Files included:
- `Dockerfile.worker`
- `render.yaml`

Steps:
1. Create Blueprint service from `render.yaml` or create worker manually.
2. Set env vars:
   - `REDIS_URL`
   - `DATABASE_URL`
   - `INTERNAL_API_BASE_URL`
3. Deploy and verify worker logs.

## 7) Deploy worker on Fly.io

Files included:
- `Dockerfile.worker`
- `fly.worker.toml`

Steps:
1. Install Fly CLI and login.
2. Create app (or reuse):
   - `fly launch --config fly.worker.toml --no-deploy`
3. Set secrets:
   - `fly secrets set REDIS_URL=... DATABASE_URL=... INTERNAL_API_BASE_URL=https://school-one-sandy.vercel.app`
4. Deploy:
   - `fly deploy --config fly.worker.toml`

## 8) Verification checklist

1. Upload DOCX from exam creator.
2. Confirm UI goes through `QUEUED` then `PROCESSING`.
3. Confirm final status becomes `COMPLETED`.
4. Confirm `GET /api/jobs/{jobId}` returns progressing statuses.
5. Stop worker temporarily and verify fallback sync still works.

## 9) Troubleshooting

- Jobs stuck at `QUEUED`:
  - Worker is not running, cannot connect Redis, or wrong `REDIS_URL`.

- Worker fails with auth/API errors:
  - Check `INTERNAL_API_BASE_URL` points to production URL.

- Job update errors:
  - Ensure worker `DATABASE_URL` points to the same DB as the app.

- 401 when polling jobs API:
  - Route is protected by JWT proxy; use authenticated requests from app UI.
