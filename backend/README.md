# Easy Life Tools — NestJS API

This is a new API service being introduced alongside the existing live PWA and
the existing owner-only Express admin API. It is intentionally isolated under
`backend/`; it does not replace `server/`, alter GitHub Pages, or migrate
Firestore data.

## Current foundation

- NestJS 10 + TypeScript, Node.js 20.
- MongoDB connection is required through `MONGODB_URI`.
- Public health endpoint: `GET /health` (reports only service/database state).
- API prefix: `/api/v1`.
- Protected `GET /api/v1/me` verifies the Firebase ID token and creates or returns the matching MongoDB user profile. The UID is always taken from the verified token, never from request input.
- Firebase Admin token verification service and guard protect authenticated endpoints.
- Helmet, exact browser-origin allowlist, request rate limiting, and strict
  DTO validation defaults are configured.

## Reminder API (staged; not yet connected to the PWA)

All routes below require `Authorization: Bearer <Firebase ID token>`. The API derives
`firebaseUid` only from the verified token and scopes every read, update, delete,
and restore query to that UID.

- `POST /api/v1/reminders` — create a reminder.
- `GET /api/v1/reminders?page=1&limit=50&status=pending` — list active reminders with bounded pagination.
- `GET /api/v1/reminders/:id` — read one owned reminder.
- `PATCH /api/v1/reminders/:id` — update supported reminder fields.
- `DELETE /api/v1/reminders/:id` — soft-delete an owned reminder.
- `PATCH /api/v1/reminders/:id/restore` — restore a soft-deleted reminder.

The initial API contract preserves the PWA's task, notes, local date-time string,
IANA time zone, recurrence, priority, tags, subtasks, category, status, pin,
archive, pre-alarm, assignee, and project fields. Attachment bytes (image/voice
memo) and client integration are deliberately excluded from this phase; they
need a separately designed storage and migration path. No Firestore data is
read, copied, or changed by these endpoints. The PWA continues using its current
Firestore/local-storage path until a later, separately tested cutover.

## Environment

Set these only in the backend host's secret/environment settings:

- `MONGODB_URI` — MongoDB Atlas connection string, least-privilege database user.
- `FIREBASE_PROJECT_ID` — existing Firebase project ID.
- `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` — dedicated Firebase
  service-account credentials. Never commit or paste these into chat.
- `FRONTEND_ORIGINS` — comma-separated exact website origins.
- `PORT` — supplied by Render; defaults to 3001 locally.
- `TRUST_PROXY_HOPS` — optional non-negative integer. Set only after verifying the exact proxy hop count for the deployed host; leave unset otherwise.

Do not reuse a broad Owner/Admin service account if a narrower service account
can be provisioned. Do not add secrets to GitHub files.

## Local development

```sh
npm install
npm run start:dev
```

The service will not start until a valid `MONGODB_URI` is supplied. Firebase
credentials are loaded lazily and are needed only when a protected route uses
the Firebase auth service.

## Safe rollout boundary

1. Build and test this API independently.
2. Deploy it as a separate Render service only after review and explicit
   environment setup.
3. Verify health and protected test endpoints in staging.
4. Integrate one frontend feature at a time behind a feature flag.
5. Back up and verify existing user data before any migration.
6. Keep the current PWA/Firestore path available for rollback until parity is
   demonstrated.

## Render deployment

See [RENDER-DEPLOYMENT.md](./RENDER-DEPLOYMENT.md) for the separate Render
service configuration, required environment variables, and post-deploy checks.

No production database or live user data is changed by this scaffold.

## Optional Render environment-based Owner ID login (under review)

The NestJS owner console can also authenticate with server-side credentials. This
is separate from Firebase Google sign-in; the Firebase path remains available.

Set `OWNER_LOGIN_ID` and `OWNER_PASSWORD_HASH` in the **NestJS Render service**
environment, never in GitHub. The password value must be a salted scrypt hash
in the format `scrypt$16384$8$1$<32 hex salt>$<128 hex digest>`. Generate
it locally with Node.js 20+ using the following command; enter the password
interactively rather than passing it as a shell argument:

```sh
node -e 'const c=require("node:crypto"),r=require("node:readline").createInterface({input:process.stdin,output:process.stdout});r.question("Owner password: ",p=>{const s=c.randomBytes(16);c.scrypt(p,s,64,{N:16384,r:8,p:1,maxmem:67108864},(e,h)=>{r.close();if(e)throw e;console.log("scrypt$16384$8$1$"+s.toString("hex")+"$"+h.toString("hex"));});});'
```

Do not paste the password or its hash into ChatGPT or commit it. The login
endpoint is rate limited and creates a random, revocable MongoDB session. The
browser receives a Secure, HttpOnly, SameSite=Strict cookie. Owner sessions
expire after eight hours. To invalidate all sessions, delete the
`owner_sessions` documents for the configured owner (or rotate the login ID);
rotating only the password does **not** automatically revoke existing sessions.


### Generate the hash on an Android phone (no Termux)

Open the browser utility at `/owner/password-hash.html` over the deployed HTTPS origin. It uses the browser Web Crypto API to derive a PBKDF2-SHA256 hash locally (600,000 iterations); the password is not submitted to any server endpoint. Copy the resulting `pbkdf2$sha256$600000$...` value into the Render `OWNER_PASSWORD_HASH` environment variable. Use a password of at least 12 characters. The page and script are served locally by this backend and have no third-party scripts or network calls. Keep the generated hash private as well.

The password login depends on MongoDB availability and on the exact
`RENDER_EXTERNAL_URL` origin for CSRF protection. Test the complete owner
login and logout flow before enabling this on production.
