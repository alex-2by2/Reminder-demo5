# Owner Dashboard Integration

Status: integrated into the unified NestJS backend. The dashboard is served by the same backend process; it is not a separate static application or deployment.

## Runtime

- Static entry point: `backend/public/owner/index.html`
- Liquid Glass styles: `backend/public/owner/styles.css`
- Owner ID session and API client: `backend/public/owner/app.js`
- URL: `/owner/` on the NestJS service's own origin.
- API base: `window.location.origin`; same-origin only, no separate URL setting or CORS dependency for dashboard requests.
- NestJS serves static assets from `backend/public/` using the `/owner/` prefix.

## Dashboard capabilities

- Overview metrics from `GET /api/v1/admin/overview`.
- Users directory with pagination and local filtering from `GET /api/v1/admin/users`.
- Enable/disable account with confirmation through `PATCH /api/v1/admin/users/:uid`.
- Crash reports with cursor pagination from `GET /api/v1/admin/crash-reports`.
- Referral leaderboard from `GET /api/v1/admin/referrals`.
- Owner ID/password session login, restore, and logout; owner access verification through `GET /api/v1/admin/access`.

## Security model

- The owner signs in with `OWNER_LOGIN_ID` and `OWNER_PASSWORD`; the backend issues a Secure, HttpOnly, SameSite=Strict session cookie backed by MongoDB.
- Every owner API request requires the valid Owner ID session. Firebase bearer tokens do not authenticate owner-console requests.
- `OWNER_UIDS` and `OWNER_EMAILS` are protection allowlists for Firebase product-owner accounts that must not be disabled; they do not grant owner-console access.
- The dashboard never trusts client-side role fields and has no Firebase Admin or MongoDB credentials.
- Browser dashboard and API share one origin. Cross-origin API clients remain subject to the explicit `FRONTEND_ORIGINS` allowlist.
- Helmet CSP is configured for the static owner console without loading Firebase Auth or Google identity SDKs.
- Dashboard assets are not added to the end-user PWA build or service-worker cache.

## Deploy and verify

1. Deploy only to the explicitly selected NestJS Render service after CI and independent review pass; do not infer the target from the service name in `render.yaml`.
2. Open that service's exact URL followed by `/owner/`.
3. Configure `OWNER_LOGIN_ID` and `OWNER_PASSWORD` in that service's Render environment settings; never put the password in source code, GitHub, screenshots, or chat.
4. Configure `OWNER_UIDS` and/or `OWNER_EMAILS` with Firebase product-owner accounts that must be protected from disable actions. These values do not authenticate the Owner Console.
5. Test missing/invalid/expired sessions, login, restore, logout, CSRF rejection, dashboard asset loading, overview, user pagination, crash cursor pagination, and account action confirmation.
6. Keep Firestore-to-MongoDB migration, legacy Express service removal, and production data cutover as separately approved activities.

No dashboard static hosting service or separate dashboard deployment is needed.