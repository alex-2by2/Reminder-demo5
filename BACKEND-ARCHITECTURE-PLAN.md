# Easy Life Tools — Single Backend Architecture

## Decisions

| Area | Decision |
|---|---|
| Existing frontend | Keep current PWA and Firestore behavior unchanged until a separately reviewed cutover |
| Sole backend | NestJS + TypeScript in `backend/`; product API and Owner Console live together |
| Hosting | One Render web service, rootDir `backend` |
| Database | MongoDB Atlas for backend-owned API data |
| Identity | Existing Firebase Authentication; NestJS verifies Firebase ID tokens for consumer API requests |
| Owner Console | NestJS Owner ID + password session; separate from consumer Firebase login |
| Push | Firebase Cloud Messaging; server-side sender remains separately designed |
| Billing | Server-created orders and server-side signature verification before entitlement changes |

## Consolidation rules

- There is exactly one backend runtime: `backend/`. Do not recreate the retired Express API or add a second Render backend service.
- Preserve Firebase Auth, Firestore, and Cloud Functions while the PWA still depends on them.
- MongoDB is the datastore for features explicitly implemented in the NestJS API; do not claim the PWA has migrated from Firestore.
- No big-bang rewrite and no destructive migration.
- Never trust a client-supplied UID, role, Pro entitlement, owner flag, or payment status. Derive identity from a verified Firebase token and privileges from server-controlled records.
- Every user-owned MongoDB query must scope by verified Firebase UID.
- Shared data must use explicit membership records and per-entry ownership.
- Never store service-account credentials, MongoDB credentials, payment secrets, or FCM server credentials in frontend files or Git.

## Current implementation

- NestJS foundation, MongoDB connection, health endpoint, validation, security headers, rate limiting, Firebase token verification.
- Consumer profile and reminder API modules with user-scoped queries and soft-delete/restore.
- Owner ID + password console, secure owner session cookie, admin overview/users/disable/crash reports/referrals routes.
- Owner Console static UI is served by the same NestJS service at `/owner/`.

## Migration principles

- Keep the PWA operational on its current Firestore path until each module has parity and rollback tests.
- Integrate one frontend feature at a time behind a feature flag.
- Back up and verify user data before any migration.
- Verify health, authentication, cross-user isolation, database indexes, and backup/restore before production cutover.
