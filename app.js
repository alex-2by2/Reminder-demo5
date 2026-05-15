// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(console.error);
}

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDc-k1JnOySVExS4QbDsbkh7Ro9pvNydIY",
  authDomain: "reminder-76588.firebaseapp.com",
  projectId: "reminder-76588",
  storageBucket: "reminder-76588.firebasestorage.app",
  messagingSenderId: "813515230126",
  appId: "1:813515230126:web:dde1117564525d7dc44d63f"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
db.enablePersistence().catch(err => { console.log("Offline mode error:", err.code); });

// --- Global Variables ---
let currentUser = null;
let timerInterval;
let currentTab = 'all';
let editId = null;
let userLevel = 1;
let selectedDateFilter = null;
let currentImageBase64 = null;
let isDoc = false;
let userName = "User";
let userAlarmSound = "https://actions.google.com/sounds/v1/alarms/beep_short.ogg";
let voiceAlarmEnabled = false;
let pomoInterval;
let pomoTime = 1500;
let chartInstance = null;
let focusAudio = new Audio();
let currentCalMonth = new Date().getMonth();
let currentCalYear = new Date().getFullYear();
let deletedTaskTemp = null;
let deleteTimeout = null;
let wakeLock = null;
let activeTagFilter = "";
let waterCount = 0;
let mediaRecorder;
let audioChunks = [];
let voiceMemoBase64 = null;
let isProUser = false;
let appPinCode = localStorage.getItem("appPin") || null;
let currentEnteredPin = "";
let isMusicPlaying = false;
let syncTimeout = null;

// --- Navigation ---
function switchPage(pageId) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.add('active');
    document.getElementById('nav-' + pageId).classList.add('active');
    if(pageId === 'add') loadDraft();
    if(pageId === 'home') {
        document.getElementById("taskInput").value = "";
        document.getElementById("notesInput").innerHTML = "";
        document.getElementById("timeInput").value = "";
        document.getElementById("repeatInput").value = "none";
        document.getElementById("priorityInput").value = "medium";
        document.getElementById("tagsInput").value = "";
        document.getElementById("subtasksContainer").innerHTML = "";
        removeImage();
        removeVoiceMemo();
        document.getElementById("assigneeInput").value = "";
        editId = null;
        document.getElementById("customRepeatUI").style.display = "none";
        document.getElementById("submitBtn").innerText = "Save Task";
        document.getElementById("modalTitle").innerText = "New Task";
        document.getElementById("preAlarmInput").value = "0";
    }
}

// --- Initialization ---
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';
            if(appPinCode && localStorage.getItem("loggedIn") === "true") {
                document.getElementById("pinScreen").style.display = "flex";
            } else {
                checkMorningBriefing();
            }
        }, 500);
    }, 1500);
});

document.addEventListener("DOMContentLoaded", () => {
    applyTimeOfDayTheme();
    isProUser = localStorage.getItem("isPro") === "true";
    if(isProUser) {
        document.getElementById("proBadgeDisplay").style.display = "inline-flex";
    }
    if(appPinCode) document.getElementById("appLockToggle").checked = true;
    window.addEventListener('offline', () => {
        document.getElementById("syncStatusText").innerText = "📵 Offline Mode";
        showToast("Working in Offline Mode.", "error");
    });
    window.addEventListener('online', () => {
        document.getElementById("syncStatusText").innerText = "☁️ Syncing...";
        showToast("Back online! Syncing...", "success");
        syncToCloud();
    });
    loadReminders();
    renderHomeCalendar();
});

// --- App Lock ---
function enterPin(num) {
    if(currentEnteredPin.length < 4) {
        currentEnteredPin += num;
        document.getElementById("dot" + currentEnteredPin.length).style.background = "var(--primary)";
        if(currentEnteredPin.length === 4) {
            setTimeout(() => {
                if(currentEnteredPin === appPinCode) {
                    document.getElementById("pinScreen").style.display = "none";
                    checkMorningBriefing();
                } else {
                    showToast("Incorrect PIN!", "error");
                    clearPin();
                }
            }, 200);
        }
    }
}

function clearPin() {
    currentEnteredPin = "";
    document.querySelectorAll(".pin-dot").forEach(d => d.style.background = "transparent");
}

function deletePin() {
    if(currentEnteredPin.length > 0) {
        document.getElementById("dot" + currentEnteredPin.length).style.background = "transparent";
        currentEnteredPin = currentEnteredPin.slice(0, -1);
    }
}

function toggleAppLockSetup() {
    const toggle = document.getElementById("appLockToggle");
    if(toggle.checked) {
        const pin = prompt("Enter a 4-digit PIN for App Lock:");
        if(pin && pin.length === 4 && !isNaN(pin)) {
            appPinCode = pin;
            localStorage.setItem("appPin", pin);
            showToast("App Lock Enabled!", "success");
        } else {
            toggle.checked = false;
            showToast("Invalid PIN.", "error");
        }
    } else {
        appPinCode = null;
        localStorage.removeItem("appPin");
        showToast("App Lock Disabled", "info");
    }
}

// --- Premium Features ---
function activatePro() {
    isProUser = true;
    localStorage.setItem("isPro", "true");
    document.getElementById("proBadgeDisplay").style.display = "inline-flex";
    closeModal('proModal');
    showToast("🎉 Welcome to PRO!", "success");
}

function toggleMusicPanel() {
    const p = document.getElementById("musicPanel");
    p.style.display = p.style.display === "block" ? "none" : "block";
}

function playFloatingAudio() {
    const src = document.getElementById("floatingAudioSelect").value;
    if(src === "none") {
        focusAudio.pause();
        isMusicPlaying = false;
        return;
    }
    if(isMusicPlaying && focusAudio.src === src) {
        focusAudio.pause();
        isMusicPlaying = false;
    } else {
        focusAudio.src = src;
        focusAudio.loop = true;
        focusAudio.play();
        isMusicPlaying = true;
    }
}

