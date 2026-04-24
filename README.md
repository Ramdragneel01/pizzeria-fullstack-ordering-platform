# pizzeria-fullstack-ordering-platform

Production-focused full-stack pizza ordering repository with modular backend services for inventory checks, pricing, and status lifecycle handling.

## Implemented Scope

1. Express API with isolated service modules (`inventory`, `orders`, `payment`).
2. Dynamic total calculation based on pizza size and topping count.
3. Inventory-aware order creation and status transition validation.
4. Lightweight frontend client for order placement and list refresh.
5. Testable in-memory state model with reset hooks for deterministic API tests.

## Quick Start

```bash
npm install
npm run start
```

Open `http://127.0.0.1:8080`.

## Quality Gate (Local CI Equivalent)

```bash
npm ci
npm run lint
npm test
```

## Endpoints

1. GET `/health`
2. GET `/api/menu`
3. GET `/api/orders`
4. POST `/api/orders`
5. PATCH `/api/orders/:id/status`

Additional endpoint details are in `docs/API.md`.

## Smoke Commands

```bash
curl http://127.0.0.1:8080/health
curl -X GET http://127.0.0.1:8080/api/menu
curl -X POST http://127.0.0.1:8080/api/orders \
	-H "Content-Type: application/json" \
	-d '{"customerName":"Demo User","size":"medium","crust":"thin","toppings":["basil"],"paymentMethod":"card"}'
```

## Demo Evidence

Expected health response:

```json
{
	"status": "ok",
	"service": "pizzeria-fullstack-ordering-platform",
	"totalOrders": 0
}
```

When a valid order is posted, API returns `201` with generated `id`, `status: "placed"`, `payment`, and `createdAt`.

## Limitations

1. Uses in-memory state only; no persistent database.
2. No authentication/authorization in current MVP APIs.
3. Payment processing is simulated and non-PCI production ready.

## Next Roadmap

1. Add database persistence and idempotent order creation.
2. Add authN/authZ and rate limiting for API routes.
3. Add containerized deployment and structured metrics export.
