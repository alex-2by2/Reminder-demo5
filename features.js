// --- Tools & Updates ---
function updateWater(val) { waterCount += val; if(waterCount < 0) waterCount = 0; document.getElementById("waterIntake").innerText = waterCount; if(val > 0 && waterCount === 8) showToast("Goal Reached! 🎉", "success"); syncToCloud(); }
function playAlarm() { new Audio(userAlarmSound).play().catch(e => console.log(e)); if (navigator.vibrate) { navigator.vibrate([1000, 500, 1000, 500, 1000]); } }
function speakAlarm(taskText) { if (!voiceAlarmEnabled) return; if ('speechSynthesis' in window) { const synth = window.speechSynthesis; const utterThis = new SpeechSynthesisUtterance("Reminder! It is time to " + taskText); synth.speak(utterThis); } }
function filterByTag(tag) { activeTagFilter = activeTagFilter === tag ? "" : tag; loadReminders(); }
function changeTab(tabName) { currentTab = tabName; document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active')); document.getElementById(`tab-${tabName}`).classList.add('active'); searchReminders(); }
function searchReminders() { loadReminders(document.getElementById("searchInput") ? document.getElementById("searchInput").value.toLowerCase() : ""); }

// --- App Lock ---
function enterPin(num) { if(currentEnteredPin.length < 4) { currentEnteredPin += num; document.getElementById("dot" + currentEnteredPin.length).style.background = "var(--primary)"; if(currentEnteredPin.length === 4) { setTimeout(() => { if(currentEnteredPin === appPinCode) { document.getElementById("pinScreen").style.display = "none"; checkMorningBriefing(); } else { showToast("Incorrect PIN!", "error"); clearPin(); } }, 200); } } }
function clearPin() { currentEnteredPin = ""; document.querySelectorAll(".pin-dot").forEach(d => d.style.background = "transparent"); }
function deletePin() { if(currentEnteredPin.length > 0) { document.getElementById("dot" + currentEnteredPin.length).style.background = "transparent"; currentEnteredPin = currentEnteredPin.slice(0, -1); } }
function toggleAppLockSetup() { const toggle = document.getElementById("appLockToggle"); if(toggle.checked) { const pin = prompt("Enter a 4-digit PIN for App Lock:"); if(pin && pin.length === 4 && !isNaN(pin)) { appPinCode = pin; localStorage.setItem("appPin", pin); showToast("App Lock Enabled!", "success"); } else { toggle.checked = false; showToast("Invalid PIN.", "error"); } } else { appPinCode = null; localStorage.removeItem("appPin"); showToast("App Lock Disabled", "info"); } }

// --- AI Features (Gemini Integration) ---
async function aiGenerateSubtasks() {
    const taskName = document.getElementById("taskInput").value.trim(); if(!taskName) return showToast("Enter Task Title first!", "error"); showToast("🪄 AI is planning...", "info");
    try {
        const prompt = `Break down the goal "${taskName}" into 3 to 4 short steps. Output ONLY a valid JSON array of strings. Example: ["Step 1", "Step 2"]`;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${FIXED_GEMINI_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
        const data = await response.json(); if(data.error) throw new Error(data.error.message);
        let text = data.candidates[0].content.parts[0].text; text = text.replace(/```json/g, "").replace(/```/g, "").trim(); JSON.parse(text).forEach(sub => addSubtaskField(sub, false)); showToast("🪄 Auto-Plan Complete!", "success");
    } catch(e) { showToast("AI Error: " + e.message, "error"); }
}
async function aiSuggestTime() { /* Similar Gemini logic */ }
async function generateAIReview() { /* Similar Gemini logic */ }

// --- Subtasks, Templates, Pomodoro, Calendar, Analytics & Import/Export (Insert all remaining functions here like openStore, renderChart, startPomo, handleImageUpload etc.) ---
function activatePro() { isProUser = true; localStorage.setItem("isPro", "true"); document.getElementById("proBadgeDisplay").style.display = "inline-flex"; closeModal('proModal'); showToast("🎉 Welcome to PRO!", "success"); }
function toggleMusicPanel() { const p = document.getElementById("musicPanel"); p.style.display = p.style.display === "block" ? "none" : "block"; }
function playFloatingAudio() { const src = document.getElementById("floatingSoundSelect").value; if(src === "none") { focusAudio.pause(); isMusicPlaying = false; return; } if(isMusicPlaying && focusAudio.src === src) { focusAudio.pause(); isMusicPlaying = false; } else { focusAudio.src = src; focusAudio.loop = true; focusAudio.play(); isMusicPlaying = true; } }
function checkMorningBriefing() { if(!currentUser) return; const today = getTodayStr(); if(localStorage.getItem('lastBriefingDate') !== today) { const reminders = JSON.parse(localStorage.getItem("reminders")) || []; const habits = JSON.parse(localStorage.getItem("habits")) || []; document.getElementById("briefingTaskCount").innerText = reminders.filter(r => r.status !== 'completed' && r.time.split('T')[0] === today).length; document.getElementById("briefingHabitCount").innerText = habits.filter(h => h.lastCheckIn !== today).length; openModal('briefingModal'); localStorage.setItem('lastBriefingDate', today); } }
function openLeaderboard() { openModal('leaderboardModal'); const cont = document.getElementById("leaderboardContainer"); cont.innerHTML = "<p style='text-align:center;'>Fetching...</p>"; db.collection("users").orderBy("habitXP_tasks", "desc").limit(10).get().then((querySnapshot) => { let html = ""; let rank = 1; querySnapshot.forEach((doc) => { const data = doc.data(); let trophy = rank === 1 ? "🥇" : (rank === 2 ? "🥈" : (rank === 3 ? "🥉" : "🏅")); html += `<div style="padding:12px; background:#ffffff; margin-bottom:8px; border-radius:12px; display:flex; justify-content:space-between; box-shadow:0 2px 4px rgba(0,0,0,0.02);"><span>${trophy} ${data.userName || "Unknown"}</span><span style="font-weight:700; color:var(--primary);">${(data.habitXP_tasks||0)*10} XP</span></div>`; rank++; }); cont.innerHTML = html || "<p>No data found.</p>"; }); }

// (Tame baki na jeva ke Pomodoro timer `startPomo`, attachments `handleImageUpload`, Matrix `openMatrixModal` aa file ma rakhi shako cho.)
