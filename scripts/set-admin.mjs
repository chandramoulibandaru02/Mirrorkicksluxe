#!/usr/bin/env node
// Grants or revokes the `admin` custom claim for an existing Firebase Auth user.
// This is the ONLY way to create an administrator: the claim can be set solely with the Admin SDK,
// so customers cannot promote themselves from the browser.
//
//   FIREBASE_SERVICE_ACCOUNT_JSON=... node scripts/set-admin.mjs owner@example.com
//   FIREBASE_SERVICE_ACCOUNT_JSON=... node scripts/set-admin.mjs owner@example.com --revoke
//
// The user must already have signed up (e.g. at /signup). After granting, sign out and back in.
import "dotenv/config";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [email, flag] = process.argv.slice(2);
if (!email || email.startsWith("--")) {
  console.error("Usage: node scripts/set-admin.mjs <email> [--revoke]");
  process.exit(1);
}

function credentials() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const j = JSON.parse(text);
    return { projectId: j.project_id, clientEmail: j.client_email, privateKey: String(j.private_key).replace(/\\n/g, "\n") };
  }
  const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail, FIREBASE_PRIVATE_KEY: key } = process.env;
  if (projectId && clientEmail && key) return { projectId, clientEmail, privateKey: key.replace(/\\n/g, "\n") };
  console.error("Set FIREBASE_SERVICE_ACCOUNT_JSON (or FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY).");
  process.exit(1);
}

initializeApp({ credential: cert(credentials()) });
const auth = getAuth();
const user = await auth.getUserByEmail(email).catch(() => null);
if (!user) {
  console.error(`No Firebase user with email ${email}. Ask them to sign up first.`);
  process.exit(1);
}
const revoke = flag === "--revoke";
await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), admin: !revoke });
await auth.revokeRefreshTokens(user.uid); // forces re-authentication so the new claim takes effect
console.log(`${revoke ? "Revoked" : "Granted"} admin for ${email} (uid ${user.uid}). They must sign in again.`);
