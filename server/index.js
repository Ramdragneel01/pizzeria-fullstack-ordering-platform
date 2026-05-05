import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

import {
  normalizeInventoryKey,
  releaseInventory,
  reserveInventory,
  seedInventoryFromCatalog,
  snapshotInventory,
} from "./services/inventory.js";
import { processPayment } from "./services/payment.js";
import {
  buildOrderNumber,
  calculateCartPricing,
  calculateTotal,
  canTransitionStatus,
  getNextStatus,
  normalizeStatus,
} from "./services/orders.js";

const app = express();
const PORT = Number(process.env.PORT || 8080);

const DEFAULT_RATE_LIMIT_MAX = 60;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_STATUS = "placed";

const moduleFilePath = fileURLToPath(import.meta.url);
const moduleDir = path.dirname(moduleFilePath);
const frontendRoot = path.resolve(moduleDir, "..", "frontend");
const dataRoot = path.resolve(moduleDir, "data");

const legacyInventoryDefaults = {
  basil: 25,
  extra_cheese: 30,
  onion: 40,
  mushroom: 35,
  capsicum: 32,
  pepperoni: 18,
  jalapeno: 22,
  olives: 26,
  paneer: 20,
};

const corsOrigins = String(process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors(
    corsOrigins.length > 0
      ? {
          origin: corsOrigins,
        }
      : undefined,
  ),
);
app.use(express.json({ limit: "200kb" }));
app.use(express.static(frontendRoot));

/**
 * Attaches request correlation id and baseline security headers.
 */
app.use((req, res, next) => {
  const requestId = req.get("X-Request-ID") || uuidv4();
  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

function readJsonData(fileName, fallback = []) {
  const absolutePath = path.resolve(dataRoot, fileName);

  try {
    const content = fs.readFileSync(absolutePath, "utf8");
    const normalizedContent = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
    return JSON.parse(normalizedContent);
  } catch {
    return fallback;
  }
}

function normalizePizza(item) {
  return {
    id: String(item?.id ?? ""),
    name: String(item?.name ?? "Chef Special"),
    type: String(item?.type ?? "veg").toLowerCase(),
    price: Number(item?.price ?? 0),
    image: String(item?.image ?? ""),
    description: String(item?.description ?? "Freshly baked with handcrafted ingredients."),
    ingredients: Array.isArray(item?.ingredients) ? item.ingredients.map(String) : [],
    topping: Array.isArray(item?.topping) ? item.topping.map(String) : [],
  };
}

function normalizeTopping(item) {
  return {
    id: String(item?.id ?? ""),
    tname: String(item?.tname ?? "topping"),
    price: Number(item?.price ?? 0),
    image: String(item?.image ?? ""),
  };
}

const pizzas = readJsonData("pizza.json").map(normalizePizza);
const toppings = readJsonData("ingredients.json").map(normalizeTopping);
const pizzaLookup = new Map(pizzas.map((pizza) => [pizza.id, pizza]));

const menu = pizzas.map((pizza) => ({
  id: pizza.id,
  name: pizza.name,
  suggestedToppings: pizza.topping.map((item) => normalizeInventoryKey(item)).filter(Boolean),
}));

const inventory = {};
const orders = [];
const rateLimitBuckets = new Map();

/**
 * Resolves or creates a request id for the current request lifecycle.
 * @param {import('express').Request} req
 * @returns {string}
 */
function getRequestId(req) {
  const stateRequestId = req.requestId;
  if (typeof stateRequestId === "string" && stateRequestId.length > 0) {
    return stateRequestId;
  }

  const headerRequestId = req.get("X-Request-ID");
  if (headerRequestId && headerRequestId.length > 0) {
    return headerRequestId;
  }

  return uuidv4();
}

/**
 * Maps HTTP status values to stable API error codes.
 * @param {number} status
 * @returns {string}
 */
function statusToErrorCode(status) {
  const mapping = {
    400: "bad_request",
    401: "unauthorized",
    402: "payment_required",
    404: "not_found",
    409: "conflict",
    413: "payload_too_large",
    422: "validation_error",
    429: "rate_limited",
  };

  if (status >= 500) {
    return "internal_error";
  }
  return mapping[status] ?? "request_failed";
}

/**
 * Creates normalized error payload used across API responses.
 * @param {import('express').Request} req
 * @param {string} code
 * @param {string} message
 * @param {unknown} [details]
 * @returns {{ error: { code: string, message: string, request_id: string, details?: unknown } }}
 */
function buildErrorPayload(req, code, message, details) {
  const payload = {
    error: {
      code,
      message,
      request_id: getRequestId(req),
    },
  };

  if (details !== undefined) {
    payload.error.details = details;
  }
  return payload;
}

/**
 * Sends a normalized error response with optional extra headers.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {number} status
 * @param {string} message
 * @param {unknown} [details]
 * @param {Record<string, string>} [extraHeaders]
 * @returns {void}
 */
function sendError(req, res, status, message, details, extraHeaders = undefined) {
  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      res.setHeader(key, value);
    }
  }

  res.status(status).json(
    buildErrorPayload(
      req,
      statusToErrorCode(status),
      message,
      details,
    ),
  );
}

