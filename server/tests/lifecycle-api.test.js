import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { app, resetAppState } from "../index.js";

function buildOrderPayload() {
  return {
    customerName: "Lifecycle User",
    size: "medium",
    crust: "thin",
    toppings: ["basil", "olives"],
    paymentMethod: "card",
  };
}

test("tracks status history across explicit transitions", async () => {
  resetAppState();

  const created = await request(app).post("/api/orders").send(buildOrderPayload());
  assert.equal(created.status, 201);
  assert.equal(Array.isArray(created.body.statusHistory), true);
  assert.equal(created.body.statusHistory.length, 1);

  const orderId = created.body.id;

  const preparing = await request(app)
    .patch(`/api/orders/${orderId}/status`)
    .send({ status: "preparing" });
  assert.equal(preparing.status, 200);

  const baking = await request(app)
    .patch(`/api/orders/${orderId}/status`)
    .send({ status: "baking" });
  assert.equal(baking.status, 200);

  const fetched = await request(app).get(`/api/orders/${orderId}`);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.body.order.status, "baking");
  assert.equal(fetched.body.order.statusHistory.length, 3);
  assert.equal(fetched.body.order.statusHistory[0].status, "placed");
  assert.equal(fetched.body.order.statusHistory[2].status, "baking");
});

test("rejects transitions from delivered terminal state", async () => {
  resetAppState();

  const created = await request(app).post("/api/orders").send(buildOrderPayload());
  const orderId = created.body.id;

  const delivered = await request(app)
    .patch(`/api/orders/${orderId}/status`)
    .send({ status: "delivered" });
  assert.equal(delivered.status, 200);
  assert.equal(delivered.body.status, "delivered");

  const invalidFollowup = await request(app)
    .patch(`/api/orders/${orderId}/status`)
    .send({ status: "preparing" });

  assert.equal(invalidFollowup.status, 422);
  assert.equal(invalidFollowup.body.error.code, "validation_error");
  assert.equal(invalidFollowup.body.error.message, "invalid_status_transition");
});
