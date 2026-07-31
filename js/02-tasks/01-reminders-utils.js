// Reminder attachments (voice memo, image/document, location), categorization, custom templates, analytics & gamification stats, filtering, extended report stats.
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".

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

    // Global error handler: moved to js/00-logger.js (AppLogger), which loads
    // before this file and persists a rolling crash log — see CHANGELOG.md.
    
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
            window.Permissions.requestMicrophone().then(stream => {
                if (!stream) return showToast("Mic denied.", "error");
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
            });
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

