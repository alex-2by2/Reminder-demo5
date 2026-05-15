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
        JSON.parse(text).forEach(sub => addSubtaskField(sub, false)); showToast("🪄 Auto-Plan Complete!", "success");
    } catch(e) { showToast("AI Error: " + e.message, "error"); console.error("Gemini AI Error:", e); }
}

async function aiSuggestTime() {
    const taskName = document.getElementById("taskInput").value.trim();
    if(!taskName) return showToast("Enter Task Title!", "error");
    showToast("🪄 AI is thinking...", "info");
    try {
        const now = new Date();
        const prompt = `Task: "${taskName}". Current time: ${now.toISOString()}. Suggest a logical future date/time. Respond ONLY with format: YYYY-MM-DDTHH:mm.`;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${FIXED_GEMINI_KEY}`, { 
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) 
        });
        const data = await response.json(); if(data.error) throw new Error(data.error.message);
        let aiTime = data.candidates[0].content.parts[0].text.trim(); document.getElementById("timeInput").value = aiTime; showToast("🪄 Time set!", "success");
    } catch(e) { showToast("AI Error: " + e.message, "error"); console.error("Gemini AI Error:", e); }
}

async function generateAIReview() {
    const outputDiv = document.getElementById("aiReviewOutput");
    outputDiv.innerText = "🪄 Analyzing...";
    try {
        const reminders = JSON.parse(localStorage.getItem("reminders")) || []; const comp = reminders.filter(r => r.status === "completed").length; const pend = reminders.length - comp; const xp = localStorage.getItem("habitXP_tasks") || "0";
        const prompt = `Act as a coach. Completed: ${comp}, Pending: ${pend}, XP: ${xp}. Write a punchy 2-sentence review with emojis.`;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${FIXED_GEMINI_KEY}`, { 
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) 
        });
        const data = await response.json(); if(data.error) throw new Error(data.error.message);
        outputDiv.innerText = data.candidates[0].content.parts[0].text.trim(); showToast("Review Generated!", "success");
    } catch(e) { outputDiv.innerText = "AI Error."; showToast("AI Error: " + e.message, "error"); console.error("Gemini AI Error:", e); }
}

async function startSmartVoiceAssistant() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return showToast("Not supported.", "error");
    const rec = new SpeechRecognition(); 
    rec.lang = 'en-IN';
    rec.onstart = function() { showToast("Listening... 🎙️", "info"); };
    rec.onresult = async function(event) { 
        const text = event.results[0][0].transcript;
        showToast("Processing...", "info"); 
        try {
            const now = new Date().toISOString();
            const prompt = `Extract info: "${text}". Current: ${now}. Return ONLY JSON: "task" (str), "time" (YYYY-MM-DDTHH:mm), "priority" (high/medium/low).`;
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${FIXED_GEMINI_KEY}`, { 
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({contents: [{parts:[{text: prompt}]}]}) 
            });
            const data = await res.json(); if(data.error) throw new Error(data.error.message);
            let result = data.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim(); const parsed = JSON.parse(result);
            let rems = JSON.parse(localStorage.getItem("reminders")) || [];
            rems.push({ id: Date.now(), task: parsed.task, time: parsed.time, priority: parsed.priority || 'medium', preAlarm: 0, assignee: "", notes: "", status: "pending", notified: false, repeat: "none", category: autoCategorizeTask(parsed.task) });
            localStorage.setItem("reminders", JSON.stringify(rems)); syncToCloud(); loadReminders(); showToast("Auto-Added! ✅", "success");
        } catch(err) { showToast("AI Error: " + err.message, "error"); console.error("Gemini AI Error:", err); }
    }; 
    rec.start();
}

// --- Subtasks Handling ---
function addSubtaskField(val = "", done = false) {
    const cont = document.getElementById("subtasksContainer");
    const id = Date.now() + Math.random(); const div = document.createElement("div"); div.style.display = "flex"; div.style.gap="10px"; div.style.marginBottom="10px"; div.className="subtask-item";
    div.innerHTML = `<input type="checkbox" class="subtask-checkbox" style="width:20px;height:20px;" ${done ? 'checked' : ''} id="cb_${id}"> <input type="text" style="flex:1; margin:0; padding:8px 12px; border-radius:10px; border:1px solid #e5e5ea;" class="subtask-inp" placeholder="Sub-task..." value="${val}" id="inp_${id}"> <button style="background:#ffe5e5; color:#ff3b30; border:none; border-radius:10px; padding:8px; cursor:pointer;" onclick="this.parentElement.remove()">✖</button>`; cont.appendChild(div);
}
function getSubtasksFromForm() { let subs = [];
    document.querySelectorAll(".subtask-item").forEach(item => { const val = item.querySelector(".subtask-inp").value.trim(); if(val) subs.push({ text: val, done: item.querySelector(".subtask-checkbox").checked }); }); return subs;
}
function toggleSubtaskLocal(taskId, subIndex, checkbox) {
    let reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    reminders = reminders.map(r => { if(r.id === taskId && r.subtasks && r.subtasks[subIndex]) r.subtasks[subIndex].done = checkbox.checked; return r; });
    localStorage.setItem("reminders", JSON.stringify(reminders)); syncToCloud(); loadReminders(); 
}

// --- Productivity Chart ---
function renderChart() {
    const rems = JSON.parse(localStorage.getItem("reminders")) || []; 
    const last7Days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().split('T')[0]; }).reverse();
    const dataCounts = last7Days.map(date => rems.filter(r => r.time.split('T')[0] === date && r.status === 'completed').length);
    const ctx = document.getElementById('productivityChart').getContext('2d'); if(chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, { type: 'bar', data: { labels: last7Days.map(d => d.slice(5)), datasets: [{ label: 'Tasks', data: dataCounts, backgroundColor: '#34c759', borderRadius: 8 }] }, options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } } });
}

// --- Utility Functions ---
function showToast(message, type = 'info') { const container = document.getElementById("toastContainer");
    const toast = document.createElement("div"); toast.className = `toast ${type}`; let icon = type === "success" ? "✅" : (type === "error" ? "⚠️" : "💡"); toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`; container.appendChild(toast); setTimeout(() => toast.remove(), 3000);
}
function toggleTheme() { const isDark = document.body.classList.toggle("dark-mode"); localStorage.setItem("darkMode", isDark); document.getElementById("themeToggleBtn").innerText = isDark ? "☀️" : "🌙"; }
function getTodayStr() { const today = new Date(); return (new Date(today - today.getTimezoneOffset() * 60000)).toISOString().split('T')[0]; }
function getYesterdayStr() { const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); return (new Date(yesterday - yesterday.getTimezoneOffset() * 60000)).toISOString().split('T')[0]; }
function toggleCustomRepeat() { const val = document.getElementById("repeatInput").value;
    const ui = document.getElementById("customRepeatUI"); const typeSelect = document.getElementById("customRepeatType"); if(val === "custom") { ui.style.display = "block";
    if(typeSelect.value === "hours") typeSelect.value = "days"; } else if (val === "hourly") { ui.style.display = "block"; typeSelect.value = "hours";
    } else { ui.style.display = "none"; } 
}
function loadDraft() { if(editId) return; const draft = JSON.parse(localStorage.getItem("taskDraft"));
    if(draft) { if(!document.getElementById("taskInput").value) document.getElementById("taskInput").value = draft.task || ""; if(!document.getElementById("notesInput").innerHTML) document.getElementById("notesInput").innerHTML = draft.notes || ""; } 
}

