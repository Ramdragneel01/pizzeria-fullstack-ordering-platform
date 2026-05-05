# API Reference

Base URL (local): `http://127.0.0.1:8080`

## Health and Readiness

1. `GET /health`
2. `GET /ready`
3. `GET /healthz` (alias for `/health`)
4. `GET /readyz` (alias for `/ready`)

## GET /health

Returns service heartbeat and current in-memory order count.

This endpoint remains public.

## GET /api/menu

Returns consolidated menu metadata with full pizza and topping catalog plus current inventory snapshot.

## GET /api/pizzas

Returns normalized pizza catalog used by the UI.

## GET /api/toppings

Returns available toppings catalog.

## GET /api/orders

Returns all current orders in memory.

## GET /api/orders/:id

Returns one order by id.

## POST /api/orders

Creates an order when payload is valid, inventory exists, and payment is approved.

Security behavior:

1. Requires `X-API-Key` header when `API_KEY` is configured.
2. Subject to write-request throttling via `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`.

Legacy request body example:

```json
{
  "customerName": "Demo User",
  "size": "medium",
  "crust": "thin",
  "toppings": ["basil", "olives"],
  "paymentMethod": "card"
}
```

Cart-style request body example:

```json
{
  "customer": {
    "name": "Cart User",
    "phone": "9999999999",
    "address": "Main Street 12"
  },
  "items": [
    {
      "pizzaId": "0001",
      "quantity": 2
    }
  ],
  "notes": "No onion",
  "paymentMethod": "card"
}
```

Possible responses:

1. `201`: order accepted.
2. `409`: inventory unavailable.
3. `422`: missing or invalid required fields.
4. `402`: payment rejected.
5. `401`: missing/invalid API key when auth is enabled (`api_key_invalid`).
6. `429`: write request rate limit exceeded (`rate_limited`) with `Retry-After: 60`.

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

If body is empty, status advances to the next lifecycle stage automatically.

Possible responses:

1. `200`: transition applied.
2. `404`: order not found.
3. `422`: invalid transition.
4. `401`: missing/invalid API key when auth is enabled (`api_key_invalid`).
5. `429`: write request rate limit exceeded (`rate_limited`) with `Retry-After: 60`.

## Error Contract

All API errors return a normalized payload:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "request_id": "string",
    "details": {}
  }
}
```

Common error codes:

1. `unauthorized`
2. `validation_error`
3. `payment_required`
4. `conflict`
5. `not_found`
6. `rate_limited`
