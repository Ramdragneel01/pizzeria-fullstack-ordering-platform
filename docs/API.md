# API Reference

Base URL (local): `http://127.0.0.1:8080`

## GET /health

Returns service heartbeat and current in-memory order count.

## GET /api/menu

Returns pizza menu and current inventory snapshot.

## GET /api/orders

Returns all current orders in memory.

## POST /api/orders

Creates an order when payload is valid, inventory exists, and payment is approved.

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

## PATCH /api/orders/:id/status

Updates order status if transition is valid.

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
