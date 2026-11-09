# Easy Life Tools — Sole NestJS Backend

This is the only backend service for Easy Life Tools. It contains the consumer API and the Owner Console in one NestJS application and is deployed as the single Render web service. No separate Express admin backend is used.

## Current foundation

- NestJS 10 + TypeScript, Node.js 20.
- MongoDB connection is required through `MONGODB_URI`.
- Public health endpoint: `GET /health`.
- API prefix: `/api/v1`.
- Protected profile and reminder endpoints verify Firebase ID tokens. User identity is derived only from the verified token.
- Owner Console at `/owner/` uses the separate server-side Owner ID/password session; consumer Firebase login is unchanged.
- Helmet, exact browser-origin allowlist, request rate limiting, and strict DTO validation defaults.

## Reminder API

All routes require `Authorization: Bearer <Firebase ID token>`. Reads, updates, deletes, and restores are scoped to the verified Firebase UID.

- `POST /api/v1/reminders` — create.
- `GET /api/v1/reminders?page=1&limit=50&status=pending` — list with bounded pagination.
- `GET /api/v1/reminders/:id` — read one owned reminder.
- `PATCH /api/v1/reminders/:id` — update supported fields.
- `DELETE /api/v1/reminders/:id` — soft-delete.
- `PATCH /api/v1/reminders/:id/restore` — restore.

The PWA continues using its current Firestore/local-storage path until a separately tested cutover. No Firestore data is silently migrated.

## Environment

Set secrets only in the Render service environment:

- `MONGODB_URI` — least-privilege MongoDB Atlas connection string.
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — Firebase Admin credentials.
- `FRONTEND_ORIGINS` — comma-separated exact website origins.
- `OWNER_LOGIN_ID`, `OWNER_PASSWORD` — Owner Console credentials.
- `OWNER_UIDS`, `OWNER_EMAILS` — allowlists protecting Firebase product-owner accounts for admin operations.
- `PORT` — supplied by Render.

Never commit secrets or paste them into chat.

## Local development

```sh
npm install
npm run start:dev
```

A valid `MONGODB_URI` is required. Firebase credentials are needed when a protected consumer route uses Firebase Admin.

## Render

The repository Blueprint defines one web service with rootDir `backend`, build `npm install --include=dev && npm run build`, start `npm run start:prod`, and health check `/health`. Existing production service environment variables are managed separately in Render and must not be overwritten with blank Blueprint values.

## Security and rollout

- Consumer Firebase authentication and Owner Console session authentication are separate.
- Owner session cookie is Secure, HttpOnly, SameSite=Strict, and expires after eight hours.
- Never trust client-supplied identity or privileges.
- Do not migrate Firestore data until backups, parity tests, cross-user isolation tests, and rollback are verified.
