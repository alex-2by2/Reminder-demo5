# NestJS API — Render deployment

This is the unified NestJS product API for authenticated end users and the owner dashboard. The owner console is served by the same service at `/owner/`. The legacy Express service remains separate until a reviewed production cutover.

## Render Blueprint

The root `render.yaml` declares the service:

- Service name: `easy-life-tools-api`
- Root directory: `backend`
- Build command: `npm install --include=dev && npm run build`
- Start command: `npm run start:prod`
- Health check: `/health`

Do not change the existing `reminder-demo5-backend` service; it continues to host the Express admin API.

## Required environment variables

Configure these in the **easy-life-tools-api** Render service settings. Never commit their values:

| Variable | Required value |
|---|---|
| `NODE_ENV` | `production` |
| `FRONTEND_ORIGINS` | Exact cross-origin clients only (for example, the existing PWA origin); the same-origin owner dashboard does not require CORS |
| `MONGODB_URI` | MongoDB Atlas connection string for a dedicated least-privilege database user |
| `FIREBASE_PROJECT_ID` | Existing Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Dedicated Firebase service-account email |
| `FIREBASE_PRIVATE_KEY` | Matching private key; preserve newlines as required by Render |

The frontend origin is the origin only; do not append `/Reminder-demo5/`.

## Trusted proxy and rate-limit configuration

The API currently applies an in-memory Express rate limiter. Express must know which reverse-proxy hops to trust to derive a per-client `req.ip`.

- `TRUST_PROXY_HOPS` is optional and accepts a non-negative integer. It is intentionally not assigned a guessed value in `render.yaml`.
- Do not set `trust proxy` to `true`; trusting the complete `X-Forwarded-For` chain can allow forged client-supplied prefixes to bypass IP-based rate limits.
- Before setting `TRUST_PROXY_HOPS`, deploy to a staging Render service and verify the real request chain. Use temporary staging-only diagnostics or controlled server-side request logging to compare the socket peer, the full `X-Forwarded-For` chain, and the observed client IP.
- Send a staging request with a deliberately forged `X-Forwarded-For` prefix. The resolved `req.ip` must remain the actual client address, not the forged prefix. Repeat with the expected normal request path and confirm the hop count works consistently.
- Set the verified integer in the **easy-life-tools-api** Render environment only after that check passes. Do not expose a public diagnostic endpoint or log full client IPs in production.
- If this value is unset, Express uses the socket peer address. Behind a shared proxy, this can cause multiple clients to share one rate-limit bucket. Treat that as a known staging/release item, not as proof of per-client limiting.
- The limiter stores counts in process memory. If the service is scaled to multiple instances, use a shared rate-limit store before relying on a service-wide limit.

Express proxy-trust behavior is documented at [Express: behind proxies](https://expressjs.com/en/guide/behind-proxies/). Render documents that requests pass through its edge/load-balancing layer and recommends using forwarded client information; the exact trusted hop count must still be verified for this service's actual route.

## Post-deploy verification

1. Wait for the Render deploy to finish successfully.
2. Open the service's generated Render URL followed by `/health`. Expect HTTP 200 and `{"status":"ok","service":"easy-life-tools-api"}`.
3. In a secure authenticated test client, obtain a Firebase ID token and call `GET /api/v1/me` with `Authorization: Bearer <token>`. Expect a profile for the verified Firebase UID.
4. Test reminder create, list, read, update, soft-delete, and restore with a dedicated test account. Verify persisted records in the intended MongoDB database and confirm a second Firebase account cannot read or mutate the first account's reminders.
5. Open `/owner/` on the NestJS service and verify same-origin dashboard assets, Google sign-in, owner access, and API requests. Verify invalid/missing tokens are rejected and browser preflight from any cross-origin PWA origin succeeds.
6. Complete the trusted-proxy verification above before considering IP-based rate limiting correctly configured.

Do not put an ID token, service-account private key, or MongoDB URI in GitHub, source files, screenshots, or chat.

## Owner dashboard

The owner dashboard is packaged under `public/owner/` and served by this same NestJS process at `/owner/`. It calls `/health` and `/api/v1/admin/*` on the same origin; no separate static host or API URL configuration is needed. Open the exact NestJS Render service URL followed by `/owner/`. Add the Render hostname to Firebase Authentication authorized domains if required, and ensure staging `OWNER_UIDS` contains the intended owner UID. Do not use `https://reminder-demo5.onrender.com`, which belongs to the legacy Express service.

Keep current Firestore reads and writes unchanged until the MongoDB integration has passed the tests above and a separate migration/cutover plan has been reviewed.