// --- Morning Briefing ---
function checkMorningBriefing() {
    if(!currentUser) return;
    const today = getTodayStr();
    if(localStorage.getItem('lastBriefingDate') !== today) {
        const reminders = JSON.parse(localStorage.getItem("reminders")) || [];
        const habits = JSON.parse(localStorage.getItem("habits")) || [];
        document.getElementById("briefingTaskCount").innerText = reminders.filter(r => r.status !== 'completed' && r.time.split('T')[0] === today).length;
        document.getElementById("briefingHabitCount").innerText = habits.filter(h => h.lastCheckIn !== today).length;
        openModal('briefingModal');
        localStorage.setItem('lastBriefingDate', today);
    }
}

// --- Authentication ---
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        localStorage.setItem("loggedIn", "true");
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'flex';
        switchPage('home');
        if(!appPinCode) showToast("Logged in! Ready.", "success");
        startCloudSync();
    } else {
        currentUser = null;
        localStorage.setItem("loggedIn", "false");
        document.getElementById('authScreen').style.display = 'block';
        document.getElementById('mainApp').style.display = 'none';
    }
});

function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then((result) => {
        db.collection("users").doc(result.user.uid).set({
            userName: result.user.displayName,
            userLevel: 1,
            habitXP_tasks: 0
        }, { merge: true });
    }).catch(err => showToast(err.message, "error"));
}

function registerUser() {
    const email = document.getElementById("emailInput").value;
    const password = document.getElementById("passwordInput").value;
    if(!email || password.length < 6) return showToast("Enter valid email/password", "error");
    auth.createUserWithEmailAndPassword(email, password).then((u) => {
        db.collection("users").doc(u.user.uid).set({
            reminders: [],
            habits: [],
            userLevel: 1,
            habitXP_tasks: 0,
            userName: "User",
            alarmSound: userAlarmSound,
            voiceAlarm: false,
            dailyTaskGoal: 5
        });
    }).catch((e) => showToast(e.message, "error"));
}

function loginUser() {
    const email = document.getElementById("emailInput").value;
    const password = document.getElementById("passwordInput").value;
    if(!email || !password) return showToast("Enter email and password", "error");
    auth.signInWithEmailAndPassword(email, password).catch((e) => showToast(e.message, "error"));
}

function resetPassword() {
    const email = document.getElementById("emailInput").value;
    if(!email) return showToast("Enter your email address first!", "error");
    auth.sendPasswordResetEmail(email).then(() => {
        showToast("Password reset link sent!", "success");
    }).catch((e) => showToast(e.message, "error"));
}

function logoutUser() {
    auth.signOut().then(() => {
        showToast("Logged out.", "info");
        localStorage.clear();
        location.reload();
    });
}

// --- Cloud Syncing ---
function startCloudSync() {
    if(!currentUser) return;
    db.collection("users").doc(currentUser.uid).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            if(!doc.metadata.hasPendingWrites) {
                localStorage.setItem("reminders", JSON.stringify(data.reminders || []));
                localStorage.setItem("habits", JSON.stringify(data.habits || []));
                localStorage.setItem("userLevel", data.userLevel || 1);
                localStorage.setItem("userName", data.userName || "User");
                localStorage.setItem("alarmSound", data.alarmSound || userAlarmSound);
                localStorage.setItem("voiceAlarm", data.voiceAlarm || false);
                localStorage.setItem("dailyTaskGoal", data.dailyTaskGoal || 5);
                userName = data.userName || "User";
                document.getElementById("displayUserName").innerText = userName;
                userLevel = data.userLevel || 1;
                updateMiniDashboard();
                loadReminders();
            }
        }
    });
}

function syncToCloud() {
    if(!currentUser) return;
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        const reminders = JSON.parse(localStorage.getItem("reminders")) || [];
        const habits = JSON.parse(localStorage.getItem("habits")) || [];
        db.collection("users").doc(currentUser.uid).update({
            reminders: reminders,
            habits: habits,
            userLevel: userLevel,
            userName: userName,
            lastSynced: new Date()
        }).catch(err => console.log("Sync error:", err));
    }, 1000);
}

// --- Settings & UI Helpers ---
function updateWater(val) {
    waterCount += val;
    if(waterCount < 0) waterCount = 0;
    document.getElementById("waterIntake").innerText = waterCount;
    if(val > 0 && waterCount === 8) showToast("Goal Reached! 🎉", "success");
    syncToCloud();
}

function setThemeColor(p, ph, b1, b2, sync=true) {
    document.documentElement.style.setProperty('--primary', p);
    document.documentElement.style.setProperty('--primary-hover', ph);
    document.documentElement.style.setProperty('--bg-grad-1', b1);
    document.documentElement.style.setProperty('--bg-grad-2', b2);
    localStorage.setItem("appTheme", JSON.stringify({p, ph, b1, b2}));
    if(sync) {
        syncToCloud();
        showToast("Theme saved!", "success");
    }
}

function applyTimeOfDayTheme() {
    if (localStorage.getItem("darkMode") === "true") {
        document.body.classList.add("dark-mode");
        return;
    }
    const savedTheme = JSON.parse(localStorage.getItem("appTheme"));
    if(savedTheme) return;
}