// --- Voice Memo Attachments ---
function toggleVoiceMemo() {
    const btn = document.getElementById("recordBtn");
    if(!mediaRecorder || mediaRecorder.state === "inactive") {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            mediaRecorder = new MediaRecorder(stream); mediaRecorder.start(); audioChunks = []; btn.innerHTML = "⏹️ Stop Recording..."; btn.style.background = "#ff3b30"; btn.style.color = "white";
            mediaRecorder.addEventListener("dataavailable", event => { audioChunks.push(event.data); });
            mediaRecorder.addEventListener("stop", () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); const reader = new FileReader(); 
                reader.readAsDataURL(audioBlob); reader.onloadend = function() { voiceMemoBase64 = reader.result; document.getElementById("voiceMemoAudio").src = voiceMemoBase64; document.getElementById("voiceMemoPreviewContainer").style.display = "flex"; showToast("Saved!", "success"); }
            });
        }).catch(e => showToast("Mic denied.", "error"));
    } else { mediaRecorder.stop(); btn.innerHTML = "🔴 Voice Memo"; btn.style.background = "rgba(255,59,48,0.1)"; btn.style.color = "#ff3b30";
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
}
function removeVoiceMemo() { voiceMemoBase64 = null; document.getElementById("voiceMemoPreviewContainer").style.display = "none"; }

// --- Image & Document Attachments ---
function handleImageUpload(event) {
    const file = event.target.files[0];
    if(!file) return; if(file.size > 2 * 1024 * 1024) return showToast("File too large! Max 2MB allowed.", "error");
    const reader = new FileReader();
    reader.onload = function(e) {
        if(file.type.startsWith('image/')) {
            isDoc = false;
            const img = new Image(); img.onload = function() {
                const canvas = document.createElement("canvas");
                const MAX_WIDTH = 500; let scaleSize = 1; if(img.width > MAX_WIDTH) scaleSize = MAX_WIDTH / img.width;
                canvas.width = img.width * scaleSize; canvas.height = img.height * scaleSize; const ctx = canvas.getContext("2d"); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                currentImageBase64 = canvas.toDataURL("image/jpeg", 0.7); document.getElementById("imagePreview").src = currentImageBase64; document.getElementById("imagePreview").style.display = "block"; document.getElementById("docPreview").style.display = "none"; document.getElementById("imagePreviewContainer").style.display = "block";
            }
            img.src = e.target.result;
        } else { isDoc = true; currentImageBase64 = e.target.result; document.getElementById("imagePreview").style.display = "none"; document.getElementById("docPreview").style.display = "block"; document.getElementById("imagePreviewContainer").style.display = "block"; }
    }
    reader.readAsDataURL(file);
}
function removeImage() { currentImageBase64 = null; isDoc = false; document.getElementById("imagePreviewContainer").style.display = "none"; document.getElementById("imageUpload").value = ""; }

// --- Categorization ---
function autoCategorizeTask(taskName) {
    const lowerTask = taskName.toLowerCase();
    if (/call|contact|phone|ring/.test(lowerTask)) return { name: "Call", icon: "📞" }; if (/buy|shop|grocery|milk|bread|mall|market/.test(lowerTask)) return { name: "Shopping", icon: "🛒" };
    if (/doctor|pill|medicine|workout|gym|clinic|health|water/.test(lowerTask)) return { name: "Health", icon: "🏥" }; if (/meet|zoom|boss|project|office|email|work|code|sync/.test(lowerTask)) return { name: "Work", icon: "💻" };
    if (/pay|bank|money|bill|salary|rent|finance/.test(lowerTask)) return { name: "Finance", icon: "💰" }; if (/read|study|book|exam|homework|assignment|test/.test(lowerTask)) return { name: "Study", icon: "📚" };
    return { name: "Task", icon: "📝" }; 
}

