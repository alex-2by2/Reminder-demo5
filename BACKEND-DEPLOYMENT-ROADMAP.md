# Easy Life Tools — Backend Deployment Roadmap

## Single-backend decision

The only backend runtime is the NestJS application in `backend/`. The former Express API in `server/` has been retired. The NestJS application hosts consumer API routes and the Owner Console together on one Render service.

The PWA and Firebase Cloud Functions remain separate application runtimes. The PWA continues using Firestore; consolidating backend services does not migrate user data or change Firebase Auth.

## Production service

- Render service: `Reminder-demo5`
- Repository: `alex-2by2/Reminder-demo5`
- Branch: `main`
- Root directory: `backend`
- Build: `npm install --include=dev && npm run build`
- Start: `npm run start:prod`
- Health check: `/health`

Existing production secrets are managed in Render and must not be overwritten with blank values from a Blueprint sync.

## Release verification

- Run root PWA tests and bundle build.
- Run NestJS type-check, build, and unit tests.
- Verify `/health` and protected consumer endpoints after deployment.
- Verify Owner ID/password login, session expiry/logout, and admin routes.
- Verify invalid, expired, revoked, and missing Firebase tokens are rejected.
- Verify cross-user data access is denied.
- Review Render logs and deployment events for restarts or failed health checks.

## Data and rollback boundary

- Firestore remains the PWA's current data source.
- Do not migrate or delete production data as part of backend consolidation.
- Back up and verify data before any future Firestore-to-MongoDB migration.
- Integrate frontend modules one at a time only after parity and rollback tests.
- For an API regression, redeploy the previous known-good Render commit and restore its matching environment configuration.
- Keep Firebase Cloud Functions deployment independent from the Render backend deployment.
