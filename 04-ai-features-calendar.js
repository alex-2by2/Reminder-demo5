// Gemini AI chat assistant/planner/reschedule, Family calendar, Productivity heatmap, Habit detail (calendar/graph/score), AI priority suggestion/auto-categorization/goal prediction, Kanban board, Project milestones/Gantt, Shared workspace.

    // BATCH 2 — AI CHAT ASSISTANT / DAILY PLANNER / SMART RESCHEDULE
    // ============================================================
    async function callGeminiAI(prompt) {
        if (!currentUser) throw new Error("Please sign in to use AI features.");
        try {
            const callProxy = functions.httpsCallable('callGeminiProxy');
            const result = await callProxy({ prompt });
            return result.data.text;
        } catch (e) {
            if (e.code === 'resource-exhausted') throw new Error(e.message);
            throw new Error(e.message || "AI request failed.");
        }
    }

    function appendChatBubble(text, sender) {
        const container = document.getElementById('aiChatMessages');
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${sender}`;
        bubble.innerText = text;
        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;
        return bubble;
    }

    function buildAIContext() {
        const reminders = safeStorage('reminders', []);
        const habits = safeStorage('habits', []);
        const todayStr = getTodayStr();
        const pending = reminders.filter(r => r.status !== 'completed' && !r.archived);
        const todayTasks = pending.filter(r => r.time.split('T')[0] === todayStr);
        const overdue = pending.filter(r => new Date(r.time) < new Date());
        const moodLog = safeStorage('moodLog', {});
        const sleepLog = safeStorage('sleepLog', {});
        const moodLabels = ['Great 😄','Good 😊','Okay 😐','Sad 😔','Bad 😢'];

        let ctx = `You are a friendly productivity assistant inside "${userName}"'s reminder app. Today is ${todayStr}.\n`;
        ctx += `Today's tasks (${todayTasks.length}): ${todayTasks.map(t=>t.task).join(', ') || 'none'}\n`;
        ctx += `Overdue tasks (${overdue.length}): ${overdue.map(t=>t.task).join(', ') || 'none'}\n`;
        ctx += `Total pending tasks: ${pending.length}\n`;
        ctx += `Habits: ${habits.map(h=>`${h.name} (streak ${h.streak})`).join(', ') || 'none'}\n`;
        if (moodLog[todayStr] !== undefined) ctx += `Today's mood: ${moodLabels[moodLog[todayStr]]}\n`;
        if (sleepLog[todayStr] !== undefined) ctx += `Last night's sleep: ${sleepLog[todayStr]}h\n`;
        return ctx;
    }

    function openAIChat() {
        openModal('aiChatModal');
        setTimeout(() => { const el = document.getElementById('aiChatInput'); if (el) el.focus(); }, 200);
    }

    function aiHandleError(bubble, e) {
        if (!currentUser) {
            bubble.innerText = "⚠️ Please sign in to use AI features.";
            closeModal('aiChatModal');
        } else {
            bubble.innerText = "⚠️ " + e.message;
        }
    }

    async function sendAIChatMessage() {
        const input = document.getElementById('aiChatInput');
        const msg = input.value.trim();
        if (!msg) return;
        appendChatBubble(msg, 'user');
        input.value = '';
        const thinking = appendChatBubble('🤔 Thinking...', 'ai');
        try {
            const context = buildAIContext();
            const prompt = `${context}\nUser question: ${msg}\n\nAnswer briefly and helpfully (max 4 sentences), in the same language/script the user used.`;
            const reply = await callGeminiAI(prompt);
            thinking.innerText = reply;
        } catch(e) { aiHandleError(thinking, e); }
    }

    async function aiQuickAction(type) {
        if (type === 'plan') return aiPlanMyDay();
        if (type === 'reschedule') return aiFixOverdue();
        if (type === 'summary') return aiDailySummary();
    }

    async function aiPlanMyDay() {
        appendChatBubble('🪄 Plan My Day', 'user');
        const thinking = appendChatBubble('🤔 Planning your day...', 'ai');
        try {
            const reminders = safeStorage('reminders', []);
            const todayStr = getTodayStr();
            const todayTasks = reminders.filter(r => r.status !== 'completed' && !r.archived && r.time.split('T')[0] === todayStr);
            if (todayTasks.length === 0) {
                thinking.innerText = "🎉 No pending tasks for today! Enjoy your free time.";
                return;
            }
            const list = todayTasks.map(t => `- ${t.task} (priority: ${t.priority||'medium'}, time: ${t.time.split('T')[1]})`).join('\n');
            const prompt = `Here are today's pending tasks:\n${list}\n\nSuggest an optimal order/schedule to complete these today, considering priority and time. Keep it short, friendly, with emojis, max 6 lines.`;
            const reply = await callGeminiAI(prompt);
            thinking.innerText = reply;
        } catch(e) { aiHandleError(thinking, e); }
    }

    async function aiFixOverdue() {
        appendChatBubble('🔄 Fix Overdue Tasks', 'user');
        const thinking = appendChatBubble('🤔 Checking overdue tasks...', 'ai');
        try {
            let reminders = safeStorage('reminders', []);
            const now = new Date();
            const overdue = reminders.filter(r => r.status !== 'completed' && !r.archived && new Date(r.time) < now);
            if (overdue.length === 0) {
                thinking.innerText = "✅ No overdue tasks! You're all caught up.";
                return;
            }
            const list = overdue.map((t,i) => `${i+1}. ${t.task} (was due: ${new Date(t.time).toLocaleString('en-IN')})`).join('\n');
            const prompt = `Current time is ${now.toLocaleString('en-IN')}. These tasks are overdue:\n${list}\n\nFor each numbered task, suggest a new realistic time (later today or tomorrow). Reply ONLY in this exact format, one line per task, no extra text:\n1. YYYY-MM-DD HH:MM\n2. YYYY-MM-DD HH:MM`;
            const reply = await callGeminiAI(prompt);

            const lines = reply.split('\n').map(l => l.trim()).filter(Boolean);
            let applied = 0;
            lines.forEach(line => {
                const m = line.match(/(\d+)\.\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/);
                if (m) {
                    const idx = parseInt(m[1]) - 1;
                    if (overdue[idx]) {
                        const target = reminders.find(r => r.id === overdue[idx].id);
                        if (target) {
                            target.time = `${m[2]}T${m[3]}`;
                            target.notified = false;
                            applied++;
                        }
                    }
                }
            });
            if (applied > 0) {
                localStorage.setItem('reminders', JSON.stringify(reminders));
                loadReminders();
                renderHomeCalendar();
                syncToCloud();
                thinking.innerText = `✅ Rescheduled ${applied} of ${overdue.length} overdue task(s) to new times!`;
            } else {
                thinking.innerText = "⚠️ Couldn't auto-apply. Try again or reschedule manually using ✏️ Edit.";
            }
        } catch(e) { aiHandleError(thinking, e); }
    }

    async function aiDailySummary() {
        appendChatBubble('📊 Summary', 'user');
        const thinking = appendChatBubble('🤔 Summarizing...', 'ai');
        try {
            const context = buildAIContext();
            const prompt = `${context}\nGive a short, encouraging summary of my day/progress (max 3 sentences) with emojis.`;
            const reply = await callGeminiAI(prompt);
            thinking.innerText = reply;
        } catch(e) { aiHandleError(thinking, e); }
    }

    // ============================================================
    // BATCH 2 — FAMILY CALENDAR
    // ============================================================

    // ============================================================
    // BATCH 3 — PRODUCTIVITY HEATMAP
    // ============================================================
    function renderProductivityHeatmap() {
        const grid = document.getElementById('productivityHeatmap');
        if (!grid) return;
        const reminders = safeStorage('reminders', []);
        const completedByDate = {};
        reminders.filter(r => r.status === 'completed').forEach(r => {
            const d = r.time.split('T')[0];
            completedByDate[d] = (completedByDate[d] || 0) + 1;
        });

        const totalDays = 84; // 12 weeks
        const now = new Date();
        let html = '';
        for (let i = totalDays - 1; i >= 0; i--) {
            const d = new Date(now); d.setDate(d.getDate() - i);
            const dStr = formatDateLocal(d);
            const count = completedByDate[dStr] || 0;
            let color = '#ebedf0';
            if (count === 1) color = '#9be9a8';
            else if (count >= 2 && count <= 3) color = '#40c463';
            else if (count >= 4) color = '#216e39';
            html += `<div class="heatmap-cell" style="background:${color};" title="${dStr}: ${count} done"></div>`;
        }
        grid.innerHTML = html;
    }

    // ============================================================
    // BATCH 3 — HABIT DETAIL: CALENDAR / GRAPH / SCORE / MISSED ANALYSIS
    // ============================================================
    let habitGraphChartInstance = null;

    function openHabitDetail(id) {
        const habits = safeStorage('habits', []);
        const habit = habits.find(h => h.id === id);
        if (!habit) return;
        if (!habit.history) habit.history = [];

        document.getElementById('habitDetailTitle').innerText = `📈 ${habit.name}`;
        document.getElementById('habitDetailStreak').innerText = habit.streak || 0;
        document.getElementById('habitDetailBest').innerText = habit.maxStreak || 0;

        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const last30 = [...Array(30)].map((_,i) => { const d = new Date(todayStart); d.setDate(d.getDate()-i); return formatDateLocal(d); });
        const checkIns30 = last30.filter(d => habit.history.includes(d)).length;
        const rate = Math.round((checkIns30/30)*100);
        document.getElementById('habitDetailRate').innerText = rate + '%';

        const score = Math.round(rate*0.7 + Math.min(habit.streak||0,30)/30*100*0.3);
        const scoreEl = document.getElementById('habitScoreCircle');
        scoreEl.innerText = score;
        const scoreColor = score>=70 ? '#34c759' : score>=40 ? '#ff9500' : '#ff3b30';
        scoreEl.style.background = scoreColor+'22';
        scoreEl.style.color = scoreColor;

        renderHabitCalendar(habit);
        renderHabitGraph(habit);
        renderHabitMissedAnalysis(habit, last30);

        openModal('habitDetailModal');
    }

    function renderHabitCalendar(habit) {
        const grid = document.getElementById('habitCalGrid');
        const now = new Date();
        const year = now.getFullYear(), month = now.getMonth();
        let firstDay = new Date(year, month, 1).getDay();
        let daysInMonth = new Date(year, month+1, 0).getDate();
        const todayStr = getTodayStr();
        let html = '';
        for(let i=0;i<firstDay;i++) html += `<div class="cal-day empty"></div>`;
        for(let i=1;i<=daysInMonth;i++){
            const dStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            const done = habit.history.includes(dStr);
            let cls = 'cal-day';
            if (done) cls += ' habit-done';
            if (dStr === todayStr) cls += ' today';
            html += `<div class="${cls}">${i}</div>`;
        }
        grid.innerHTML = html;
    }

    function renderHabitGraph(habit) {
        const weeks = 8;
        const labels = [];
        const data = [];
        const now = new Date();
        for(let w=weeks-1; w>=0; w--){
            let count = 0;
            for(let d=0; d<7; d++){
                const day = new Date(now);
                day.setDate(day.getDate() - (w*7 + d));
                if (habit.history.includes(formatDateLocal(day))) count++;
            }
            const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - (w*7+6));
            labels.push(`${weekStart.getDate()}/${weekStart.getMonth()+1}`);
            data.push(count);
        }
        const ctx = document.getElementById('habitGraphChart').getContext('2d');
        if (habitGraphChartInstance) habitGraphChartInstance.destroy();
        habitGraphChartInstance = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Days done', data, backgroundColor: '#34c759', borderRadius: 6 }] },
            options: { scales: { y: { beginAtZero: true, max: 7, ticks: { stepSize: 1 } } } }
        });
    }

    function renderHabitMissedAnalysis(habit, last30) {
        const container = document.getElementById('habitMissedAnalysis');
        const todayStr = getTodayStr();
        const missed = last30.filter(d => d < todayStr && !habit.history.includes(d));

        const sortedHistory = [...habit.history].sort();
        let longestGap = 0;
        for(let i=1; i<sortedHistory.length; i++){
            const diff = (new Date(sortedHistory[i]) - new Date(sortedHistory[i-1])) / 86400000;
            if (diff-1 > longestGap) longestGap = diff-1;
        }

        if (missed.length === 0) {
            container.innerHTML = `<p style="margin:0; color:#34c759; font-weight:700;">🎉 Perfect! No missed days in last 30 days.</p>`;
            return;
        }
        container.innerHTML = `
            <p style="margin:0 0 6px;">⚠️ <b>${missed.length}</b> day(s) missed in last 30 days</p>
            <p style="margin:0 0 6px;">📉 Longest gap ever: <b>${longestGap}</b> day(s)</p>
            <p style="margin:6px 0 0; font-size:11px; color:#8e8e93;">Recent misses: ${missed.slice(-5).map(d=>d.slice(5)).join(', ')}${missed.length>5?'...':''}</p>
        `;
    }

    // ============================================================
    // BATCH 4 — AI PRIORITY SUGGESTION
    // ============================================================
    async function aiSuggestPriority() {
        const task = document.getElementById("taskInput").value.trim();
        if (!task) return showToast("Enter task title first!", "error");
        const notes = document.getElementById("notesInput").innerText.trim();
        showToast("🪄 Analyzing priority...", "info");
        try {
            const prompt = `Task: "${task}"${notes ? '. Notes: ' + notes : ''}.\nClassify how urgent/important this task is. Reply with ONLY one word: high, medium, or low.`;
            const reply = (await callGeminiAI(prompt)).toLowerCase();
            const valid = ['high','medium','low'];
            const pri = valid.find(p => reply.includes(p)) || 'medium';
            document.getElementById("priorityInput").value = pri;
            const emoji = pri === 'high' ? '🔴' : pri === 'low' ? '🟢' : '🟡';
            showToast(`${emoji} AI suggests: ${pri.toUpperCase()} priority`, "success");
        } catch(e) {
            if (!currentUser) showToast("Sign in to use AI features!", "error");
            else showToast("AI Error: " + e.message, "error");
        }
    }

    // ============================================================
    // BATCH 4 — AI AUTO-CATEGORIZATION
    // ============================================================
    function updateCategoryPreview() {
        const badge = document.getElementById("categoryPreviewBadge");
        if (!badge) return;
        const task = document.getElementById("taskInput").value.trim();
        const override = document.getElementById("categoryOverrideInput").value;
        let cat;
        if (override) {
            try { cat = JSON.parse(override); } catch(e) { cat = null; }
        }
        if (!cat) cat = task ? autoCategorizeTask(task) : { name: 'Task', icon: '📝' };
        badge.innerHTML = `${sanitizeHTML(cat.icon||'')} ${sanitizeHTML(cat.name||'')}`;
    }

    async function aiSuggestCategory() {
        const task = document.getElementById("taskInput").value.trim();
        if (!task) return showToast("Enter task title first!", "error");
        showToast("🪄 AI categorizing...", "info");
        try {
            const prompt = `Task: "${task}".\nSuggest ONE short category name (1-2 words) and ONE matching emoji for organizing this task. Reply in EXACTLY this format with no extra text: emoji|CategoryName\nExample: 🎂|Birthday`;
            const reply = await callGeminiAI(prompt);
            const parts = reply.trim().split('|');
            if (parts.length >= 2) {
                const cat = { icon: parts[0].trim(), name: parts[1].trim() };
                document.getElementById("categoryOverrideInput").value = JSON.stringify(cat);
                updateCategoryPreview();
                showToast(`Category set: ${cat.icon} ${cat.name}`, "success");
            } else {
                showToast("Couldn't parse AI response, try again", "error");
            }
        } catch(e) {
            if (!currentUser) showToast("Sign in to use AI features!", "error");
            else showToast("AI Error: " + e.message, "error");
        }
    }

    // ============================================================
    // BATCH 4 — GOAL PREDICTION
    // ============================================================
    function renderGoalPrediction(period) {
        const container = document.getElementById('goalPredictionContainer');
        if (!container) return;

        const days = period === 'month' ? 30 : 7;
        const reminders = safeStorage('reminders', []);
        const habits = safeStorage('habits', []);
        const dailyGoal = parseInt(localStorage.getItem('dailyTaskGoal')) || 5;

        const dateArr = [...Array(days)].map((_,i) => { const d = new Date(); d.setDate(d.getDate()-(days-1-i)); return formatDateLocal(d); });
        const dateSet = new Set(dateArr);
        const completedCount = reminders.filter(r => r.status === 'completed' && dateSet.has(r.time.split('T')[0])).length;
        const avgPerDay = completedCount / days;
        const projectedMonthly = Math.round(avgPerDay * 30);
        const goalMonthly = dailyGoal * 30;
        const pctOfGoal = goalMonthly > 0 ? Math.round((projectedMonthly/goalMonthly)*100) : 0;

        let statusBadge, statusColor;
        if (pctOfGoal >= 100) { statusBadge = '🚀 Ahead of Goal'; statusColor = '#34c759'; }
        else if (pctOfGoal >= 70) { statusBadge = '✅ On Track'; statusColor = '#007aff'; }
        else { statusBadge = '⚠️ Behind Goal'; statusColor = '#ff9500'; }

        let habitPredictions = '';
        habits.forEach(h => {
            const streak = h.streak || 0;
            const milestones = [7, 30, 100];
            const next = milestones.find(m => m > streak);
            if (streak === 0) {
                habitPredictions += `<div class="report-stat-row"><span style="font-size:13px;">🎯 ${sanitizeHTML(h.name||'')}</span><span style="font-weight:700; color:#8e8e93;">Start today!</span></div>`;
            } else if (next) {
                const daysLeft = next - streak;
                habitPredictions += `<div class="report-stat-row"><span style="font-size:13px;">🎯 ${sanitizeHTML(h.name||'')} → ${next}-day streak</span><span style="font-weight:700; color:var(--primary);">${daysLeft}d left</span></div>`;
            }
        });
        if (!habitPredictions) habitPredictions = '<p style="font-size:12px; color:#8e8e93; margin:0;">No habits tracked yet.</p>';

        container.innerHTML = `
            <div style="text-align:center; margin-bottom:12px;">
                <span style="background:${statusColor}22; color:${statusColor}; padding:6px 16px; border-radius:20px; font-weight:800; font-size:13px;">${statusBadge}</span>
            </div>
            <div class="report-stat-row">
                <span style="font-size:13px; font-weight:600;">📈 Current Pace</span>
                <span style="font-weight:700;">${avgPerDay.toFixed(1)} tasks/day</span>
            </div>
            <div class="report-stat-row" style="border-bottom:none;">
                <span style="font-size:13px; font-weight:600;">🔮 Monthly Projection</span>
                <span style="font-weight:700;">${projectedMonthly} / ${goalMonthly} (${pctOfGoal}%)</span>
            </div>
            <div class="report-bar-track"><div class="report-bar-fill" style="width:${Math.min(pctOfGoal,100)}%; background:${statusColor};"></div></div>

            <div style="margin-top:12px;">
                <p style="font-size:11px; color:#8e8e93; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin:0 0 8px;">🏁 Habit Milestones</p>
                ${habitPredictions}
            </div>
        `;
    }

    // ============================================================
    // BATCH 5 — KANBAN BOARD
    // ============================================================
    let kanbanSortables = [];

    function openKanbanModal() {
        openModal('kanbanModal');
        renderKanban();
        setTimeout(initKanbanSortable, 150);
    }

    function renderKanban() {
        const reminders = safeStorage('reminders', []);
        const active = reminders.filter(r => !r.archived);
        const cols = { todo: [], inprogress: [], done: [] };

        active.forEach(r => {
            let col = r.kanbanCol;
            if (!col) col = (r.status === 'completed') ? 'done' : 'todo';
            if (r.status === 'completed') col = 'done';
            if (!cols[col]) cols[col] = [];
            cols[col].push(r);
        });

        ['todo','inprogress','done'].forEach(col => {
            const idSuffix = col.charAt(0).toUpperCase() + col.slice(1);
            const container = document.getElementById('kanbanCol' + idSuffix);
            const countEl = document.getElementById('kanbanCount' + idSuffix);
            const list = cols[col] || [];
            countEl.innerText = list.length;
            container.innerHTML = list.map(r => {
                const prioColor = r.priority === 'high' ? '#ff3b30' : r.priority === 'low' ? '#34c759' : '#ff9500';
                const dateStr = r.time ? new Date(r.time).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : '';
                return `<div class="kanban-card" data-id="${r.id}">
                    <div class="kanban-card-title"><span class="kanban-priority-dot" style="background:${prioColor};"></span>${sanitizeHTML(r.task||'')}</div>
                    <div style="font-size:10px; color:#8e8e93; margin-top:4px;">📅 ${dateStr}</div>
                </div>`;
            }).join('') || `<p style="text-align:center; font-size:11px; color:#8e8e93; padding:25px 0;">Empty</p>`;
        });
    }

    function initKanbanSortable() {
        kanbanSortables.forEach(s => s.destroy());
        kanbanSortables = [];
        ['kanbanColTodo','kanbanColInprogress','kanbanColDone'].forEach(id => {
            const el = document.getElementById(id);
            const s = new Sortable(el, {
                group: 'kanban',
                animation: 150,
                delay: 100,
                delayOnTouchOnly: true,
                onEnd: function(evt) {
                    const taskId = Number(evt.item.getAttribute('data-id'));
                    const newCol = evt.to.getAttribute('data-col');
                    updateKanbanCard(taskId, newCol);
                }
            });
            kanbanSortables.push(s);
        });
    }

    function updateKanbanCard(id, newCol) {
        let reminders = safeStorage('reminders', []);
        const r = reminders.find(x => x.id === id);
        if (!r) return;
        r.kanbanCol = newCol;
        r.status = (newCol === 'done') ? 'completed' : 'pending';
        localStorage.setItem('reminders', JSON.stringify(reminders));
        renderKanban();
        loadReminders();
        syncToCloud();
    }

    // ============================================================
    // BATCH 5 — PROJECT PROGRESS / MILESTONES / TIMELINE (GANTT-LITE)
    // ============================================================
    let currentProjectDetailId = null;

    function openProjectDetail(projectId) {
        currentProjectDetailId = projectId;
        const projects = safeStorage('projects', []);
        const proj = projects.find(p => p.id === projectId);
        if (!proj) return;
        if (!proj.milestones) proj.milestones = [];

        document.getElementById('projectDetailTitle').innerHTML = `${sanitizeHTML(proj.emoji||'')} ${sanitizeHTML(proj.name||'')}`;
        renderProjectDetailProgress(proj);
        renderProjectTimeline(proj);
        renderMilestones(proj);
        openModal('projectDetailModal');
    }

    function renderProjectDetailProgress(proj) {
        const reminders = safeStorage('reminders', []);
        const tasks = reminders.filter(r => String(r.project) === String(proj.id) && !r.archived);
        const completed = tasks.filter(r => r.status === 'completed').length;
        const pct = tasks.length > 0 ? Math.round((completed/tasks.length)*100) : 0;
        document.getElementById('projectDetailProgress').innerHTML = `
            <div class="report-stat-row" style="border-bottom:none; padding-bottom:4px;">
                <span style="font-size:13px; font-weight:600;">Progress</span>
                <span style="font-weight:800; color:${proj.color};">${completed}/${tasks.length} (${pct}%)</span>
            </div>
            <div class="project-progress-track" style="height:8px;"><div class="project-progress-fill" style="width:${pct}%; background:${proj.color};"></div></div>
        `;
    }

    function renderProjectTimeline(proj) {
        const container = document.getElementById('projectTimeline');
        const reminders = safeStorage('reminders', []);
        const tasks = reminders.filter(r => String(r.project) === String(proj.id) && !r.archived && r.time);
        const milestones = proj.milestones || [];

        const allDates = tasks.map(t => new Date(t.time)).concat(milestones.map(m => new Date(m.date + 'T00:00:00')));
        if (allDates.length === 0) {
            container.style.width = '100%';
            container.innerHTML = '<p style="position:absolute; top:-6px; width:100%; text-align:center; font-size:12px; color:#8e8e93;">No dated tasks/milestones yet.</p>';
            return;
        }
        allDates.push(new Date());

        let minDate = new Date(Math.min(...allDates));
        let maxDate = new Date(Math.max(...allDates));
        minDate.setHours(0,0,0,0); minDate.setDate(minDate.getDate()-1);
        maxDate.setHours(0,0,0,0); maxDate.setDate(maxDate.getDate()+1);
        const totalMs = Math.max(1, maxDate - minDate);
        const totalDays = Math.max(1, Math.ceil(totalMs/86400000));
        const widthPerDay = 36;
        container.style.width = Math.max(totalDays*widthPerDay, 280) + 'px';

        let html = '';
        const labelStep = Math.max(1, Math.ceil(totalDays/8));
        for(let d=0; d<=totalDays; d+=labelStep){
            const dt = new Date(minDate); dt.setDate(dt.getDate()+d);
            const pct = (d/totalDays)*100;
            html += `<div class="timeline-date-label" style="left:${pct}%;">${dt.getDate()}/${dt.getMonth()+1}</div>`;
        }
        tasks.forEach(t => {
            const pos = ((new Date(t.time) - minDate)/totalMs)*100;
            const color = t.status === 'completed' ? '#34c759' : (t.priority === 'high' ? '#ff3b30' : t.priority === 'low' ? '#34c759' : '#ff9500');
            html += `<div class="timeline-marker" style="left:${pos}%; background:${color};" title="${sanitizeHTML(t.task||'')}"></div>`;
        });
        milestones.forEach(m => {
            const pos = ((new Date(m.date + 'T00:00:00') - minDate)/totalMs)*100;
            html += `<div class="timeline-milestone" style="left:${pos}%; background:${m.done ? '#34c759' : '#5e5ce6'};" title="🏁 ${sanitizeHTML(m.name||'')}"></div>`;
        });
        const todayPos = ((new Date() - minDate)/totalMs)*100;
        html += `<div class="timeline-today" style="left:${todayPos}%;" title="Today"></div>`;

        container.innerHTML = html;
    }

    function addMilestone() {
        const name = document.getElementById('milestoneNameInput').value.trim();
        const date = document.getElementById('milestoneDateInput').value;
        if (!name || !date) return showToast('Enter milestone name & date!', 'error');
        let projects = safeStorage('projects', []);
        const proj = projects.find(p => p.id === currentProjectDetailId);
        if (!proj) return;
        if (!proj.milestones) proj.milestones = [];
        proj.milestones.push({ id: Date.now(), name, date, done: false });
        localStorage.setItem('projects', JSON.stringify(projects));
        document.getElementById('milestoneNameInput').value = '';
        document.getElementById('milestoneDateInput').value = '';
        renderMilestones(proj);
        renderProjectTimeline(proj);
        syncToCloud();
        showToast('Milestone added! 🏁', 'success');
    }

    function toggleMilestone(id) {
        let projects = safeStorage('projects', []);
        const proj = projects.find(p => p.id === currentProjectDetailId);
        if (!proj || !proj.milestones) return;
        const m = proj.milestones.find(x => x.id === id);
        if (m) m.done = !m.done;
        localStorage.setItem('projects', JSON.stringify(projects));
        renderMilestones(proj);
        renderProjectTimeline(proj);
        syncToCloud();
    }

    function deleteMilestone(id) {
        let projects = safeStorage('projects', []);
        const proj = projects.find(p => p.id === currentProjectDetailId);
        if (!proj || !proj.milestones) return;
        proj.milestones = proj.milestones.filter(x => x.id !== id);
        localStorage.setItem('projects', JSON.stringify(projects));
        renderMilestones(proj);
        renderProjectTimeline(proj);
        syncToCloud();
    }

    function renderMilestones(proj) {
        const container = document.getElementById('milestonesContainer');
        const milestones = (proj.milestones || []).slice().sort((a,b) => new Date(a.date) - new Date(b.date));
        if (milestones.length === 0) {
            container.innerHTML = '<p style="font-size:12px; color:#8e8e93; text-align:center; padding:10px 0;">No milestones yet. Add one above! 🏁</p>';
            return;
        }
        container.innerHTML = milestones.map(m => `
            <div class="milestone-item ${m.done ? 'done' : ''}">
                <input type="checkbox" ${m.done ? 'checked' : ''} onchange="toggleMilestone(${m.id})" style="width:18px; height:18px; margin:0; flex-shrink:0;">
                <span class="milestone-name" style="flex:1;">${sanitizeHTML(m.name||'')}</span>
                <span style="font-size:11px; color:#8e8e93;">${new Date(m.date+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</span>
                <button onclick="deleteMilestone(${m.id})" style="background:none; border:none; color:#ff3b30; cursor:pointer; font-size:15px; padding:0;">✖</button>
            </div>
        `).join('');
    }

    // ============================================================
    // BATCH 5 — SHARED WORKSPACE (Family Shared Lists / Team Workspace)
    // ============================================================
    function generateWorkspaceCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for(let i=0;i<6;i++) code += chars[Math.floor(Math.random()*chars.length)];
        return code;
    }

    async function openWorkspaceModal() {
        openModal('workspaceModal');
        await loadActiveWorkspace();
    }

    async function loadActiveWorkspace() {
        const active = safeStorage('activeWorkspace', null);
        if (!active) {
            document.getElementById('workspaceSetup').style.display = 'block';
            document.getElementById('workspaceActive').style.display = 'none';
            return;
        }
        document.getElementById('workspaceSetup').style.display = 'none';
        document.getElementById('workspaceActive').style.display = 'block';
        document.getElementById('workspaceActiveName').innerText = active.name;
        document.getElementById('workspaceActiveCode').innerText = active.code;
        await syncWorkspace();
    }

    async function createWorkspace() {
        if (!currentUser) return showToast('Login required!', 'error');
        const name = document.getElementById('workspaceNameInput').value.trim();
        if (!name) return showToast('Enter workspace name!', 'error');
        const code = generateWorkspaceCode();
        try {
            await db.collection('workspaces').doc(code).set({
                name, members: [currentUser.email.toLowerCase()], tasks: [],
                createdAt: new Date().toISOString(), ownerUid: currentUser.uid
            });
            localStorage.setItem('activeWorkspace', JSON.stringify({code, name}));
            showToast(`Workspace created! Code: ${code} 🎉`, 'success');
            await loadActiveWorkspace();
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    }

    async function joinWorkspace() {
        if (!currentUser) return showToast('Login required!', 'error');
        const code = document.getElementById('workspaceJoinCode').value.trim().toUpperCase();
        if (!code) return showToast('Enter a code!', 'error');
        try {
            const ref = db.collection('workspaces').doc(code);
            const doc = await ref.get();
            if (!doc.exists) return showToast('Workspace not found!', 'error');
            const data = doc.data();
            const email = currentUser.email.toLowerCase();
            if (!(data.members||[]).includes(email)) {
                await ref.update({ members: [...(data.members||[]), email] });
            }
            localStorage.setItem('activeWorkspace', JSON.stringify({code, name: data.name}));
            showToast(`Joined "${data.name}"! 🎉`, 'success');
            await loadActiveWorkspace();
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    }

    function leaveWorkspace() {
        localStorage.removeItem('activeWorkspace');
        document.getElementById('workspaceSetup').style.display = 'block';
        document.getElementById('workspaceActive').style.display = 'none';
        showToast('Left workspace', 'info');
    }

    async function syncWorkspace() {
        const active = safeStorage('activeWorkspace', null);
        if (!active) return;
        try {
            const doc = await db.collection('workspaces').doc(active.code).get();
            if (!doc.exists) { showToast('Workspace no longer exists', 'error'); leaveWorkspace(); return; }
            const data = doc.data();
            document.getElementById('workspaceMemberCount').innerText = (data.members||[]).length;
            renderWorkspaceTasks(data.tasks || []);
        } catch(e) { showToast('Sync error: ' + e.message, 'error'); }
    }

    function renderWorkspaceTasks(tasks) {
        const container = document.getElementById('workspaceTasksContainer');
        if (tasks.length === 0) {
            container.innerHTML = '<p style="text-align:center; font-size:12px; color:#8e8e93; padding:15px 0;">No shared tasks yet. Add one! 👆</p>';
            return;
        }
        container.innerHTML = tasks.map(t => `
            <div class="workspace-task-item ${t.done ? 'done' : ''}">
                <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleWorkspaceTask('${t.id}')" style="width:18px; height:18px; margin:0; flex-shrink:0;">
                <span class="workspace-task-text" style="flex:1; font-size:13px;">${sanitizeHTML(t.text||'')}</span>
                <span style="font-size:10px; color:#8e8e93;">${sanitizeHTML(t.addedBy||'')}</span>
                <button onclick="deleteWorkspaceTask('${t.id}')" style="background:none; border:none; color:#ff3b30; cursor:pointer; font-size:15px; padding:0;">✖</button>
            </div>
        `).join('');
    }

    async function addWorkspaceTask() {
        const active = safeStorage('activeWorkspace', null);
        if (!active) return;
        const input = document.getElementById('workspaceTaskInput');
        const text = input.value.trim();
        if (!text) return;
        try {
            const ref = db.collection('workspaces').doc(active.code);
            const doc = await ref.get();
            const tasks = doc.data().tasks || [];
            tasks.push({ id: Date.now().toString(), text, done: false, addedBy: userName });
            await ref.update({ tasks });
            input.value = '';
            renderWorkspaceTasks(tasks);
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    }

    async function toggleWorkspaceTask(id) {
        const active = safeStorage('activeWorkspace', null);
        if (!active) return;
        try {
            const ref = db.collection('workspaces').doc(active.code);
            const doc = await ref.get();
            const tasks = doc.data().tasks || [];
            const t = tasks.find(x => x.id === id);
            if (t) t.done = !t.done;
            await ref.update({ tasks });
            renderWorkspaceTasks(tasks);
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    }

    async function deleteWorkspaceTask(id) {
        const active = safeStorage('activeWorkspace', null);
        if (!active) return;
        try {
            const ref = db.collection('workspaces').doc(active.code);
            const doc = await ref.get();
            let tasks = doc.data().tasks || [];
            tasks = tasks.filter(x => x.id !== id);
            await ref.update({ tasks });
            renderWorkspaceTasks(tasks);
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    }

    // ============================================================
