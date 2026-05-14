// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(console.error);
}

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDc-k1JnOySVExS4QbDsbkh7Ro9pvNydIY", authDomain: "reminder-76588.firebaseapp.com", projectId: "reminder-76588", storageBucket: "reminder-76588.firebasestorage.app", messagingSenderId: "813515230126", appId: "1:813515230126:web:dde11175645257dc44d63f"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(); const db = firebase.firestore();
db.enablePersistence().catch(err => { console.log("Offline mode error:", err.code); });

// --- Global Variables ---
let currentUser = null; let timerInterval; let currentTab = 'all';
let editId = null; let userLevel = 1; let selectedDateFilter = null; let currentImageBase64 = null; let isDoc = false;
let userName = "User"; let userAlarmSound = "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"; let voiceAlarmEnabled = false; let pomoInterval; let pomoTime = 1500;
let chartInstance = null; let focusAudio = new Audio(); let currentCalMonth = new Date().getMonth(); let currentCalYear = new Date().getFullYear();
let deletedTaskTemp = null; let deleteTimeout = null; let wakeLock = null; let activeTagFilter = ""; let waterCount = 0;
let mediaRecorder; let audioChunks = []; let voiceMemoBase64 = null; let isProUser = false; let appPinCode = localStorage.getItem("appPin") || null;
let currentEnteredPin = ""; let isMusicPlaying = false; let syncTimeout = null;

// --- GEMINI API KEY FIXED ---
const FIXED_GEMINI_KEY = "AIzaSyBU17fkkveWH9Sd6j_N2uNRBrXQ0HfADaQ";

// --- Navigation ---
function switchPage(pageId) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.add('active');
    document.getElementById('nav-' + pageId).classList.add('active');
    if(pageId === 'add') loadDraft();
    if(pageId === 'home') {
        document.getElementById("taskInput").value = "";
        document.getElementById("notesInput").innerHTML = ""; document.getElementById("timeInput").value = ""; document.getElementById("repeatInput").value = "none"; document.getElementById("priorityInput").value = "medium"; document.getElementById("tagsInput").value = ""; document.getElementById("subtasksContainer").innerHTML = ""; removeImage(); removeVoiceMemo();
        document.getElementById("assigneeInput").value = ""; editId = null; document.getElementById("customRepeatUI").style.display = "none"; document.getElementById("submitBtn").innerText = "Save Task"; document.getElementById("modalTitle").innerText = "New Task"; document.getElementById("preAlarmInput").value = "0";
    }
}

// --- Initialization ---
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splashScreen'); splash.style.opacity = '0';
        setTimeout(() => { splash.style.display = 'none'; if(appPinCode && localStorage.getItem("loggedIn") === "true") { document.getElementById("pinScreen").style.display = "flex"; } else { checkMorningBriefing(); } }, 500);
    }, 1500);
});

document.addEventListener("DOMContentLoaded", () => {
    applyTimeOfDayTheme(); isProUser = localStorage.getItem("isPro") === "true"; if(isProUser) { document.getElementById("proBadgeDisplay").style.display = "inline-flex"; }
    if(appPinCode) document.getElementById("appLockToggle").checked = true;
    window.addEventListener('offline', () => { document.getElementById("syncStatusText").innerText = "🚫 Offline Mode"; showToast("Working in Offline Mode.", "error"); });
    window.addEventListener('online', () => { document.getElementById("syncStatusText").innerText = "☁️ Syncing..."; showToast("Back online! Syncing...", "success"); syncToCloud(); });
    loadReminders(); renderHomeCalendar();
});

