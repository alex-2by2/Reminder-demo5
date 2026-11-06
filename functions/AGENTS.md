# Firebase Cloud Functions boundary

- This folder contains deployable Firebase Cloud Functions only.
- Entry point: index.js; dependencies and lockfile are owned by this folder.
- Do not import browser-only code from ../js/ or NestJS modules from ../backend/.
- Keep scheduled notification and payment verification logic server-side.
- Validate functions with this folder's Node 20 runtime and package scripts before deployment.
- Do not deploy or alter Firebase Security Rules as part of unrelated functions work.
