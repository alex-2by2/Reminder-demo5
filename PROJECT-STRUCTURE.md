# Easy Life Tools — repository map

## Runtime boundaries

### 1. Browser PWA — root + js/
- Entry: index.html; styles: styles.css; browser modules: js/00-foundation/ through js/09-new-features/
- Static/PWA assets: manifest.json, sw.js, icons, legal HTML
- Build manifest: FILES_IN_ORDER in build.js; output: generated dist/
- Current auth/data: Firebase Auth, Firestore, local storage, FCM

### 2. Sole backend — backend/
- Entry: backend/src/main.ts; root module: backend/src/app.module.ts
- Runtime: Node 20, NestJS 10, TypeScript, MongoDB/Mongoose
- Includes consumer API and Owner Console at /owner/
- Build output: backend/dist/ (generated; never frontend input)
- Deploy: the single Render web service, root directory backend
- The retired Express service under server/ is removed; do not recreate a second backend.

### 3. Firebase Cloud Functions — functions/
- Entry: functions/index.js
- Runtime: Node 20, Firebase Functions, Firebase Admin, Razorpay
- Dependencies and lockfile belong only to this directory
- Deploy separately through Firebase tooling

### 4. Tests and automation
- tests/: frontend/root Node regression tests
- backend/**/*.spec.ts: NestJS unit tests
- .github/workflows/ci.yml: verifies root frontend and the sole NestJS backend
- .github/workflows/static.yml: builds and deploys only generated PWA dist/

## Dependency and file ownership

Each runtime owns its own package.json, dependency tree, and lockfile. Do not add a root workspace that hoists or mixes backend dependencies into the browser application. Root package scripts are shortcuts only.

## Change checklist
- [ ] Correct application identified
- [ ] No source moved across runtime boundaries
- [ ] Frontend script order matches build.js exactly
- [ ] Service-worker precache references existing frontend assets
- [ ] Owning app build and tests pass
- [ ] CI and review findings checked
- [ ] No production deploy or data migration implied
