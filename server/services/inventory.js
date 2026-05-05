/**
 * Normalizes inventory key text to stable lookup shape.
 * @param {string} value
 * @returns {string}
 */
export function normalizeInventoryKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/**
 * Creates default inventory map from topping catalog.
 * @param {{tname?: string}[]} toppings
 * @param {number} [defaultQuantity]
 * @returns {Record<string, number>}
 */
export function seedInventoryFromCatalog(toppings, defaultQuantity = 30) {
  const inventory = {};

  for (const topping of toppings ?? []) {
    const key = normalizeInventoryKey(topping?.tname);
    if (!key) {
      continue;
    }

    if (!(key in inventory)) {
      inventory[key] = defaultQuantity;
    }
  }

  return inventory;
}

/**
 * Verifies topping inventory and decrements stock when an order is accepted.
 * @param {string[]} toppings - Requested topping list.
 * @param {Record<string, number>} inventory - Mutable inventory map.
 * @returns {{ok: boolean, missing: string[]}} Result object.
 */
export function reserveInventory(toppings, inventory) {
  const requested = new Map();

  for (const topping of toppings ?? []) {
    const key = normalizeInventoryKey(topping);
    if (!key) {
      continue;
    }
    requested.set(key, (requested.get(key) ?? 0) + 1);
  }

  const missing = [];
  for (const [key, quantity] of requested.entries()) {
    if (!inventory[key] || inventory[key] < quantity) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    return { ok: false, missing };
  }

  for (const [key, quantity] of requested.entries()) {
    inventory[key] -= quantity;
  }

  return { ok: true, missing: [] };
}

/**
 * Rolls back reserved quantities when an order fails after reservation.
 * @param {string[]} toppings
 * @param {Record<string, number>} inventory
 * @returns {void}
 */
export function releaseInventory(toppings, inventory) {
  for (const topping of toppings ?? []) {
    const key = normalizeInventoryKey(topping);
    if (!key) {
      continue;
    }
    inventory[key] = (inventory[key] ?? 0) + 1;
  }
}

/**
 * Returns a copy of available inventory values.
 * @param {Record<string, number>} inventory - Inventory map.
 * @returns {Record<string, number>} Snapshot object.
 */
export function snapshotInventory(inventory) {
  const snapshot = {};
  for (const key of Object.keys(inventory)) {
    snapshot[key] = inventory[key];
  }
  return snapshot;
}