/**
 * Parses a positive integer environment variable with fallback.
 * @param {string} name - Environment variable name.
 * @param {number} fallback - Default numeric value.
 * @returns {number} Parsed positive integer or fallback.
 */
function readPositiveIntEnv(name, fallback) {
  const raw = process.env[name];
  const parsed = Number.parseInt(raw ?? `${fallback}`, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

/**
 * Returns configured API key for protected write operations.
 * @returns {string} Configured API key value or empty string.
 */
function getConfiguredApiKey() {
  return String(process.env.API_KEY ?? "").trim();
}

/**
 * Enforces API key auth on mutating endpoints when API_KEY is configured.
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @param {import('express').NextFunction} next - Next middleware handler.
 * @returns {void}
 */
function requireApiKey(req, res, next) {
  const configuredApiKey = getConfiguredApiKey();
  if (!configuredApiKey) {
    next();
    return;
  }

  const providedApiKey = req.get("x-api-key");
  if (providedApiKey !== configuredApiKey) {
    sendError(req, res, 401, "api_key_invalid");
    return;
  }

  next();
}

/**
 * Applies a lightweight in-memory fixed-window rate limit by client and path.
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @param {import('express').NextFunction} next - Next middleware handler.
 * @returns {void}
 */
function enforceRateLimit(req, res, next) {
  const maxRequests = readPositiveIntEnv("RATE_LIMIT_MAX", DEFAULT_RATE_LIMIT_MAX);
  const windowMs = readPositiveIntEnv("RATE_LIMIT_WINDOW_MS", DEFAULT_RATE_LIMIT_WINDOW_MS);

  const now = Date.now();
  const key = `${req.ip}:${req.method}:${req.path}`;
  const bucket = rateLimitBuckets.get(key) ?? [];
  const cutoff = now - windowMs;
  const activeWindow = bucket.filter((timestamp) => timestamp >= cutoff);

  if (activeWindow.length >= maxRequests) {
    const retryAfterSeconds = String(Math.max(1, Math.ceil(windowMs / 1000)));
    sendError(req, res, 429, "rate_limited", undefined, { "Retry-After": retryAfterSeconds });
    return;
  }

  activeWindow.push(now);
  rateLimitBuckets.set(key, activeWindow);
  next();
}

const writeGuards = [requireApiKey, enforceRateLimit];

/**
 * Resets mutable in-memory app state between runs and tests.
 * @returns {void}
 */
export function resetAppState() {
  orders.length = 0;
  rateLimitBuckets.clear();
  for (const key of Object.keys(inventory)) {
    delete inventory[key];
  }

  Object.assign(inventory, seedInventoryFromCatalog(toppings, 40), legacyInventoryDefaults);
}

resetAppState();

function buildStatusHistoryEntry(status) {
  const normalizedStatus = normalizeStatus(status);
  const messageLookup = {
    placed: "Order created and awaiting kitchen confirmation.",
    preparing: "Kitchen accepted your order and prep has started.",
    baking: "Your pizza is in the oven right now.",
    out_for_delivery: "Rider has picked up your order.",
    delivered: "Order delivered. Enjoy your meal!",
    cancelled: "Order cancelled.",
  };

  return {
    status: normalizedStatus,
    message: messageLookup[normalizedStatus] ?? "Order status updated.",
    at: new Date().toISOString(),
  };
}

function validateLegacyOrderPayload(body) {
  const { customerName, size, crust, toppings: requestedToppings, paymentMethod } = body ?? {};

  if (!customerName || !size || !crust || !Array.isArray(requestedToppings) || !paymentMethod) {
    return { ok: false, status: 422, message: "request_validation_failed" };
  }

  const normalizedToppings = requestedToppings.map((item) => normalizeInventoryKey(item)).filter(Boolean);

  if (normalizedToppings.length === 0) {
    return { ok: false, status: 422, message: "request_validation_failed" };
  }

  const normalizedSize = String(size).trim().toLowerCase();
  const normalizedCrust = String(crust).trim().toLowerCase();
  const normalizedPaymentMethod = String(paymentMethod).trim().toLowerCase();
  const total = calculateTotal(normalizedSize, normalizedToppings);

  return {
    ok: true,
    mode: "legacy",
    customer: {
      name: String(customerName).trim(),
      phone: "",
      address: "",
    },
    customerName: String(customerName).trim(),
    size: normalizedSize,
    crust: normalizedCrust,
    inventoryToppings: normalizedToppings,
    displayToppings: [...new Set(normalizedToppings)],
    notes: "",
    paymentMethod: normalizedPaymentMethod,
    lineItems: [
      {
        pizzaId: "custom",
        name: "Custom Pizza",
        quantity: 1,
        unitPrice: total,
        lineTotal: total,
        toppings: [...new Set(normalizedToppings)],
      },
    ],
    pricing: {
      subtotal: total,
      tax: 0,
      deliveryFee: 0,
      total,
    },
  };
}

function validateCartOrderPayload(body) {
  const { customer, items, notes = "", paymentMethod = "card" } = body ?? {};

  if (!customer || !customer.name || !customer.phone || !customer.address || !Array.isArray(items) || items.length === 0) {
    return { ok: false, status: 422, message: "request_validation_failed" };
  }

  const lineItems = [];
  const inventoryToppings = [];
  const displayToppings = new Set();

  for (const item of items) {
    const pizzaId = String(item?.pizzaId ?? "").trim();
    const quantity = Number(item?.quantity ?? 0);
    const pizza = pizzaLookup.get(pizzaId);

    if (!pizza || !Number.isInteger(quantity) || quantity <= 0 || quantity > 12) {
      return { ok: false, status: 422, message: "request_validation_failed" };
    }

    const normalizedLineToppings = pizza.topping
      .map((topping) => normalizeInventoryKey(topping))
      .filter(Boolean);

    for (let index = 0; index < quantity; index += 1) {
      inventoryToppings.push(...normalizedLineToppings);
    }

    for (const topping of normalizedLineToppings) {
      displayToppings.add(topping);
    }

    lineItems.push({
      pizzaId: pizza.id,
      name: pizza.name,
      quantity,
      unitPrice: pizza.price,
      lineTotal: Number((pizza.price * quantity).toFixed(2)),
      toppings: [...normalizedLineToppings],
    });
  }

  const pricing = calculateCartPricing(lineItems);

  return {
    ok: true,
    mode: "cart",
    customer: {
      name: String(customer.name).trim(),
      phone: String(customer.phone).trim(),
      address: String(customer.address).trim(),
    },
    customerName: String(customer.name).trim(),
    size: "custom",
    crust: "hand_tossed",
    inventoryToppings,
    displayToppings: [...displayToppings],
    notes: String(notes ?? "").trim(),
    paymentMethod: String(paymentMethod).trim().toLowerCase(),
    lineItems,
    pricing,
  };
}

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "pizzeria-fullstack-ordering-platform",
    totalOrders: orders.length,
  });
});

