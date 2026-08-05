// Cloud sync (startCloudSync/syncToCloud), theme & calendar color settings, profile settings/modal, generic modal open/close, leaderboard.
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".
    function startCloudSync() {
        if(!currentUser) return;
        db.collection("users").doc(currentUser.uid).onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                if(!doc.metadata.hasPendingWrites) {
                    // Apply conflict resolution for critical data
                    if (typeof applyCloudDataWithConflictResolution === 'function') {
                        applyCloudDataWithConflictResolution(data);
                    } else {
                        localStorage.setItem("reminders", JSON.stringify(data.reminders || [])); 
                        localStorage.setItem("habits", JSON.stringify(data.habits || []));
                    }
                    localStorage.setItem("userLevel", data.userLevel || 1); 
                    localStorage.setItem("habitXP_tasks", data.habitXP_tasks || 0);
                    userName = data.userName || "User"; 
                    userAlarmSound = data.alarmSound || "https://actions.google.com/sounds/v1/alarms/beep_short.ogg";
                    voiceAlarmEnabled = data.voiceAlarm || false;
                    if(data.waterDate === getTodayStr()) { 
                        waterCount = data.waterCount || 0; 
                    } else { 
                        waterCount = 0; 
                    } 
                    if(data.theme) setThemeColor(data.theme.p, data.theme.ph, data.theme.b1, data.theme.b2, false);
                    if(data.customTemplates) localStorage.setItem("customTemplates", JSON.stringify(data.customTemplates));
                    if(data.projects) localStorage.setItem("projects", JSON.stringify(data.projects));
                    if(data.moodLog) localStorage.setItem("moodLog", JSON.stringify(data.moodLog));
                    if(data.sleepLog) localStorage.setItem("sleepLog", JSON.stringify(data.sleepLog));
                    if(data.savingsGoals) localStorage.setItem("savingsGoals", JSON.stringify(data.savingsGoals));
                    if(data.eventColor) localStorage.setItem("eventColor", data.eventColor);
                    if(data.khataData) localStorage.setItem("khataData", JSON.stringify(data.khataData));
                    if(data.morePinnedFeatures) localStorage.setItem("morePinnedFeatures", JSON.stringify(data.morePinnedFeatures));
                    if(data.coinBalance !== undefined) localStorage.setItem("coinBalance", String(data.coinBalance));
                    if(data.rewards) localStorage.setItem("rewards", JSON.stringify(data.rewards));
                    if(data.weeklyMissions) localStorage.setItem("weeklyMissions", JSON.stringify(data.weeklyMissions));
                    if(data.emergencyContacts) localStorage.setItem("emergencyContacts", JSON.stringify(data.emergencyContacts));
                    if(data.analyticsConsent) localStorage.setItem("analyticsConsent", data.analyticsConsent);
                    if (typeof refreshCoinDisplay === 'function') refreshCoinDisplay();
                    if(data.familyMembers) localStorage.setItem("familyMembers", JSON.stringify(data.familyMembers));
                    if(data.smartSettings) localStorage.setItem("smartSettings", JSON.stringify(data.smartSettings));
                    updateNotifBadge();
                    if(data.holidayColor) localStorage.setItem("holidayColor", data.holidayColor);
                    applyCalendarColors();
                    if(data.warranties) localStorage.setItem("warranties", JSON.stringify(data.warranties));
                    if(data.vehicleLogs) localStorage.setItem("vehicleLogs", JSON.stringify(data.vehicleLogs));
                    if(data.birthdays) localStorage.setItem("birthdays", JSON.stringify(data.birthdays));
                    if(data.homeManagement) localStorage.setItem("homeManagement", JSON.stringify(data.homeManagement));
                    if(data.quickNotes) localStorage.setItem("quickNotes", JSON.stringify(data.quickNotes));
                    if(data.pomodoroHistory) localStorage.setItem("pomodoroHistory", JSON.stringify(data.pomodoroHistory));
                    if(data.webhookUrl !== undefined) localStorage.setItem("webhookUrl", data.webhookUrl);
                    if(data.gcalClientId !== undefined) localStorage.setItem("gcalClientId", data.gcalClientId);
                    if(data.appFontSize) localStorage.setItem("appFontSize", data.appFontSize);
                    if(data.shiftConfig) localStorage.setItem("shiftConfig", JSON.stringify(data.shiftConfig));
                    if(data.isProUser) { 
                        isProUser = true; 
                        localStorage.setItem("isPro", "true"); 
                        const _pb=document.getElementById("proBadgeDisplay"); if(_pb) _pb.style.display="inline-flex"; 
                    }

                    // Unique ID - retroactive backfill for existing accounts
                    let uid = data.uniqueId;
                    if (!uid) {
                        uid = generateUniqueId();
                        db.collection("users").doc(currentUser.uid).set({ uniqueId: uid, joinedAt: data.joinedAt || new Date().toISOString() }, { merge: true });
                        db.collection("public_profiles").doc(currentUser.uid).set({ uniqueId: uid, userName: data.userName || userName }, { merge: true }).catch(() => {});
                    }
                    localStorage.setItem("uniqueId", uid);
                    localStorage.setItem("joinedAt", data.joinedAt || new Date().toISOString());
                    const pcId = document.getElementById("profileCardId");
                    const pcName = document.getElementById("profileCardName");
                    if (pcId) pcId.innerText = "ID: " + uid;
                    if (pcName) pcName.innerText = userName;
                    
                    const displayNameEl = document.getElementById("displayUserName");
                    const profileNameInput = document.getElementById("profileNameInput");
                    const alarmSoundInput = document.getElementById("alarmSoundInput");
                    const voiceAlarmToggle = document.getElementById("voiceAlarmToggle");
                    if (displayNameEl) displayNameEl.innerText = userName;
                    if (profileNameInput) profileNameInput.value = userName;
                    if (alarmSoundInput) alarmSoundInput.value = userAlarmSound; 
                    if (voiceAlarmToggle) voiceAlarmToggle.checked = voiceAlarmEnabled;
                    const webhookInput = document.getElementById("webhookUrlInput");
                    const gcalInput = document.getElementById("gcalClientIdInput");
                    if (webhookInput) webhookInput.value = localStorage.getItem("webhookUrl") || "";
                    if (gcalInput) gcalInput.value = localStorage.getItem("gcalClientId") || "";
                    setFontSize(localStorage.getItem("appFontSize") || "medium", false);
                    renderSleepTracker();
                    renderTodayShiftWidget();
                    userLevel = data.userLevel || 1; 
                    
                    renderCustomTemplates();
                    renderProjectDropdown();
                    renderMoodTracker();
                    loadReminders(); 
                    loadHabits(); 
                    const _sst1=document.getElementById("syncStatusText"); if(_sst1) _sst1.innerText = "Synced";
                }
            }
        }, (err) => {
            // BUGFIX: this listener previously had no error callback — a permission
            // or connectivity error here failed completely silently, leaving the
            // user on stale data with zero indication sync had stopped.
            window.AppLogger && window.AppLogger.error('Realtime sync listener failed', err.message);
            const _sst = document.getElementById("syncStatusText"); if (_sst) _sst.innerText = "⚠️ Sync error";
            showToast("Couldn't stay connected to sync. Your changes are still saved locally.", "error");
        });
    }

    function syncToCloud() {
        if(!currentUser) return;
        if(!navigator.onLine) return;
        document.getElementById("syncStatusText").innerText = "☁️ Saving...";
        
        clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
            const dataToSave = {
                reminders: safeStorage("reminders", []), 
                habits: safeStorage("habits", []),
                userLevel: parseInt(localStorage.getItem("userLevel")) || 1, 
                habitXP_tasks: parseInt(localStorage.getItem("habitXP_tasks")) || 0,
                userName: userName, 
                alarmSound: userAlarmSound, 
                voiceAlarm: voiceAlarmEnabled, 
                theme: safeStorage("appTheme", null),
                customTemplates: safeStorage("customTemplates", []), 
                projects: safeStorage("projects", []),
                moodLog: safeStorage("moodLog", {}),
                sleepLog: safeStorage("sleepLog", {}),
                savingsGoals: safeStorage("savingsGoals", []),
                eventColor: localStorage.getItem("eventColor") || "#ff3b30",
                khataData: safeStorage("khataData", {"parties":[],"entries":[]}),
                // BUGFIX: finData (expenses/income/budgets/bills/EMIs/investments) was
                // never included here, so the Finance feature had no cloud backup at all —
                // reinstalling the app or switching devices silently lost every recorded
                // expense. Default shape matches getFinData() in 05-shifts-finance-student.js.
                finData: safeStorage("finData", {"expenses":[],"income":[],"budgets":[],"bills":[],"emis":[],"investments":[]}),
                morePinnedFeatures: safeStorage("morePinnedFeatures", []),
                coinBalance: safeNum(localStorage.getItem("coinBalance"), 0),
                rewards: safeStorage("rewards", []),
                weeklyMissions: safeStorage("weeklyMissions", {}),
                emergencyContacts: safeStorage("emergencyContacts", []),
                analyticsConsent: localStorage.getItem("analyticsConsent") || null,
                familyMembers: safeStorage("familyMembers", []),
                smartSettings: safeStorage("smartSettings", {}),
                holidayColor: localStorage.getItem("holidayColor") || "#ff9500",
                warranties: safeStorage("warranties", []),
                vehicleLogs: safeStorage("vehicleLogs", []),
                birthdays: safeStorage("birthdays", []),
                homeManagement: safeStorage("homeManagement", []),
                quickNotes: safeStorage("quickNotes", []),
                pomodoroHistory: safeStorage("pomodoroHistory", []).slice(0,50),
                webhookUrl: localStorage.getItem("webhookUrl") || "",
                gcalClientId: localStorage.getItem("gcalClientId") || "",
                appFontSize: localStorage.getItem("appFontSize") || "medium",
                shiftConfig: safeStorage('shiftConfig', null),
                waterCount: waterCount, 
                waterDate: getTodayStr(), 
                isProUser: isProUser,
                dailyTaskGoal: parseInt(localStorage.getItem("dailyTaskGoal")) || 5
            };
            db.collection("users").doc(currentUser.uid).set(dataToSave, {merge: true}).then(() => { 
                const _sst1=document.getElementById("syncStatusText"); if(_sst1) _sst1.innerText = "Synced"; 
            }).catch((e) => { 
                const _sst3=document.getElementById("syncStatusText"); if(_sst3) _sst3.innerText = "Sync Error"; 
            });
            // SECURITY: public_profiles holds ONLY the fields other users legitimately need to read
            // (leaderboard, family-member lookup by uniqueId). Everything else above — khataData,
            // moodLog, finance, journal, etc. — stays exclusively in the owner-only `users` document.
            db.collection("public_profiles").doc(currentUser.uid).set({
                userName: userName,
                habitXP_tasks: dataToSave.habitXP_tasks,
                uniqueId: localStorage.getItem("uniqueId") || null
            }, {merge: true}).catch(() => {});
        }, 2000);
    }

    // --- Settings & UI Helpers -->
    function setCalendarColors() {
        const eventColor = document.getElementById('eventColorInput').value;
        const holidayColor = document.getElementById('holidayColorInput').value;
        document.documentElement.style.setProperty('--event-color', eventColor);
        document.documentElement.style.setProperty('--holiday-color', holidayColor);
        document.documentElement.style.setProperty('--holiday-bg', holidayColor + '1a');
        localStorage.setItem('eventColor', eventColor);
        localStorage.setItem('holidayColor', holidayColor);
        syncToCloud();
        showToast('Calendar colors updated!', 'success');
    }

    function applyCalendarColors() {
        const eventColor = localStorage.getItem('eventColor') || '#ff3b30';
        const holidayColor = localStorage.getItem('holidayColor') || '#ff9500';
        document.documentElement.style.setProperty('--event-color', eventColor);
        document.documentElement.style.setProperty('--holiday-color', holidayColor);
        document.documentElement.style.setProperty('--holiday-bg', holidayColor + '1a');
        const eInput = document.getElementById('eventColorInput');
        const hInput = document.getElementById('holidayColorInput');
        if(eInput) eInput.value = eventColor;
        if(hInput) hInput.value = holidayColor;
    }

    function setThemeColor(p, ph, b1, b2, sync=true) { 
        document.documentElement.style.setProperty('--primary', p); 
        document.documentElement.style.setProperty('--primary-hover', ph); 
        document.documentElement.style.setProperty('--bg-grad-1', b1); 
        document.documentElement.style.setProperty('--bg-grad-2', b2); 
        localStorage.setItem("appTheme", JSON.stringify({p, ph, b1, b2})); 
        if(sync) { 
            syncToCloud(); 
            showToast("Theme saved!", "success"); 
        } 
    }
    
    function applyTimeOfDayTheme() { 
        if (localStorage.getItem("darkMode") === "true") { 
            document.body.classList.add("dark-mode"); 
            return; 
        } 
        const savedTheme = safeStorage("appTheme", null); 
        if(savedTheme) return; 
    }
    
    function saveProfileSettings() { 
        const profileNameInput = $id("profileNameInput");
        const alarmSoundInput = $id("alarmSoundInput");
        const voiceAlarmToggle = $id("voiceAlarmToggle");
        const webhookInput = $id("webhookUrlInput");
        const gcalInput = $id("gcalClientIdInput");
        const displayUserName = $id("displayUserName");
        userName = profileNameInput ? profileNameInput.value.trim() || "User" : "User";
        userAlarmSound = alarmSoundInput ? alarmSoundInput.value : userAlarmSound;
        voiceAlarmEnabled = voiceAlarmToggle ? voiceAlarmToggle.checked : voiceAlarmEnabled;
        if (webhookInput) localStorage.setItem("webhookUrl", webhookInput.value.trim());
        if (gcalInput) localStorage.setItem("gcalClientId", gcalInput.value.trim());
        if (displayUserName) displayUserName.innerText = userName;
        updateMiniDashboard(); 
        syncToCloud(); 
        showToast("Settings saved!", "success"); 
    }

    function testAlarmSound() {
        const alarmSoundInput = $id("alarmSoundInput");
        if (!alarmSoundInput) return showToast("Alarm sound input unavailable.", "error");
        const sound = alarmSoundInput.value;
        new Audio(sound).play().catch(e => showToast("Could not play sound", "error"));
        hapticFeedback('light');
    }

    function openProfileModal() {
        const reminders = safeStorage('reminders', []);
        const habits = safeStorage('habits', []);
        const completedReminders = reminders.filter(r => r.status === 'completed').length;
        const habitXP = parseInt(localStorage.getItem('habitXP_tasks') || '0');
        const totalXP = (completedReminders + habitXP) * 10;
        const level = Math.floor((completedReminders + habitXP) / 5) + 1;
        const bestStreak = Math.max(0, ...habits.map(h => h.streak || 0));
        const uid = localStorage.getItem('uniqueId') || 'Generating...';
        const joined = localStorage.getItem('joinedAt');

        setTxt('profModalName', userName || 'User');
        setTxt('profModalEmail', currentUser?.email || '');
        setTxt('profModalUid', uid);
        setTxt('profModalJoined', joined ? new Date(joined).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'}) : '—');
        setTxt('profModalLevel', level);
        setTxt('profModalXP', totalXP);
        setTxt('profModalTasks', completedReminders);
        setTxt('profModalStreak', bestStreak);

        const verifyBanner = $id('profModalVerifyBanner');
        if (verifyBanner) {
            const needsVerification = !!(currentUser && !currentUser.emailVerified && (!window.Features || window.Features.isEnabled('emailVerificationBanner')));
            verifyBanner.style.display = needsVerification ? 'flex' : 'none';
        }

        openModal('profileModal');
    }

    function copyProfileId() {
        const uid = localStorage.getItem('uniqueId') || '';
        navigator.clipboard?.writeText(uid).then(() => showToast('ID Copied: ' + uid, 'success'))
            .catch(() => showToast('ID: ' + uid, 'info'));
        hapticFeedback('success');
    }

    let lastFocusedBeforeModal = null;

    function openModal(modalId) { 
        const overlay = document.getElementById(modalId);
        if (!overlay) return;
        lastFocusedBeforeModal = document.activeElement;
        overlay.classList.add('active'); 
        if(modalId === 'analyticsModal') setTimeout(() => setReportPeriod(reportPeriod), 100); 

        const content = overlay.querySelector('.modal-content');
        if (content) {
            content.setAttribute('role', 'dialog');
            content.setAttribute('aria-modal', 'true');
            if (!content.hasAttribute('tabindex')) content.setAttribute('tabindex', '-1');
            const heading = content.querySelector('h2, h3, h4');
            if (heading) {
                if (!heading.id) heading.id = modalId + '-title';
                content.setAttribute('aria-labelledby', heading.id);
            }
            setTimeout(() => content.focus(), 50);
        }
    }
    
    function closeModal(modalId) { 
        const overlay = document.getElementById(modalId);
        if (!overlay) return;
        overlay.classList.remove('active'); 
        if (lastFocusedBeforeModal && document.body.contains(lastFocusedBeforeModal)) {
            lastFocusedBeforeModal.focus();
        }
        lastFocusedBeforeModal = null;
        // BUGFIX: closing a modal (e.g. via Escape, or tapping outside it) while a
        // voice memo was mid-recording used to leave the mic + MediaRecorder running
        // indefinitely — the browser's recording indicator stayed on with no way to
        // stop it short of reopening the modal and hitting "Stop." Release it here too.
        if (typeof mediaRecorder !== 'undefined' && mediaRecorder && mediaRecorder.state !== 'inactive') {
            try {
                mediaRecorder.stop();
                mediaRecorder.stream.getTracks().forEach(t => t.stop());
            } catch (e) { /* already stopped/released */ }
        }
    }

    function closeAllModals() {
        document.querySelectorAll('.modal-overlay.active').forEach(m => closeModal(m.id));
    }

    // ACCESSIBILITY: .close-modal-btn elements are <span onclick="">, which are invisible to
    // keyboard/screen-reader users by default (no label, not tabbable, no Enter/Space activation).
    // Patch all of them once, in place, rather than editing every modal's markup individually.
    // Extended to cover .feature-tile (the 44-item "More" page grid) and .template-chip
    // (6 instances) — same gap, same fix.
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.close-modal-btn, .nav-item, .feature-tile, .template-chip').forEach(btn => {
            if (btn.classList.contains('close-modal-btn') && !btn.hasAttribute('aria-label')) {
                btn.setAttribute('aria-label', 'Close');
            }
            if (!btn.hasAttribute('role')) btn.setAttribute('role', 'button');
            if (!btn.hasAttribute('tabindex')) btn.setAttribute('tabindex', '0');
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    btn.click();
                }
            });
        });
        const toastContainer = document.getElementById('toastContainer');
        if (toastContainer) {
            toastContainer.setAttribute('aria-live', 'polite');
            toastContainer.setAttribute('role', 'status');
        }
    });

    // --- Leaderboard ---
    function openLeaderboard() {
        openModal('leaderboardModal');
        const cont = $id("leaderboardContainer");
        if (!cont) return;
        cont.innerHTML = "<p style='text-align:center;'>Fetching...</p>";
        window.API.getLeaderboard(10).then((querySnapshot) => {
            let html = ""; 
            let rank = 1;
            let foundSelf = false;
            querySnapshot.forEach((doc) => {
                const data = doc.data(); 
                let trophy = rank === 1 ? "🥇" : (rank === 2 ? "🥈" : (rank === 3 ? "🥉" : "🏅"));
                const isMe = currentUser && doc.id === currentUser.uid;
                if (isMe) foundSelf = true;
                html += `<div style="padding:12px; background:${isMe ? '#e5f1ff' : '#ffffff'}; margin-bottom:8px; border-radius:12px; display:flex; justify-content:space-between; box-shadow:0 2px 4px rgba(0,0,0,0.02); ${isMe ? 'border:2px solid var(--primary);' : ''}"><span>${trophy} ${sanitizeHTML(data.userName || "Unknown")}${isMe ? ' (You)' : ''}</span><span style="font-weight:700; color:var(--primary);">${(data.habitXP_tasks||0)*10} XP</span></div>`;
                rank++;
            }); 
            cont.innerHTML = html || "<p>No data found.</p>";
            if (!foundSelf && currentUser) {
                const myXP = (parseInt(localStorage.getItem('habitXP_tasks')) || 0) * 10;
                cont.innerHTML += `<div style="margin-top:10px; padding:12px; background:#fff8e8; border-radius:12px; display:flex; justify-content:space-between; border:2px dashed #ff9500;"><span>🎯 You (not in top 10)</span><span style="font-weight:700; color:#ff9500;">${myXP} XP</span></div>`;
            }
        }).catch((err) => {
            // BUGFIX: this query previously had no .catch() at all — a network
            // or permissions error left the modal stuck on "Fetching..." forever.
            window.AppLogger && window.AppLogger.error('Leaderboard fetch failed', err.message);
            cont.innerHTML = "<p style='text-align:center; color:#8e8e93;'>Couldn't load the leaderboard. Check your connection and try again.</p>";
        });
    }

    // --- Full Calendar ---
