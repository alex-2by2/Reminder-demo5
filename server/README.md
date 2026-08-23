# Admin Backend — Setup Guide

An owner-only admin server for the Master Reminder App: a dashboard (users,
Pro/free split, revenue, crash reports, referrals) and a few admin actions
(disable a user, grant/revoke Pro, delete an account) that nobody but you
can reach.

**Nothing about the app itself changes.** Every existing user keeps using
the app exactly as before, signing in and talking to Firebase directly —
this server is a separate, additional thing that *you* use, sitting next to
the app rather than in front of it.

## Why Firebase, not MongoDB

You mentioned either was fine, so here's the reasoning, in case you'd rather
go the other way: every piece of this app's real data — reminders, users,
payments, referrals, crash reports — already lives in Firestore. A MongoDB-
backed admin panel would mean standing up a second database and some way to
keep it in sync with Firestore, just to look at data that already has a
perfectly good home. Using the **Firebase Admin SDK** instead means this
server reads and writes the exact same live Firestore project the app uses
— zero duplication, nothing to keep in sync, and it reuses the app's
existing Firebase Auth user pool for sign-in too. If you have a specific
reason to want MongoDB (e.g. you're planning to move off Firebase
eventually), say so and this can be restructured.

## How "owner only" actually works

1. You sign into the admin page (`/admin.html`) with a normal Firebase Auth
   account — the same kind every app user has.
2. Every API call sends that sign-in as a token. The server verifies the
   token is genuine with Firebase, **then** checks it belongs to the one
   account you've designated as owner (`OWNER_UID` / `OWNER_EMAIL` below).
3. Anyone else who finds the URL and even manages to sign in gets a 403.
   If you haven't set an owner yet, the server rejects *everyone*, itself
   included — it fails closed, not open.

This is enforced server-side on every request, not just hidden by the
login screen — so scope out `server/src/middleware/requireOwner.js` if
you want to see exactly what it checks.

---

## 1. Firebase service account

