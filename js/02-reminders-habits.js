// Core data models: Habits and Reminders/Tasks — CRUD, attachments, location, categorization, custom templates, analytics/gamification, filtering, export/import, Eisenhower Matrix.

    // BATCH 2 — WEEKLY/MONTHLY REPORT EXTENDED STATS
    // ============================================================
    function setReportPeriod(period) {
        reportPeriod = period;
        document.querySelectorAll('.report-toggle button').forEach(b => b.classList.remove('active'));
        document.getElementById('reportBtn-' + period).classList.add('active');
        renderChart(period);
        renderExtendedReportStats(period);
        renderProductivityHeatmap();
        renderGoalPrediction(period);
    }

    function renderExtendedReportStats(period) {
        const container = document.getElementById('extendedReportStats');
        if (!container) return;
        const days = period === 'month' ? 30 : 7;
        const periodLabel = period === 'month' ? 'this month' : 'this week';

        const reminders = safeStorage('reminders', []);
        const moodLog = safeStorage('moodLog', {});
        const sleepLog = safeStorage('sleepLog', {});
        const habits = safeStorage('habits', []);

        const dateArr = [...Array(days)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (days - 1 - i));
            return formatDateLocal(d);
        });
        const dateSet = new Set(dateArr);

        const dueInPeriod = reminders.filter(r => dateSet.has(r.time.split('T')[0]));
        const completedInPeriod = dueInPeriod.filter(r => r.status === 'completed');
        const completionRate = dueInPeriod.length > 0 ? Math.round((completedInPeriod.length / dueInPeriod.length) * 100) : 0;

        const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
        const countByDate = {};
        completedInPeriod.forEach(r => {
            const d = r.time.split('T')[0];
            countByDate[d] = (countByDate[d]||0) + 1;
        });
        let bestDayLabel = '—', bestCount = 0, bestDayDate = null;
        Object.entries(countByDate).forEach(([d,c]) => { if(c > bestCount) { bestCount = c; bestDayDate = d; } });
        if (bestDayDate) {
            const bd = new Date(bestDayDate + 'T00:00:00');
            bestDayLabel = `${dayNames[bd.getDay()]} (${bestCount} tasks)`;
        }

        const moodEmojis = ['😄','😊','😐','😔','😢'];
        const moodVals = dateArr.map(d => moodLog[d]).filter(v => v !== undefined);
        let moodAvgLabel = 'No data';
        if (moodVals.length > 0) {
            const avg = moodVals.reduce((a,b)=>a+b,0) / moodVals.length;
            moodAvgLabel = `${moodEmojis[Math.round(avg)]} (${moodVals.length}/${days} days logged)`;
        }

        const sleepVals = dateArr.map(d => sleepLog[d]).filter(v => v !== undefined);
        let sleepAvgLabel = 'No data';
        if (sleepVals.length > 0) {
            const avg = sleepVals.reduce((a,b)=>a+b,0) / sleepVals.length;
            sleepAvgLabel = `${avg.toFixed(1)}h avg (${sleepVals.length}/${days} days)`;
        }

        let habitHtml = '<span style="color:#8e8e93; font-size:12px;">No habits tracked</span>';
        if (habits.length > 0) {
            habitHtml = habits.map(h => `<span style="display:inline-block; background:#fff; padding:4px 10px; border-radius:8px; font-size:12px; font-weight:700; margin:2px 4px 2px 0;">🔥 ${sanitizeHTML(h.name||'')}: ${h.streak}</span>`).join('');
        }

        container.innerHTML = `
            <div class="report-stat-row">
                <span style="font-size:13px; font-weight:600;">✅ Completion Rate (${periodLabel})</span>
                <span style="font-weight:800; color:var(--primary);">${completionRate}%</span>
            </div>
            <div class="report-bar-track"><div class="report-bar-fill" style="width:${completionRate}%; background:var(--primary);"></div></div>

            <div class="report-stat-row" style="margin-top:10px;">
                <span style="font-size:13px; font-weight:600;">🏆 Best Day</span>
                <span style="font-weight:700;">${bestDayLabel}</span>
            </div>
            <div class="report-stat-row">
                <span style="font-size:13px; font-weight:600;">😊 Avg Mood</span>
                <span style="font-weight:700;">${moodAvgLabel}</span>
            </div>
            <div class="report-stat-row" style="border-bottom:none;">
                <span style="font-size:13px; font-weight:600;">😴 Avg Sleep</span>
                <span style="font-weight:700;">${sleepAvgLabel}</span>
            </div>

            <div style="margin-top:12px;">
                <p style="font-size:11px; color:#8e8e93; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin:0 0 8px;">🔥 Habit Streaks</p>
                ${habitHtml}
            </div>
        `;
    }

    // --- Utility Functions ---
    function showToast(message, type = 'info') { 
        const container = document.getElementById("toastContainer");
        if (!container) return;
        // Sanitize message for XSS safety
        const safeMsg = typeof message === 'string' ? message : String(message);
        const toast = document.createElement("div"); 
        toast.className = `toast ${type}`; 
        let icon = type === "success" ? "✅" : (type === "error" ? "⚠️" : (type === "warning" ? "🔔" : "💡"));
        const iconSpan = document.createElement('span'); iconSpan.textContent = icon;
        const msgSpan = document.createElement('span'); msgSpan.textContent = safeMsg;
        toast.appendChild(iconSpan); toast.appendChild(msgSpan);
        container.appendChild(toast); 
        // Auto-remove with fade
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(-10px)'; }, 2700);
        setTimeout(() => toast.remove && toast.remove(), 3100);
    }

    // Global error handler — catches uncaught JS errors
    window.onerror = function(msg, src, line, col, err) {
        console.error('[App Error]', msg, 'Line:', line);
        // Don't show toast for minor script errors (e.g. extension conflicts)
        if (msg && (msg.includes('Script error') || msg.includes('ResizeObserver'))) return;
        showToast('Something went wrong. Please try again.', 'error');
    };
    window.onunhandledrejection = function(e) {
        console.error('[Unhandled Promise]', e.reason);
    };
    
    function toggleTheme() { 
        const isDark = document.body.classList.toggle("dark-mode"); 
        localStorage.setItem("darkMode", isDark); 
        document.getElementById("themeToggleBtn").innerText = isDark ? "☀️" : "🌙"; 
    }
    
    function getTodayStr() { 
        const today = new Date(); 
        return (new Date(today - today.getTimezoneOffset() * 60000)).toISOString().split('T')[0]; 
    }
    
    function getYesterdayStr() { 
        const yesterday = new Date(); 
        yesterday.setDate(yesterday.getDate() - 1); 
        return (new Date(yesterday - yesterday.getTimezoneOffset() * 60000)).toISOString().split('T')[0]; 
    }
    
       function toggleCustomRepeat() { 
        const val = document.getElementById("repeatInput").value; 
        const ui = document.getElementById("customRepeatUI");
        const typeSelect = document.getElementById("customRepeatType");
        
        if(val === "custom") { 
            ui.style.display = "block"; 
            if(typeSelect.value === "hours") typeSelect.value = "days"; // Custom માટે default Days રાખો
        } else if (val === "hourly") {
            ui.style.display = "block"; 
            typeSelect.value = "hours"; // Hourly માટે Hours લોક કરો
        } else { 
            ui.style.display = "none"; 
        } 
    }
 
    function loadDraft() { 
        if(editId) return; 
        const draft = safeStorage("taskDraft", null);
        if(draft) { 
            if(!document.getElementById("taskInput").value) document.getElementById("taskInput").value = draft.task || ""; 
            if(!document.getElementById("notesInput").innerText) document.getElementById("notesInput").innerText = draft.notes || ""; 
        } 
    }

    // --- Voice Memo Attachments ---
    function toggleVoiceMemo() {
        const btn = document.getElementById("recordBtn");
        if(!mediaRecorder || mediaRecorder.state === "inactive") {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                mediaRecorder = new MediaRecorder(stream); 
                mediaRecorder.start(); 
                audioChunks = [];
                btn.innerHTML = "⏹️ Stop Recording..."; 
                btn.style.background = "#ff3b30"; 
                btn.style.color = "white";
                
                mediaRecorder.addEventListener("dataavailable", event => { 
                    audioChunks.push(event.data); 
                });
                mediaRecorder.addEventListener("stop", () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); 
                    const reader = new FileReader(); 
                    reader.readAsDataURL(audioBlob); 
                    reader.onloadend = function() { 
                        voiceMemoBase64 = reader.result; 
                        document.getElementById("voiceMemoAudio").src = voiceMemoBase64; 
                        document.getElementById("voiceMemoPreviewContainer").style.display = "flex"; 
                        showToast("Saved!", "success"); 
                    }
                });
            }).catch(e => showToast("Mic denied.", "error"));
        } else { 
            mediaRecorder.stop(); 
            btn.innerHTML = "🔴 Voice Memo"; 
            btn.style.background = "rgba(255,59,48,0.1)"; 
            btn.style.color = "#ff3b30"; 
            mediaRecorder.stream.getTracks().forEach(t => t.stop()); 
        }
    }
    
    function removeVoiceMemo() { 
        voiceMemoBase64 = null; 
        document.getElementById("voiceMemoPreviewContainer").style.display = "none"; 
    }

    // --- Image & Document Attachments ---
    function handleImageUpload(event) {
        const file = event.target.files[0]; 
        if(!file) return;
        if(file.size > 2 * 1024 * 1024) return showToast("File too large! Max 2MB allowed.", "error"); 
        
        const reader = new FileReader();
        reader.onload = function(e) {
            if(file.type.startsWith('image/')) {
                isDoc = false;
                const img = new Image(); 
                img.onload = function() {
                    const canvas = document.createElement("canvas");
                    const MAX_WIDTH = 500; 
                    let scaleSize = 1; 
                    if(img.width > MAX_WIDTH) scaleSize = MAX_WIDTH / img.width;
                    
                    canvas.width = img.width * scaleSize; 
                    canvas.height = img.height * scaleSize;
                    const ctx = canvas.getContext("2d"); 
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    currentImageBase64 = canvas.toDataURL("image/jpeg", 0.7);
                    document.getElementById("imagePreview").src = currentImageBase64; 
                    document.getElementById("imagePreview").style.display = "block"; 
                    document.getElementById("docPreview").style.display = "none"; 
                    document.getElementById("imagePreviewContainer").style.display = "block";
                }
                img.src = e.target.result;
            } else { 
                isDoc = true; 
                currentImageBase64 = e.target.result; 
                document.getElementById("imagePreview").style.display = "none"; 
                document.getElementById("docPreview").style.display = "block"; 
                document.getElementById("imagePreviewContainer").style.display = "block"; 
            }
        }
        reader.readAsDataURL(file);
    }
    
    function removeImage() { 
        currentImageBase64 = null; 
        isDoc = false; 
        document.getElementById("imagePreviewContainer").style.display = "none"; 
        document.getElementById("imageUpload").value = ""; 
    }

    // --- Location Attachment ---
    function attachLocation() {
        if (navigator.geolocation) {
            showToast("Fetching Location...", "info");
            navigator.geolocation.getCurrentPosition((pos) => {
                const link = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
                const notesEl = document.getElementById("notesInput");
                const locLink = document.createElement('a');
                locLink.href = link; locLink.target = '_blank';
                locLink.style.cssText = 'background:#34c759;color:white;padding:4px 8px;border-radius:8px;text-decoration:none;font-size:12px;display:inline-block;margin-top:6px;';
                locLink.innerText = 'View Location';
                notesEl.appendChild(document.createElement('br'));
                notesEl.appendChild(locLink);
                showToast("Location attached!", "success");
            }, () => showToast("Denied.", "error"));
        } else { 
            showToast("Not supported.", "error"); 
        }
    }

    // --- Categorization ---
    function autoCategorizeTask(taskName) {
        const lowerTask = taskName.toLowerCase();
        if (/call|contact|phone|ring/.test(lowerTask)) return { name: "Call", icon: "📞" };
        if (/buy|shop|grocery|milk|bread|mall|market/.test(lowerTask)) return { name: "Shopping", icon: "🛒" };
        if (/doctor|pill|medicine|workout|gym|clinic|health|water/.test(lowerTask)) return { name: "Health", icon: "🏥" };
        if (/meet|zoom|boss|project|office|email|work|code|sync/.test(lowerTask)) return { name: "Work", icon: "💻" };
        if (/pay|bank|money|bill|salary|rent|finance/.test(lowerTask)) return { name: "Finance", icon: "💰" };
        if (/read|study|book|exam|homework|assignment|test/.test(lowerTask)) return { name: "Study", icon: "📚" };
        return { name: "Task", icon: "📝" }; 
    }

    // --- Custom Templates ---
    function renderCustomTemplates() {
        const group = document.getElementById("customSavedTemplatesGroup");
        if(!group) return;
        const temps = safeStorage("customTemplates", []);
        let html = '';
        temps.forEach((t, i) => { 
            html += `<option value="custom_${i}">⭐ ${sanitizeHTML(t.title||'')}</option>`; 
        }); 
        group.innerHTML = html;
    }

    function applyQuickTemplate() {
        const val = document.getElementById('quickTemplateSelect').value;
        if (!val) return;
        const ti = document.getElementById('taskInput');
        const pi = document.getElementById('priorityInput');
        const ri = document.getElementById('repeatInput');
        const tmi = document.getElementById('timeInput');
        const tagI = document.getElementById('tagsInput');

        const now = new Date();
        const today = now.toISOString().slice(0,10);

        const templates = {
            Birthday:    { task:'🎂 Birthday', priority:'high', repeat:'yearly', time: today+'T00:00', tags:'birthday,celebration' },
            Anniversary: { task:'💍 Anniversary', priority:'high', repeat:'yearly', time: today+'T10:00', tags:'anniversary' },
            Event:       { task:'📅 Event', priority:'medium', repeat:'none', time: today+'T10:00', tags:'event' },
            Appointment: { task:'🏥 Appointment', priority:'high', repeat:'none', time: today+'T10:00', tags:'health,appointment' },
            Water:       { task:'💧 Drink Water', priority:'low', repeat:'hourly', time: today+'T08:00', tags:'health,hydration' },
            Food:        { task:'🍽️ Meal Time', priority:'medium', repeat:'daily', time: today+'T13:00', tags:'meal,health' },
            Wakeup:      { task:'⏰ Wake Up', priority:'high', repeat:'daily', time: today+'T06:00', tags:'morning,routine' },
            Sleeping:    { task:'😴 Bedtime', priority:'medium', repeat:'daily', time: today+'T22:00', tags:'sleep,routine' },
            GYM:         { task:'💪 GYM Workout', priority:'high', repeat:'daily', time: today+'T07:00', tags:'fitness,health' },
            Walking:     { task:'🚶 Morning Walk', priority:'medium', repeat:'daily', time: today+'T06:30', tags:'fitness,health' },
            Running:     { task:'🏃 Running', priority:'medium', repeat:'daily', time: today+'T06:00', tags:'fitness,health' },
            Reading:     { task:'📖 Reading', priority:'low', repeat:'daily', time: today+'T21:00', tags:'learning,habit' },
            Bill:        { task:'🧾 Pay Bill', priority:'high', repeat:'monthly', time: today+'T10:00', tags:'finance,bill' },
            Rent:        { task:'🏠 Rent Payment', priority:'high', repeat:'monthly', time: today+'T10:00', tags:'finance,rent' },
            EMI:         { task:'💳 EMI Payment', priority:'high', repeat:'monthly', time: today+'T10:00', tags:'finance,emi' },
        };

        // Check custom templates too
        const custom = safeStorage('customTemplates', []);
        const customT = custom.find(t => t.name === val);
        if (customT) {
            if(ti) ti.value = customT.task;
            if(pi) pi.value = customT.priority || 'medium';
            if(ri) ri.value = customT.repeat || 'none';
            if(tmi) tmi.value = customT.time || today+'T09:00';
            if(tagI) tagI.value = customT.tags || '';
            return;
        }

        const t = templates[val];
        if (!t) return;
        if(ti) ti.value = t.task;
        if(pi) pi.value = t.priority;
        if(ri) ri.value = t.repeat;
        if(tmi) tmi.value = t.time;
        if(tagI) tagI.value = t.tags || '';
        updateCategoryPreview();
    }

    function saveCustomTemplate() {
        const task = document.getElementById('taskInput')?.value.trim();
        if (!task) return showToast('Fill task name first!', 'error');
        const name = prompt('Template name:', task);
        if (!name) return;
        const templates = safeStorage('customTemplates', []);
        templates.unshift({
            name, task,
            priority: document.getElementById('priorityInput')?.value || 'medium',
            repeat: document.getElementById('repeatInput')?.value || 'none',
            time: document.getElementById('timeInput')?.value || '',
            tags: document.getElementById('tagsInput')?.value || ''
        });
        localStorage.setItem('customTemplates', JSON.stringify(templates));
        loadCustomTemplates();
        showToast('Template saved! 💾', 'success');
        hapticFeedback('success');
    }

    function loadCustomTemplates() {
        const group = document.getElementById('customSavedTemplatesGroup');
        if (!group) return;
        const templates = safeStorage('customTemplates', []);
        group.innerHTML = templates.map(t =>
            `<option value="${sanitizeHTML(t.name||'')}">${sanitizeHTML(t.name||'')}</option>`
        ).join('');
    }

    // --- Analytics & Gamification ---
    function openAnalyticsModal() {
        const reminders = safeStorage("reminders", []);
        document.getElementById("statTotalTasks").innerText = reminders.length; 
        document.getElementById("statCompletedTasks").innerText = reminders.filter(r => r.status === "completed").length;
        openModal('analyticsModal');
    }

    function updateMiniDashboard() {
        const reminders = Array.isArray(safeStorage("reminders", [])) ? safeStorage("reminders", []) : [];
        const habits = Array.isArray(safeStorage("habits", [])) ? safeStorage("habits", []) : [];
        const todayStr = getTodayStr(); 
        const tomorrow = new Date(); 
        tomorrow.setHours(0,0,0,0); 
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        let todayPendingTasks = 0; 
        let todayCompletedTasks = 0;
        const completedReminders = reminders.filter(r => r.status === "completed").length;
        
        reminders.forEach(r => { 
            const rDate = new Date(r.time);
            if (r.status !== "completed") { 
                if (!isNaN(rDate.getTime()) && rDate < tomorrow) todayPendingTasks++; 
            } else { 
                const taskDate = (r.time || '').split('T')[0];
                if (taskDate === todayStr) todayCompletedTasks++; 
            }
        });
        
        const tasksTodayEl = document.getElementById("widgetTasksToday");
        const habitsTodayEl = document.getElementById("widgetHabitsToday");
        if (tasksTodayEl) tasksTodayEl.innerText = `${todayPendingTasks}`;
        if (habitsTodayEl) habitsTodayEl.innerText = `${habits.filter(h => h.lastCheckIn !== todayStr).length} habits pending`;

        // Upcoming count
        const now = new Date();
        const upcomingTasks = reminders.filter(r => r.status !== 'completed' && !r.archived && r.time && !isNaN(new Date(r.time).getTime()) && new Date(r.time) > now);
        const upcomingEl = document.getElementById('widgetUpcomingCount');
        const nextLabelEl = document.getElementById('widgetNextLabel');
        if (upcomingEl) upcomingEl.innerText = upcomingTasks.length;
        if (nextLabelEl) {
            const next = upcomingTasks.slice().sort((a,b) => new Date(a.time)-new Date(b.time))[0];
            if (next) {
                const mins = Math.round((new Date(next.time)-now)/60000);
                nextLabelEl.innerText = mins < 60 ? 'Next in '+mins+'m' : mins < 1440 ? 'Next in '+Math.round(mins/60)+'h' : 'Next: '+new Date(next.time).toLocaleDateString('en-IN',{day:'2-digit',month:'short'});
            } else nextLabelEl.innerText = 'All clear!';
        }

        // Completed count + rate
        const doneEl = document.getElementById('widgetDoneCount');
        const rateEl = document.getElementById('widgetCompletionRate');
        const rate = reminders.length ? Math.round((completedReminders/reminders.length)*100) : 0;
        if (doneEl) doneEl.innerText = completedReminders;
        if (rateEl) rateEl.innerText = rate + '% completion';

        // Streak
        const streakEl = document.getElementById('widgetStreakCount');
        const streakLbl = document.getElementById('widgetStreakLabel');
        const bestStreak = Math.max(0, ...habits.map(h => h.streak||0));
        if (streakEl) streakEl.innerText = bestStreak + '🔥';
        if (streakLbl) streakLbl.innerText = habits.length ? habits[0].name+' streak' : 'No habits yet';
    }
    
    function updateAnalyticsAndGamification() {
        const reminders = safeStorage("reminders", []);
        const completedReminders = reminders.filter(r => r.status === "completed").length; 
        const totalTasks = reminders.length;
        let percentage = totalTasks > 0 ? Math.round((completedReminders / totalTasks) * 100) : 0;
        
        document.getElementById("taskCountText").innerText = `${completedReminders}/${totalTasks} Completed`; 
        document.getElementById("percentageText").innerText = `${percentage}%`; 
        document.getElementById("progressFill").style.width = `${percentage}%`;
        
        const habitCompleted = parseInt(localStorage.getItem("habitXP_tasks") || "0"); 
        const totalCompletedForXP = completedReminders + habitCompleted;
        const totalXP = totalCompletedForXP * 10;
        const newLevel = Math.floor(totalCompletedForXP / 5) + 1; 
        const xpInCurrentLevel = totalXP % 50;
        
        const profLevel = document.getElementById("profileCardLevel");
        const profXP = document.getElementById("profileCardXP");
        const profFill = document.getElementById("profileCardXPFill");
        if(profLevel) profLevel.innerText = `⭐ Level ${newLevel}`;
        if(profXP) profXP.innerText = `✨ ${xpInCurrentLevel}/50 XP`;
        if(profFill) profFill.style.width = `${(xpInCurrentLevel/50)*100}%`;
        
        if (newLevel > userLevel) { 
            userLevel = newLevel; 
            localStorage.setItem("userLevel", userLevel); 
            fireConfetti(); 
        } else if (newLevel < userLevel) { 
            userLevel = newLevel; 
            localStorage.setItem("userLevel", userLevel); 
        }
    }

    // --- Filtering ---
    function filterByTag(tag) { 
        if(activeTagFilter === tag) { 
            activeTagFilter = ""; 
        } else { 
            activeTagFilter = tag; 
        } 
        loadReminders(); 
    }
    
    function filterByDate(dateStr) { 
        if (selectedDateFilter === dateStr) { 
            selectedDateFilter = null; 
            document.getElementById("tabContainer").style.display = "flex"; 
        } else { 
            selectedDateFilter = dateStr; 
            document.getElementById("tabContainer").style.display = "none"; 
        } 
        loadReminders(); 
    }

    function changeTab(tabName) { 
        // Redirect archive to all (archive tab removed)
        if (tabName === 'archive') tabName = 'all';
        currentTab = tabName; 
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active')); 
        const tabEl = document.getElementById('tab-' + tabName);
        if (tabEl) tabEl.classList.add('active');
        searchReminders(); 
        hapticFeedback('light');
    }
    
    function searchReminders() { 
        loadReminders(document.getElementById("searchInput") ? document.getElementById("searchInput").value.toLowerCase() : ""); 
    }

    // --- Habits Core ---
    function addHabit() { 
        const raw = document.getElementById("habitInput").value.trim(); 
        if(!raw) return showToast("Enter habit name.", "error");
        const name = raw.slice(0, 80);
        const habits = safeStorage("habits", []);
        if (habits.some(h => h.name.toLowerCase() === name.toLowerCase())) return showToast('Habit already exists!', 'error');
        habits.push({ id: Date.now(), name, streak: 0, maxStreak: 0, lastCheckIn: null, history: [] }); 
        localStorage.setItem("habits", JSON.stringify(habits));
        document.getElementById("habitInput").value = "";
        showToast("Habit added! 🔥", "success"); 
        loadHabits(); 
        renderGettingStartedCard();
        syncToCloud(); 
        hapticFeedback('success');
    }
    
    function checkInHabit(id) {
        let habits = safeStorage("habits", []); 
        const todayStr = getTodayStr(); 
        const yesterdayStr = getYesterdayStr(); 
        let checkedIn = false;
        
        habits = habits.map(habit => {
            if (habit.id === id) {
                if (habit.lastCheckIn === todayStr) return habit;
                if (habit.lastCheckIn === yesterdayStr) { 
                    habit.streak += 1; 
                } else { 
                    habit.streak = 1; 
                }
                if (habit.streak > habit.maxStreak) habit.maxStreak = habit.streak;
                
                habit.lastCheckIn = todayStr; 
                checkedIn = true; 
                if(!habit.history) habit.history = []; 
                if(!habit.history.includes(todayStr)) habit.history.push(todayStr);
                
                showToast(`🔥 Streak: ${habit.streak}!`, "success");
            } 
            return habit;
        });
        
        if(checkedIn) { 
            localStorage.setItem("habits", JSON.stringify(habits)); 
            loadHabits(); 
            let completed = parseInt(localStorage.getItem("habitXP_tasks") || "0"); 
            localStorage.setItem("habitXP_tasks", completed + 1); 
            updateAnalyticsAndGamification(); 
            syncToCloud(); 
        }
    }

    function deleteHabit(id) { 
        let habits = safeStorage("habits", []); 
        localStorage.setItem("habits", JSON.stringify(habits.filter(h => h.id !== id))); 
        showToast("Deleted.", "error"); 
        loadHabits(); 
        syncToCloud(); 
    }

    function loadHabits() {
        const habitList = document.getElementById("habitList");
        habitList.innerHTML = ""; 
        const habits = safeStorage("habits", []); 
        const todayStr = getTodayStr();
        
        habits.forEach(habit => {
            const isCheckedInToday = habit.lastCheckIn === todayStr; 
            const li = document.createElement("li"); 
            li.className = "habit-item";
            li.style.background = "#fff"; 
            li.style.padding = "15px"; 
            li.style.borderRadius = "16px"; 
            li.style.marginBottom = "10px"; 
            li.style.border = "1px solid #f2f2f7";
            
            li.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <div>
                    <h4 style="margin:0 0 5px 0; font-size:15px; color:#1c1c1e;">${sanitizeHTML(habit.name||'')}</h4>
                    <span style="background:#e5f1ff; color:#007aff; font-size:11px; padding:4px 8px; border-radius:8px; font-weight:700;">🔥 ${habit.streak}</span>
                </div>
                <div style="display:flex; gap:8px;">
                    <button style="background:${isCheckedInToday?'#e5e5ea':'#34c759'}; color:${isCheckedInToday?'#8e8e93':'#fff'}; border:none; border-radius:10px; padding:8px 12px; font-weight:700; font-size:12px; cursor:pointer;" onclick="checkInHabit(${habit.id})" ${isCheckedInToday?"disabled":""}>${isCheckedInToday ? "Done ✅" : "Check-in"}</button>
                    <button style="background:#e5f1ff; color:var(--primary); border:none; border-radius:10px; padding:8px 10px; cursor:pointer;" onclick="openHabitDetail(${habit.id})" title="Habit Details">📊</button>
                    <button style="background:#ffe5e5; color:#ff3b30; border:none; border-radius:10px; padding:8px 12px; cursor:pointer;" onclick="deleteHabit(${habit.id})">🗑️</button>
                </div>
            </div>`;
            habitList.appendChild(li);
        }); 
        updateMiniDashboard();
    }

    // --- Reminders Core ---
    function addOrUpdateReminder() {
        const task = document.getElementById("taskInput").value.trim();
        const notes = (document.getElementById("notesInput").innerText || '').trim();
        const time = document.getElementById("timeInput").value; 
        const repeat = document.getElementById("repeatInput").value; 
        const priority = document.getElementById("priorityInput").value; 
        const image = currentImageBase64;
        const audio = voiceMemoBase64; 
        const tags = document.getElementById("tagsInput").value.trim(); 
        const subtasks = getSubtasksFromForm(); 
        const preAlarm = parseInt(document.getElementById("preAlarmInput").value) || 0;
        const assignee = document.getElementById("assigneeInput").value.trim();
        const project = document.getElementById("taskProjectInput").value;
        
                let customRepeat = null;
        if(repeat === 'custom' || repeat === 'hourly') { 
            customRepeat = { interval: document.getElementById("customRepeatInterval").value, type: document.getElementById("customRepeatType").value };
        }

        if (!task || !time) return showToast("Enter title and time.", "error");
        
        const aiCategory = (() => {
            const override = document.getElementById("categoryOverrideInput").value;
            if (override) { try { return JSON.parse(override); } catch(e) {} }
            return autoCategorizeTask(task);
        })();
        let reminders = safeStorage("reminders", []);
        
        if (editId) {
            const index = reminders.findIndex(r => r.id === editId);
            if (index !== -1) { 
                reminders[index].task = task;
                reminders[index].notes = notes; 
                reminders[index].time = time; 
                reminders[index].repeat = repeat; 
                reminders[index].priority = priority; 
                reminders[index].image = image; 
                reminders[index].audio = audio;
                reminders[index].isDoc = isDoc; 
                reminders[index].category = aiCategory; 
                reminders[index].tags = tags; 
                reminders[index].subtasks = subtasks; 
                reminders[index].customRepeat = customRepeat; 
                reminders[index].notified = false;
                reminders[index].preAlarm = preAlarm; 
                reminders[index].assignee = assignee;
                reminders[index].project = project;
            } 
            editId = null; 
            showToast("Updated!", "success");
        } else {
            reminders.push({ 
                id: Date.now(), 
                task, 
                notes, 
                image, 
                audio, 
                isDoc, 
                pinned: false, 
                time, 
                repeat, 
                customRepeat, 
                priority, 
                tags, 
                subtasks, 
                category: aiCategory, 
                status: "pending", 
                notified: false, 
                preAlarm: preAlarm, 
                assignee: assignee,
                project
            });
            showToast(`Saved!`, "success");
        }
        
        localStorage.setItem("reminders", JSON.stringify(reminders)); 
        localStorage.removeItem("taskDraft"); 
        loadReminders(); 
        renderGettingStartedCard();
        syncToCloud();
        switchPage('home'); // Bug Fix 4: Navigate to home after save
    }

    function editReminder(id) {
        const reminder = (safeStorage("reminders", [])).find(r => r.id === id);
        if (reminder) {
            window._editMode = true;
            document.getElementById("taskInput").value = reminder.task;
            document.getElementById("notesInput").innerText = reminder.notes || ""; 
            document.getElementById("timeInput").value = reminder.time; 
            document.getElementById("repeatInput").value = reminder.repeat || "none"; 
            document.getElementById("priorityInput").value = reminder.priority || "medium";
            document.getElementById("tagsInput").value = reminder.tags || ""; 
            document.getElementById("preAlarmInput").value = reminder.preAlarm || "0"; 
            document.getElementById("assigneeInput").value = reminder.assignee || "";
            document.getElementById("taskProjectInput").value = reminder.project || "";
            document.getElementById("categoryOverrideInput").value = reminder.category ? JSON.stringify(reminder.category) : "";
            updateCategoryPreview();
            
            // Auto-open Advanced Options if task has advanced fields
            if (reminder.notes || reminder.tags || reminder.subtasks?.length || reminder.assignee || reminder.preAlarm) {
                const advPanel = document.getElementById('advancedOptionsPanel');
                const advArrow = document.getElementById('advOptionsArrow');
                if (advPanel) advPanel.style.display = 'block';
                if (advArrow) advArrow.style.transform = 'rotate(180deg)';
            }

            document.getElementById("subtasksContainer").innerHTML = "";
            if(reminder.subtasks) reminder.subtasks.forEach(sub => addSubtaskField(sub.text, sub.done));
            
                       if((reminder.repeat === 'custom' || reminder.repeat === 'hourly') && reminder.customRepeat) { 
                document.getElementById("customRepeatUI").style.display = "block"; 
                document.getElementById("customRepeatInterval").value = reminder.customRepeat.interval; 
                document.getElementById("customRepeatType").value = reminder.customRepeat.type; 
            } else { 
                document.getElementById("customRepeatUI").style.display = "none"; 
            }
 
            if(reminder.image) { 
                currentImageBase64 = reminder.image;
                isDoc = reminder.isDoc; 
                document.getElementById("imagePreviewContainer").style.display = "block";
                if(isDoc) { 
                    document.getElementById("imagePreview").style.display = "none"; 
                    document.getElementById("docPreview").style.display = "block"; 
                } else { 
                    document.getElementById("imagePreview").src = currentImageBase64; 
                    document.getElementById("imagePreview").style.display = "block"; 
                    document.getElementById("docPreview").style.display = "none"; 
                }
            } else { 
                removeImage(); 
            }
            
            if(reminder.audio) { 
                voiceMemoBase64 = reminder.audio; 
                document.getElementById("voiceMemoAudio").src = voiceMemoBase64; 
                document.getElementById("voiceMemoPreviewContainer").style.display = "flex"; 
            } else { 
                removeVoiceMemo(); 
            }
            
            editId = id;
            const _mt1=document.getElementById("modalTitle"); if(_mt1) _mt1.innerText = "Edit Task"; 
            const _sb2=document.getElementById("submitBtn"); if(_sb2) _sb2.innerText = "Update Task"; 
            switchPage('add'); 
        }
    }

    function togglePin(id) { 
        let reminders = safeStorage("reminders", []); 
        reminders = reminders.map(r => { 
            if(r.id === id) r.pinned = !r.pinned; 
            return r; 
        }); 
        localStorage.setItem("reminders", JSON.stringify(reminders)); 
        loadReminders(); 
        syncToCloud(); 
    }
        function initSortable() {
        const el = document.getElementById('reminderList');
        if(window.sortableInst) window.sortableInst.destroy();
        window.sortableInst = new Sortable(el, { 
            handle: '.drag-handle', 
            animation: 200, 
            delay: 150,               // <--- નવું ઉમેર્યું (મોબાઈલ માટે)
            delayOnTouchOnly: true,   // <--- નવું ઉમેર્યું (ટચ/સ્ક્રોલ બ્લોક ના થાય)
            onEnd: function () {
                const sortType = document.getElementById("sortInput").value;
                if(sortType !== "manual") { 
                    showToast("Switch to 'Custom Order' to save!", "error"); 
                    loadReminders(); 
                    return; 
                }
                const listItems = document.querySelectorAll('#reminderList .reminder-item'); 
                let newOrderIds = []; 
                listItems.forEach(li => newOrderIds.push(Number(li.getAttribute('data-id'))));
                
                let oldRems = safeStorage("reminders", []); 
                let sortedRems = []; 
                newOrderIds.forEach(id => { 
                    const r = oldRems.find(x => x.id === id); 
                    if(r) sortedRems.push(r); 
                });
                const filteredOut = oldRems.filter(x => !newOrderIds.includes(x.id)); 
                sortedRems = sortedRems.concat(filteredOut); 
                localStorage.setItem("reminders", JSON.stringify(sortedRems)); 
                syncToCloud();
            }
        });
    }

    function loadReminders(filterText = "") {
        const reminderList = document.getElementById("reminderList");
        reminderList.innerHTML = "";
        let reminders = safeStorage("reminders", []); 
        updateAnalyticsAndGamification(); 
        updateMiniDashboard();

        // Tag Filters Rendering
        let allTags = new Set();
        reminders.forEach(r => { 
            if(r.tags) { 
                r.tags.split(',').forEach(t => { 
                    if(t.trim()) allTags.add(t.trim()); 
                }); 
            }
        });
        
        let tagsHtml = `<button class="template-chip ${activeTagFilter===''?'active':''}" onclick="filterByTag('')">All Tags</button>`;
        allTags.forEach(t => { 
            tagsHtml += `<button class="template-chip ${activeTagFilter===t?'active':''}" onclick="filterByTag('${escInline(t)}')">${sanitizeHTML(t)}</button>`; 
        });
        document.getElementById("tagFilterContainer").innerHTML = tagsHtml;
        renderProjectFilter();
        
        // Date & Tab Filtering
        if (currentTab === 'archive') {
            // Archive removed — redirect to all
            reminders = reminders.filter(r => !r.archived);
        } else {
            reminders = reminders.filter(r => !r.archived);
            if (selectedDateFilter) { 
                reminders = reminders.filter(r => r.time && r.time.split('T')[0] === selectedDateFilter); 
            } else {
                const today = new Date(); 
                today.setHours(0,0,0,0);
                const tomorrow = new Date(today); 
                tomorrow.setDate(tomorrow.getDate() + 1);
                const now = new Date();

                reminders = reminders.filter(r => {
                    if (!r.time) return currentTab === 'all';
                    const rDate = new Date(r.time);
                    if (currentTab === 'done') return r.status === 'completed'; 
                    if (currentTab === 'all') return true; 
                    if (r.status === 'completed') return false;
                    // Today: tasks due today (from midnight to midnight)
                    if (currentTab === 'today') return rDate >= today && rDate < tomorrow;
                    // Upcoming: all future tasks from now onwards
                    if (currentTab === 'upcoming') return rDate >= now;
                    return true;
                });
            }
        }

        // Text & Active Tag Filtering
        if (filterText) {
            reminders = reminders.filter(r => 
                r.task.toLowerCase().includes(filterText) || 
                (r.notes && r.notes.toLowerCase().includes(filterText)) || 
                (r.tags && r.tags.toLowerCase().includes(filterText))
            );
        }
              if (activeTagFilter) {
            reminders = reminders.filter(r => r.tags && r.tags.includes(activeTagFilter));
        }
        if (activeProjectFilter !== '') {
            reminders = reminders.filter(r => String(r.project || '') === String(activeProjectFilter));
        }
        
        // ટાસ્ક 0 હોય તો પણ કેલેન્ડર હંમેશાં રેન્ડર થવું જ જોઈએ!
        renderHomeCalendar();
        
        clearInterval(timerInterval);
        if (reminders.length === 0) { 
            reminderList.innerHTML = `<div style="text-align:center; padding:40px 20px; color:#8e8e93;">No tasks found</div>`; 
            return; 
        }

        // Sorting
        const sortType = document.getElementById("sortInput").value;
        if(sortType !== "manual") {
            reminders.sort((a, b) => {
                if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
                const pMap = { "high": 3, "medium": 2, "low": 1 };
                if (sortType === "priority-high") return pMap[b.priority||"medium"] - pMap[a.priority||"medium"] || new Date(a.time) - new Date(b.time);
                if (sortType === "priority-low") return pMap[a.priority||"medium"] - pMap[b.priority||"medium"] || new Date(a.time) - new Date(b.time);
                return new Date(a.time) - new Date(b.time); 
            });
        }

        // Rendering List Items
        reminders.forEach(reminder => {
            const li = document.createElement("li"); 
            const isCompleted = reminder.status === "completed"; 
            const priorityClass = reminder.priority ? `priority-${reminder.priority}` : 'priority-medium';
            li.className = `reminder-item ${priorityClass}${isCompleted ? ' completed-item' : ''}`;
            if(isCompleted) li.style.borderLeftColor = "#8e8e93";
            li.id = `rem_card_${reminder.id}`; 
            li.setAttribute('data-id', reminder.id);
            
            const formattedTime = new Date(reminder.time).toLocaleString("en-IN", { 
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' 
            });

            let pinnedBadge = reminder.pinned ? `<div style="position:absolute; top:-10px; right:-10px; font-size:16px;">⭐</div>` : ``;
            let catHTML = reminder.category ? `<div style="background:#e5f1ff; color:#007aff; padding:4px 8px; border-radius:8px; font-size:11px; font-weight:700; margin-bottom:5px; display:inline-block;">${sanitizeHTML(reminder.category.icon||'')} ${sanitizeHTML(reminder.category.name||'')}</div>` : '';
            
            let projHTML = '';
            if (reminder.project) {
                const allProjects = safeStorage('projects', []);
                const proj = allProjects.find(p => String(p.id) === String(reminder.project));
                if (proj) projHTML = `<div class="project-badge-tag" style="background:${proj.color}22; color:${proj.color};">${sanitizeHTML(proj.emoji||'')} ${sanitizeHTML(proj.name||'')}</div>`;
            }

            // Blocked badge for task dependencies
            const blocked = !isCompleted && typeof isTaskBlocked === 'function' && isTaskBlocked(reminder.id);
            const blockedHTML = blocked ? `<div style="background:#ff3b3022;color:#ff3b30;padding:3px 8px;border-radius:8px;font-size:11px;font-weight:700;display:inline-block;margin-bottom:4px;">🔒 Blocked</div>` : '';
            
                        let repeatText = '';
            if((reminder.repeat === 'custom' || reminder.repeat === 'hourly') && reminder.customRepeat) {
                repeatText = `Every ${reminder.customRepeat.interval} ${reminder.customRepeat.type}`;
            } else if (reminder.repeat && reminder.repeat !== 'none') {
                repeatText = reminder.repeat.charAt(0).toUpperCase() + reminder.repeat.slice(1);
            }
            let repeatHTML = (reminder.repeat && reminder.repeat !== 'none') ? `<div style="background:#fff0f0; color:#ff3b30; padding:4px 8px; border-radius:8px; font-size:11px; font-weight:700; margin-bottom:5px; display:inline-block; margin-left:5px;">🔁 ${repeatText}</div>` : '';

            let tagsHTML = "";
            if(reminder.tags) { 
                reminder.tags.split(',').forEach(tag => { 
                    if(tag.trim()) tagsHTML += `<span style="background:#e5e5ea; color:#8e8e93; padding:4px 8px; border-radius:8px; font-size:11px; font-weight:700; margin-bottom:5px; display:inline-block; margin-left:5px;">${sanitizeHTML(tag.trim())}</span> `; 
                }); 
            }
            
            let subHTML = "";
            if(reminder.subtasks && reminder.subtasks.length > 0) {
                let doneCount = reminder.subtasks.filter(s=>s.done).length;
                let totalCount = reminder.subtasks.length; 
                let pct = (doneCount/totalCount)*100;
                subHTML = `<div style="width:100%; height:6px; background:#e5e5ea; border-radius:6px; margin:8px 0; overflow:hidden;"><div style="height:100%; width:${pct}%; background:#34c759;"></div></div><ul style="list-style:none; padding:0; margin:0;">`;
                reminder.subtasks.forEach((sub, idx) => { 
                    subHTML += `<li style="display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:4px; color:#666;"><input type="checkbox" style="width:16px;height:16px;margin:0;" ${sub.done?'checked':''} onchange="toggleSubtaskLocal(${reminder.id}, ${idx}, this)" ${isCompleted?'disabled':''}> <span style="${sub.done?'text-decoration:line-through;opacity:0.6;':''} font-weight:500;">${sanitizeHTML(sub.text||'')}</span></li>`; 
                });
                subHTML += `</ul>`;
            }

            let notesHTML = reminder.notes ? `<div style="margin: 8px 0; font-size: 13px; color: #666; background: #f2f2f7; padding: 10px; border-radius: 10px;">${sanitizeHTML(reminder.notes)}</div>` : "";
            
            let actionBtns;
            if (reminder.archived) {
                actionBtns = `<div style="display:flex; gap:8px; width:100%;">
                    <button style="flex:1; background:#5e5ce6; color:white; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="unarchiveTask(${reminder.id})">📤 Unarchive</button>
                    <button style="flex:1; background:#ff3b30; color:white; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="deleteReminder(${reminder.id})">🗑️ Delete</button>
                   </div>`;
            } else if (isCompleted) {
                actionBtns = `<div style="display:flex; gap:8px; width:100%;">
                    <button style="flex:1; background:#ff9500; color:white; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="toggleStatus(${reminder.id})">Undo</button>
                    <button style="flex:none; background:#5e5ce6; color:white; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="archiveTask(${reminder.id})" title="Archive">📦</button>
                    <button style="flex:1; background:#ff3b30; color:white; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="deleteReminder(${reminder.id})">🗑️</button>
                   </div>`;
            } else {
                actionBtns = `<div style="display:flex; gap:8px; width:100%; flex-wrap:wrap;">
                    <button style="flex:1; background:#34c759; color:white; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="toggleStatus(${reminder.id})">Done</button>
                    <button style="flex:1; background:#007aff; color:white; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="editReminder(${reminder.id})">Edit</button>
                    <button style="flex:none; background:#ffcc00; color:black; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="togglePin(${reminder.id})">${reminder.pinned ? 'Unpin' : '⭐'}</button>
                    <button style="flex:none; background:#5e5ce6; color:white; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="openShareModal(${reminder.id})" title="Share with family">📤</button>
                    <button style="flex:none; background:#ff3b30; color:white; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="deleteReminder(${reminder.id})">🗑️</button>
                   </div>`;
            }
                   
            let completedDetailsHTML = isCompleted ? `<div style="margin-top:8px; display:inline-block; background:#e5f9e9; color:#34c759; padding:4px 8px; border-radius:8px; font-size:11px; font-weight:700;">✅ Done</div>` : `<div id="timer-${reminder.id}" style="margin-top:8px; display:inline-block; background:#f2f2f7; color:#1c1c1e; padding:4px 8px; border-radius:8px; font-size:11px; font-weight:700;">Loading...</div>`;
            
            const leftControl = bulkMode 
                ? `<input type="checkbox" onchange="toggleBulkSelect(${reminder.id}, this.checked)" ${selectedBulkIds.has(reminder.id) ? 'checked' : ''} style="width:22px; height:22px; margin-right:10px; flex-shrink:0; cursor:pointer;">`
                : `<div class="drag-handle" style="cursor:grab; font-size:20px; color:#aaa; margin-right:10px; padding-top:5px;">☰</div>`;

            li.innerHTML = `
                ${leftControl}
                ${pinnedBadge}
                <div style="flex-grow:1; width:calc(100% - 30px);">
                    <div style="display:flex; flex-wrap:wrap;">${catHTML} ${projHTML} ${blockedHTML} ${repeatHTML} ${tagsHTML}</div>
                    <h4 style="margin:5px 0; font-size:16px; color:#1c1c1e; font-weight:600; ${isCompleted?'text-decoration:line-through;':''}">${sanitizeHTML(reminder.task||'')}</h4>
                    ${notesHTML}
                    ${subHTML}
                    <p style="font-size:12px; margin:5px 0 0 0; font-weight:600; color:#8e8e93;">📅 ${formattedTime}</p>
                    ${completedDetailsHTML}
                </div>
                <div style="width:100%; margin-top:12px; display:flex; flex-direction:column; gap:8px; ${bulkMode ? 'display:none;' : ''}">${actionBtns}</div>
            `;
                     reminderList.appendChild(li);
        });
        
        updateTimers(); 
        timerInterval = setInterval(updateTimers, 1000); 
        initSortable();
    }



    function speakAlarm(taskText) { 
        if (!voiceAlarmEnabled) return; 
        if ('speechSynthesis' in window) { 
            const synth = window.speechSynthesis; 
            const utterThis = new SpeechSynthesisUtterance("Reminder! It is time to " + taskText); 
            synth.speak(utterThis); 
        } 
    }
      function updateTimers() {
        let reminders = safeStorage("reminders", []); 
        const now = new Date().getTime(); 
        let remsToSave = false;
        
        reminders.forEach(reminder => {
            if (reminder.status !== "completed") {
                const timerElement = document.getElementById(`timer-${reminder.id}`);
                if (timerElement) {
                    const distance = new Date(reminder.time).getTime() - now;
                    const preAlarmMillis = (reminder.preAlarm || 0) * 60000;
                    
                    if (distance <= preAlarmMillis) {
                        timerElement.innerHTML = `⏳ Time's up!
                            <span style="display:inline-flex; gap:4px; margin-left:6px;">
                                <button onclick="snoozeTask(${reminder.id},5)" style="background:#fff; color:#ff3b30; border:1px solid #ff3b30; border-radius:6px; padding:2px 6px; font-size:10px; font-weight:700; cursor:pointer;">+5m</button>
                                <button onclick="snoozeTask(${reminder.id},10)" style="background:#fff; color:#ff3b30; border:1px solid #ff3b30; border-radius:6px; padding:2px 6px; font-size:10px; font-weight:700; cursor:pointer;">+10m</button>
                                <button onclick="snoozeTask(${reminder.id},30)" style="background:#fff; color:#ff3b30; border:1px solid #ff3b30; border-radius:6px; padding:2px 6px; font-size:10px; font-weight:700; cursor:pointer;">+30m</button>
                            </span>`;
                        timerElement.style.background = "#ffe5e5"; 
                        timerElement.style.color = "#ff3b30";
                        if (!reminder.notified) { 
                            playAlarm(); 
                            speakAlarm(reminder.task); 
                            showPushNotification(reminder.task, (reminder.notes||'').replace(/<[^>]*>/g,'') || 'Time to complete this task!');
                            sendWebhookNotification(reminder);
                            reminder.notified = true; 
                            remsToSave = true; 
                        }
                    } else {
                        const d = Math.floor(distance / 86400000), 
                              h = Math.floor((distance % 86400000) / 3600000), 
                              m = Math.floor((distance % 3600000) / 60000), 
                              s = Math.floor((distance % 60000) / 1000);
                        timerElement.innerHTML = `⏱️ Left: ${d>0?d+'d ':''}${h>0||d>0?h+'h ':''}${m}m ${s}s`;
                    }
                }
            }
        });
        
        // લૂપની બહાર સેવ કરવાનું છે જેથી એપ ચોંટી ના જાય!
        if (remsToSave) { 
            localStorage.setItem("reminders", JSON.stringify(reminders)); 
            loadReminders(); 
        }
    }

    function generateNextRepeatTask(oldTask) {
        let newTime = new Date(oldTask.time);
        
        if ((oldTask.repeat === 'custom' || oldTask.repeat === 'hourly') && oldTask.customRepeat) {
            const val = parseInt(oldTask.customRepeat.interval);
            if(oldTask.customRepeat.type === 'hours') newTime.setHours(newTime.getHours() + val);
            if(oldTask.customRepeat.type === 'days') newTime.setDate(newTime.getDate() + val);
            if(oldTask.customRepeat.type === 'weeks') newTime.setDate(newTime.getDate() + (val*7));
            if(oldTask.customRepeat.type === 'months') newTime.setMonth(newTime.getMonth() + val);
        } else {
            if (oldTask.repeat === 'daily') newTime.setDate(newTime.getDate() + 1);
            if (oldTask.repeat === 'weekly') newTime.setDate(newTime.getDate() + 7);
            if (oldTask.repeat === 'monthly') newTime.setMonth(newTime.getMonth() + 1);
            if (oldTask.repeat === 'yearly') newTime.setFullYear(newTime.getFullYear() + 1);
        }
        
        const tzoffset = newTime.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(newTime - tzoffset)).toISOString().slice(0, 16);
        
        let reminders = safeStorage("reminders", []);
        reminders.push({ 
            id: Date.now(), 
            task: oldTask.task, 
            notes: oldTask.notes, 
            image: oldTask.image, 
            audio: oldTask.audio, 
            isDoc: oldTask.isDoc, 
            time: localISOTime, 
            repeat: oldTask.repeat, 
            customRepeat: oldTask.customRepeat, 
            priority: oldTask.priority, 
            category: oldTask.category, 
            tags: oldTask.tags, 
            subtasks: oldTask.subtasks, 
            pinned: false, 
            status: "pending", 
            notified: false, 
            preAlarm: oldTask.preAlarm || 0, 
            assignee: oldTask.assignee || "" 
        });
        localStorage.setItem("reminders", JSON.stringify(reminders));
    }

    function fireConfetti() {
        const canvas = document.getElementById('confettiCanvas');
        const ctx = canvas.getContext('2d'); 
        canvas.width = window.innerWidth; 
        canvas.height = window.innerHeight; 
        let particles = [];
        
        for(let i=0; i<100; i++) { 
            particles.push({ 
                x: canvas.width/2, 
                y: canvas.height/2, 
                vx: (Math.random()-0.5)*20, 
                vy: (Math.random()-0.5)*20 - 5, 
                color: `hsl(${Math.random()*360}, 100%, 50%)`, 
                size: Math.random()*8+2 
            });
        }
        
        function animate() { 
            ctx.clearRect(0,0, canvas.width, canvas.height);
            particles.forEach((p, i) => { 
                p.x += p.vx; 
                p.y += p.vy; 
                p.vy += 0.5; 
                ctx.fillStyle = p.color; 
                ctx.beginPath(); 
                ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); 
                ctx.fill(); 
                if(p.y > canvas.height) particles.splice(i, 1); 
            });
            if(particles.length > 0) {
                requestAnimationFrame(animate); 
            } else {
                ctx.clearRect(0,0, canvas.width, canvas.height); 
            }
        } 
        animate();
    }

    function toggleStatus(id) {
        let reminders = safeStorage("reminders", []);
        let taskToRepeat = null;
        
        reminders = reminders.map(r => {
            if (r.id === id) { 
                if (r.status === "pending") { 
                    r.status = "completed"; 
                    r.completedBy = userName || "User"; 
                    r.completedAt = new Date().toISOString(); 
                    showToast("Done!", "success"); 
                    fireConfetti(); 
                    if (r.repeat && r.repeat !== "none") taskToRepeat = r; 
                } else { 
                    r.status = "pending"; 
                    r.notified = false; 
                    delete r.completedBy; 
                    delete r.completedAt; 
                    showToast("Restored.", "info"); 
                } 
            } 
            return r;
        });
        
        localStorage.setItem("reminders", JSON.stringify(reminders)); 
        if (taskToRepeat) generateNextRepeatTask(taskToRepeat); 
        searchReminders(); 
        syncToCloud(); 
    }

    function playAlarm() { 
        new Audio(userAlarmSound).play().catch(e => console.log(e));
        if (navigator.vibrate) { navigator.vibrate([1000, 500, 1000, 500, 1000]); } 
    }
    
    function deleteReminder(id) { 
        let r = safeStorage("reminders", []);
        deletedTaskTemp = r.find(x => x.id === id); 
        localStorage.setItem("reminders", JSON.stringify(r.filter(x => x.id !== id))); 
        searchReminders(); 
        syncToCloud(); 
        
        const container = document.getElementById("toastContainer");
        const toast = document.createElement("div"); 
        toast.className = `toast error`; 
        toast.innerHTML = `<span>🗑️ Deleted</span> <button onclick="undoDelete()" style="background:white; color:black; border:none; padding:4px 8px; border-radius:8px; cursor:pointer; font-weight:700; margin-left:10px;">UNDO</button>`;
        container.appendChild(toast); 
        
        clearTimeout(deleteTimeout); 
        deleteTimeout = setTimeout(() => { 
            if(toast) toast.remove(); 
            deletedTaskTemp = null; 
        }, 5000);
    }
    
    function undoDelete() {
        if(deletedTaskTemp) { 
            let r = safeStorage("reminders", []);
            r.push(deletedTaskTemp); 
            localStorage.setItem("reminders", JSON.stringify(r)); 
            deletedTaskTemp = null; 
            document.querySelectorAll('.toast.error').forEach(t => t.remove()); 
            showToast("Restored! ♻️", "success"); 
            searchReminders(); 
            syncToCloud();
        }
    }

    // --- Export / Import ---
    function shareAppURL() { 
        const data = encodeURIComponent(btoa(JSON.stringify({ t: "Master App", n: "Sync life." })));
        const url = window.location.origin + window.location.pathname + "?share=" + data; 
        navigator.clipboard.writeText(url).then(() => showToast("Link Copied!", "success"));
    }

    function exportToCSV() {
        const reminders = safeStorage("reminders", []); 
        if(reminders.length === 0) return showToast("No data", "error");
        
        let csvContent = "data:text/csv;charset=utf-8,Title,Notes,Date & Time,Priority,Status,Category,Repeat\n";
        reminders.forEach(r => { 
            const title = `"${(r.task || "").replace(/"/g, '""')}"`; 
            const notes = `"${((r.notes||"").replace(/(<([^>]+)>)/gi, "")).replace(/\"/g, '""')}"`; 
            csvContent += `${title},${notes},${r.time},${r.priority || "medium"},${r.status},${r.category ? r.category.name : "Task"},${r.repeat || "none"}\n`; 
        });
        
        const link = document.createElement("a"); 
        link.setAttribute("href", encodeURI(csvContent)); 
        link.setAttribute("download", "My_Tasks.csv"); 
        document.body.appendChild(link); 
        link.click(); 
        link.remove(); 
        showToast("Exported!", "success");
    }

    function importDataFile(event) {
        const file = event.target.files[0];
        if (!file) return; 
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try { 
                const data = JSON.parse(e.target.result);
                if(data.reminders) { 
                    localStorage.setItem("reminders", JSON.stringify(data.reminders)); 
                    if(data.habits) localStorage.setItem("habits", JSON.stringify(data.habits)); 
                    showToast("Restored! Refreshing...", "success"); 
                    syncToCloud(); 
                    setTimeout(()=> location.reload(), 1500); 
                } else { 
                    showToast("Invalid JSON", "error");
                } 
            } catch (err) { 
                showToast("JSON only", "error"); 
            }
        }; 
        reader.readAsText(file);
    }

    // --- Eisenhower Matrix ---
    function openMatrixModal() {
        const rems = safeStorage("reminders", []);
        const pending = rems.filter(r => r.status === 'pending'); 
        const today = getTodayStr(); 
        let q1="", q2="", q3="", q4="";
        
        pending.forEach(r => {
            const isUrgent = r.time.split('T')[0] <= today; 
            const isImportant = r.priority === 'high';
            const taskHtml = `<div style="font-size:12px; background:white; padding:8px; border-radius:8px; margin-bottom:6px; cursor:pointer;" onclick="editReminder(${r.id}); closeModal('matrixModal')">👉 ${sanitizeHTML(r.task||'')}</div>`;
            
            if(isUrgent && isImportant) q1 += taskHtml; 
            else if(!isUrgent && isImportant) q2 += taskHtml; 
            else if(isUrgent && !isImportant) q3 += taskHtml; 
            else q4 += taskHtml;
        });
        
        document.getElementById("q1Tasks").innerHTML = q1 || "<p style='font-size:11px; text-align:center; color:#8e8e93;'>Clear!</p>"; 
        document.getElementById("q2Tasks").innerHTML = q2 || "<p style='font-size:11px; text-align:center; color:#8e8e93;'>Clear!</p>"; 
        document.getElementById("q3Tasks").innerHTML = q3 || "<p style='font-size:11px; text-align:center; color:#8e8e93;'>Clear!</p>"; 
        document.getElementById("q4Tasks").innerHTML = q4 || "<p style='font-size:11px; text-align:center; color:#8e8e93;'>Clear!</p>";
        openModal('matrixModal');
    }

    // ============================================================
