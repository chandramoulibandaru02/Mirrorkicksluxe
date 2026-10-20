import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    // Accept plain JSON or base64-encoded JSON (easier to store in Vercel).
    const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const json = JSON.parse(text);
    return { projectId: json.project_id, clientEmail: json.client_email, privateKey: String(json.private_key).replace(/\\n/g, "\n") };
  }
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    return { projectId: FIREBASE_PROJECT_ID, clientEmail: FIREBASE_CLIENT_EMAIL, privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") };
  }
  throw new Error("Firebase Admin credentials are not configured (set FIREBASE_SERVICE_ACCOUNT_JSON).");
}

let app: App | undefined;
function getApp(): App {
  if (app) return app;
  app = getApps()[0] ?? initializeApp({ credential: cert(loadServiceAccount()) });
  return app;
}

export const adminAuth = () => getAuth(getApp());
export const adminDb = () => {
  const db = getFirestore(getApp());
  return db;
};

export function isFirebaseConfigured(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY));
}