// --- Custom Templates ---
function saveCustomTemplate() {
    const t = document.getElementById("taskInput").value.trim();
    if(!t) return showToast("Enter title first!", "error");
    let temps = JSON.parse(localStorage.getItem("customTemplates")) || [];
    temps.push({ title: t, notes: document.getElementById("notesInput").innerHTML, rep: document.getElementById("repeatInput").value, pri: document.getElementById("priorityInput").value });
    localStorage.setItem("customTemplates", JSON.stringify(temps)); renderCustomTemplates(); syncToCloud(); showToast("Saved!", "success");
}
function renderCustomTemplates() { const group = document.getElementById("customSavedTemplatesGroup"); if(!group) return; const temps = JSON.parse(localStorage.getItem("customTemplates")) || [];
    let html = ''; temps.forEach((t, i) => { html += `<option value="custom_${i}">⭐ ${t.title}</option>`; }); group.innerHTML = html;
}
function applyQuickTemplate() {
    const select = document.getElementById("quickTemplateSelect");
    const val = select.value; if(!val) return;
    if(val.startsWith("custom_")) {
        const index = parseInt(val.split("_")[1]);
        const temps = JSON.parse(localStorage.getItem("customTemplates")) || []; const t = temps[index];
        if(t) { document.getElementById("taskInput").value = t.title; document.getElementById("notesInput").innerHTML = t.notes || "";
            document.getElementById("repeatInput").value = t.rep || "none"; document.getElementById("priorityInput").value = t.pri || "medium"; toggleCustomRepeat(); const now = new Date(); now.setHours(now.getHours() + 1);
            const tzoffset = now.getTimezoneOffset() * 60000; document.getElementById("timeInput").value = (new Date(now - tzoffset)).toISOString().slice(0, 16);
        }
        select.value = ""; return;
    }
    const templates = { "Birthday": { rep: "yearly", pri: "high" }, "Anniversary": { rep: "yearly", pri: "high" }, "Other": { rep: "none", pri: "medium" }, "Water": { rep: "hourly", pri: "medium" }, "Food": { rep: "daily", pri: "medium" }, "Wakeup": { rep: "daily", pri: "high" }, "Sleeping": { rep: "daily", pri: "medium" }, "Reading": { rep: "daily", pri: "low" }, "GYM": { rep: "daily", pri: "medium" }, "Walking": { rep: "daily", pri: "low" }, "Running": { rep: "daily", pri: "medium" }, "Bill": { rep: "monthly", pri: "high" }, "Rent": { rep: "monthly", pri: "high" }, "EMI": { rep: "monthly", pri: "high" }, "Event": { rep: "none", pri: "medium" }, "Appointment": { rep: "none", pri: "high" } };
    const t = templates[val];
    if(t) {
        document.getElementById("taskInput").value = val;
        document.getElementById("repeatInput").value = t.rep; document.getElementById("priorityInput").value = t.pri;
        if(t.rep === 'hourly') { document.getElementById("customRepeatType").value = "hours"; document.getElementById("customRepeatInterval").value = "1"; }
        toggleCustomRepeat(); removeImage(); removeVoiceMemo(); const now = new Date();
        now.setHours(now.getHours() + 1); const tzoffset = now.getTimezoneOffset() * 60000; document.getElementById("timeInput").value = (new Date(now - tzoffset)).toISOString().slice(0, 16);
    }
    select.value = "";
}

// --- Analytics & Gamification ---
function openAnalyticsModal() { const reminders = JSON.parse(localStorage.getItem("reminders")) || []; document.getElementById("statTotalTasks").innerText = reminders.length; document.getElementById("statCompletedTasks").innerText = reminders.filter(r => r.status === "completed").length; openModal('analyticsModal'); }
function updateMiniDashboard() {
    const reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    const habits = JSON.parse(localStorage.getItem("habits")) || []; const todayStr = getTodayStr(); const tomorrow = new Date(); tomorrow.setHours(0,0,0,0); tomorrow.setDate(tomorrow.getDate() + 1);
    let todayPendingTasks = 0; let todayCompletedTasks = 0;
    reminders.forEach(r => { const rDate = new Date(r.time); if (r.status !== "completed") { if (rDate < tomorrow) todayPendingTasks++; } else { if(r.time.split('T')[0] === todayStr) todayCompletedTasks++; } });
    document.getElementById("widgetTasksToday").innerText = `${todayPendingTasks}`; document.getElementById("widgetHabitsToday").innerText = `${habits.filter(h => h.lastCheckIn !== todayStr).length} Habits Pending`;
    let dailyGoal = parseInt(localStorage.getItem("dailyTaskGoal")) || 5;
    let goalPct = Math.min((todayCompletedTasks / dailyGoal) * 100, 100);
    document.getElementById("widgetGoalText").innerText = `${todayCompletedTasks}/${dailyGoal} Done`; document.getElementById("widgetGoalFill").style.width = `${goalPct}%`;
}
function updateAnalyticsAndGamification() {
    const reminders = JSON.parse(localStorage.getItem("reminders"))||[];
    const completedReminders = reminders.filter(r => r.status === "completed").length; const totalTasks = reminders.length; let percentage = totalTasks > 0 ? Math.round((completedReminders / totalTasks) * 100) : 0;
    document.getElementById("taskCountText").innerText = `${completedReminders}/${totalTasks} Completed`; document.getElementById("percentageText").innerText = `${percentage}%`; document.getElementById("progressFill").style.width = `${percentage}%`;
    const habitCompleted = parseInt(localStorage.getItem("habitXP_tasks") || "0"); const totalCompletedForXP = completedReminders + habitCompleted; const totalXP = totalCompletedForXP * 10;
    const newLevel = Math.floor(totalCompletedForXP / 5) + 1; const xpInCurrentLevel = totalXP % 50;
    document.getElementById("gamificationBadge").innerHTML = `⭐ Level ${newLevel} | ✨ ${xpInCurrentLevel}/50 XP`;
    if (newLevel > userLevel) { userLevel = newLevel; localStorage.setItem("userLevel", userLevel); fireConfetti(); } else if (newLevel < userLevel) { userLevel = newLevel; localStorage.setItem("userLevel", userLevel); }
}

