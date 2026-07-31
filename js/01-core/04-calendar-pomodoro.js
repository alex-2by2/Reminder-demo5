// Home calendar rendering (month/week/agenda views), full calendar modal, Pomodoro timer, AI quick-actions (subtasks/time suggestion/review/voice assistant), productivity chart.
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".
    function formatDateLocal(d) {
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }

    function setCalView(view) {
        calView = view;
        document.querySelectorAll('.cal-view-btn').forEach(b => b.classList.remove('active'));
        const viewBtn = $id('calview-' + view);
        if (viewBtn) viewBtn.classList.add('active');
        renderHomeCalendar();
    }

    function changeHomeMonth(dir) { 
        if (calView === 'week' || calView === 'agenda') {
            currentWeekStart.setDate(currentWeekStart.getDate() + dir*7);
        } else {
            currentCalMonth += dir; 
            if(currentCalMonth > 11) { currentCalMonth = 0; currentCalYear++; } 
            if(currentCalMonth < 0) { currentCalMonth = 11; currentCalYear--; } 
        }
        renderHomeCalendar(); 
        if(currentTab === 'upcoming') loadReminders(); 
    }

    function renderHomeCalendar() {
        const displayEl = $id("homeCalMonthDisplay");
        if(!displayEl) return;

        const weekdaysRow = $id("calWeekdaysRow");
        const grid = $id("homeCalendarGrid");
        const agendaContainer = $id("agendaListContainer");
        const clearFilterWrapper = $id("clearFilterWrapper");

        if (calView === 'agenda') {
            if (weekdaysRow) weekdaysRow.style.display = 'none';
            if (grid) grid.style.display = 'none';
            if (agendaContainer) agendaContainer.style.display = 'block';
            if (agendaContainer) renderAgendaView(displayEl, agendaContainer);
            if (clearFilterWrapper) clearFilterWrapper.style.display = "none";
            return;
        }

        if (weekdaysRow) weekdaysRow.style.display = '';
        if (grid) grid.style.display = '';
        if (agendaContainer) agendaContainer.style.display = 'none';

        if (calView === 'week') {
            if (grid) renderWeekView(displayEl, grid);
        } else {
            if (grid) renderMonthView(displayEl, grid);
        }
    }

    // ============================================================
    // FULL CALENDAR MODAL — was entirely non-functional: changeMonth() was
    // called by the Prev/Next buttons but never defined anywhere, and there
    // was no renderer for its grid either. Completing both here, reusing the
    // same day-cell pattern as the home page's renderMonthView for visual
    // consistency, but with its own independent month/year state so browsing
    // it doesn't silently shift the home page's mini calendar too.
    // ============================================================
    let fullCalMonth = new Date().getMonth();
    let fullCalYear = new Date().getFullYear();

    function openFullCalendarModal() {
        fullCalMonth = new Date().getMonth();
        fullCalYear = new Date().getFullYear();
        renderFullCalendarGrid();
        openModal('fullCalendarModal');
    }

    function changeMonth(direction) {
        fullCalMonth += direction;
        if (fullCalMonth < 0) { fullCalMonth = 11; fullCalYear--; }
        else if (fullCalMonth > 11) { fullCalMonth = 0; fullCalYear++; }
        renderFullCalendarGrid();
    }

    function renderFullCalendarGrid() {
        const displayEl = document.getElementById("calMonthDisplay");
        const grid = document.getElementById("fullCalendarGrid");
        if (!displayEl || !grid) return;

        const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        displayEl.innerText = `${monthNames[fullCalMonth]} ${fullCalYear}`;
        grid.innerHTML = "";

        const firstDay = new Date(fullCalYear, fullCalMonth, 1).getDay();
        const daysInMonth = new Date(fullCalYear, fullCalMonth + 1, 0).getDate();
        const reminders = safeStorage("reminders", []);
        const taskDates = reminders.filter(r => r.status !== 'completed' && !r.archived && r.time).map(r => r.time.split('T')[0]);
        const todayStr = getTodayStr();

        for (let i = 0; i < firstDay; i++) {
            grid.innerHTML += `<div class="cal-day empty"></div>`;
        }
        for (let i = 1; i <= daysInMonth; i++) {
            const dStr = `${fullCalYear}-${(fullCalMonth+1).toString().padStart(2,'0')}-${i.toString().padStart(2,'0')}`;
            const hasTask = taskDates.includes(dStr);
            const isToday = dStr === todayStr;
            const holiday = getIndiaHoliday(dStr);
            let classes = "cal-day";
            if (isToday) classes += " today";
            if (hasTask) classes += " has-event";
            if (holiday) classes += " is-holiday";
            const title = holiday ? ` title="${sanitizeHTML(holiday.icon||'')} ${sanitizeHTML(holiday.name||'')}"` : '';
            grid.innerHTML += `<div class="${classes}"${title} onclick="filterByDate('${dStr}'); closeModal('fullCalendarModal');">${i}</div>`;
        }
    }

    function renderMonthView(displayEl, grid) {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        displayEl.innerText = `${monthNames[currentCalMonth]} ${currentCalYear}`; 
        grid.innerHTML = "";
        
        let firstDay = new Date(currentCalYear, currentCalMonth, 1).getDay();
        let daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
        
        const reminders = safeStorage("reminders", []);
        const taskDates = reminders.filter(r => r.status !== 'completed' && !r.archived).map(r => r.time.split('T')[0]);
        
        for(let i=0; i<firstDay; i++) { 
            grid.innerHTML += `<div class="cal-day empty"></div>`; 
        }
        
        const todayStr = getTodayStr();
        for(let i=1; i<=daysInMonth; i++) {
            const dStr = `${currentCalYear}-${(currentCalMonth+1).toString().padStart(2,'0')}-${i.toString().padStart(2,'0')}`;
            const hasTask = taskDates.includes(dStr); 
            const isToday = dStr === todayStr;
            const isSelected = selectedDateFilter === dStr;
            const holiday = getIndiaHoliday(dStr);
            
            let classes = "cal-day";
            if(isToday) classes += " today";
            if(hasTask) classes += " has-event";
            if(isSelected) classes += " selected";
            if(holiday) classes += " is-holiday";
            
            const title = holiday ? ` title="${holiday.icon} ${holiday.name}"` : '';
            grid.innerHTML += `<div class="${classes}"${title} onclick="filterByDate('${dStr}')">${i}</div>`;
        }
        
        // જો કોઈ તારીખ સિલેક્ટ કરેલી હોય અથવા કેલેન્ડરનો મહિનો હાલના મહિના કરતાં અલગ હોય, તો જ Clear બટન બતાવો 
        const isFilterActive = selectedDateFilter || currentCalMonth !== new Date().getMonth() || currentCalYear !== new Date().getFullYear();
        const clearFilterWrapper = $id("clearFilterWrapper");
        if (clearFilterWrapper) clearFilterWrapper.style.display = isFilterActive ? "flex" : "none";
    }

    function renderWeekView(displayEl, grid) {
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const start = new Date(currentWeekStart);
        const end = new Date(start); end.setDate(end.getDate() + 6);
        displayEl.innerText = (start.getMonth() === end.getMonth())
            ? `${monthNames[start.getMonth()]} ${start.getDate()}–${end.getDate()}`
            : `${monthNames[start.getMonth()]} ${start.getDate()} – ${monthNames[end.getMonth()]} ${end.getDate()}`;
        grid.innerHTML = "";

        const reminders = safeStorage("reminders", []);
        const taskDates = reminders.filter(r => r.status !== 'completed' && !r.archived).map(r => r.time.split('T')[0]);
        const todayStr = getTodayStr();

        for(let i=0; i<7; i++) {
            const d = new Date(start); d.setDate(start.getDate() + i);
            const dStr = formatDateLocal(d);
            const hasTask = taskDates.includes(dStr);
            const isToday = dStr === todayStr;
            const isSelected = selectedDateFilter === dStr;
            const holiday = getIndiaHoliday(dStr);
            let classes = "cal-day";
            if(isToday) classes += " today";
            if(hasTask) classes += " has-event";
            if(isSelected) classes += " selected";
            if(holiday) classes += " is-holiday";
            const title = holiday ? ` title="${holiday.icon} ${holiday.name}"` : '';
            grid.innerHTML += `<div class="${classes}"${title} onclick="filterByDate('${dStr}')">${d.getDate()}</div>`;
        }

        const clearFilterWrapper = $id("clearFilterWrapper");
        if (clearFilterWrapper) clearFilterWrapper.style.display = selectedDateFilter ? "flex" : "none";
    }

    function renderAgendaView(displayEl, container) {
        displayEl.innerText = "📋 Agenda (Next 14 Days)";
        const reminders = safeStorage("reminders", []);
        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const windowEnd = new Date(todayStart); windowEnd.setDate(windowEnd.getDate() + 14);

        const upcoming = reminders.filter(r => {
            if (r.status === 'completed' || r.archived) return false;
            const t = new Date(r.time);
            return t >= todayStart && t < windowEnd;
        }).sort((a,b) => new Date(a.time) - new Date(b.time));

        const upcomingHolidays = INDIA_HOLIDAYS_2026.filter(h => {
            const hd = new Date(h.date + 'T00:00:00');
            return hd >= todayStart && hd < windowEnd;
        });

        if (upcoming.length === 0 && upcomingHolidays.length === 0) {
            container.innerHTML = `<div class="agenda-empty">🎉 No upcoming tasks in next 14 days!</div>`;
            return;
        }

        const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const todayStr = getTodayStr();

        // Merge tasks and holidays into one sorted timeline by date
        const merged = [
            ...upcoming.map(r => ({ type:'task', date: formatDateLocal(new Date(r.time)), time: new Date(r.time), data: r })),
            ...upcomingHolidays.map(h => ({ type:'holiday', date: h.date, time: new Date(h.date+'T00:00:00'), data: h }))
        ].sort((a,b) => a.time - b.time || (a.type==='holiday' ? -1 : 1));

        let html = "";
        let lastDateStr = "";
        merged.forEach(item => {
            const dStr = item.date;
            if (dStr !== lastDateStr) {
                const t = item.time;
                const label = dStr === todayStr ? "Today" : `${dayNames[t.getDay()]}, ${monthNames[t.getMonth()]} ${t.getDate()}`;
                html += `<div class="agenda-date-header">${label}</div>`;
                lastDateStr = dStr;
            }
            if (item.type === 'holiday') {
                html += `<div class="agenda-item" style="background:var(--holiday-bg,#fff4e5);"><span class="agenda-dot" style="background:var(--holiday-color,#ff9500);"></span><span class="agenda-time">${item.data.icon}</span><span style="flex:1;font-weight:700;">${item.data.name} (Holiday)</span></div>`;
            } else {
                const r = item.data;
                const prioColor = r.priority === 'high' ? '#ff3b30' : r.priority === 'low' ? '#34c759' : '#ff9500';
                const timeStr = item.time.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});
                html += `<div class="agenda-item"><span class="agenda-dot" style="background:${prioColor};"></span><span class="agenda-time">${timeStr}</span><span style="flex:1;">${sanitizeHTML(r.task||'')}</span></div>`;
            }
        });
        container.innerHTML = html;
    }

    // Bug Fix 3: Duplicate filterByDate removed — complete version kept below (line ~2394)

      function clearCalendarFilter() {
        selectedDateFilter = null;
        currentCalMonth = new Date().getMonth(); 
        currentCalYear = new Date().getFullYear();
        currentWeekStart = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d; })();
        renderHomeCalendar(); // મહિનો રિસેટ કર્યા પછી તરત કેલેન્ડર દોરો
        changeTab('all'); // ક્લિયર કર્યા પછી બધા ટાસ્ક બતાવો
        loadReminders();
    }

    // --- Pomodoro Focus Timer ---
    function toggleZenMode() { 
        document.body.classList.toggle("zen-mode"); 
    }
    
    function updatePomoDisplay() { 
        const pomoDisplay = $id("pomodoroDisplay");
        if (pomoDisplay) pomoDisplay.innerText = `${Math.floor(pomoTime / 60).toString().padStart(2, '0')}:${(pomoTime % 60).toString().padStart(2, '0')}`; 
    }
    
    function openPomoModal() {
        const select = $id("pomoTaskSelect");
        if (!select) { openModal('pomodoroModal'); return; }
        let html = `<option value="">🎯 Select Task (Optional)</option>`;
        const reminders = safeStorage("reminders", []);
        reminders.filter(r => r.status === 'pending').forEach(r => { 
            html += `<option value="${r.id}">${sanitizeHTML(r.task||'')}</option>`; 
        });
        select.innerHTML = html; 
        openModal('pomodoroModal');
    }
    
    function resetPomo() { 
        clearInterval(pomoInterval); 
        focusAudio.pause(); 
        const pomoTimeSelect = $id("pomoTimeSelect");
        pomoTime = parseInt(pomoTimeSelect?.value || "1500") || 1500; 
        updatePomoDisplay(); 
        if (wakeLock !== null) { 
            wakeLock.release().then(() => wakeLock = null); 
        } 
    }
    
    async function startPomo() { 
        clearInterval(pomoInterval);
        try { 
            if ('wakeLock' in navigator) { 
                wakeLock = await navigator.wakeLock.request('screen'); 
            } 
        } catch (err) {}
        
        pomoInterval = setInterval(() => { 
            pomoTime--; 
            updatePomoDisplay(); 
            if(pomoTime <= 0) { 
                clearInterval(pomoInterval); 
                focusAudio.pause(); 
                playAlarm(); 
                if (wakeLock !== null) { 
                    wakeLock.release().then(() => wakeLock = null); 
                }
                // Auto-log completed session
                const completedMins = Math.round((parseInt(document.getElementById('pomoTimeSelect')?.value||1500)) / 60);
                const selEl = document.getElementById('pomoTaskSelect');
                const taskName = selEl?.options[selEl.selectedIndex]?.text || 'Focus Session';
                logPomoSession(taskName, completedMins);
                hapticFeedback('success');
                showToast('Focus Session Complete! ' + completedMins + 'm logged', 'success'); 
                resetPomo(); 
                const selectedTaskId = document.getElementById("pomoTaskSelect").value;
                if(selectedTaskId) { 
                    if(confirm("Session finished! Did you complete the task?")) { 
                        toggleStatus(Number(selectedTaskId)); 
                    } 
                }
            } 
        }, 1000);
    }
    
    function pausePomo() { 
        clearInterval(pomoInterval); 
        focusAudio.pause(); 
        if (wakeLock !== null) { 
            wakeLock.release().then(() => wakeLock = null); 
        } 
    }

    // --- AI Features (Gemini Integration, via server-side proxy) ---
    async function aiGenerateSubtasks() {
        const taskInput = $id("taskInput");
        const taskName = taskInput ? taskInput.value.trim() : '';
        if(!taskName) return showToast("Enter Task Title first!", "error"); 
        if(!currentUser) return showToast("Sign in to use AI features!", "error");
        showToast("🪄 AI is planning...", "info");
        try {
            const prompt = `Break down the goal "${taskName}" into 3 to 4 short steps. Output ONLY a valid JSON array of strings. Example: ["Step 1", "Step 2"]`;
            let text = await callGeminiAI(prompt);
            text = text.replace(/```json/g, "").replace(/```/g, "").trim();
            JSON.parse(text).forEach(sub => addSubtaskField(sub, false)); 
            showToast("🪄 Auto-Plan Complete!", "success");
        } catch(e) { 
            showToast(e.message || "AI Error.", "error"); 
        }
    }
    
    async function aiSuggestTime() {
        const taskInput = $id("taskInput");
        const taskName = taskInput ? taskInput.value.trim() : '';
        if(!taskName) return showToast("Enter Task Title!", "error"); 
        if(!currentUser) return showToast("Sign in to use AI features!", "error");
        showToast("🪄 AI is thinking...", "info");
        try {
            const now = new Date();
            const prompt = `Task: "${taskName}". Current time: ${now.toISOString()}. Suggest a logical future date/time. Respond ONLY with format: YYYY-MM-DDTHH:mm.`;
            let aiTime = await callGeminiAI(prompt);
            const timeInput = $id("timeInput");
            if (timeInput) timeInput.value = aiTime.trim(); 
            showToast("🪄 Time set!", "success");
        } catch(e) { 
            showToast(e.message || "AI Error.", "error"); 
        }
    }
    
    async function generateAIReview() {
        if(!currentUser) return showToast("Sign in to use AI features!", "error");
        const outputDiv = $id("aiReviewOutput"); 
        if (!outputDiv) return showToast("AI review output unavailable.", "error");
        outputDiv.innerText = "🪄 Analyzing...";
        try {
            const reminders = safeStorage("reminders", []);
            const comp = reminders.filter(r => r.status === "completed").length; 
            const pend = reminders.length - comp; 
            const xp = localStorage.getItem("habitXP_tasks") || "0";
            const prompt = `Act as a coach. Completed: ${comp}, Pending: ${pend}, XP: ${xp}. Write a punchy 2-sentence review with emojis.`;
            const text = await callGeminiAI(prompt);
            outputDiv.innerText = text.trim(); 
            showToast("Review Generated!", "success");
        } catch(e) { 
            outputDiv.innerText = e.message || "Error generating review."; 
        }
    }
    
    async function startSmartVoiceAssistant() {
        if(!currentUser) return showToast("Sign in to use AI features!", "error");
        if (!('webkitSpeechRecognition' in window)) return showToast("Not supported.", "error");
        
        const rec = new webkitSpeechRecognition(); 
        rec.lang = 'en-IN'; 
        rec.onstart = function() { showToast("Listening... 🎙️", "info"); };
        rec.onresult = async function(event) { 
            const text = event.results[0][0].transcript;
            showToast("Processing...", "info"); 
            try {
                const now = new Date().toISOString();
                const prompt = `Extract info: "${text}". Current: ${now}. Return ONLY JSON: "task" (str), "time" (YYYY-MM-DDTHH:mm), "priority" (high/medium/low).`;
                let result = await callGeminiAI(prompt);
                result = result.replace(/```json|```/g, "").trim(); 
                const parsed = JSON.parse(result);
                let rems = safeStorage("reminders", []);
                rems.push({ 
                    id: Date.now(), 
                    task: parsed.task, 
                    time: parsed.time, 
                    priority: parsed.priority || 'medium', 
                    preAlarm: 0, 
                    assignee: "", 
                    notes: "", 
                    status: "pending", 
                    notified: false, 
                    repeat: "none", 
                    category: autoCategorizeTask(parsed.task) 
                });
                localStorage.setItem("reminders", JSON.stringify(rems)); 
                syncToCloud(); 
                loadReminders(); 
                showToast("Auto-Added! ✅", "success");
            } catch(err) { 
                showToast(err.message && err.message !== 'AI could not understand.' ? err.message : "AI could not understand.", "error"); 
            }
        }; 
        rec.start();
    }

    // --- Subtasks Handling ---
    
    function getSubtasksFromForm() { 
        let subs = []; 
        // New format (Advanced Options subtasksContainer)
        const container = document.getElementById('subtasksContainer');
        if (container) {
            container.querySelectorAll('div').forEach(row => {
                const val = row.querySelector('input[type=text]')?.value.trim();
                if (val) subs.push({ text: val, done: row.querySelector('input[type=checkbox]')?.checked || false });
            });
        }
        // Legacy format
        document.querySelectorAll(".subtask-item").forEach(item => { 
            const val = item.querySelector(".subtask-inp")?.value.trim(); 
            if(val) subs.push({ text: val, done: item.querySelector(".subtask-checkbox")?.checked || false }); 
        }); 
        return subs; 
    }
    
    function toggleSubtaskLocal(taskId, subIndex, checkbox) {
        let reminders = safeStorage("reminders", []);
        reminders = reminders.map(r => { 
            if(r.id === taskId && r.subtasks && r.subtasks[subIndex]) r.subtasks[subIndex].done = checkbox.checked; 
            return r; 
        });
        localStorage.setItem("reminders", JSON.stringify(reminders)); 
        syncToCloud(); 
        loadReminders(); 
    }

    // --- Productivity Chart ---
    function renderChart(period) {
        period = period || reportPeriod;
        const rems = safeStorage("reminders", []); 
        const days = period === 'month' ? 30 : 7;
        const dateArr = [...Array(days)].map((_, i) => { 
            const d = new Date(); 
            d.setDate(d.getDate() - (days - 1 - i)); 
            return formatDateLocal(d); 
        });
        const dataCounts = dateArr.map(date => rems.filter(r => r.time.split('T')[0] === date && r.status === 'completed').length);
        
        const chartCanvas = $id('productivityChart');
        const ctx = chartCanvas ? chartCanvas.getContext('2d') : null;
        if (!ctx) return;
        if(chartInstance) chartInstance.destroy();
        chartInstance = new Chart(ctx, { 
            type: 'bar', 
            data: { 
                labels: dateArr.map(d => d.slice(5)), 
                datasets: [{ label: 'Tasks', data: dataCounts, backgroundColor: '#34c759', borderRadius: 8 }] 
            }, 
            options: { 
                scales: { 
                    y: { beginAtZero: true, ticks: { stepSize: period === 'month' ? undefined : 1 } },
                    x: { ticks: { maxTicksLimit: period === 'month' ? 10 : 7 } }
                } 
            } 
        });
    }

    // ============================================================
