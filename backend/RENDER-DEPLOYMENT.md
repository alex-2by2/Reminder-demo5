# NestJS API — Render deployment

This service is deployed independently from the existing Express owner/admin API.

## Render Blueprint

The root `render.yaml` declares the service:

- Service name: `easy-life-tools-api`
- Root directory: `backend`
- Build command: `npm install --include=dev && npm run build`
- Start command: `npm run start:prod`
- Health check: `/health`

Do not change the existing `reminder-demo5-backend` service; it continues to host the Express admin API.

## Required environment variables

Configure these in the **easy-life-tools-api** Render service settings. Never commit their values:

| Variable | Required value |
|---|---|
| `NODE_ENV` | `production` |
| `FRONTEND_ORIGINS` | `https://alex-2by2.github.io` |
| `MONGODB_URI` | MongoDB Atlas connection string for a dedicated least-privilege database user |
| `FIREBASE_PROJECT_ID` | Existing Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Dedicated Firebase service-account email |
| `FIREBASE_PRIVATE_KEY` | Matching private key; preserve newlines as required by Render |

The frontend origin is the origin only; do not append `/Reminder-demo5/`.

## Post-deploy verification

1. Wait for the Render deploy to finish successfully.
2. Open the service's generated Render URL followed by `/health`. Expect HTTP 200 and `{"status":"ok","service":"easy-life-tools-api"}`.
3. In a secure authenticated test client, obtain a Firebase ID token and call `GET /api/v1/me` with `Authorization: Bearer <token>`. Expect a profile for the verified Firebase UID.
4. Test reminder create, list, read, update, soft-delete, and restore with a dedicated test account. Verify persisted records in the intended MongoDB database and confirm a second Firebase account cannot read or mutate the first account's reminders.
5. Verify invalid/missing tokens are rejected and browser preflight from the exact GitHub Pages origin succeeds.

Do not put an ID token, service-account private key, or MongoDB URI in GitHub, source files, screenshots, or chat.

## Frontend integration boundary

The Render-generated service URL is not known until the service is created. Once it exists, use that exact HTTPS URL as the NestJS API base URL in the frontend integration change. Do not reuse `https://reminder-demo5.onrender.com`, which belongs to the existing Express service.

Keep current Firestore reads and writes unchanged until the MongoDB integration has passed the tests above and a separate migration/cutover plan has been reviewed.
