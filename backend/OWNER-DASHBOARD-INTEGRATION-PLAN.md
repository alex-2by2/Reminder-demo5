# Owner Dashboard Integration

Status: integrated into the unified NestJS backend. The dashboard is served by the same backend process; it is not a separate static application or deployment.

## Runtime

- Static entry point: `backend/public/owner/index.html`
- Liquid Glass styles: `backend/public/owner/styles.css`
- Firebase auth and API client: `backend/public/owner/app.js`
- URL: `/owner/` on the NestJS service's own origin.
- API base: `window.location.origin`; same-origin only, no separate URL setting or CORS dependency for dashboard requests.
- NestJS serves static assets from `backend/public/` using the `/owner/` prefix.

## Dashboard capabilities

- Overview metrics from `GET /api/v1/admin/overview`.
- Users directory with pagination and local filtering from `GET /api/v1/admin/users`.
- Enable/disable account with confirmation through `PATCH /api/v1/admin/users/:uid`.
- Crash reports with cursor pagination from `GET /api/v1/admin/crash-reports`.
- Referral leaderboard from `GET /api/v1/admin/referrals`.
- Firebase Google sign-in and owner access verification through `GET /api/v1/admin/access`.

## Security model

- Firebase client authentication obtains an ID token; each API request sends it as a bearer token.
- NestJS verifies token validity/revocation and checks the server-side owner UID/email allowlist.
- The dashboard never trusts client-side role fields and has no Firebase Admin or MongoDB credentials.
- Browser dashboard and API share one origin. Cross-origin API clients remain subject to the explicit `FRONTEND_ORIGINS` allowlist.
- Helmet CSP permits only the Firebase Auth SDK and required Firebase/Google identity endpoints; popup compatibility is configured through COOP.
- Dashboard assets are not added to the end-user PWA build or service-worker cache.

## Deploy and verify

1. Deploy the existing `easy-life-tools-api` NestJS Render service with this branch after CI passes.
2. Open the exact service URL followed by `/owner/`. Never use the legacy Express service URL.
3. Add the Render hostname to Firebase Authentication authorized domains if it is not already authorized.
4. Confirm staging `OWNER_UIDS` contains the intended owner UID.
5. Test missing/invalid/revoked token, non-owner denial, owner access, dashboard asset loading, overview, user pagination, crash cursor pagination, and account action confirmation.
6. Verify the deployed CSP allows the Firebase Google sign-in flow without relaxing it globally.
7. Keep Firestore-to-MongoDB migration, legacy Express service removal, and production data cutover as separately approved activities.

No dashboard static hosting service or separate dashboard deployment is needed.