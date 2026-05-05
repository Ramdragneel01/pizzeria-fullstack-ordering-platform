const SIZE_BASE = {
  small: 7,
  medium: 10,
  large: 13,
};

const CART_TAX_RATE = 0.05;
const CART_DELIVERY_FEE = 49;
const FREE_DELIVERY_THRESHOLD = 500;

export const ORDER_LIFECYCLE = ["placed", "preparing", "baking", "out_for_delivery", "delivered"];
const TERMINAL_STATUSES = new Set(["delivered", "cancelled"]);

function roundCurrency(value) {
  return Number((Number(value) || 0).toFixed(2));
}

/**
 * Calculates order total from selected size and toppings.
 * This remains for backward-compatible requests using size/toppings payload.
 * @param {string} size - Pizza size.
 * @param {string[]} toppings - Topping list.
 * @returns {number} Total amount.
 */
export function calculateTotal(size, toppings) {
  const base = SIZE_BASE[size] ?? SIZE_BASE.medium;
  const toppingsCost = (toppings?.length ?? 0) * 1.5;
  return roundCurrency(base + toppingsCost);
}

/**
 * Calculates cart pricing using subtotal + tax + delivery fee rules.
 * @param {{lineTotal: number}[]} lineItems - Computed line items from catalog selections.
 * @returns {{subtotal: number, tax: number, deliveryFee: number, total: number}}
 */
export function calculateCartPricing(lineItems) {
  const subtotal = roundCurrency(
    (lineItems ?? []).reduce((sum, item) => sum + (Number(item?.lineTotal) || 0), 0),
  );
  const tax = Math.round(subtotal * CART_TAX_RATE);
  const deliveryFee = subtotal === 0 ? 0 : subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : CART_DELIVERY_FEE;
  const total = roundCurrency(subtotal + tax + deliveryFee);

  return { subtotal, tax, deliveryFee, total };
}

/**
 * Normalizes status values to stable lowercase underscore format.
 * @param {string} status - Input status value.
 * @returns {string}
 */
export function normalizeStatus(status) {
  return String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/**
 * Returns lifecycle status to move to when no explicit status is provided.
 * @param {string} currentStatus - Existing status.
 * @returns {string | null}
 */
export function getNextStatus(currentStatus) {
  const normalizedCurrent = normalizeStatus(currentStatus);
  const currentIndex = ORDER_LIFECYCLE.indexOf(normalizedCurrent);

  if (currentIndex === -1 || currentIndex >= ORDER_LIFECYCLE.length - 1) {
    return null;
  }

  return ORDER_LIFECYCLE[currentIndex + 1];
}

/**
 * Returns true if status transition is allowed for order lifecycle.
 * @param {string} currentStatus - Existing status value.
 * @param {string} nextStatus - Proposed status value.
 * @returns {boolean} Transition validity.
 */
export function canTransitionStatus(currentStatus, nextStatus) {
  const current = normalizeStatus(currentStatus);
  const next = normalizeStatus(nextStatus);

  if (!current || !next || current === next) {
    return false;
  }

  if (TERMINAL_STATUSES.has(current)) {
    return false;
  }

  if (next === "cancelled") {
    return true;
  }

  const currentIndex = ORDER_LIFECYCLE.indexOf(current);
  const nextIndex = ORDER_LIFECYCLE.indexOf(next);

  if (currentIndex === -1 || nextIndex === -1) {
    return false;
  }

  return nextIndex >= currentIndex;
}

/**
 * Builds stable order number string.
 * @param {Date} [date] - Optional date for deterministic tests.
 * @returns {string}
 */
export function buildOrderNumber(date = new Date()) {
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `PIZ-${stamp}-${randomPart}`;
}
