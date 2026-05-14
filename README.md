# Master Reminder App

A personal productivity app for reminders, habits, and more—works offline and syncs with cloud.

## ⭐ Features
- Reminders (with tags, priority, repeats etc.)
- Habit tracking
- Pomodoro/focus timer
- Analytics and gamification (XP/level-up)
- Voice, image, document, and location attachments
- Offline-first (PWA)
- Google Auth and Email login
- AI-based suggestions (Google Gemini integration)

## 🚨 Important
**Before deploying:**
1. Add your own Firebase and Gemini API credentials in `app.js`.
   - Find and update these lines:
     ```js
     const firebaseConfig = { apiKey: "YOUR_FIREBASE_API_KEY", ... }
     const FIXED_GEMINI_KEY = "YOUR_GEMINI_API_KEY"
     ```
2. _Never_ commit real credentials/API keys in your repo.
3. Set up Firebase database rules securely (see [Firebase docs](https://firebase.google.com/docs/rules)).

## 🚀 Getting Started

1. Clone this repo
2. Set your Firebase and Gemini keys in `app.js`
3. Open `index.html` in your web browser
4. Done!

## License

MIT
