# Repository instructions

## Identify the correct application before reading or changing files

This repository contains four separate runtime applications plus static frontend assets. Do not treat the repository root as one Node application.

| Area | Canonical path | Runtime / owner | Build or deploy boundary |
|---|---|---|---|
| User-facing PWA frontend | \`index.html\`, \`styles.css\`, \`js/\`, root static assets | Browser; Firebase Auth/Firestore client | \`node build.js\`; GitHub Pages publishes \`dist/\` |
| New product API | \`backend/\` | NestJS + TypeScript + MongoDB | \`npm run build --prefix backend\`; separate Render service |
| Existing owner/admin API | \`server/\` | Express + JavaScript + Firebase Admin | \`npm start --prefix server\`; existing Render service |
| Firebase Cloud Functions | \`functions/\` | Firebase Functions + Node.js | Firebase deploy pipeline; own package.json |
| Frontend regression tests | \`tests/\` | Node test runner | Root \`npm test\` |

## Hard boundaries
- Never import, bundle, copy, or serve \`backend/\`, \`server/\`, \`functions/\`, \`tests/\`, or any \`node_modules/\` as browser frontend source.
- Never point the existing Express admin Render service at \`backend/\`; the NestJS API is a separate service.
- Do not combine package manifests or lockfiles. Install dependencies from the application directory that owns them.
- Do not move or rename existing source files without updating every import, script reference, build manifest, service-worker precache, CI path, and deployment root in the same reviewed change.
- The browser frontend currently uses Firestore. The NestJS/MongoDB API is staged; do not imply it is the live data source or silently switch persistence.
- Keep Firebase Security Rules unchanged unless the user explicitly asks to work on them.
- Never commit credentials, .env files, service-account JSON, tokens, or production data.

## Safe change procedure
1. Identify the owning application from the table above before opening files.
2. Read that area's local AGENTS.md and README.md, if present.
3. Make the smallest scoped change; preserve existing behavior and data paths.
4. Run the owning application's build/tests and the root frontend tests when relevant.
5. Do not merge or deploy merely because a change builds. Verify CI and review findings first.
6. If a path belongs to multiple runtimes (for example firebase.json or render.yaml), document each consumer and validate all of them.

## Root command meanings
- npm test: frontend/root Node regression tests only.
- npm run build: browser PWA bundle only.
- npm run build:backend: NestJS API only.
- npm run test:backend: NestJS API tests only.
- npm run typecheck:backend: NestJS TypeScript type check only.
