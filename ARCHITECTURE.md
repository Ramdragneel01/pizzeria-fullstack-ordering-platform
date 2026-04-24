# Architecture

## Overview

This repository provides a full-stack pizza ordering MVP with a modular Express backend and static frontend.

## Components

1. `server/index.js`: API routes, in-memory state, and route orchestration.
2. `server/services/inventory.js`: inventory reservation and snapshot helpers.
3. `server/services/orders.js`: pricing and status-transition rules.
4. `server/services/payment.js`: simulated payment decisioning.
5. `frontend/`: static UI served by Express.

## Request Flow

1. Client loads static frontend from the Express server.
2. Order requests call `POST /api/orders`.
3. Inventory and payment services validate/approve requests.
4. Accepted orders are stored in memory and returned to client.
5. Status updates pass through lifecycle validation rules.

## Security and Validation

1. Required fields are validated before order creation.
2. Invalid status transitions are rejected (`422`).
3. Missing orders return explicit `404` responses.

## Accessibility and Usability

1. Frontend remains lightweight and keyboard reachable.
2. API docs provide reproducible request examples.

## Efficiency

1. Small in-memory data model minimizes startup and runtime overhead.
2. Service-layer decomposition keeps logic focused and testable.