// --- Filtering ---
function filterByTag(tag) { activeTagFilter = activeTagFilter === tag ? "" : tag; loadReminders(); }
function changeTab(tabName) { currentTab = tabName; document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active')); document.getElementById(`tab-${tabName}`).classList.add('active'); searchReminders(); }
function searchReminders() { loadReminders(document.getElementById("searchInput") ? document.getElementById("searchInput").value.toLowerCase() : ""); }

// --- Habits Core ---
function addHabit() { const name = document.getElementById("habitInput").value.trim();
    if(!name) return showToast("Enter name.", "error"); const habits = JSON.parse(localStorage.getItem("habits"))||[]; habits.push({ id: Date.now(), name: name, streak: 0, maxStreak: 0, lastCheckIn: null, history: [] });
    localStorage.setItem("habits", JSON.stringify(habits)); document.getElementById("habitInput").value = ""; showToast("Habit added!", "success"); loadHabits(); syncToCloud();
}
function checkInHabit(id) {
    let habits = JSON.parse(localStorage.getItem("habits")) || [];
    const todayStr = getTodayStr(); const yesterdayStr = getYesterdayStr(); let checkedIn = false;
    habits = habits.map(habit => {
        if (habit.id === id) {
            if (habit.lastCheckIn === todayStr) return habit;
            if (habit.lastCheckIn === yesterdayStr) { habit.streak += 1; } else { habit.streak = 1; }
            if (habit.streak > habit.maxStreak) habit.maxStreak = habit.streak;
            habit.lastCheckIn = todayStr; checkedIn = true; if(!habit.history) habit.history = []; if(!habit.history.includes(todayStr)) habit.history.push(todayStr); showToast(`🔥 Streak: ${habit.streak}!`, "success");
        } return habit;
    });
    if(checkedIn) { localStorage.setItem("habits", JSON.stringify(habits)); loadHabits(); let completed = parseInt(localStorage.getItem("habitXP_tasks") || "0"); localStorage.setItem("habitXP_tasks", completed + 1); updateAnalyticsAndGamification(); syncToCloud(); }
}
function deleteHabit(id) { let habits = JSON.parse(localStorage.getItem("habits"))||[];
    localStorage.setItem("habits", JSON.stringify(habits.filter(h => h.id !== id))); showToast("Deleted.", "error"); loadHabits(); syncToCloud();
}
function loadHabits() {
    const habitList = document.getElementById("habitList");
    habitList.innerHTML = ""; const habits = JSON.parse(localStorage.getItem("habits"))||[]; const todayStr = getTodayStr();
    habits.forEach(habit => {
        const isCheckedInToday = habit.lastCheckIn === todayStr; const li = document.createElement("li"); li.className = "habit-item"; li.style.background = "#fff"; li.style.padding = "15px"; li.style.borderRadius = "16px"; li.style.marginBottom = "10px"; li.style.border = "1px solid #f2f2f7";
        li.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
            <div><h4 style="margin:0 0 5px 0; font-size:15px; color:#1c1c1e;">${habit.name}</h4><span style="background:#e5f1ff; color:#007aff; font-size:11px; padding:4px 8px; border-radius:8px; font-weight:700;">🔥 ${habit.streak}</span></div>
            <div style="display:flex; gap:8px;"><button style="background:${isCheckedInToday?'#e5e5ea':'#34c759'}; color:${isCheckedInToday?'#8e8e93':'#fff'}; border:none; border-radius:10px; padding:8px 12px; font-weight:700; font-size:12px; cursor:pointer;" onclick="checkInHabit(${habit.id})" ${isCheckedInToday?"disabled":""}>${isCheckedInToday ? "Done ✅" : "Check-in"}</button><button style="background:#ffe5e5; color:#ff3b30; border:none; border-radius:10px; padding:8px 12px; cursor:pointer;" onclick="deleteHabit(${habit.id})">🗑️</button></div>
        </div>`;
        habitList.appendChild(li);
    }); updateMiniDashboard();
}

// --- Reminders Core ---
function addOrUpdateReminder() {
    const task = document.getElementById("taskInput").value.trim();
    const notes = document.getElementById("notesInput").innerHTML; const time = document.getElementById("timeInput").value; const repeat = document.getElementById("repeatInput").value; const priority = document.getElementById("priorityInput").value; const image = currentImageBase64;
    const audio = voiceMemoBase64; const tags = document.getElementById("tagsInput").value.trim(); const subtasks = getSubtasksFromForm(); const preAlarm = parseInt(document.getElementById("preAlarmInput").value) || 0;
    const assignee = document.getElementById("assigneeInput").value.trim();
    let customRepeat = null; if(repeat === 'custom' || repeat === 'hourly') { customRepeat = { interval: document.getElementById("customRepeatInterval").value, type: document.getElementById("customRepeatType").value }; }
    if (!task || !time) return showToast("Enter title and time.", "error");
    const aiCategory = autoCategorizeTask(task); let reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    if (editId) {
        const index = reminders.findIndex(r => r.id === editId);
        if (index !== -1) { reminders[index] = {...reminders[index], task, notes, time, repeat, priority, image, audio, isDoc, category: aiCategory, tags, subtasks, customRepeat, notified: false, preAlarm, assignee}; }
        editId = null; showToast("Updated!", "success");
    } else {
        reminders.push({ id: Date.now(), task, notes, image, audio, isDoc, pinned: false, time, repeat, customRepeat, priority, tags, subtasks, category: aiCategory, status: "pending", notified: false, preAlarm, assignee });
        showToast(`Saved!`, "success");
    }
    localStorage.setItem("reminders", JSON.stringify(reminders)); localStorage.removeItem("taskDraft"); loadReminders(); syncToCloud();
}

function editReminder(id) {
    const reminder = (JSON.parse(localStorage.getItem("reminders")) || []).find(r => r.id === id);
    if (reminder) {
        document.getElementById("taskInput").value = reminder.task;
        document.getElementById("notesInput").innerHTML = reminder.notes || ""; document.getElementById("timeInput").value = reminder.time; document.getElementById("repeatInput").value = reminder.repeat || "none"; document.getElementById("priorityInput").value = reminder.priority || "medium";
        document.getElementById("tagsInput").value = reminder.tags || ""; document.getElementById("preAlarmInput").value = reminder.preAlarm || "0"; document.getElementById("assigneeInput").value = reminder.assignee || "";
        document.getElementById("subtasksContainer").innerHTML = "";
        if(reminder.subtasks) reminder.subtasks.forEach(sub => addSubtaskField(sub.text, sub.done));
        if((reminder.repeat === 'custom' || reminder.repeat === 'hourly') && reminder.customRepeat) { document.getElementById("customRepeatUI").style.display = "block";
        document.getElementById("customRepeatInterval").value = reminder.customRepeat.interval; document.getElementById("customRepeatType").value = reminder.customRepeat.type; } else { document.getElementById("customRepeatUI").style.display = "none"; }
        if(reminder.image) { currentImageBase64 = reminder.image; isDoc = reminder.isDoc;
        document.getElementById("imagePreviewContainer").style.display = "block"; if(isDoc) { document.getElementById("imagePreview").style.display = "none"; document.getElementById("docPreview").style.display = "block"; } else { document.getElementById("imagePreview").src = currentImageBase64; document.getElementById("imagePreview").style.display = "block";
        document.getElementById("docPreview").style.display = "none"; } } else { removeImage(); }
        if(reminder.audio) { voiceMemoBase64 = reminder.audio;
        document.getElementById("voiceMemoAudio").src = voiceMemoBase64; document.getElementById("voiceMemoPreviewContainer").style.display = "flex"; } else { removeVoiceMemo(); }
        editId = id; document.getElementById("modalTitle").innerText = "Edit Task";
        document.getElementById("submitBtn").innerText = "Update Task"; switchPage('add'); 
    }
}

function togglePin(id) { let reminders = JSON.parse(localStorage.getItem("reminders")) || []; reminders = reminders.map(r => { if(r.id === id) r.pinned = !r.pinned; return r; }); localStorage.setItem("reminders", JSON.stringify(reminders)); loadReminders(); syncToCloud(); }

function initSortable() {
    const el = document.getElementById('reminderList');
    if(window.sortableInst) window.sortableInst.destroy();
    window.sortableInst = new Sortable(el, { handle: '.drag-handle', animation: 200, delay: 150, delayOnTouchOnly: true, onEnd: function () {
        const sortType = document.getElementById("sortInput").value; if(sortType !== "manual") { showToast("Switch to 'Custom Order' to save!", "error"); loadReminders(); return; }
        const listItems = document.querySelectorAll('#reminderList .reminder-item'); let newOrderIds = []; listItems.forEach(li => newOrderIds.push(Number(li.getAttribute('data-id'))));
        let oldRems = JSON.parse(localStorage.getItem("reminders")) || []; let sortedRems = []; newOrderIds.forEach(id => { const r = oldRems.find(x => x.id === id); if(r) sortedRems.push(r); });
        const filteredOut = oldRems.filter(x => !newOrderIds.includes(x.id)); sortedRems = sortedRems.concat(filteredOut); localStorage.setItem("reminders", JSON.stringify(sortedRems)); syncToCloud();
    } });
}

function loadReminders(filterText = "") {
    const reminderList = document.getElementById("reminderList");
    reminderList.innerHTML = ""; let reminders = JSON.parse(localStorage.getItem("reminders")) || []; updateAnalyticsAndGamification(); updateMiniDashboard();
    let allTags = new Set();
    reminders.forEach(r => { if(r.tags) { r.tags.split(',').forEach(t => { if(t.trim()) allTags.add(t.trim()); }); } });
    let tagsHtml = `<button class="template-chip ${activeTagFilter===''?'active':''}" onclick="filterByTag('')">All Tags</button>`;
    allTags.forEach(t => { tagsHtml += `<button class="template-chip ${activeTagFilter===t?'active':''}" onclick="filterByTag('${t}')">${t}</button>`; });
    document.getElementById("tagFilterContainer").innerHTML = tagsHtml;
    
    if (selectedDateFilter) { reminders = reminders.filter(r => r.time.split('T')[0] === selectedDateFilter);
    } else {
        const tomorrow = new Date(); tomorrow.setHours(0,0,0,0);
        tomorrow.setDate(tomorrow.getDate() + 1);
        reminders = reminders.filter(r => {
            const rDate = new Date(r.time); if (currentTab === 'done') return r.status === 'completed'; if (currentTab === 'all') return true; if (r.status === 'completed') return false;
            if (currentTab === 'today') return rDate < tomorrow; if (currentTab === 'upcoming') { return rDate.getMonth() === currentCalMonth && rDate.getFullYear() === currentCalYear; } return true;
        });
    }

    if (filterText) { reminders = reminders.filter(r => r.task.toLowerCase().includes(filterText) || (r.notes && r.notes.toLowerCase().includes(filterText)) || (r.tags && r.tags.toLowerCase().includes(filterText)) ); }
    if (activeTagFilter) { reminders = reminders.filter(r => r.tags && r.tags.includes(activeTagFilter)); }
    renderHomeCalendar(); clearInterval(timerInterval);
    if (reminders.length === 0) { reminderList.innerHTML = `<div style="text-align:center; padding:40px 20px; color:#8e8e93;">No tasks found</div>`; return; }

    const sortType = document.getElementById("sortInput").value;
    if(sortType !== "manual") {
        reminders.sort((a, b) => {
            if (a.pinned !== b.pinned) return b.pinned ? 1 : -1; const pMap = { "high": 3, "medium": 2, "low": 1 };
            if (sortType === "priority-high") return pMap[b.priority||"medium"] - pMap[a.priority||"medium"] || new Date(a.time) - new Date(b.time);
            if (sortType === "priority-low") return pMap[a.priority||"medium"] - pMap[b.priority||"medium"] || new Date(a.time) - new Date(b.time);
            return new Date(a.time) - new Date(b.time); 
        });
    }

    reminders.forEach(reminder => {
        const li = document.createElement("li"); const isCompleted = reminder.status === "completed"; const priorityClass = reminder.priority ? `priority-${reminder.priority}` : 'priority-medium'; li.className = `reminder-item ${priorityClass}`;
        if(isCompleted) { li.style.opacity = "0.6"; li.style.borderLeftColor = "#8e8e93"; }
        li.id = `rem_card_${reminder.id}`; li.setAttribute('data-id', reminder.id);
        const formattedTime = new Date(reminder.time).toLocaleString("en-IN", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });

        let pinnedBadge = reminder.pinned ? `<div style="position:absolute; top:-10px; right:-10px; font-size:16px;">⭐</div>` : ``;
        let catHTML = reminder.category ? `<div style="background:#e5f1ff; color:#007aff; padding:4px 8px; border-radius:8px; font-size:11px; font-weight:700; margin-bottom:5px; display:inline-block;">${reminder.category.icon} ${reminder.category.name}</div>` : '';
        let repeatText = ''; if((reminder.repeat === 'custom' || reminder.repeat === 'hourly') && reminder.customRepeat) { repeatText = `Every ${reminder.customRepeat.interval} ${reminder.customRepeat.type}`;
        } else if (reminder.repeat && reminder.repeat !== 'none') { repeatText = reminder.repeat.charAt(0).toUpperCase() + reminder.repeat.slice(1); }
        let repeatHTML = (reminder.repeat && reminder.repeat !== 'none') ? `<div style="background:#fff0f0; color:#ff3b30; padding:4px 8px; border-radius:8px; font-size:11px; font-weight:700; margin-bottom:5px; display:inline-block; margin-left:5px;">🔁 ${repeatText}</div>` : '';

        let tagsHTML = "";
        if(reminder.tags) { reminder.tags.split(',').forEach(tag => { if(tag.trim()) tagsHTML += `<span style="background:#e5e5ea; color:#8e8e93; padding:4px 8px; border-radius:8px; font-size:11px; font-weight:700; margin-bottom:5px; display:inline-block; margin-left:5px;">${tag.trim()}</span> `; }); }
        let subHTML = "";
        if(reminder.subtasks && reminder.subtasks.length > 0) {
            let doneCount = reminder.subtasks.filter(s=>s.done).length;
            let totalCount = reminder.subtasks.length; let pct = (doneCount/totalCount)*100;
            subHTML = `<div style="width:100%; height:6px; background:#e5e5ea; border-radius:6px; margin:8px 0; overflow:hidden;"><div style="height:100%; width:${pct}%; background:#34c759;"></div></div><ul style="list-style:none; padding:0; margin:0;">`;
            reminder.subtasks.forEach((sub, idx) => { subHTML += `<li style="display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:4px; color:#666;"><input type="checkbox" style="width:16px;height:16px;margin:0;" ${sub.done?'checked':''} onchange="toggleSubtaskLocal(${reminder.id}, ${idx}, this)" ${isCompleted?'disabled':''}> <span style="${sub.done?'text-decoration:line-through;opacity:0.6;':''} font-weight:500;">${sub.text}</span></li>`; });
            subHTML += `</ul>`;
        }

        let notesHTML = reminder.notes ? `<div style="margin: 8px 0; font-size: 13px; color: #666; background: #f2f2f7; padding: 10px; border-radius: 10px;">${reminder.notes}</div>` : "";
        let actionBtns = isCompleted ? `<div style="display:flex; gap:8px; width:100%;"><button style="flex:1; background:#ff9500; color:white; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="toggleStatus(${reminder.id})">Undo</button><button style="flex:1; background:#ff3b30; color:white; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="deleteReminder(${reminder.id})">🗑️</button></div>` : `<div style="display:flex; gap:8px; width:100%; flex-wrap:wrap;"><button style="flex:1; background:#34c759; color:white; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="toggleStatus(${reminder.id})">Done</button><button style="flex:1; background:#007aff; color:white; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="editReminder(${reminder.id})">Edit</button><button style="flex:none; background:#ffcc00; color:black; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="togglePin(${reminder.id})">${reminder.pinned ? 'Unpin' : '⭐'}</button><button style="flex:none; background:#ff3b30; color:white; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="deleteReminder(${reminder.id})">🗑️</button></div>`;
        let completedDetailsHTML = isCompleted ? `<div style="margin-top:8px; display:inline-block; background:#e5f9e9; color:#34c759; padding:4px 8px; border-radius:8px; font-size:11px; font-weight:700;">✅ Done</div>` : `<div id="timer-${reminder.id}" style="margin-top:8px; display:inline-block; background:#f2f2f7; color:#1c1c1e; padding:4px 8px; border-radius:8px; font-size:11px; font-weight:700;">Loading...</div>`;
        li.innerHTML = `
            <div class="drag-handle" style="cursor:grab; font-size:20px; color:#aaa; margin-right:10px; padding-top:5px;">☰</div>
            ${pinnedBadge}
            <div style="flex-grow:1; width:calc(100% - 30px);">
                <div style="display:flex; flex-wrap:wrap;">${catHTML} ${repeatHTML} ${tagsHTML}</div>
                <h4 style="margin:5px 0; font-size:16px; color:#1c1c1e; font-weight:600; ${isCompleted?'text-decoration:line-through;':''}">${reminder.task}</h4>
                ${notesHTML} ${subHTML}
                <p style="font-size:12px; margin:5px 0 0 0; font-weight:600; color:#8e8e93;">📅 ${formattedTime}</p>
                ${completedDetailsHTML}
            </div>
            <div style="width:100%; margin-top:12px; display:flex; flex-direction:column; gap:8px;">${actionBtns}</div>`;
        reminderList.appendChild(li);
    });
    updateTimers();
    timerInterval = setInterval(updateTimers, 1000); initSortable();
}

function speakAlarm(taskText) { if (!voiceAlarmEnabled) return;
    if ('speechSynthesis' in window) { const synth = window.speechSynthesis; const utterThis = new SpeechSynthesisUtterance("Reminder! It is time to " + taskText);
    synth.speak(utterThis); } 
}
function updateTimers() {
    let reminders = JSON.parse(localStorage.getItem("reminders")) || []; const now = new Date().getTime(); let remsToSave = false;
    reminders.forEach(reminder => {
        if (reminder.status !== "completed") {
            const timerElement = document.getElementById(`timer-${reminder.id}`);
            if (timerElement) {
                const distance = new Date(reminder.time).getTime() - now; const preAlarmMillis = (reminder.preAlarm || 0) * 60000;
                if (distance <= preAlarmMillis) {
                    timerElement.innerHTML = "⏳ Time's up!"; timerElement.style.background = "#ffe5e5"; timerElement.style.color = "#ff3b30";
                    if (!reminder.notified) { playAlarm(); speakAlarm(reminder.task); reminder.notified = true; remsToSave = true; }
                } else {
                    const d = Math.floor(distance / 86400000), h = Math.floor((distance % 86400000) / 3600000), m = Math.floor((distance % 3600000) / 60000), s = Math.floor((distance % 60000) / 1000);
                    timerElement.innerHTML = `⏱️ Left: ${d>0?d+'d ':''}${h>0||d>0?h+'h ':''}${m}m ${s}s`;
                }
            }
        }
    });
    if (remsToSave) { localStorage.setItem("reminders", JSON.stringify(reminders)); loadReminders(); }
}

function generateNextRepeatTask(oldTask) {
    let newTime = new Date(oldTask.time);
    if ((oldTask.repeat === 'custom' || oldTask.repeat === 'hourly') && oldTask.customRepeat) {
        const val = parseInt(oldTask.customRepeat.interval);
        if(oldTask.customRepeat.type === 'hours') newTime.setHours(newTime.getHours() + val); if(oldTask.customRepeat.type === 'days') newTime.setDate(newTime.getDate() + val); if(oldTask.customRepeat.type === 'weeks') newTime.setDate(newTime.getDate() + (val*7));
        if(oldTask.customRepeat.type === 'months') newTime.setMonth(newTime.getMonth() + val);
    } else {
        if (oldTask.repeat === 'daily') newTime.setDate(newTime.getDate() + 1);
        if (oldTask.repeat === 'weekly') newTime.setDate(newTime.getDate() + 7); if (oldTask.repeat === 'monthly') newTime.setMonth(newTime.getMonth() + 1);
        if (oldTask.repeat === 'yearly') newTime.setFullYear(newTime.getFullYear() + 1);
    }
    const tzoffset = newTime.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(newTime - tzoffset)).toISOString().slice(0, 16);
    let reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    reminders.push({ ...oldTask, id: Date.now(), time: localISOTime, pinned: false, status: "pending", notified: false }); localStorage.setItem("reminders", JSON.stringify(reminders));
}

function fireConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    const ctx = canvas.getContext('2d'); canvas.width = window.innerWidth; canvas.height = window.innerHeight; let particles = [];
    for(let i=0; i<100; i++) { particles.push({ x: canvas.width/2, y: canvas.height/2, vx: (Math.random()-0.5)*20, vy: (Math.random()-0.5)*20 - 5, color: `hsl(${Math.random()*360}, 100%, 50%)`, size: Math.random()*8+2 }); }
    function animate() { ctx.clearRect(0,0, canvas.width, canvas.height);
    particles.forEach((p, i) => { p.x += p.vx; p.y += p.vy; p.vy += 0.5; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill(); if(p.y > canvas.height) particles.splice(i, 1); });
    if(particles.length > 0) requestAnimationFrame(animate); else ctx.clearRect(0,0, canvas.width, canvas.height); } 
    animate();
}

function toggleStatus(id) {
    let reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    let taskToRepeat = null;
    reminders = reminders.map(r => {
        if (r.id === id) { 
            if (r.status === "pending") { r.status = "completed"; r.completedBy = userName || "User"; r.completedAt = new Date().toISOString(); showToast("Done!", "success"); fireConfetti(); if (r.repeat && r.repeat !== "none") taskToRepeat = r; } else { r.status = "pending"; r.notified = false; delete r.completedBy; delete r.completedAt; showToast("Restored.", "info"); } 
        } return r;
    });
    localStorage.setItem("reminders", JSON.stringify(reminders)); if (taskToRepeat) generateNextRepeatTask(taskToRepeat); searchReminders(); syncToCloud();
}

