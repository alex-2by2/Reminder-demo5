# Deploying the AI Proxy (functions/)

This can't be deployed from here — it needs your own Firebase project and the Firebase CLI on your machine. Steps:

## 1. One-time setup (if you haven't used Cloud Functions on this project before)
```
npm install -g firebase-tools
firebase login
cd <your project root, containing this functions/ folder>
firebase init functions
```
When it asks "Overwrite functions/package.json?" — say **No** (this one's already set up). When it asks about existing files, keep the `functions/index.js` and `functions/package.json` from this delivery.

## 2. Install dependencies
```
cd functions
npm install
```

## 3. Set your Gemini API key as a secret (never goes in the code or the client)
```
firebase functions:secrets:set GEMINI_API_KEY
```
Paste your key from aistudio.google.com when prompted.

## 4. Deploy
```
firebase deploy --only functions
```

## 5. Deploy the updated Firestore rules too (from the project root)
```
firebase deploy --only firestore:rules
```

## Notes
- The function is a **callable function** (`onCall`), so the client SDK (`firebase.functions()`, already added to `index.html`) handles auth tokens and CORS automatically — no manual fetch/CORS config needed.
- Daily limit is 50 calls/user, set as `DAILY_LIMIT` at the top of `index.js`. Change and redeploy if you want it higher/lower.
- First deploy in a Firebase project may prompt you to upgrade to the **Blaze (pay-as-you-go) plan** — Cloud Functions require it, even though usage at this scale will likely stay within the free tier.
- Test with the **Firebase Emulator Suite** (`firebase emulators:start`) before deploying to production if you want to try it risk-free first.
