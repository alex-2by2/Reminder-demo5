// Custom automation rules engine, in-app notification centre.
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".

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
        if(!rules.length) { el.innerHTML=emptyStateHTML('⚡', 'No custom rules yet.'); return; }
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
        }).join('') || emptyStateHTML('🔔', 'No notifications yet.');

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
