# Render Admin API

This Node.js service provides a small owner-only admin API for the app's
Firebase project. It does not replace Firebase Auth, Firestore, or Cloud
Functions, and the browser app does not depend on it.

## Deploy on Render

The repository's `render.yaml` defines the web service. In Render, create a
Blueprint from this repository and set these environment variables for the
service:

- `FRONTEND_ORIGINS`: comma-separated exact origins allowed to call the API,
  such as `https://your-app.web.app,https://your-custom-domain.com`.
- `FIREBASE_PROJECT_ID`: the Firebase project ID.
- `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`: the service account
  email and private key from a Firebase service account with Auth and
  Firestore access. Store the key only as a Render secret. For a multiline
  key, preserve newlines or use literal `\n` sequences.
- `OWNER_UIDS` or `OWNER_EMAILS`: comma-separated owner Firebase UIDs and/or
  email addresses. Email-based access requires a verified Firebase email.

Render supplies `PORT`. The service listens on `0.0.0.0` and exposes `/health`
for Render's health check. Do not commit service-account credentials.

## API

Every `/api/admin/*` endpoint requires `Authorization: Bearer <Firebase ID token>`
from an owner account. Responses use JSON.

- `GET /api/admin/overview`: user, Pro/free, crash report, referral, payment,
  and revenue totals. Revenue is reported in paise from successful payments.
- `GET /api/admin/users?limit=50&pageToken=...`: paginated Firebase Auth users
  with a limited set of account fields.
- `PATCH /api/admin/users/:uid` with `{"disabled": true}` or `false`: disable
  or re-enable a Firebase Auth account.
- `GET /api/admin/crash-reports?limit=50&cursor=...`: newest crash reports,
  with a cursor for the next page.
- `GET /api/admin/referrals?limit=20`: users ranked by referral count.

The API rate-limits requests, validates Firebase ID tokens (including token
revocation), restricts browser origins, and checks the owner allowlist before
accessing admin data. Do not expose the service account key to a browser.