function playAlarm() { new Audio(userAlarmSound).play().catch(e => console.log(e)); if (navigator.vibrate) { navigator.vibrate([1000, 500, 1000, 500, 1000]); } }

function deleteReminder(id) { 
    let r = JSON.parse(localStorage.getItem("reminders"))||[];
    deletedTaskTemp = r.find(x => x.id === id); localStorage.setItem("reminders", JSON.stringify(r.filter(x => x.id !== id))); searchReminders(); syncToCloud(); 
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div"); toast.className = `toast error`; toast.innerHTML = `<span>🗑️ Deleted</span> <button onclick="undoDelete()" style="background:white; color:black; border:none; padding:4px 8px; border-radius:8px; cursor:pointer; font-weight:700; margin-left:10px;">UNDO</button>`;
    container.appendChild(toast); 
    clearTimeout(deleteTimeout); deleteTimeout = setTimeout(() => { if(toast) toast.remove(); deletedTaskTemp = null; }, 5000);
}

function undoDelete() { if(deletedTaskTemp) { let r = JSON.parse(localStorage.getItem("reminders"))||[]; r.push(deletedTaskTemp); localStorage.setItem("reminders", JSON.stringify(r));
    deletedTaskTemp = null; document.querySelectorAll('.toast.error').forEach(t => t.remove()); showToast("Restored! ♻️", "success"); searchReminders(); syncToCloud();
} }

