// Push notifications, Projects/Folders, Mood tracker, Google Calendar (.ics) export, Family task sharing, snooze, font size, Sleep tracker, Task archive, bulk actions, Webhook integration, Google Calendar 2-way sync.

    // FEATURE 1: PUSH NOTIFICATIONS
    // ============================================================
    function requestNotificationPermission() {
        if (!('Notification' in window)) {
            return showToast('Browser does not support notifications', 'error');
        }
        window.Permissions.requestNotifications().then(granted => {
            if (granted) {
                localStorage.setItem('pushNotif', 'true');
                const btn = document.getElementById('notifBtn');
                if (btn) { btn.innerText = '✅ On'; btn.style.background = '#34c759'; }
                new Notification('Master App', { body: 'Notifications are now active! ✅' });
                showToast('Push Notifications Enabled!', 'success');
            } else {
                localStorage.setItem('pushNotif', 'false');
                showToast('Notification permission denied', 'error');
            }
        });
    }
    // Alias so Settings button works
    const requestPushNotification = requestNotificationPermission;

    function showPushNotification(title, body) {
        if (Notification.permission === 'granted' && localStorage.getItem('pushNotif') === 'true') {
            const n = new Notification('⏰ ' + title, {
                body: body || 'Time to complete this task!',
                requireInteraction: true,
                tag: 'reminder-' + title
            });
            n.onclick = function() { window.focus(); n.close(); };
            // Persistent: stays until user dismisses/clicks (no auto-close)
        }
    }

    // Init notification button state on load
    document.addEventListener('DOMContentLoaded', () => {
        if (localStorage.getItem('pushNotif') === 'true' && Notification.permission === 'granted') {
            const btn = document.getElementById('notifBtn');
            if (btn) { btn.innerText = '✅ On'; btn.style.background = '#34c759'; }
        }
        applyCalendarColors();
    });

    // ============================================================
    // FEATURE 2: PROJECTS / FOLDERS
    // ============================================================
    let activeProjectFilter = '';

    function openProjectsModal() {
        renderProjectsList();
        openModal('projectsModal');
    }

    function addProject() {
        const nameEl = document.getElementById('newProjectName');
        const name = nameEl.value.trim();
        if (!name) return showToast('Enter project name!', 'error');
        const emojiEl = document.getElementById('newProjectEmoji');
        const colorEl = document.getElementById('newProjectColor');
        const projects = safeStorage('projects', []);
        projects.push({
            id: Date.now(),
            name,
            color: colorEl.value || '#007aff',
            emoji: emojiEl.value || '📁',
            milestones: []
        });
        localStorage.setItem('projects', JSON.stringify(projects));
        nameEl.value = ''; emojiEl.value = '';
        renderProjectsList();
        renderProjectFilter();
        renderProjectDropdown();
        syncToCloud();
        showToast('Project added! 📁', 'success');
    }

    function deleteProject(id) {
        let projects = safeStorage('projects', []);
        projects = projects.filter(p => p.id !== id);
        localStorage.setItem('projects', JSON.stringify(projects));
        renderProjectsList();
        renderProjectFilter();
        renderProjectDropdown();
        syncToCloud();
        showToast('Project deleted.', 'error');
    }

    function renderProjectsList() {
        const container = document.getElementById('projectsListContainer');
        if (!container) return;
        const projects = safeStorage('projects', []);
        if (projects.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#8e8e93; font-size:13px; padding:15px;">No projects yet. Add one above!</p>';
            return;
        }
        const reminders = safeStorage('reminders', []);
        container.innerHTML = projects.map(p => {
            const tasks = reminders.filter(r => String(r.project) === String(p.id) && !r.archived);
            const completed = tasks.filter(r => r.status === 'completed').length;
            const pct = tasks.length > 0 ? Math.round((completed/tasks.length)*100) : 0;
            return `
            <div style="background:#f2f2f7; padding:12px 14px; border-radius:12px; margin-bottom:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:10px; cursor:pointer; flex:1;" onclick="openProjectDetail(${p.id})">
                        <div style="width:10px; height:10px; border-radius:50%; background:${p.color}; flex-shrink:0;"></div>
                        <span style="font-size:18px;">${p.emoji}</span>
                        <span style="font-weight:600; font-size:14px;">${sanitizeHTML(p.name||'')}</span>
                    </div>
                    <button onclick="deleteProject(${p.id})" style="background:#ffe5e5; color:#ff3b30; border:none; border-radius:8px; padding:6px 10px; cursor:pointer; font-size:13px;">🗑️</button>
                </div>
                <div class="project-progress-track"><div class="project-progress-fill" style="width:${pct}%; background:${p.color};"></div></div>
                <p style="margin:5px 0 0; font-size:11px; color:#8e8e93;">${completed}/${tasks.length} tasks · ${pct}% · tap for details 👆</p>
            </div>
        `;
        }).join('');
    }

    function renderProjectFilter() {
        const container = document.getElementById('projectFilterContainer');
        if (!container) return;
        const projects = safeStorage('projects', []);
        if (projects.length === 0) { container.innerHTML = ''; return; }
        let html = `<button class="template-chip ${activeProjectFilter === '' ? 'active' : ''}" onclick="filterByProject('')">📋 All</button>`;
        projects.forEach(p => {
            const isActive = String(activeProjectFilter) === String(p.id);
            html += `<button class="template-chip ${isActive ? 'active' : ''}" onclick="filterByProject(${p.id})">${sanitizeHTML(p.emoji||'')} ${sanitizeHTML(p.name||'')}</button>`;
        });
        container.innerHTML = html;
    }

    function filterByProject(projectId) {
        activeProjectFilter = projectId;
        renderProjectFilter();
        loadReminders();
    }

    function renderProjectDropdown() {
        const select = document.getElementById('taskProjectInput');
        if (!select) return;
        const projects = safeStorage('projects', []);
        let html = '<option value="">📋 No Project</option>';
        projects.forEach(p => {
            html += `<option value="${p.id}">${sanitizeHTML(p.emoji||'')} ${sanitizeHTML(p.name||'')}</option>`;
        });
        select.innerHTML = html;
    }

    // ============================================================
    // FEATURE 3: MOOD TRACKER
    // ============================================================
    const moodData = [
        { emoji: '😄', label: 'Great', color: '#34c759' },
        { emoji: '😊', label: 'Good',  color: '#30d158' },
        { emoji: '😐', label: 'Okay',  color: '#ff9500' },
        { emoji: '😔', label: 'Sad',   color: '#5e5ce6' },
        { emoji: '😢', label: 'Bad',   color: '#ff3b30' }
    ];

    function logMood(moodIndex) {
        const todayStr = getTodayStr();
        const moodLog = safeStorage('moodLog', {});
        moodLog[todayStr] = moodIndex;
        localStorage.setItem('moodLog', JSON.stringify(moodLog));
        renderMoodTracker();
        syncToCloud();
        showToast(`Mood logged: ${moodData[moodIndex].emoji} ${moodData[moodIndex].label}`, 'success');
    }

    function renderMoodTracker() {
        const container = document.getElementById('moodTrackerCard');
        if (!container) return;
        const todayStr = getTodayStr();
        const moodLog = safeStorage('moodLog', {});
        const todayMood = moodLog[todayStr] !== undefined ? moodLog[todayStr] : -1;
        const last7 = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });
        const historyHtml = last7.map(date => {
            const idx = moodLog[date];
            return `<span style="font-size:20px;" title="${date}">${idx !== undefined ? moodData[idx].emoji : '⬜'}</span>`;
        }).join('');
        const moodBtnsHtml = moodData.map((m, i) => `
            <button onclick="logMood(${i})" class="mood-emoji-btn ${todayMood === i ? 'selected' : ''}"
                    title="${m.label}" style="${todayMood === i ? `border-color:${m.color}; background:${m.color}22;` : ''}">
                ${m.emoji}
            </button>
        `).join('');
        container.innerHTML = `
            <h5 style="margin:0 0 10px 0; color:#8e8e93; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
                😊 TODAY'S MOOD ${todayMood >= 0 ? '— ' + moodData[todayMood].label : ''}
            </h5>
            <div class="mood-emojis">${moodBtnsHtml}</div>
            <div style="border-top:1px solid #f2f2f7; margin-top:10px; padding-top:10px;">
                <p style="font-size:11px; color:#8e8e93; margin:0 0 6px 0; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Last 7 days</p>
                <div class="mood-history">${historyHtml}</div>
            </div>
        `;
    }

    // ============================================================
    // FEATURE 4: GOOGLE CALENDAR EXPORT (.ICS)
    // ============================================================
    function exportToGoogleCalendar() {
        const reminders = safeStorage('reminders', []);
        const pending = reminders.filter(r => r.status !== 'completed' && r.time);
        if (pending.length === 0) return showToast('No pending tasks to export!', 'error');
        const fmt = (d) => d.toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z';
        let ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Master Reminder App//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
        pending.forEach(r => {
            const start = new Date(r.time);
            const end   = new Date(start.getTime() + 3600000);
            const desc  = (r.notes || '').replace(/<[^>]*>/g,'').replace(/,/g,'\\,').replace(/\n/g,'\\n');
            const title = (r.task || 'Task').replace(/,/g,'\\,');
            const prio  = r.priority === 'high' ? '1' : r.priority === 'low' ? '9' : '5';
            ics.push('BEGIN:VEVENT',`UID:${r.id}@masterapp`,`DTSTAMP:${fmt(new Date())}`,
                `DTSTART:${fmt(start)}`,`DTEND:${fmt(end)}`,`SUMMARY:${title}`,
                `DESCRIPTION:${desc}`,`PRIORITY:${prio}`,
                `CATEGORIES:${r.category ? r.category.name : 'Task'}`,'END:VEVENT');
        });
        ics.push('END:VCALENDAR');
        const blob = new Blob([ics.join('\r\n')], { type:'text/calendar;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = 'MasterApp_Tasks.ics';
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        showToast(`📅 ${pending.length} tasks exported! Import .ics into Google Calendar.`, 'success');
    }

    // ============================================================
    // FEATURE 5: FAMILY TASK SHARING (Firebase)
    // ============================================================
    let sharedTaskIdToShare = null;

    function openShareModal(taskId) {
        sharedTaskIdToShare = taskId;
        const r = (safeStorage('reminders', [])).find(x => x.id === taskId);
        const shareTaskTitleEl = document.getElementById('shareTaskTitle');
        if (r && shareTaskTitleEl) {
            shareTaskTitleEl.innerText = '📤 Share: ' + r.task;
        }
        const shareEmailInput = document.getElementById('shareEmailInput');
        if (shareEmailInput) shareEmailInput.value = '';
        openModal('shareTaskModal');
    }

    async function shareTaskWithFamily() {
        if (!currentUser) return showToast('Login required!', 'error');
        const emailInput = document.getElementById('shareEmailInput');
        const email = emailInput?.value.trim().toLowerCase() || '';
        if (!email || !email.includes('@')) return showToast('Enter valid email!', 'error');
        const r = (safeStorage('reminders', [])).find(x => x.id === sharedTaskIdToShare);
        if (!r) return;
        showToast('Sharing...', 'info');
        try {
            await db.collection('shared_tasks').add({
                fromUid:   currentUser.uid,
                fromName:  userName || currentUser.email,
                toEmail:   email,
                task:      r.task,
                notes:     r.notes || '',
                time:      r.time,
                priority:  r.priority || 'medium',
                category:  r.category || null,
                sharedAt:  new Date().toISOString(),
                status:    'pending'
            });
            closeModal('shareTaskModal');
            showToast(`✅ Shared with ${email}!`, 'success');
        } catch(e) { showToast('Share error: ' + e.message, 'error'); }
    }

    async function openSharedModal() {
        openModal('sharedWithMeModal');
        loadSharedWithMe();
    }

    async function loadSharedWithMe() {
        if (!currentUser) return;
        const container = document.getElementById('sharedTasksContainer');
        if (!container) return;
        container.innerHTML = '<p style="text-align:center; color:#8e8e93; font-size:13px; padding:20px;">Loading...</p>';
        try {
            const snap = await db.collection('shared_tasks')
                .where('toEmail', '==', currentUser.email.toLowerCase())
                .where('status',  '==', 'pending')
                .get();
            const badge = document.getElementById('sharedBadge');
            if (!snap.empty && badge) { badge.style.display='flex'; badge.innerText = snap.size; }
            else if (badge) { badge.style.display = 'none'; }
            if (snap.empty) {
                container.innerHTML = '<p style="text-align:center; color:#8e8e93; font-size:13px; padding:20px;">No shared tasks 📭</p>';
                return;
            }
            let html = '';
            snap.forEach(doc => {
                const t = doc.data();
                const date = new Date(t.time).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
                const prioColor = t.priority==='high'?'#ff3b30':t.priority==='low'?'#34c759':'#ff9500';
                html += `
                    <div style="background:#f2f2f7; border-radius:14px; padding:14px; margin-bottom:10px; border-left:4px solid ${prioColor};">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                            <div style="flex:1;">
                                <h4 style="margin:0 0 4px; font-size:15px;">${sanitizeHTML(t.task||'')}</h4>
                                <p style="margin:0; font-size:12px; color:#8e8e93;">📅 ${date}</p>
                                <p style="margin:4px 0 0; font-size:12px; color:var(--primary); font-weight:600;">From: ${sanitizeHTML(t.fromName||'')}</p>
                                ${t.notes ? `<p style="margin:6px 0 0; font-size:12px; color:#666; background:white; padding:8px; border-radius:8px;">${sanitizeHTML(t.notes)}</p>` : ''}
                            </div>
                            <button onclick="acceptSharedTask('${doc.id}')" style="background:#34c759; color:white; border:none; border-radius:10px; padding:8px 14px; font-weight:700; font-size:12px; cursor:pointer; white-space:nowrap; flex-shrink:0;">Add ✅</button>
                        </div>
                    </div>`;
            });
            container.innerHTML = html;
        } catch(e) {
            container.innerHTML = '<p style="text-align:center; color:#ff3b30; font-size:13px;">Error loading. Check Firestore rules.</p>';
        }
    }

    async function acceptSharedTask(docId) {
        try {
            const doc = await db.collection('shared_tasks').doc(docId).get();
            if (!doc.exists) return;
            const t = doc.data();
            let reminders = safeStorage('reminders', []);
            reminders.push({
                id: Date.now(), task: t.task, notes: t.notes || '', time: t.time,
                priority: t.priority || 'medium', category: t.category || {name:'Task',icon:'📝'},
                repeat: 'none', status: 'pending', notified: false, pinned: false,
                tags: 'shared', preAlarm: 0, assignee: t.fromName || '', project: ''
            });
            localStorage.setItem('reminders', JSON.stringify(reminders));
            await db.collection('shared_tasks').doc(docId).update({ status: 'accepted' });
            syncToCloud(); loadReminders(); loadSharedWithMe();
            showToast('Task added to your list! ✅', 'success');
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    }

    // ============================================================
    // BATCH 2 — SNOOZE
    // ============================================================
    function snoozeTask(id, minutes) {
        let reminders = safeStorage("reminders", []);
        const idx = reminders.findIndex(r => r.id === id);
        if (idx === -1) return;
        const d = new Date(new Date(reminders[idx].time).getTime() + minutes * 60000);
        const pad = n => String(n).padStart(2, '0');
        reminders[idx].time = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        reminders[idx].notified = false;
        localStorage.setItem("reminders", JSON.stringify(reminders));
        loadReminders();
        syncToCloud();
        showToast(`😴 Snoozed ${minutes} min`, "success");
    }

    // ============================================================
    // BATCH 2 — FONT SIZE
    // ============================================================
    function setFontSize(size, sync = true) {
        const zoomMap = { small: '0.9', medium: '1', large: '1.15' };
        const mainAppEl = document.getElementById('mainApp');
        if (mainAppEl) mainAppEl.style.zoom = zoomMap[size] || '1';
        localStorage.setItem('appFontSize', size);
        document.querySelectorAll('.font-size-btn').forEach(b => b.classList.remove('active-font'));
        const btn = document.getElementById('fontBtn-' + size);
        if (btn) btn.classList.add('active-font');
        if (sync) { syncToCloud(); showToast('Font size updated!', 'success'); }
    }

    // ============================================================
    // BATCH 2 — SLEEP TRACKER
    // ============================================================
    function logSleep() {
        const hoursInput = document.getElementById('sleepHoursInput');
        const hours = parseFloat(hoursInput.value);
        if (isNaN(hours) || hours < 0 || hours > 16) return showToast('Enter valid hours (0-16)', 'error');
        const todayStr = getTodayStr();
        const sleepLog = safeStorage('sleepLog', {});
        sleepLog[todayStr] = hours;
        localStorage.setItem('sleepLog', JSON.stringify(sleepLog));
        renderSleepTracker();
        syncToCloud();
        showToast(`😴 Logged ${hours}h sleep`, 'success');
    }

    function renderSleepTracker() {
        const container = document.getElementById('sleepHistoryBars');
        if (!container) return;
        const sleepLog = safeStorage('sleepLog', {});
        const last7 = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });
        const maxH = 10;
        container.innerHTML = last7.map(date => {
            const h = sleepLog[date] || 0;
            const pct = Math.min(100, (h / maxH) * 100);
            const color = h === 0 ? '#e5e5ea' : h < 6 ? '#ff9500' : '#34c759';
            return `<div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%;">
                        <div style="width:100%; max-width:18px; height:${Math.max(pct,4)}%; background:${color}; border-radius:4px;" title="${date}: ${h}h"></div>
                    </div>`;
        }).join('');
        const todayStr = getTodayStr();
        const hoursInput = document.getElementById('sleepHoursInput');
        if (hoursInput && sleepLog[todayStr] !== undefined) hoursInput.value = sleepLog[todayStr];
    }

    // ============================================================
    // BATCH 2 — TASK ARCHIVE
    // ============================================================
    function archiveTask(id) {
        let reminders = safeStorage('reminders', []);
        const idx = reminders.findIndex(r => r.id === id);
        if (idx === -1) return;
        reminders[idx].archived = true;
        localStorage.setItem('reminders', JSON.stringify(reminders));
        loadReminders();
        syncToCloud();
        showToast('Archived 📦', 'success');
    }

    function unarchiveTask(id) {
        let reminders = safeStorage('reminders', []);
        const idx = reminders.findIndex(r => r.id === id);
        if (idx === -1) return;
        reminders[idx].archived = false;
        localStorage.setItem('reminders', JSON.stringify(reminders));
        loadReminders();
        syncToCloud();
        showToast('Restored from archive 📤', 'success');
    }

    // ============================================================
    // BATCH 2 — BULK SELECT / ACTIONS
    // ============================================================
    let bulkMode = false;
    let selectedBulkIds = new Set();

    function toggleBulkMode() {
        bulkMode = !bulkMode;
        selectedBulkIds.clear();
        const bar = document.getElementById('bulkActionBar');
        const btn = document.getElementById('bulkToggleBtn');
        if (bulkMode) {
            bar.style.display = 'flex';
            btn.style.background = '#34c759';
            btn.style.color = 'white';
            btn.innerText = '☑️ Selecting...';
        } else {
            bar.style.display = 'none';
            btn.style.background = '';
            btn.style.color = '#34c759';
            btn.innerText = '☑️ Select';
        }
        updateBulkCount();
        loadReminders();
    }

    function toggleBulkSelect(id, checked) {
        if (checked) selectedBulkIds.add(id);
        else selectedBulkIds.delete(id);
        updateBulkCount();
    }

    function updateBulkCount() {
        const el = document.getElementById('bulkCountText');
        if (el) el.innerText = `${selectedBulkIds.size} selected`;
    }

    function bulkComplete() {
        if (selectedBulkIds.size === 0) return showToast('Select tasks first!', 'error');
        let reminders = safeStorage('reminders', []);
        reminders.forEach(r => { if (selectedBulkIds.has(r.id)) r.status = 'completed'; });
        localStorage.setItem('reminders', JSON.stringify(reminders));
        showToast(`${selectedBulkIds.size} tasks marked Done ✅`, 'success');
        toggleBulkMode();
        syncToCloud();
    }

    function bulkArchive() {
        if (selectedBulkIds.size === 0) return showToast('Select tasks first!', 'error');
        let reminders = safeStorage('reminders', []);
        reminders.forEach(r => { if (selectedBulkIds.has(r.id)) { r.archived = true; r.status = 'completed'; } });
        localStorage.setItem('reminders', JSON.stringify(reminders));
        showToast(`${selectedBulkIds.size} tasks archived 📦`, 'success');
        toggleBulkMode();
        syncToCloud();
    }

    function bulkDelete() {
        if (selectedBulkIds.size === 0) return showToast('Select tasks first!', 'error');
        if (!confirm(`Delete ${selectedBulkIds.size} tasks? This cannot be undone.`)) return;
        let reminders = safeStorage('reminders', []);
        reminders = reminders.filter(r => !selectedBulkIds.has(r.id));
        localStorage.setItem('reminders', JSON.stringify(reminders));
        showToast(`${selectedBulkIds.size} tasks deleted 🗑️`, 'error');
        toggleBulkMode();
        syncToCloud();
    }

    // ============================================================
    // BATCH 2 — WEBHOOK (WhatsApp/SMS via Zapier/Make/IFTTT)
    // ============================================================
    function sendWebhookNotification(reminder) {
        const url = (localStorage.getItem('webhookUrl') || '').trim();
        if (!url) return;
        const plainNotes = (reminder.notes || '').replace(/<[^>]*>/g, '');
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `⏰ Reminder: ${reminder.task}`,
                task: reminder.task,
                notes: plainNotes,
                time: reminder.time,
                priority: reminder.priority || 'medium'
            })
        }).catch(() => {});
    }

    // ============================================================
    // BATCH 2 — GOOGLE CALENDAR 2-WAY SYNC
    // ============================================================
    let gcalTokenClient = null;
    let gcalAccessToken = null;

    function loadGcalScripts(callback) {
        if (window.google && window.google.accounts) return callback();
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.onload = callback;
        s.onerror = () => showToast('Could not load Google script. Check internet.', 'error');
        document.head.appendChild(s);
    }

    function connectGoogleCalendar() {
        const clientIdInput = document.getElementById('gcalClientIdInput');
        const clientId = clientIdInput?.value.trim();
        if (!clientId) return showToast('Paste Google Client ID first!', 'error');
        localStorage.setItem('gcalClientId', clientId);
        loadGcalScripts(() => {
            gcalTokenClient = google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: 'https://www.googleapis.com/auth/calendar.events',
                callback: (resp) => {
                    if (resp.error) return showToast('Google auth error: ' + resp.error, 'error');
                    gcalAccessToken = resp.access_token;
                    document.getElementById('gcalStatusText').innerText = '✅ Connected! Tap "Sync Now" to sync.';
                    showToast('Google Calendar Connected! 🎉', 'success');
                    syncToCloud();
                }
            });
            gcalTokenClient.requestAccessToken();
        });
    }

    async function syncFromGoogleCalendar() {
        if (!gcalAccessToken) return showToast('Tap "Connect" first!', 'error');
        document.getElementById('gcalStatusText').innerText = '🔄 Syncing...';
        let reminders = safeStorage('reminders', []);
        let pushCount = 0, pullCount = 0;

        for (let r of reminders) {
            if (!r.gcalEventId && r.status !== 'completed' && !r.archived && r.time) {
                try {
                    const start = new Date(r.time);
                    const end = new Date(start.getTime() + 3600000);
                    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + gcalAccessToken, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            summary: r.task,
                            description: (r.notes||'').replace(/<[^>]*>/g,''),
                            start: { dateTime: start.toISOString() },
                            end: { dateTime: end.toISOString() }
                        })
                    });
                    const data = await res.json();
                    if (data.id) { r.gcalEventId = data.id; pushCount++; }
                } catch(e) {}
            }
        }

        try {
            const timeMin = new Date().toISOString();
            const timeMax = new Date(Date.now() + 30*86400000).toISOString();
            const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`, {
                headers: { 'Authorization': 'Bearer ' + gcalAccessToken }
            });
            const data = await res.json();
            const existingIds = new Set(reminders.map(r => r.gcalEventId).filter(Boolean));
            (data.items || []).forEach(ev => {
                if (existingIds.has(ev.id)) return;
                const startTime = ev.start.dateTime || (ev.start.date + 'T09:00');
                reminders.push({
                    id: Date.now() + Math.floor(Math.random()*1000),
                    task: ev.summary || 'Untitled Event',
                    notes: ev.description || '',
                    time: startTime.slice(0,16),
                    priority: 'medium',
                    repeat: 'none', status: 'pending', notified: false, pinned: false,
                    tags: 'gcal', preAlarm: 0, gcalEventId: ev.id, category: {name:'Calendar', icon:'📅'}
                });
                pullCount++;
            });
        } catch(e) {}

        localStorage.setItem('reminders', JSON.stringify(reminders));
        loadReminders();
        syncToCloud();
        document.getElementById('gcalStatusText').innerText = `✅ Synced! ${pushCount} sent, ${pullCount} imported.`;
        showToast(`Calendar Synced: ${pushCount} sent, ${pullCount} new 📅`, 'success');
    }

    function showGcalInstructions() {
        alert(
            "📅 Free Google Calendar Client ID Setup:\n\n" +
            "1. Go to console.cloud.google.com\n" +
            "2. Create a new Project\n" +
            "3. APIs & Services → Enable 'Google Calendar API'\n" +
            "4. OAuth consent screen → External → Add your email as Test User\n" +
            "5. Credentials → Create Credentials → OAuth Client ID → Web application\n" +
            "6. Add this app's URL under 'Authorized JavaScript origins'\n" +
            "7. Copy the Client ID and paste it above!\n\n" +
            "Free forever for personal use 🎉\n" +
            "Note: You'll need to tap 'Connect' once per session (token expires after ~1 hour)."
        );
    }

    // ============================================================
