// Automation rules system, Notification centre, Savings goals, Study analytics charts, Global search, Task dependencies, AI recommendations, keyboard search shortcut, Smart daily briefing, Health tips, Achievement sharing, Next-task widget, Daily challenge, Focus mode, Recurring expenses, init patches, Habit AI recommendations, Monthly finance summary, Warranty tracker, Loan EMI calculator.

    // AUTOMATION SYSTEM
    // ============================================================
    const QUICK_RULES = [
        { id:'r1', trigger:'overdue', action:'notify', label:'Overdue Tasks → Notification', icon:'⏰' },
        { id:'r2', trigger:'budget_exceeded', action:'notify', label:'Budget Exceeded → Alert', icon:'💰' },
        { id:'r3', trigger:'habit_missed', action:'notify', label:'Habit Missed 2d → Reminder', icon:'🔥' },
        { id:'r4', trigger:'bill_due', action:'notify', label:'Bill Due Soon → Reminder', icon:'🧾' },
        { id:'r5', trigger:'birthday_soon', action:'notify', label:'Birthday in 3 days → Alert', icon:'🎂' },
    ];

    function openAutomationModal() {
        renderAutomationQuickRules();
        renderCustomRulesList();
        openModal('automationModal');
    }

    function renderAutomationQuickRules() {
        const el = document.getElementById('automationQuickRules'); if(!el) return;
        const enabled = safeStorage("enabledRules", ["r1","r2","r3","r4","r5"]);
        el.innerHTML = QUICK_RULES.map(r => `
            <div class="auto-rule-item">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:13px;">${r.icon} ${r.label}</span>
                    <input type="checkbox" ${enabled.includes(r.id)?'checked':''} onchange="toggleQuickRule('${r.id}',this.checked)" style="width:20px;height:20px;margin:0;">
                </div>
            </div>`).join('');
    }

    function toggleQuickRule(id, on) {
        let enabled = safeStorage("enabledRules", ["r1","r2","r3","r4","r5"]);
        if(on) { if(!enabled.includes(id)) enabled.push(id); }
        else enabled = enabled.filter(x => x !== id);
        localStorage.setItem('enabledRules', JSON.stringify(enabled));
        showToast(on ? 'Rule enabled ✅' : 'Rule disabled', 'info');
    }

    function addAutomationRule() {
        const triggerInput = document.getElementById('autoTriggerInput');
        const actionInput = document.getElementById('autoActionInput');
        const trigger = triggerInput?.value || '';
        const action = actionInput?.value || '';
        if (!trigger || !action) return showToast('Pick trigger and action!', 'error');
        const rules = safeStorage('customRules', []);
        rules.unshift({ id:Date.now(), trigger, action });
        localStorage.setItem('customRules', JSON.stringify(rules));
        renderCustomRulesList();
        showToast('Automation rule added! ⚙️', 'success');
    }

    function renderCustomRulesList() {
        const el = document.getElementById('customRulesList'); if(!el) return;
        const rules = safeStorage('customRules', []);
        const trigLabels = { overdue:'Task Overdue', budget_exceeded:'Budget Exceeded', habit_missed:'Habit Missed 2d', bill_due:'Bill Due 3d', birthday_soon:'Birthday 3d' };
        const actLabels = { notify:'Notify', reschedule:'Auto-Reschedule', pin:'Pin Task', ai_suggest:'AI Suggest' };
        if(!rules.length) { el.innerHTML='<p style="text-align:center;color:#8e8e93;font-size:13px;padding:10px">No custom rules yet.</p>'; return; }
        el.innerHTML = rules.map(r => `
            <div class="auto-rule-item">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:12px;">IF <b>${trigLabels[r.trigger]||r.trigger}</b> → <b>${actLabels[r.action]||r.action}</b></span>
                    <button onclick="deleteCustomRule(${r.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px;">✖</button>
                </div>
            </div>`).join('');
    }

    function deleteCustomRule(id) {
        const rules = safeStorage('customRules', []).filter(r => r.id !== id);
        localStorage.setItem('customRules', JSON.stringify(rules));
        renderCustomRulesList();
    }

    async function runAutomations() {
        const enabled = safeStorage("enabledRules", ["r1","r2","r3","r4","r5"]);
        let actions = 0;
        const reminders = safeStorage('reminders', []);
        const finData = getFinData();
        const habits = safeStorage('habits', []);
        const bdays = getBirthdays();
        const today = new Date(); today.setHours(0,0,0,0);

        if(enabled.includes('r1')) {
            const overdue = reminders.filter(r => r.status!=='completed' && !r.archived && new Date(r.time) < new Date());
            if(overdue.length) { addNotifLog('Overdue Tasks', overdue.length + ' task(s) overdue', 'error'); actions++; }
        }
        if(enabled.includes('r2')) {
            const now = new Date(); const ms = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
            const spent = finData.expenses.filter(e=>e.date?.startsWith(ms)).reduce((s,e)=>s+Number(e.amount),0);
            const budget = finData.budgets.reduce((s,b)=>s+Number(b.limit),0);
            if(budget > 0 && spent > budget) { addNotifLog('Budget Exceeded', 'Over by Rs '+(spent-budget).toLocaleString('en-IN'), 'error'); actions++; }
        }
        if(enabled.includes('r3')) {
            habits.forEach(h => {
                if(h.streak === 0 || (h.lastCheckIn && Math.floor((Date.now()-new Date(h.lastCheckIn))/86400000) >= 2)) {
                    addNotifLog('Habit', h.name + ' streak broken! Restart today!', 'warning');
                    actions++;
                }
            });
        }
        if(enabled.includes('r4')) {
            finData.bills.filter(b => !b.paid).forEach(b => {
                const dl = Math.ceil((new Date(b.due)-today)/86400000);
                if(dl >= 0 && dl <= 3) { addNotifLog('Bill Due', b.name+' due in '+dl+'d (Rs '+(b.amount||'?')+')', 'warning'); actions++; }
            });
        }
        if(enabled.includes('r5')) {
            bdays.forEach(b => {
                const [_,mm,dd] = b.date.split('-'); const thisYear = today.getFullYear();
                let next = new Date(`${thisYear}-${mm}-${dd}`); if(next < today) next.setFullYear(thisYear+1);
                const dl = Math.ceil((next-today)/86400000);
                if(dl >= 0 && dl <= 3) { addNotifLog('Birthday', b.name+"'s birthday in "+dl+'d!', 'success'); actions++; }
            });
        }

        hapticFeedback(actions > 0 ? 'success' : 'light');
        showToast(actions > 0 ? `✅ ${actions} automation(s) fired!` : '✅ All clear — no triggers!', actions>0?'success':'info');
    }

    // ============================================================
    // NOTIFICATION CENTRE
    // ============================================================
    function getNotifLog() { return safeStorage('notifLog', []); }
    function addNotifLog(title, body, type='info') {
        const log = getNotifLog();
        log.unshift({id:Date.now(), title, body, type, time:new Date().toISOString(), read:false});
        localStorage.setItem('notifLog', JSON.stringify(log.slice(0,100)));
        showPushNotification(title, body);
    }

    function openNotifCentreModal() {
        renderNotifCentre();
        openModal('notifCentreModal');
    }

    function renderNotifCentre() {
        const log = getNotifLog();
        const unreadEl = document.getElementById('notifUnreadCount');
        const listEl = document.getElementById('notifCentreList');
        if(!listEl) return;
        const unread = log.filter(n => !n.read).length;
        if(unreadEl) unreadEl.innerText = `${unread} unread`;
        const colors = { error:'#ff3b30', warning:'#ff9500', success:'#34c759', info:'#007aff' };
        listEl.innerHTML = log.map(n => {
            const dt = new Date(n.time).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
            return `<div class="notif-item" onclick="markNotifRead(${n.id})" style="cursor:pointer;${n.read?'opacity:0.6':''}">
                <div class="notif-dot" style="background:${colors[n.type]||'#8e8e93'}"></div>
                <div style="flex:1;"><b style="font-size:13px">${sanitizeHTML(n.title||'')}</b><br><span style="color:#8e8e93">${sanitizeHTML(n.body||'')}</span></div>
                <span style="font-size:10px;color:#8e8e93;flex-shrink:0">${dt}</span>
            </div>`;
        }).join('') || '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:20px">No notifications yet.</p>';

        // Mark all as read
        const all = getNotifLog().map(n => ({...n, read:true}));
        localStorage.setItem('notifLog', JSON.stringify(all));
    }

    function markNotifRead(id) {
        const log = getNotifLog().map(n => n.id===id ? {...n,read:true} : n);
        localStorage.setItem('notifLog', JSON.stringify(log));
        renderNotifCentre();
    }

    function clearAllNotifs() {
        localStorage.setItem('notifLog', '[]');
        renderNotifCentre();
        showToast('Notifications cleared', 'info');
    }

    // ============================================================
    // SAVINGS GOAL
    // ============================================================
    function getSavingsGoals() { return safeStorage('savingsGoals', []); }
    function saveSavingsGoals(d) { localStorage.setItem('savingsGoals', JSON.stringify(d)); syncToCloud(); }
    function openSavingsGoalModal() { renderSavingsGoals(); openModal('savingsGoalModal'); }

    function addSavingsGoal() {
        const nameInput = document.getElementById('goalNameInput');
        const emojiInput = document.getElementById('goalEmojiInput');
        const targetInput = document.getElementById('goalTargetInput');
        const savedInput = document.getElementById('goalSavedInput');
        const deadlineInput = document.getElementById('goalDeadlineInput');
        if (!nameInput || !emojiInput || !targetInput || !savedInput || !deadlineInput) {
            return showToast('Savings goal form unavailable.', 'error');
        }
        const name = nameInput.value.trim();
        const emoji = emojiInput.value.trim() || '🎯';
        const target = Number(targetInput.value);
        const saved = Number(savedInput.value) || 0;
        const deadline = deadlineInput.value;
        if(!name || !target) return showToast('Enter goal name & target!', 'error');
        const goals = getSavingsGoals();
        goals.unshift({id:Date.now(), name, emoji, target, saved, deadline});
        saveSavingsGoals(goals); renderSavingsGoals();
        nameInput.value = '';
        targetInput.value = '';
        savedInput.value = '';
        hapticFeedback('success'); showToast('Goal added! 🎯', 'success');
    }

    function addToGoal(id, amount) {
        const goals = getSavingsGoals(); const g = goals.find(x => x.id === id);
        if(g) g.saved = Math.min(g.target, g.saved + amount);
        saveSavingsGoals(goals); renderSavingsGoals();
        hapticFeedback('success');
    }

    function renderSavingsGoals() {
        const c = document.getElementById('savingsGoalList'); if(!c) return;
        const goals = getSavingsGoals();
        c.innerHTML = goals.map(g => {
            const pct = Math.round((g.saved/g.target)*100);
            const remaining = g.target - g.saved;
            const color = pct >= 100 ? '#34c759' : pct >= 60 ? '#007aff' : pct >= 30 ? '#ff9500' : '#ff3b30';
            const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline)-new Date())/86400000) : null;
            return `<div class="savings-goal-card" style="background:#f2f2f7;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
                    <div><h4 style="margin:0;font-size:16px;">${sanitizeHTML(g.emoji||'')} ${sanitizeHTML(g.name||'')}</h4>
                        <p style="margin:3px 0 0;font-size:12px;color:#8e8e93;">₹${g.saved.toLocaleString('en-IN')} / ₹${g.target.toLocaleString('en-IN')}${daysLeft!==null?` · ${daysLeft}d left`:''}</p>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-size:20px;font-weight:800;color:${color}">${pct}%</span><br>
                        <button onclick="deleteGoal(${g.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:13px;">✖ Remove</button>
                    </div>
                </div>
                <div class="project-progress-track" style="height:8px;"><div class="project-progress-fill" style="width:${pct}%;background:${color}"></div></div>
                ${pct < 100 ? `<div style="display:flex;gap:6px;margin-top:10px;">
                    <button onclick="addToGoal(${g.id},500)" style="flex:1;background:var(--primary);color:white;border:none;border-radius:8px;padding:7px;font-weight:700;cursor:pointer;font-size:12px;">+₹500</button>
                    <button onclick="addToGoal(${g.id},1000)" style="flex:1;background:var(--primary);color:white;border:none;border-radius:8px;padding:7px;font-weight:700;cursor:pointer;font-size:12px;">+₹1000</button>
                    <button onclick="addToGoal(${g.id},5000)" style="flex:1;background:var(--primary);color:white;border:none;border-radius:8px;padding:7px;font-weight:700;cursor:pointer;font-size:12px;">+₹5000</button>
                </div>` : '<p style="text-align:center;color:#34c759;font-weight:800;margin:8px 0 0;">🎉 Goal Achieved!</p>'}
            </div>`;
        }).join('') || '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No savings goals yet.</p>';
    }

    function deleteGoal(id) { saveSavingsGoals(getSavingsGoals().filter(x=>x.id!==id)); renderSavingsGoals(); }

    // ============================================================
    // STUDY ANALYTICS CHARTS
    // ============================================================
    let studySubjectChartInst = null, studyDailyChartInst = null;

    function openStudyAnalyticsModal() {
        openModal('studyAnalyticsModal');
        setTimeout(renderStudyAnalytics, 150);
    }

    function renderStudyAnalytics() {
        const d = getStudentData();
        const totalHours = d.subjects.reduce((s,sub) => s+(sub.studyHours||0), 0);
        const topSub = d.subjects.reduce((best,sub) => (!best||sub.studyHours>best.studyHours)?sub:best, null);
        const thEl = document.getElementById('studyTotalHours');
        const tsEl = document.getElementById('studyTopSubject');
        if(thEl) thEl.innerText = totalHours + 'h';
        if(tsEl) tsEl.innerText = topSub ? topSub.name : '—';

        // Subject pie chart
        const pieCtx = document.getElementById('studySubjectChart')?.getContext('2d');
        if(pieCtx && d.subjects.length) {
            if(studySubjectChartInst) studySubjectChartInst.destroy();
            studySubjectChartInst = new Chart(pieCtx, {
                type:'doughnut',
                data:{ labels:d.subjects.map(s=>s.name), datasets:[{data:d.subjects.map(s=>s.studyHours||0), backgroundColor:d.subjects.map(s=>s.color), borderWidth:0}] },
                options:{ plugins:{ legend:{ position:'right', labels:{ font:{ size:11 } } } }, cutout:'55%' }
            });
        }

        // Daily study trend (using pomodoroHistory tagged with subject)
        const pomoHist = safeStorage('pomodoroHistory', []);
        const last7 = [...Array(7)].map((_,i) => { const d = new Date(); d.setDate(d.getDate()-(6-i)); return formatDateLocal(d); });
        const dailyMins = last7.map(date => pomoHist.filter(h=>h.date===date).reduce((s,h)=>s+h.mins,0));
        const barCtx = document.getElementById('studyDailyChart')?.getContext('2d');
        if(barCtx) {
            if(studyDailyChartInst) studyDailyChartInst.destroy();
            studyDailyChartInst = new Chart(barCtx, {
                type:'bar',
                data:{ labels:last7.map(d=>d.slice(5)), datasets:[{label:'Focus min', data:dailyMins, backgroundColor:'#007aff', borderRadius:6}] },
                options:{ scales:{ y:{ beginAtZero:true } }, plugins:{ legend:{ display:false } } }
            });
        }

        // Exam readiness
        const container = document.getElementById('examReadinessContainer'); if(!container) return;
        const now = new Date(); now.setHours(0,0,0,0);
        const upcoming = (d.exams||[]).filter(e=>new Date(e.date)>=now).sort((a,b)=>new Date(a.date)-new Date(b.date));
        if(!upcoming.length) { container.innerHTML=''; return; }
        container.innerHTML = '<h5 style="font-size:11px;color:#8e8e93;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;margin:0 0 8px">📊 Exam Readiness</h5>' +
            upcoming.slice(0,3).map(e => {
                const days = Math.ceil((new Date(e.date)-now)/86400000);
                const readiness = Math.min(100, Math.round((totalHours * 3) + (days > 30 ? 30 : days)));
                const color = readiness >= 70 ? '#34c759' : readiness >= 40 ? '#ff9500' : '#ff3b30';
                return `<div style="background:#f2f2f7;border-radius:12px;padding:12px;margin-bottom:8px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                        <b style="font-size:13px">${sanitizeHTML(e.emoji||'')} ${sanitizeHTML(e.name||'')}</b>
                        <span style="font-weight:800;color:${color}">${readiness}% Ready</span>
                    </div>
                    <div class="project-progress-track"><div class="project-progress-fill" style="width:${readiness}%;background:${color}"></div></div>
                    <p style="margin:5px 0 0;font-size:11px;color:#8e8e93">${days} days left</p>
                </div>`;
            }).join('');
    }


    // ============================================================
    // GLOBAL SEARCH
    // ============================================================
    let globalSearchFilter = 'all';

    function openGlobalSearch() {
        openModal('globalSearchModal');
        setTimeout(() => {
            const el = document.getElementById('globalSearchInput');
            if(el) { el.value = ''; el.focus(); }
            document.getElementById('globalSearchResults').innerHTML = '';
        }, 100);
    }

    function setGlobalFilter(filter, btn) {
        globalSearchFilter = filter;
        document.querySelectorAll('#globalSearchFilters .fin-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        runGlobalSearch();
    }

    function runGlobalSearch() {
        const q = (document.getElementById('globalSearchInput')?.value || '').toLowerCase().trim();
        const container = document.getElementById('globalSearchResults');
        if(!container) return;
        if(!q) { container.innerHTML = '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:20px">Type to search across all modules</p>'; return; }

        const results = [];
        const f = globalSearchFilter;

        if(f === 'all' || f === 'tasks') {
            const reminders = safeStorage('reminders', []);
            reminders.filter(r => r.task?.toLowerCase().includes(q) || (r.notes||'').toLowerCase().includes(q)).slice(0,8).forEach(r => {
                results.push({ type:'Task', icon:'📋', title:r.task, sub:r.time?.slice(0,10)||'', color:'#007aff', action:`editReminder(${r.id}); closeModal('globalSearchModal');` });
            });
        }
        if(f === 'all' || f === 'notes') {
            const notes = safeStorage('quickNotes', []);
            notes.filter(n => n.text?.toLowerCase().includes(q)).slice(0,5).forEach(n => {
                results.push({ type:'Note', icon:'📝', title:n.text.slice(0,60), sub:n.created?.slice(0,10)||'', color:'#ff9500', action:`openQuickNotesModal(); closeModal('globalSearchModal');` });
            });
            const journal = safeStorage('journalEntries', {});
            Object.entries(journal).filter(([_,e]) => e.text?.toLowerCase().includes(q)).slice(0,3).forEach(([date,e]) => {
                results.push({ type:'Journal', icon:'📓', title:e.text.slice(0,60), sub:date, color:'#5e5ce6', action:`switchPage('journal'); closeModal('globalSearchModal');` });
            });
        }
        if(f === 'all' || f === 'finance') {
            const fin = getFinData();
            [...fin.expenses, ...fin.income].filter(e => e.name?.toLowerCase().includes(q)).slice(0,5).forEach(e => {
                results.push({ type:e.type==='income'?'Income':'Expense', icon:e.type==='income'?'💵':'💸', title:e.name, sub:'Rs '+Number(e.amount).toLocaleString('en-IN')+' · '+e.date, color:e.type==='income'?'#34c759':'#ff3b30', action:`switchPage('finance'); closeModal('globalSearchModal');` });
            });
        }
        if(f === 'all' || f === 'journal') {
            const bdays = safeStorage('birthdays', []);
            bdays.filter(b => b.name?.toLowerCase().includes(q)).forEach(b => {
                results.push({ type:'Birthday', icon:'🎂', title:b.name, sub:b.date, color:'#ff2d55', action:`openBirthdayModal(); closeModal('globalSearchModal');` });
            });
        }

        if(!results.length) { container.innerHTML = '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:20px">No results found for "'+sanitizeHTML(q)+'"</p>'; return; }
        container.innerHTML = results.map(r => `
            <div onclick="${r.action}" style="display:flex;align-items:center;gap:12px;padding:12px;background:#f2f2f7;border-radius:12px;margin-bottom:8px;cursor:pointer;">
                <div style="width:36px;height:36px;border-radius:10px;background:${r.color}22;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${r.icon}</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${sanitizeHTML(r.title||'')}</div>
                    <div style="font-size:11px;color:#8e8e93;">${sanitizeHTML(r.type||'')} · ${sanitizeHTML(String(r.sub||''))}</div>
                </div>
            </div>`).join('');
    }

    // ============================================================
    // TASK DEPENDENCIES
    // ============================================================
    function openTaskDepsModal() {
        const reminders = safeStorage('reminders', []);
        const active = reminders.filter(r => r.status !== 'completed' && !r.archived);
        const makeOpts = () => active.map(r => `<option value="${r.id}">${sanitizeHTML((r.task||'').slice(0,40))}</option>`).join('');
        const blockedEl = document.getElementById('depBlockedTask');
        const requiredEl = document.getElementById('depRequiredTask');
        if (blockedEl) blockedEl.innerHTML = makeOpts();
        if (requiredEl) requiredEl.innerHTML = makeOpts();
        renderDependenciesList();
        openModal('taskDepsModal');
    }

    function addDependency() {
        const blockedEl = document.getElementById('depBlockedTask');
        const requiredEl = document.getElementById('depRequiredTask');
        if (!blockedEl || !requiredEl) return showToast('Dependency form unavailable.', 'error');
        const blocked = Number(blockedEl.value);
        const required = Number(requiredEl.value);
        if(blocked === required) return showToast('Cannot depend on itself!', 'error');
        let deps = safeStorage('taskDeps', []);
        if(deps.find(d => d.blocked === blocked && d.required === required)) return showToast('Dependency already exists!', 'error');
        deps.push({ id:Date.now(), blocked, required });
        localStorage.setItem('taskDeps', JSON.stringify(deps));
        renderDependenciesList();
        loadReminders();
        syncToCloud();
        hapticFeedback('success');
        showToast('Dependency added! 🔗', 'success');
    }

    function renderDependenciesList() {
        const container = document.getElementById('dependenciesList'); if(!container) return;
        const deps = safeStorage('taskDeps', []);
        const reminders = safeStorage('reminders', []);
        const getTitle = id => (reminders.find(r => r.id === id)?.task || 'Deleted Task').slice(0,30);
        container.innerHTML = deps.map(d => `
            <div style="background:#f2f2f7;border-radius:12px;padding:10px 12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:12px;">🔒 <b>${getTitle(d.blocked)}</b><br><span style="color:#8e8e93;font-size:11px;">needs: ${getTitle(d.required)}</span></span>
                <button onclick="removeDependency(${d.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px;">✖</button>
            </div>`).join('') || '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:10px">No dependencies set.</p>';
    }

    function removeDependency(id) {
        const deps = safeStorage('taskDeps', []).filter(d => d.id !== id);
        localStorage.setItem('taskDeps', JSON.stringify(deps));
        renderDependenciesList(); loadReminders(); syncToCloud();
    }

    function isTaskBlocked(taskId) {
        const deps = safeStorage('taskDeps', []);
        const reminders = safeStorage('reminders', []);
        return deps.filter(d => d.blocked === taskId).some(d => {
            const required = reminders.find(r => r.id === d.required);
            return required && required.status !== 'completed';
        });
    }

    // ============================================================
    // AI RECOMMENDATIONS
    // ============================================================
    async function getAIRecommend(type) {
        const el = document.getElementById('aiRecommendOutput');
        if(el) el.innerHTML = '<p style="text-align:center;color:#8e8e93">Thinking...</p>';
        const habits = safeStorage('habits', []);
        const reminders = safeStorage('reminders', []);
        const fin = getFinData();
        let prompt = '';
        if(type === 'habits') {
            const existing = habits.map(h=>h.name).join(', ') || 'none';
            prompt = 'My current habits: '+existing+'. My task completion rate: '+Math.round(reminders.filter(r=>r.status==="completed").length/Math.max(1,reminders.length)*100)+'%. Suggest 5 new daily habits with brief reasons. Use emojis, bullet points, max 6 lines.';
        } else if(type === 'tasks') {
            const overdue = reminders.filter(r=>r.status!=="completed"&&new Date(r.time)<new Date()).length;
            prompt = 'I have '+reminders.filter(r=>r.status!=="completed").length+' pending tasks, '+overdue+' overdue. Give 4 specific productivity tips for managing these better. Use emojis, max 5 lines.';
        } else {
            const monthExp = fin.expenses.slice(0,20).reduce((s,e)=>s+Number(e.amount),0);
            prompt = 'My monthly expenses are around Rs '+monthExp.toLocaleString('en-IN')+'. I have '+fin.emis.length+' EMIs and '+fin.bills.length+' bills. Give 4 specific money-saving tips. Use emojis, max 5 lines.';
        }
        try {
            const reply = await callGeminiAI(prompt);
            if(el) el.innerHTML = sanitizeHTML(reply).replace(/\n/g, '<br>');
        } catch(e) {
            if(el) el.innerHTML = !currentUser ? '<p>Sign in to use AI Recommendations!</p>' : '<p>Error: '+sanitizeHTML(e.message)+'</p>';
        }
    }

    // ============================================================
    // CONFLICT RESOLUTION (Timestamp-based)
    // ============================================================

    // Stamp updatedAt on task changes
    const _origToggleStatus = window.toggleStatus;
    if(_origToggleStatus) {
        window.toggleStatus = function(id) {
            _origToggleStatus(id);
            let rems = safeStorage('reminders', []);
            const r = rems.find(x => x.id === id);
            if(r) r.updatedAt = Date.now();
            localStorage.setItem('reminders', JSON.stringify(rems));
        };
    }

    // ============================================================
    // TASK BLOCKED BADGE (show in task cards)
    // ============================================================
    // Patch loadReminders to show blocked badge - call after render
    const _origLoadReminders = loadReminders;

    // ============================================================
    // SMART DAILY BRIEFING ENHANCEMENT
    // ============================================================
    function checkMorningBriefing() {
        if(!currentUser) { setTimeout(checkMorningBriefing, 1000); return; }
        const todayStr = getTodayStr();
        const lastBriefing = localStorage.getItem('lastBriefingDate');
        if(lastBriefing === todayStr) return;
        localStorage.setItem('lastBriefingDate', todayStr);

        const reminders = safeStorage('reminders', []);
        const todayTasks = reminders.filter(r => r.status !== 'completed' && r.time?.startsWith(todayStr));
        const overdue = reminders.filter(r => r.status !== 'completed' && !r.archived && r.time && new Date(r.time) < new Date(todayStr));
        const bdays = getBirthdays ? getBirthdays() : [];
        const todayBdays = bdays.filter(b => { const parts = b.date.split('-'); return parts[1]+'-'+parts[2] === todayStr.slice(5); });

        let msgs = [];
        if(todayBdays.length) msgs.push('🎂 Birthday: '+todayBdays.map(b=>b.name).join(', '));
        if(overdue.length) msgs.push(overdue.length+' overdue task(s) need attention');
        if(todayTasks.length) msgs.push(todayTasks.length+' task(s) due today');

        if(msgs.length) {
            setTimeout(() => showToast('Good morning! '+msgs[0], 'info'), 1500);
            msgs.slice(1).forEach((m,i) => setTimeout(() => showToast(m, 'info'), 2500+(i*1500)));
        }
    }

    // ============================================================
    // SETTINGS INIT PATCH (autoDark + haptic + widgets)
    // ============================================================
    // Settings init handled in earlier DOMContentLoaded block


    // ============================================================
    // HEALTH TIPS
    // ============================================================
    const HEALTH_CHECKLIST = [
        {id:'h1', label:'8 glasses of water', icon:'💧', done:false},
        {id:'h2', label:'30 min exercise', icon:'🏃', done:false},
        {id:'h3', label:'7-8 hours sleep', icon:'😴', done:false},
        {id:'h4', label:'Healthy breakfast', icon:'🥗', done:false},
        {id:'h5', label:'10 min meditation', icon:'🧘', done:false},
        {id:'h6', label:'No junk food', icon:'🚫', done:false},
    ];

    function openHealthTipsModal() {
        renderHealthChecklist();
        openModal('healthTipsModal');
        getHealthTip('general');
    }

    async function getHealthTip(type) {
        const el = document.getElementById('healthTipContent');
        if(el) el.innerHTML = '<p style="color:#8e8e93">Loading...</p>';
        const moodLog = safeStorage('moodLog', {});
        const sleepLog = safeStorage('sleepLog', {});
        const todayStr = getTodayStr();
        const mood = moodLog[todayStr];
        const sleep = sleepLog[todayStr];
        const prompts = {
            sleep: 'Give 4 science-backed sleep improvement tips. Keep it brief with emojis, bullet points.',
            nutrition: 'Give 4 practical daily nutrition tips for productivity. Brief, with emojis and bullet points.',
            exercise: 'Give 4 quick exercise tips for busy people. Brief, emojis, bullet points.',
            mental: 'Give 4 mental wellness tips for better focus and mood. Brief, emojis, bullet points.',
            general: 'Based on mood level ' + (mood !== undefined ? mood : 'unknown') + '/4 and ' + (sleep || '?') + 'h sleep last night, give 3 personalized health tips. Brief, emojis, bullet points.'
        };
        try {
            const reply = await callGeminiAI(prompts[type] || prompts.general);
            if(el) el.innerHTML = sanitizeHTML(reply).replace(/\n/g,'<br>');
        } catch(e) {
            if(el) el.innerHTML = !currentUser
                ? '<p>Sign in for AI health tips!</p><br><b>General Tips:</b><br>Stay hydrated, exercise 30 min daily, sleep 7-8h, eat vegetables, meditate 10 min.'
                : '<p>Error: '+sanitizeHTML(e.message)+'</p>';
        }
    }

    function renderHealthChecklist() {
        const container = document.getElementById('healthChecklist'); if(!container) return;
        const saved = safeStorage('healthCheck_'+getTodayStr(), []);
        container.innerHTML = HEALTH_CHECKLIST.map(item => {
            const done = saved.includes(item.id);
            return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f2f2f7;">
                <input type="checkbox" ${done?'checked':''} onchange="toggleHealthCheck('${item.id}',this.checked)" style="width:18px;height:18px;margin:0;flex-shrink:0;">
                <span style="${done?'text-decoration:line-through;opacity:0.5':''}">${item.icon} ${item.label}</span>
            </div>`;
        }).join('');
    }

    function toggleHealthCheck(id, checked) {
        const key = 'healthCheck_'+getTodayStr();
        let saved = safeStorage(key, []);
        if(checked) { if(!saved.includes(id)) saved.push(id); }
        else saved = saved.filter(x => x !== id);
        localStorage.setItem(key, JSON.stringify(saved));
        renderHealthChecklist();
        hapticFeedback('light');
        if(saved.length === HEALTH_CHECKLIST.length) showToast('Perfect health day! 💪', 'success');
    }

    // ============================================================
    // ACHIEVEMENT SHARING
    // ============================================================
    function shareAchievement() {
        const reminders = safeStorage('reminders', []);
        const habits = safeStorage('habits', []);
        const pomoHist = safeStorage('pomodoroHistory', []);
        const completed = reminders.filter(r => r.status === 'completed').length;
        const bestStreak = Math.max(0, ...habits.map(h => h.streak||0));
        const focusHours = Math.round(pomoHist.reduce((s,h)=>s+h.mins,0)/60);

        let badge = '🏅', title = 'Productivity Champion', desc = '';
        if(completed >= 100) { badge = '💎'; title = 'Diamond Achiever'; }
        else if(completed >= 50) { badge = '🏆'; title = 'Gold Achiever'; }
        else if(completed >= 25) { badge = '🥈'; title = 'Silver Achiever'; }
        if(bestStreak >= 30) { badge = '🔥'; title = 'Habit Master'; }
        if(focusHours >= 50) { badge = '🧠'; title = 'Focus Legend'; }

        desc = completed + ' tasks completed · ' + bestStreak + ' day streak · ' + focusHours + 'h focused';

        const badgeEl = document.getElementById('achieveBadge');
        const titleEl = document.getElementById('achieveTitle');
        const descEl = document.getElementById('achieveDesc');
        if(badgeEl) badgeEl.innerText = badge;
        if(titleEl) titleEl.innerText = title;
        if(descEl) descEl.innerText = desc;

        openModal('achievementModal');
        hapticFeedback('success');
    }

    function copyAchievementText() {
        const badge = document.getElementById('achieveBadge')?.innerText || '';
        const title = document.getElementById('achieveTitle')?.innerText || '';
        const desc = document.getElementById('achieveDesc')?.innerText || '';
        const text = badge + ' ' + title + '\n' + desc + '\n\nTracked with Master Reminder App!';
        navigator.clipboard?.writeText(text).then(() => showToast('Copied to clipboard!', 'success'))
            .catch(() => showToast('Copy: ' + text, 'info'));
        hapticFeedback('success');
    }

    // ============================================================
    // EXPENSE NOTES (add note field to expense)
    // ============================================================

    // KEYBOARD SHORTCUTS: handled by the single global keydown listener in
    // js/08-khata-family-final.js (this file used to register a second,
    // overlapping one — both '/' and Escape were firing their action twice
    // per keypress; see CHANGELOG.md).

    // ============================================================
    // FINANCE TABS FIX (use event.currentTarget instead of event.target)
    // ============================================================
    // setFinTab defined earlier - this override fixes tab highlighting
    window.setFinTab = function(tab) {
        document.querySelectorAll('.fin-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('[id^="finTab-"]').forEach(el => el.style.display='none');
        document.querySelectorAll('.fin-tab-btn').forEach(btn => {
            const oc = btn.getAttribute('onclick') || '';
            if(oc.includes("'"+tab+"'") || oc.includes('"'+tab+'"')) btn.classList.add('active');
        });
        const tabEl = document.getElementById('finTab-'+tab);
        if(tabEl) tabEl.style.display = 'block';
        if(tab==='expenses') renderExpenses();
        else if(tab==='income') renderIncome();
        else if(tab==='budget') renderBudgets();
        else if(tab==='bills') renderBills();
        else if(tab==='emi') renderEMIs();
        else if(tab==='invest') renderInvestments();
        else if(tab==='khata') renderKhataPartyList();
    };

    // ============================================================
    // WEEKLY REVIEW AUTO-PROMPT (Sunday evening)
    // ============================================================
    function checkWeeklyReview() {
        const now = new Date();
        if(now.getDay() === 0 && now.getHours() >= 18) {
            const lastReview = localStorage.getItem('lastWeeklyReview');
            const thisWeek = getTodayStr();
            if(lastReview !== thisWeek) {
                localStorage.setItem('lastWeeklyReview', thisWeek);
                setTimeout(() => {
                    showToast('Weekly review time! Check your Report for insights.', 'info');
                }, 5000);
            }
        }
    }

    // ============================================================
    // SMART REMINDERS (Pre-alarm notifications in browser)
    // ============================================================
    function checkPreAlarmNotifications() {
        if(Notification.permission !== 'granted') return;
        const reminders = safeStorage('reminders', []);
        const now = new Date().getTime();
        let changed = false;
        reminders.filter(r => r.status !== 'completed' && !r.archived && r.preAlarm > 0 && !r.preNotified).forEach(r => {
            const taskTime = new Date(r.time).getTime();
            const preMs = r.preAlarm * 60000;
            if(now >= taskTime - preMs && now < taskTime) {
                showPushNotification('Pre-reminder: ' + r.task, r.preAlarm + ' min before due time');
                r.preNotified = true;
                changed = true;
            }
        });
        // BUGFIX: r.preNotified was previously set only on this in-memory array —
        // safeStorage() re-parses localStorage fresh on every call, so the flag was
        // discarded immediately and the same notification re-fired every 60s for the
        // entire pre-alarm window. Persist it back so it actually sticks.
        if (changed) localStorage.setItem('reminders', JSON.stringify(reminders));
    }
    setInterval(checkPreAlarmNotifications, (window.APP_CONFIG && window.APP_CONFIG.INTERVALS.PRE_ALARM_CHECK_MS) || 60000);
    setInterval(checkWeeklyReview, (window.APP_CONFIG && window.APP_CONFIG.INTERVALS.WEEKLY_REVIEW_CHECK_MS) || 3600000);


    // ============================================================
    // NEXT TASK WIDGET
    // ============================================================
    function updateNextTaskWidget() {
        const reminders = safeStorage('reminders', []);
        const now = new Date();
        const upcoming = reminders
            .filter(r => r.status !== 'completed' && !r.archived && r.time && new Date(r.time) > now)
            .sort((a,b) => new Date(a.time) - new Date(b.time));
        const nameEl = document.getElementById('nextTaskName');
        const timeEl = document.getElementById('nextTaskTime');
        if(!nameEl || !timeEl) return;
        if(!upcoming.length) {
            nameEl.innerText = 'All clear!';
            timeEl.innerText = 'No upcoming tasks';
            return;
        }
        const next = upcoming[0];
        const dt = new Date(next.time);
        const mins = Math.round((dt - now) / 60000);
        nameEl.innerText = next.task;
        if(mins < 60) timeEl.innerText = 'in ' + mins + ' min';
        else if(mins < 1440) timeEl.innerText = 'in ' + Math.round(mins/60) + 'h';
        else timeEl.innerText = dt.toLocaleDateString('en-IN',{day:'2-digit',month:'short'});
    }

    // ============================================================
    // DAILY CHALLENGE
    // ============================================================
    const CHALLENGES = [
        {icon:'💧', title:'Hydration Hero', desc:'Drink 8 glasses of water today and log your sleep tonight.'},
        {icon:'📵', title:'Phone-Free Hour', desc:'Put your phone away for 1 full hour and focus on one important task.'},
        {icon:'🏃', title:'Move It!', desc:'Do 20 minutes of physical activity today — walk, run, or stretch.'},
        {icon:'📝', title:'Brain Dump', desc:'Write 3 things you are grateful for and 3 goals for the week.'},
        {icon:'🍎', title:'Eat Clean', desc:'Eat one fully healthy meal today with no junk food.'},
        {icon:'📚', title:'Learn Something', desc:'Read for 20 minutes or watch one educational video today.'},
        {icon:'🤝', title:'Connect', desc:'Call or message someone you have not spoken to in a while.'},
        {icon:'🧘', title:'Mindfulness', desc:'Meditate for 10 minutes and track your mood at the end of the day.'},
        {icon:'🎯', title:'Focus Sprint', desc:'Complete 3 tasks from your list before checking social media.'},
        {icon:'💤', title:'Sleep Champion', desc:'Be in bed by 10 PM tonight and get 8 hours of sleep.'},
        {icon:'💰', title:'Save Mode', desc:'Track every expense today and skip one unnecessary purchase.'},
        {icon:'🔥', title:'Habit Streak', desc:'Check in on all your habits before the day ends.'},
        {icon:'🧹', title:'Declutter', desc:'Clean one room, drawer, or digital folder completely.'},
        {icon:'⏰', title:'Early Bird', desc:'Wake up 30 minutes earlier than usual and plan your day.'},
        {icon:'🌟', title:'Compliment', desc:'Give 3 genuine compliments to people around you today.'},
    ];

    function generateDailyChallenge() {
        const todayIdx = new Date().getDate() % CHALLENGES.length;
        const challenge = CHALLENGES[todayIdx];
        const iconEl = document.getElementById('challengeIcon');
        const titleEl = document.getElementById('challengeTitle');
        const descEl = document.getElementById('challengeDesc');
        const statusEl = document.getElementById('challengeStatus');
        const widgetEl = document.getElementById('dailyChallengeText');
        if(iconEl) iconEl.innerText = challenge.icon;
        if(titleEl) titleEl.innerText = challenge.title;
        if(descEl) descEl.innerText = challenge.desc;
        if(widgetEl) widgetEl.innerText = challenge.icon + ' ' + challenge.title;
        const done = localStorage.getItem('challenge_' + getTodayStr()) === 'done';
        if(statusEl) statusEl.innerText = done ? 'Completed today! +50 XP earned' : '';
    }

    function openDailyChallengeModal() {
        generateDailyChallenge();
        openModal('dailyChallengeModal');
    }

    function markChallengeComplete() {
        const key = 'challenge_' + getTodayStr();
        if(localStorage.getItem(key) === 'done') return showToast('Already completed today!', 'info');
        localStorage.setItem(key, 'done');
        const statusEl = document.getElementById('challengeStatus');
        if(statusEl) statusEl.innerText = 'Completed today! +50 XP earned';
        let xp = parseInt(localStorage.getItem('habitXP_tasks') || '0') + 5;
        localStorage.setItem('habitXP_tasks', xp);
        hapticFeedback('success');
        showToast('Challenge complete! +50 XP', 'success');
        syncToCloud();
    }

    // ============================================================
    // FOCUS MODE
    // ============================================================
    let focusTimerInterval = null;
    let focusTimeLeft = 1500;
    let focusRunning = false;

    function openFocusMode(taskName) {
        const overlay = document.getElementById('focusModeOverlay');
        const taskEl = document.getElementById('focusModeTask');
        if(!overlay) return;
        focusTimeLeft = 1500;
        focusRunning = false;
        if(taskEl) taskEl.innerText = taskName || 'Focus Session';
        updateFocusDisplay();
        overlay.style.display = 'flex';
        hapticFeedback('medium');
        // Try to request wake lock
        if(navigator.wakeLock) navigator.wakeLock.request('screen').catch(()=>{});
    }

    function exitFocusMode() {
        clearInterval(focusTimerInterval);
        focusRunning = false;
        const overlay = document.getElementById('focusModeOverlay');
        if(overlay) overlay.style.display = 'none';
        hapticFeedback('light');
    }

    function toggleFocusTimer() {
        const btn = document.getElementById('focusStartBtn');
        if(focusRunning) {
            clearInterval(focusTimerInterval);
            focusRunning = false;
            if(btn) btn.innerText = 'Resume';
        } else {
            focusRunning = true;
            if(btn) btn.innerText = 'Pause';
            focusTimerInterval = setInterval(() => {
                focusTimeLeft--;
                updateFocusDisplay();
                if(focusTimeLeft <= 0) {
                    clearInterval(focusTimerInterval);
                    focusRunning = false;
                    const taskEl = document.getElementById('focusModeTask');
                    logPomoSession(taskEl?.innerText || 'Focus Session', 25);
                    hapticFeedback('success');
                    playAlarm();
                    showToast('Focus session complete! 25 min logged', 'success');
                    setTimeout(exitFocusMode, 3000);
                }
            }, 1000);
        }
    }

    function updateFocusDisplay() {
        const el = document.getElementById('focusModeTimer');
        if(el) {
            const m = String(Math.floor(focusTimeLeft/60)).padStart(2,'0');
            const s = String(focusTimeLeft%60).padStart(2,'0');
            el.innerText = m + ':' + s;
        }
    }

    // ============================================================
    // RECURRING EXPENSES
    // ============================================================
    function getRecurringExps() { return safeStorage('recurringExps', []); }
    function saveRecurringExps(d) { localStorage.setItem('recurringExps', JSON.stringify(d)); syncToCloud(); }

    function openRecurringExpModal() { renderRecurringExpList(); openModal('recurringExpModal'); }

    function addRecurringExpense() {
        const name = document.getElementById('recExpName').value.trim();
        const amt = Number(document.getElementById('recExpAmt').value);
        const cat = document.getElementById('recExpCat').value;
        const freq = document.getElementById('recExpFreq').value;
        if(!name || !amt) return showToast('Enter name & amount!', 'error');
        const exps = getRecurringExps();
        exps.unshift({id:Date.now(), name, amount:amt, category:cat, freq, lastProcessed:null});
        saveRecurringExps(exps);
        renderRecurringExpList();
        document.getElementById('recExpName').value = '';
        document.getElementById('recExpAmt').value = '';
        hapticFeedback('success');
        showToast('Recurring expense added!', 'success');
    }

    function renderRecurringExpList() {
        const c = document.getElementById('recurringExpList'); if(!c) return;
        const exps = getRecurringExps();
        c.innerHTML = exps.map(e => `
            <div class="bill-item">
                <div><b style="font-size:13px">${sanitizeHTML(e.name||'')}</b><br>
                    <span style="font-size:11px;color:#8e8e93">${sanitizeHTML(e.category||'')} · Rs ${Number(e.amount).toLocaleString('en-IN')} · ${e.freq}</span>
                    ${e.lastProcessed ? '<br><span style="font-size:11px;color:#8e8e93">Last: '+e.lastProcessed+'</span>' : ''}
                </div>
                <button onclick="deleteRecurringExp(${e.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px;">X</button>
            </div>`).join('') || '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No recurring expenses.</p>';
    }

    function deleteRecurringExp(id) {
        saveRecurringExps(getRecurringExps().filter(x => x.id !== id));
        renderRecurringExpList();
    }

    function processRecurringExpenses() {
        const exps = getRecurringExps();
        const today = getTodayStr();
        let processed = 0;
        exps.forEach(e => {
            const last = e.lastProcessed;
            let shouldProcess = false;
            if(!last) { shouldProcess = true; }
            else {
                const lastDate = new Date(last);
                const now = new Date(today);
                const diffDays = Math.floor((now - lastDate) / 86400000);
                if(e.freq === 'daily' && diffDays >= 1) shouldProcess = true;
                else if(e.freq === 'weekly' && diffDays >= 7) shouldProcess = true;
                else if(e.freq === 'monthly' && diffDays >= 28) shouldProcess = true;
            }
            if(shouldProcess) {
                addExpenseEntry(e.name, e.amount, e.category, today);
                e.lastProcessed = today;
                processed++;
            }
        });
        saveRecurringExps(exps);
        renderRecurringExpList();
        renderFinanceDashboard();
        hapticFeedback(processed > 0 ? 'success' : 'light');
        showToast(processed > 0 ? processed + ' recurring expense(s) processed!' : 'No expenses due today.', processed > 0 ? 'success' : 'info');
    }

    function addExpenseEntry(name, amount, category, date) {
        const d = getFinData();
        d.expenses.unshift({id:Date.now(), name, amount, category, date, type:'expense', note:'Auto-recurring'});
        saveFinData(d);
    }

    // ============================================================
    // MORE PAGE - ADD REMAINING TILES (via JS patch)
    // ============================================================
    function openFocusModeFromHome() {
        const reminders = safeStorage('reminders', []);
        const next = reminders.filter(r => r.status !== 'completed' && !r.archived).sort((a,b) => new Date(a.time)-new Date(b.time))[0];
        openFocusMode(next?.task || 'Focus Session');
    }

    // ============================================================
    // INIT PATCHES ON APP READY
    // ============================================================
    // Update next task widget whenever reminders load
    const _origLoadRem = loadReminders;
    loadReminders = function(...args) {
        const result = _origLoadRem.apply(this, args);
        setTimeout(updateNextTaskWidget, 200);
        return result;
    };

    // Generate challenge on home page load
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            generateDailyChallenge();
            updateNextTaskWidget();
        }, 1000);
    });

    // Wire Recurring Expense tile on More page
    document.addEventListener('DOMContentLoaded', () => {
        // Add Focus Mode and Recurring tiles dynamically if not already present
        const moreGrid = document.querySelector('#page-more .features-grid');
        if(moreGrid && !document.getElementById('focusModeTile')) {
            const tiles = [
                {id:'focusModeTile', icon:'🎯', label:'Focus Mode', fn:'openFocusModeFromHome()'},
                {id:'recurringExpTile', icon:'🔁', label:'Recurring Exp', fn:'openRecurringExpModal()'},
                {id:'habitAITile', icon:'🤖', label:'Habit AI', fn:'openHabitAIModal()'},
            ];
            tiles.forEach(t => {
                const div = document.createElement('div');
                div.className = 'feature-tile';
                div.id = t.id;
                div.setAttribute('onclick', t.fn);
                div.innerHTML = '<span class="ft-icon">'+t.icon+'</span><span class="ft-label">'+t.label+'</span>';
                moreGrid.appendChild(div);
            });
        }
    });

    // ============================================================
    // HABIT AI RECOMMENDATIONS MODAL
    // ============================================================
    function openHabitAIModal() {
        openModal('aiRecommendModal');
        getAIRecommend('habits');
    }

    // ============================================================
    // MONTHLY FINANCE SUMMARY
    // ============================================================
    function renderMonthlyFinanceSummary() {
        const d = getFinData();
        const now = new Date();
        const ms = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
        const mExp = d.expenses.filter(e=>e.date?.startsWith(ms)).reduce((s,e)=>s+Number(e.amount),0);
        const mInc = d.income.filter(e=>e.date?.startsWith(ms)).reduce((s,e)=>s+Number(e.amount),0);
        const emiTotal = d.emis.reduce((s,e)=>s+Number(e.amount),0);
        const savings = Math.max(0, mInc - mExp - emiTotal);
        const savingRate = mInc > 0 ? Math.round((savings/mInc)*100) : 0;
        return {mExp, mInc, emiTotal, savings, savingRate, month:ms};
    }

    // Wire monthly summary to finance dashboard
    // renderFinanceDashboard already includes monthly summary - no override needed


    // ============================================================
    // WARRANTY TRACKER
    // ============================================================
    function getWarranties() { return safeStorage('warranties', []); }
    function saveWarranties(d) { localStorage.setItem('warranties', JSON.stringify(d)); syncToCloud(); }

    function openWarrantyModal() { renderWarrantyList(); openModal('warrantyModal'); }

    function addWarranty() {
        const item = document.getElementById('warrItemInput').value.trim();
        const cat = document.getElementById('warrCatInput').value;
        const purchaseDate = document.getElementById('warrPurchaseInput').value;
        const months = Number(document.getElementById('warrMonthsInput').value);
        const seller = document.getElementById('warrSellerInput').value.trim();
        const price = Number(document.getElementById('warrPriceInput').value) || 0;
        if(!item || !purchaseDate || !months) return showToast('Enter product, purchase date & warranty months!', 'error');

        const expiry = new Date(purchaseDate);
        expiry.setMonth(expiry.getMonth() + months);
        const expiryStr = formatDateLocal(expiry);

        const list = getWarranties();
        const id = Date.now();
        list.unshift({ id, item, cat, purchaseDate, months, seller, price, expiry: expiryStr });
        saveWarranties(list);

        // Add expiry reminder 30 days before
        const remindDate = new Date(expiry); remindDate.setDate(remindDate.getDate() - 30);
        if(remindDate > new Date()) {
            let reminders = safeStorage('reminders', []);
            reminders.push({
                id: Date.now()+1, task: 'Warranty expiring: ' + item, notes: 'Warranty ends ' + expiryStr,
                time: formatDateLocal(remindDate) + 'T10:00', priority: 'medium', repeat: 'none',
                status: 'pending', notified: false, pinned: false, tags: 'warranty', preAlarm: 0,
                category: { name: 'Warranty', icon: '🛡️' }
            });
            localStorage.setItem('reminders', JSON.stringify(reminders));
            loadReminders();
        }

        document.getElementById('warrItemInput').value = '';
        document.getElementById('warrMonthsInput').value = '';
        document.getElementById('warrSellerInput').value = '';
        document.getElementById('warrPriceInput').value = '';
        renderWarrantyList();
        hapticFeedback('success');
        showToast('Warranty added! Reminder set 30d before expiry 🛡️', 'success');
    }

    function renderWarrantyList() {
        const c = document.getElementById('warrantyList'); if(!c) return;
        const list = getWarranties();
        const today = getTodayStr();
        const sorted = [...list].sort((a,b) => a.expiry.localeCompare(b.expiry));
        c.innerHTML = sorted.map(w => {
            const daysLeft = Math.ceil((new Date(w.expiry) - new Date(today)) / 86400000);
            let cls = 'warranty-card';
            let statusText = '';
            if(daysLeft < 0) { cls += ' warranty-expired'; statusText = 'Expired ' + Math.abs(daysLeft) + 'd ago'; }
            else if(daysLeft <= 30) { cls += ' warranty-urgent'; statusText = daysLeft + 'd left — expiring soon!'; }
            else if(daysLeft <= 90) { cls += ' warranty-soon'; statusText = daysLeft + 'd left'; }
            else { statusText = daysLeft + 'd left'; }
            return `<div class="${cls}">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <div>
                        <b style="font-size:13px;">${sanitizeHTML(w.cat||'')} ${sanitizeHTML(w.item||'')}</b><br>
                        <span style="font-size:11px;color:#8e8e93;">Expires: ${w.expiry} · ${statusText}</span>
                        ${w.seller ? `<br><span style="font-size:11px;color:#8e8e93;">Seller: ${sanitizeHTML(w.seller)}</span>` : ''}
                        ${w.price ? `<br><span style="font-size:11px;color:#8e8e93;">Price: Rs ${w.price.toLocaleString('en-IN')}</span>` : ''}
                    </div>
                    <button onclick="deleteWarranty(${w.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px;">✖</button>
                </div>
            </div>`;
        }).join('') || '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px;">No warranties tracked yet.</p>';
    }

    function deleteWarranty(id) {
        saveWarranties(getWarranties().filter(w => w.id !== id));
        renderWarrantyList();
    }

    // ============================================================
    // LOAN EMI CALCULATOR
    // ============================================================
    let lastCalculatedEMI = null;

    function openEMICalcModal() {
        document.getElementById('emiCalcAmount').value = '';
        document.getElementById('emiCalcRate').value = '';
        document.getElementById('emiCalcTenure').value = '';
        document.getElementById('emiCalcResult').innerHTML = '';
        lastCalculatedEMI = null;
        openModal('emiCalcModal');
    }

    function calculateLoanEMI() {
        const P = Number(document.getElementById('emiCalcAmount').value);
        const annualRate = Number(document.getElementById('emiCalcRate').value);
        const years = Number(document.getElementById('emiCalcTenure').value);
        if(!P || !annualRate || !years) return showToast('Fill all fields!', 'error');

        const r = annualRate / 12 / 100;
        const n = Math.round(years * 12);
        const emi = (P * r * Math.pow(1+r, n)) / (Math.pow(1+r, n) - 1);
        const totalPayment = emi * n;
        const totalInterest = totalPayment - P;

        lastCalculatedEMI = { amount: Math.round(emi), principal: P, rate: annualRate, months: n };

        const el = document.getElementById('emiCalcResult');
        if(el) el.innerHTML = `
            <div class="emi-result-card">
                <p style="margin:0;font-size:11px;opacity:0.85;text-transform:uppercase;letter-spacing:0.5px;">Monthly EMI</p>
                <h2 style="margin:6px 0 0;font-size:32px;">Rs ${Math.round(emi).toLocaleString('en-IN')}</h2>
                <div class="emi-result-grid">
                    <div><p style="margin:0;font-size:10px;opacity:0.8;">Principal</p><p style="margin:2px 0 0;font-weight:700;font-size:14px;">Rs ${P.toLocaleString('en-IN')}</p></div>
                    <div><p style="margin:0;font-size:10px;opacity:0.8;">Total Interest</p><p style="margin:2px 0 0;font-weight:700;font-size:14px;">Rs ${Math.round(totalInterest).toLocaleString('en-IN')}</p></div>
                    <div><p style="margin:0;font-size:10px;opacity:0.8;">Total Payment</p><p style="margin:2px 0 0;font-weight:700;font-size:14px;">Rs ${Math.round(totalPayment).toLocaleString('en-IN')}</p></div>
                    <div><p style="margin:0;font-size:10px;opacity:0.8;">Tenure</p><p style="margin:2px 0 0;font-weight:700;font-size:14px;">${n} months</p></div>
                </div>
            </div>
            <button onclick="addCalculatedEMIToTracker()" style="background:#34c759;color:white;border:none;border-radius:10px;padding:12px;width:100%;font-weight:700;cursor:pointer;margin-top:12px;">+ Add to My EMI Tracker</button>
        `;
        hapticFeedback('success');
    }

    function addCalculatedEMIToTracker() {
        if(!lastCalculatedEMI) return;
        const name = prompt('Name this loan (e.g. Home Loan, Car Loan):', 'Loan');
        if(!name) return;
        const d = getFinData();
        d.emis.unshift({ id: Date.now(), name, amount: lastCalculatedEMI.amount, due: '1', monthsLeft: lastCalculatedEMI.months });
        saveFinData(d);
        hapticFeedback('success');
        showToast('Added to EMI Tracker! 🎉', 'success');
        closeModal('emiCalcModal');
        switchPage('finance');
        setTimeout(() => setFinTab('emi'), 200);
    }

    // ============================================================
    // VEHICLE LOG (Fuel/Service/Repair expense tracking)
    // ============================================================
    function getVehicleLogs() { return safeStorage('vehicleLogs', []); }
    function saveVehicleLogs(d) { localStorage.setItem('vehicleLogs', JSON.stringify(d)); syncToCloud(); }

    function setVehTab(tab) {
        document.querySelectorAll('#vehicleModal .cal-view-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('vehtab-' + tab).classList.add('active');
        document.getElementById('vehTabReminders').style.display = tab === 'reminders' ? 'block' : 'none';
        document.getElementById('vehTabLog').style.display = tab === 'log' ? 'block' : 'none';
        if(tab === 'log') renderVehicleLogList();
    }

    function addVehicleLog() {
        const veh = document.getElementById('vlogVehInput').value.trim();
        const type = document.getElementById('vlogTypeInput').value;
        const cost = Number(document.getElementById('vlogCostInput').value);
        const odo = Number(document.getElementById('vlogOdoInput').value) || null;
        const date = document.getElementById('vlogDateInput').value || getTodayStr();
        if(!veh || !cost) return showToast('Enter vehicle & cost!', 'error');

        const logs = getVehicleLogs();
        logs.unshift({ id: Date.now(), veh, type, cost, odo, date });
        saveVehicleLogs(logs);

        document.getElementById('vlogVehInput').value = '';
        document.getElementById('vlogCostInput').value = '';
        document.getElementById('vlogOdoInput').value = '';
        renderVehicleLogList();
        hapticFeedback('success');
        showToast('Log entry added! 📒', 'success');
    }

    function renderVehicleLogList() {
        const c = document.getElementById('vehicleLogList'); if(!c) return;
        const logs = getVehicleLogs();
        const summaryEl = document.getElementById('vlogSummary');
        const totalCost = logs.reduce((s,l) => s + Number(l.cost), 0);
        const fuelCost = logs.filter(l => l.type.includes('Fuel')).reduce((s,l) => s + Number(l.cost), 0);
        if(summaryEl) summaryEl.innerHTML = `<b style="font-size:14px;">Total Spent: Rs ${totalCost.toLocaleString('en-IN')}</b><br><span style="font-size:11px;color:#8e8e93;">Fuel: Rs ${fuelCost.toLocaleString('en-IN')} · ${logs.length} entries</span>`;

        c.innerHTML = logs.slice(0,30).map(l => `
            <div class="vlog-item">
                <div><b style="font-size:13px;">${sanitizeHTML(l.type||'')} ${sanitizeHTML(l.veh||'')}</b><br>
                    <span style="font-size:11px;color:#8e8e93;">${l.date}${l.odo ? ' · '+l.odo.toLocaleString('en-IN')+' km' : ''}</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-weight:700;color:#ff3b30;">Rs ${Number(l.cost).toLocaleString('en-IN')}</span>
                    <button onclick="deleteVehicleLog(${l.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px;">✖</button>
                </div>
            </div>`).join('') || '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px;">No log entries yet.</p>';
    }

    function deleteVehicleLog(id) {
        saveVehicleLogs(getVehicleLogs().filter(l => l.id !== id));
        renderVehicleLogList();
    }


    // ============================================================
