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
2. Catalog endpoint coverage (`/api/pizzas`, `/api/toppings`).
3. Input validation and error path assertions.
4. Legacy and cart-style order payload compatibility.
5. Status transition rule behavior.

## Integration Test Suites

`server/tests/api.test.js`

1. Write-route security checks (API key and throttling).
2. Unified error contract assertions (code, message, request id).
3. Payment rejection and inventory conflict scenarios.
4. Probe and readiness endpoint consistency.

`server/tests/lifecycle-api.test.js`

1. Status history growth as lifecycle updates happen.
2. Terminal-state protections after delivery.

`server/tests/status-transition.test.js`

1. Core lifecycle transition rules.
2. Unknown status rejection.
3. Terminal-state lock behavior.

## Recommended Local Verification Loop

```bash
npm ci
npm run lint
npm test
npm run start
```

Then run smoke checks in another terminal:

```bash
curl http://127.0.0.1:8080/health
curl http://127.0.0.1:8080/api/orders
```

## CI Notes

CI runs install, lint, tests, dependency audit, and API smoke check on push and pull requests.
