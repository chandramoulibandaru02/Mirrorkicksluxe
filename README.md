# Footwear Store

A Next.js (App Router, TypeScript, Tailwind) footwear storefront with a server-secured `/admin` dashboard.

- **Auth:** Firebase Authentication. The server verifies an `httpOnly` session cookie on every privileged request.
- **Data:** Cloud Firestore (products, categories, users, carts, orders, settings, editable pages).
- **Images:** Cloudinary. The browser uploads directly with a short-lived signature minted by the server; the API secret never reaches the client.
- **Notifications:** Telegram Bot API, sent from server code only, at most once per order event, never blocking checkout.
- **Hosting:** Vercel.

## Security model

| Concern | How it is enforced |
| --- | --- |
| Admin access | `admin: true` Firebase **custom claim**, settable only with the Admin SDK (`npm run set-admin`). Checked server-side in every `/api/admin/*` handler and every `/admin` page. Visiting `/admin` or signing in grants nothing. |
| Customer data | All reads/writes of carts, orders and profiles run in route handlers that check the session UID. `firestore.rules` additionally denies all client writes and limits client reads to the owner. |
| Prices and stock | Re-read from Firestore inside a transaction at order time. Client-supplied prices are ignored. Stock is decremented in the same transaction, so concurrent buyers cannot oversell. |
| Duplicate submits | Order ID is derived from (user, idempotency key); a repeated submit returns the same order. |
| Payments | Cash on delivery only. An order is never marked paid automatically; the admin records payment, and payment status is tracked separately from fulfilment status. No online gateway is wired up. |
| Telegram | Token and chat ID are server-only env vars. Failures are retried and logged without the token and never fail checkout. Duplicate events are suppressed. |
| CSRF | `SameSite=Lax` cookie plus an Origin check on mutations. |

## Setup

1. **Firebase**
   - Create a project; enable **Authentication → Email/Password** and **Firestore**.
   - Add a Web app and copy its config into the `NEXT_PUBLIC_FIREBASE_*` variables.
   - Generate a service-account key and set `FIREBASE_SERVICE_ACCOUNT_JSON` (raw or base64 JSON).
   - Deploy the rules and index: `npx firebase-tools deploy --only firestore`.
2. **Cloudinary:** set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` and `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.
3. **Telegram (optional):** create a bot with @BotFather, add it to your group, and set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`. Use the test button in the admin dashboard to verify; the response never includes the token.
4. Copy `.env.example` to `.env.local` and fill it in.
5. `npm install && npm run dev`.
6. **Create the first administrator:** sign up as a normal customer at `/signup`, then run
   `FIREBASE_SERVICE_ACCOUNT_JSON=... npm run set-admin -- owner@example.com`
   and sign in again at `/admin/login`.
7. In `/admin`, create categories, add products with images, then fill in store settings (business name, contact details, shipping, enable COD). **Checkout stays disabled until COD is enabled.**
8. Edit `/privacy-policy`, `/terms-and-conditions` and `/contact` in the admin and resolve every `CONFIRM` marker with real business details before launch.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests for pricing and order-status rules |
| `npm run set-admin -- <email> [--revoke]` | Grant or revoke the admin claim |

## Deploying to Vercel with a custom domain

1. Push to GitHub and import the repo in Vercel.
2. Add every variable from `.env.example` for the Production environment (set `NEXT_PUBLIC_SITE_URL` to the final `https://` domain, because it feeds the canonical URLs, sitemap and robots.txt).
3. Project → Settings → Domains → add the domain and create the DNS records Vercel shows. HTTPS is issued automatically.
4. In Firebase Authentication → Settings → Authorized domains, add the custom domain.

## Pre-launch checklist

Tick these only after verifying them against the real deployment:

- [ ] Custom domain resolves over HTTPS; `NEXT_PUBLIC_SITE_URL` matches it
- [ ] Firestore rules and index deployed
- [ ] First admin created; a non-admin account gets 403/redirect on `/admin`
- [ ] Multi-image upload, reorder, primary image and removal work in `/admin`
- [ ] A test order decrements stock; cancelling it restores stock
- [ ] Telegram test message arrives; a new order notification arrives once
- [ ] Legal pages contain no remaining `CONFIRM` markers
- [ ] Favicon shows in the browser tab
- [ ] Mobile layouts checked on a real phone