function saveProfileSettings() {
    userName = document.getElementById("profileNameInput").value.trim() || "User";
    userAlarmSound = document.getElementById("alarmSoundInput").value;
    voiceAlarmEnabled = document.getElementById("voiceAlarmToggle").checked;
    const dGoal = parseInt(document.getElementById("dailyGoalInput").value) || 5;
    localStorage.setItem("dailyTaskGoal", dGoal);
    document.getElementById("displayUserName").innerText = userName;
    updateMiniDashboard();
    syncToCloud();
    showToast("Settings saved!", "success");
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    if(modalId === 'analyticsModal') setTimeout(renderChart, 100);
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// --- Leaderboard ---
function openLeaderboard() {
    const leaderboard = [
        { name: "You", xp: userLevel * 50 },
        { name: "Alex", xp: 250 },
        { name: "Sam", xp: 180 }
    ];
    let html = '';
    leaderboard.forEach((user, i) => {
        html += `<div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e5ea;">
            <span>${i + 1}. ${user.name}</span>
            <span style="font-weight: 700; color: var(--primary);">${user.xp} XP</span>
        </div>`;
    });
    document.getElementById("leaderboardList").innerHTML = html;
    openModal('leaderboardModal');
}

// --- Full Calendar ---
function changeHomeMonth(dir) {
    currentCalMonth += dir;
    if(currentCalMonth > 11) {
        currentCalMonth = 0;
        currentCalYear++;
    }
    if(currentCalMonth < 0) {
        currentCalMonth = 11;
        currentCalYear--;
    }
    renderHomeCalendar();
    if(currentTab === 'upcoming') loadReminders();
}

function renderHomeCalendar() {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    document.getElementById("homeCalMonthDisplay").innerText = `${monthNames[currentCalMonth]} ${currentCalYear}`;
    
    const firstDay = new Date(currentCalYear, currentCalMonth, 1).getDay();
    const daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
    
    let calHtml = '';
    for(let i = 0; i < firstDay; i++) calHtml += '<div class="cal-day empty"></div>';
    
    const reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    const today = getTodayStr();
    
    for(let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentCalYear}-${String(currentCalMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasEvent = reminders.some(r => r.time.split('T')[0] === dateStr && r.status !== 'completed');
        const isToday = dateStr === today;
        const isSelected = dateStr === selectedDateFilter;
        
        let classList = 'cal-day';
        if(isToday) classList += ' today';
        if(isSelected) classList += ' selected';
        if(hasEvent) classList += ' has-event';
        
        calHtml += `<div class="${classList}" onclick="filterByDate('${dateStr}')">${day}</div>`;
    }
    
    document.getElementById("homeCalendarGrid").innerHTML = calHtml;
    document.getElementById("clearFilterWrapper").style.display = selectedDateFilter ? "block" : "none";
}

function filterByDate(dateStr) {
    selectedDateFilter = selectedDateFilter === dateStr ? null : dateStr;
    loadReminders();
}

function clearCalendarFilter() {
    selectedDateFilter = null;
    currentCalMonth = new Date().getMonth();
    currentCalYear = new Date().getFullYear();
    renderHomeCalendar();
    changeTab('all');
    loadReminders();
}

// --- Pomodoro Focus Timer ---
function toggleZenMode() {
    document.body.classList.toggle("zen-mode");
}

function updatePomoDisplay() {
    document.getElementById("pomodoroDisplay").innerText = `${Math.floor(pomoTime / 60).toString().padStart(2, '0')}:${(pomoTime % 60).toString().padStart(2, '0')}`;
}

function openPomoModal() {
    document.getElementById("pomoTimeSelect").value = "1500";
    updatePomoDisplay();
    openModal('pomodoroModal');
}

function resetPomo() {
    clearInterval(pomoInterval);
    focusAudio.pause();
    pomoTime = parseInt(document.getElementById("pomoTimeSelect").value) || 1500;
    updatePomoDisplay();
    if (wakeLock !== null) {
        wakeLock.release().then(() => wakeLock = null);
    }
}

async function startPomo() {
    const selectedTime = parseInt(document.getElementById("pomoTimeSelect").value) || 1500;
    pomoTime = selectedTime;
    updatePomoDisplay();
    
    if(document.getElementById("focusMusic").checked) {
        focusAudio.src = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
        focusAudio.loop = true;
        focusAudio.play();
    }
    
    if (navigator.wakeLock) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) {
            console.log(err);
        }
    }
    
    pomoInterval = setInterval(() => {
        pomoTime--;
        updatePomoDisplay();
        if(pomoTime <= 0) {
            clearInterval(pomoInterval);
            playAlarm();
            showToast("Pomodoro Complete! 🎉", "success");
            focusAudio.pause();
            if (wakeLock !== null) {
                wakeLock.release().then(() => wakeLock = null);
            }
        }
    }, 1000);
}

function pausePomo() {
    clearInterval(pomoInterval);
    focusAudio.pause();
    if (wakeLock !== null) {
        wakeLock.release().then(() => wakeLock = null);
    }
}

// --- AI Features (Gemini Integration) ---
const FIXED_GEMINI_KEY = "AIzaSyDy_ZqqbJ4WqP4-fDvL92lVfkRpvLmOGOA";

async function aiGenerateSubtasks() {
    const taskName = document.getElementById("taskInput").value;
    if(!taskName) return showToast("Enter a task name first", "error");
    
    showToast("🤖 Generating subtasks...", "info");
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${FIXED_GEMINI_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Generate 3-5 specific subtasks for: "${taskName}". Return only a JSON array like ["subtask1", "subtask2", "subtask3"]`
                    }]
                }]
            })
        });
        
        const data = await response.json();
        if(data.candidates && data.candidates[0].content.parts[0].text) {
            const text = data.candidates[0].content.parts[0].text;
            const subtasks = JSON.parse(text.match(/\[.*\]/s)[0]);
            document.getElementById("subtasksContainer").innerHTML = '';
            subtasks.forEach(s => addSubtaskField(s));
            showToast("✅ Subtasks generated!", "success");
        }
    } catch (err) {
        console.log(err);
        showToast("AI error. Try again.", "error");
    }
}

async function aiSuggestTime() {
    const taskName = document.getElementById("taskInput").value;
    if(!taskName) return showToast("Enter a task name first", "error");
    
    showToast("⏰ Suggesting time...", "info");
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${FIXED_GEMINI_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Suggest the best time of day to do this task: "${taskName}". Respond with only HH:MM in 24-hour format`
                    }]
                }]
            })
        });
        
        const data = await response.json();
        if(data.candidates && data.candidates[0].content.parts[0].text) {
            const time = data.candidates[0].content.parts[0].text.trim();
            const now = new Date();
            now.setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1]), 0);
            document.getElementById("timeInput").value = now.toISOString().slice(0, 16);
            showToast("⏰ Time suggested!", "success");
        }
    } catch (err) {
        console.log(err);
        showToast("AI error. Try again.", "error");
    }
}

