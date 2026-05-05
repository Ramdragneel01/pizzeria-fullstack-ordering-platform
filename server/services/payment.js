import { randomUUID } from "node:crypto";

const SUPPORTED_METHODS = new Set(["card", "upi", "wallet", "cash"]);

/**
 * Simulates a payment processor response for MVP usage.
 * @param {number} amount - Order total amount.
 * @param {string} method - Payment method text.
 * @returns {{approved: boolean, transactionId: string, amount: number, method: string, processedAt: string}} Result object.
 */
export function processPayment(amount, method) {
  const normalizedMethod = String(method ?? "").trim().toLowerCase();
  const normalizedAmount = Number((Number(amount) || 0).toFixed(2));
  const approved = normalizedAmount > 0 && SUPPORTED_METHODS.has(normalizedMethod);

  return {
    approved,
    transactionId: approved ? `txn_${randomUUID()}` : "",
    amount: normalizedAmount,
    method: normalizedMethod,
    processedAt: new Date().toISOString(),
  };
}
