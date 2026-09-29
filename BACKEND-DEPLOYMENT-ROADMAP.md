# Backend Deployment Roadmap

Current stable release: `1.0.0` for the PWA, Render Admin API, and Firebase
Cloud Functions. The PWA is deployed separately from the Render API. User
data remains in Firestore; Render is an optional owner-only admin service,
not a replacement for Firebase Auth, Firestore, or Cloud Functions.

## 1. Prepare a staging environment

- Create a separate Firebase staging project with Auth and Firestore enabled.
- Create a dedicated service account for the Render API and keep its key in
  Render environment secrets only.
- Create a staging Render Blueprint from `render.yaml`; set the Firebase
  project credentials, `FRONTEND_ORIGINS`, and staging owner UID allowlist.
- Confirm Render builds from `server/`, starts with `npm start`, and reports
  healthy at `/health` with version `1.0.0`.
- Keep production Firebase credentials and owner IDs out of staging.

## 2. Verify the release candidate

- Run `npm test`, `node --check server/index.js`, and
  `npm audit --prefix server --omit=dev`.
- Confirm `/api/admin/*` returns `401` without a Firebase ID token and `403`
  for a signed-in non-owner.
- As a staging owner, check overview, user pagination, crash report paging,
  and referral results. Verify user records do not expose private app data.
- Disable and re-enable a disposable staging Auth account; confirm the owner
  account cannot disable itself.
- Verify browser requests from the configured staging origin succeed and an
  unlisted origin is rejected.
- Deploy the PWA and Cloud Functions to the staging Firebase project and
  exercise sign-in, Firestore sync, callable functions, and push handling.

## 3. Promote to production

- Confirm a current Firestore backup/export and document who can roll back.
- Set production Firebase credentials, exact production origins, and owner
  UIDs in Render. Never use email-only ownership unless the email is verified.
- Promote the reviewed Render commit using the Blueprint auto-deploy or a
  manual deploy, then verify `/health` and its release version.
- Deploy the matching PWA and Cloud Functions release through their existing
  Firebase deployment workflows; Render does not host those components.
- Smoke-test owner authentication and read-only admin endpoints before using
  account disable/enable operations.

## 4. Monitor and recover

- Review Render logs and health status after deployment; alert on repeated
  restarts, 5xx responses, or sustained rate limiting.
- Review Firebase Auth/Firestore quotas and billing alongside Render usage.
- For an API regression, redeploy the previous known-good Render commit and
  restore its matching environment configuration. The API does not migrate
  user data, so code rollback does not require a Firestore rollback.
- If credentials may have leaked, revoke the service account key, create a
  replacement, update Render secrets, and redeploy immediately.
- For a PWA release, update `APP_VERSION` and the matching package versions,
  bump `CACHE_VERSION` in `sw.js`, run tests/build checks, and deploy the
  generated Hosting output. The cache bump makes clients replace old cached
  assets on activation.

## Current release boundary

The Render service is an API only; there is no admin dashboard in this
repository, and the end-user PWA does not call the admin API. Keep API calls
owner-authenticated from a trusted admin client. A dashboard or public client
integration should be a separate reviewed release with its own authentication,
authorization, and CORS requirements.