app.get("/ready", (_req, res) => {
  res.json({
    status: "ready",
    service: "pizzeria-fullstack-ordering-platform",
  });
});

app.get("/healthz", (_req, res) => {
  res.json({
    status: "ok",
    service: "pizzeria-fullstack-ordering-platform",
    totalOrders: orders.length,
  });
});

app.get("/readyz", (_req, res) => {
  res.json({
    status: "ready",
    service: "pizzeria-fullstack-ordering-platform",
  });
});

app.get("/api/menu", (_req, res) => {
  res.json({
    menu,
    pizzas,
    toppings,
    inventory: snapshotInventory(inventory),
  });
});

app.get("/api/pizzas", (_req, res) => {
  res.json({ pizzas });
});

app.get("/api/toppings", (_req, res) => {
  res.json({ toppings });
});

app.get("/api/orders", (_req, res) => {
  const ordered = [...orders].sort((left, right) => {
    return left.createdAt < right.createdAt ? 1 : -1;
  });

  res.json({ items: ordered, orders: ordered });
});

app.get("/api/orders/:id", (req, res) => {
  const order = orders.find((item) => item.id === req.params.id);
  if (!order) {
    sendError(req, res, 404, "order_not_found");
    return;
  }

  res.json({ order });
});

app.post("/api/orders", writeGuards, (req, res) => {
  const isCartPayload = Array.isArray(req.body?.items) || typeof req.body?.customer === "object";
  const validated = isCartPayload
    ? validateCartOrderPayload(req.body)
    : validateLegacyOrderPayload(req.body);

  if (!validated.ok) {
    sendError(req, res, validated.status, validated.message);
    return;
  }

  const reserved = reserveInventory(validated.inventoryToppings, inventory);
  if (!reserved.ok) {
    sendError(req, res, 409, "inventory_unavailable", { missing: reserved.missing });
    return;
  }

  const payment = processPayment(validated.pricing.total, validated.paymentMethod);
  if (!payment.approved) {
    releaseInventory(validated.inventoryToppings, inventory);
    sendError(req, res, 402, "payment_rejected");
    return;
  }

  const createdAt = new Date().toISOString();
  const order = {
    id: uuidv4(),
    orderNumber: buildOrderNumber(),
    customerName: validated.customerName,
    customer: validated.customer,
    size: validated.size,
    crust: validated.crust,
    toppings: validated.displayToppings,
    status: DEFAULT_STATUS,
    items: validated.lineItems,
    notes: validated.notes,
    pricing: validated.pricing,
    total: validated.pricing.total,
    payment,
    statusHistory: [buildStatusHistoryEntry(DEFAULT_STATUS)],
    createdAt,
    updatedAt: createdAt,
    source: validated.mode,
  };

  orders.push(order);
  return res.status(201).json(order);
});

app.patch("/api/orders/:id/status", writeGuards, (req, res) => {
  const order = orders.find((item) => item.id === req.params.id);
  if (!order) {
    sendError(req, res, 404, "order_not_found");
    return;
  }

  const requestedStatus = req.body?.status
    ? normalizeStatus(req.body.status)
    : getNextStatus(order.status);

  if (!requestedStatus) {
    sendError(req, res, 422, "invalid_status_transition");
    return;
  }

  if (!canTransitionStatus(order.status, requestedStatus)) {
    sendError(req, res, 422, "invalid_status_transition");
    return;
  }

  order.status = requestedStatus;
  order.updatedAt = new Date().toISOString();
  order.statusHistory.push(buildStatusHistoryEntry(requestedStatus));
  return res.json(order);
});

app.use((req, res) => {
  sendError(req, res, 404, "route_not_found");
});

/**
 * Returns true when the module is executed directly instead of imported.
 * @returns {boolean}
 */
function isMainModule() {
  return Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === process.argv[1];
}

if (isMainModule()) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Pizzeria app listening on http://127.0.0.1:${PORT}`);
  });
}

export { app };