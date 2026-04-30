# Deployment Guide

## Local Deployment

```bash
npm install
npm run start
```

Open `http://127.0.0.1:8080`.

Health check:

```bash
curl http://127.0.0.1:8080/health
```

Readiness and alias checks:

```bash
curl http://127.0.0.1:8080/ready
curl http://127.0.0.1:8080/healthz
curl http://127.0.0.1:8080/readyz
```

## Environment Variables

Use `.env.example` as a baseline:

1. `PORT`
2. `CORS_ORIGIN`
3. `API_KEY` (optional; enables write-endpoint API key auth)
4. `RATE_LIMIT_MAX` (max write requests per client per window)
5. `RATE_LIMIT_WINDOW_MS` (write-rate limit window size in milliseconds)

## CI and Release

1. CI workflow: `.github/workflows/ci.yml`
2. Release workflow: `.github/workflows/release.yml`

Create semantic tags (`vX.Y.Z`) to trigger release workflow.
