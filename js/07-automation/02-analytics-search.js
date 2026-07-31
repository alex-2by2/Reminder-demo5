// Savings goals, study analytics charts, global search (Cmd/Ctrl+K style), task dependencies.
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".
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
        }).join('') || emptyStateHTML('🎯', 'No savings goals yet.');
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

        if(!results.length) { container.innerHTML = emptyStateHTML('🔍', 'No results found for "' + q + '"'); return; }
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
            </div>`).join('') || emptyStateHTML('🔗', 'No dependencies set.');
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