// --- App Lock ---
function enterPin(num) { if(currentEnteredPin.length < 4) { currentEnteredPin += num;
document.getElementById("dot" + currentEnteredPin.length).style.background = "var(--primary)"; if(currentEnteredPin.length === 4) { setTimeout(() => { if(currentEnteredPin === appPinCode) { document.getElementById("pinScreen").style.display = "none"; checkMorningBriefing(); } else { showToast("Incorrect PIN!", "error"); clearPin(); } }, 200);
} } }
function clearPin() { currentEnteredPin = ""; document.querySelectorAll(".pin-dot").forEach(d => d.style.background = "transparent");
}
function deletePin() { if(currentEnteredPin.length > 0) { document.getElementById("dot" + currentEnteredPin.length).style.background = "transparent"; currentEnteredPin = currentEnteredPin.slice(0, -1);
} }
function toggleAppLockSetup() {
    const toggle = document.getElementById("appLockToggle");
    if(toggle.checked) {
        const pin = prompt("Enter a 4-digit PIN for App Lock:");
        if(pin && pin.length === 4 && !isNaN(pin)) { appPinCode = pin; localStorage.setItem("appPin", pin); showToast("App Lock Enabled!", "success");
        } else { toggle.checked = false; showToast("Invalid PIN.", "error"); }
    } else { appPinCode = null;
    localStorage.removeItem("appPin"); showToast("App Lock Disabled", "info"); }
}

// --- Premium Features ---
function activatePro() { isProUser = true;
    localStorage.setItem("isPro", "true"); document.getElementById("proBadgeDisplay").style.display = "inline-flex"; closeModal('proModal'); showToast("🎉 Welcome to PRO!", "success");
}
function toggleMusicPanel() { const p = document.getElementById("musicPanel"); p.style.display = p.style.display === "block" ? "none" : "block";
}
function playFloatingAudio() {
    const src = document.getElementById("floatingSoundSelect").value;
    if(src === "none") { focusAudio.pause(); isMusicPlaying = false; return; }
    if(isMusicPlaying && focusAudio.src === src) { focusAudio.pause();
    isMusicPlaying = false; } else { focusAudio.src = src; focusAudio.loop = true; focusAudio.play(); isMusicPlaying = true;
    }
}

// --- Morning Briefing ---
function checkMorningBriefing() {
    if(!currentUser) return;
    const today = getTodayStr();
    if(localStorage.getItem('lastBriefingDate') !== today) {
        const reminders = JSON.parse(localStorage.getItem("reminders")) || []; const habits = JSON.parse(localStorage.getItem("habits")) || [];
        document.getElementById("briefingTaskCount").innerText = reminders.filter(r => r.status !== 'completed' && r.time.split('T')[0] === today).length;
        document.getElementById("briefingHabitCount").innerText = habits.filter(h => h.lastCheckIn !== today).length;
        openModal('briefingModal'); localStorage.setItem('lastBriefingDate', today);
    }
}

// --- Authentication ---
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user; localStorage.setItem("loggedIn", "true"); document.getElementById('authScreen').style.display = 'none'; document.getElementById('mainApp').style.display = 'flex'; switchPage('home'); if(!appPinCode) showToast("Logged in! Ready.", "success"); startCloudSync();
    } else { currentUser = null; localStorage.setItem("loggedIn", "false"); document.getElementById('authScreen').style.display = 'block'; document.getElementById('mainApp').style.display = 'none'; }
});
function loginWithGoogle() { const provider = new firebase.auth.GoogleAuthProvider(); auth.signInWithPopup(provider).then((result) => { db.collection("users").doc(result.user.uid).set({ userName: result.user.displayName, userLevel: 1, habitXP_tasks: 0 }, { merge: true }); }).catch(err => showToast(err.message, "error"));
}
function registerUser() { const email = document.getElementById("emailInput").value; const password = document.getElementById("passwordInput").value;
    if(!email || password.length < 6) return showToast("Enter valid email/password", "error");
    auth.createUserWithEmailAndPassword(email, password).then((u) => { db.collection("users").doc(u.user.uid).set({ reminders: [], habits: [], userLevel: 1, habitXP_tasks: 0, userName: "User", alarmSound: userAlarmSound, voiceAlarm: false, dailyTaskGoal: 5 }); }).catch((e) => showToast(e.message, "error"));
}
function loginUser() { const email = document.getElementById("emailInput").value; const password = document.getElementById("passwordInput").value;
    if(!email || !password) return showToast("Enter email and password", "error"); auth.signInWithEmailAndPassword(email, password).catch((e) => showToast(e.message, "error"));
}
function resetPassword() { const email = document.getElementById("emailInput").value; if(!email) return showToast("Enter your email address first!", "error");
    auth.sendPasswordResetEmail(email).then(() => { showToast("Password reset link sent!", "success"); }).catch((e) => showToast(e.message, "error"));
}
function logoutUser() { auth.signOut().then(() => { showToast("Logged out.", "info"); localStorage.clear(); location.reload(); });
}

