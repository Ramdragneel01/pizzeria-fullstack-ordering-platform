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

## Environment Variables

Use `.env.example` as a baseline:

1. `PORT`
2. `CORS_ORIGIN`

## CI and Release

1. CI workflow: `.github/workflows/ci.yml`
2. Release workflow: `.github/workflows/release.yml`

Create semantic tags (`vX.Y.Z`) to trigger release workflow.
