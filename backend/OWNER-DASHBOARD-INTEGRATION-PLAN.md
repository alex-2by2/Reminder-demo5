# Owner Dashboard Integration Plan

Status: planning only. This document does not create a dashboard, change the public PWA, or authorize a production deployment.

## Verified repository state

- The repository contains the end-user PWA and backend services, but no dedicated owner dashboard application or existing browser caller for the owner API.
- The NestJS owner API is implemented under `/api/v1/admin/*` and protected by Firebase authentication plus the server-side owner allowlist.
- The existing PWA must remain a user-facing application. Do not add owner-only controls to ordinary user screens or rely on a hidden route as an authorization boundary.
- The PWA currently uses Firestore for its user data. This plan does not change that persistence path.

## Recommended dashboard boundary

Build the owner dashboard as a separate, small web client (separate entry point and deployment boundary) rather than mixing owner UI into the end-user PWA bundle. Confirm the desired hosting location and exact NestJS Render URL before implementing API configuration. Never infer the NestJS URL from the legacy Express service URL.

The dashboard may use the existing Firebase Authentication project for sign-in. It must not contain Firebase Admin credentials, MongoDB credentials, service-account private keys, or a hard-coded owner UID/email allowlist.

## Authentication and authorization flow

1. The owner signs in through Firebase client authentication.
2. The dashboard obtains a current Firebase ID token from the signed-in Firebase user; refresh it when needed rather than persisting a long-lived token manually.
3. Each API request sends `Authorization: Bearer <Firebase ID token>` over HTTPS.
4. The NestJS API verifies the token (including revocation) and independently checks the server-side owner allowlist.
5. A signed-in non-owner must receive `403`; a missing or invalid token must receive `401`.
6. Client-side route guards are only a user-experience measure. They are never the security boundary.

## API integration contract

Use the NestJS base URL supplied by the actual staging Render service, then the separately approved production service URL. Append these routes:

- `GET /api/v1/admin/access` — verify dashboard access.
- `GET /api/v1/admin/overview` — summary metrics.
- `GET /api/v1/admin/users?limit=50&pageToken=...` — user pagination.
- `PATCH /api/v1/admin/users/:uid` — enable/disable account; require explicit confirmation in the UI and prevent self-disable.
- `GET /api/v1/admin/crash-reports?limit=50&cursor=...` — paginated crash reports.
- `GET /api/v1/admin/referrals?limit=20` — referral ranking.

The API remains authoritative for pagination limits, validation, account status, and authorization. The UI must handle `401`, `403`, validation errors, rate limiting, and transient server errors without exposing tokens or raw private data in logs.

## Browser and deployment requirements

- Configure CORS only for the exact dashboard origin(s) and required staging/production origins. Do not use wildcard origins with bearer-token requests.
- Keep staging and production Firebase/API configuration separate.
- Use HTTPS only.
- Do not add API keys or secrets to the repository. Firebase web configuration is a client identifier, not a substitute for backend credentials or authorization.
- Do not modify the existing PWA service worker/cache scope until the dashboard hosting layout is chosen and its build output is verified.
- Do not change `render.yaml`, existing Render services, Firebase Security Rules, or production data as part of dashboard planning.

## Required verification before release

- Owner UID allowlisted: dashboard access succeeds.
- Signed-in non-owner: dashboard shows access denied and API returns `403`.
- Missing/expired/revoked token: API returns `401`; dashboard prompts sign-in again.
- Account disable action requires confirmation; self-disable is rejected.
- User list and crash-report pagination work across multiple pages.
- No private Firestore user-document fields or credentials appear in API responses, browser storage, console logs, or network error messages.
- CORS rejects unapproved origins.
- Validate in a separate staging Firebase project and staging MongoDB database before any production connection.

## Decisions still required before dashboard implementation

- Confirm the dashboard hosting location/origin (separate static app recommended).
- Obtain the exact staging NestJS Render URL from the Render service itself.
- Confirm the intended owner account(s) are configured in staging `OWNER_UIDS`.
- Review dashboard screens and operational actions before wiring account-disable functionality.

Until these are confirmed, keep the dashboard as a separate implementation task and keep PR #26 draft.