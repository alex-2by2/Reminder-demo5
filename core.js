// --- Core Utility Dates ---
function getTodayStr() { const today = new Date(); return (new Date(today - today.getTimezoneOffset() * 60000)).toISOString().split('T')[0]; }
function getYesterdayStr() { const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); return (new Date(yesterday - yesterday.getTimezoneOffset() * 60000)).toISOString().split('T')[0]; }

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
function deleteHabit(id) { let habits = JSON.parse(localStorage.getItem("habits"))||[]; localStorage.setItem("habits", JSON.stringify(habits.filter(h => h.id !== id))); showToast("Deleted.", "error"); loadHabits(); syncToCloud(); }
function loadHabits() {
    const habitList = document.getElementById("habitList"); habitList.innerHTML = ""; const habits = JSON.parse(localStorage.getItem("habits"))||[]; const todayStr = getTodayStr();
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
    } else { reminders.push({ id: Date.now(), task, notes, image, audio, isDoc, pinned: false, time, repeat, customRepeat, priority, tags, subtasks, category: aiCategory, status: "pending", notified: false, preAlarm, assignee }); showToast(`Saved!`, "success"); }
    localStorage.setItem("reminders", JSON.stringify(reminders)); localStorage.removeItem("taskDraft"); loadReminders(); syncToCloud();
}

function editReminder(id) {
    const reminder = (JSON.parse(localStorage.getItem("reminders")) || []).find(r => r.id === id);
    if (reminder) {
        document.getElementById("taskInput").value = reminder.task; document.getElementById("notesInput").innerHTML = reminder.notes || ""; document.getElementById("timeInput").value = reminder.time; document.getElementById("repeatInput").value = reminder.repeat || "none"; document.getElementById("priorityInput").value = reminder.priority || "medium";
        document.getElementById("tagsInput").value = reminder.tags || ""; document.getElementById("preAlarmInput").value = reminder.preAlarm || "0"; document.getElementById("assigneeInput").value = reminder.assignee || "";
        document.getElementById("subtasksContainer").innerHTML = ""; if(reminder.subtasks) reminder.subtasks.forEach(sub => addSubtaskField(sub.text, sub.done));
        if((reminder.repeat === 'custom' || reminder.repeat === 'hourly') && reminder.customRepeat) { document.getElementById("customRepeatUI").style.display = "block"; document.getElementById("customRepeatInterval").value = reminder.customRepeat.interval; document.getElementById("customRepeatType").value = reminder.customRepeat.type; } else { document.getElementById("customRepeatUI").style.display = "none"; }
        if(reminder.image) { currentImageBase64 = reminder.image; isDoc = reminder.isDoc; document.getElementById("imagePreviewContainer").style.display = "block"; if(isDoc) { document.getElementById("imagePreview").style.display = "none"; document.getElementById("docPreview").style.display = "block"; } else { document.getElementById("imagePreview").src = currentImageBase64; document.getElementById("imagePreview").style.display = "block"; document.getElementById("docPreview").style.display = "none"; } } else { removeImage(); }
        if(reminder.audio) { voiceMemoBase64 = reminder.audio; document.getElementById("voiceMemoAudio").src = voiceMemoBase64; document.getElementById("voiceMemoPreviewContainer").style.display = "flex"; } else { removeVoiceMemo(); }
        editId = id; document.getElementById("modalTitle").innerText = "Edit Task"; document.getElementById("submitBtn").innerText = "Update Task"; switchPage('add'); 
    }
}
function togglePin(id) { let reminders = JSON.parse(localStorage.getItem("reminders")) || []; reminders = reminders.map(r => { if(r.id === id) r.pinned = !r.pinned; return r; }); localStorage.setItem("reminders", JSON.stringify(reminders)); loadReminders(); syncToCloud(); }

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
        const tomorrow = new Date(); tomorrow.setHours(0,0,0,0); tomorrow.setDate(tomorrow.getDate() + 1);
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
    updateTimers(); timerInterval = setInterval(updateTimers, 1000); initSortable();
}

