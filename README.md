# pizzeria-fullstack-ordering-platform

Production-focused full-stack pizza ordering platform with a modern Pizzaria-branded UI, order lifecycle APIs, and inventory-aware backend services.

## What Is Merged

1. Pizzaria catalog and branding assets integrated into this repository.
2. Rich, responsive ordering UI with search/filter menu explorer, cart, checkout, and timeline tracker.
3. Backend API extended to support both payload styles:
4. Legacy contract (`customerName`, `size`, `crust`, `toppings`, `paymentMethod`).
5. Cart contract (`customer`, `items`, `notes`, `paymentMethod`) used by the new UI.
6. Preserved production controls: request IDs, security headers, API-key protection, write-route throttling, and normalized error contract.

## Quick Start

```bash
npm install
npm run start
```

Open: `http://127.0.0.1:8080`

## Local Quality Gate

```bash
npm ci
npm run lint
npm test
```

## Environment

Use `.env.example` as a baseline:

1. `PORT` service port
2. `CORS_ORIGIN` comma-separated allowed origins
3. `API_KEY` optional key required for write routes
4. `RATE_LIMIT_MAX` max write requests per time window
5. `RATE_LIMIT_WINDOW_MS` write-route rate-limit window

## API Overview

1. `GET /health`
2. `GET /ready`
3. `GET /healthz`
4. `GET /readyz`
5. `GET /api/menu`
6. `GET /api/pizzas`
7. `GET /api/toppings`
8. `GET /api/orders`
9. `GET /api/orders/:id`
10. `POST /api/orders`
11. `PATCH /api/orders/:id/status`

Full request/response examples are in `docs/API.md`.

## Smoke Commands

```bash
curl http://127.0.0.1:8080/health
curl http://127.0.0.1:8080/api/pizzas
curl -X POST http://127.0.0.1:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Demo User","size":"medium","crust":"thin","toppings":["basil","olives"],"paymentMethod":"card"}'
```

Cart-style payload smoke example:

```bash
curl -X POST http://127.0.0.1:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customer":{"name":"Demo","phone":"9999999999","address":"Main St"},"items":[{"pizzaId":"0001","quantity":1}],"notes":"No onion","paymentMethod":"card"}'
```

## Limitations

1. In-memory state only; order and inventory data reset on restart.
2. Payment processing is simulated and not PCI production ready.
3. No persistent authentication or role-based authorization model yet.

## Roadmap

1. Add durable persistence and idempotent order creation.
2. Add observability signals (metrics, traces, structured logs).
3. Add real payment gateway adapter and order event webhooks.
