import { test } from "node:test";
import assert from "node:assert/strict";
import { canTransitionPayment, canTransitionStatus, customerCanCancel } from "../src/lib/order-rules.ts";
import { computeTotals, discountPercent, slugify } from "../src/lib/pricing.ts";

test("fulfilment transitions only move forward", () => {
  assert.equal(canTransitionStatus("placed", "confirmed"), true);
  assert.equal(canTransitionStatus("placed", "shipped"), false);
  assert.equal(canTransitionStatus("shipped", "cancelled"), false);
  assert.equal(canTransitionStatus("delivered", "placed"), false);
  assert.equal(canTransitionStatus("cancelled", "placed"), false);
});

test("an unpaid order can never skip straight to refunded", () => {
  assert.equal(canTransitionPayment("pending", "paid"), true);
  assert.equal(canTransitionPayment("pending", "refunded"), false);
  assert.equal(canTransitionPayment("paid", "refunded"), true);
  assert.equal(canTransitionPayment("refunded", "paid"), false);
});

test("customers can cancel only before packing", () => {
  assert.equal(customerCanCancel("placed"), true);
  assert.equal(customerCanCancel("confirmed"), true);
  assert.equal(customerCanCancel("packed"), false);
  assert.equal(customerCanCancel("shipped"), false);
});

test("discount is shown only when the original price is genuinely higher", () => {
  assert.equal(discountPercent(800, 1000), 20);
  assert.equal(discountPercent(1000, 1000), 0);
  assert.equal(discountPercent(1200, 1000), 0);
  assert.equal(discountPercent(800, null), 0);
  assert.equal(discountPercent(0, 1000), 0);
});

test("totals: savings, shipping and free-shipping threshold", () => {
  const settings = { shippingFlat: 99, freeShippingThreshold: 1500 };
  const small = computeTotals([{ price: 800, originalPrice: 1000, quantity: 1 }], settings);
  assert.deepEqual(small, { mrpTotal: 1000, subtotal: 800, savings: 200, shipping: 99, total: 899 });
  const big = computeTotals([{ price: 800, originalPrice: 1000, quantity: 2 }], settings);
  assert.equal(big.shipping, 0);
  assert.equal(big.total, 1600);
  // A bogus original price below the selling price must not create negative savings.
  const bogus = computeTotals([{ price: 800, originalPrice: 500, quantity: 1 }], settings);
  assert.equal(bogus.savings, 0);
  // Threshold 0 means "no free shipping".
  assert.equal(computeTotals([{ price: 5000, originalPrice: null, quantity: 1 }], { shippingFlat: 50, freeShippingThreshold: 0 }).shipping, 50);
});

test("slugify produces url-safe slugs", () => {
  assert.equal(slugify("  Nike Air Zoom — Men's 2  "), "nike-air-zoom-men-s-2");
});
