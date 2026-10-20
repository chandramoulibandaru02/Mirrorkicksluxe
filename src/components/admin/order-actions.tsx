
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api, type ApiError } from "@/lib/client-api";
import { FULFILLMENT_TRANSITIONS, PAYMENT_TRANSITIONS } from "@/lib/order-rules";
import type { Order } from "@/lib/types";

const FULFILMENT_LABEL: Record<string, string> = {
  confirmed: "Confirm order",
  packed: "Mark as packed",
  shipped: "Mark as shipped",
  delivered: "Mark as delivered",
  cancelled: "Cancel order",
};

const PAYMENT_LABEL: Record<string, string> = {
  paid: "Record payment received",
  failed: "Mark payment failed",
  pending: "Set back to pending",
  refunded: "Mark as refunded",
};

export function OrderActions({ order }: { order: Order }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const nextStatus = FULFILLMENT_TRANSITIONS[order.status];
  const nextPayment = PAYMENT_TRANSITIONS[order.paymentStatus];
  const orderClosed = nextStatus.length === 0 && nextPayment.length === 0;

  async function deleteOrder() {
    if (
      !window.confirm(
        `Permanently delete order ${order.id}? This cannot be undone.`
      )
    ) {
      return;
    }

    setBusy("delete");
    setError("");

    try {
      await api(`/api/admin/orders/${order.id}`, { method: "DELETE" });
      router.push("/admin/orders");
      router.refresh();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  }

  async function apply(
    key: string,
    body: { status?: string; paymentStatus?: string },
    confirmText?: string
  ) {
    if (confirmText && !window.confirm(confirmText)) return;

    setBusy(key);
    setError("");

    try {
      await api(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        body: {
          ...body,
          ...(note.trim() ? { note: note.trim() } : {}),
        },
      });

      setNote("");
      router.refresh();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p
          role="alert"
          className="rounded-[3px] border border-danger bg-red-50 p-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {!orderClosed && (
        <>
          <div>
            <label htmlFor="o-note" className="label">
              Note for the history (optional)
            </label>
            <input
              id="o-note"
              className="field"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              placeholder="e.g. courier name and tracking number"
            />
          </div>

          {nextStatus.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold">Fulfilment</h3>
              <div className="flex flex-wrap gap-2">
                {nextStatus.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy !== null}
                    className={`btn btn-sm ${
                      s === "cancelled" ? "btn-danger" : "btn-primary"
                    }`}
                    onClick={() =>
                      void apply(
                        `s-${s}`,
                        { status: s },
                        s === "cancelled"
                          ? `Cancel order ${order.id}? Reserved stock is returned to inventory. This cannot be undone.`
                          : undefined
                      )
                    }
                  >
                    {busy === `s-${s}` && (
                      <Loader2 className="animate-spin" size={16} aria-hidden />
                    )}{" "}
                    {FULFILMENT_LABEL[s] ?? s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {nextPayment.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold">Payment</h3>
              <div className="flex flex-wrap gap-2">
                {nextPayment.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy !== null}
                    className="btn btn-outline btn-sm"
                    onClick={() =>
                      void apply(
                        `p-${s}`,
                        { paymentStatus: s },
                        s === "paid"
                          ? `Confirm that the full payment for ${order.id} has actually been received?`
                          : s === "refunded"
                            ? `Mark ${order.id} as refunded? Make sure the refund has been sent.`
                            : undefined
                      )
                    }
                  >
                    {busy === `p-${s}` && (
                      <Loader2 className="animate-spin" size={16} aria-hidden />
                    )}{" "}
                    {PAYMENT_LABEL[s] ?? s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {orderClosed && (
        <p className="text-sm text-muted">
          This order is closed; no further status changes are available.
        </p>
      )}

      <div className="border-t border-line pt-4">
        <button
          type="button"
          disabled={busy !== null}
          className="btn btn-danger btn-sm"
          onClick={() => void deleteOrder()}
        >
          {busy === "delete" && (
            <Loader2 className="animate-spin" size={16} aria-hidden />
          )}{" "}
          Delete order permanently
        </button>
      </div>
    </div>
  );
}
