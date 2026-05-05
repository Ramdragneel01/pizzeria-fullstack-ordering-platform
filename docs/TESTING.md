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

## CI Notes

CI runs install, lint, tests, dependency audit, and API smoke check on push and pull requests.
