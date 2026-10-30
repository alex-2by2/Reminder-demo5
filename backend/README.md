# Easy Life Tools — NestJS API

This is a new API service being introduced alongside the existing live PWA and
the existing owner-only Express admin API. It is intentionally isolated under
`backend/`; it does not replace `server/`, alter GitHub Pages, or migrate
Firestore data.

## Current foundation

- NestJS 10 + TypeScript, Node.js 20.
- MongoDB connection is required through `MONGODB_URI`.
- Public health endpoint: `GET /health` (reports only service/database state).
- API prefix reserved: `/api/v1`.
- Firebase Admin token verification service and guard are provided for
  protected controllers. Protected business routes are not exposed yet.
- Helmet, exact browser-origin allowlist, request rate limiting, and strict
  DTO validation defaults are configured.

## Environment

Set these only in the backend host's secret/environment settings:

- `MONGODB_URI` — MongoDB Atlas connection string, least-privilege database user.
- `FIREBASE_PROJECT_ID` — existing Firebase project ID.
- `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` — dedicated Firebase
  service-account credentials. Never commit or paste these into chat.
- `FRONTEND_ORIGINS` — comma-separated exact website origins.
- `PORT` — supplied by Render; defaults to 3001 locally.

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

No Render service, Firebase configuration, GitHub Pages workflow, production
database, or live user data is changed by this scaffold.
