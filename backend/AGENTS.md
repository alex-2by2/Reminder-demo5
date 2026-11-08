# NestJS API boundary

- This folder is the Easy Life Tools product API only (NestJS + TypeScript + MongoDB).
- Entry point: src/main.ts; root module: src/app.module.ts. The NestJS service serves the owner console at `/owner/` from `public/owner/`.
- Use this folder's package.json, TypeScript config, tests, and dependencies.
- Do not read or import browser modules from ../js/; do not put frontend files here.
- Do not change the existing Express admin API in ../server/ to implement NestJS behavior.
- Keep Firebase identity verification and MongoDB ownership scoping inside this API.
- The PWA still uses Firestore; do not switch or migrate data without a separately reviewed migration plan.
- Build: npm run build; tests: npm test; typecheck: npm run typecheck.
- Never commit secrets or generated dist/ output.
