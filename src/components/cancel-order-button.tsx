"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function cancel() {
    if (!window.confirm("Cancel this order? This cannot be undone.")) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
    if (!res.ok) {
      setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Could not cancel the order.");
      setBusy(false);
      return;
    }
    router.refresh();
    setBusy(false);
  }
  return (
    <div>
      <button type="button" onClick={cancel} disabled={busy} className="btn btn-danger btn-sm">
        {busy && <Loader2 size={16} className="animate-spin" aria-hidden />} Cancel order
      </button>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
}
