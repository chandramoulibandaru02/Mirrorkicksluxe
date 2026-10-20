import type { OrderStatus, PaymentStatus } from "./types";

export const FULFILLMENT_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ["paid", "failed"],
  failed: ["pending", "paid"],
  paid: ["refunded"],
  refunded: [],
};

export function canTransitionStatus(from: OrderStatus, to: OrderStatus): boolean {
  return FULFILLMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return PAYMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Customers may cancel only before the order is packed. */
export function customerCanCancel(status: OrderStatus): boolean {
  return status === "placed" || status === "confirmed";
}

export const ORDER_STATUSES: OrderStatus[] = ["placed", "confirmed", "packed", "shipped", "delivered", "cancelled"];
export const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "paid", "failed", "refunded"];