// --- Cloud Syncing ---
function startCloudSync() {
    if(!currentUser) return;
    db.collection("users").doc(currentUser.uid).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            if(!doc.metadata.hasPendingWrites) {
                localStorage.setItem("reminders", JSON.stringify(data.reminders || [])); localStorage.setItem("habits", JSON.stringify(data.habits || [])); localStorage.setItem("userLevel", data.userLevel || 1); localStorage.setItem("habitXP_tasks", data.habitXP_tasks || 0); localStorage.setItem("dailyTaskGoal", data.dailyTaskGoal || 5); userName = data.userName || "User"; userAlarmSound = data.alarmSound || "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"; voiceAlarmEnabled = data.voiceAlarm || false;
                waterCount = data.waterDate === getTodayStr() ? (data.waterCount || 0) : 0; 
                document.getElementById("waterIntake").innerText = waterCount;
                if(data.theme) setThemeColor(data.theme.p, data.theme.ph, data.theme.b1, data.theme.b2, false);
                if(data.customTemplates) localStorage.setItem("customTemplates", JSON.stringify(data.customTemplates));
                if(data.isProUser) { isProUser = true; localStorage.setItem("isPro", "true"); document.getElementById("proBadgeDisplay").style.display="inline-flex"; }
                document.getElementById("displayUserName").innerText = userName;
                document.getElementById("profileNameInput").value = userName; document.getElementById("dailyGoalInput").value = data.dailyTaskGoal || 5; document.getElementById("alarmSoundInput").value = userAlarmSound; document.getElementById("voiceAlarmToggle").checked = voiceAlarmEnabled; userLevel = data.userLevel || 1; 
                renderCustomTemplates();
                loadReminders(); loadHabits(); document.getElementById("syncStatusText").innerText = "☁️ Synced";
            }
        }
    });
}

function syncToCloud() {
    if(!currentUser) return; if(!navigator.onLine) return;
    document.getElementById("syncStatusText").innerText = "☁️ Saving...";
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        const dataToSave = {
            reminders: JSON.parse(localStorage.getItem("reminders")) || [], habits: JSON.parse(localStorage.getItem("habits")) || [], userLevel: parseInt(localStorage.getItem("userLevel")) || 1, habitXP_tasks: parseInt(localStorage.getItem("habitXP_tasks")) || 0, userName: userName, alarmSound: userAlarmSound, voiceAlarm: voiceAlarmEnabled, theme: JSON.parse(localStorage.getItem("appTheme")) || null, customTemplates: JSON.parse(localStorage.getItem("customTemplates")) || [], waterCount: waterCount, waterDate: getTodayStr(), isProUser: isProUser, dailyTaskGoal: parseInt(localStorage.getItem("dailyTaskGoal")) || 5
        };
        db.collection("users").doc(currentUser.uid).set(dataToSave, {merge: true}).then(() => { document.getElementById("syncStatusText").innerText = "☁️ Synced"; }).catch((e) => { document.getElementById("syncStatusText").innerText = "⚠️ Sync Error"; });
    }, 2000);
}

