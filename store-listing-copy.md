# App Store Listing — Master Reminder App

Feature #12 ("App store listing") isn't a code change — there's no file to add
to your repo that makes an app "appear" on Google Play or the App Store.
It's a submission process on each store's own console, plus optionally
packaging the PWA as an installable app binary. This doc gives you
everything text-based ready to paste in; the rest is a short checklist.

## 1. Packaging the PWA for the stores

You built a PWA, not a native app — neither store accepts a plain website
URL as a listing. Two realistic paths:

- **Android (Google Play): Trusted Web Activity (TWA).** Wraps this exact
  PWA in a thin native shell — no rewrite needed. Easiest tool: PWABuilder
  (https://www.pwabuilder.com) — paste your deployed URL in, it reads
  `manifest.json` (already present and solid) and generates a signed
  Android package for you to upload to Play Console.
- **iOS (App Store): Apple does not offer a TWA equivalent.** Apple requires
  an actual native/hybrid app binary — a bare PWA cannot be submitted as-is.
  The realistic option is wrapping it with Capacitor
  (https://capacitorjs.com) — loads your existing web build inside a native
  shell. This is a real (if one-time) engineering task, not a form to fill
  in — flagging that plainly rather than implying it's a checkbox.

Both stores also require a paid developer account: Google Play is a $25
one-time fee; Apple is $99/year.

## 2. Store listing copy (ready to paste)

**App name:** Master Reminder App

**Short description** (Play Store, 80 char max):
All-in-one reminders, habits, finance & family sharing — plan your whole life

**Full description:**
Master Reminder App brings your reminders, habits, budget, and family
planning into one place.

- Smart reminders & recurring tasks, with AI-assisted scheduling
- Habit tracking with streaks and XP
- Full personal finance: expenses, income, budgets, EMIs, recurring bills
- Khata book (shared ledger) for family or business accounts
- Shared family wallet for splitting expenses
- Period/cycle tracking with predictions
- Recipe & meal planner with auto-generated shopping lists
- Student mode: attendance, journal, study analytics
- Dark mode, premium themes, and a Pro plan for power users
- Works offline — your data syncs automatically when you're back online

**Category:** Productivity (Play Store) / Productivity (App Store)

**Keywords** (App Store, comma-separated, 100 char max):
reminders,habits,budget,expense tracker,khata,family,planner,todo,finance,student

## 3. Assets you still need to produce

These need real screenshots/artwork from your actual running app — not
something I can generate without the app open in front of me:
- Feature graphic (Play Store: 1024×500 PNG/JPG)
- At least 2 screenshots per store, phone-size
- App icon at store-required sizes (you already have `icon-192.png` /
  `icon-512.png` in this repo, which covers the PWA manifest — stores want
  their own dedicated exports, typically 512×512 for Play, 1024×1024 for
  App Store, no transparency)

## 4. Once you have a real store listing

Two things in this codebase have placeholder store links waiting for them —
search for `PASTE_YOUR_PLAY_STORE_URL_HERE` and `PASTE_YOUR_APP_STORE_URL_HERE`
in `js/09-new-features/17-rating-prompt.js` and fill them in. Until then, the
in-app rating prompt just says thanks instead of opening a broken link — it
won't break anything in the meantime.
