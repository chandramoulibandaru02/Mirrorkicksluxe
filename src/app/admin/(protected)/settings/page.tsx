import { adminDb } from "@/lib/server/firebase-admin";
import { requireAdminPage } from "@/lib/server/session";
import { isTelegramConfigured } from "@/lib/server/telegram";
import { EmptyState } from "@/components/product-ui";
import { SettingsForm } from "@/components/admin/settings-form";
import { DEFAULT_SETTINGS, type StoreSettings } from "@/lib/types";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireAdminPage();
  let settings: StoreSettings | null = null;
  try {
    // Read directly (not the cached storefront copy) so the form always shows what is stored.
    const snap = await adminDb().collection("settings").doc("store").get();
    settings = { ...DEFAULT_SETTINGS, ...((snap.data() as Partial<StoreSettings>) ?? {}) };
  } catch (e) {
    console.error("[admin] settings load failed", e instanceof Error ? e.message : e);
  }
  if (!settings) return <EmptyState title="Could not load settings">Check the Firebase configuration and try again.</EmptyState>;
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-bold">Settings</h1>
      <SettingsForm settings={settings} telegramConfigured={isTelegramConfigured()} />
    </div>
  );
}
