# API Reference

Base URL (local): `http://127.0.0.1:8080`

## GET /health

Returns service heartbeat and current in-memory order count.

This endpoint remains public.

## GET /api/menu

Returns pizza menu and current inventory snapshot.

## GET /api/orders

Returns all current orders in memory.

## POST /api/orders

Creates an order when payload is valid, inventory exists, and payment is approved.

Security behavior:

1. Requires `X-API-Key` header when `API_KEY` is configured.
2. Subject to write-request throttling via `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`.

Request body example:

```json
{
  "customerName": "Demo User",
  "size": "medium",
  "crust": "thin",
  "toppings": ["basil", "olives"],
  "paymentMethod": "card"
}
```

Possible responses:

1. `201`: order accepted.
2. `409`: inventory unavailable.
3. `422`: missing or invalid required fields.
4. `402`: payment rejected.
5. `401`: missing/invalid API key when auth is enabled.
6. `429`: write request rate limit exceeded.

## PATCH /api/orders/:id/status

Updates order status if transition is valid.

Security behavior:

1. Requires `X-API-Key` header when `API_KEY` is configured.
2. Subject to write-request throttling.

Request body example:

```json
{
  "status": "preparing"
}
```

Possible responses:

1. `200`: transition applied.
2. `404`: order not found.
3. `422`: invalid transition.
4. `401`: missing/invalid API key when auth is enabled.
5. `429`: write request rate limit exceeded.
