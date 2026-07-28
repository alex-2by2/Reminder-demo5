// Shift schedule (widget/modal/types/reminders/calendar/summary), Finance tracker, Student mode, Journal.

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
        if (tab === 'calendar') renderShiftCalendar();
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

        const cfg = getShiftConfig();
        cfg.types.push({ id: Date.now(), name, icon, color, start, end, rate });
        saveShiftConfig(cfg);

        document.getElementById('newShiftName').value = '';
        document.getElementById('newShiftStart').value = '';
        document.getElementById('newShiftEnd').value = '';
        document.getElementById('newShiftEmoji').value = '';
        document.getElementById('newShiftRate').value = '';
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
                const remindAt = new Date(shiftDateTime.getTime() - cfg.reminderMinutes * 60000);
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
        window._shiftSummaryIncome = Math.round(totalIncome);
        window._shiftSummaryMonthLabel = `${monthNames[shiftSummaryMonth]} ${shiftSummaryYear}`;
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

    // FINANCE
    function getFinData(){return safeStorage('finData',{"expenses":[],"income":[],"budgets":[],"bills":[],"emis":[],"investments":[]})}    function saveFinData(d){localStorage.setItem('finData',JSON.stringify(d));syncToCloud()}
    function setFinTab(tab){document.querySelectorAll('.fin-tab-btn').forEach(b=>b.classList.remove('active'));document.querySelectorAll('[id^="finTab-"]').forEach(el=>el.style.display='none');const btn=document.querySelector(`.fin-tab-btn[onclick*="'${tab}'"]`);if(btn)btn.classList.add('active');const el=document.getElementById('finTab-'+tab);if(el)el.style.display='block';if(tab==='expenses')renderExpenses();if(tab==='income')renderIncome();if(tab==='budget')renderBudgets();if(tab==='bills')renderBills();if(tab==='emi')renderEMIs();if(tab==='invest')renderInvestments()}
    function renderFinanceDashboard(){const d=getFinData();const now=new Date();const ms=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;const mExp=d.expenses.filter(e=>e.date&&e.date.startsWith(ms)).reduce((s,e)=>s+safeNum(e.amount),0);const mInc=d.income.filter(e=>e.date&&e.date.startsWith(ms)).reduce((s,e)=>s+safeNum(e.amount),0);const emi=d.emis.reduce((s,e)=>s+safeNum(e.amount),0);const tb=d.budgets.reduce((s,b)=>s+safeNum(b.limit),0);const fi=document.getElementById('finIncome');const fe=document.getElementById('finExpense');const fs=document.getElementById('finSavings');const fb=document.getElementById('finBudgetLeft');if(fi)fi.innerText='₹'+mInc.toLocaleString('en-IN');if(fe)fe.innerText='₹'+mExp.toLocaleString('en-IN');if(fs)fs.innerText='₹'+Math.max(0,mInc-mExp-emi).toLocaleString('en-IN');if(fb)fb.innerText='₹'+Math.max(0,tb-mExp).toLocaleString('en-IN');renderExpenses();const summary=renderMonthlyFinanceSummary();const el=document.getElementById('finMonthSummary');if(el)el.innerHTML='Savings rate: <b style="color:'+(summary.savingRate>=20?'#34c759':'#ff9500')+'">'+summary.savingRate+'%</b> this month';}
    function addExpense(type){const iE=type==='expense';const name=document.getElementById(iE?'expNameInput':'incNameInput').value.trim();const amt=safeNum(document.getElementById(iE?'expAmtInput':'incAmtInput').value);const cat=document.getElementById(iE?'expCatInput':'incCatInput').value;const date=document.getElementById(iE?'expDateInput':'incDateInput').value||getTodayStr();const note=iE?(document.getElementById('expNoteInput')?.value.trim()||''):'';if(!name||!amt||amt<0)return showToast('Enter valid name & amount!','error');const d=getFinData();d[iE?'expenses':'income'].unshift({id:Date.now(),name:sanitizeHTML(name),amount:amt,category:cat,date,type,note:sanitizeHTML(note)});saveFinData(d);document.getElementById(iE?'expNameInput':'incNameInput').value='';document.getElementById(iE?'expAmtInput':'incAmtInput').value='';if(iE&&document.getElementById('expNoteInput'))document.getElementById('expNoteInput').value='';renderFinanceDashboard();if(!iE)renderIncome();hapticFeedback('success');showToast(iE?'Expense added!':'Income added!','success')}
    function renderExpenses(){const c=document.getElementById('expensesList');if(!c)return;const d=getFinData();c.innerHTML=d.expenses.slice(0,20).map(e=>`<div class="expense-item"><div><b style="font-size:13px">${sanitizeHTML(e.name||'')}</b>${e.note?`<br><span style="font-size:11px;color:#8e8e93;font-style:italic">${sanitizeHTML(e.note)}</span>`:''}<br><span style="font-size:11px;color:#8e8e93">${sanitizeHTML(e.category||'')}·${e.date}</span></div><div style="display:flex;align-items:center;gap:8px"><span style="font-weight:700;color:#ff3b30">₹${Number(e.amount).toLocaleString('en-IN')}</span><button onclick="deleteFinEntry('expenses',${e.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:16px">✖</button></div></div>`).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:20px">No expenses yet.</p>'}
    function renderIncome(){const c=document.getElementById('incomeList');if(!c)return;const d=getFinData();c.innerHTML=d.income.slice(0,20).map(e=>`<div class="expense-item"><div><b style="font-size:13px">${sanitizeHTML(e.name||'')}</b><br><span style="font-size:11px;color:#8e8e93">${sanitizeHTML(e.category||'')}·${e.date}</span></div><div style="display:flex;align-items:center;gap:8px"><span style="font-weight:700;color:#34c759">₹${Number(e.amount).toLocaleString('en-IN')}</span><button onclick="deleteFinEntry('income',${e.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:16px">✖</button></div></div>`).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:20px">No income.</p>'}
    function addBudget(){const cat=document.getElementById('budgetCatInput').value.trim();const limit=Number(document.getElementById('budgetAmtInput').value);if(!cat||!limit)return showToast('Enter category & limit!','error');const d=getFinData();d.budgets=d.budgets.filter(b=>b.cat!==cat);d.budgets.push({cat,limit});saveFinData(d);renderBudgets();document.getElementById('budgetCatInput').value='';document.getElementById('budgetAmtInput').value='';showToast('Budget set!','success')}
    function renderBudgets(){const c=document.getElementById('budgetList');if(!c)return;const d=getFinData();const now=new Date();const ms=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;const bc={};d.expenses.filter(e=>e.date&&e.date.startsWith(ms)).forEach(e=>{bc[e.category]=(bc[e.category]||0)+Number(e.amount)});c.innerHTML=d.budgets.map(b=>{const sp=bc[b.cat]||0;const pct=Math.min(100,Math.round((sp/b.limit)*100));const col=pct>=90?'#ff3b30':pct>=70?'#ff9500':'#34c759';return`<div style="background:#f2f2f7;border-radius:12px;padding:12px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;margin-bottom:6px"><span>${sanitizeHTML(b.cat||'')}</span><span style="color:${col}">₹${sp.toLocaleString('en-IN')}/₹${Number(b.limit).toLocaleString('en-IN')} (${pct}%)</span></div><div class="project-progress-track"><div class="project-progress-fill" style="width:${pct}%;background:${col}"></div></div></div>`}).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No budgets set.</p>'}
    function addBill(){const name=document.getElementById('billNameInput').value.trim();const amt=Number(document.getElementById('billAmtInput').value);const due=document.getElementById('billDueInput').value;const type=document.getElementById('billTypeInput').value;if(!name||!due)return showToast('Enter name & due date!','error');const d=getFinData();d.bills.unshift({id:Date.now(),name,amount:amt,due,type,paid:false});saveFinData(d);renderBills();document.getElementById('billNameInput').value='';document.getElementById('billAmtInput').value='';showToast('Bill added!','success')}
    function renderBills(){const c=document.getElementById('billsList');if(!c)return;const d=getFinData();const today=getTodayStr();c.innerHTML=d.bills.map(b=>{const dl=Math.ceil((new Date(b.due)-new Date(today))/86400000);const urg=dl<0?'bill-urgent':dl<=3?'bill-upcoming':'';return`<div class="bill-item ${urg}"><div><b style="font-size:13px">${sanitizeHTML(b.type||'')} ${sanitizeHTML(b.name||'')}</b><br><span style="font-size:11px;color:#8e8e93">Due:${b.due}·${dl<0?'⚠️Overdue':dl===0?'🔴Today!':dl+'d'}</span></div><div style="display:flex;align-items:center;gap:8px">${b.amount?`<span style="font-weight:700">₹${Number(b.amount).toLocaleString('en-IN')}</span>`:''}<button onclick="toggleBillPaid(${b.id})" style="background:${b.paid?'#e5e5ea':'#e5f9e9'};color:${b.paid?'#8e8e93':'#34c759'};border:none;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer">${b.paid?'Paid ✅':'Pay'}</button><button onclick="deleteFinEntry('bills',${b.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`}).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No bills.</p>'}
    function toggleBillPaid(id){const d=getFinData();const b=d.bills.find(x=>x.id===id);if(b)b.paid=!b.paid;saveFinData(d);renderBills()}
    function addEMI(){const name=document.getElementById('emiNameInput').value.trim();const amt=Number(document.getElementById('emiAmtInput').value);const due=document.getElementById('emiDueInput').value;const months=Number(document.getElementById('emiMonthsInput').value);if(!name||!amt)return showToast('Enter name & EMI!','error');const d=getFinData();d.emis.unshift({id:Date.now(),name,amount:amt,due:due?due.slice(8,10):'1',monthsLeft:months});saveFinData(d);renderEMIs();document.getElementById('emiNameInput').value='';document.getElementById('emiAmtInput').value='';showToast('EMI added!','success')}
    function renderEMIs(){const c=document.getElementById('emiList');if(!c)return;const d=getFinData();const total=d.emis.reduce((s,e)=>s+Number(e.amount),0);c.innerHTML=(total?`<div style="background:#ffe5e5;border-radius:12px;padding:10px;margin-bottom:10px;text-align:center"><b style="color:#ff3b30">Total EMI/month: ₹${total.toLocaleString('en-IN')}</b></div>`:'')+d.emis.map(e=>`<div class="bill-item"><div><b style="font-size:13px">${sanitizeHTML(e.name||'')}</b><br><span style="font-size:11px;color:#8e8e93">Day:${e.due}·${e.monthsLeft||'?'} mo left</span></div><div style="display:flex;align-items:center;gap:8px"><span style="font-weight:700;color:#ff3b30">₹${Number(e.amount).toLocaleString('en-IN')}</span><button onclick="deleteFinEntry('emis',${e.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No EMIs.</p>'}
    function addInvestment(){const name=document.getElementById('invNameInput').value.trim();const amt=Number(document.getElementById('invAmtInput').value);const type=document.getElementById('invTypeInput').value;const ret=Number(document.getElementById('invReturnInput').value);if(!name||!amt)return showToast('Enter name & amount!','error');const d=getFinData();d.investments.unshift({id:Date.now(),name,amount:amt,type,returnPct:ret});saveFinData(d);renderInvestments();document.getElementById('invNameInput').value='';document.getElementById('invAmtInput').value='';showToast('Investment added!','success')}
    function renderInvestments(){const c=document.getElementById('investList');if(!c)return;const d=getFinData();const total=d.investments.reduce((s,e)=>s+Number(e.amount),0);c.innerHTML=(total?`<div style="background:#e5f9e9;border-radius:12px;padding:10px;margin-bottom:10px;text-align:center"><b style="color:#34c759">Total: ₹${total.toLocaleString('en-IN')}</b></div>`:'')+d.investments.map(e=>`<div class="expense-item"><div><b style="font-size:13px">${sanitizeHTML(e.type||'')} ${sanitizeHTML(e.name||'')}</b>${e.returnPct?`<br><span style="font-size:11px;color:#34c759">Return:${e.returnPct}%</span>`:''}</div><div style="display:flex;align-items:center;gap:8px"><span style="font-weight:700;color:#34c759">₹${Number(e.amount).toLocaleString('en-IN')}</span><button onclick="deleteFinEntry('investments',${e.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No investments.</p>'}
    function deleteFinEntry(col,id){const d=getFinData();d[col]=d[col].filter(e=>e.id!==id);saveFinData(d);renderFinanceDashboard()}
    let currentTaxRegime = 'new';
    function setTaxRegime(regime) {
        currentTaxRegime = regime;
        document.getElementById('regime-new').classList.toggle('active', regime==='new');
        document.getElementById('regime-old').classList.toggle('active', regime==='old');
        const label = document.getElementById('taxDeductionLabel');
        if(label) label.innerText = regime==='old' ? 'Deductions u/s 80C,80D,HRA etc. (Rs)' : 'Deductions (limited use in New Regime) (Rs)';
        const result = document.getElementById('taxResult');
        if(result) result.innerHTML = '';
    }

    function calcNewRegimeTax(taxable) {
        let tax = 0;
        if(taxable > 300000 && taxable <= 600000) tax = (taxable-300000)*0.05;
        else if(taxable > 600000 && taxable <= 900000) tax = 15000 + (taxable-600000)*0.10;
        else if(taxable > 900000 && taxable <= 1200000) tax = 45000 + (taxable-900000)*0.15;
        else if(taxable > 1200000 && taxable <= 1500000) tax = 90000 + (taxable-1200000)*0.20;
        else if(taxable > 1500000) tax = 150000 + (taxable-1500000)*0.30;
        return tax;
    }

    function calcOldRegimeTax(taxable) {
        let tax = 0;
        if(taxable > 250000 && taxable <= 500000) tax = (taxable-250000)*0.05;
        else if(taxable > 500000 && taxable <= 1000000) tax = 12500 + (taxable-500000)*0.20;
        else if(taxable > 1000000) tax = 112500 + (taxable-1000000)*0.30;
        return tax;
    }

    function calculateTax(){
        const income=Number(document.getElementById('taxIncomeInput').value);
        const ded=Number(document.getElementById('taxDeductionInput').value)||0;
        if(!income) return showToast('Enter income!','error');

        const stdDeduction = 50000;
        let taxable, tax;
        if(currentTaxRegime === 'old') {
            taxable = Math.max(0, income - stdDeduction - ded);
            tax = calcOldRegimeTax(taxable);
        } else {
            taxable = Math.max(0, income - stdDeduction);
            tax = calcNewRegimeTax(taxable);
        }
        const cess = tax * 0.04;
        const total = tax + cess;

        // Compute the other regime too for comparison
        const otherTaxable = currentTaxRegime === 'old' ? Math.max(0, income - stdDeduction) : Math.max(0, income - stdDeduction - ded);
        const otherTax = currentTaxRegime === 'old' ? calcNewRegimeTax(otherTaxable) : calcOldRegimeTax(otherTaxable);
        const otherTotal = otherTax * 1.04;
        const betterRegime = total <= otherTotal ? currentTaxRegime : (currentTaxRegime === 'old' ? 'new' : 'old');
        const savings = Math.abs(total - otherTotal);

        const el=document.getElementById('taxResult');
        if(el) el.innerHTML=`<div style="background:#fff;border-radius:12px;padding:12px;margin-top:8px;text-align:left;">
            <p style="margin:3px 0;font-size:12px">Taxable Income: Rs ${taxable.toLocaleString('en-IN')}</p>
            <p style="margin:3px 0;font-size:12px">Income Tax: Rs ${Math.round(tax).toLocaleString('en-IN')}</p>
            <p style="margin:3px 0;font-size:12px">Health & Education Cess (4%): Rs ${Math.round(cess).toLocaleString('en-IN')}</p>
            <p style="margin:6px 0 0;font-size:14px;font-weight:800;color:#ff3b30">Total Tax (${currentTaxRegime==='old'?'Old':'New'} Regime): Rs ${Math.round(total).toLocaleString('en-IN')}</p>
            <p style="margin:8px 0 0;font-size:11px;color:#34c759;font-weight:700;">${betterRegime===currentTaxRegime ? 'This regime saves you Rs '+Math.round(savings).toLocaleString('en-IN')+' vs the other!' : 'Tip: '+(betterRegime==='old'?'Old':'New')+' Regime would save Rs '+Math.round(savings).toLocaleString('en-IN')+' more'}</p>
            <p style="margin:6px 0 0;font-size:10px;color:#8e8e93">*Estimate for FY2024-25, salaried individual</p>
        </div>`;
        hapticFeedback('success');
    }

    // STUDENT MODE
    function getStudentData(){return safeStorage('studentData',{"exams":[],"subjects":[]})}    function saveStudentData(d){localStorage.setItem('studentData',JSON.stringify(d));syncToCloud()}
    function addExam(){const name=document.getElementById('examNameInput').value.trim();const date=document.getElementById('examDateInput').value;const emoji=document.getElementById('examEmojiInput').value.trim()||'📝';if(!name||!date)return showToast('Enter exam name & date!','error');const d=getStudentData();d.exams.unshift({id:Date.now(),name,date,emoji});saveStudentData(d);renderExamCountdowns();document.getElementById('examNameInput').value='';document.getElementById('examDateInput').value='';showToast('Exam added!','success')}
    function renderExamCountdowns(){const c=document.getElementById('examCountdownsContainer');if(!c)return;const d=getStudentData();const today=new Date();today.setHours(0,0,0,0);const upcoming=d.exams.filter(e=>new Date(e.date)>=today).sort((a,b)=>new Date(a.date)-new Date(b.date));if(!upcoming.length){c.innerHTML='';return}c.innerHTML=upcoming.slice(0,3).map(e=>{const days=Math.ceil((new Date(e.date)-today)/86400000);const col=days<=7?'#ff3b30':days<=30?'#ff9500':'#34c759';return`<div class="exam-countdown-card" style="background:linear-gradient(135deg,${col},${col}aa);position:relative"><div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:11px;opacity:0.8;font-weight:600;text-transform:uppercase">EXAM</div><div style="font-size:18px;font-weight:800;margin-top:2px">${sanitizeHTML(e.emoji||'')} ${sanitizeHTML(e.name||'')}</div><div style="font-size:12px;opacity:0.85;margin-top:2px">📅 ${new Date(e.date+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div></div><div style="text-align:center"><div style="font-size:36px;font-weight:900;line-height:1">${days}</div><div style="font-size:10px;opacity:0.85">${days===1?'DAY':'DAYS'} LEFT</div></div></div><button onclick="deleteExam(${e.id})" style="position:absolute;right:8px;top:8px;background:rgba(255,255,255,0.2);border:none;color:white;border-radius:6px;padding:2px 6px;cursor:pointer;font-size:11px">✖</button></div>`}).join('')}
    function deleteExam(id){const d=getStudentData();d.exams=d.exams.filter(e=>e.id!==id);saveStudentData(d);renderExamCountdowns()}
    function addSubject(){const name=document.getElementById('subjectNameInput').value.trim();const color=document.getElementById('subjectColorInput').value;if(!name)return showToast('Enter subject!','error');const d=getStudentData();d.subjects.unshift({id:Date.now(),name,color,studyHours:0});saveStudentData(d);renderSubjects();updateStudySubjectSelect();document.getElementById('subjectNameInput').value='';showToast('Subject added!','success')}
    function renderSubjects(){const c=document.getElementById('subjectsList');if(!c)return;const d=getStudentData();c.innerHTML=d.subjects.map(s=>`<div class="subject-item"><div style="display:flex;align-items:center;gap:10px"><div style="width:10px;height:10px;border-radius:50%;background:${s.color};flex-shrink:0"></div><div><b style="font-size:13px">${sanitizeHTML(s.name||'')}</b><br><span style="font-size:11px;color:#8e8e93">📚 ${s.studyHours||0}h</span></div></div><div style="display:flex;align-items:center;gap:6px"><button onclick="logStudyHour(${s.id})" style="background:${s.color}22;color:${s.color};border:none;border-radius:8px;padding:6px 10px;font-weight:700;cursor:pointer;font-size:12px">+1h</button><button onclick="deleteSubject(${s.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No subjects.</p>'}
    function logStudyHour(id){const d=getStudentData();const s=d.subjects.find(x=>x.id===id);if(s)s.studyHours=(s.studyHours||0)+1;saveStudentData(d);renderSubjects();showToast('📚 1h logged!','success')}
    function deleteSubject(id){const d=getStudentData();d.subjects=d.subjects.filter(s=>s.id!==id);saveStudentData(d);renderSubjects();updateStudySubjectSelect()}
    function updateStudySubjectSelect(){const sel=document.getElementById('studySubjectSelect');if(!sel)return;const d=getStudentData();sel.innerHTML='<option value="">Select Subject</option>'+d.subjects.map(s=>`<option value="${s.id}">${sanitizeHTML(s.name||'')}</option>`).join('')}

    // JOURNAL
    function getJournalEntries(){return safeStorage('journalEntries', {})}
    function saveJournalEntries(data){localStorage.setItem('journalEntries',JSON.stringify(data));syncToCloud()}
    function loadTodayJournalEntry(){const e=getJournalEntries()[getTodayStr()];const el=document.getElementById('journalEntryInput');if(el&&e)el.value=e.text||'';const tagsEl=document.getElementById('journalTagsInput');if(tagsEl&&e)tagsEl.value=(e.tags||[]).join(', ')}

    const JOURNAL_PROMPTS = [
        "What's one thing you're grateful for today?",
        "What was the most challenging part of your day, and how did you handle it?",
        "Describe a moment today that made you smile.",
        "What's one goal you're working towards this week?",
        "What did you learn today that you didn't know before?",
        "If you could change one thing about today, what would it be?",
        "What's something kind someone did for you recently?",
        "Write about a small win you had today.",
        "What's been on your mind lately?",
        "Describe your ideal tomorrow, what would make it great?",
        "What's a habit you'd like to build, and why?",
        "Who made a positive impact on your day today?",
        "What's something you're looking forward to?",
        "Write three words that describe your mood today and explain why.",
        "What's one thing you'd tell your past self from a year ago?",
    ];

    function getJournalPrompt() {
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(),0,0)) / 86400000);
        return JOURNAL_PROMPTS[dayOfYear % JOURNAL_PROMPTS.length];
    }

    function usePrompt() {
        const prompt = document.getElementById('journalPromptText').innerText;
        const el = document.getElementById('journalEntryInput');
        if (!el.value.trim()) el.value = prompt + '\n\n';
        el.focus();
        hapticFeedback('light');
    }

    function calculateJournalStreak() {
        const entries = getJournalEntries();
        const dates = Object.keys(entries);
        if (!dates.length) return { current: 0, longest: 0 };

        let current = 0;
        const todayStr = getTodayStr();
        const yesterdayStr = formatDateLocal(new Date(Date.now() - 86400000));

        if (entries[todayStr] || entries[yesterdayStr]) {
            let d = entries[todayStr] ? new Date(todayStr+'T00:00:00') : new Date(yesterdayStr+'T00:00:00');
            while (entries[formatDateLocal(d)]) {
                current++;
                d.setDate(d.getDate() - 1);
            }
        }

        let longest = 0, streak = 0, prevDate = null;
        dates.slice().sort().forEach(dStr => {
            const d = new Date(dStr + 'T00:00:00');
            if (prevDate && (d - prevDate) === 86400000) streak++;
            else streak = 1;
            longest = Math.max(longest, streak);
            prevDate = d;
        });

        return { current, longest: Math.max(longest, current) };
    }

    function renderJournalStats() {
        const entries = getJournalEntries();
        const stk = calculateJournalStreak();
        const sEl = document.getElementById('journalStreak');
        const tEl = document.getElementById('journalTotalEntries');
        const lEl = document.getElementById('journalLongestStreak');
        if (sEl) sEl.innerText = stk.current + '🔥';
        if (tEl) tEl.innerText = Object.keys(entries).length;
        if (lEl) lEl.innerText = stk.longest;
        const pEl = document.getElementById('journalPromptText');
        if (pEl) pEl.innerText = getJournalPrompt();
    }

    function saveJournalEntry(){
        const text=document.getElementById('journalEntryInput').value.trim();
        if(!text)return showToast('Write something!','error');
        const entries=getJournalEntries();
        const todayStr=getTodayStr();
        const ml=safeStorage('moodLog', {});
        const tagsRaw = document.getElementById('journalTagsInput').value.trim();
        const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [];
        entries[todayStr]={text,mood:ml[todayStr],tags,savedAt:new Date().toISOString()};
        saveJournalEntries(entries);
        renderJournalEntries();
        renderJournalStats();
        hapticFeedback('success');
        showToast('Journal saved! 📓','success');
    }

    function getAllJournalTags() {
        const entries = getJournalEntries();
        const tagSet = new Set();
        Object.values(entries).forEach(e => (e.tags||[]).forEach(t => tagSet.add(t)));
        return [...tagSet];
    }

    let activeJournalTagFilter = null;

    function filterJournalByTag(tag) {
        activeJournalTagFilter = activeJournalTagFilter === tag ? null : tag;
        renderJournalEntries();
    }

    function renderJournalTagFilters() {
        const container = document.getElementById('journalTagFilters');
        if (!container) return;
        const tags = getAllJournalTags();
        container.innerHTML = tags.map(t => `<button onclick="filterJournalByTag('${escInline(t)}')" class="fin-tab-btn${activeJournalTagFilter===t?' active':''}" style="font-size:11px;">#${sanitizeHTML(t)}</button>`).join('');
    }

    function renderJournalEntries(){const c=document.getElementById('journalEntriesContainer');if(!c)return;const entries=getJournalEntries();const search=(document.getElementById('journalSearchInput')?.value||'').toLowerCase();const me=['😄','😊','😐','😔','😢'];let sorted=Object.entries(entries).sort((a,b)=>b[0].localeCompare(a[0])).filter(([_,e])=>!search||e.text.toLowerCase().includes(search));if(activeJournalTagFilter)sorted=sorted.filter(([_,e])=>(e.tags||[]).includes(activeJournalTagFilter));renderJournalTagFilters();if(!sorted.length){c.innerHTML='<p style="text-align:center;color:#8e8e93;font-size:13px;padding:20px">No entries yet. Start writing! ✍️</p>';return}c.innerHTML=sorted.slice(0,30).map(([date,entry])=>{const ms=entry.mood!==undefined?me[entry.mood]:'';const dt=new Date(date+'T00:00:00');const tagsHtml=(entry.tags||[]).map(t=>`<span style="background:#e5f1ff;color:var(--primary);font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;margin-right:4px;">#${sanitizeHTML(t)}</span>`).join('');return`<div class="journal-entry"><div class="journal-date">${dt.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} ${ms}</div><p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:inherit">${sanitizeHTML(entry.text.slice(0,200))}${entry.text.length>200?'...':''}</p>${tagsHtml?`<div style="margin-bottom:6px;">${tagsHtml}</div>`:''}<div style="display:flex;gap:8px;margin-top:8px"><button onclick="editJournalEntry('${date}')" style="background:#f2f2f7;border:none;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer">✏️ Edit</button><button onclick="deleteJournalEntry('${date}')" style="background:#ffe5e5;color:#ff3b30;border:none;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer">🗑️</button></div></div>`}).join('')}
    function editJournalEntry(date){const e=getJournalEntries();const el=document.getElementById('journalEntryInput');if(el&&e[date])el.value=e[date].text;const tagsEl=document.getElementById('journalTagsInput');if(tagsEl&&e[date])tagsEl.value=(e[date].tags||[]).join(', ');showToast('Editing...','info')}
    function deleteJournalEntry(date){const e=getJournalEntries();delete e[date];saveJournalEntries(e);renderJournalEntries();renderJournalStats()}

