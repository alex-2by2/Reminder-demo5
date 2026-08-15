// Finance charts, AI coach card, voice commands, settings init on load, app statistics, CSV export.
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".
    // FINANCE CHARTS
    // ============================================================
    // Merged into the Finance page's own tab bar (setFinTab('charts')) —
    // kept as the name people click from the tile before the merge.
    //
    // BUGFIX found while relocating this: the render function below used to
    // look for canvas ids "expensePieChart" / "incomeExpenseChart" and a
    // "finInsightsAI" div. None of those ever existed anywhere in index.html
    // — the actual markup always used finChartBar / finChartDoughnut /
    // finChartSavings / finChartSummary. Every optional-chained ?.getContext
    // silently returned undefined, so every "if(ctx)" guard just skipped
    // drawing — no error, no chart, ever. Rewritten to match the real ids,
    // and added the "Monthly Net Savings" chart the markup already titled
    // but never had any code behind.
    let expPieChart = null, incExpChart = null, savingsChart = null;
    function openFinanceChartsModal() {
        switchPage('finance');
        setFinTab('charts');
    }

    function renderFinanceCharts() {
        const d = getFinData();
        const catTotals = {};
        d.expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category]||0) + Number(e.amount); });

        const now = new Date();
        const months = []; const incData = []; const expData = []; const netData = [];
        for(let i=5;i>=0;i--) {
            const d2 = new Date(now.getFullYear(), now.getMonth()-i, 1);
            const ms = `${d2.getFullYear()}-${String(d2.getMonth()+1).padStart(2,'0')}`;
            months.push(ms.slice(5));
            const inc = d.income.filter(e=>e.date?.startsWith(ms)).reduce((s,e)=>s+Number(e.amount),0);
            const exp = d.expenses.filter(e=>e.date?.startsWith(ms)).reduce((s,e)=>s+Number(e.amount),0);
            incData.push(inc); expData.push(exp); netData.push(inc - exp);
        }

        const summaryEl = document.getElementById('finChartSummary');
        if(summaryEl) {
            const total6moExp = expData.reduce((a,b)=>a+b,0);
            const topCat = Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];
            summaryEl.innerHTML = `
                <div style="background:#ffe5e5;border-radius:12px;padding:12px;text-align:center;"><h3 style="margin:0;font-size:18px;color:#ff3b30">₹${total6moExp.toLocaleString('en-IN')}</h3><p style="margin:2px 0 0;font-size:10px;color:#8e8e93;font-weight:700">6-MONTH SPEND</p></div>
                <div style="background:#e5f9e9;border-radius:12px;padding:12px;text-align:center;"><h3 style="margin:0;font-size:16px;color:#34c759">${topCat ? sanitizeHTML(topCat[0]) : '—'}</h3><p style="margin:2px 0 0;font-size:10px;color:#8e8e93;font-weight:700">TOP CATEGORY</p></div>`;
        }

        const pieCtx = document.getElementById('finChartDoughnut')?.getContext('2d');
        if(pieCtx) {
            if(expPieChart) expPieChart.destroy();
            const cats = Object.keys(catTotals);
            const colors = ['#ff3b30','#ff9500','#ffcc00','#34c759','#5ac8fa','#007aff','#5e5ce6','#af52de','#ff2d55'];
            expPieChart = new Chart(pieCtx, { type:'doughnut', data:{labels:cats, datasets:[{data:cats.map(c=>catTotals[c]), backgroundColor:colors.slice(0,cats.length), borderWidth:0}]}, options:{plugins:{legend:{position:'right',labels:{font:{size:11}}}},cutout:'60%'} });
        }

        const barCtx = document.getElementById('finChartBar')?.getContext('2d');
        if(barCtx) {
            if(incExpChart) incExpChart.destroy();
            incExpChart = new Chart(barCtx, { type:'bar', data:{labels:months, datasets:[{label:'Income',data:incData,backgroundColor:'#34c759',borderRadius:6},{label:'Expense',data:expData,backgroundColor:'#ff3b30',borderRadius:6}]}, options:{scales:{y:{beginAtZero:true}},plugins:{legend:{labels:{font:{size:11}}}}} });
        }

        const savingsCtx = document.getElementById('finChartSavings')?.getContext('2d');
        if(savingsCtx) {
            if(savingsChart) savingsChart.destroy();
            savingsChart = new Chart(savingsCtx, { type:'line', data:{labels:months, datasets:[{label:'Net Savings',data:netData,borderColor:'#007aff',backgroundColor:'rgba(0,122,255,0.1)',fill:true,tension:0.3,pointBackgroundColor:netData.map(v=>v>=0?'#34c759':'#ff3b30')}]}, options:{scales:{y:{beginAtZero:false}},plugins:{legend:{display:false}}} });
        }
    }

    // ============================================================
    // AI COACH
    // ============================================================
    async function openAICoachModal() {
        openModal('aiCoachModal');
        await getAICoachReport('productivity');
    }

    async function getAICoachReport(type) {
        const el = document.getElementById('aiCoachDetail');
        if(el) el.innerHTML = '<p style="text-align:center;color:#8e8e93">🤔 Analyzing your data...</p>';
        try {
            const reminders = safeStorage('reminders', []);
            const habits = safeStorage('habits', []);
            const finData = getFinData();
            const moodLog = safeStorage('moodLog', {});
            const totalTasks = reminders.length;
            const completedTasks = reminders.filter(r=>r.status==='completed').length;
            const streak = Math.max(0, ...habits.map(h=>h.streak||0));
            const moodVals = Object.values(moodLog).filter(v=>v!==undefined);
            const avgMood = moodVals.length ? (moodVals.reduce((a,b)=>a+b,0)/moodVals.length).toFixed(1) : 'N/A';
            const monthExp = finData.expenses.slice(0,30).reduce((s,e)=>s+Number(e.amount),0);
            let prompt = '';
            if(type==='productivity') prompt = `User stats: ${completedTasks}/${totalTasks} tasks completed, best habit streak: ${streak} days, avg mood: ${avgMood}/4. Give 3 specific, actionable productivity tips in bullet points (max 4 lines total). Be encouraging and direct.`;
            else if(type==='habits') prompt = `User has ${habits.length} habits. Best streak: ${streak} days. Habits: ${habits.map(h=>h.name+'('+h.streak+' days)').join(', ')||'none'}. Give 3 habit improvement tips in bullet points. Max 4 lines.`;
            else if(type==='finance') prompt = `Monthly expenses: ₹${monthExp.toLocaleString('en-IN')}. Income: ₹${finData.income.slice(0,5).reduce((s,e)=>s+Number(e.amount),0).toLocaleString('en-IN')}. EMIs: ${finData.emis.length}. Give 3 finance tips in bullet points. Max 4 lines.`;
            const reply = await callGeminiAI(prompt);
            if(el) el.innerHTML = sanitizeHTML(reply).replace(/\n/g,'<br>');
            const card = document.getElementById('aiCoachCard');
            if(card) card.innerHTML = `<p style="margin:0;font-size:13px;opacity:0.9">Last coaching: ${new Date().toLocaleString('en-IN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'})}</p>`;
        } catch(e) {
            if(el) el.innerHTML = !currentUser ? '<p>⚠️ Sign in to use AI Coach!</p>' : '<p>⚠️ Error: '+sanitizeHTML(e.message)+'</p>';
        }
    }

    // ============================================================
    // VOICE COMMANDS
    // ============================================================
    let voiceRecognition = null;
    function startVoiceCommand() {
        if(!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            return showToast('Voice not supported in this browser. Try Chrome!', 'error');
        }
        const overlay = document.getElementById('voiceOverlay');
        if(overlay) overlay.style.display='flex';
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        voiceRecognition = new SpeechRecognition();
        voiceRecognition.continuous = false; voiceRecognition.interimResults = true;
        voiceRecognition.lang = 'en-IN';
        voiceRecognition.onresult = e => {
            const transcript = Array.from(e.results).map(r=>r[0].transcript).join('');
            const el = document.getElementById('voiceTranscript'); if(el) el.innerText = transcript;
            if(e.results[0].isFinal) processVoiceCommand(transcript);
        };
        voiceRecognition.onerror = () => { stopVoiceCommand(); showToast('Voice error. Try again!', 'error'); };
        voiceRecognition.onend = () => stopVoiceCommand();
        voiceRecognition.start();
        hapticFeedback('medium');
    }

    function stopVoiceCommand() {
        if(voiceRecognition) { try { voiceRecognition.stop(); } catch(e) {} voiceRecognition = null; }
        const overlay = document.getElementById('voiceOverlay'); if(overlay) overlay.style.display='none';
    }

    async function processVoiceCommand(transcript) {
        stopVoiceCommand();
        showToast(`🎤 Heard: "${transcript}"`, 'info');
        if(!transcript.trim()) return;
        try {
            const prompt = `The user said: "${transcript}"\nExtract a task from this voice command. Reply ONLY in this exact JSON format (no extra text): {"task":"task name here","priority":"low/medium/high","time":"YYYY-MM-DDTHH:MM or null"}\nIf no clear time mentioned, set time to null. Today is ${getTodayStr()}.`;
            const reply = await callGeminiAI(prompt);
            const clean = reply.replace(/```json?|```/g,'').trim();
            const parsed = JSON.parse(clean);
            if(parsed.task) {
                switchPage('add');
                setTimeout(() => {
                    const taskInput = document.getElementById('taskInput');
                    const priorityInput = document.getElementById('priorityInput');
                    const timeInput = document.getElementById('timeInput');
                    if(taskInput) taskInput.value = parsed.task;
                    if(parsed.priority && priorityInput) priorityInput.value = parsed.priority;
                    if(parsed.time && timeInput) timeInput.value = parsed.time;
                    updateCategoryPreview();
                    showToast('✅ Task ready! Tap Save.', 'success');
                }, 300);
            }
        } catch(e) {
            const taskInput = document.getElementById('taskInput');
            switchPage('add');
            setTimeout(() => { if(taskInput) taskInput.value = transcript; updateCategoryPreview(); }, 300);
        }
    }

    // ============================================================
    // SETTINGS INIT ON LOAD
    // ============================================================
    document.addEventListener('DOMContentLoaded', () => {
        const autoDark = safeStorage('autoDark', null);
        if(autoDark) {
            const toggle = document.getElementById('autoDarkToggle');
            if(toggle) toggle.checked = autoDark.enabled;
            const fromEl = document.getElementById('autoDarkFrom');
            const toEl = document.getElementById('autoDarkTo');
            if(fromEl) fromEl.value = autoDark.from || '20:00';
            if(toEl) toEl.value = autoDark.to || '07:00';
            const wrap = document.getElementById('autoDarkTimesWrap');
            if(wrap) wrap.style.display = autoDark.enabled ? 'block' : 'none';
            checkAutoDark();
        }
        const hapticEl = document.getElementById('hapticToggle');
        if(hapticEl) hapticEl.checked = localStorage.getItem('haptic') === 'true';
        applyWidgetPrefs();
    });


    // OFFLINE BANNER: handled by the consolidated online/offline listener in
    // js/01-core/02-navigation-auth.js (this file used to register its own
    // second copy, which meant the banner toggle and syncToCloud() ran twice
    // on every connectivity change — see CHANGELOG.md).

    // ============================================================
    // POMODORO AUTO-LOG (patch existing pomo complete)
    // ============================================================
    const _origStartPomo = typeof startPomo !== 'undefined' ? startPomo : null;
    // ============================================================
    // APP STATISTICS
    // ============================================================
    let taskTrendChartInst = null;
    function openAppStatsModal() {
        openModal('appStatsModal');
        setTimeout(renderAppStats, 150);
    }

    function renderAppStats() {
        const reminders = safeStorage('reminders', []);
        const habits = safeStorage('habits', []);
        const finData = getFinData();
        const notes = safeStorage('quickNotes', []);
        const journal = safeStorage('journalEntries', {});

        const total = reminders.length;
        const completed = reminders.filter(r => r.status === 'completed').length;
        const rate = total ? Math.round((completed/total)*100) : 0;
        const bestStreak = Math.max(0, ...habits.map(h => h.streak||0));
        const totalMins = safeStorage('pomodoroHistory', []).reduce((s,h)=>s+h.mins,0);

        const grid = document.getElementById('appStatsGrid');
        if(grid) grid.innerHTML = `
            <div style="background:#e5f1ff;border-radius:12px;padding:12px;text-align:center;"><h3 style="margin:0;font-size:22px;color:var(--primary)">${total}</h3><p style="margin:2px 0 0;font-size:11px;color:#8e8e93;font-weight:700">Total Tasks</p></div>
            <div style="background:#e5f9e9;border-radius:12px;padding:12px;text-align:center;"><h3 style="margin:0;font-size:22px;color:#34c759">${rate}%</h3><p style="margin:2px 0 0;font-size:11px;color:#8e8e93;font-weight:700">Completion Rate</p></div>
            <div style="background:#fff8e8;border-radius:12px;padding:12px;text-align:center;"><h3 style="margin:0;font-size:22px;color:#ff9500">${bestStreak}🔥</h3><p style="margin:2px 0 0;font-size:11px;color:#8e8e93;font-weight:700">Best Streak</p></div>
            <div style="background:#ffe5e5;border-radius:12px;padding:12px;text-align:center;"><h3 style="margin:0;font-size:22px;color:#ff3b30">${Math.round(totalMins/60)}h</h3><p style="margin:2px 0 0;font-size:11px;color:#8e8e93;font-weight:700">Focus Time</p></div>`;

        const details = document.getElementById('appStatsDetails');
        if(details) details.innerHTML = `
            📓 Journal entries: ${Object.keys(journal).length}<br>
            📝 Quick notes: ${notes.length}<br>
            💊 Medicines tracked: ${safeStorage('medicines', []).length}<br>
            🎂 Birthdays tracked: ${safeStorage('birthdays', []).length}<br>
            💰 Total expenses recorded: ${finData.expenses.length}<br>
            ✈️ Trips planned: ${safeStorage('travelData',{"trips":[]}).trips.length}`;

        // 30-day task trend chart
        const ctx = document.getElementById('taskTrendChart')?.getContext('2d');
        if(ctx) {
            if(taskTrendChartInst) taskTrendChartInst.destroy();
            const labels = [], data = [];
            for(let i=13;i>=0;i--) {
                const d = new Date(); d.setDate(d.getDate()-i);
                const ds = formatDateLocal(d);
                labels.push(ds.slice(5));
                data.push(reminders.filter(r => r.time?.startsWith(ds) && r.status==='completed').length);
            }
            taskTrendChartInst = new Chart(ctx, { type:'line', data:{labels, datasets:[{label:'Completed', data, borderColor:'#34c759', backgroundColor:'#34c75922', tension:0.4, fill:true, borderWidth:2, pointRadius:3}]}, options:{scales:{y:{beginAtZero:true,ticks:{stepSize:1}}},plugins:{legend:{display:false}}} });
        }
    }

    // ============================================================
    // CSV EXPORT
    // ============================================================

    // ============================================================
