// Snooze, font size setting, sleep tracker, task archive, bulk select/actions.
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".
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