async function generateAIReview() {
    const reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    const completed = reminders.filter(r => r.status === 'completed').length;
    
    showToast("📝 Generating review...", "info");
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${FIXED_GEMINI_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Write a 2-sentence motivational review for someone who completed ${completed} tasks this week.`
                    }]
                }]
            })
        });
        
        const data = await response.json();
        if(data.candidates && data.candidates[0].content.parts[0].text) {
            document.getElementById("weeklyReviewText").innerText = data.candidates[0].content.parts[0].text;
        }
    } catch (err) {
        console.log(err);
        showToast("AI error. Try again.", "error");
    }
}

// --- Subtasks ---
function addSubtaskField(val = "", done = false) {
    const container = document.getElementById("subtasksContainer");
    const item = document.createElement("div");
    item.className = "subtask-item";
    item.style.cssText = "display:flex; gap:8px; margin-bottom:8px; align-items:center;";
    item.innerHTML = `
        <input type="checkbox" class="subtask-checkbox" ${done ? 'checked' : ''} style="width:18px; height:18px; cursor:pointer;">
        <input type="text" class="subtask-inp" value="${val}" placeholder="Subtask..." style="flex:1; margin:0; padding:8px 12px; border-radius:8px; border:1px solid #e5e5ea; background:rgba(255,255,255,0.5);">
        <button onclick="this.parentElement.remove()" style="background:#ff3b30; color:white; border:none; border-radius:6px; width:28px; height:28px; cursor:pointer;">✕</button>
    `;
    container.appendChild(item);
}

function getSubtasksFromForm() {
    let subs = [];
    document.querySelectorAll(".subtask-item").forEach(item => {
        const val = item.querySelector(".subtask-inp").value.trim();
        if(val) subs.push({
            text: val,
            done: item.querySelector(".subtask-checkbox").checked
        });
    });
    return subs;
}

function toggleSubtaskLocal(taskId, subIndex, checkbox) {
    let reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    reminders = reminders.map(r => {
        if(r.id === taskId && r.subtasks && r.subtasks[subIndex]) {
            r.subtasks[subIndex].done = checkbox.checked;
        }
        return r;
    });
    localStorage.setItem("reminders", JSON.stringify(reminders));
    syncToCloud();
}

// --- Productivity Chart ---
function renderChart() {
    const reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    const last7Days = [];
    for(let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Days.push(d.toISOString().split('T')[0]);
    }
    
    const completed = last7Days.map(date => reminders.filter(r => r.time.split('T')[0] === date && r.status === 'completed').length);
    
    const ctx = document.getElementById("productivityChart");
    if(chartInstance) chartInstance.destroy();
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days.map(d => new Date(d).toLocaleDateString('en-US', { weekday: 'short' })),
            datasets: [{
                label: 'Tasks Completed',
                data: completed,
                borderColor: 'var(--primary)',
                backgroundColor: 'rgba(0, 122, 255, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// --- Utility Functions ---
function showToast(message, type = 'info') {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    let icon = type === "success" ? "✅" : (type === "error" ? "⚠️" : "💡");
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = "fadeOut 0.4s forwards";
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function toggleTheme() {
    const isDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem("darkMode", isDark);
    document.getElementById("themeToggleBtn").innerText = isDark ? "☀️" : "🌙";
}

function getTodayStr() {
    const today = new Date();
    return (new Date(today - today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
}

function getYesterdayStr() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return (new Date(yesterday - yesterday.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
}

function toggleCustomRepeat() {
    const val = document.getElementById("repeatInput").value;
    document.getElementById("customRepeatUI").style.display = val === "custom" ? "flex" : "none";
}

function loadDraft() {
    if(editId) return;
    const draft = JSON.parse(localStorage.getItem("taskDraft"));
    if(draft) {
        if(!document.getElementById("taskInput").value) document.getElementById("taskInput").value = draft.task || "";
        if(!document.getElementById("notesInput").innerHTML) document.getElementById("notesInput").innerHTML = draft.notes || "";
        if(!document.getElementById("timeInput").value) document.getElementById("timeInput").value = draft.time || "";
    }
}

// --- Auto Cleanup Routine ---
function cleanupOldTasks() {
    let reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    reminders = reminders.filter(r => {
        const taskDate = new Date(r.time);
        return taskDate > thirtyDaysAgo || r.status !== 'completed';
    });
    
    localStorage.setItem("reminders", JSON.stringify(reminders));
}

// --- Voice Memos ---
function toggleVoiceMemo() {
    const recordBtn = document.getElementById("recordBtn");
    
    if(!mediaRecorder) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            mediaRecorder.ondataavailable = (event) => { audioChunks.push(event.data); };
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = function() {
                    voiceMemoBase64 = reader.result;
                    document.getElementById("voiceMemoAudio").src = voiceMemoBase64;
                    document.getElementById("voiceMemoPreviewContainer").style.display = "flex";
                };
            };
            
            mediaRecorder.start();
            recordBtn.style.opacity = "0.5";
            recordBtn.innerText = "⏹️ Stop";
        }).catch(err => showToast("Microphone access denied", "error"));
    } else {
        mediaRecorder.stop();
        recordBtn.style.opacity = "1";
        recordBtn.innerText = "🔴 Voice";
        mediaRecorder = null;
    }
}

function removeVoiceMemo() {
    voiceMemoBase64 = null;
    document.getElementById("voiceMemoPreviewContainer").style.display = "none";
}

// --- Image & Document Attachments ---
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        if(file.type.startsWith('image/')) {
            isDoc = false;
            const img = new Image();
            img.onload = function() {
                currentImageBase64 = e.target.result;
                document.getElementById("imagePreview").src = currentImageBase64;
                document.getElementById("imagePreviewContainer").style.display = "block";
                document.getElementById("docPreview").style.display = "none";
            };
            img.src = e.target.result;
        } else {
            isDoc = true;
            currentImageBase64 = e.target.result;
            document.getElementById("imagePreview").style.display = "none";
            document.getElementById("docPreview").style.display = "block";
            document.getElementById("imagePreviewContainer").style.display = "block";
        }
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    currentImageBase64 = null;
    isDoc = false;
    document.getElementById("imagePreviewContainer").style.display = "none";
    document.getElementById("imageUpload").value = "";
}

// --- Categorization ---
function autoCategorizeTask(taskName) {
    const categories = {
        'health': ['exercise', 'gym', 'walk', 'run', 'yoga', 'doctor', 'medicine'],
        'work': ['meeting', 'email', 'report', 'deadline', 'project', 'code', 'review'],
        'personal': ['birthday', 'anniversary', 'call', 'message', 'plan'],
        'shopping': ['buy', 'shop', 'store', 'amazon', 'groceries']
    };
    
    for(let cat in categories) {
        if(categories[cat].some(word => taskName.toLowerCase().includes(word))) {
            return cat;
        }
    }
    return 'other';
}

// --- Custom Templates ---
function saveCustomTemplate() {
    const title = prompt("Template name:");
    if(!title) return;
    
    let temps = JSON.parse(localStorage.getItem("customTemplates")) || [];
    temps.push({
        title: title,
        task: document.getElementById("taskInput").value,
        notes: document.getElementById("notesInput").innerHTML,
        priority: document.getElementById("priorityInput").value,
        repeat: document.getElementById("repeatInput").value
    });
    
    localStorage.setItem("customTemplates", JSON.stringify(temps));
    renderCustomTemplates();
    showToast("Template saved!", "success");
}

function renderCustomTemplates() {
    const group = document.getElementById("customSavedTemplatesGroup");
    if(!group) return;
    const temps = JSON.parse(localStorage.getItem("customTemplates")) || [];
    let html = '';
    temps.forEach((t, i) => {
        html += `<option value="custom_${i}">⭐ ${t.title}</option>`;
    });
    group.innerHTML = html;
}

function applyQuickTemplate() {
    const selected = document.getElementById("quickTemplateSelect").value;
    if(!selected) return;
    
    if(selected.startsWith("custom_")) {
        const idx = parseInt(selected.split("_")[1]);
        const temps = JSON.parse(localStorage.getItem("customTemplates")) || [];
        const t = temps[idx];
        document.getElementById("taskInput").value = t.task;
        document.getElementById("notesInput").innerHTML = t.notes;
        document.getElementById("priorityInput").value = t.priority;
        document.getElementById("repeatInput").value = t.repeat;
    } else {
        const templates = {
            "Birthday": { notes: "Send wishes 🎂", priority: "low" },
            "Anniversary": { notes: "Celebrate! 💕", priority: "low" },
            "GYM": { notes: "1hr workout", priority: "high" },
            "Water": { notes: "Drink water", priority: "low" },
            "Reading": { notes: "Read for 30 mins", priority: "medium" }
        };
        
        if(templates[selected]) {
            document.getElementById("taskInput").value = selected;
            document.getElementById("notesInput").innerHTML = templates[selected].notes;
            document.getElementById("priorityInput").value = templates[selected].priority;
        }
    }
}

// --- Analytics & Gamification ---
function openAnalyticsModal() {
    const reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    document.getElementById("statTotalTasks").innerText = reminders.length;
    document.getElementById("statCompletedTasks").innerText = reminders.filter(r => r.status === 'completed').length;
    const percentage = reminders.length ? Math.round((reminders.filter(r => r.status === 'completed').length / reminders.length) * 100) : 0;
    document.getElementById("statPercentage").innerText = percentage + "%";
    openModal('analyticsModal');
}

function updateMiniDashboard() {
    const reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    const habits = JSON.parse(localStorage.getItem("habits")) || [];
    const today = getTodayStr();
    
    const todayTasks = reminders.filter(r => r.time.split('T')[0] === today && r.status !== 'completed').length;
    const pendingHabits = habits.filter(h => h.lastCheckIn !== today).length;
    
    document.getElementById("widgetTasksToday").innerText = todayTasks;
    document.getElementById("widgetHabitsToday").innerText = `${pendingHabits} Habits Pending`;
    
    const dailyGoal = parseInt(localStorage.getItem("dailyTaskGoal")) || 5;
    const completed = reminders.filter(r => r.time.split('T')[0] === today && r.status === 'completed').length;
    const percentage = Math.round((completed / dailyGoal) * 100);
    
    document.getElementById("widgetGoalText").innerText = `${completed}/${dailyGoal} Done`;
    document.getElementById("widgetGoalFill").style.width = Math.min(percentage, 100) + "%";
    document.getElementById("gamificationBadge").innerText = `⭐ Level ${userLevel} | ✨ ${((userLevel - 1) * 50) % 50}/${50} XP`;
}

function updateAnalyticsAndGamification() {
    const reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    const completed = reminders.filter(r => r.status === 'completed').length;
    const xpGain = completed * 10;
    
    userLevel = Math.floor(xpGain / 50) + 1;
    localStorage.setItem("userLevel", userLevel);
    
    updateMiniDashboard();
}

// --- Filtering ---
function filterByTag(tag) {
    activeTagFilter = activeTagFilter === tag ? "" : tag;
    loadReminders();
}

function changeTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    loadReminders();
}

function searchReminders() {
    loadReminders(document.getElementById("searchInput") ? document.getElementById("searchInput").value.toLowerCase() : "");
}

// --- Habits Core ---
function addHabit() {
    const name = document.getElementById("habitInput").value.trim();
    if(!name) return showToast("Enter name.", "error");
    
    const habits = JSON.parse(localStorage.getItem("habits"))||[];
    habits.push({
        id: Date.now(),
        name: name,
        streak: 0,
        maxStreak: 0,
        lastCheckIn: null,
        frequency: "daily"
    });
    
    localStorage.setItem("habits", JSON.stringify(habits));
    document.getElementById("habitInput").value = "";
    showToast("Habit added!", "success");
    loadHabits();
    syncToCloud();
}

function checkInHabit(id) {
    let habits = JSON.parse(localStorage.getItem("habits"))||[];
    const today = getTodayStr();
    
    habits = habits.map(h => {
        if(h.id === id) {
            if(h.lastCheckIn === today) return h;
            h.lastCheckIn = today;
            h.streak++;
            h.maxStreak = Math.max(h.streak, h.maxStreak);
        }
        return h;
    });
    
    localStorage.setItem("habits", JSON.stringify(habits));
    fireConfetti();
    showToast("🔥 Streak! Keep it going!", "success");
    loadHabits();
    syncToCloud();
}

function deleteHabit(id) {
    let habits = JSON.parse(localStorage.getItem("habits"))||[];
    localStorage.setItem("habits", JSON.stringify(habits.filter(h => h.id !== id)));
    showToast("Deleted.", "error");
    loadHabits();
    syncToCloud();
}

function loadHabits() {
    const habits = JSON.parse(localStorage.getItem("habits"))||[];
    const today = getTodayStr();
    let html = '';
    
    habits.forEach(h => {
        const completed = h.lastCheckIn === today;
        html += `<li class="reminder-item" style="background: ${completed ? 'rgba(52,199,89,0.15)' : 'rgba(255,255,255,0.5)'};">
            <div class="reminder-details">
                <h4>${h.name}</h4>
                <span class="streak-badge">🔥 ${h.streak}</span>
            </div>
            <button class="checkin-btn" onclick="checkInHabit(${h.id})" ${completed ? 'disabled' : ''}>${completed ? '✓ Done' : 'Check In'}</button>
            <button class="del-btn" onclick="deleteHabit(${h.id})" style="background:#ff3b30; color:white; border:none; border-radius:8px; padding:6px 12px; cursor:pointer;">Delete</button>
        </li>`;
    });
    
    document.getElementById("habitList").innerHTML = html;
}

// --- Reminders Core ---
function addOrUpdateReminder() {
    const task = document.getElementById("taskInput").value.trim();
    const time = document.getElementById("timeInput").value;
    const priority = document.getElementById("priorityInput").value;
    const tags = document.getElementById("tagsInput").value;
    const notes = document.getElementById("notesInput").innerHTML;
    const preAlarm = parseInt(document.getElementById("preAlarmInput").value) || 0;
    const repeat = document.getElementById("repeatInput").value;
    const assignee = document.getElementById("assigneeInput").value;
    const subtasks = getSubtasksFromForm();
    
    if(!task || !time) return showToast("Fill required fields", "error");
    
    let reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    
    if(editId) {
        reminders = reminders.map(r => {
            if(r.id === editId) {
                return {
                    ...r,
                    task, time, priority, tags, notes, preAlarm, repeat, assignee, subtasks,
                    image: currentImageBase64,
                    isDoc,
                    voiceMemo: voiceMemoBase64
                };
            }
            return r;
        });
        showToast("Updated!", "success");
        editId = null;
    } else {
        reminders.push({
            id: Date.now(),
            task, time, priority, tags, notes, preAlarm, repeat, assignee, subtasks,
            status: "pending",
            image: currentImageBase64,
            isDoc,
            voiceMemo: voiceMemoBase64,
            createdAt: new Date().toISOString()
        });
        showToast("Task added!", "success");
    }
    
    localStorage.setItem("reminders", JSON.stringify(reminders));
    localStorage.removeItem("taskDraft");
    loadReminders();
    updateAnalyticsAndGamification();
    syncToCloud();
}

function editReminder(id) {
    const reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    const reminder = reminders.find(r => r.id === id);
    
    if(reminder) {
        document.getElementById("taskInput").value = reminder.task;
        document.getElementById("notesInput").innerHTML = reminder.notes || "";
        document.getElementById("timeInput").value = reminder.time;
        document.getElementById("priorityInput").value = reminder.priority;
        document.getElementById("tagsInput").value = reminder.tags || "";
        document.getElementById("preAlarmInput").value = reminder.preAlarm || 0;
        document.getElementById("repeatInput").value = reminder.repeat || "none";
        document.getElementById("assigneeInput").value = reminder.assignee || "";
        
        if(reminder.image) {
            currentImageBase64 = reminder.image;
            document.getElementById("imagePreview").src = currentImageBase64;
            document.getElementById("imagePreviewContainer").style.display = "block";
        }
        
        if(reminder.voiceMemo) {
            voiceMemoBase64 = reminder.voiceMemo;
            document.getElementById("voiceMemoAudio").src = voiceMemoBase64;
            document.getElementById("voiceMemoPreviewContainer").style.display = "flex";
        }
        
        document.getElementById("subtasksContainer").innerHTML = "";
        if(reminder.subtasks) {
            reminder.subtasks.forEach(s => addSubtaskField(s.text, s.done));
        }
        
        editId = id;
        document.getElementById("submitBtn").innerText = "Update";
        document.getElementById("modalTitle").innerText = "Edit Task";
        switchPage('add');
    }
}

function togglePin(id) {
    let reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    reminders = reminders.map(r => {
        if(r.id === id) r.pinned = !r.pinned;
        return r;
    });
    localStorage.setItem("reminders", JSON.stringify(reminders));
    syncToCloud();
    loadReminders();
}

function initSortable() {
    const el = document.getElementById('reminderList');
    if(window.sortableInst) window.sortableInst.destroy();
    window.sortableInst = new Sortable(el, {
        handle: '.drag-handle',
        animation: 200,
        delay: 150,
        delayOnTouchOnly: true,
        onEnd: function () {
            let reminders = [];
            document.querySelectorAll('.reminder-item').forEach((item, idx) => {
                const id = parseInt(item.dataset.id);
                const allReminders = JSON.parse(localStorage.getItem("reminders")) || [];
                const reminder = allReminders.find(r => r.id === id);
                if(reminder) reminders.push(reminder);
            });
            localStorage.setItem("reminders", JSON.stringify(reminders));
            syncToCloud();
        }
    });
}

function loadReminders(filterText = "") {
    let reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    const today = getTodayStr();
    const yesterday = getYesterdayStr();
    
    // Filter by tab
    if(currentTab === 'today') {
        reminders = reminders.filter(r => r.time.split('T')[0] === today);
    } else if(currentTab === 'upcoming') {
        reminders = reminders.filter(r => r.time.split('T')[0] > today);
    } else if(currentTab === 'done') {
        reminders = reminders.filter(r => r.status === 'completed');
    } else if(currentTab === 'all') {
        reminders = reminders.filter(r => r.status !== 'completed');
    }
    
    // Filter by date
    if(selectedDateFilter) {
        reminders = reminders.filter(r => r.time.split('T')[0] === selectedDateFilter);
    }
    
    // Filter by tag
    if(activeTagFilter) {
        reminders = reminders.filter(r => r.tags && r.tags.includes(activeTagFilter));
    }
    
    // Search filter
    if(filterText) {
        reminders = reminders.filter(r => r.task.toLowerCase().includes(filterText));
    }
    
    // Sort
    const sortBy = document.getElementById("sortInput")?.value || "date";
    if(sortBy === "date") {
        reminders.sort((a, b) => new Date(a.time) - new Date(b.time));
    } else if(sortBy === "priority-high") {
        reminders.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }
    
    // Pinned items first
    reminders.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    
    // Render
    let html = '';
    reminders.forEach(r => {
        const time = new Date(r.time);
        const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const dateStr = time.toLocaleDateString();
        const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' }[r.priority] || '🟡';
        
        const subtaskHtml = r.subtasks ? r.subtasks.map((s, i) => `
            <div style="margin-left: 20px; font-size: 12px; color: #8e8e93; margin-top: 4px;">
                <input type="checkbox" ${s.done ? 'checked' : ''} onchange="toggleSubtaskLocal(${r.id}, ${i}, this)"> ${s.text}
            </div>
        `).join('') : '';
        
        html += `
        <li class="reminder-item priority-${r.priority}" data-id="${r.id}" style="opacity: ${r.status === 'completed' ? '0.6' : '1'};">
            <div style="flex: 1;">
                <div class="reminder-details">
                    <span class="drag-handle" style="cursor: grab; margin-right: 8px;">≡</span>
                    <h4 style="display: inline; text-decoration: ${r.status === 'completed' ? 'line-through' : 'none'}">${r.task}</h4>
                    <span style="font-size: 12px; color: #8e8e93; margin-left: 8px;">${priorityEmoji}</span>
                </div>
                <span style="font-size: 12px; color: #8e8e93;">${timeStr} • ${dateStr}</span>
                ${r.tags ? `<span style="display: inline-block; background: rgba(0, 122, 255, 0.15); color: var(--primary); padding: 2px 8px; border-radius: 8px; font-size: 11px; margin-top: 6px;">${r.tags}</span>` : ''}
                ${r.notes ? `<div style="font-size: 12px; margin-top: 6px; color: #666;">${r.notes}</div>` : ''}
                ${r.image ? `<img src="${r.image}" style="max-width: 100%; max-height: 150px; border-radius: 8px; margin-top: 8px;">` : ''}
                ${r.voiceMemo ? `<audio controls style="width: 100%; margin-top: 8px;"><source src="${r.voiceMemo}"></audio>` : ''}
                ${subtaskHtml}
            </div>
            <div style="display: flex; gap: 6px; flex-direction: column;">
                <button class="icon-btn-small" onclick="toggleStatus(${r.id})" style="background: ${r.status === 'completed' ? 'rgba(52, 199, 89, 0.15)' : 'rgba(0, 122, 255, 0.15)'}; width: 30px; height: 30px; border-radius: 8px; border: none; cursor: pointer;">${r.status === 'completed' ? '✓' : '◯'}</button>
                <button class="icon-btn-small" onclick="togglePin(${r.id})" style="width: 30px; height: 30px; border-radius: 8px; border: none; cursor: pointer;">${r.pinned ? '📌' : '○'}</button>
                <button class="icon-btn-small" onclick="editReminder(${r.id}); switchPage('add');" style="width: 30px; height: 30px; border-radius: 8px; border: none; cursor: pointer; background: rgba(0, 122, 255, 0.15);">✎</button>
                <button class="icon-btn-small del-btn" onclick="deleteReminder(${r.id})" style="width: 30px; height: 30px; border-radius: 8px; border: none; background: rgba(255, 59, 48, 0.15); cursor: pointer;">✕</button>
            </div>
        </li>
        `;
    });
    
    document.getElementById("reminderList").innerHTML = html || '<p style="text-align:center; color:#8e8e93;">No reminders yet</p>';
    
    // Analytics
    const total = JSON.parse(localStorage.getItem("reminders")).length || 0;
    const completed = reminders.filter(r => r.status === 'completed').length;
    const percentage = total ? Math.round((completed / total) * 100) : 0;
    document.getElementById("taskCountText").innerText = `${completed}/${total} Tasks Completed`;
    document.getElementById("percentageText").innerText = percentage + "%";
    document.getElementById("progressFill").style.width = percentage + "%";
    
    initSortable();
    updateMiniDashboard();
}

function speakAlarm(taskText) {
    if (!voiceAlarmEnabled) return;
    if ('speechSynthesis' in window) {
        const synth = window.speechSynthesis;
        const utterThis = new SpeechSynthesisUtterance("Reminder! It is time to " + taskText);
        synth.speak(utterThis);
    }
}

function updateTimers() {
    let reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    const now = new Date();
    
    reminders.forEach(r => {
        if(r.status !== 'completed') {
            const reminderTime = new Date(r.time);
            const preAlarmTime = new Date(reminderTime.getTime() - r.preAlarm * 60000);
            
            if(now >= preAlarmTime && now <= new Date(reminderTime.getTime() + 60000)) {
                playAlarm();
                speakAlarm(r.task);
                showToast(`Reminder: ${r.task}`, 'info');
            }
        }
    });
}

function generateNextRepeatTask(oldTask) {
    if(oldTask.repeat === 'none') return;
    
    const oldTime = new Date(oldTask.time);
    const newTime = new Date(oldTime);
    
    switch(oldTask.repeat) {
        case 'daily': newTime.setDate(newTime.getDate() + 1); break;
        case 'weekly': newTime.setDate(newTime.getDate() + 7); break;
        case 'monthly': newTime.setMonth(newTime.getMonth() + 1); break;
        case 'yearly': newTime.setFullYear(newTime.getFullYear() + 1); break;
    }
    
    const newReminder = {
        ...oldTask,
        id: Date.now() + Math.random(),
        time: newTime.toISOString(),
        status: 'pending'
    };
    
    let reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    reminders.push(newReminder);
    localStorage.setItem("reminders", JSON.stringify(reminders));
}

function fireConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    for(let i = 0; i < 50; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: -10,
            vx: (Math.random() - 0.5) * 10,
            vy: Math.random() * 5 + 5,
            size: Math.random() * 5 + 2,
            color: ['#ff3b30', '#007aff', '#34c759', '#ff9500', '#af52de'][Math.floor(Math.random() * 5)]
        });
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.5;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            if(p.y > canvas.height) particles.splice(i, 1);
        });
        if(particles.length > 0) requestAnimationFrame(animate);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    animate();
}

function toggleStatus(id) {
    let reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    reminders = reminders.map(r => {
        if(r.id === id) {
            r.status = r.status === 'completed' ? 'pending' : 'completed';
            if(r.status === 'completed') {
                fireConfetti();
                generateNextRepeatTask(r);
            }
        }
        return r;
    });
    localStorage.setItem("reminders", JSON.stringify(reminders));
    syncToCloud();
    loadReminders();
    updateAnalyticsAndGamification();
}

function playAlarm() {
    new Audio(userAlarmSound).play().catch(e => console.log(e));
    if (navigator.vibrate) {
        navigator.vibrate([1000, 500, 1000, 500, 1000]);
    }
}

function deleteReminder(id) {
    let reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    const reminder = reminders.find(r => r.id === id);
    deletedTaskTemp = reminder;
    
    reminders = reminders.filter(r => r.id !== id);
    localStorage.setItem("reminders", JSON.stringify(reminders));
    
    showToast("Deleted. Undo?", "error");
    clearTimeout(deleteTimeout);
    deleteTimeout = setTimeout(() => { deletedTaskTemp = null; syncToCloud(); }, 5000);
    
    loadReminders();
}

function undoDelete() {
    if(deletedTaskTemp) {
        let r = JSON.parse(localStorage.getItem("reminders"))||[];
        r.push(deletedTaskTemp);
        localStorage.setItem("reminders", JSON.stringify(r));
        deletedTaskTemp = null;
        document.querySelectorAll('.toast.error').forEach(t => t.remove());
        showToast("Restored! ♻️", "success");
        searchReminders();
        syncToCloud();
    }
}

// --- Export / Import ---
function shareAppURL() {
    const data = encodeURIComponent(btoa(JSON.stringify({ t: "Master App", n: "Sync life." })));
    const url = window.location.origin + window.location.pathname + "?share=" + data;
    navigator.clipboard.writeText(url).then(() => showToast("Link Copied!", "success"));
}

function exportToCSV() {
    const reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    const habits = JSON.parse(localStorage.getItem("habits")) || [];
    const data = { reminders, habits };
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'reminder-backup.json';
    link.click();
    showToast("Downloaded!", "success");
}

function importDataFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if(data.reminders) {
                localStorage.setItem("reminders", JSON.stringify(data.reminders));
                if(data.habits) localStorage.setItem("habits", JSON.stringify(data.habits));
                showToast("Restored! Refreshing...", "success");
                setTimeout(() => location.reload(), 1000);
            }
        } catch (err) {
            showToast("JSON only", "error");
        }
    };
    reader.readAsText(file);
}

// --- Eisenhower Matrix ---
function openMatrixModal() {
    const reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    let quadrants = { urgent_important: [], important: [], urgent: [], neither: [] };
    
    reminders.forEach(r => {
        if(r.priority === 'high') {
            if(new Date(r.time) - new Date() < 24 * 60 * 60 * 1000) {
                quadrants.urgent_important.push(r);
            } else {
                quadrants.important.push(r);
            }
        } else if(new Date(r.time) - new Date() < 24 * 60 * 60 * 1000) {
            quadrants.urgent.push(r);
        } else {
            quadrants.neither.push(r);
        }
    });
    
    let html = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div style="background: rgba(255, 59, 48, 0.15); padding: 15px; border-radius: 12px;">
            <h4 style="margin: 0 0 10px 0; color: #ff3b30;">🔴 Urgent & Important</h4>
            ${quadrants.urgent_important.map(r => `<div style="font-size: 12px; margin: 4px 0;">${r.task}</div>`).join('')}
        </div>
        <div style="background: rgba(52, 199, 89, 0.15); padding: 15px; border-radius: 12px;">
            <h4 style="margin: 0 0 10px 0; color: #34c759;">🟢 Important (Not Urgent)</h4>
            ${quadrants.important.map(r => `<div style="font-size: 12px; margin: 4px 0;">${r.task}</div>`).join('')}
        </div>
        <div style="background: rgba(255, 149, 0, 0.15); padding: 15px; border-radius: 12px;">
            <h4 style="margin: 0 0 10px 0; color: #ff9500;">🟡 Urgent (Not Important)</h4>
            ${quadrants.urgent.map(r => `<div style="font-size: 12px; margin: 4px 0;">${r.task}</div>`).join('')}
        </div>
        <div style="background: rgba(142, 142, 147, 0.15); padding: 15px; border-radius: 12px;">
            <h4 style="margin: 0 0 10px 0; color: #8e8e93;">⚪ Neither</h4>
            ${quadrants.neither.map(r => `<div style="font-size: 12px; margin: 4px 0;">${r.task}</div>`).join('')}
        </div>
    </div>
    `;
    
    document.getElementById("matrixContainer").innerHTML = html;
    openModal('matrixModal');
}

// --- GAMIFICATION STORE ---
function openStore() {
    const xp = (userLevel - 1) * 50;
    document.getElementById("storeXpDisplay").innerText = xp;
    openModal('storeModal');
}

function buyReward(itemId, cost) {
    const xp = (userLevel - 1) * 50;
    if(xp < cost) {
        showToast("Not enough XP!", "error");
        return;
    }
    userLevel -= Math.floor(cost / 50);
    localStorage.setItem("userLevel", userLevel);
    showToast(`You unlocked: ${itemId}! 🎉`, "success");
    openStore();
}

// --- SHARED STUDY/PROJECT TEMPLATES ---
function shareCustomTemplate() {
    const template = {
        task: document.getElementById("taskInput").value,
        notes: document.getElementById("notesInput").innerHTML,
        priority: document.getElementById("priorityInput").value
    };
    const encoded = encodeURIComponent(btoa(JSON.stringify(template)));
    const url = window.location.href + "?template=" + encoded;
    navigator.clipboard.writeText(url);
    showToast("Template shared!", "success");
}

// --- Initialize Timers ---
setInterval(updateTimers, 60000);
setInterval(updateAnalyticsAndGamification, 3600000);
setInterval(cleanupOldTasks, 86400000);