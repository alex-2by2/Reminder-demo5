// Weekly planner, task statistics modal, duplicate/copy task.
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".
    // WEEKLY PLANNER
    // ============================================================
    let weeklyPlannerSelectedDate = getTodayStr();

    function openWeeklyPlanner() {
        renderWeeklyPlanner();
        openModal('weeklyPlannerModal');
    }

    function renderWeeklyPlanner() {
        const grid = document.getElementById('weeklyPlannerGrid');
        const tasksEl = document.getElementById('weeklyPlannerTasks');
        if (!grid || !tasksEl) return;

        const today = new Date(); today.setHours(0,0,0,0);
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday

        const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const reminders = safeStorage('reminders', []);
        const colors = ['#ff3b30','#ff9500','#34c759','#007aff','#5e5ce6','#ff2d55','#af52de'];

        grid.innerHTML = '';
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i);
            const dStr = formatDateLocal(d);
            const taskCount = reminders.filter(r => r.time?.startsWith(dStr) && r.status !== 'completed').length;
            const isToday = dStr === getTodayStr();
            const isSelected = dStr === weeklyPlannerSelectedDate;

            const btn = document.createElement('div');
            btn.onclick = () => { weeklyPlannerSelectedDate = dStr; renderWeeklyPlanner(); };
            btn.style.cssText = `text-align:center;padding:8px 4px;border-radius:12px;cursor:pointer;background:${isSelected ? 'var(--primary)' : isToday ? '#e5f1ff' : '#f2f2f7'};color:${isSelected ? 'white' : '#1c1c1e'};border:${isToday && !isSelected ? '2px solid var(--primary)' : '2px solid transparent'};`;
            btn.innerHTML = `<div style="font-size:9px;font-weight:700;opacity:${isSelected?1:0.7};text-transform:uppercase;">${dayNames[i]}</div><div style="font-size:18px;font-weight:800;margin:2px 0;">${d.getDate()}</div>${taskCount > 0 ? `<div style="font-size:8px;background:${isSelected?'rgba(255,255,255,0.3)':colors[i]};color:white;border-radius:6px;padding:1px 4px;font-weight:700;">${taskCount}</div>` : '<div style="height:14px;"></div>'}`;
            grid.appendChild(btn);
        }

        // Show tasks for selected date
        const dayTasks = reminders.filter(r => r.time?.startsWith(weeklyPlannerSelectedDate)).sort((a,b) => new Date(a.time)-new Date(b.time));
        const selectedDt = new Date(weeklyPlannerSelectedDate + 'T00:00:00');
        const selectedLabel = selectedDt.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'});

        tasksEl.innerHTML = `<h5 style="font-size:13px;font-weight:700;margin:8px 0 10px;">${selectedLabel}</h5>` +
            (dayTasks.length ? dayTasks.map(t => `
                <div style="display:flex;align-items:center;gap:10px;padding:10px;background:#f2f2f7;border-radius:12px;margin-bottom:8px;border-left:4px solid ${t.priority==='high'?'#ff3b30':t.priority==='low'?'#34c759':'#ff9500'};">
                    <input type="checkbox" ${t.status==='completed'?'checked':''} onchange="toggleStatus(${t.id}); renderWeeklyPlanner();" style="width:18px;height:18px;flex-shrink:0;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:13px;font-weight:600;${t.status==='completed'?'text-decoration:line-through;opacity:0.5':''}">${sanitizeHTML(t.task)}</div>
                        <div style="font-size:11px;color:#8e8e93;">${new Date(t.time).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                    <button onclick="editReminder(${t.id});closeModal('weeklyPlannerModal');" style="background:none;border:none;cursor:pointer;font-size:16px;opacity:0.5;">✏️</button>
                </div>`).join('')
            : emptyStateHTML('🗓️', 'No tasks for this day. Tap + to add!'));
    }

    // ============================================================
    // HABIT CALENDAR MODAL (full history view)
    // ============================================================
    let habitCalYear = new Date().getFullYear();
    let habitCalMonth = new Date().getMonth();
    let selectedHabitId = null;

    function openHabitCalendarModal() {
        const habits = safeStorage('habits', []);
        const sel = document.getElementById('habitCalSelect');
        if (sel) {
            sel.innerHTML = '<option value="">Select a habit...</option>' +
                habits.map(h => `<option value="${h.id}">${sanitizeHTML(h.name||'')}</option>`).join('');
        }
        habitCalYear = new Date().getFullYear();
        habitCalMonth = new Date().getMonth();
        renderHabitCalendarModal();
        openModal('habitCalendarModal');
    }

    function changeHabitCalMonth(dir) {
        habitCalMonth += dir;
        if (habitCalMonth > 11) { habitCalMonth = 0; habitCalYear++; }
        if (habitCalMonth < 0) { habitCalMonth = 11; habitCalYear--; }
        renderHabitCalendarModal();
    }

    function renderHabitCalendarModal() {
        const sel = document.getElementById('habitCalSelect');
        selectedHabitId = sel ? Number(sel.value) : null;
        const habits = safeStorage('habits', []);
        const habit = habits.find(h => h.id === selectedHabitId);

        const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        const displayEl = document.getElementById('habitCalMonthDisplay');
        if (displayEl) displayEl.innerText = `${monthNames[habitCalMonth]} ${habitCalYear}`;

        const grid = document.getElementById('habitCalGrid');
        const stats = document.getElementById('habitCalStats');
        if (!grid) return;

        if (!habit) {
            grid.innerHTML = '<p style="text-align:center;color:#8e8e93;font-size:13px;grid-column:span 7;">Select a habit above</p>';
            if (stats) stats.innerHTML = '';
            return;
        }

        const history = habit.history || [];
        const firstDay = new Date(habitCalYear, habitCalMonth, 1).getDay();
        const daysInMonth = new Date(habitCalYear, habitCalMonth + 1, 0).getDate();
        const todayStr = getTodayStr();

        let checkIns = 0;
        let html = '';

        // Empty cells for first day offset
        for (let i = 0; i < firstDay; i++) html += '<div></div>';

        for (let d = 1; d <= daysInMonth; d++) {
            const dStr = `${habitCalYear}-${String(habitCalMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const done = history.includes(dStr) || (habit.lastCheckIn === dStr);
            const isToday = dStr === todayStr;
            const isFuture = dStr > todayStr;
            if (done) checkIns++;

            html += `<div style="aspect-ratio:1;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;cursor:pointer;${
                done ? 'background:var(--primary);color:white;' :
                isToday ? 'background:#e5f1ff;color:var(--primary);border:2px solid var(--primary);' :
                isFuture ? 'background:#f2f2f7;color:#c7c7cc;' :
                'background:#ffe5e5;color:#ff3b30;'
            }" onclick="toggleHabitDayManual('${dStr}','${habit.id}')">${d}</div>`;
        }
        grid.innerHTML = html;

        const rate = Math.round((checkIns / Math.max(1, daysInMonth - (daysInMonth - Math.min(daysInMonth, new Date().getDate())))) * 100);
        if (stats) stats.innerHTML = `
            <div class="stat-box"><div class="stat-num" style="color:var(--primary);">${checkIns}</div><div class="stat-lbl">Check-ins</div></div>
            <div class="stat-box"><div class="stat-num" style="color:#34c759;">${habit.streak||0}🔥</div><div class="stat-lbl">Streak</div></div>
            <div class="stat-box"><div class="stat-num" style="color:#ff9500;">${rate}%</div><div class="stat-lbl">Rate</div></div>`;
    }

    function toggleHabitDayManual(dateStr, habitId) {
        if (dateStr > getTodayStr()) return showToast("Can't mark future dates!", 'error');
        const habits = safeStorage('habits', []);
        const habit = habits.find(h => h.id === Number(habitId));
        if (!habit) return;
        if (!habit.history) habit.history = [];
        const idx = habit.history.indexOf(dateStr);
        if (idx > -1) habit.history.splice(idx, 1);
        else habit.history.push(dateStr);
        localStorage.setItem('habits', JSON.stringify(habits));
        syncToCloud();
        hapticFeedback('light');
        renderHabitCalendarModal();
    }

    // ============================================================
    // TASK STATISTICS MODAL
    // ============================================================
    function openTaskStatsModal() {
        renderTaskStats();
        openModal('taskStatsModal');
    }

    function renderTaskStats() {
        const el = document.getElementById('taskStatsContent');
        if (!el) return;

        const reminders = safeStorage('reminders', []);
        const now = new Date();
        const todayStr = getTodayStr();
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate()-7);
        const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

        const total = reminders.length;
        const completed = reminders.filter(r => r.status === 'completed').length;
        const overdue = reminders.filter(r => r.status !== 'completed' && r.time && new Date(r.time) < now).length;
        const thisWeek = reminders.filter(r => r.status === 'completed' && new Date(r.time||r.id) >= weekAgo).length;
        const thisMonth = reminders.filter(r => r.time?.startsWith(monthStr) && r.status === 'completed').length;
        const rate = total ? Math.round((completed/total)*100) : 0;

        // Priority breakdown
        const highTotal = reminders.filter(r => r.priority==='high').length;
        const highDone = reminders.filter(r => r.priority==='high' && r.status==='completed').length;
        const medTotal = reminders.filter(r => r.priority==='medium'||!r.priority).length;
        const medDone = reminders.filter(r => (r.priority==='medium'||!r.priority) && r.status==='completed').length;

        // Category breakdown (top 5)
        const cats = {};
        reminders.forEach(r => { const c = r.category?.name || 'Task'; cats[c] = (cats[c]||0)+1; });
        const topCats = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,5);

        // Most productive day
        const dayCount = [0,0,0,0,0,0,0];
        reminders.filter(r => r.status==='completed').forEach(r => {
            if (r.time) dayCount[new Date(r.time).getDay()]++;
        });
        const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const bestDay = dayNames[dayCount.indexOf(Math.max(...dayCount))];

        el.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;">
                <div class="stat-box"><div class="stat-num">${total}</div><div class="stat-lbl">Total Tasks</div></div>
                <div class="stat-box"><div class="stat-num" style="color:#34c759;">${completed}</div><div class="stat-lbl">Completed</div></div>
                <div class="stat-box"><div class="stat-num" style="color:#ff3b30;">${overdue}</div><div class="stat-lbl">Overdue</div></div>
                <div class="stat-box"><div class="stat-num" style="color:#ff9500;">${rate}%</div><div class="stat-lbl">Success Rate</div></div>
            </div>

            <div style="background:#f2f2f7;border-radius:14px;padding:14px;margin-bottom:15px;">
                <h5 style="font-size:11px;color:#8e8e93;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;margin:0 0 10px;">This Period</h5>
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e5e5ea;"><span style="font-size:13px;">This Week</span><b>${thisWeek} done</b></div>
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e5e5ea;"><span style="font-size:13px;">This Month</span><b>${thisMonth} done</b></div>
                <div style="display:flex;justify-content:space-between;padding:6px 0;"><span style="font-size:13px;">Best Day</span><b>${bestDay} 🌟</b></div>
            </div>

            <div style="background:#f2f2f7;border-radius:14px;padding:14px;margin-bottom:15px;">
                <h5 style="font-size:11px;color:#8e8e93;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;margin:0 0 10px;">By Priority</h5>
                <div style="margin-bottom:8px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:12px;font-weight:700;">🔴 High</span><span style="font-size:12px;color:#8e8e93;">${highDone}/${highTotal}</span></div>
                    <div style="background:#e5e5ea;border-radius:6px;height:6px;"><div style="background:#ff3b30;border-radius:6px;height:100%;width:${highTotal?Math.round(highDone/highTotal*100):0}%;"></div></div>
                </div>
                <div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:12px;font-weight:700;">🟡 Medium</span><span style="font-size:12px;color:#8e8e93;">${medDone}/${medTotal}</span></div>
                    <div style="background:#e5e5ea;border-radius:6px;height:6px;"><div style="background:#ff9500;border-radius:6px;height:100%;width:${medTotal?Math.round(medDone/medTotal*100):0}%;"></div></div>
                </div>
            </div>

            <div style="background:#f2f2f7;border-radius:14px;padding:14px;">
                <h5 style="font-size:11px;color:#8e8e93;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;margin:0 0 10px;">Top Categories</h5>
                ${topCats.map(([cat, count]) => `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e5e5ea;font-size:13px;"><span>${cat}</span><b>${count} tasks</b></div>`).join('')}
            </div>`;
    }

    // ============================================================
    // DUPLICATE / COPY TASK
    // ============================================================
    function duplicateTask(id) {
        const reminders = safeStorage('reminders', []);
        const original = reminders.find(r => r.id === id);
        if (!original) return showToast('Task not found!', 'error');
        const copy = { ...original, id: Date.now(), task: original.task + ' (copy)', status: 'pending', notified: false, pinned: false };
        reminders.unshift(copy);
        localStorage.setItem('reminders', JSON.stringify(reminders));
        loadReminders();
        syncToCloud();
        hapticFeedback('success');
        showToast('Task duplicated! ✅', 'success');
    }

    // ============================================================
    // KEYBOARD SHORTCUTS (global)
    // ============================================================
    document.addEventListener('keydown', e => {
        if (['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
        if (e.key === '/' || (e.key === 'f' && !e.ctrlKey)) { e.preventDefault(); openGlobalSearch(); }
        if (e.key === 'n' && !e.ctrlKey) { e.preventDefault(); switchPage('add'); }
        if (e.key === 'h') switchPage('home');
        if (e.key === 'm') switchPage('more');
        if (e.key === 'Escape') closeAllModals();
        if (e.key === '1') changeTab('upcoming');
        if (e.key === '2') changeTab('today');
        if (e.key === '3') changeTab('done');
        if (e.key === '4') changeTab('all');
    });

    // ============================================================
    // SHARE TASK (native share API)
    // ============================================================
    function shareTask(id) {
        const reminders = safeStorage('reminders', []);
        const task = reminders.find(r => r.id === id);
        if (!task) return;
        const text = `Task: ${task.task}\nDue: ${task.time ? new Date(task.time).toLocaleString('en-IN') : 'No date'}\nPriority: ${task.priority||'medium'}`;
        if (navigator.share) {
            navigator.share({ title: 'Shared Task', text }).catch(()=>{});
        } else {
            navigator.clipboard?.writeText(text).then(() => showToast('Task copied to clipboard!', 'success'));
        }
    }

    // ============================================================
    // SWIPE TO COMPLETE (touch gesture on task cards)
    // ============================================================
    function addSwipeToComplete(element, taskId) {
        let startX = 0;
        element.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
        element.addEventListener('touchend', e => {
            const diff = e.changedTouches[0].clientX - startX;
            if (diff > 80) { toggleStatus(taskId); hapticFeedback('success'); }
            else if (diff < -80) { togglePin(taskId); hapticFeedback('light'); }
        }, { passive: true });
    }

