# NestJS API boundary

- This folder is the Easy Life Tools product API only (NestJS + TypeScript + MongoDB).
- Entry point: src/main.ts; root module: src/app.module.ts. The NestJS service serves the owner console at `/owner/` from `public/owner/`.
- Use this folder's package.json, TypeScript config, tests, and dependencies.
- Do not read or import browser modules from ../js/; do not put frontend files here.
- Do not introduce a second backend runtime; all product API and owner-console behavior belongs in this NestJS application.
- Keep Firebase identity verification for product/user data where required, but owner-console authorization must use the dedicated Owner ID session only. MongoDB ownership scoping remains mandatory.
- The PWA still uses Firestore; do not switch or migrate data without a separately reviewed migration plan.
- Build: npm run build; tests: npm test; typecheck: npm run typecheck.
- Never commit secrets or generated dist/ output.
