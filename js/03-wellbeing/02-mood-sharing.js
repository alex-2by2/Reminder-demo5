// Mood tracker, Google Calendar (.ics) export, family task sharing (Firestore shared_tasks).
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".
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
    let shareMode = 'task'; // 'task' | 'grocery' — which flow opened the shared modal

    function openShareModal(taskId) {
        sharedTaskIdToShare = taskId;
        shareMode = 'task';
        const r = (safeStorage('reminders', [])).find(x => x.id === taskId);
        const shareTaskTitleEl = document.getElementById('shareTaskTitle');
        if (r && shareTaskTitleEl) {
            shareTaskTitleEl.innerText = '📤 Share: ' + r.task;
        }
        const shareEmailInput = document.getElementById('shareEmailInput');
        if (shareEmailInput) shareEmailInput.value = '';
        openModal('shareTaskModal');
    }

    function confirmShare() {
        const email = document.getElementById('shareEmailInput')?.value.trim();
        if (shareMode === 'grocery') {
            shareGroceryList(email).then(() => closeModal('shareTaskModal'));
        } else {
            shareTaskWithFamily();
        }
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
                container.innerHTML = emptyStateHTML('📭', 'No shared tasks');
                return;
            }
            let html = '';
            snap.forEach(doc => {
                const t = doc.data();
                const isGrocery = t.itemType === 'grocery';
                const date = new Date(t.time).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
                const prioColor = t.priority==='high'?'#ff3b30':t.priority==='low'?'#34c759':'#ff9500';
                let bodyHtml;
                if (isGrocery) {
                    let items = [];
                    try { items = JSON.parse(t.notes || '[]'); } catch (e) { items = []; }
                    bodyHtml = `<p style="margin:6px 0 0; font-size:12px; color:#666; background:white; padding:8px; border-radius:8px;">${items.map(i => sanitizeHTML(i.name) + (i.qty > 1 ? ' ×' + i.qty : '')).join(', ') || 'No items'}</p>`;
                } else {
                    bodyHtml = t.notes ? `<p style="margin:6px 0 0; font-size:12px; color:#666; background:white; padding:8px; border-radius:8px;">${sanitizeHTML(t.notes)}</p>` : '';
                }
                html += `
                    <div style="background:#f2f2f7; border-radius:14px; padding:14px; margin-bottom:10px; border-left:4px solid ${isGrocery ? '#5e5ce6' : prioColor};">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                            <div style="flex:1;">
                                <h4 style="margin:0 0 4px; font-size:15px;">${sanitizeHTML(t.task||'')}</h4>
                                <p style="margin:0; font-size:12px; color:#8e8e93;">📅 ${date}</p>
                                <p style="margin:4px 0 0; font-size:12px; color:var(--primary); font-weight:600;">From: ${sanitizeHTML(t.fromName||'')}</p>
                                ${bodyHtml}
                            </div>
                            <button onclick="acceptSharedTask('${doc.id}')" style="background:#34c759; color:white; border:none; border-radius:10px; padding:8px 14px; font-weight:700; font-size:12px; cursor:pointer; white-space:nowrap; flex-shrink:0;">${isGrocery ? 'Add List ✅' : 'Add ✅'}</button>
                        </div>
                    </div>`;
            });
            container.innerHTML = html;
        } catch(e) {
            container.innerHTML = '<p style="text-align:center; color:#ff3b30; font-size:13px;">Error loading. Check Firestore rules.</p>';
        }
    }

    // SHARED GROCERY LIST: reuses the same shared_tasks collection/rules
    // already proven for family task sharing (js/03-wellbeing/02-mood-sharing.js)
    // rather than a new Firestore collection with its own rules to write and
    // verify without a live Firebase to test against. A itemType:'grocery'
    // marker distinguishes it from a regular shared task on accept.
    async function shareGroceryList(email) {
        if (!currentUser) return showToast('Login required!', 'error');
        if (!email || !email.includes('@')) return showToast('Enter a valid email!', 'error');
        const d = getShopData();
        const listName = document.getElementById('shopListSelect')?.value || d.activeList;
        const items = d.lists[listName];
        if (!items || !items.length) return showToast('This list is empty!', 'error');
        try {
            await db.collection('shared_tasks').add({
                fromUid: currentUser.uid,
                fromName: userName || currentUser.email,
                task: '🛒 Grocery List: ' + listName,
                notes: JSON.stringify(items.map(i => ({ name: i.name, qty: i.qty }))),
                itemType: 'grocery',
                listName: listName,
                toEmail: email.trim().toLowerCase(),
                time: new Date().toISOString(),
                priority: 'medium',
                sharedAt: new Date().toISOString(),
                status: 'pending'
            });
            showToast(`✅ List shared with ${email}!`, 'success');
        } catch (e) { showToast('Share error: ' + e.message, 'error'); }
    }

    function openShareGroceryListModal() {
        shareMode = 'grocery';
        const d = getShopData();
        const listName = document.getElementById('shopListSelect')?.value || d.activeList;
        if (!listName || !d.lists[listName] || !d.lists[listName].length) {
            return showToast('This list is empty!', 'error');
        }
        const shareTaskTitleEl = document.getElementById('shareTaskTitle');
        if (shareTaskTitleEl) shareTaskTitleEl.innerText = '🛒 Share List: ' + listName;
        const shareEmailInput = document.getElementById('shareEmailInput');
        if (shareEmailInput) shareEmailInput.value = '';
        openModal('shareTaskModal');
    }

    async function acceptSharedTask(docId) {
        try {
            const doc = await db.collection('shared_tasks').doc(docId).get();
            if (!doc.exists) return;
            const t = doc.data();
            if (t.itemType === 'grocery') {
                const items = JSON.parse(t.notes || '[]');
                const d = getShopData();
                const listName = t.listName || 'Shared List';
                if (!d.lists[listName]) d.lists[listName] = [];
                items.forEach(i => d.lists[listName].push({ id: Date.now() + Math.random(), name: i.name, qty: i.qty || 1, done: false }));
                d.activeList = listName;
                saveShopData(d);
                await db.collection('shared_tasks').doc(docId).update({ status: 'accepted' });
                loadSharedWithMe();
                showToast(`🛒 "${listName}" added to your Shopping list!`, 'success');
                return;
            }
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
