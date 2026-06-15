# Master Reminder App

A personal productivity app for reminders, habits, and more—now with better PWA support, search, offline caching, and improved onboarding.

## ⭐ Features
- Reminders (with tags, priority, repeats, projects, and subtasks)
- Habit tracking with streaks and habit detail analytics
- Pomodoro/focus timer
- Task archive, bulk actions, and Eisenhower matrix
- Google Calendar export + basic 2-way sync support
- Shared tasks, family calendar, and workspace collaboration
- Mood and sleep trackers
- AI-powered task planning, suggestions, and category helpers
- Offline caching via service worker and PWA manifest
- Google Auth and Email/password login

## 🚀 Getting Started
1. Open `index.html` in a browser or serve the folder with a local web server.
2. Use the settings screen to paste your Gemini API key and optional Google Calendar Client ID.
3. Log in with Google or email/password and start adding reminders.

## 📁 Added Files
- `manifest.json` — PWA metadata
- `sw.js` — basic offline asset caching

## ⚠️ Notes
- Firebase config is stored in `index.html`; update it only if needed.
- This repo is a demo app; avoid using sensitive production keys in public repos.

2. _Never_ commit real credentials/API keys in your repo.
3. Set up Firebase database rules securely (see [Firebase docs](https://firebase.google.com/docs/rules)).

## 🚀 Getting Started

1. Clone this repo
2. Set your Firebase and Gemini keys in `app.js`
3. Open `index.html` in your web browser
4. Done!

## License

MIT
