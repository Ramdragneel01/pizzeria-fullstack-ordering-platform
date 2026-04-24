# Testing Guide

## Lint and Syntax Checks

```bash
npm run lint
```

## Backend Tests

```bash
npm test
```

Current coverage areas:

1. API create/list/update flows.
2. Input validation and error path assertions.
3. Status transition rule behavior.

## CI Notes

CI runs install, lint, tests, dependency audit, and API smoke check on push and pull requests.
