import "server-only";
import { adminDb } from "./firebase-admin";
import { EDITABLE_PAGES } from "../pages";

export async function getPageContent(slug: string): Promise<{ title: string; body: string; custom: boolean } | null> {
  const def = EDITABLE_PAGES[slug];
  if (!def) return null;
  try {
    const snap = await adminDb().collection("pages").doc(slug).get();
    if (snap.exists) return { title: snap.get("title"), body: snap.get("body"), custom: true };
  } catch {
    /* fall back to defaults when the database is unreachable */
  }
  return { title: def.title, body: def.defaultBody, custom: false };
}
