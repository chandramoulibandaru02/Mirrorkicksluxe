import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "./firebase-admin";
import { DEFAULT_SETTINGS, type StoreSettings } from "../types";

const cached = unstable_cache(
  async (): Promise<StoreSettings> => {
    const snap = await adminDb().collection("settings").doc("store").get();
    return { ...DEFAULT_SETTINGS, ...((snap.data() as Partial<StoreSettings>) ?? {}) };
  },
  ["store-settings"],
  { tags: ["settings"], revalidate: 120 },
);

/** Never throws: falls back to safe defaults (COD off, no shipping fee) if the database is unreachable. */
export async function getSettings(): Promise<StoreSettings> {
  try {
    return await cached();
  } catch {
    return DEFAULT_SETTINGS;
  }
}
