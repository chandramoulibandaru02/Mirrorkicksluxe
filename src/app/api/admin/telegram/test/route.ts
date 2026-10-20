import { handle, json, assertSameOrigin } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { isTelegramConfigured, sendTelegram } from "@/lib/server/telegram";

/** Sends a harmless test message. The response never contains the token or chat id. */
export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  await requireAdmin();
  if (!isTelegramConfigured()) return json({ configured: false, ok: false, message: "TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are not set on the server." });
  const res = await sendTelegram("Test notification: Telegram is connected to the store.");
  return json({ configured: true, ok: res.ok, message: res.ok ? "Test message sent." : `Telegram rejected or could not receive the message (${res.error}).` });
});