This is how the server authenticates to Firebase as a trusted backend
(different from how the app's client code authenticates — that uses the
public `apiKey`, which isn't a secret; this key is).

1. [Firebase Console](https://console.firebase.google.com) → your project
   (`reminder-76588`, per `js/01-core/01-bootstrap.js` — confirm it matches
   yours) → gear icon → **Project Settings** → **Service Accounts** tab.
2. Click **Generate new private key**. Confirm — downloads a `.json` file.
3. **This file is as sensitive as a root password** — it can read and
   write every user's data. Never commit it, never paste it in chat, never
   put it in a public repo.
4. Encode it as base64 (this avoids a very common bug where the key's
   embedded newlines get mangled when pasted into a plain env var):

   ```bash
   # macOS
   base64 -i serviceAccountKey.json | tr -d '\n' | pbcopy   # copies to clipboard

   # Linux
   base64 -w 0 serviceAccountKey.json
   ```
   ```powershell
   # Windows PowerShell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("serviceAccountKey.json"))
   ```
5. Save that output somewhere for step 4 — it's your `FIREBASE_SERVICE_ACCOUNT_BASE64`.
6. Delete the downloaded `.json` file once you've encoded it (or at least
   make sure it never ends up inside the `server/` folder — `.gitignore`
   already excludes `serviceAccountKey.json` by name as a backstop, but
   don't rely on that alone).

## 2. Decide who the owner is

Simplest path: use the email you already sign into the app with.

- **`OWNER_EMAIL`** — the easy option. Just the email address, e.g. `you@example.com`.
- **`OWNER_UID`** — more durable (a UID never changes; an email can be
  updated on the account later). Find it at Firebase Console →
  **Authentication** → **Users** → your row → **User UID** column. Only
  works after you've signed up in the app at least once with that account.

Set one or both in step 4. If both are set, either one matching is enough.

## 3. Run it locally first

```bash
cd server
npm install
cp .env.example .env
```

Open `.env` and fill in `OWNER_EMAIL` (or `OWNER_UID`) and
`FIREBASE_SERVICE_ACCOUNT_BASE64` from steps 1–2. Then:

```bash
npm run dev
```

Open **http://localhost:3000/admin.html**, sign in with your owner
account, and you should land on the dashboard. `GET http://localhost:3000/health`
should return `{"ok":true,...}` with no sign-in needed — that's the one
public route, meant for Render's health checks.

## 4. Push to GitHub

If this project is already on GitHub (the changelog mentions
`alex-2by2.github.io/Reminder-demo5` — adjust the example below to your
actual repo), the `server/` folder just needs to go up alongside everything
else already there:

```bash
git add server/
git commit -m "Add owner-only admin backend"
git push
```

Starting from scratch instead:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

Either way — **double-check `.env` was never committed.**
`git status` should not list it (`server/.gitignore` excludes it); if it
somehow already got committed in an earlier commit, that's a real exposure
and the fix is rotating the service account key (Firebase Console →
Service Accounts → generate a new key, then delete/disable the old one),
not just deleting the file going forward.

## 5. Deploy to Render

### Option A — Dashboard (a few clicks, no extra file needed)

1. [render.com](https://render.com) → sign up/in (GitHub sign-in is
   simplest, since you'll connect a GitHub repo either way).
2. **New** → **Web Service** → connect your GitHub account if prompted →
   pick this repo.
3. Fill in:
   | Field | Value |
   |---|---|
   | Name | `master-reminder-admin` (or anything) |
   | Region | closest to you |
   | Branch | `main` |
   | **Root Directory** | `server` ← important, this repo has the app *and* the server in it |
   | Runtime | Node |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Instance Type | Free (fine to start — see note below) |
4. Under **Environment Variables**, add the same names from
   `.env.example`: `OWNER_EMAIL` (or `OWNER_UID`), `FIREBASE_SERVICE_ACCOUNT_BASE64`,
   `NODE_ENV=production`. Leave `ADMIN_ORIGIN` blank unless you're hosting
   the admin page somewhere other than this same Render service.
5. **Create Web Service**. Render builds and deploys — watch the **Logs**
   tab; you should see `Admin server listening on port 10000` (or similar).
6. Visit `https://YOUR-SERVICE-NAME.onrender.com/admin.html` and sign in.

### Option B — Blueprint (`render.yaml`, already in this folder)

**New** → **Blueprint** → connect the repo → Render reads `server/render.yaml`
automatically and asks you to fill in the secret values it left blank
(`sync: false` fields). Fill those in and deploy. Functionally identical to
Option A, just fewer manual form fields.

### Free tier, honestly

Render's free web services spin down after ~15 minutes with no traffic and
take 30–60 seconds to wake back up on the next request. For a dashboard you
personally check occasionally, that's a fine tradeoff — the first load
after a while away is just a bit slow. If that's annoying, upgrading to a
paid instance keeps it always warm; nothing in the code needs to change
either way.

---

## API reference

Everything under `/api/*` requires `Authorization: Bearer <Firebase ID token>`
for the owner account. `/health` and `/admin.html` (+ its assets) don't.

| Method | Path | Does |
|---|---|---|
| GET | `/api/whoami` | Confirms the token is valid and belongs to the owner. |
| GET | `/api/dashboard/stats` | Total/Pro/free users, new users today/this week, crash counts (24h/7d). |
| GET | `/api/dashboard/revenue?days=30` | Successful-payment total over the window, from every user's payment history. |
| GET | `/api/users?limit=25&pageToken=` | Paginated user list (Auth info + app profile). |
| GET | `/api/users/:uid` | One user's full admin-relevant detail + recent payments. |
| POST | `/api/users/:uid/disable` | Blocks sign-in immediately. |
| POST | `/api/users/:uid/enable` | Reverses disable. |
| POST | `/api/users/:uid/grant-pro` `{days?}` | Manually grants Pro (support/comp requests). Default 365 days. |
| POST | `/api/users/:uid/revoke-pro` | Removes Pro. |
| DELETE | `/api/users/:uid` | Deletes the Auth account + their Firestore data. See the limitation noted in `src/routes/users.js`. |
| GET | `/api/crash-reports?limit=50&source=&startAfter=` | Lists `crash_reports` — previously only viewable in the Firebase Console. |
| GET | `/api/referrals/leaderboard?limit=20` | Top referrers by `referralCount`. |
| GET | `/api/audit-log?limit=50&startAfter=` | Every disable/enable/grant-pro/revoke-pro/delete this server has performed, who did it, and when. |

## Testing

```bash
cd server
npm install
npm test
```

19 tests, and — unlike the rest of this server — none of them need a real
Firebase project, credentials, or network access. That's deliberate:
`src/middleware/requireOwner.js` (the actual owner-only gate) and
`src/auditLog.js` are both written to take their Firebase dependencies
(`verifyIdToken`, `db`) as parameters instead of importing them directly, so
tests can hand them a fake and check the logic in complete isolation — see
`tests/requireOwner.test.js` for what that actually covers (fails closed
with no owner configured, rejects missing/malformed/invalid/wrong-account
tokens, accepts the right one by UID or email). `tests/esc.test.js` does the
same for the HTML-escaping function every dashboard table depends on,
pulling its real current source out of `public/admin.js` rather than
re-typing a copy that could drift (see `tests/extract-fn.js`).

The other routes (`dashboard.js`, `users.js`'s reads, `crashReports.js`,
`referrals.js`) still talk to Firebase directly and aren't unit-tested the
same way — verifying those means actually running the server against a real
or emulated Firestore project, which is what step 3 above (running it
locally) is for.

## Continuous integration

`.github/workflows/ci.yml` (repo root) runs on every push/PR to `main`:
syntax-checks every file in both the app's `js/` and this server's `src/`
and `public/`, runs the app's own test suite, runs `node build.js`, installs
this server's dependencies fresh, and runs `npm test` here — all on GitHub's
infrastructure, no secrets required (see the comment in that file for why
the server tests specifically don't need one). It's there from the moment
this is pushed, but GitHub won't actually block a merge on it failing until
you turn that on: **Settings → Branches → Branch protection rules → require
status checks to pass** for `main`.

## Security notes

- The service account key is the actual keys to the kingdom here — more
  sensitive than any password in this system. If you ever suspect it
  leaked (committed to a public repo, pasted somewhere, etc.), rotate it
  immediately: Firebase Console → Service Accounts → generate a new key,
  update `FIREBASE_SERVICE_ACCOUNT_BASE64` on Render, then delete the old
  key. Old, un-rotated keys keep working forever otherwise.
- CORS is locked down by default — only same-origin requests (i.e., the
  bundled `admin.html`) work unless you explicitly set `ADMIN_ORIGIN`.
- Rate limiting (300 req/15 min/IP) is on by default across the whole API.
- The user-detail endpoints deliberately return a curated field list, not
  the full `users/{uid}` document (which also holds reminders, khata
  ledgers with other real people's names and money owed, mood/sleep logs,
  etc.) — see the comment in `src/routes/users.js` if you want to widen
  that.
- Every disable/enable/grant-pro/revoke-pro/delete writes an entry to
  `admin_audit_log` (who, what, when) — see the Audit Log section on the
  dashboard itself, or query it directly at `GET /api/audit-log`. Nothing
  in this system reads that collection to make access decisions; it's a
  record, not a gate — if you delete it, nothing breaks, you just lose the
  history.

## Troubleshooting

- **"Server misconfigured: set OWNER_UID and/or OWNER_EMAIL..."** — neither
  env var is set on Render (or your local `.env`). Add one.
- **403 on sign-in** — you signed in with an account that doesn't match
  `OWNER_UID`/`OWNER_EMAIL`. Double check for typos, and remember email
  matching is case-insensitive but UID matching is exact.
- **"FIREBASE_SERVICE_ACCOUNT_BASE64 decoded, but is not valid JSON"** —
  something got truncated or altered when it was pasted into Render's
  environment variable field (very long values sometimes get mangled by
  copy-paste). Re-run the base64 command and paste the whole thing fresh.
- **A crash-reports request with `?source=` fails the first time** —
  expected once; Firestore needs a composite index for that specific
  filter+sort combination and will refuse the query with an error message
  containing a direct "create it" link. Click it, wait ~1 minute for the
  index to finish building, then retry.
- **CORS error in the browser console** — only relevant if you're calling
  this API from somewhere other than its own `/admin.html`. Set
  `ADMIN_ORIGIN` to that page's exact origin (no trailing slash) and redeploy.