// --- Settings & UI Helpers ---
function updateWater(val) { waterCount += val;
    if(waterCount < 0) waterCount = 0; document.getElementById("waterIntake").innerText = waterCount; if(val > 0 && waterCount === 8) showToast("Goal Reached! 🎉", "success");
    syncToCloud(); 
}
function setThemeColor(p, ph, b1, b2, sync=true) { document.documentElement.style.setProperty('--primary', p); document.documentElement.style.setProperty('--primary-hover', ph); document.documentElement.style.setProperty('--bg-grad-1', b1); document.documentElement.style.setProperty('--bg-grad-2', b2);
    localStorage.setItem("appTheme", JSON.stringify({p, ph, b1, b2})); if(sync) { syncToCloud(); showToast("Theme saved!", "success"); } 
}
function applyTimeOfDayTheme() { if (localStorage.getItem("darkMode") === "true") { document.body.classList.add("dark-mode"); return; } const savedTheme = JSON.parse(localStorage.getItem("appTheme"));
    if(savedTheme) return; 
}
function saveProfileSettings() { userName = document.getElementById("profileNameInput").value.trim() || "User"; userAlarmSound = document.getElementById("alarmSoundInput").value; voiceAlarmEnabled = document.getElementById("voiceAlarmToggle").checked;
    const dGoal = parseInt(document.getElementById("dailyGoalInput").value) || 5; localStorage.setItem("dailyTaskGoal", dGoal); document.getElementById("displayUserName").innerText = userName; updateMiniDashboard(); syncToCloud(); showToast("Settings saved!", "success");
}
function openModal(modalId) { document.getElementById(modalId).classList.add('active'); if(modalId === 'analyticsModal') setTimeout(renderChart, 100);
}
function closeModal(modalId) { document.getElementById(modalId).classList.remove('active'); }

// --- Leaderboard ---
function openLeaderboard() {
    openModal('leaderboardModal');
    const cont = document.getElementById("leaderboardContainer"); cont.innerHTML = "<p style='text-align:center;'>Fetching...</p>";
    db.collection("users").orderBy("habitXP_tasks", "desc").limit(10).get().then((querySnapshot) => {
        let html = ""; let rank = 1;
        querySnapshot.forEach((doc) => {
            const data = doc.data(); let trophy = rank === 1 ? "🥇" : (rank === 2 ? "🥈" : (rank === 3 ? "🥉" : "🏅"));
             html += `<div style="padding:12px; background:#ffffff; margin-bottom:8px; border-radius:12px; display:flex; justify-content:space-between; box-shadow:0 2px 4px rgba(0,0,0,0.02);"><span>${trophy} ${data.userName || "Unknown"}</span><span style="font-weight:700; color:var(--primary);">${(data.habitXP_tasks||0)*10} XP</span></div>`; rank++;
        }); 
        cont.innerHTML = html || "<p>No data found.</p>";
    });
}