// --- Export / Import ---
function shareAppURL() { const data = encodeURIComponent(btoa(JSON.stringify({ t: "Master App", n: "Sync life." })));
    const url = window.location.origin + window.location.pathname + "?share=" + data; navigator.clipboard.writeText(url).then(() => showToast("Link Copied!", "success"));
}
function exportToCSV() {
    const reminders = JSON.parse(localStorage.getItem("reminders")) || [];
    if(reminders.length === 0) return showToast("No data", "error");
    let csvContent = "data:text/csv;charset=utf-8,Title,Notes,Date & Time,Priority,Status,Category,Repeat\n";
    reminders.forEach(r => { const title = `"${(r.task || "").replace(/"/g, '""')}"`; const notes = `"${((r.notes||"").replace(/(<([^>]+)>)/gi, "")).replace(/\"/g, '""')}"`; csvContent += `${title},${notes},${r.time},${r.priority || "medium"},${r.status},${r.category ? r.category.name : "Task"},${r.repeat || "none"}\n`; });
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", "My_Tasks.csv"); document.body.appendChild(link); link.click(); link.remove(); showToast("Exported!", "success");
}
function importDataFile(event) {
    const file = event.target.files[0];
    if (!file) return; const reader = new FileReader();
    reader.onload = function(e) { try { const data = JSON.parse(e.target.result);
    if(data.reminders) { localStorage.setItem("reminders", JSON.stringify(data.reminders)); if(data.habits) localStorage.setItem("habits", JSON.stringify(data.habits)); showToast("Restored! Refreshing...", "success"); syncToCloud(); setTimeout(()=> location.reload(), 1500); } else { showToast("Invalid JSON", "error");
    } } catch (err) { showToast("JSON only", "error"); } }; reader.readAsText(file);
}

