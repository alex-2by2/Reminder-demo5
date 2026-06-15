# 📚 Student Mode - Complete Guide

Welcome to the Master Reminder App's new **Student Mode**! This comprehensive feature set helps you manage your academic life with subjects, exams, and study sessions.

## 🎯 What's New

### 1. **Student Tab** (Bottom Navigation)
- Tap the 📚 icon in the bottom navigation to access Student Mode
- Three tabs: Subjects | Exams | Study Sessions

### 2. **Subject Management**
- Create color-coded subjects with teacher codes and target grades
- Track marks for each subject (current marks vs total marks)
- View percentage calculations automatically
- Edit or delete subjects anytime

**How to Add a Subject:**
1. Tap 📚 Student tab
2. Tap ➕ button
3. Fill in:
   - Subject Name (e.g., Mathematics, Physics)
   - Teacher/Code (e.g., CS101)
   - Choose a color
   - Set target grade (e.g., A+)
4. Tap "Save Subject"

### 3. **Exam Countdown System**
- Schedule exams with date, time, location, and marks
- Automatic countdown display (Today! / Tomorrow / X days left)
- Visual progress bar showing marks vs total
- Organize exams by subject

**How to Schedule an Exam:**
1. Go to Exams tab
2. Tap "Schedule Exam" or use the button in no-exams view
3. Select a subject
4. Enter exam details:
   - Exam name (Midterm, Final, etc.)
   - Date & time
   - Total marks
   - Location (optional)
5. Tap "Schedule Exam"

### 4. **Study Session Timer**
- Track study sessions with flexible durations (15/30/45/60 min)
- Add notes about what you studied
- Automatic notifications when study time is up
- Complete history of all study sessions

**How to Start a Study Session:**
1. Go to Study Sessions tab
2. Tap "▶️ Start Study Session"
3. Select subject
4. Choose duration (15/30/45/60 min)
5. Tap "▶️ Start" to begin timer
6. Use ⏸️ Pause or ⏹️ Stop as needed
7. Add notes about your session
8. Tap "✅ Complete Session"

### 5. **Progress Tracking**
- Click any subject to see:
  - Current marks and percentage
  - Upcoming exams for that subject
  - Recent study sessions
- Color-coded percentage display (Green: 80%+, Orange: 60-79%, Red: <60%)

## 📊 Data Storage

All your student data is stored securely in Firebase Firestore:
- **Subjects**: Color, marks, grades, teacher codes
- **Exams**: Schedule, countdown, progress
- **Study Sessions**: Duration, date, subject, notes

Data syncs automatically when online and works offline with local caching.

## 🎨 Customization

### Subject Colors
Choose from 6 predefined colors:
- 🔵 Blue
- 🔴 Red
- 🟢 Green
- 🟠 Orange
- 🟣 Purple
- 🔷 Teal

### Study Durations
- Standard: 15, 30, 45, 60 minutes
- The timer can be paused and resumed anytime

### Exam Details
- Fully customizable exam names
- Optional location tracking
- Flexible marks system
- Status tracking (scheduled, completed)

## 📱 Features Highlight

✅ **Offline Support** - Works without internet (syncs when online)  
✅ **Dark Mode** - Full dark mode support  
✅ **Mobile-First** - Optimized for all screen sizes  
✅ **Firebase Sync** - Automatic cloud backup  
✅ **Notifications** - Study session alerts  
✅ **Progress Analytics** - Visual progress indicators  
✅ **Color Coding** - Visual organization with colors  

## 🚀 Next Phases (Coming Soon)

The app is designed with a modular architecture for easy expansion:

### Phase 2: Finance Module
- Expense Tracker (daily/monthly expenses)
- Budget Management
- Savings Goals
- Bill Management (EMI, Credit Card, Insurance)

### Phase 3: Professional Features
- Advanced Notifications
- Multi-language Support
- Subscription Tracker
- Automation System

### Phase 4+: Wellness & Lifestyle
- Medicine Scheduler
- Vehicle Reminder
- Attendance Tracker
- Travel Module
- Weather Integration
- Daily Journal
- And more!

## 💡 Pro Tips

1. **Color Code by Subject** - Use different colors for different faculties
2. **Set Target Grades** - Track progress toward your goals
3. **Daily Study Sessions** - Maintain consistency with regular study tracking
4. **Review Sessions** - Use the history to analyze your study patterns
5. **Exam Planning** - Schedule exams early to prepare adequately

## ❓ FAQs

**Q: Can I edit an exam after scheduling?**  
A: Currently exams show countdown info. Subject editing is available through subject menu.

**Q: Where is my data stored?**  
A: All data is stored in Firebase Firestore with your Google/Email login for security.

**Q: Can I use this offline?**  
A: Yes! The app caches data locally and syncs when online.

**Q: How do I delete a subject?**  
A: Tap the ⋯ menu on any subject card, then select Edit, and tap Delete.

**Q: Can I see my study statistics?**  
A: Yes! View study sessions grouped by date in the Study Sessions tab.

## 📞 Support

For issues or feature requests, check the settings screen or export your data for backup.

---

**Version**: 1.0  
**Last Updated**: 2026-06-15  
**Status**: Student Mode Complete ✅