// --- Full Calendar ---
function changeHomeMonth(dir) { currentCalMonth += dir;
    if(currentCalMonth > 11) { currentCalMonth = 0; currentCalYear++; } if(currentCalMonth < 0) { currentCalMonth = 11; currentCalYear--; } renderHomeCalendar();
    if(currentTab === 'upcoming') loadReminders(); 
}
function renderHomeCalendar() {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const displayEl = document.getElementById("homeCalMonthDisplay"); if(!displayEl) return;
    displayEl.innerText = `${monthNames[currentCalMonth]} ${currentCalYear}`; 
    const grid = document.getElementById("homeCalendarGrid"); grid.innerHTML = "";
    let firstDay = new Date(currentCalYear, currentCalMonth, 1).getDay(); let daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
    const reminders = JSON.parse(localStorage.getItem("reminders")) || []; const taskDates = reminders.filter(r => r.status !== 'completed').map(r => r.time.split('T')[0]);
    for(let i=0; i<firstDay; i++) { grid.innerHTML += `<div class="cal-day empty"></div>`;
    }
    const todayStr = getTodayStr();
    for(let i=1; i<=daysInMonth; i++) {
        const dStr = `${currentCalYear}-${(currentCalMonth+1).toString().padStart(2,'0')}-${i.toString().padStart(2,'0')}`;
        const hasTask = taskDates.includes(dStr); const isToday = dStr === todayStr; const isSelected = selectedDateFilter === dStr;
        let classes = "cal-day";
        if(isToday) classes += " today"; if(hasTask) classes += " has-event"; if(isSelected) classes += " selected";
        grid.innerHTML += `<div class="${classes}" onclick="filterByDate('${dStr}')">${i}</div>`;
    }
    const isFilterActive = selectedDateFilter || currentCalMonth !== new Date().getMonth() || currentCalYear !== new Date().getFullYear();
    document.getElementById("clearFilterWrapper").style.display = isFilterActive ? "flex" : "none";
}
function filterByDate(dateStr) { selectedDateFilter = selectedDateFilter === dateStr ? null : dateStr; loadReminders();
}
function clearCalendarFilter() { selectedDateFilter = null; currentCalMonth = new Date().getMonth(); currentCalYear = new Date().getFullYear(); renderHomeCalendar(); changeTab('all');
    loadReminders(); 
}

// --- Pomodoro Focus Timer ---
function toggleZenMode() { document.body.classList.toggle("zen-mode"); }
function updatePomoDisplay() { document.getElementById("pomodoroDisplay").innerText = `${Math.floor(pomoTime / 60).toString().padStart(2, '0')}:${(pomoTime % 60).toString().padStart(2, '0')}`; }
function openPomoModal() {
    const select = document.getElementById("pomoTaskSelect");
    let html = `<option value="">🎯 Select Task (Optional)</option>`;
    (JSON.parse(localStorage.getItem("reminders")) || []).filter(r => r.status === 'pending').forEach(r => { html += `<option value="${r.id}">${r.task}</option>`; });
    select.innerHTML = html; openModal('pomodoroModal');
}
function resetPomo() { clearInterval(pomoInterval); focusAudio.pause(); pomoTime = parseInt(document.getElementById("pomoTimeSelect").value) || 1500; updatePomoDisplay();
    if (wakeLock !== null) { wakeLock.release().then(() => wakeLock = null); } 
}
async function startPomo() { 
    clearInterval(pomoInterval);
    try { if ('wakeLock' in navigator) { wakeLock = await navigator.wakeLock.request('screen'); } } catch (err) {}
    pomoInterval = setInterval(() => { 
        pomoTime--; updatePomoDisplay(); 
        if(pomoTime <= 0) { 
            clearInterval(pomoInterval); focusAudio.pause(); playAlarm(); if (wakeLock !== null) { wakeLock.release().then(() => wakeLock = null); }
            showToast("Focus Session Complete! ☕", "success"); resetPomo(); const selectedTaskId = document.getElementById("pomoTaskSelect").value;
            if(selectedTaskId && confirm("Session finished! Did you complete the task?")) toggleStatus(Number(selectedTaskId)); 
        } 
    }, 1000);
}
function pausePomo() { clearInterval(pomoInterval); focusAudio.pause(); if (wakeLock !== null) { wakeLock.release().then(() => wakeLock = null); } }

// --- AI Features (Gemini Integration using FIXED KEY) ---
async function aiGenerateSubtasks() {
    const taskName = document.getElementById("taskInput").value.trim();
    if(!taskName) return showToast("Enter Task Title first!", "error");
    showToast("🪄 AI is planning...", "info");
    try {
        const prompt = `Break down the goal "${taskName}" into 3 to 4 short steps. Output ONLY a valid JSON array of strings. Example: ["Step 1", "Step 2"]`;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${FIXED_GEMINI_KEY}`, { 
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) 
        });
        const data = await response.json(); if(data.error) throw new Error(data.error.message);
        let text = data.candidates[0].content.parts[0].text; text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        JSON.parse(text).forEach(sub => addSu
