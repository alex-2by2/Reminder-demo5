# Owner Dashboard Integration Plan

Status: first standalone frontend implementation is in `owner-dashboard/`. It is not yet hosted or connected to a staging/production API.

## Implemented frontend

- Separate static application entry: `owner-dashboard/index.html`.
- Liquid Glass responsive UI: `owner-dashboard/styles.css`.
- Firebase Google sign-in and authenticated NestJS API client: `owner-dashboard/app.js`.
- Overview, Users, Crash Reports, Referrals, and Connection & Security screens.
- Overview consumes the existing admin metrics endpoint.
- Users supports paginated loading, client-side filtering, and confirmation before enable/disable.
- Crash reports supports cursor pagination and only displays fields returned by the API.
- Referrals displays the backend leaderboard.
- API base URL is entered by the owner, validated as HTTPS origin-only, and stored locally on that device. The legacy Express Render URL is explicitly rejected.
- Firebase ID tokens are requested from Firebase for each API call and are not manually stored by the dashboard.
- A non-owner is denied by the NestJS owner guard; frontend visibility is not treated as authorization.

## Authentication and API contract

The dashboard uses the existing Firebase project client configuration and Google popup sign-in. Each request sends `Authorization: Bearer <Firebase ID token>` to the NestJS API. The API independently verifies the token and checks the server-side owner allowlist.

Implemented API calls:
- `GET /health`
- `GET /api/v1/admin/access`
- `GET /api/v1/admin/overview`
- `GET /api/v1/admin/users?limit=50&pageToken=...`
- `PATCH /api/v1/admin/users/:uid`
- `GET /api/v1/admin/crash-reports?limit=30&cursor=...`
- `GET /api/v1/admin/referrals?limit=100`

## Required before a live browser connection

1. Deploy this directory as a separate static site; do not include it in the existing end-user PWA bundle or service-worker scope.
2. Add the exact deployed dashboard origin to NestJS `FRONTEND_ORIGINS` for the relevant environment.
3. Add the dashboard hostname to Firebase Authentication authorized domains if required by the hosting domain.
4. Enter the exact staging `easy-life-tools-api` Render URL in the dashboard. Never use `https://reminder-demo5.onrender.com`, which is the legacy Express service.
5. Confirm staging `OWNER_UIDS` contains the intended owner UID.
6. Run owner and non-owner sign-in tests, token expiry/revocation tests, CORS tests, account status action tests, and pagination tests using staging data only.

## Security and data boundaries

- No Firebase Admin credentials, MongoDB URI, service-account private key, or owner allowlist is included in the browser.
- No fake data or fabricated metrics are shown.
- API responses remain the source of truth; private Firestore profile fields are not fetched directly by the dashboard.
- The existing PWA Firestore persistence, Firebase Security Rules, Render services, and production data are unchanged.
- Firestore-to-MongoDB migration and production cutover remain separately reviewed release activities.

## Remaining implementation/release work

- Host the dashboard separately and configure the exact CORS/Firebase authorized origins.
- Verify the deployed dashboard against the staging NestJS service.
- Add automated browser-level tests for sign-in, owner denial, route navigation, API failures, and account-action confirmation.
- Keep PR #26 draft until these gates pass. No production deployment or data cutover is authorized.