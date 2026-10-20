import "server-only";
import { adminDb } from "./firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export function isTelegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sends a plain-text message. Retries on network errors, 429 and 5xx. Never throws; never logs the token. */
export async function sendTelegram(text: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { ok: false, error: "not_configured" };

  let lastError = "unknown";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 3900), disable_web_page_preview: true }),
        signal: ctl.signal,
      });
      if (res.ok) return { ok: true };
      lastError = `http_${res.status}`;
      if (res.status === 429) {
        const body = (await res.json().catch(() => null)) as { parameters?: { retry_after?: number } } | null;
        await sleep(Math.min((body?.parameters?.retry_after ?? 1) * 1000, 4000));
        continue;
      }
      if (res.status < 500) break; // 4xx other than 429: retrying will not help
    } catch (e) {
      lastError = e instanceof Error && e.name === "AbortError" ? "timeout" : "network";
    } finally {
      clearTimeout(timer);
    }
    await sleep(500 * attempt);
  }
  console.error("[telegram] send failed:", lastError);
  return { ok: false, error: lastError };
}

/**
 * Sends a notification at most once per (order, key). The key is claimed in a transaction first,
 * and released again if delivery fails so a later retry can succeed. Failures never propagate.
 */
export async function notifyOrderOnce(orderId: string, key: string, text: string): Promise<void> {
  if (!isTelegramConfigured()) return;
  try {
    const ref = adminDb().collection("orders").doc(orderId);
    const claimed = await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return false;
      const notified = (snap.get("notified") ?? {}) as Record<string, boolean>;
      if (notified[key]) return false;
      tx.update(ref, { [`notified.${key}`]: true });
      return true;
    });
    if (!claimed) return;
    const res = await sendTelegram(text);
    if (!res.ok) await ref.update({ [`notified.${key}`]: FieldValue.delete() });
  } catch (e) {
    console.error("[telegram] notifyOrderOnce failed", e instanceof Error ? e.message : e);
  }
}
