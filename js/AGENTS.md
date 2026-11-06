# Browser frontend modules boundary

- Files in this folder execute in the browser as classic deferred scripts, not Node modules.
- The canonical browser entry point is root index.html.
- Exact module order is defined by FILES_IN_ORDER in root build.js; keep the order identical to local js/...js script tags in index.html.
- Do not add Node-only imports, filesystem access, server credentials, backend source, or server dependencies here.
- Keep modules within their existing numbered feature folders unless a complete reference/build/precache update is reviewed.
- Validate with root npm test and npm run build.
