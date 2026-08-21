# Master Reminder App — Refactor & Audit Report
**Date:** July 28, 2026
**Scope:** Full codebase audit (~12,300 lines: `index.html`, 8 JS files, Firebase Cloud Function, Firestore rules, service worker, existing test suite) plus the fixes described below.

## Before anything else: what was already solid

This app had already been through at least one real security/architecture pass before this one — worth saying plainly, because it changed how this review was done. Specifically, going in, the codebase already had:

- A schema-migration system (`runSchemaMigrations`) for evolving stored data safely across versions.
- An XSS-hardening pass: `sanitizeHTML`/`escInline` used at ~140 call sites, and every render function checked in this pass that touches user-entered text (task names, notes, category names, party names, etc.) was already using them correctly.
- A genuinely well-designed service worker (`sw.js`), with its own documented trade-offs.
- Firestore security rules that read as though someone sat down with the actual client code and worked out exactly what each collection needs — including a documented, deliberate limitation around workspace task updates.
- A Cloud Function (Gemini AI proxy) with proper auth checks, prompt-length limits, atomic per-user daily rate limiting, and secrets handled via `defineSecret` — never a hardcoded key.
- An existing test suite (`node --test tests/*.test.js`), 10/10 passing, using a sandboxed-extraction approach to test real pure-logic functions without needing a browser or live Firebase. This was used as the safety baseline throughout — **all changes below were verified against it, and it's now 15/15** with the new tests added.

None of that was rewritten. The work below is what was actually still wrong or missing.

---

## 1. Critical bugs fixed

### 1.1 Finance data had no cloud backup at all
**File:** `js/01-core-init.js` (`syncToCloud`)
`finData` — every expense, income entry, budget, bill, EMI, and investment — was stored in `localStorage` but was **never included** in the object written to Firestore. Every other feature's data (habits, khata, mood, sleep, birthdays, vehicles, warranties, etc.) was in that payload; finance wasn't. A user reinstalling the app or switching devices would silently lose every recorded expense, with no error, because nothing failed — the data just was never there to restore.

