# Unified NestJS API: owner route contract

This document records the staged route contract for consolidating user and owner
administration APIs into one NestJS service. It does not authorize production
cutover, Firestore migration, or deletion of the legacy Express service.

## Service boundary

- One NestJS API will serve authenticated end users and the owner dashboard.
- User routes require a valid Firebase ID token and must scope every user-owned
  MongoDB record to the verified Firebase UID.
- Owner routes require both Firebase authentication and the server-side
  owner allowlist guard. Client-supplied role/profile fields are never authority.
- MongoDB is the intended application data store for the NestJS API.
- Existing PWA Firestore reads/writes remain authoritative until a separately
  reviewed migration, parity test, backup, and cutover are approved.
- Firebase Cloud Functions remain separate for scheduled push delivery and
  callable functions until each responsibility has a reviewed replacement.

## Current NestJS owner routes

All routes include the global `/api/v1` prefix and require
`Authorization: Bearer <Firebase ID token>` from an allowlisted owner.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/v1/admin/access` | Confirm owner access |
| GET | `/api/v1/admin/overview` | User, plan, crash, referral and payment summary |
| GET | `/api/v1/admin/users` | Paginated Firebase Auth users with limited profile fields |
| PATCH | `/api/v1/admin/users/:uid` | Enable or disable a Firebase Auth account |
| GET | `/api/v1/admin/crash-reports` | Paginated crash reports |
| GET | `/api/v1/admin/referrals` | Referral ranking |

Owner identity is established only by `OWNER_UIDS` or a Firebase-verified
email in `OWNER_EMAILS`. UID allowlisting is preferred. Email allowlisting
requires the verified-email claim.

## Legacy compatibility map

The existing Express service exposes `/api/admin/*`. The equivalent NestJS
routes are under `/api/v1/admin/*`:

| Legacy Express | Unified NestJS |
| --- | --- |
| `GET /api/admin/overview` | `GET /api/v1/admin/overview` |
| `GET /api/admin/users` | `GET /api/v1/admin/users` |
| `PATCH /api/admin/users/:uid` | `PATCH /api/v1/admin/users/:uid` |
| `GET /api/admin/crash-reports` | `GET /api/v1/admin/crash-reports` |
| `GET /api/admin/referrals` | `GET /api/v1/admin/referrals` |

No browser admin dashboard caller was found during the current repository
search. The existing end-user PWA does not call the admin endpoints. A trusted
owner dashboard/client must be implemented or identified and reviewed before
these endpoints are wired into a browser UI.

## Release gates before consolidation

1. Pass backend build, unit tests, existing application tests, syntax checks,
   and production bundle build in CI.
2. Add controller-level tests proving unauthenticated and non-owner requests
   cannot reach owner handlers.
3. Validate all owner list/detail responses against the legacy response
   contract and ensure no private user document fields are exposed.
4. Complete the frontend owner dashboard/client and verify exact API origin,
   CORS allowlist, token refresh, and error handling.
5. Deploy and exercise the NestJS API in a separate staging environment with
   staging Firebase and MongoDB credentials.
6. Plan and verify MongoDB data parity/migration separately; do not mix that
   change into the owner API release.
7. Obtain explicit approval before production API URL changes, Render service
   deletion, Firestore write cutover, or any production data migration.

## Current safety boundary

The existing Express Render service and the NestJS Render service remain
separate until the new service passes staging verification and production
cutover is explicitly approved. Do not remove the Express service from
`render.yaml` during this preparation phase: Blueprint synchronization could
otherwise affect the live service.
