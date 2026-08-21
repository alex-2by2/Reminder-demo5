# Master Reminder App

An all-in-one PWA: reminders/tasks, habits, calendar, Pomodoro, finance
(expenses/income/budgets/bills/EMIs/investments), a khata (ledger) book,
student mode, family sharing, and a growing set of extra features (period
tracker, shared family wallet, fitness log, recipe planner, and more — see
the `09-new-features` row below).

Plain HTML/CSS/JS — no framework, no bundler required for development,
Firebase (Auth/Firestore/Functions/Cloud Messaging) as the backend.

## Running it locally

There's no build step for development. Serve the folder with any static
file server and open it — for example:

```
npx serve .
```

`index.html` loads every file in `js/` directly via plain `<script defer>`
tags, in the order listed in `build.js`'s `FILES_IN_ORDER`. That order
matters: files later in the list call functions/read variables declared by
files earlier in the list.

## Folder map

The app's logic lives in `js/`, split into 54 single-domain files across 10
folders. It grew in two stages: an original 8-file version was split into
the `00`–`08` folders below for maintainability (see `CHANGELOG.md` §
"Project split" for the full history of *why* and the old→new filename
mapping), and `09-new-features` was added afterward as a self-contained
batch of new features (see `SETUP-CHECKLIST.md` for the accounts/keys each
one needs).

| Folder | Covers |
|---|---|
| `00-foundation/` | Config & feature flags, error logging/crash reporting, permission manager & service registry, privacy center & cookie consent |
| `01-core/` | Firebase init & security helpers, navigation/auth, cloud sync & settings, home calendar & Pomodoro, account deletion, two-factor auth |
| `02-tasks/` | Reminder attachments/templates/stats, habits, core reminders CRUD & list rendering, recycle bin |
| `03-wellbeing/` | Push notification settings, projects/folders, mood tracker & family task sharing, snooze/sleep tracker/archive, webhook & Google Calendar integrations |
| `04-ai-calendar/` | Gemini AI assistant & daily planner, family calendar & habit analytics, Kanban/workspace |
| `05-work-finance/` | Shift schedules, personal finance, student mode & journal |
| `06-lifestyle/` | Medicine/vehicle/shopping/travel/subscriptions, secret space & backup & PWA install & widgets, finance charts & AI coach & app stats, PDF/Excel export, health dashboard, advanced widgets, emergency contacts |
| `07-automation/` | Automation rules & notification centre, savings goals/study analytics/global search, AI recommendations & daily briefing & next-task widget, coins/rewards/missions |
| `08-khata-family/` | Khata (ledger), "More" page search & subtasks, family profile & members & morning briefing, weekly planner |
| `09-new-features/` | Period tracker, shared family wallet, fitness log, multi-webhook triggers, widget dashboard page, recipe planner, crash monitoring, ToS gate, web push, payments, subscription page, free-tier limits, referrals, rating prompt |

Every file's own header comment has more detail on exactly what it contains.

## Admin backend

`server/` is a separate, owner-only admin API + dashboard (user management,
Pro/free stats, revenue, crash-report viewer, referral leaderboard) — see
`server/README.md` for what it is and how to set it up. It's additive: the
app above doesn't call it, doesn't need it running, and works exactly the
same with or without it. It reads/writes the same Firestore project via the
Firebase Admin SDK rather than a second database — see that file for why.

## Tests

```
npm test
```

Runs `tests/*.test.js` under Node's built-in test runner. These extract and
exercise specific functions' real source (see `tests/extract-fn.js`) rather
than re-implementing them, so they test the actual current code.

`.github/workflows/ci.yml` runs this, plus a full syntax check and
`node build.js`, automatically on every push/PR — and does the equivalent
for `server/` too. See `server/README.md`'s "Continuous integration"
section for the one manual step (branch protection) GitHub doesn't turn on
by itself.

## Production build

Optional — see `BUILD.md`. `node build.js` concatenates all 54 files into
one bundle and generates a matching `dist/`.

## Deploying

- Cloud Functions (the AI proxy) — see `DEPLOY.md`.
- Everything that needs your own accounts/API keys before those 17 newer
  features work (Web Push, Razorpay payments, etc.) — see
  `SETUP-CHECKLIST.md`.
- Firestore security rules: `firestore.rules`. Indexes: `firestore.indexes.json`.
- Hosting config: `firebase.json`.

## Other docs

- `CHANGELOG.md` — full history of audits, bug fixes, and the project split.
- `store-listing-copy.md` — app store listing copy and packaging notes.
- `privacy-policy.html`, `terms-of-service.html` — the actual pages linked
  from in-app settings and the signup gate.
