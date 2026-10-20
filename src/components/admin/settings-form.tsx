"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { api, type ApiError } from "@/lib/client-api";
import type { StoreSettings } from "@/lib/types";

const num = (s: string) => Number.parseInt(s || "0", 10) || 0;

export function SettingsForm({ settings, telegramConfigured }: { settings: StoreSettings; telegramConfigured: boolean }) {
  const router = useRouter();
  const [v, setV] = useState({
    businessName: settings.businessName,
    supportEmail: settings.supportEmail,
    phone: settings.phone,
    address: settings.address,
    codEnabled: settings.codEnabled,
    shippingFlat: String(settings.shippingFlat),
    freeShippingThreshold: String(settings.freeShippingThreshold),
    lowStockThreshold: String(settings.lowStockThreshold),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [tg, setTg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (k: keyof typeof v, value: string | boolean) => setV((cur) => ({ ...cur, [k]: value }));
  const digits = (k: "shippingFlat" | "freeShippingThreshold" | "lowStockThreshold") => (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value.replace(/\D/g, ""));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setErrors({});
    try {
      await api("/api/admin/settings", {
        method: "PUT",
        body: {
          businessName: v.businessName,
          supportEmail: v.supportEmail,
          phone: v.phone,
          address: v.address,
          codEnabled: v.codEnabled,
          shippingFlat: num(v.shippingFlat),
          freeShippingThreshold: num(v.freeShippingThreshold),
          lowStockThreshold: num(v.lowStockThreshold),
        },
      });
      setMessage({ ok: true, text: "Settings saved." });
      router.refresh();
    } catch (err) {
      const e2 = err as ApiError;
      if (e2.fields) setErrors(e2.fields);
      setMessage({ ok: false, text: e2.message });
    } finally {
      setSaving(false);
    }
  }

  async function testTelegram() {
    setTesting(true);
    setTg(null);
    try {
      const r = await api<{ ok: boolean; message: string }>("/api/admin/telegram/test", { method: "POST", body: {} });
      setTg({ ok: r.ok, text: r.message });
    } catch (err) {
      setTg({ ok: false, text: (err as ApiError).message });
    } finally {
      setTesting(false);
    }
  }

  const err = (k: string) => (errors[k] ? <p className="mt-1 text-sm text-danger">{errors[k]}</p> : null);

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="space-y-6" noValidate>
        <section className="card space-y-4 p-4 sm:p-5" aria-labelledby="biz-h">
          <h2 id="biz-h" className="text-base font-bold">Business details</h2>
          <p className="text-sm text-muted">Shown on the Contact page and in the footer. Leave a field empty to hide it.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="s-name" className="label">Business name</label>
              <input id="s-name" className="field" value={v.businessName} onChange={(e) => set("businessName", e.target.value)} maxLength={80} />
              {err("businessName")}
            </div>
            <div>
              <label htmlFor="s-email" className="label">Support email</label>
              <input id="s-email" type="email" className="field" value={v.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} />
              {err("supportEmail")}
            </div>
            <div>
              <label htmlFor="s-phone" className="label">Support phone</label>
              <input id="s-phone" type="tel" className="field" value={v.phone} onChange={(e) => set("phone", e.target.value)} maxLength={30} />
              {err("phone")}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="s-addr" className="label">Business address</label>
              <textarea id="s-addr" className="field min-h-20" value={v.address} onChange={(e) => set("address", e.target.value)} maxLength={300} />
              {err("address")}
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-4 sm:p-5" aria-labelledby="ship-h">
          <h2 id="ship-h" className="text-base font-bold">Checkout and delivery</h2>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1 size-4 accent-brand" checked={v.codEnabled} onChange={(e) => set("codEnabled", e.target.checked)} />
            <span>
              <strong>Accept cash on delivery orders</strong>
              <br />
              <span className="text-muted">Customers cannot place orders while this is off. No online payment gateway is configured, so COD is the only payment method.</span>
            </span>
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="s-ship" className="label">Delivery charge (₹)</label>
              <input id="s-ship" className="field" inputMode="numeric" value={v.shippingFlat} onChange={digits("shippingFlat")} />
              {err("shippingFlat")}
            </div>
            <div>
              <label htmlFor="s-free" className="label">Free delivery above (₹)</label>
              <input id="s-free" className="field" inputMode="numeric" value={v.freeShippingThreshold} onChange={digits("freeShippingThreshold")} aria-describedby="s-free-h" />
              <p id="s-free-h" className="mt-1 text-xs text-muted">0 means delivery is never free.</p>
              {err("freeShippingThreshold")}
            </div>
            <div>
              <label htmlFor="s-low" className="label">Low-stock alert at (units)</label>
              <input id="s-low" className="field" inputMode="numeric" value={v.lowStockThreshold} onChange={digits("lowStockThreshold")} aria-describedby="s-low-h" />
              <p id="s-low-h" className="mt-1 text-xs text-muted">Sends a Telegram alert when a variant drops to this level. 0 turns alerts off.</p>
              {err("lowStockThreshold")}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <Loader2 className="animate-spin" size={18} aria-hidden />} Save settings
          </button>
          {message && <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-ok" : "text-danger"}`}>{message.text}</p>}
        </div>
      </form>

      <section className="card space-y-3 p-4 sm:p-5" aria-labelledby="tg-h">
        <h2 id="tg-h" className="text-base font-bold">Telegram notifications</h2>
        <p className="text-sm text-muted">
          {telegramConfigured
            ? "A bot token and chat ID are configured on the server. The values are never shown here."
            : "Not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in the server environment, then redeploy."}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-outline" onClick={testTelegram} disabled={testing}>
            {testing ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Send size={18} aria-hidden />} Send test message
          </button>
          {tg && <p role="status" className={`text-sm ${tg.ok ? "text-ok" : "text-danger"}`}>{tg.text}</p>}
        </div>
      </section>
    </div>
  );
}
