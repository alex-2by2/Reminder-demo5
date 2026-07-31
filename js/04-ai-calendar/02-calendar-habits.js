// Family calendar, productivity heatmap, habit detail view (calendar/graph/score/missed analysis), AI priority suggestion, AI auto-categorization, AI goal prediction.
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".
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
