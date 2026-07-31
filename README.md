# Master Reminder App

A personal productivity app for reminders, habits, and more

## 🚀 Getting Started
Log in with Google or email/password and start adding reminders.

## Project structure
```
js/
  00-foundation/   Central config, feature flags, error logging, permission
                   manager, API layer, service registry — loads first.
  01-core/         Firebase init & auth, navigation, cloud sync, calendar, Pomodoro.
  02-tasks/        Reminders and habits.
  03-wellbeing/    Notifications, projects, mood/sleep tracking, sharing/integrations.
  04-ai-calendar/  AI assistant, family calendar, kanban/workspace.
  05-work-finance/ Shifts, finance, student mode, journal.
  06-lifestyle/    Life admin (medicine/vehicle/travel/etc.), settings, extras.
  07-automation/   Automation rules, analytics, engagement features.
  08-khata-family/ Khata (ledger), the "More" page, family sharing, planning tools.
```
Every file in `index.html` loads as a plain `<script defer>` in the order listed
above — there's no build step required for development (see `BUILD.md` for the
optional production bundling step). Each file's top comment describes exactly
what's in it. See `CHANGELOG.md` for the reasoning behind this structure and
the full history of changes made to this project.
