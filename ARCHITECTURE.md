# Architecture

## Overview

This repository provides a full-stack pizza ordering platform with Pizzaria-branded frontend UX and modular Express backend services.

## Components

1. `server/index.js`: API routes, request guards, in-memory order state, and static frontend hosting.
2. `server/data/`: canonical pizza and topping catalogs migrated from Pizzaria source.
3. `server/services/inventory.js`: normalized inventory key mapping, reserve/release helpers, and inventory snapshots.
4. `server/services/orders.js`: pricing rules, lifecycle transitions, order numbering, and status normalization.
5. `server/services/payment.js`: simulated payment processing and transaction metadata.
6. `frontend/`: responsive ordering UI (hero, menu explorer, cart, checkout, timeline tracker).

## Request Flow

1. Client loads static frontend from the Express server.
2. Frontend fetches menu from `GET /api/pizzas` and `GET /api/toppings`.
3. Order requests call `POST /api/orders` using either legacy or cart payload contract.
4. Inventory and payment services validate/approve requests.
5. Accepted orders are stored in memory and returned to client with status history.
6. Status updates pass through lifecycle validation via `PATCH /api/orders/:id/status`.

## Security and Validation

1. Required fields are validated before order creation for both request contracts.
2. Request correlation IDs and security headers are added for every response.
3. Optional API-key enforcement secures all write routes.
4. In-memory fixed-window throttling protects write routes from burst abuse.
5. Invalid status transitions are rejected (`422`) and missing orders return `404`.

## Accessibility and Usability

1. Frontend includes keyboard-reachable controls and aria-live status announcements.
2. Mobile-first responsive layout preserves ordering flow on narrow viewports.
3. API docs provide reproducible request examples for both payload models.

## Efficiency

1. Small in-memory state model keeps startup fast for local/demo environments.
2. Service-layer decomposition keeps logic focused, reusable, and testable.
3. Catalog files are loaded once at startup and reused in endpoint responses.
