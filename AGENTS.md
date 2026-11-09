# Repository instructions

## Application boundaries

| Area | Canonical path | Runtime / owner | Build or deploy boundary |
|---|---|---|---|
| User-facing PWA frontend | `index.html`, `styles.css`, `js/`, root static assets | Browser; Firebase Auth/Firestore client | `node build.js`; GitHub Pages publishes `dist/` |
| **Only backend API** | `backend/` | NestJS + TypeScript + MongoDB; owner console included | Render web service; rootDir `backend` |
| Firebase Cloud Functions | `functions/` | Firebase Functions + Node.js | Firebase deploy pipeline; own package.json |
| Frontend regression tests | `tests/` | Node test runner | Root `npm test` |

## Hard boundaries
- `backend/` is the sole backend runtime. Do not add a second Express/API server or another Render backend service.
- The NestJS API owns product API routes and the Owner Console. Keep owner authentication isolated from consumer Firebase login.
- Never import, bundle, copy, or serve `backend/`, `functions/`, `tests/`, or any `node_modules/` as browser frontend source.
- Do not combine package manifests or lockfiles. Install backend dependencies from `backend/`.
- The browser frontend currently uses Firestore. Do not silently switch persistence or migrate user data; backend integration is a separately reviewed cutover.
- Keep Firebase Security Rules unchanged unless the user explicitly asks to work on them.
- Never commit credentials, .env files, service-account JSON, tokens, or production data.

## Safe change procedure
1. Identify the owning application from the table above before opening files.
2. Read that area's local AGENTS.md and README.md, if present.
3. Make the smallest scoped change; preserve existing behavior and data paths.
4. Run the owning application's build/tests and root frontend tests when relevant.
5. Do not merge or deploy merely because a change builds. Verify CI and review findings first.
6. If a path belongs to multiple runtimes (for example firebase.json or render.yaml), document each consumer and validate all of them.

## Root command meanings
- `npm test`: frontend/root Node regression tests only.
- `npm run build`: browser PWA bundle only.
- `npm run build:backend`: NestJS API only.
- `npm run test:backend`: NestJS API tests only.
- `npm run typecheck:backend`: NestJS TypeScript type check only.
