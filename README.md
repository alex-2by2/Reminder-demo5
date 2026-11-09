# Easy Life Tools

An all-in-one PWA for reminders/tasks, habits, calendar, Pomodoro, finance, khata, student mode, family sharing, and additional lifestyle features.

The browser PWA remains plain HTML/CSS/JavaScript and currently uses Firebase Authentication, Firestore, Firebase Cloud Functions, and Firebase Cloud Messaging.

## Running locally

Serve the project root with a static file server, for example:

```sh
npx serve .
```

`index.html` loads browser files from `js/` in the order listed in `build.js`'s `FILES_IN_ORDER`.

## Backend architecture

There is exactly **one backend runtime**: the NestJS + TypeScript application in `backend/`. It hosts both the consumer API and the Owner Console (`/owner/`) on the same Render service. The former Express service has been retired and removed.

- Backend guide: `backend/README.md`
- Render deployment: single service, rootDir `backend`, health check `/health`
- Consumer API: Firebase ID-token authentication; MongoDB-backed profile/reminder endpoints
- Owner Console: separate Owner ID + password session; consumer Firebase login remains unchanged

The PWA continues to use its existing Firestore/local-storage path until a separately tested and reviewed migration. Consolidating backend runtimes does not migrate or alter user data.

## Tests

```sh
npm test
npm run typecheck:backend
npm run build:backend
npm run test:backend
```

GitHub Actions runs frontend regression tests, backend type-check/build/tests, JavaScript syntax checks, and the production PWA bundle build on pushes and pull requests.

## Production build

Run `node build.js` to generate the PWA bundle in `dist/`. Do not hand-edit generated output.

## Other deployment boundaries

- Firebase Cloud Functions: see `DEPLOY.md`.
- Firebase setup and feature prerequisites: see `SETUP-CHECKLIST.md`.
- Firestore security rules and indexes: `firestore.rules` and `firestore.indexes.json`.
- Firebase Hosting config: `firebase.json`.
