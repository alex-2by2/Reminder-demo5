# Easy Life Tools — Backend Architecture Plan

## Decisions

| Area | Decision |
|---|---|
| Existing frontend | Keep current GitHub Pages PWA unchanged during backend build |
| New API | NestJS 10 + TypeScript in `backend/` |
| Hosting | Separate Render web service (not yet configured/deployed) |
| Database | MongoDB Atlas |
| Identity | Existing Firebase Authentication; API verifies Firebase ID tokens |
| Push | Firebase Cloud Messaging; server-side sender to be designed without Cloud Functions |
| Billing | Razorpay last; server-created orders and server-side signature verification |

## Migration principles

- No big-bang rewrite and no destructive migration.
- Existing Express owner Admin API under `server/` remains untouched.
- Existing Firebase Auth remains the identity provider.
- MongoDB becomes the application API's target datastore only after schema,
  ownership, indexes, backup, and migration strategy are reviewed.
- During transition, the existing PWA remains operational on its current
  Firestore path. Each module moves only after parity and rollback tests.
- Never trust a client-supplied UID, role, Pro entitlement, owner flag, or
  payment status. Derive identity from a verified Firebase token and derive
  privileges from server-controlled records.
- Every user-owned MongoDB query must scope by verified Firebase UID.
- Shared data must use explicit membership records and per-entry ownership;
  do not retain the current shared-array mutation pattern.
- Do not store service-account credentials, MongoDB credentials, Razorpay
  secrets, or FCM server credentials in frontend files or Git.

## Phased implementation

### Phase 0 — Foundation (current PR)
- Add an isolated NestJS application.
- Configure MongoDB connection, health endpoint, secure HTTP defaults,
  request validation, rate limiting, and Firebase ID-token verification.
- Do not add business-data endpoints or alter deployment workflows yet.

### Phase 1 — Identity and data contracts
- Define user identity/profile contract and MongoDB schemas.
- Add authenticated `/me` endpoint.
- Add repository/service tests proving one UID cannot read another UID's data.
- Define request IDs, safe error responses, logging, and pagination standards.

### Phase 2 — Core personal data
- Reminder CRUD, habits, recurrence/timezone rules, and soft-delete/restore.
- Server-side validation and ownership checks.
- Offline mutation queue and idempotency strategy before frontend integration.

### Phase 3 — Sync and shared modules
- Versioned sync contract, conflict policy, and multi-device tests.
- Family and Workspace membership/subdocument model with per-member permissions.
- Finance, khata, and other private modules only after access-control tests.

### Phase 4 — Operations
- Notification scheduling/dispatch, admin observability, backups, rate limits,
  quota/cost monitoring, and recovery procedures.

### Phase 5 — Payments
- Razorpay order creation and signature verification on the server.
- Webhook signature verification, idempotency, reconciliation, and entitlement
  updates in server-owned records. No client-only Pro activation.

## Acceptance gates

- Existing production PWA continues working without code/config changes.
- API health and readiness checks pass in staging.
- Invalid, expired, revoked, and missing Firebase tokens are rejected.
- Cross-user data access tests fail closed.
- Database indexes and backup/restore are verified before migration.
- Rollback to the existing Firestore path is documented and tested.
- No production deployment or data migration without explicit approval.
