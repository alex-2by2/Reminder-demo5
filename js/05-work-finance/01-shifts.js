// Shift schedule configuration and rendering.
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".

    // SHIFT SCHEDULE
    // ============================================================
    function getShiftConfig() {
        let cfg = safeStorage('shiftConfig', null);
        if (!cfg) {
            cfg = {
                types: [
                    { id: 1, name: 'Morning', icon: '🌅', color: '#ff9500', start: '06:00', end: '14:00' },
                    { id: 2, name: 'Evening', icon: '🌇', color: '#5e5ce6', start: '14:00', end: '22:00' },
                    { id: 3, name: 'Night',   icon: '🌙', color: '#007aff', start: '22:00', end: '06:00' },
                    { id: 4, name: 'Off',     icon: '🏖️', color: '#34c759', start: null,    end: null }
                ],
                pattern: [],
                patternStart: getTodayStr(),
                overrides: {},
                notes: {},
                reminderEnabled: false,
                reminderMinutes: 60
            };
            localStorage.setItem('shiftConfig', JSON.stringify(cfg));
        }
        if (!cfg.overrides) cfg.overrides = {};
        if (!cfg.pattern) cfg.pattern = [];
        if (!cfg.notes) cfg.notes = {};
        return cfg;
    }

    function saveShiftConfig(cfg, sync = true) {
        localStorage.setItem('shiftConfig', JSON.stringify(cfg));
        if (sync) syncToCloud();
    }

    function getShiftForDate(dateStr) {
        const cfg = getShiftConfig();
        if (cfg.overrides[dateStr] !== undefined) {
            return cfg.types.find(t => t.id === cfg.overrides[dateStr]) || null;
        }
        if (cfg.pattern.length === 0 || !cfg.patternStart) return null;
        const start = new Date(cfg.patternStart + 'T00:00:00');
        const target = new Date(dateStr + 'T00:00:00');
        let diffDays = Math.round((target - start) / 86400000);
        diffDays = ((diffDays % cfg.pattern.length) + cfg.pattern.length) % cfg.pattern.length;
        const typeId = cfg.pattern[diffDays];
        return cfg.types.find(t => t.id === typeId) || null;
    }

    // --- Today's Shift Home Widget ---
    function renderTodayShiftWidget() {
        const card = document.getElementById('todayShiftCard');
        if (!card) return;
        const todayStr = getTodayStr();
        const shift = getShiftForDate(todayStr);
        const setEl = (id, val, html) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (html) el.innerHTML = val; else el.innerText = val;
        };
        if (!shift) {
            setEl('shiftCardIcon', '🔄');
            setEl('shiftCardName', 'Set up Shift Schedule');
            setEl('shiftCardTime', 'Tap to configure your rotation 👆');
            setEl('shiftCardNext', '');
            return;
        }
        setEl('shiftCardIcon', shift.icon);
        setEl('shiftCardName', shift.name + (shift.start ? ' Shift' : ''));
        setEl('shiftCardTime', shift.start ? shift.start + ' – ' + shift.end : 'Day off 🎉 Enjoy!');
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
        const nextShift = getShiftForDate(formatDateLocal(tomorrow));
        setEl('shiftCardNext', nextShift ? 'Tomorrow<br>' + nextShift.icon + ' ' + nextShift.name : '', true);
    }

    // --- Shift Modal & Tabs ---
    function openShiftModal() {
        const cfg = getShiftConfig();
        const reminderToggle = document.getElementById('shiftReminderToggle');
        const reminderMinutes = document.getElementById('shiftReminderMinutes');
        const reminderMinutesWrap = document.getElementById('shiftReminderMinutesWrap');
        if (reminderToggle) reminderToggle.checked = cfg.reminderEnabled;
        if (reminderMinutes) reminderMinutes.value = cfg.reminderMinutes;
        if (reminderMinutesWrap) reminderMinutesWrap.style.display = cfg.reminderEnabled ? 'block' : 'none';
        renderShiftTypes();
        setShiftTab('setup');
        openModal('shiftModal');
    }

    function setShiftTab(tab) {
        document.querySelectorAll('.shift-view-btn').forEach(b => b.classList.remove('active'));
        const tabBtn = document.getElementById('shifttab-' + tab);
        if (tabBtn) tabBtn.classList.add('active');
        const setupEl = document.getElementById('shiftTabSetup');
        const calendarEl = document.getElementById('shiftTabCalendar');
        const summaryEl = document.getElementById('shiftTabSummary');
        if (setupEl) setupEl.style.display = (tab === 'setup') ? 'block' : 'none';
        if (calendarEl) calendarEl.style.display = (tab === 'calendar') ? 'block' : 'none';
        if (summaryEl) summaryEl.style.display = (tab === 'summary') ? 'block' : 'none';
        if (tab === 'calendar') { renderShiftCalendar(); renderUpcomingShifts(); }
        if (tab === 'summary') renderShiftSummary();
    }

    // --- Shift Types ---
    function renderShiftTypes() {
        const cfg = getShiftConfig();
        const container = document.getElementById('shiftTypesContainer');
        if (!container) return;
        container.innerHTML = cfg.types.map(t => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#f2f2f7; padding:10px 12px; border-radius:10px; margin-bottom:6px;">
                <div style="display:flex; align-items:center; gap:8px; font-size:13px;">
                    <div style="width:10px; height:10px; border-radius:50%; background:${t.color}; flex-shrink:0;"></div>
                    <span>${sanitizeHTML(t.icon||'')} <b>${sanitizeHTML(t.name||'')}</b></span>
                    <span style="font-size:11px; color:#8e8e93;">${t.start ? t.start+'–'+t.end : 'All day off'}</span>
                    ${t.rate ? `<span style="font-size:10px; color:#34c759; font-weight:700;">₹${t.rate}/hr</span>` : ''}
                    ${t.reminderMinutes != null ? `<span style="font-size:10px; color:#5e5ce6; font-weight:700;">🔔 ${t.reminderMinutes}m</span>` : ''}
                </div>
                <button onclick="deleteShiftType(${t.id})" style="background:#ffe5e5; color:#ff3b30; border:none; border-radius:8px; padding:5px 9px; cursor:pointer; font-size:12px;">🗑️</button>
            </div>
        `).join('');
        renderShiftPatternBuilder();
    }

    function addShiftType() {
        const name = document.getElementById('newShiftName').value.trim();
        if (!name) return showToast('Enter shift name!', 'error');
        const start = document.getElementById('newShiftStart').value || null;
        const end = document.getElementById('newShiftEnd').value || null;
        const icon = document.getElementById('newShiftEmoji').value.trim() || '🔄';
        const color = document.getElementById('newShiftColor').value || '#007aff';
        const rate = Number(document.getElementById('newShiftRate').value) || 0;
        // SHIFT SCHEDULE IMPROVEMENT: optional per-type reminder timing — e.g. a
        // Night shift might need 2 hours' notice to wake up, while a Morning
        // shift five minutes down the road only needs 20. Falls back to the
        // global cfg.reminderMinutes when not set (see syncShiftReminders()).
        const reminderInput = document.getElementById('newShiftReminderMinutes');
        const reminderMinutes = reminderInput && reminderInput.value !== '' ? safeNum(reminderInput.value) : null;

        const cfg = getShiftConfig();
        cfg.types.push({ id: Date.now(), name, icon, color, start, end, rate, reminderMinutes });
        saveShiftConfig(cfg);

        document.getElementById('newShiftName').value = '';
        document.getElementById('newShiftStart').value = '';
        document.getElementById('newShiftEnd').value = '';
        document.getElementById('newShiftEmoji').value = '';
        document.getElementById('newShiftRate').value = '';
        if (reminderInput) reminderInput.value = '';
        renderShiftTypes();
        showToast('Shift type added! ✅', 'success');
    }

    function deleteShiftType(id) {
        const cfg = getShiftConfig();
        cfg.types = cfg.types.filter(t => t.id !== id);
        cfg.pattern = cfg.pattern.filter(pid => pid !== id);
        Object.keys(cfg.overrides).forEach(d => { if (cfg.overrides[d] === id) delete cfg.overrides[d]; });
        saveShiftConfig(cfg);
        renderShiftTypes();
        renderTodayShiftWidget();
        syncShiftReminders();
        showToast('Shift type removed', 'info');
    }

    // --- Rotation Pattern ---
    function renderShiftPatternBuilder() {
        const cfg = getShiftConfig();
        const builder = document.getElementById('shiftPatternBuilder');
        if (!builder) return;
        builder.innerHTML = cfg.types.map(t =>
            `<button class="shift-type-chip" style="background:${t.color}22; color:${t.color};" onclick="addToPattern(${t.id})">${sanitizeHTML(t.icon||'')} ${sanitizeHTML(t.name||'')}</button>`
        ).join('');
        renderShiftPatternSequence();
    }

    function renderShiftPatternSequence() {
        const cfg = getShiftConfig();
        const container = document.getElementById('shiftPatternSequence');
        if (!container) return;
        if (cfg.pattern.length === 0) {
            container.innerHTML = '<span style="font-size:12px; color:#8e8e93; padding:6px;">Tap chips above to build your cycle (e.g. 🌅🌅🌇🌇🌙🌙🏖️🏖️)</span>';
        } else {
            container.innerHTML = cfg.pattern.map((typeId, idx) => {
                const t = cfg.types.find(x => x.id === typeId);
                if (!t) return '';
                return `<span class="shift-pattern-item" style="background:${t.color};">${idx+1}. ${t.icon}<span class="remove-x" onclick="removeFromPattern(${idx})">✖</span></span>`;
            }).join('');
        }
        document.getElementById('shiftPatternStartDate').value = cfg.patternStart || getTodayStr();
    }

    function addToPattern(typeId) {
        const cfg = getShiftConfig();
        cfg.pattern.push(typeId);
        saveShiftConfig(cfg);
        renderShiftPatternSequence();
        renderTodayShiftWidget();
        syncShiftReminders();
    }

    function removeFromPattern(idx) {
        const cfg = getShiftConfig();
        cfg.pattern.splice(idx, 1);
        saveShiftConfig(cfg);
        renderShiftPatternSequence();
        renderTodayShiftWidget();
        syncShiftReminders();
    }

    function saveShiftPattern() {
        const cfg = getShiftConfig();
        cfg.patternStart = document.getElementById('shiftPatternStartDate').value || getTodayStr();
        saveShiftConfig(cfg);
        renderTodayShiftWidget();
        syncShiftReminders();
        showToast('Pattern start date saved!', 'success');
    }

    // --- Shift Reminder Settings ---
    function saveShiftReminderSettings() {
        const cfg = getShiftConfig();
        cfg.reminderEnabled = document.getElementById('shiftReminderToggle').checked;
        cfg.reminderMinutes = parseInt(document.getElementById('shiftReminderMinutes').value) || 60;
        document.getElementById('shiftReminderMinutesWrap').style.display = cfg.reminderEnabled ? 'block' : 'none';
        saveShiftConfig(cfg);
        syncShiftReminders();
        showToast(cfg.reminderEnabled ? '🔔 Shift reminders ON' : 'Shift reminders OFF', 'info');
    }

    // --- Auto-generate Shift Reminders (next 14 days) ---
    function syncShiftReminders() {
        const cfg = getShiftConfig();
        const todayStr = getTodayStr();
        let reminders = safeStorage('reminders', []);

        // Remove future un-completed auto-generated shift reminders (regenerate fresh)
        reminders = reminders.filter(r => !(r.shiftGenerated && r.status !== 'completed' && r.time.split('T')[0] >= todayStr));

        if (cfg.reminderEnabled) {
            const pad = n => String(n).padStart(2,'0');
            for (let i = 0; i < 14; i++) {
                const d = new Date(); d.setDate(d.getDate() + i);
                const dStr = formatDateLocal(d);
                const shift = getShiftForDate(dStr);
                if (!shift || !shift.start) continue;

                const [h, m] = shift.start.split(':').map(Number);
                const shiftDateTime = new Date(d); shiftDateTime.setHours(h, m, 0, 0);
                const minutesBefore = shift.reminderMinutes != null ? shift.reminderMinutes : cfg.reminderMinutes;
                const remindAt = new Date(shiftDateTime.getTime() - minutesBefore * 60000);
                if (remindAt < new Date()) continue;

                const timeStr = `${remindAt.getFullYear()}-${pad(remindAt.getMonth()+1)}-${pad(remindAt.getDate())}T${pad(remindAt.getHours())}:${pad(remindAt.getMinutes())}`;
                reminders.push({
                    id: Date.now() + i,
                    task: `${shift.icon} ${shift.name} Shift starts at ${shift.start}`,
                    notes: `Get ready! ${shift.name} shift: ${shift.start} – ${shift.end}`,
                    time: timeStr, priority: 'medium', repeat: 'none', status: 'pending',
                    notified: false, pinned: false, tags: 'shift', preAlarm: 0,
                    category: { name: 'Shift', icon: '🔄' }, shiftGenerated: true
                });
            }
        }

        localStorage.setItem('reminders', JSON.stringify(reminders));
        loadReminders();
        renderHomeCalendar();
        syncToCloud();
    }

    // --- Shift Calendar (Preview + Override) ---
    let shiftCalMonth = new Date().getMonth();
    let shiftCalYear = new Date().getFullYear();

    function changeShiftCalMonth(dir) {
        shiftCalMonth += dir;
        if (shiftCalMonth > 11) { shiftCalMonth = 0; shiftCalYear++; }
        if (shiftCalMonth < 0) { shiftCalMonth = 11; shiftCalYear--; }
        renderShiftCalendar();
    }

    function renderShiftCalendar() {
        const grid = document.getElementById('shiftCalGrid');
        if (!grid) return;
        const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        document.getElementById('shiftCalMonthDisplay').innerText = `${monthNames[shiftCalMonth]} ${shiftCalYear}`;

        const cfg = getShiftConfig();
        let firstDay = new Date(shiftCalYear, shiftCalMonth, 1).getDay();
        let daysInMonth = new Date(shiftCalYear, shiftCalMonth + 1, 0).getDate();
        const todayStr = getTodayStr();

        let html = '';
        for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;
        for (let i = 1; i <= daysInMonth; i++) {
            const dStr = `${shiftCalYear}-${String(shiftCalMonth+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            const shift = getShiftForDate(dStr);
            const isToday = dStr === todayStr;
            const isOverride = cfg.overrides[dStr] !== undefined;
            const hasNote = cfg.notes && cfg.notes[dStr];
            let style = shift ? `background:${shift.color}22; color:${shift.color};` : '';
            let cls = 'cal-day';
            if (isToday) cls += ' today';
            html += `<div class="${cls}" style="${style} position:relative;" onclick="openShiftOverride('${dStr}')">
                ${i}${shift ? `<span style="position:absolute; bottom:2px; right:3px; font-size:9px;">${shift.icon}</span>` : ''}
                ${isOverride ? `<span style="position:absolute; top:1px; left:3px; font-size:8px;">📌</span>` : ''}
                ${hasNote ? `<span style="position:absolute; top:1px; right:3px; font-size:8px;">📝</span>` : ''}
            </div>`;
        }
        grid.innerHTML = html;

        const legend = document.getElementById('shiftCalLegend');
        legend.innerHTML = cfg.types.map(t =>
            `<span class="shift-legend-item"><span class="shift-legend-dot" style="background:${t.color};"></span>${sanitizeHTML(t.icon||'')} ${sanitizeHTML(t.name||'')}</span>`
        ).join('');
    }

    let shiftOverrideDate = null;

    function openShiftOverride(dateStr) {
        shiftOverrideDate = dateStr;
        const cfg = getShiftConfig();
        const dt = new Date(dateStr + 'T00:00:00');
        document.getElementById('shiftOverrideDateLabel').innerText = dt.toLocaleDateString('en-IN', {weekday:'long', day:'numeric', month:'short'});

        let html = cfg.types.map(t =>
            `<button class="shift-override-btn" onclick="setShiftOverride(${t.id})"><span style="font-size:20px;">${sanitizeHTML(t.icon||'')}</span> ${sanitizeHTML(t.name||'')}</button>`
        ).join('');
        if (cfg.overrides[dateStr] !== undefined) {
            html += `<button class="shift-override-btn" style="color:var(--primary);" onclick="setShiftOverride('auto')">🔄 Reset to Rotation</button>`;
        }
        document.getElementById('shiftOverrideOptions').innerHTML = html;
        document.getElementById('shiftNoteInput').value = (cfg.notes && cfg.notes[dateStr]) || '';
        openModal('shiftOverrideModal');
    }

    function saveShiftNote() {
        const cfg = getShiftConfig();
        const note = document.getElementById('shiftNoteInput').value.trim();
        if (!cfg.notes) cfg.notes = {};
        if (note) cfg.notes[shiftOverrideDate] = note;
        else delete cfg.notes[shiftOverrideDate];
        saveShiftConfig(cfg);
        closeModal('shiftOverrideModal');
        renderShiftCalendar();
        showToast('Note saved! 📝', 'success');
    }

    function setShiftOverride(typeIdOrAuto) {
        const cfg = getShiftConfig();
        if (typeIdOrAuto === 'auto') {
            delete cfg.overrides[shiftOverrideDate];
        } else {
            cfg.overrides[shiftOverrideDate] = Number(typeIdOrAuto);
        }
        saveShiftConfig(cfg);
        closeModal('shiftOverrideModal');
        renderShiftCalendar();
        renderTodayShiftWidget();
        syncShiftReminders();
        showToast('Shift updated! 🔄', 'success');
    }

    // --- Shift Summary (Monthly hours/income) ---
    let shiftSummaryMonth = new Date().getMonth();
    let shiftSummaryYear = new Date().getFullYear();

    function changeShiftSummaryMonth(dir) {
        shiftSummaryMonth += dir;
        if (shiftSummaryMonth > 11) { shiftSummaryMonth = 0; shiftSummaryYear++; }
        if (shiftSummaryMonth < 0) { shiftSummaryMonth = 11; shiftSummaryYear--; }
        renderShiftSummary();
    }

    function shiftHoursDiff(start, end) {
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        let mins = (eh*60+em) - (sh*60+sm);
        if (mins <= 0) mins += 24*60; // overnight shift
        return mins / 60;
    }

    function renderShiftSummary() {
        const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        document.getElementById('shiftSummaryMonthDisplay').innerText = `${monthNames[shiftSummaryMonth]} ${shiftSummaryYear}`;

        const cfg = getShiftConfig();
        const daysInMonth = new Date(shiftSummaryYear, shiftSummaryMonth + 1, 0).getDate();
        const counts = {};
        let totalHours = 0;
        let totalIncome = 0;

        for (let i = 1; i <= daysInMonth; i++) {
            const dStr = `${shiftSummaryYear}-${String(shiftSummaryMonth+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            const shift = getShiftForDate(dStr);
            if (!shift) continue;
            counts[shift.id] = (counts[shift.id] || 0) + 1;
            if (shift.start && shift.end) {
                const hrs = shiftHoursDiff(shift.start, shift.end);
                totalHours += hrs;
                if (shift.rate) totalIncome += hrs * shift.rate;
            }
        }

        const countsEl = document.getElementById('shiftSummaryTypeCounts');
        countsEl.innerHTML = cfg.types.map(t => {
            const c = counts[t.id] || 0;
            return `<div style="display:flex; justify-content:space-between; align-items:center; background:#f2f2f7; padding:10px 12px; border-radius:10px; margin-bottom:6px;">
                <span style="font-size:13px;">${sanitizeHTML(t.icon||'')} ${sanitizeHTML(t.name||'')}</span>
                <span style="font-weight:700; color:${t.color};">${c} day${c !== 1 ? 's' : ''}</span>
            </div>`;
        }).join('');

        document.getElementById('shiftSummaryHours').innerText = Math.round(totalHours) + 'h';
        document.getElementById('shiftSummaryIncome').innerText = '₹' + Math.round(totalIncome).toLocaleString('en-IN');

        // OVERTIME (SHIFT SCHEDULE IMPROVEMENT): logged separately from scheduled
        // shifts since OT is ad-hoc (extra hours worked beyond the roster), often
        // at a different rate than the regular shift.
        const monthPrefix = `${shiftSummaryYear}-${String(shiftSummaryMonth+1).padStart(2,'0')}`;
        const otEntries = getOvertimeData().filter(e => e.date.startsWith(monthPrefix));
        const otHours = otEntries.reduce((sum, e) => sum + e.hours, 0);
        const otIncome = otEntries.reduce((sum, e) => sum + (e.hours * (e.rate || 0)), 0);
        document.getElementById('shiftSummaryOTHours').innerText = `${otHours}h · ₹${Math.round(otIncome).toLocaleString('en-IN')}`;
        renderOvertimeList(otEntries);

        window._shiftSummaryIncome = Math.round(totalIncome + otIncome);
        window._shiftSummaryMonthLabel = `${monthNames[shiftSummaryMonth]} ${shiftSummaryYear}`;
    }

    // --- Overtime Tracking ---
    function getOvertimeData() { return safeStorage('shiftOvertime', []); }
    function saveOvertimeData(data) { localStorage.setItem('shiftOvertime', JSON.stringify(data)); syncToCloud(); }

    function addOvertimeEntry() {
        const dateInput = document.getElementById('otDateInput');
        const hoursInput = document.getElementById('otHoursInput');
        const rateInput = document.getElementById('otRateInput');
        const date = dateInput.value || getTodayStr();
        const hours = safeNum(hoursInput.value);
        const rate = safeNum(rateInput.value);
        if (!hours) return showToast('Enter overtime hours!', 'error');
        const data = getOvertimeData();
        data.unshift({ id: Date.now(), date, hours, rate });
        saveOvertimeData(data);
        hoursInput.value = ''; rateInput.value = '';
        renderShiftSummary();
        showToast('⏱️ Overtime logged!', 'success');
    }

    function deleteOvertimeEntry(id) {
        saveOvertimeData(getOvertimeData().filter(e => e.id !== id));
        renderShiftSummary();
    }

    function renderOvertimeList(entries) {
        const c = document.getElementById('shiftOvertimeList');
        if (!c) return;
        c.innerHTML = entries.map(e => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; font-size:11px;">
                <span>${new Date(e.date+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short'})} — ${e.hours}h${e.rate ? ' @ ₹'+e.rate+'/hr' : ''}</span>
                <span onclick="deleteOvertimeEntry(${e.id})" style="color:#ff3b30; cursor:pointer;">✖</span>
            </div>
        `).join('') || '<span style="font-size:11px; color:#8e8e93;">No overtime logged this month.</span>';
    }

    function addShiftIncomeToFinance() {
        const income = window._shiftSummaryIncome || 0;
        if (!income) return showToast('No income to add — set hourly rates first!', 'error');
        const d = getFinData();
        d.income.unshift({ id: Date.now(), name: 'Shift Income - ' + (window._shiftSummaryMonthLabel||''), amount: income, category: 'Salary', date: getTodayStr(), type: 'income' });
        saveFinData(d);
        hapticFeedback('success');
        showToast('₹' + income.toLocaleString('en-IN') + ' added to Finance! 💰', 'success');
    }

    // --- Upcoming Shifts (next 7 days) ---
    function renderUpcomingShifts() {
        const list = document.getElementById('upcomingShiftsList');
        if (!list) return;
        const days = [...Array(7)].map((_, i) => {
            const d = new Date(); d.setDate(d.getDate() + i);
            return { date: d, dateStr: formatDateLocal(d) };
        });
        const cfg = getShiftConfig();
        list.innerHTML = days.map(({ date, dateStr }, i) => {
            const shift = getShiftForDate(dateStr);
            const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
            const note = cfg.notes && cfg.notes[dateStr];
            return `<div onclick="openShiftOverride('${dateStr}')" style="display:flex; justify-content:space-between; align-items:center; background:${shift ? shift.color+'15' : '#f2f2f7'}; border-radius:10px; padding:8px 12px; cursor:pointer;">
                <span style="font-size:12px; font-weight:600;">${label}${note ? ' · 📝' : ''}</span>
                <span style="font-size:12px; font-weight:700; color:${shift ? shift.color : '#8e8e93'};">${shift ? shift.icon + ' ' + shift.name + (shift.start ? ' (' + shift.start + '–' + shift.end + ')' : '') : 'Not set'}</span>
            </div>`;
        }).join('');
    }

    // --- Bulk Date-Range Override ---
    function openBulkShiftOverride() {
        const cfg = getShiftConfig();
        const today = getTodayStr();
        document.getElementById('bulkOverrideStart').value = today;
        document.getElementById('bulkOverrideEnd').value = today;
        document.getElementById('bulkOverrideOptions').innerHTML = cfg.types.map(t =>
            `<button class="shift-override-btn" onclick="applyBulkShiftOverride(${t.id})"><span style="font-size:20px;">${sanitizeHTML(t.icon||'')}</span> ${sanitizeHTML(t.name||'')}</button>`
        ).join('') + `<button class="shift-override-btn" style="color:var(--primary);" onclick="applyBulkShiftOverride('auto')">🔄 Reset to Rotation</button>`;
        openModal('bulkShiftOverrideModal');
    }

    function applyBulkShiftOverride(typeIdOrAuto) {
        const startVal = document.getElementById('bulkOverrideStart').value;
        const endVal = document.getElementById('bulkOverrideEnd').value;
        if (!startVal || !endVal) return showToast('Pick both dates!', 'error');
        const start = new Date(startVal + 'T00:00:00');
        const end = new Date(endVal + 'T00:00:00');
        if (end < start) return showToast('End date must be after start date!', 'error');
        const dayCount = Math.round((end - start) / 86400000) + 1;
        if (dayCount > 366) return showToast('That range is too large — pick under a year.', 'error');

        const cfg = getShiftConfig();
        for (let i = 0; i < dayCount; i++) {
            const d = new Date(start); d.setDate(d.getDate() + i);
            const dStr = formatDateLocal(d);
            if (typeIdOrAuto === 'auto') delete cfg.overrides[dStr];
            else cfg.overrides[dStr] = Number(typeIdOrAuto);
        }
        saveShiftConfig(cfg);
        closeModal('bulkShiftOverrideModal');
        renderShiftCalendar();
        renderUpcomingShifts();
        renderTodayShiftWidget();
        syncShiftReminders();
        showToast(`✅ ${dayCount} day${dayCount !== 1 ? 's' : ''} updated!`, 'success');
    }

    // --- Shift Schedule .ics Export ---
    // Distinct from the general task/.ics export (js/03-wellbeing/02-mood-sharing.js
    // exportToGoogleCalendar) since shift days are computed on the fly from the
    // rotation pattern, not stored as individual reminder objects unless shift
    // reminders happen to be turned on — this exports the actual roster.
    function exportShiftScheduleToICS() {
        const cfg = getShiftConfig();
        if (!cfg.pattern.length && Object.keys(cfg.overrides).length === 0) {
            return showToast('Set up a rotation pattern first!', 'error');
        }
        const fmtDate = (d) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
        let ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Master Reminder App//Shift Schedule//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
        const today = new Date();
        for (let i = 0; i < 90; i++) {
            const d = new Date(today); d.setDate(d.getDate() + i);
            const dStr = formatDateLocal(d);
            const shift = getShiftForDate(dStr);
            if (!shift || !shift.start) continue; // skip off days and unset days
            const [sh, sm] = shift.start.split(':').map(Number);
            const start = new Date(d); start.setHours(sh, sm, 0, 0);
            let end;
            if (shift.end) {
                const [eh, em] = shift.end.split(':').map(Number);
                end = new Date(d); end.setHours(eh, em, 0, 0);
                if (end <= start) end.setDate(end.getDate() + 1); // overnight shift
            } else {
                end = new Date(start.getTime() + 3600000);
            }
            const stamp = (dt) => fmtDate(dt) + 'T' + String(dt.getHours()).padStart(2,'0') + String(dt.getMinutes()).padStart(2,'0') + '00';
            ics.push('BEGIN:VEVENT', `UID:shift-${dStr}@masterapp`, `DTSTAMP:${stamp(new Date())}Z`,
                `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${shift.icon} ${shift.name} Shift`,
                `CATEGORIES:Shift`, 'END:VEVENT');
        }
        ics.push('END:VCALENDAR');
        const blob = new Blob([ics.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'MyShiftSchedule.ics';
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        showToast('📤 Next 90 days exported! Import into any calendar app.', 'success');
    }


