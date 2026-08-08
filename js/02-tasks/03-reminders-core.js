// Reminders/tasks: create/update/delete, list rendering, CSV export/import, Eisenhower Matrix view.
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".
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


    function reminderHasTag(reminder, tag) {
        if (!reminder || !tag || !reminder.tags) return false;
        return String(reminder.tags)
            .split(',')
            .map(t => t.trim())
            .filter(Boolean)
            .some(t => t === tag);
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
            reminders = reminders.filter(r => reminderHasTag(r, activeTagFilter));
        }
        if (activeProjectFilter !== '') {
            reminders = reminders.filter(r => String(r.project || '') === String(activeProjectFilter));
        }
        
        // ટાસ્ક 0 હોય તો પણ કેલેન્ડર હંમેશાં રેન્ડર થવું જ જોઈએ!
        renderHomeCalendar();
        
        clearInterval(timerInterval);
        if (reminders.length === 0) { 
            reminderList.innerHTML = emptyStateHTML('📋', 'No tasks found'); 
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
                     if (!bulkMode && typeof addSwipeToComplete === 'function' && (!window.Features || window.Features.isEnabled('swipeToComplete'))) {
                         addSwipeToComplete(li, reminder.id);
                     }
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
                            showPushNotification(reminder.task, (reminder.notes||'').replace(/<[^>]*>/g,'') || 'Time to complete this task!', reminder.id, reminder.priority);
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
                    if (typeof earnCoins === 'function') earnCoins(COINS_PER_COMPLETION);
                    if (r.repeat && r.repeat !== "none") taskToRepeat = r; 
                } else { 
                    r.status = "pending"; 
                    r.notified = false; 
                    delete r.completedBy; 
                    delete r.completedAt; 
                    showToast("Restored.", "info"); 
                    if (typeof getCoinBalance === 'function') { localStorage.setItem('coinBalance', String(Math.max(0, getCoinBalance() - COINS_PER_COMPLETION))); if (typeof refreshCoinDisplay === 'function') refreshCoinDisplay(); }
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
        // RECYCLE BIN: the quick-undo toast below only lasts 5 seconds and only
        // holds this one item — also land it in the persistent bin so it's
        // still recoverable after that window closes.
        if (typeof addToRecycleBin === 'function') addToRecycleBin('reminder', deletedTaskTemp);
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
            // Remove the just-restored item from the recycle bin too, so
            // undoing within the 5-second window doesn't leave a duplicate
            // sitting in the bin as well.
            if (typeof getRecycleBin === 'function' && deletedTaskTemp) {
                const bin = getRecycleBin().filter(e => !(e.type === 'reminder' && e.item.id === deletedTaskTemp.id));
                localStorage.setItem('recycleBin', JSON.stringify(bin));
            }
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
        navigator.clipboard.writeText(url).then(() => showToast("Link Copied!", "success")).catch(() => showToast("Couldn't copy — try again.", "error"));
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
