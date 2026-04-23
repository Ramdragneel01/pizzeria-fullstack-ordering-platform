# pizzeria-fullstack-ordering-platform

MVP MERN-style full-stack pizza ordering repository with modular backend services for order flow, inventory checks, and payment processing.

## Implemented Scope

1. Express API with modular service files for inventory, orders, and payment simulation.
2. Dynamic pricing based on size and topping count.
3. Inventory-aware order acceptance and status lifecycle updates.
4. Lightweight frontend for custom order creation and live order list refresh.
5. In-memory data layer designed for easy migration to MongoDB.

## Run

```bash
npm install
npm run start
```

Open http://127.0.0.1:8080

## Endpoints

1. GET /health
2. GET /api/menu
3. GET /api/orders
4. POST /api/orders
5. PATCH /api/orders/:id/status