function toggleStatus(id) {
    let reminders = JSON.parse(localStorage.getItem("reminders")) || []; let taskToRepeat = null;
    reminders = reminders.map(r => {
        if (r.id === id) { 
            if (r.status === "pending") { r.status = "completed"; r.completedBy = userName || "User"; r.completedAt = new Date().toISOString(); showToast("Done!", "success"); fireConfetti(); if (r.repeat && r.repeat !== "none") taskToRepeat = r; } else { r.status = "pending"; r.notified = false; delete r.completedBy; delete r.completedAt; showToast("Restored.", "info"); } 
        } return r;
    });
    localStorage.setItem("reminders", JSON.stringify(reminders)); if (taskToRepeat) generateNextRepeatTask(taskToRepeat); searchReminders(); syncToCloud();
}
function deleteReminder(id) { 
    let r = JSON.parse(localStorage.getItem("reminders"))||[]; deletedTaskTemp = r.find(x => x.id === id); localStorage.setItem("reminders", JSON.stringify(r.filter(x => x.id !== id))); searchReminders(); syncToCloud(); 
    const container = document.getElementById("toastContainer"); const toast = document.createElement("div"); toast.className = `toast error`; toast.innerHTML = `<span>🗑️ Deleted</span> <button onclick="undoDelete()" style="background:white; color:black; border:none; padding:4px 8px; border-radius:8px; cursor:pointer; font-weight:700; margin-left:10px;">UNDO</button>`; container.appendChild(toast); 
    clearTimeout(deleteTimeout); deleteTimeout = setTimeout(() => { if(toast) toast.remove(); deletedTaskTemp = null; }, 5000);
}
function undoDelete() { if(deletedTaskTemp) { let r = JSON.parse(localStorage.getItem("reminders"))||[]; r.push(deletedTaskTemp); localStorage.setItem("reminders", JSON.stringify(r)); deletedTaskTemp = null; document.querySelectorAll('.toast.error').forEach(t => t.remove()); showToast("Restored! ♻️", "success"); searchReminders(); syncToCloud(); } }

function initSortable() {
    const el = document.getElementById('reminderList'); if(window.sortableInst) window.sortableInst.destroy();
    window.sortableInst = new Sortable(el, { handle: '.drag-handle', animation: 200, delay: 150, delayOnTouchOnly: true, onEnd: function () {
        const sortType = document.getElementById("sortInput").value; if(sortType !== "manual") { showToast("Switch to 'Custom Order' to save!", "error"); loadReminders(); return; }
        const listItems = document.querySelectorAll('#reminderList .reminder-item'); let newOrderIds = []; listItems.forEach(li => newOrderIds.push(Number(li.getAttribute('data-id'))));
        let oldRems = JSON.parse(localStorage.getItem("reminders")) || []; let sortedRems = []; newOrderIds.forEach(id => { const r = oldRems.find(x => x.id === id); if(r) sortedRems.push(r); });
        const filteredOut = oldRems.filter(x => !newOrderIds.includes(x.id)); sortedRems = sortedRems.concat(filteredOut); localStorage.setItem("reminders", JSON.stringify(sortedRems)); syncToCloud();
    } });
}

function cleanupOldTasks() {
    let reminders = JSON.parse(localStorage.getItem("reminders")) || []; const thirtyDaysInMillis = 30 * 24 * 60 * 60 * 1000; const now = new Date().getTime(); let originalLength = reminders.length;
    reminders = reminders.filter(r => { if (r.status !== "completed") return true; const timeToCheck = r.completedAt ? new Date(r.completedAt).getTime() : new Date(r.time).getTime(); return (now - timeToCheck) < thirtyDaysInMillis; });
    if (reminders.length < originalLength) { localStorage.setItem("reminders", JSON.stringify(reminders)); syncToCloud(); }
}
