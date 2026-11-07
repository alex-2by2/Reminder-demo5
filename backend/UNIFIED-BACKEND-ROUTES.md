# Unified NestJS API: user and owner route contract

This document records the staged route contract for one NestJS service serving authenticated users and the owner dashboard. It does not authorize production cutover, Firestore migration, or deletion of the legacy Express service.

## Service boundary

- One NestJS API serves authenticated end users and the separate owner dashboard.
- User routes require a valid Firebase ID token and scope every user-owned MongoDB record to the verified Firebase UID.
- Owner routes require Firebase authentication plus the server-side owner allowlist guard. Client-supplied role/profile fields are never authority.
- MongoDB is the intended application data store for NestJS routes.
- Existing PWA Firestore reads/writes remain authoritative until a separately reviewed migration, parity test, backup, and cutover are approved.
- Firebase Cloud Functions remain separate for scheduled push delivery and callable functions until each responsibility has a reviewed replacement.
- The owner dashboard is a separate static client in `owner-dashboard/`; it must not be bundled into the end-user PWA.

## User routes

All routes require `Authorization: Bearer <Firebase ID token>`. Ownership is taken only from the verified token UID.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/v1/me` | Create or return signed-in user's MongoDB profile |
| POST | `/api/v1/reminders` | Create a reminder |
| GET | `/api/v1/reminders` | List owned active reminders |
| GET | `/api/v1/reminders/:id` | Read one owned reminder |
| PATCH | `/api/v1/reminders/:id` | Update one owned reminder |
| DELETE | `/api/v1/reminders/:id` | Soft-delete one owned reminder |
| PATCH | `/api/v1/reminders/:id/restore` | Restore one owned reminder |

## Owner routes

All routes use the global `/api/v1` prefix and require a Firebase ID token from an allowlisted owner.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/v1/admin/access` | Confirm owner access |
| GET | `/api/v1/admin/overview` | User, plan, crash, referral and payment summary |
| GET | `/api/v1/admin/users` | Paginated Firebase Auth users with limited profile fields |
| PATCH | `/api/v1/admin/users/:uid` | Enable or disable a Firebase Auth account |
| GET | `/api/v1/admin/crash-reports` | Paginated crash reports |
| GET | `/api/v1/admin/referrals` | Referral ranking |

Owner identity is established only by `OWNER_UIDS` or a Firebase-verified email in `OWNER_EMAILS`. UID allowlisting is preferred.

## Dashboard integration

The standalone dashboard currently calls the owner routes above using Firebase Google sign-in and the current ID token. It does not call Firestore directly. The owner must configure the exact HTTPS NestJS API origin in Connection & Security. The dashboard rejects the legacy Express URL.

The dashboard hosting origin must be added explicitly to NestJS `FRONTEND_ORIGINS` and Firebase Authentication authorized domains before browser sign-in/API calls can be validated in staging. The dashboard is not yet deployed; no production URL is assumed.

## Legacy compatibility

The existing Express service exposes `/api/admin/*`; equivalent NestJS routes are under `/api/v1/admin/*`. The legacy Express service remains deployed separately until staging verification and explicit production cutover approval.

## Release gates

1. CI passes backend typecheck/build/tests and existing application checks.
2. HTTP guard tests prove missing/invalid tokens and non-owners cannot access owner handlers.
3. Owner list/detail responses remain allowlisted and pagination is tested.
4. Deploy the dashboard separately; verify exact CORS origin, Firebase authorized domain, token refresh, and error handling.
5. Exercise the NestJS API and dashboard in staging with staging Firebase/MongoDB credentials.
6. Review MongoDB data parity/migration separately.
7. Obtain explicit approval before production API URL changes, Render service deletion, Firestore write cutover, or any production data migration.

## Safety boundary

Do not modify the PWA Firestore persistence, Firebase Security Rules, existing Express Render service, or production data as part of dashboard integration. Do not remove the Express service from `render.yaml` before a separately approved cutover.