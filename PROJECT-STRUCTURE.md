# Easy Life Tools — repository map

This file is the quick routing index for humans, coding agents, CI, and build tooling.

## Runtime boundaries

### 1. Browser PWA — root + js/
- Entry: index.html
- Styles: styles.css
- Browser modules: js/00-foundation/ through js/09-new-features/
- Static/PWA assets: root manifest.json, sw.js, icons, legal HTML
- Build manifest: FILES_IN_ORDER in build.js
- Output: generated dist/ (never hand-edit or commit generated output)
- Data/auth today: Firebase Auth, Firestore, local storage, FCM

### 2. NestJS product API — backend/
- Entry: backend/src/main.ts
- Root module: backend/src/app.module.ts
- Runtime: Node 20, NestJS 10, TypeScript, MongoDB/Mongoose
- Build output: backend/dist/ (generated; never frontend input)
- Deploy: independent Render service with root directory backend
- Status: staged API; frontend persistence has not been cut over from Firestore

### 3. Existing owner/admin API — server/
- Entry: server/index.js
- Runtime: Node 20, Express, Firebase Admin
- Role: existing owner-only administrative endpoints
- Deploy: existing Render service with root directory server
- This is not the NestJS API and must remain independently deployable

### 4. Firebase Cloud Functions — functions/
- Entry: functions/index.js
- Runtime: Node 20, Firebase Functions, Firebase Admin, Razorpay
- Dependencies and lockfile belong only to this directory
- Deploy separately through Firebase tooling

### 5. Tests and automation
- tests/: frontend/root Node regression tests
- backend/**/*.spec.ts: NestJS unit tests
- .github/workflows/ci.yml: verification of all app boundaries
- .github/workflows/static.yml: builds and deploys only generated PWA dist/

## Dependency and file ownership
Each runtime owns its own package.json, dependency tree, and lockfile. Do not add a root workspace that hoists or mixes server dependencies into the browser application. Root package scripts are shortcuts only; they do not change ownership.

## Change checklist
- [ ] Correct application identified
- [ ] No source moved across runtime boundaries
- [ ] Frontend script order matches build.js exactly
- [ ] Service-worker precache references existing frontend assets
- [ ] Owning app build and tests pass
- [ ] CI and review findings checked
- [ ] No production deploy or data migration implied
