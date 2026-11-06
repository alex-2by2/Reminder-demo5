# Existing Express owner/admin API boundary

- This folder is the existing owner-only Express API deployed as the current admin service.
- Entry point: index.js; dependencies belong to this folder's package manifest and lockfile.
- This is not the NestJS product API. Do not place reminder CRUD/MongoDB NestJS modules here.
- Preserve owner authentication, allowlists, existing routes, and Render service identity.
- Do not change render.yaml rootDir for this service to backend.
- Start: npm start from this directory. Never expose service-account credentials to the browser.
