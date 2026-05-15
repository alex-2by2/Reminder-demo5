// --- Initialization & Listeners ---
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

// --- UI Helpers & Themes ---
function showToast(message, type = 'info') { 
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div"); toast.className = `toast ${type}`; let icon = type === "success" ? "✅" : (type === "error" ? "⚠️" : "💡"); toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`; container.appendChild(toast); setTimeout(() => toast.remove(), 3000);
}
function openModal(modalId) { document.getElementById(modalId).classList.add('active'); if(modalId === 'analyticsModal') setTimeout(renderChart, 100); }
function closeModal(modalId) { document.getElementById(modalId).classList.remove('active'); }
function toggleTheme() { const isDark = document.body.classList.toggle("dark-mode"); localStorage.setItem("darkMode", isDark); document.getElementById("themeToggleBtn").innerText = isDark ? "☀️" : "🌙"; }
function setThemeColor(p, ph, b1, b2, sync=true) { document.documentElement.style.setProperty('--primary', p); document.documentElement.style.setProperty('--primary-hover', ph); document.documentElement.style.setProperty('--bg-grad-1', b1); document.documentElement.style.setProperty('--bg-grad-2', b2);
    localStorage.setItem("appTheme", JSON.stringify({p, ph, b1, b2})); if(sync) { syncToCloud(); showToast("Theme saved!", "success"); } 
}
function applyTimeOfDayTheme() { if (localStorage.getItem("darkMode") === "true") { document.body.classList.add("dark-mode"); return; } const savedTheme = JSON.parse(localStorage.getItem("appTheme"));
    if(savedTheme) return; 
}
function saveProfileSettings() { userName = document.getElementById("profileNameInput").value.trim() || "User"; userAlarmSound = document.getElementById("alarmSoundInput").value; voiceAlarmEnabled = document.getElementById("voiceAlarmToggle").checked;
    const dGoal = parseInt(document.getElementById("dailyGoalInput").value) || 5; localStorage.setItem("dailyTaskGoal", dGoal); document.getElementById("displayUserName").innerText = userName; updateMiniDashboard(); syncToCloud(); showToast("Settings saved!", "success");
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
