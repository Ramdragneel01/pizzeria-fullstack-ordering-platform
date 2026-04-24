# Repository Collaboration Context

## Purpose

This repository delivers a production-readiness baseline for a full-stack pizza ordering platform with modular backend services.

## Core Files

1. `server/index.js`: route orchestration and in-memory state.
2. `server/services/*.js`: inventory, pricing, payment, and transitions.
3. `server/tests/*.test.js`: backend behavior coverage.

## Standard Commands

```bash
npm ci
npm run lint
npm test
npm run start
```

## Change Rules

1. Preserve API contract compatibility unless explicitly versioned.
2. Add tests for every backend behavior change.
3. Keep docs and runbooks aligned with implementation.
4. Avoid adding dependencies without clear runtime or test value.