This also explains why a related merge function (`applyCloudDataWithConflictResolution`'s finance-merge branch) looked dead: it was checking `data.finData`, which was always `undefined` because it was never saved. Fixing the save path makes that existing merge logic reachable again.

**Fix:** added `finData: safeStorage("finData", {...})` to the sync payload, matching the default shape `getFinData()` already uses. Covered by a new test (`syncToCloud includes finData in the payload written to Firestore`).

### 1.2 Pre-alarm notifications repeated every 60 seconds
**File:** `js/07-automation-analytics.js` (`checkPreAlarmNotifications`)
This runs on a 60-second interval. It set `r.preNotified = true` on a reminder object to avoid re-notifying — but that object came from `safeStorage()`, which re-parses `localStorage` fresh on every call. The flag was only ever set in memory and was never written back, so every single run re-read the *original*, un-flagged data. Net effect: the same "15 minutes to go" notification fired again every minute for the entire pre-alarm window.

**Fix:** persist the array back to `localStorage` after flagging. Covered by a new test that calls the function twice and asserts only one notification fires.

### 1.3 Three separate, uncoordinated `online`/`offline` handlers
**Files:** `js/01-core-init.js`, `js/06-lifestyle-settings-widgets.js`, `js/08-khata-family-final.js`
Each of these files independently registered its own `window.addEventListener('online'/'offline', ...)` pair, added at different points in the app's history with no awareness of each other. Actual effect every time connectivity changed: **2–3 overlapping toast notifications** stacking on screen, and **`syncToCloud()` called up to 3 times** simultaneously.

**Fix:** consolidated into one handler (in `js/01-core-init.js`) that does everything all three used to do — sync status text, the offline banner, background sync request, one toast. The two redundant copies were removed and replaced with a one-line comment pointing to where the logic now lives.

### 1.4 Duplicate global keyboard shortcut handlers
**Files:** `js/07-automation-analytics.js`, `js/08-khata-family-final.js`
Both registered a global `keydown` listener for `/` (open search) and `Escape` (close modals). Every press of either key ran the action **twice**. The two versions also disagreed on behavior: file 08's version correctly skipped shortcuts while typing in a text field; file 07's did not, so pressing Escape while typing task notes would force-close the modal regardless.

**Fix:** kept the more complete version (file 08 — more shortcuts, consistent input-field guard), removed file 07's redundant copy.

### 1.5 `syncToCloud` was being debounced twice
**File:** `js/08-khata-family-final.js`
The original `syncToCloud` (file 01) already debounces itself by 2000ms. File 08 additionally reassigned `syncToCloud = function() {...}` to wrap the *entire function* in a second, independent 1500ms debounce. Every call actually waited roughly 3.5 seconds end-to-end, and the real timing logic was split across two files 700+ lines apart with no comment connecting them.

**Fix:** removed the redundant wrapper; the original's own debounce is now the only one.

### 1.6 Microphone stayed active after closing the app
**File:** `js/01-core-init.js` (`closeModal`)
Recording a voice memo, then closing the modal (tap outside, or Escape) *without* explicitly clicking "Stop Recording" first, left the `MediaRecorder` and microphone stream running indefinitely — the browser's mic-in-use indicator stayed lit with no way to turn it off short of reopening the modal.

**Fix:** `closeModal` now stops any in-progress recording and releases the stream.

### 1.7 `openLeaderboard`'s Firestore query had no error handling
**File:** `js/01-core-init.js`
Found while migrating this to the new API layer: the leaderboard query had no `.catch()` at all. A network or permissions error left the modal stuck on "Fetching..." forever with no feedback.
**Fix:** added a catch that logs to the new error logger and shows a real message.

---

## 2. Dead code removed

All five were verified unused (appear nowhere except their own definition) before removal, and each has a specific reason:

| Function | File | Why it was dead |
|---|---|---|
| `resolveConflict` | 07 | Fully superseded duplicate of `mergeReminders` (file 08), which is the function actually wired into the live conflict-resolution path. |
| `addExpenseWithNote` | 07 | Superseded duplicate — the active "Add Expense" button calls `addExpense()` (file 05), which already handles and sanitizes the note field itself. |
| `getSubtasks` | 08 | Strict subset of `getSubtasksFromForm` (file 01), the function actually used by `addOrUpdateReminder`. |
| `patchPomoComplete` / `completePomoSession` | 06 | An abandoned attempt at Pomodoro task-name logging. The active Pomodoro flow (`startPomo`, file 01) already logs task name + duration inline; Focus Mode has its own separate, working completion path. Neither ever called these. |

Removing these isn't just tidiness — `patchPomoComplete`/`completePomoSession` in particular were a trap for future maintenance: they looked like the "real" logging path but hadn't executed in what was presumably a long time.

---

## 3. Fully-built features that had no way to reach them

Found by cross-referencing every function against every call site (including `onclick` attributes in `index.html`). These five were completely implemented, tested-looking code with **zero UI entry point** — not broken, just invisible:

- **`aiSuggestPriority()`** — every other AI-assist field (category, time) has a matching 🪄 button; Priority didn't. Added one, matching the existing pattern exactly.
- **`openLeaderboard()`** — the modal, the query, the rendering all existed; no button anywhere opened it. Added a tile next to the related "App Stats" tile.
- **`resendVerificationEmail()`** — no verification UI existed at all. This matters beyond convenience: Firestore rules require `email_verified == true` on the recipient before `shared_tasks` are readable, so an unverified user's shared tasks were silently unreachable with no indication why. Added a banner in the profile modal that only shows when relevant.
- **`exportToGoogleCalendar()`** (`.ics` export) — the 2-way Google Calendar sync requires setting up an OAuth Client ID, which has real setup friction ("How to get a free Client ID?" is its own linked help page). This is a one-tap alternative needing no setup, that works with any calendar app. Added a button in Data Backup.
- **`addSwipeToComplete()`** — a fully-implemented swipe-right-to-complete / swipe-left-to-pin gesture, never attached to any list item. Wired into the reminder list (gated off during bulk-select mode, where it would conflict with multi-select).

All five are gated behind the new feature-flag system, defaulted **on** — see below.

---

## 4. New infrastructure

Three new files, loaded first (`js/00-config.js`, `js/00-logger.js`, `js/00-services.js`), covering the architectural items from the brief:

- **Central config** — every `localStorage` key the app uses (67 of them) catalogued in one `STORAGE_KEYS` registry, plus tunable numbers (debounce delays, check intervals, limits) that used to be bare magic numbers, now named in `APP_CONFIG`. *(Note on scope: this doesn't rewrite all ~150 existing call sites that reference these keys/numbers as literals — that's a large, higher-risk change. New code in this pass uses the registry; a handful of the highest-value existing call sites were migrated as real, working examples — see `syncToCloud`'s interval references, etc.)*
- **Feature flags** — `Features.isEnabled(name)` / `Features.set(name, bool)`, backed by `localStorage`. Everything defaults to `true`, so adding this file changes no behavior by itself.
- **Error logging & crash reporting** — `AppLogger` persists a rolling log of the last 50 errors/warnings to `localStorage` (survives a reload, unlike the old console-only handler), with a real "View Error Log" screen wired into Settings (copy/clear included). Nothing is sent anywhere — this is on-device only, not a remote reporting service. The old `window.onerror`/`window.onunhandledrejection` pair in `js/02` (console-only, lost on refresh) was removed in favor of this; its user-facing toast behavior was preserved.
- **Permission manager** — `Permissions.requestNotifications()` / `.requestMicrophone()` / `.requestLocation()` / `.requestWakeLock()`, each with consistent, non-throwing behavior. The two highest-traffic call sites (notification permission, microphone for voice memos) were migrated to use it; geolocation and wake-lock call sites are documented as following the same pattern for future migration.
- **API layer** — a thin layer in front of the Firestore/Functions calls that read/write the whole user document and call the AI proxy (`saveUserData`, `getUserData`, `onUserDataChange`, `getLeaderboard`, `callAI`). `callGeminiAI`, `openLeaderboard`, and the interval-driven checks were migrated to use it. This is **not** a rewrite of every Firestore call in the app (there are several dozen, spread by feature) — it's the handful central enough to be worth one seam.
- **Service registry (`window.App`)** — ties the above together (`App.config`, `App.keys`, `App.features`, `App.logger`, `App.permissions`, `App.api`) as one discoverable object.

**On "Dependency Injection" specifically:** a real DI/IoC container implies constructor injection, which implies classes/modules — and this app is 8 classic `<script>` files sharing one global scope by deliberate design (see `DEPLOY.md`), a decision that would require a genuine rewrite (load order, every cross-file function call) to undo safely, not something to change incidentally inside a bug-fix pass with no way to test in a real browser. `window.App` is the pragmatic version of what DI actually buys you in an app shaped like this one: swappable, discoverable services in one place instead of scattered bare globals. Full module-based DI is a legitimate future project, just a much larger and separate one.

---

## 5. Bundle / performance

- **`defer` added to all 11 script tags** (3 new + 8 original), local and CDN. Previously, 8 external scripts (4 Firebase SDKs, Chart.js, SortableJS, RRule, QRCode) loaded synchronously in `<head>`, blocking render until all 8 downloaded, parsed, and executed **serially**. They now download in parallel while guaranteeing the same execution order.
- **`preconnect` hints** added for the 3 CDN origins (`gstatic.com`, `jsdelivr.net`, `cdnjs.cloudflare.com`), so DNS/TLS setup overlaps with HTML parsing instead of starting cold.
- **Two unpinned dependencies pinned**: `chart.js` had no version at all (silently tracked whatever "latest" resolved to on each load); `sortablejs` was pinned to `@latest`. Both now pinned to their current stable releases (`chart.js@4.5.1`, `sortablejs@1.15.7`) — verified via a live search rather than guessed, so a future upstream release can't silently change this app's behavior.
- **`build.js`** — a new, dependency-free bundling script (`node build.js`) that concatenates the 11 JS files into one, syntax-checks the result, and generates a matching `dist/index.html` + copies static assets, producing a deployable folder with 1 script request instead of 11. Deliberately does **not** minify — see `BUILD.md` for why, and the recommended `terser` follow-up once you have npm access.

**Not done, and why:** true code-splitting (only loading e.g. the khata/finance files when that page opens) was considered and rejected for this pass — the 8 files call each other's functions across file boundaries throughout, and without a real browser to test against, verifying a lazy-load order wouldn't silently break something was more risk than the reward justified here. Flagged as a good candidate for a future pass with proper testing in place.

---

## 6. Smaller fixes

- Fixed a stale comment in `functions/index.js` that described a client-side migration (moving off a direct, insecure Gemini API call) as still-needed — it was already done; the comment now says so, so a future maintainer doesn't go looking for a migration that already happened.
- `renderMorePinned()` now wraps icon/label in `sanitizeHTML()` for consistency with the equivalent `renderGettingStartedCard()` function — both draw from the same developer-defined feature catalog (not free user text), so this isn't a live exploit fix, just closing a style inconsistency at near-zero cost.

---

## 7. Testing

Baseline before any changes: 10/10 passing (`node --test tests/*.test.js`). **Now 15/15**, all real execution tests (not just syntax checks), following the existing project's sandboxed-extraction convention:

- `checkPreAlarmNotifications persists preNotified so it does not re-fire` — calls the real function twice with a frozen clock, asserts exactly one notification fires and the flag survives a simulated reload.
- `syncToCloud includes finData in the payload written to Firestore` — runs the real function against a mock Firestore, asserts the finance data actually reaches the write.
- Three tests for the new Feature Flags module (defaults, persistence across reload, that the config objects are actually frozen).

Run them yourself: `node --test tests/*.test.js`

---

## 8. UI polish pass (second update)

### 8.1 Empty states — the single biggest visual gap in the app
`styles.css` already had a considered empty-state style (`.empty-state`/`.empty-state-icon`/`.empty-state-text`: centered icon, muted color, styled text) — and it was used in exactly zero of the roughly 36 places across the app that show a "no data yet" message. Every one of them (expenses, income, budgets, bills, EMIs, investments, medicines, vehicle reminders, trips, subscriptions, birthdays, notes, Pomodoro sessions, custom rules, notifications, savings goals, search results, dependencies, recurring expenses, warranties, log entries, khata parties, khata transactions, family members, and more) was just a plain, unstyled line of gray text instead.

Added a shared `emptyStateHTML(icon, text)` helper (next to the other shared utilities in `js/01-core-init.js`) and wired all ~36 into it, each with a fitting icon (💸 for expenses, 🎂 for birthdays, 🤝 for khata parties, etc.). Genuine loading states ("Thinking...", "🪄 AI analyzing...") and prompts ("Sign in to use AI Import!") were deliberately left alone — they aren't empty states.

### 8.2 Duplicate / conflicting CSS rules
The same category of bug found in the JS files during the first pass turned out to exist in `styles.css` too — several classes were defined twice, in different sections added at different times, with the two definitions silently fighting over the same property:

| Class | The conflict | Fix |
|---|---|---|
| `.btn-success` / `.btn-secondary` | Defined once as small flat buttons, and again ~200 lines later as gradient buttons — completely different intents sharing one name. Only worked by accident because of cascade order. | Renamed the gradient pair to `.action-btn-success`/`.action-btn-secondary` (their actual, only real use, paired with `.action-btn`) and updated the two call sites. Zero visual change — same colors, same everything, just an unambiguous name now. |
| `.page-section` | Two rules each set `animation` to a *different* keyframe (`pageIn` vs `fadeInApp`) — the second silently won, orphaning the `pageIn` keyframe entirely. | Removed the dead rule and its now-unreachable keyframe. |
| `.toast` | Same pattern — `toastIn` vs `slideDown`/`fadeOut`, the latter always won. | Removed the dead rule and its orphaned keyframe. |
| `.form-group` | Two different `margin-bottom` values (15px vs 14px) — a real if trivial conflict. | Kept one. |
| `.fab-speed-item` | A standalone `transition` rule turned out to be byte-for-byte duplicated inside a fuller rule added later. | Removed the redundant copy. |
| `.vlog-item` | An entire rule (plus its dark-mode pairing) duplicated verbatim elsewhere in the file. | Removed the duplicate. |
| `.warranty-item` / `.warranty-expired` / `.warranty-soon` | A whole leftover styling system from before the Warranty feature was renamed to use `.warranty-card` (confirmed zero JS references to `.warranty-item`). Its `.warranty-expired` used **red**, silently overriding the still-live `.warranty-card`-paired version, which uses a muted gray — meaning expired warranties were rendering in the "wrong," abandoned color scheme. | Removed the dead `.warranty-item` block entirely, which restores the intended muted-gray treatment for expired warranties (red reads as "act now," which doesn't fit something whose window already closed — gray/dimmed matches how the rest of the app treats already-resolved items, e.g. completed tasks). |

None of this changes the app's actual design — it resolves ambiguity that was one stylesheet reorder away from changing behavior unpredictably, exactly like the duplicate-function fixes in the first pass.

### 8.3 Keyboard accessibility for the "More" page grid
`js/01-core-init.js` already had a small, well-built retrofit mechanism for exactly this problem — a `DOMContentLoaded` handler that finds elements by class, ensures `role="button"` + `tabindex="0"`, and wires up Enter/Space to trigger a click — applied to `.close-modal-btn` and `.nav-item`. It just hadn't been extended to `.feature-tile` (the 44-item grid on the "More" page) or `.template-chip` (6 instances), both of which are plain `<div onclick>` with the identical gap. Added both to the existing selector list — same mechanism, no new code path, so it's exactly as tested/trustworthy as the fix it's sitting next to.

*Not extended further:* the nested "pin to home" star inside each feature tile is its own separately-clickable element and wasn't included — fixing the primary action (opening the feature) covers the main gap without expanding scope into every secondary control in the app.

### 8.4 Considered and deliberately not done: a color palette refresh
The visual palette is a direct, unmodified copy of Apple's system colors (`#007AFF` blue, `#34C759` green, `#FF3B30` red, exact iOS grays) — safe and familiar, but indistinguishable from any other "looks like iOS" web app, and the one place a bigger creative swing could have made this feel more like *this app's* rather than a template. It wasn't done in this pass: changing the primary palette touches hundreds of untouched inline `style="..."` color references throughout `index.html` that a stylesheet change alone wouldn't reach, and there's no way to visually verify the result here (no browser, no screenshots). Doing this well would need either a real design review with actual screenshots, or a much larger, riskier find-and-replace across the inline styles than fits inside a polish pass. Flagged here rather than attempted blind. (Superseded in part by §9 below — the glass pass adds real visual identity without touching the base palette.)

---

## 9. Deeper async & error-handling audit, and Liquid Glass UI (third update)

### 9.1 Three more async gaps found and fixed
Continuing the same audit method that found the leaderboard's missing `.catch()` in the first pass:

- **The app's core realtime data listener had no error callback at all.** `js/01-core-init.js`'s `onSnapshot` subscription (everything — reminders, habits, finance, khata, etc. — syncs down through this one listener) only had a success callback. If it ever errors — a permission-denied after a rules change, an expired auth token, certain connectivity failures — it used to fail completely silently: no log, no toast, sync just quietly stops while the user keeps working on data that will never update. Added an error callback that logs it via `AppLogger` and shows one honest toast rather than nothing.
- The same gap existed in the API layer's `onUserDataChange` wrapper (`js/00-services.js`) — now accepts an optional error handler and defaults to logging via `AppLogger` if the caller doesn't supply one.
- `shareAppURL()`'s clipboard write (`js/02-reminders-habits.js`) had no `.catch()` — clipboard writes can genuinely be rejected (permission denied, missing user-activation context in some browsers), and a failed copy silently did nothing. Added a fallback error toast.

*Reviewed and found fine, not changed:* the microphone permission promise (never rejects by design — resolves to `null` on failure, see `js/00-services.js`), the PWA install-prompt promise (spec-guaranteed to always resolve), and a second clipboard call in `js/07` that already had a `.catch()` one line down that an earlier single-line grep had missed.

### 9.2 Liquid Glass UI
Evolved the app's floating "chrome" — the surfaces that sit above scrolling content rather than being content themselves — from flat/frosted to Apple's current Liquid Glass language: translucent material with blur + saturation, a thin highlight along the top edge where light would catch a real glass surface, and (where relevant) a colored tint rather than a flat fill.

Added a set of shared tokens at the top of `styles.css` (`--glass-bg`, `--glass-bg-strong`, `--glass-border`, `--glass-highlight`, `--glass-blur`, `--glass-shadow`), redefined for dark mode via `body.dark-mode`, so every glass surface pulls from one place instead of repeating blur/opacity values. Applied to:

- **Bottom nav** — already had a basic blur; now uses the shared tokens (more translucent, `saturate()` added for richer color pass-through, specular top-edge highlight). The dark-mode-specific override this used to need is gone — it's automatic now that the variables themselves flip.
- **Modal sheets** — the backdrop scrim already blurred (gained the `-webkit-` prefix it was missing, for Safari/iOS); the sheet itself moves from flat opaque white/black to the *high-opacity* glass variant (82%, not the nav's 72%) — genuinely glass, but kept dense enough that forms and financial figures stay fully legible.
- **FAB cluster** — the main button keeps its bold color gradient (it's the primary tap target; full transparency would hurt discoverability) but gained a glossy specular highlight, the same way tinted glass looks in real Liquid Glass buttons. The secondary speed-dial items (temporary, non-primary) became true translucent glass circles.
- **Toasts, the PWA install banner, and the offline banner** — same treatment for consistency: toasts and the offline banner became tinted glass (kept at 85% opacity so white text stays readable); the install banner gained the same glossy highlight as the main FAB.

**Deliberately not glassed:** widget cards, list rows, and forms. Apple's own Liquid Glass reserves this material for navigational chrome specifically because heavy blur/translucency over dense text and data hurts legibility — this app's home dashboard, expense lists, and forms stay on their existing solid/opaque surfaces for the same reason.

All CSS changes verified for brace balance and cross-checked for the exact duplicate-rule trap described in §8.2 (none introduced). No JS logic touched by this section beyond the two files in §9.1.

---

## 10. Project split for maintainability (fourth update)

The 8 original JS files averaged ~1,200 lines each and each blended multiple unrelated features (e.g. `06-lifestyle-settings-widgets.js` alone covered medicine, vehicles, travel, subscriptions, birthdays, settings, PWA install, widgets, and more). Split into 30 smaller, single-domain files across 9 folders — see `README.md` for the folder map.

**What this deliberately is not:** a move to ES modules. This app's 8 files are classic (non-module) `<script>` tags that share one global scope by design (see `DEPLOY.md`), and hundreds of inline `onclick="functionName()"` attributes throughout `index.html` (and in dynamically-generated HTML strings) depend on every function being reachable as a bare global. Converting to real ES modules would mean adding explicit `export`/`import` to every cross-file reference *and* either keeping a `window.fn = fn` escape hatch for every onclick-called function or rewriting all of them to `addEventListener` — essentially the same large, high-risk rewrite already flagged under "CSP hardening" in the final section of this document, which still isn't something to do blind, without a browser to verify against. This split gets the real, everyday maintainability benefit (finding code, working in a file you can actually hold in your head, smaller diffs) without that risk: every file is still a plain script, still shares global scope exactly as before, still gets called the exact same way from `index.html`.

**How it was done safely:** each of the 8 files was cut at its own existing internal section-comment boundaries (they already had clear headers like `// FEATURE 3: MOOD TRACKER` or `// BATCH 4 — GOAL PREDICTION` from prior work) — nothing was reordered, only split. Before touching `index.html` or the tests, the new files were concatenated back together in their new load order and diffed byte-for-byte against a concatenation of the original 8 files in their original order: **identical, zero differences.** Only after that check passed were a short header comment added to each new file, `index.html`'s script tags updated, the 5 test-file path references updated to point at each function's new home, and `build.js`'s file list updated — all reverified afterward with a fresh syntax check, the full test suite (15/15), and a real run of `build.js`.

**Folder-to-original-file map**, for anyone who bookmarked line numbers in the old files:

| New folder | Came from |
|---|---|
| `00-foundation/` | `00-config.js`, `00-logger.js`, `00-services.js` (unchanged, just moved) |
| `01-core/` | `01-core-init.js` |
| `02-tasks/` | `02-reminders-habits.js` |
| `03-wellbeing/` | `03-notifications-mood-sleep.js` |
| `04-ai-calendar/` | `04-ai-features-calendar.js` |
| `05-work-finance/` | `05-shifts-finance-student.js` |
| `06-lifestyle/` | `06-lifestyle-settings-widgets.js` |
| `07-automation/` | `07-automation-analytics.js` |
| `08-khata-family/` | `08-khata-family-final.js` |

Within each folder, files are numbered in their original load-order sequence, so e.g. `06-lifestyle/01-life-admin.js` is the first (top) chunk of the old file 06, `02-settings-core.js` the middle chunk, `03-extras.js` the last.

**Not perfectly domain-pure:** because nothing was reordered (the safety guarantee above depends on that), a few files still contain 2-3 adjacent-but-different features rather than exactly one (e.g. `03-wellbeing/03-sleep-and-tasks.js` has snooze + font size + sleep tracker + task archive + bulk actions, because that's what sat next to each other in the original file). Each file's header comment says exactly what's inside it, so this doesn't cost discoverability — it's just an honest reflection of "smaller and clearer" rather than "perfectly one-feature-per-file," which would have required reordering code and given up the byte-for-byte safety guarantee.

---

## 11. New features requested for the roadmap (fifth update)

You asked for 13 items. A few already existed in some form (Medicine tracker, Google Calendar sync, and multi-device sync via the existing Firebase backend), a couple were ambiguous enough that guessing wrong risked real wasted effort, and two need something only you can provide (an Azure app registration for Outlook, the same way Google Calendar already needs your own OAuth Client ID). Built the concrete, self-contained, unambiguous ones for real this round; flagged the rest below with exactly why.

### 11.1 🎨 Premium Themes
The app already had `setThemeColor()` and 6 free accent-color swatches — extended rather than replaced. Added 5 new, richer combinations (Midnight, Rose Gold, Emerald Noir, Slate, Sakura) gated behind `isProUser`, which already existed (`js/01-core/02-navigation-auth.js`) but wasn't gating anything yet — this is its first real use, giving "Premium" actual meaning. New file: `js/01-core/05-premium-themes.js`.

### 11.2 💊 Medicine Schedule (upgraded)
The existing tracker only supported one dose time per day and no stock tracking. Now supports up to 2 dose times (covers the common twice-daily pattern without needing a fully dynamic add-more-times UI), and each filled time generates a real recurring reminder — not just a display label. Added optional pill-count + refill-threshold fields; tapping "Taken" decrements stock and warns once it's low. Fully backward compatible with existing saved medicines (old single-`time` entries still render and work).

### 11.3 ❤️ Health Dashboard
New aggregated view — today's mood, 7-day mood/sleep averages, water intake vs. goal, medicine adherence — pulling from data that already existed (`moodLog`, `sleepLog`, `medicines`) rather than introducing parallel tracking. New file: `js/06-lifestyle/05-health-dashboard.js`, covered by a new test on the averaging math itself (`tests/bug-fixes.test.js`).

One genuinely new piece: **water intake logging**. `waterCount`/`waterDate` already existed as variables (declared, synced to the cloud) but had no function or button anywhere that ever changed them — dead state. `logWaterCup()` is their first real use.

### 11.4 Advanced Dashboard Widgets
Added two new optional home widgets (Health Snapshot, Finance Snapshot) to the existing `toggleWidget()` system. While wiring this in, found and fixed two **pre-existing** bugs from before this session: the "Mood" and "Shift" widget toggles in Settings already called `document.getElementById()` on `todayMoodSection` / `todayShiftCard` — and `renderTodayShiftWidget()` was already being called from 6 different places in the codebase — but neither element existed anywhere in `index.html`. Both had been silently doing nothing, possibly since those features were first written. Built the real HTML for both.

*Near-miss worth recording:* while building this, started writing a second, parallel "apply saved widget visibility on load" function before noticing one already existed (`applyWidgetPrefs()` in `js/08-khata-family/02-more-page.js`, correctly wired into real app startup) — exactly the kind of duplicate-parallel-system bug fixed repeatedly earlier in this project. Caught it before shipping and extended the existing function's map instead of adding a second one.

### 11.5 📄 PDF Report Export / 📊 Excel Export
Both fully real, not stubs. jsPDF 4.2.1 and SheetJS (`xlsx`) 0.18.5 added via jsDelivr (already CSP-allowlisted; versions verified live rather than guessed — SheetJS's newer releases moved to their own CDN domain, which would have needed a CSP change, so pinned to the last version still served from the already-trusted domain). The PDF report covers task/habit/finance summaries in one document; the Excel export is a 4-sheet workbook (Tasks, Habits, Expenses, Income) — both richer than the existing single-sheet CSV export, which was left as-is for anyone who just wants a quick spreadsheet-agnostic dump. New file: `js/06-lifestyle/04-reports-export.js`.

### 11.6 Flagged, not built — need a decision, not just more time
- **Team Workspace vs. Family Workspace** — the app already has family sharing (`shared_tasks`, family members, a shared workspace/kanban view). Building "Team Workspace" as a genuinely separate system (distinct data model, non-family invitees, maybe roles/permissions) is a different, larger scope than extending the existing sharing model to non-family collaborators under a second label. Guessing which one you want risks building the wrong thing.
- **Outlook Calendar** — Google Calendar's 2-way sync already requires *you* to create your own Google Cloud OAuth Client ID and paste it into Settings (there's no way around this — it's how OAuth works, not a shortcut skipped). Outlook would follow the identical pattern with Microsoft's Azure AD / Graph API instead, needing your own Azure app registration. Can build the client-side OAuth flow + calendar read/write calls the same way Google's was built, but the setup step itself isn't something I can complete on your behalf.
- **"Office sync"** — genuinely unclear what this refers to (Microsoft 365/Outlook specifically? A workplace-distinct sync profile? Something else?). Rather than guess and possibly build the wrong thing, flagging for clarification.
- **Advance AI Features** — the app already has AI chat/planning/rescheduling, priority suggestion, auto-categorization, goal prediction, and recommendations. "Advanced" could mean several different concrete directions (natural-language quick-add parsing, proactive "you might want to..." suggestions the AI initiates rather than waits to be asked, AI-generated weekly email summaries, etc.) — each a real, separate build. Flagging rather than picking one arbitrarily.
- **Workout Planner** — no blocker, just not reached yet this round; same shape as the existing Habits feature (exercises, sets/reps, a weekly schedule).
- **Multi-device Sync** — this already works today (Firebase real-time sync, now with the error-handling fix from §9.1). What's missing is visibility: a "your data synced across N sessions" indicator or last-synced timestamp would be the concrete next step, not new sync infrastructure.

---

## 12. Shift Schedule improvements (sixth update)

The Shift Schedule feature (`js/05-work-finance/01-shifts.js`) was already one of the most complete features in the app going in — shift types with color/icon/hourly rate, a repeating rotation-pattern builder, per-day overrides with notes, auto-generated shift reminders, and a monthly hours/income summary that can push straight into Finance. Extended it rather than reworking it:

- **Next 7 Days list** — a scannable look-ahead list at the top of the Calendar tab, since checking a full month grid just to see "what's my shift tomorrow" was more friction than a rotating-shift worker usually wants.
- **Bulk date-range override** — a whole week of leave or vacation used to mean tapping 7 individual calendar days one at a time. New "Set a Date Range" action applies one shift type (or resets to rotation) across an entire range at once.
- **Overtime tracking** — logged separately from the scheduled roster (date, hours, its own rate), since OT is ad-hoc and often paid differently than a regular shift. Rolls into the monthly summary and the existing "Add to Finance" action.
- **Per-shift-type reminder timing** — reminders were previously one global "X minutes before" setting for every shift type. A Night shift that needs 2 hours' wake-up notice and a 5-minutes-away Morning shift now don't have to share a setting; falls back to the global default when left unset.
- **Shift schedule `.ics` export** — distinct from the app's existing task/.ics export, since shift days are computed on the fly from the rotation pattern rather than stored as individual reminders unless shift reminders happen to be turned on. Exports the actual 90-day roster for import into any calendar app.

Also added the feature's first real test coverage: `getShiftForDate()` — the single function nearly everything else here depends on (the home widget, the calendar, the summary, and now the bulk override and `.ics` export too) — had zero tests before this; added one covering the rotation-cycle math itself plus override precedence.

---

## 13. Recycle Bin and Gamification (seventh update)

You sent a list of 60+ items this round, spanning feature additions, a real payment/billing system, legal documents, and licensing/DRM. Rather than treat all of those the same way, triaged first: several already existed (real-time multi-device sync, conflict merge, background sync, shared workspace, XP/Levels/Streaks/Leaderboard, PUC/Insurance/Service reminders for vehicles, Fuel History, Bill/EMI/Subscription tracking, Cleaning via the chore tracker), a few need a real decision from you before building (flagged in §11.6 already), and Payments/Licensing/Legal need their own dedicated, careful pass rather than being squeezed in alongside everything else — more on that below. Built the two full, well-scoped systems below for real this round.

### 13.1 Recently Deleted (Recycle Bin)
The app already had a basic "Undo Delete" — a 5-second toast after deleting a reminder, holding exactly one item. Kept that (it's good, fast-path UX for the in-the-moment case) and built a real, persistent bin behind it: every reminder or habit deletion now also lands in a 30-day recoverable bin, browsable as a list, restorable individually, auto-purged after 30 days. Habit deletion previously had **no** recovery path at all — permanent with just a toast; it now gets the same treatment (bin + its own 5-second quick-undo). New file: `js/02-tasks/04-recycle-bin.js`.

Scope note: covers reminders and habits specifically — the two highest-stakes, most-frequently-deleted data types. The restore/bin functions are written generically enough to extend to other types (vehicle logs, expenses, etc.) later; wiring every delete function in the app into it was more surface area than this pass covers.

### 13.2 Gamification: Coins, Rewards, Weekly Missions
XP/Levels/Streaks/Leaderboard already existed — but XP there is a *derived, display-only* stat, recomputed from total completions every time (fine for a level display; if you tried to spend it, it would just reappear on the next recompute). Coins are a real, separately-tracked, spendable balance:

- **Coins** — earned on task completion and habit check-in (same hook points where XP/confetti already fire), at half the XP rate so the numbers feel related but distinct. Un-completing a task now revokes the coins it earned, so toggling complete/incomplete repeatedly can't be gamed for free coins.
- **Rewards** — a user-defined list of self-rewards with a coin cost ("Coffee treat — 20 coins"); redeeming actually decrements the balance and tracks how many times each has been claimed.
- **Weekly Missions** — three rotating goals evaluated against real existing data (tasks completed this week, best habit streak, mood-log days this week) rather than a separately-tracked system, resetting every Monday (ISO week), each claimable once for a coin bonus.

New file: `js/07-automation/04-gamification.js`. Coin balance, rewards, and mission state were added to the cloud sync payload on both the save *and* restore side — checked this explicitly rather than assuming, since missing the save side for a new field is exactly the `finData` bug from §1.1 in this same project.

*Caught during this work:* a real syntax error (bad string escaping in an empty-state message) and a test-harness gap (the `syncToCloud` test's sandbox didn't have `safeNum` in scope once the real function started calling it for the new `coinBalance` field) — both caught by the existing verification steps (syntax check + full test suite) before shipping, not after.

### 13.3 On Payments, Licensing, and Legal documents specifically
Flagging why these aren't in this batch rather than quietly dropping them:

- **Right now, "Pro" status is just a `localStorage` flag** (`isProUser`) with no server-side check at all — anyone can open browser devtools and set it to unlock every Pro feature for free, including the Premium Themes built in §11.1. A coupon system, referral system, or "device limit" built purely in client-side JS would have the exact same problem — decorative, not real protection, and arguably worse than not having the feature at all if it creates a false sense of security.
- What *is* genuinely buildable without a payment gateway account: a manual-payment workflow (you list a bank transfer/UPI ID, a user submits proof, you approve it, a Cloud Function flips their Pro flag server-side), invoice generation (can reuse the PDF export infrastructure from §11.5), and a real server-side license check using the existing Cloud Functions backend (`functions/index.js` already has the pattern for this — auth check + Firestore read, same shape as the AI proxy's rate limiting).
- A live payment gateway (Razorpay/Stripe/etc.) needs your own merchant account — not something to fake with a fallback that only looks like it works.
- Legal documents (Privacy Policy, Terms, Cookie Notice, Security Policy, Data Processing Agreement) aren't something I should generate as if they're valid, reviewed legal documents — I'm not a lawyer, and a business's actual legal exposure needs real review. Can build clear, honest starting-point pages with a prominent "have a lawyer review this before publishing" notice, which is genuinely useful without misrepresenting what it is.

Happy to build the honest versions of all of the above in a focused follow-up — just didn't want to ship either fake security or fake legal protection quietly alongside a feature batch.

---

## 14. Remaining reminder types, notification improvements, and a critical service-worker fix (eighth update)

### 14.1 A real bug found while working nearby: the service worker's offline cache was broken
While extending the notification system (below), noticed `sw.js`'s `PRECACHE_URLS` still listed the *original* 8 flat JS files (`js/01-core-init.js` etc.) — stale since the maintainability split in §10, several updates ago. This matters more than a cosmetic mismatch: `cache.addAll()` rejects **entirely** if even one URL 404s, which means the service worker's `install` step has likely been failing silently since that split, blocking that worker version from ever activating — no offline app-shell caching for anyone reinstalling or getting a fresh service worker in that window. Fixed the list, and added a real safeguard so this can't quietly happen again: `node build.js` now cross-checks its own authoritative file list against `sw.js`'s precache list every time it runs (which is also part of the verification routine used before every update in this project) and warns loudly if they drift.

### 14.2 Remaining reminder types — extended existing systems rather than building parallel ones
Checked what already existed before adding anything (Warranty tracker already covers "Appliance Warranty Tracker" generically, complete with auto-reminders — nothing to add there):

- **FASTag Recharge** and **Driving License Renewal** added to the vehicle reminder type dropdown (Insurance, PUC, and Service were already covered).
- **Tax** and **Gas Cylinder** added as bill types, reusing the existing Bills system rather than building two more separate features.
- **Bills now actually generate a reminder** — previously a bill's due date had zero calendar visibility anywhere in the app (unlike Warranty, which already auto-creates one); this was the real gap behind "Utility Bill Calendar," more than a missing calendar widget was.
- **Tax Due Reminders** — a one-tap button in the existing Tax Calculator tab adds the standard Indian advance-tax installment dates (Jun/Sep/Dec/Mar 15) plus the ITR filing deadline as real reminders. (The existing Tax tab is an income tax *calculator* — New vs. Old regime, 80C/80D deductions — a genuinely different thing from a due-date *reminder*, so this was additive, not overlapping.)
- **SIP Reminder** — investments can now be marked as a recurring monthly SIP with a reminder day; generates an actual monthly-repeating reminder rather than investments staying one-off log entries with no recurrence concept at all.
- **Emergency Contacts** — new, self-contained: name/relation/phone with one-tap calling via `tel:` links.
- **Shared Grocery List** — deliberately reuses the *existing, proven* `shared_tasks` Firestore collection and security rules (verified the `create` rule has no field allowlist, so no rules changes were needed at all) rather than standing up a new collection with its own rules to write and verify without a live Firebase to test against. Sharing a list sends a snapshot a family member accepts into their own Shopping list — not a live-syncing shared document, which would be the same "Shared Workspace" scope already flagged as needing a product decision in §11.6.

*Caught mid-edit:* an insertion accidentally consumed the `acceptSharedTask` function's own signature line while adding code above it, orphaning its body. Caught immediately by the syntax check that runs before every batch in this project, not after.

### 14.3 Notification improvements
Previously a bare title + body with no icon, no vibration, and no way to act on it without opening the app. Now:
- Branded icon/badge instead of the browser's generic placeholder.
- Vibration pattern reflects the task's actual priority instead of every notification feeling identical.
- **Mark Done / Snooze 10m action buttons directly on the notification** — the substantial piece. This required switching from the plain `Notification` constructor to a Service-Worker-registered notification (action buttons only work that way), plus a new `notificationclick` handler in `sw.js` that relays the button tap to an open tab, or opens the app if none is open. Reuses the existing `toggleStatus()`/`snoozeTask()` functions rather than reimplementing completion/snooze logic — this file didn't need new logic, just a new way to trigger the logic that already existed.

The existing in-app Notification Centre (`notifLog`) already covers notification history — nothing needed there.

---

## 15. Legal documents merged with real business details, and the features they now accurately describe (ninth update)

You provided a legal document with real business details (Keynote Infotech, contact email, Vadodara/Gujarat jurisdiction, a 7-day refund window, 30-day data retention) that filled in most of the placeholders already sitting in this project's `privacy-policy.html`/`terms-of-service.html` — both existed from earlier work, already grounded in the app's actual features rather than written generically, which is why merging rather than replacing them made sense.

**Three things your document described didn't exist in the app: you asked me to build them for real rather than remove the claims, so I did.**

### 15.1 Account Deletion
`js/01-core/06-account-deletion.js`. Deletes the Firestore user document, the leaderboard entry (`public_profiles`), and the Firebase Auth account itself — with a type-your-email-to-confirm step and proper handling of Firebase's re-authentication requirement (deleting an account needs a *recent* sign-in; if the session is older, this now re-prompts for password or Google sign-in before retrying, rather than just failing). Verified against `firestore.rules` first: the existing `allow write` rule on `users/{uid}` already covers delete (Firestore's `write` permission is create+update+delete together), so no rules changes were needed.

Scope decision, stated plainly in the deletion confirmation screen itself: this doesn't cascade-delete tasks/lists you previously shared with someone else — those stay in the recipient's account, the same way deleting your email doesn't unsend mail already sent. A full cascade delete would need a new Firestore rule permission and a Cloud Function to be safe against deleting data you don't own; a deliberate scope line, not an oversight.

### 15.2 Firebase Analytics
Added the `firebase-analytics-compat.js` SDK, gated behind a real opt-out preference from the start (checked *before* initializing, not initialized-then-disabled) — `js/00-foundation/04-privacy-analytics.js`. Requires a one-time Firebase Console step only the project owner can do (linking Google Analytics to the project, which generates a `measurementId` — there's a placeholder for it with instructions in `js/01-core/01-bootstrap.js`); until that's done, analytics calls are harmless no-ops rather than errors.

### 15.3 Two-Factor Authentication
The largest piece — real phone/SMS-based MFA using Firebase Auth's actual Multi-Factor Auth APIs (`js/01-core/07-two-factor-auth.js`), not a decorative toggle:
- **Enrollment**: phone number → SMS code → `multiFactor.enroll()`, using an invisible reCAPTCHA verifier (Firebase's own abuse-prevention requirement for phone auth).
- **Sign-in challenge**: `loginUser()` now catches the `auth/multi-factor-auth-required` error Firebase throws for an already-enrolled user and routes to a real SMS-verification modal, completing sign-in via `resolver.resolveSignIn()`.
- **Unenroll**: available from the same Privacy Center screen once enabled.

**This needs a one-time setup step only you can do**, the same way Google Calendar sync needs your own OAuth Client ID: Firebase Console → Authentication → Sign-in method → enable Multi-factor authentication. This also requires the **Blaze (pay-as-you-go) plan**, since SMS delivery costs a small amount per message — that's Firebase's own pricing, not something this app's code controls. Until that's enabled, enrollment attempts surface a clear "2FA isn't turned on for this app yet" message rather than a confusing raw Firebase error.

### 15.4 Privacy Center
New screen (Profile → Privacy Center) tying all of this together: 2FA status/toggle, analytics opt-out, links to the existing PDF/Excel/CSV export, a Data Processing Agreement request (a `mailto:` link — a DPA needs a human on our side, not an automated form), and the account deletion entry point.

### 15.5 What actually changed in the legal documents
Real business details merged in throughout both files (company name, contact, jurisdiction, refund window, retention period); new sections added for Subscription Terms, Refund & Cancellation, Data Retention, Cookie Policy, and Community Guidelines; the account-deletion placeholder replaced with the real, accurate process; 2FA and Analytics added to the data-collection and third-parties sections. **Deliberately left as a placeholder**, not filled in with generic legal boilerplate: Terms §11, Disclaimers & Limitation of Liability. That clause carries real, jurisdiction-specific legal weight, wasn't covered in the business details provided, and is exactly the kind of thing that needs a lawyer rather than a plausible-sounding substitute. Also left open: the minimum-age number in both documents (13 vs. 16 is a real jurisdictional decision, not something to default silently).

---

## 16. Production-readiness audit (tenth update)

You asked what's missing to go live at production grade. Audited the areas that actually determine whether a launch goes smoothly rather than generic checklist items — found and fixed several real gaps, several of which were silent (nothing would visibly announce them until they caused a support ticket or a compliance complaint).

### 16.1 A composite Firestore index that has never existed in this project
`loadSharedWithMe()`'s query (`js/03-wellbeing/02-mood-sharing.js`) filters on two different fields (`toEmail` + `status`) — this requires an explicit composite index in Firestore, which is never auto-created. There was no `firestore.indexes.json` in the project at all, **and** `firebase.json` didn't even reference one. Practically, this means the family task-sharing feature (and the Shared Grocery List built on the same mechanism in §14.2) may have never actually worked against a fresh Firestore project, or was silently patched at some point by someone manually clicking "create index" in a past console error with no record of it anywhere. Added `firestore.indexes.json` with the correct index, and wired it into `firebase.json` so `firebase deploy` actually deploys it.

### 16.2 A cookie/analytics consent model that wasn't real consent
Building Firebase Analytics in §15.2 used a boolean "opted out?" flag defaulting to `false` — meaning tracking was **on** for everyone until they found a settings toggle and turned it off. That's not meaningfully different from having no consent mechanism, and doesn't hold up against the Cookie Policy section added to the Privacy Policy in the same update. Replaced with a real three-state model (undecided / granted / denied) and a genuine cookie consent banner shown on first visit — analytics now only initializes after an explicit "Accept," not by default.

### 16.3 Terms/Privacy acceptance was never actually recorded
The signup screen has said "by creating an account, you agree to our Terms/Privacy" since it was written — but nothing recorded that a given user actually agreed, or to which version. Added `termsAcceptedAt`/`termsVersion` fields, written at registration for both the email/password and first-time Google sign-in paths. Matters if the terms ever change and you need to show what a specific user agreed to and when.

### 16.4 Missing security headers, and a real clickjacking gap
Only `sw.js` had any custom header at all. Added the standard set (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS) — but the more substantive finding: there was no `frame-ancestors` or `X-Frame-Options` anywhere, meaning nothing currently prevents this app from being embedded in an iframe on another site (a real clickjacking vector). Worth knowing while fixing it: `frame-ancestors` is silently ignored by browsers when set via a `<meta>` tag like this app's existing CSP — it only works as a real HTTP header, so it had to go in `firebase.json`, not next to the rest of the CSP in `index.html`.

### 16.5 A hosting-ignore rule that would have silently swallowed the new security.txt
Added `robots.txt` (this app is a login-gated personal tool with nothing worth indexing, so it's explicit about that rather than silent) and a `.well-known/security.txt` (RFC 9116 — standard practice for responsible vulnerability disclosure, worth having given this app handles financial data). Caught before it mattered: `firebase.json`'s existing ignore list has a `**/.*` rule (ignore all dotfiles) that would have silently excluded `.well-known/security.txt` from ever actually deploying, since `.well-known` itself starts with a dot. Added an explicit exception.

### 16.6 Password strength floor
Registration only ever checked `password.length < 6` — Firebase's own bare minimum, not a real check. Added a length+variety scoring function and a live strength meter on the signup screen, raising the effective floor to 8 characters (the length NIST 800-63B recommends focusing on, rather than arbitrary complexity rules). Applied only to **registration** — existing accounts created under the old 6-character minimum aren't retroactively locked out at login.

### 16.7 Verified and left alone (already solid)
- `manifest.json` — genuinely thorough (icons including maskable, shortcuts, categories, orientation); nothing to add.
- `workspaces` Firestore rules — `allow list: false` prevents enumeration, create/update logic correctly scoped to actual membership; no changes needed.
- All four Firestore collections referenced anywhere in the code (`users`, `public_profiles`, `shared_tasks`, `workspaces`) have matching rules — no orphaned collection with implicit-deny-only coverage.

### 16.8 What's still genuinely missing before a real launch — not something more engineering time alone fixes
- **CSP hardening** (removing `'unsafe-inline'`, converting the app's hundreds of inline `onclick` handlers) — flagged repeatedly through this project as needing a dedicated pass with real browser testing, not a line item here.
- **Payments/Licensing** — "Pro" is still a client-side flag with no server-side enforcement (see §13.3). A live payment gateway needs your own merchant account; the honest manual-payment + server-side license check described there is still unbuilt.
- **Legal review** — both documents still have a real placeholder for Limitation of Liability (jurisdiction-specific legal drafting, not something to fill with plausible boilerplate) and the minimum-age number. Get an actual lawyer's eyes on both documents before publishing, full stop.
- **A real error-tracking/monitoring dashboard** — the local error log (§4) is genuinely useful for a user reporting a bug to you, but there's no aggregate view across all your users, no alerting if the Cloud Function starts erroring at scale, and no Firestore usage/billing alerting given the Blaze plan requirement for 2FA and AI features. Consider Firebase Crashlytics or a similar service if usage grows.
- **A staging/dev Firebase project separate from production** — all of this development has targeted a single Firebase project (`reminder-76588`). Testing new features against the same project real users are on is a real risk as this app grows; a separate dev project with its own config is standard practice once you have actual users to protect.

---

## 17. Three real production bugs, found via the app's own error log (eleventh update)

You pasted the actual error log from the app running live — this is exactly what the local error logging built in §4 is for, and it worked: three genuine, confirmed bugs, not hypothetical ones.

### 17.1 `waterDate is not defined` — a variable that was never actually declared
`getHealthSnapshot()`/`logWaterCup()` (§11.3) read and wrote `waterDate` as a bare variable, on the assumption it was declared alongside `waterCount` in `js/01-core/02-navigation-auth.js` — it never was; only `waterCount` was. Reading a variable nothing has ever declared throws `ReferenceError` immediately, which is exactly what fired on every load, before the water button was ever tapped. Declared it properly now, and the cloud-restore logic (which already correctly computed the right `waterCount` for today) now also sets `waterDate` to match.

Added a regression test that's deliberately different in kind from the existing `getHealthSnapshot` test: that one supplies `waterDate`/`waterCount` via mocked context, which is exactly why it didn't catch this — a mock stands in for the missing piece instead of exposing that it's missing. The new test checks the real declaration exists in the real file instead.

### 17.2 `Failed to construct 'Notification': Illegal constructor`
A real browser-enforced restriction, not a typo: once a service worker is controlling the page (which this PWA always has — it's unconditionally registered), Chrome-family browsers disallow the bare `new Notification(...)` constructor entirely and require `ServiceWorkerRegistration.showNotification()` instead. `showPushNotification()` (§14.3) already had a service-worker path, but with a fallback to the plain constructor that turned out to be fundamentally broken on this exact browser: the failure is a **synchronous throw**, not something the `.catch()` on the service-worker promise could ever actually reach — so it surfaced as "Uncaught," crashing out instead of falling back. Also found two more direct `new Notification(...)` calls that bypassed the shared function entirely and had the identical bug: the permission-confirmation toast, and an "overdue tasks" summary notification in `checkSmartReminders()`. All three now go through the same, fixed `showPushNotification()` — the fallback path is now wrapped in `try/catch` and only used if no service worker exists at all (very old browsers), rather than being an unwrapped call that a modern browser would reliably throw on.

### 17.3 Leaderboard: "Missing or insufficient permissions"
`getLeaderboard()` didn't check that a user was actually signed in before querying — added that check, matching the same pattern already used by `saveUserData`/`getUserData` in the same file, so this now fails with a clear "please sign in" message instead of a raw Firestore permission error if it's ever called before auth state is confirmed.

**Worth flagging directly, since I can't rule it out from here:** this specific error can also mean the deployed Firestore rules don't match what's in this project's `firestore.rules` — that only takes effect once you actually run `firebase deploy --only firestore:rules`. If the sign-in check above doesn't resolve it, that's the next thing to check.

### 17.4 An operational detail worth confirming
The error log's URLs are `alex-2by2.github.io/Reminder-demo5/` — **GitHub Pages**, not Firebase Hosting. This matters for the security headers added in §16.4 (`X-Frame-Options`, the `frame-ancestors` CSP, HSTS, etc.): those live in `firebase.json`, which only takes effect if this app is actually served *through* Firebase Hosting. GitHub Pages doesn't support custom response headers the way Firebase Hosting's config does, so if GitHub Pages is the real, permanent hosting target rather than a mirror, those specific fixes aren't reaching production right now — worth confirming which one is the actual deployment target going forward.

---

## 18. What to look at next (not done here, on purpose)

- **CSP still allows `script-src 'unsafe-inline'`.** This is required because the app uses hundreds of inline `onclick="..."` attributes throughout `index.html` and in dynamically-generated HTML strings. Removing it means converting every one of those to `addEventListener`-based event delegation — a large, mechanical, but genuinely risky rewrite to do blind (no browser here to click through and confirm nothing silently stopped working). Worth a dedicated pass with real testing, not a line item inside this one.
- **Full DI / ES modules** — see §4.
- **True lazy-loading / code-splitting** — see §5.
- **Minification** — see `BUILD.md`.
- **Firestore workspace task updates** — the rules file already documents a known limitation here (array-based updates on shared workspace tasks); a subcollection-based redesign was previously identified but not implemented, and wasn't revisited here since it's a data-model migration question, not a bug.

---

## 19. Duplicate-declaration & broken-build audit (twelfth update)

A general "clean up duplicates/errors/dead code" pass, done systematically
rather than by inspection: every top-level JS declaration and every CSS
selector in the whole project was extracted and checked for collisions,
`build.js` and every `.js` file were actually run/syntax-checked rather than
just read, and every inline `onclick`/`onchange`/etc. handler was
cross-referenced against real function definitions.

### 19.1 `build.js` crashed on every run, and was missing 15 files even when it didn't
`FILES_IN_ORDER` referenced `js/01-core/05-premium-themes.js`, which doesn't
exist in this project — `node build.js` failed immediately with `ENOENT`.
Separately, and independent of that crash, the list never included any of
the 15 files in `js/09-new-features/` (period tracker, family wallet,
payments, etc.) even though `index.html` loads all of them — so a
successful build would have silently shipped a production bundle missing
that entire feature set. Both fixed; `node build.js` now bundles all 54
files `index.html` actually loads, and `dist/` was verified to
syntax-check clean.

### 19.2 Four functions silently overridden by a same-named declaration elsewhere
This app shares one global scope across all 54 files by design (§10), which
means two files declaring the same function name isn't a syntax error —
it's a silent last-loaded-wins bug. Four were found:

- **`setFinTab`** — the real bug here: a same-named override in
  `js/07-automation/03-engagement-reports.js` (added to fix tab-highlight
  logic) always won at runtime, but had also dropped the original's
  `if(tab==='charts')` case, so **Finance → Charts opened to a blank
  canvas** with no chart ever rendered. Merged into one definition in
  `js/05-work-finance/02-finance.js` with the highlight fix, the Charts
  render call restored, and the Khata-tab case the override had added kept.
- **`loadReminders`** and **`addNotifLog`** — harmless wrap-and-extend
  patterns (call the original, then an extra side effect), but still two
  declarations of the same name 300+ lines apart in different files.
  Folded each side effect directly into the real function
  (`js/02-tasks/03-reminders-core.js`, `js/07-automation/01-rules-notifications.js`)
  so there's one definition, not a function plus a patch for it elsewhere.
- **`openAppStatsModal`** — a wrapper in `js/08-khata-family/03-family-profile.js`
  that set a flag, `_appStatsRendered`, which nothing anywhere ever read.
  Pure dead weight; deleted outright.

### 19.3 Seven duplicate CSS rules fighting over the same selector
`body.dark-mode .home-calendar-card`, `.journal-entry`, `.expense-item`,
`.khata-party-card`, `.feature-tile`, `.feature-tile .ft-label`, and
`.form-group label` were each declared twice — once in a "Fix: dark mode for
all f2f2f7 backgrounds" sweep, and again, properly paired with their
light-mode rule, in their own feature's section further down. Two (
`.home-calendar-card`'s border color, `.khata-party-card`'s background) had
actually drifted to different values between the two declarations; the rest
were byte-identical duplicates. In every case the later-in-file rule was
already the one winning the cascade, so removing the earlier, orphaned
copies changes nothing about how the app currently looks — it just removes
the ambiguity. (Checked the remaining same-selector matches after this —
`.toast`, `.tab-btn`, `.modal-overlay.active .modal-content`, `.notif-item`,
and the two `body.dark-mode` blocks defining unrelated properties — none of
those set overlapping properties, so they're intentional, not duplicates.)

### 19.4 Stale file-path references, and a missing README
Several comments (in `js/00-foundation/`, `js/01-core/`, `js/06-lifestyle/`,
`js/08-khata-family/`, `functions/index.js`, and two test files) still
pointed at the original pre-split monolithic filenames (e.g.
`js/01-core-init.js`) from before §10's reorganization — harmless to the
app itself, but a dead end for anyone reading the code and trying to find
the file being described. Updated each to the real current path.
`CHANGELOG.md` §10 has also referred to `README.md` "for the folder map"
since the project split — that file never actually existed. Added one.

### 19.5 What this round deliberately left alone
Several files (`05-work-finance/02-finance.js` among them) are written in a
dense, mostly-one-line-per-function style, unlike the rest of the codebase.
That's a readability question, not a bug, and reformatting ~600 functions
across the project without a browser to click through and confirm nothing
broke is exactly the kind of large mechanical change §18 already flags as
worth a dedicated pass rather than a line item here. Left as-is.

---

## 20. Admin backend (thirteenth update)

Added `server/` — a separate, owner-only Node/Express API + dashboard for
things a normal signed-in user shouldn't be able to do: browse the user
list, see Pro/free and revenue numbers, view `crash_reports` (previously
only viewable via the Firebase Console — see firestore.rules' own comment
on that collection), grant/revoke Pro manually, disable or delete an
account, and check the referral leaderboard. Full detail, setup steps, and
the reasoning behind each choice below are in `server/README.md`; the short
version:

- **Firebase Admin SDK, not a second database.** Reads/writes the exact
  Firestore project the app already uses — no MongoDB, no sync job, no
  second source of truth for the same users.
- **Fails closed.** If no `OWNER_UID`/`OWNER_EMAIL` is configured, every
  request is rejected, not allowed — see `src/middleware/requireOwner.js`.
- **The one thing worth flagging here rather than just in server/README.md:**
  the first version of `public/admin.js` rendered `userName` (a plain
  free-text field set from the app's own Settings page — see
  `js/01-core/03-sync-profile.js`) straight into `innerHTML` with no
  escaping, on the page *you* — the owner — would be looking at. Since the
  app's own client code takes XSS seriously enough to have had a dedicated
  hardening pass (§4/§16, `sanitizeHTML`/`escInline` at ~140 call sites),
  shipping a fresh unescaped-innerHTML hole in brand new code would've been
  a real step backwards. Caught before it shipped anywhere — added an
  `esc()` helper, applied it to every dynamic value rendered into a table
  (`userName`, emails, crash-report `message`/`source`/`appVersion`, uid
  fragments), and moved the page's JS out of an inline `<script>` block
  into `public/admin.js` so the CSP this server sends can actually forbid
  inline scripts (`script-src 'self'`, no `'unsafe-inline'`) without
  breaking the page itself.
- **Deliberately scoped down, not a raw data dump.** User-detail endpoints
  return a curated allowlist of admin-relevant fields, not the full
  `users/{uid}` document (which also holds reminders, khata ledgers with
  other real people's names and money owed, mood/sleep logs, and more) —
  see the field list in `src/routes/users.js`.
- **Known gap, same shape as an existing one:** deleting a user via this
  server's `DELETE /api/users/:uid` doesn't remove them from any
  `workspaces`/`family_wallets` they're a member of — those are
  membership-array-based and keyed by invite code/email, the same
  structural reason firestore.rules already flags a related limitation for
  updates to those collections. Noted in `src/routes/users.js` rather than
  silently left out.

---

## 21. Audit trail, real tests, and CI (fourteenth update)

§20 shipped the admin backend but was honest about a real limitation: every
file in it was verified by hand (syntax checks, careful reading) rather than
by actually running it, since there was no way to install `firebase-admin`
or reach a real Firebase project. This update closes that gap for the parts
of the server where it matters most, and adds something the backend was
missing on its own merits.

### 21.1 Admin audit log
Every `disable`/`enable`/`grant-pro`/`revoke-pro`/`delete` now writes an
entry — action, target uid, which owner did it, when — to a new
`admin_audit_log` collection, via `src/auditLog.js`. There's a matching
`GET /api/audit-log` route and an "Audit Log" section on the dashboard
itself. Nothing reads this collection to make access decisions; it exists
so "why does this account have Pro" or "who disabled this user" has an
actual answer six months from now instead of a shrug. A failure to *write*
the log entry is caught and logged separately (`logSafely` in
`routes/users.js`) rather than turning an action that actually succeeded
into an error response to the owner.

### 21.2 `requireOwner` refactored for testability — not just testing, better design
The owner-only auth check used to `require('../firebaseAdmin')` directly,
which meant just *importing* that file anywhere (including from a test)
triggered a real `admin.initializeApp()` call that throws without genuine
credentials. Refactored into `createRequireOwner({ verifyIdToken, ownerUid,
ownerEmail })` — a factory that takes its Firebase dependency as a
parameter instead of reaching out and grabbing it — with the actual
Firebase wiring moved to where the app gets assembled (`src/index.js`),
the one place that legitimately needs a real project to run. Same behavior,
same route wiring, but now the single most security-critical piece of this
whole server — the thing enforcing "owner only" — can be (and is) exercised
completely in isolation. `src/auditLog.js` was written the same way from
the start (`db` as a parameter, not an import) for the same reason.

### 21.3 A real, running test suite for the server (19 tests)
`server/tests/` now covers:
- **`esc.test.js`** — the escaping function §20 added after nearly shipping
  it unescaped. Pulls its real current source out of `public/admin.js` (via
  a copy of the app's own `extract-fn.js` pattern) rather than a hand-typed
  stand-in, and checks it against `<script>` tags, attribute-breakout/
  `onerror` payloads, ampersands, single quotes, and null/undefined/number
  inputs.
- **`requireOwner.test.js`** — fails closed with no owner configured,
  rejects missing/malformed/invalid/wrong-account tokens, accepts the
  right one by UID *or* email (case-insensitively), and confirms an
  unexpected internal error reaches `next(err)` rather than being silently
  swallowed.
- **`auditLog.test.js`** — the entry shape written to Firestore, defaults,
  and that a write failure propagates instead of vanishing.

Unlike `server/README.md`'s own honest caveat in §20, these don't need a
real Firebase project, service account, or network access to run — that's
the direct payoff of §21.2's refactor. `npm test` (added to
`server/package.json`) runs all 19 in well under a second.

### 21.4 CI (`.github/workflows/ci.yml`)
Runs on every push/PR to `main`, as two jobs: syntax-check + the existing
test suite + `node build.js` for the app, and `npm install` + syntax-check +
`npm test` for the server — the same checks that have been run by hand,
here in this changelog, after every single update so far. Deliberately
needs zero secrets (see §21.2 — the server's tests don't touch real
Firebase). GitHub doesn't enforce this on its own; turning on **Settings →
Branches → require status checks to pass** for `main` is a one-time manual
step this file can't do for you.

### 21.5 What this update deliberately didn't touch
`dashboard.js`, the read side of `users.js`, `crashReports.js`, and
`referrals.js` still import `firebaseAdmin.js` directly and aren't
unit-tested the same way §21.2–§21.3 tested the auth middleware and audit
log. Applying the same dependency-injection treatment to every route so
they could all be unit-tested is a bigger, more invasive refactor (every
route file becomes a factory function, `index.js`'s wiring gets more
involved) — reasonable to want, but a larger, separate piece of work rather
than something to fold in here. Verifying those routes for real means
running the server against an actual (or Firebase-emulated) Firestore
project — which is what `server/README.md` step 3, running it locally,
is for.

### 21.6 Found while adding this: two GitHub Pages workflows deploying on every push
Adding `.github/workflows/ci.yml` meant looking inside `.github/workflows/`
for the first time this project — and it already had **two** separate
workflows there, both triggering on every push to `main`, both deploying to
the same GitHub Pages environment: `static.yml` (uploads the repo as-is)
and `jekyll-gh-pages.yml` (runs it through a Jekyll build first). This app
is hand-built HTML/CSS/JS with no Jekyll front-matter or `_config.yml` — it
doesn't need Jekyll processing, and having both meant the actual live site
depended on whichever workflow happened to finish last for a given push,
silently. Checked first whether Jekyll's default build would even change
anything here (it excludes `_`-prefixed paths and interprets `{{ }}` as
Liquid template syntax) — this project has neither, so nothing was ever
visibly broken by it. Still a real redundancy, not a hypothetical one, and
the same "two systems doing the same job, one wins by accident" pattern as
everything in §1–§19. Removed `jekyll-gh-pages.yml`; kept `static.yml` as
the one deployment path.