// --- Eisenhower Matrix ---
function openMatrixModal() {
    const rems = JSON.parse(localStorage.getItem("reminders")) || []; const pending = rems.filter(r => r.status === 'pending'); const today = getTodayStr(); let q1="", q2="", q3="", q4="";
    pending.forEach(r => {
        const isUrgent = r.time.split('T')[0] <= today; const isImportant = r.priority === 'high';
        const taskHtml = `<div style="font-size:12px; background:white; padding:8px; border-radius:8px; margin-bottom:6px; cursor:pointer;" onclick="editReminder(${r.id}); closeModal('matrixModal')">👉 ${r.task}</div>`;
        if(isUrgent && isImportant) q1 += taskHtml; else if(!isUrgent && isImportant) q2 += taskHtml; else if(isUrgent && !isImportant) q3 += taskHtml; else q4 += taskHtml;
    });
    document.getElementById("q1Tasks").innerHTML = q1 || "<p style='font-size:11px; text-align:center; color:#8e8e93;'>Clear!</p>"; document.getElementById("q2Tasks").innerHTML = q2 || "<p style='font-size:11px; text-align:center; color:#8e8e93;'>Clear!</p>"; document.getElementById("q3Tasks").innerHTML = q3 || "<p style='font-size:11px; text-align:center; color:#8e8e93;'>Clear!</p>"; document.getElementById("q4Tasks").innerHTML = q4 || "<p style='font-size:11px; text-align:center; color:#8e8e93;'>Clear!</p>"; openModal('matrixModal');
}

// --- GAMIFICATION STORE ---
function openStore() {
    const completedTasks = JSON.parse(localStorage.getItem("reminders") || "[]").filter(r => r.status === "completed").length;
    const habitXP = parseInt(localStorage.getItem("habitXP_tasks") || "0"); const spentXP = parseInt(localStorage.getItem("spentXP") || "0");
    const availableXP = ((completedTasks + habitXP) * 10) - spentXP; document.getElementById("storeXpDisplay").innerText = availableXP > 0 ? availableXP : 0; openModal('storeModal');
}
function buyReward(itemId, cost) {
    const completedTasks = JSON.parse(localStorage.getItem("reminders") || "[]").filter(r => r.status === "completed").length;
    const habitXP = parseInt(localStorage.getItem("habitXP_tasks") || "0"); let spentXP = parseInt(localStorage.getItem("spentXP") || "0");
    const totalAvailableXP = ((completedTasks + habitXP) * 10) - spentXP; let unlockedItems = JSON.parse(localStorage.getItem("unlockedItems")) || [];
    if(unlockedItems.includes(itemId)) { return showToast("You already own this! 🎉", "info"); }
    if(totalAvailableXP >= cost) {
        unlockedItems.push(itemId);
        localStorage.setItem("unlockedItems", JSON.stringify(unlockedItems)); localStorage.setItem("spentXP", spentXP + cost); showToast("Reward Unlocked! 🎁", "success");
        if(itemId === 'neon_theme') { setThemeColor('#bf5af2', '#9d4ed6', '#1c1c1e', '#2c2c2e'); if(!document.body.classList.contains("dark-mode")) toggleTheme();
        } else if(itemId === 'vip_crown') { if(!userName.includes("👑")) { userName = "👑 " + userName; document.getElementById("profileNameInput").value = userName; saveProfileSettings();
        } } openStore(); syncToCloud();
    } else { showToast(`Not enough XP! Need ${cost - totalAvailableXP} more.`, "error"); }
}

// --- SHARED STUDY/PROJECT TEMPLATES ---
function shareCustomTemplate() {
    const select = document.getElementById("quickTemplateSelect");
    const val = select.value;
    if(!val.startsWith("custom_")) return showToast("Please select a Custom Template to share!", "error");
    const index = parseInt(val.split("_")[1]);
    const temps = JSON.parse(localStorage.getItem("customTemplates")) || []; const templateData = temps[index];
    if(templateData) {
        const dataStr = encodeURIComponent(btoa(JSON.stringify({ type: 'template', data: templateData })));
        const shareUrl = window.location.origin + window.location.pathname + "?importTemplate=" + dataStr;
        navigator.clipboard.writeText(shareUrl).then(() => { showToast("Template Link Copied! 🔗 Send it to friends.", "success"); });
    }
}
window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search); const importData = params.get('importTemplate');
    if(importData) {
        setTimeout(() => {
            try {
                const decoded = JSON.parse(atob(decodeURIComponent(importData)));
                if(decoded.type === 'template' && decoded.data) {
                    let temps = JSON.parse(localStorage.getItem("customTemplates")) || []; temps.push(decoded.data); localStorage.setItem("customTemplates", JSON.stringify(temps));
                    renderCustomTemplates(); showToast("Study Template Imported Successfully! ✅", "success"); window.history.replaceState({}, document.title, window.location.pathname);
                }
            } catch(e) { showToast("Invalid Template Link", "error"); }
        }, 2000); 
    }
});
