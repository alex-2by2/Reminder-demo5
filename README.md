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
- **🎓 Student Mode**: Subject management, exam countdown, study sessions (NEW!)

## 🎓 Student Mode Features (NEW!)
- **Subject Management**: Create color-coded subjects with teacher codes and grades
- **Exam Scheduler**: Schedule exams with automatic countdown timers
- **Study Timer**: Track study sessions with flexible durations (15/30/45/60 min)
- **Progress Tracking**: Monitor marks, percentages, and grades per subject
- **Study History**: View all study sessions grouped by date
- See [STUDENT_MODE_GUIDE.md](STUDENT_MODE_GUIDE.md) for detailed usage

## 🚀 Getting Started
1. Open `index.html` in a browser or serve the folder with a local web server.
2. Use the settings screen to paste your Gemini API key and optional Google Calendar Client ID.
3. Log in with Google or email/password and start adding reminders.

## 📁 Added Files
- `manifest.json` — PWA metadata
- `sw.js` — basic offline asset caching
- `STUDENT_MODE_GUIDE.md` — User guide for Student Mode
- `STUDENT_MODE_DEV_DOCS.md` — Developer documentation
- `IMPLEMENTATION_ROADMAP.md` — Roadmap for future features

## ⚠️ Notes
- Firebase config is stored in `index.html`; update it only if needed.
- This repo is a demo app; avoid using sensitive production keys in public repos.
- Student Mode data is stored in Firestore with real-time sync
- All features work offline with local caching

## 📱 Upcoming Features (Planned)
- Finance Module (Expense Tracker, Budget, Bills, Savings Goals)
- Professional Features (Advanced Notifications, Multi-language, Automation)
- Wellness Features (Medicine Scheduler, Vehicle Reminder, Health Tracking)
- Lifestyle Features (Daily Journal, Life Timeline, Travel Planning)

See [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) for detailed roadmap.

## 🚀 Getting Started

1. Clone this repo
2. Set your Firebase and Gemini keys in `index.html`
3. Open `index.html` in your web browser
4. Done!

## 📞 Features Implemented

### Phase 1: Student Mode ✅
- ✅ Subjects with color coding
- ✅ Exam scheduler with countdown
- ✅ Study timer and history
- ✅ Progress tracking
- ✅ Firebase integration

## License

MIT
