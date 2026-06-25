// Master Reminder App JS

// --- FIREBASE INITIALIZATION & OFFLINE PERSISTENCE ---
    const firebaseConfig = {
      apiKey: "AIzaSyDc-k1JnOySVExS4QbDsbkh7Ro9pvNydIY",
      authDomain: "reminder-76588.firebaseapp.com",
      projectId: "reminder-76588",
      storageBucket: "reminder-76588.firebasestorage.app",
      messagingSenderId: "813515230126",
      appId: "1:813515230126:web:dde11175645257dc44d63f"
    };

    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    db.enablePersistence().catch(err => { console.log("Offline mode error:", err.code); });

    // --- Global Variables ---
    let currentUser = null; 
    let timerInterval; 
    let currentTab = 'upcoming';

    // ============================================================
    // SECURITY & CRASH-PROOF UTILITIES
    // ============================================================
    function safeStorage(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null || raw === undefined) return fallback;
            return JSON.parse(raw);
        } catch (e) {
            console.warn('[safeStorage] Corrupt data for key:', key, '- resetting.');
            localStorage.removeItem(key);
            return fallback;
        }
    }

    function sanitizeHTML(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    function safeNum(val, fallback) {
        const n = Number(val);
        return isNaN(n) || !isFinite(n) ? (fallback || 0) : n;
    }

    function isValidDate(str) {
        if (!str) return false;
        const d = new Date(str);
        return d instanceof Date && !isNaN(d.getTime());
    }

    async function sha256(str) {
        const encoded = new TextEncoder().encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('');
    }

    // India National Holidays & Major Festivals 2026
    const INDIA_HOLIDAYS_2026 = [
        { date: '2026-01-26', name: 'Republic Day', icon: '🇮🇳' },
        { date: '2026-03-04', name: 'Holi', icon: '🎨' },
        { date: '2026-03-21', name: 'Id-ul-Fitr (Eid)', icon: '🌙' },
        { date: '2026-03-26', name: 'Ram Navami', icon: '🙏' },
        { date: '2026-04-03', name: 'Good Friday', icon: '✝️' },
        { date: '2026-05-01', name: 'Labour Day', icon: '🛠️' },
        { date: '2026-05-27', name: 'Bakrid (Eid al-Adha)', icon: '🐐' },
        { date: '2026-06-26', name: 'Muharram', icon: '🕌' },
        { date: '2026-08-15', name: 'Independence Day', icon: '🇮🇳' },
        { date: '2026-09-04', name: 'Janmashtami', icon: '🦚' },
        { date: '2026-10-02', name: 'Gandhi Jayanti', icon: '🕊️' },
        { date: '2026-10-20', name: 'Dussehra', icon: '🏹' },
        { date: '2026-11-08', name: 'Diwali', icon: '🪔' },
        { date: '2026-11-24', name: 'Guru Nanak Jayanti', icon: '☬' },
        { date: '2026-12-25', name: 'Christmas', icon: '🎄' },
    ];

    function getIndiaHoliday(dateStr) {
        return INDIA_HOLIDAYS_2026.find(h => h.date === dateStr) || null;
    }

    // ============================================================
    // SPEED-DIAL FLOATING ACTION BUTTON
    // ============================================================
    let fabMenuOpen = false;

    function toggleFabMenu() {
        fabMenuOpen = !fabMenuOpen;
        document.getElementById('mainFabBtn').classList.toggle('open', fabMenuOpen);
        document.querySelectorAll('.fab-speed-item').forEach(el => el.classList.toggle('show', fabMenuOpen));
        document.getElementById('fabBackdrop').classList.toggle('show', fabMenuOpen);
        hapticFeedback('light');
    }

    function closeFabMenu() {
        if (!fabMenuOpen) return;
        fabMenuOpen = false;
        document.getElementById('mainFabBtn').classList.remove('open');
        document.querySelectorAll('.fab-speed-item').forEach(el => el.classList.remove('show'));
        document.getElementById('fabBackdrop').classList.remove('show');
    }

    function fabAction(action) {
        closeFabMenu();
        if (action === 'chat') openAIChat();
        else if (action === 'voice') startSmartVoiceAssistant();
        else if (action === 'search') openGlobalSearch();
        else if (action === 'recommend') openModal('aiRecommendModal');
    }
    let editId = null; 
    let userLevel = 1;
    let selectedDateFilter = null; 
    let currentImageBase64 = null; 
    let isDoc = false;
    let userName = "User"; 
    let userAlarmSound = "https://actions.google.com/sounds/v1/alarms/beep_short.ogg";
    let voiceAlarmEnabled = false; 
    let pomoInterval; 
    let pomoTime = 1500;
    let chartInstance = null;
    let focusAudio = new Audio();
    let currentCalMonth = new Date().getMonth(); 
    let currentCalYear = new Date().getFullYear();
    let deletedTaskTemp = null; 
    let deleteTimeout = null;
    let wakeLock = null; 
    let activeTagFilter = ""; 
    let waterCount = 0;
    let mediaRecorder; 
    let audioChunks = [];
    let voiceMemoBase64 = null;
    let isProUser = false; 
    let appPinCode = localStorage.getItem("appPin") || null;
    let currentEnteredPin = "";
    let isMusicPlaying = false;
    let syncTimeout = null;
    let calView = 'month'; // 'month' | 'week' | 'agenda'
    let reportPeriod = 'week'; // 'week' | 'month'
    let currentWeekStart = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d; })();

    // --- Navigation ---
    function switchPage(pageId) {
        document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const pageEl = document.getElementById('page-' + pageId);
        if (!pageEl) return;
        pageEl.classList.add('active');

        // Sub-pages show "More" as active nav
        const navId = ['finance','student','journal'].includes(pageId) ? 'more' : pageId;
        const navEl = document.getElementById('nav-' + navId);
        if (navEl) navEl.classList.add('active');

        if(pageId === 'add') { loadDraft(); loadCustomTemplates(); }
        if(pageId === 'home') {
            document.getElementById("taskInput").value = "";
            document.getElementById("notesInput").innerText = ""; 
            document.getElementById("timeInput").value = ""; 
            document.getElementById("repeatInput").value = "none"; 
            document.getElementById("priorityInput").value = "medium"; 
            document.getElementById("tagsInput").value = "";
            const asEl = document.getElementById("assigneeInput"); if(asEl) asEl.value = "";
            document.getElementById("subtasksContainer").innerHTML = ""; 
            removeImage(); 
            removeVoiceMemo();
            editId = null; 
            window._editMode = false;
            document.getElementById("customRepeatUI").style.display = "none";
            // Close Advanced Options panel
            const advPanel = document.getElementById('advancedOptionsPanel');
            const advArrow = document.getElementById('advOptionsArrow');
            if (advPanel) advPanel.style.display = 'none';
            if (advArrow) advArrow.style.transform = '';
            document.getElementById("submitBtn").innerText = "Save Task"; 
            document.getElementById("modalTitle").innerText = "New Task";
            document.getElementById("preAlarmInput").value = "0";
            document.getElementById("categoryOverrideInput").value = "";
            updateCategoryPreview();
        }
        if (pageId === 'finance') { renderFinanceDashboard(); setFinTab('expenses'); }
        if (pageId === 'student') { renderExamCountdowns(); renderSubjects(); updateStudySubjectSelect(); }
        if (pageId === 'journal') {
            document.getElementById('journalTodayLabel').innerText = new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'});
            renderJournalEntries();
            loadTodayJournalEntry();
            renderJournalStats();
        }
        if (pageId === 'more') {
            renderMorePinned();
            updatePinStars();
            const searchEl = document.getElementById('moreSearchInput');
            if (searchEl) searchEl.value = '';
            filterMoreFeatures();
        }
    }

    // --- Initialization ---
    window.addEventListener('load', () => {
        setTimeout(() => {
            const splash = document.getElementById('splashScreen');
            splash.style.opacity = '0';
            setTimeout(() => { 
                splash.style.display = 'none'; 
                if(appPinCode && localStorage.getItem("loggedIn") === "true") { 
                    document.getElementById("pinScreen").style.display = "flex"; 
                } else { 
                    checkMorningBriefing(); 
                }
            }, 500);
        }, 1500);
    });

    document.addEventListener("DOMContentLoaded", () => {
        applyTimeOfDayTheme(); 
        isProUser = localStorage.getItem("isPro") === "true";
        if(isProUser) { document.getElementById("proBadgeDisplay").style.display = "inline-flex"; }
        if(appPinCode) document.getElementById("appLockToggle").checked = true;

        window.addEventListener('offline', () => { 
            document.getElementById("syncStatusText").innerText = "🚫 Offline Mode"; 
            showToast("Working in Offline Mode.", "error"); 
        });
              window.addEventListener('online', () => { 
            document.getElementById("syncStatusText").innerText = "☁️ Syncing..."; 
            showToast("Back online! Syncing...", "success"); 
            syncToCloud(); 
        });
        
        // પેજ ખુલે ત્યારે તરત જ લિસ્ટ અને કેલેન્ડર બતાવો
        loadReminders();
        renderHomeCalendar();
        renderProjectDropdown();
        renderMoodTracker();
        renderSleepTracker();
        renderTodayShiftWidget();
        setFontSize(localStorage.getItem("appFontSize") || "medium", false);
        document.getElementById("webhookUrlInput").value = localStorage.getItem("webhookUrl") || "";
        document.getElementById("gcalClientIdInput").value = localStorage.getItem("gcalClientId") || "";
        // Regenerate shift reminders daily
        const lastShiftSync = localStorage.getItem('lastShiftSync');
        const todayStr2 = getTodayStr();
        if (lastShiftSync !== todayStr2) {
            syncShiftReminders();
            createBirthdayReminders();
            localStorage.setItem('lastShiftSync', todayStr2);
            // Run automations daily
            setTimeout(() => { if(typeof runAutomations === 'function') runAutomations(); }, 3000);
        }
        // Apply widget preferences
        setTimeout(applyWidgetPrefs, 500);
        // Show notification badge if unread
        setTimeout(() => {
            const log = safeStorage('notifLog', []);
            const unread = log.filter(n => !n.read).length;
            if(unread > 0) showToast(unread + ' unread notification(s)', 'info');
        }, 2000);
    });

    // --- App Lock ---
    function enterPin(num) {
        if(currentEnteredPin.length < 4) {
            currentEnteredPin += num;
            document.getElementById("dot" + currentEnteredPin.length).style.background = "var(--primary)";
            if(currentEnteredPin.length === 4) {
                setTimeout(() => {
                    if(currentEnteredPin === appPinCode) { 
                        document.getElementById("pinScreen").style.display = "none"; 
                        checkMorningBriefing(); 
                    } else { 
                        showToast("Incorrect PIN!", "error"); 
                        clearPin(); 
                    }
                }, 200);
            }
        }
    }
    
    function clearPin() { 
        currentEnteredPin = ""; 
        document.querySelectorAll(".pin-dot").forEach(d => d.style.background = "transparent"); 
    }
    
    function deletePin() { 
        if(currentEnteredPin.length > 0) { 
            document.getElementById("dot" + currentEnteredPin.length).style.background = "transparent"; 
            currentEnteredPin = currentEnteredPin.slice(0, -1); 
        } 
    }
    
    function toggleAppLockSetup() {
        const toggle = document.getElementById("appLockToggle");
        if(toggle.checked) {
            const pin = prompt("Enter a 4-digit PIN for App Lock:");
            if(pin && pin.length === 4 && !isNaN(pin)) { 
                appPinCode = pin; 
                localStorage.setItem("appPin", pin); 
                showToast("App Lock Enabled!", "success"); 
            } else { 
                toggle.checked = false; 
                showToast("Invalid PIN.", "error"); 
            }
        } else { 
            appPinCode = null; 
            localStorage.removeItem("appPin"); 
            showToast("App Lock Disabled", "info"); 
        }
    }

    // --- Premium Features ---
    function activatePro() {
        isProUser = true; 
        localStorage.setItem("isPro", "true");
        document.getElementById("proBadgeDisplay").style.display = "inline-flex";
        closeModal('proModal'); 
        showToast("🎉 Welcome to PRO!", "success");
    }

    // --- Morning Briefing ---
    function checkMorningBriefing() {
        // Bug Fix 5: Retry if Firebase auth hasn't resolved yet
        if(!currentUser) {
            setTimeout(checkMorningBriefing, 1000);
            return;
        }
        const today = getTodayStr();
        if(localStorage.getItem('lastBriefingDate') !== today) {
            const reminders = safeStorage("reminders", []); 
            const habits = safeStorage("habits", []);
            let todayPendingTasks = reminders.filter(r => r.status !== 'completed' && r.time.split('T')[0] === today).length;
            let pendingHabits = habits.filter(h => h.lastCheckIn !== today).length;
            document.getElementById("briefingTaskCount").innerText = todayPendingTasks; 
            document.getElementById("briefingHabitCount").innerText = pendingHabits;
            openModal('briefingModal'); 
            localStorage.setItem('lastBriefingDate', today);
        }
    }

    // --- Authentication ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user; 
            localStorage.setItem("loggedIn", "true");
            document.getElementById('authScreen').style.display = 'none'; 
            document.getElementById('mainApp').style.display = 'flex';
            switchPage('home');
            if(!appPinCode) showToast("Logged in! Ready.", "success"); 
            startCloudSync();
            loadSharedWithMe();
        } else {
            currentUser = null; 
            localStorage.setItem("loggedIn", "false");
            document.getElementById('authScreen').style.display = 'block'; 
            document.getElementById('mainApp').style.display = 'none';
        }
    });

    function generateUniqueId() {
        const now = new Date();
        const yyyymm = now.getFullYear() + String(now.getMonth()+1).padStart(2,'0');
        const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const l1 = letters[Math.floor(Math.random()*letters.length)];
        const l2 = letters[Math.floor(Math.random()*letters.length)];
        const num = String(Math.floor(Math.random()*900)+100);
        return yyyymm + l1 + l2 + num;
    }

    function loginWithGoogle() { 
        const provider = new firebase.auth.GoogleAuthProvider(); 
        auth.signInWithPopup(provider).then((result) => { 
            const ref = db.collection("users").doc(result.user.uid);
            ref.get().then(doc => {
                const update = { userName: result.user.displayName };
                if (!doc.exists || !doc.data().uniqueId) {
                    update.uniqueId = generateUniqueId();
                    update.joinedAt = doc.exists && doc.data().joinedAt ? doc.data().joinedAt : new Date().toISOString();
                }
                if (!doc.exists) { update.userLevel = 1; update.habitXP_tasks = 0; }
                ref.set(update, { merge: true });
            });
        }).catch(err => showToast(err.message, "error")); 
    }
    
    function registerUser() { 
        const email = document.getElementById("emailInput").value; 
        const password = document.getElementById("passwordInput").value; 
        if(!email || password.length < 6) return showToast("Enter valid email/password", "error"); 
        auth.createUserWithEmailAndPassword(email, password).then((u) => { 
            db.collection("users").doc(u.user.uid).set({ reminders: [], habits: [], userLevel: 1, habitXP_tasks: 0, userName: "User", alarmSound: userAlarmSound, voiceAlarm: false, uniqueId: generateUniqueId(), joinedAt: new Date().toISOString() }); 
        }).catch((e) => showToast(e.message, "error")); 
    }
    
    function loginUser() { 
        const email = document.getElementById("emailInput").value; 
        const password = document.getElementById("passwordInput").value; 
        if(!email || !password) return showToast("Enter email and password", "error"); 
        auth.signInWithEmailAndPassword(email, password).catch((e) => showToast(e.message, "error")); 
    }
    
    function resetPassword() { 
        const email = document.getElementById("emailInput").value; 
        if(!email) return showToast("Enter your email address first!", "error"); 
        auth.sendPasswordResetEmail(email).then(() => { 
            showToast("Password reset link sent!", "success"); 
        }).catch((e) => showToast(e.message, "error")); 
    }
    
    function logoutUser() { 
        auth.signOut().then(() => { 
            showToast("Logged out.", "info"); 
            localStorage.clear(); 
            location.reload(); 
        }); 
    }

    // --- Cloud Syncing ---
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
                        document.getElementById("proBadgeDisplay").style.display="inline-flex"; 
                    }

                    // Unique ID - retroactive backfill for existing accounts
                    let uid = data.uniqueId;
                    if (!uid) {
                        uid = generateUniqueId();
                        db.collection("users").doc(currentUser.uid).set({ uniqueId: uid, joinedAt: data.joinedAt || new Date().toISOString() }, { merge: true });
                    }
                    localStorage.setItem("uniqueId", uid);
                    localStorage.setItem("joinedAt", data.joinedAt || new Date().toISOString());
                    const pcId = document.getElementById("profileCardId");
                    const pcName = document.getElementById("profileCardName");
                    if (pcId) pcId.innerText = "ID: " + uid;
                    if (pcName) pcName.innerText = userName;
                    
                    document.getElementById("displayUserName").innerText = userName; 
                    document.getElementById("profileNameInput").value = userName;
                    document.getElementById("alarmSoundInput").value = userAlarmSound; 
                    document.getElementById("voiceAlarmToggle").checked = voiceAlarmEnabled;
                    document.getElementById("aiApiKeyInput").value = localStorage.getItem("geminiKey") || "";
                    document.getElementById("webhookUrlInput").value = localStorage.getItem("webhookUrl") || "";
                    document.getElementById("gcalClientIdInput").value = localStorage.getItem("gcalClientId") || "";
                    setFontSize(localStorage.getItem("appFontSize") || "medium", false);
                    renderSleepTracker();
                    renderTodayShiftWidget();
                    userLevel = data.userLevel || 1; 
                    
                    renderCustomTemplates();
                    renderProjectDropdown();
                    renderMoodTracker();
                    loadReminders(); 
                    loadHabits(); 
                    document.getElementById("syncStatusText").innerText = "☁️ Synced";
                }
            }
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
                morePinnedFeatures: safeStorage("morePinnedFeatures", []),
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
                document.getElementById("syncStatusText").innerText = "☁️ Synced"; 
            }).catch((e) => { 
                document.getElementById("syncStatusText").innerText = "⚠️ Sync Error"; 
            });
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
        userName = document.getElementById("profileNameInput").value.trim() || "User";
        userAlarmSound = document.getElementById("alarmSoundInput").value; 
        voiceAlarmEnabled = document.getElementById("voiceAlarmToggle").checked; 
        localStorage.setItem("geminiKey", document.getElementById("aiApiKeyInput").value.trim());
        localStorage.setItem("webhookUrl", document.getElementById("webhookUrlInput").value.trim());
        localStorage.setItem("gcalClientId", document.getElementById("gcalClientIdInput").value.trim());
        document.getElementById("displayUserName").innerText = userName;
        updateMiniDashboard(); 
        syncToCloud(); 
        showToast("Settings saved!", "success"); 
    }

    function testAlarmSound() {
        const sound = document.getElementById("alarmSoundInput").value;
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

        document.getElementById('profModalName').innerText = userName || 'User';
        document.getElementById('profModalEmail').innerText = currentUser?.email || '';
        document.getElementById('profModalUid').innerText = uid;
        document.getElementById('profModalJoined').innerText = joined ? new Date(joined).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'}) : '—';
        document.getElementById('profModalLevel').innerText = level;
        document.getElementById('profModalXP').innerText = totalXP;
        document.getElementById('profModalTasks').innerText = completedReminders;
        document.getElementById('profModalStreak').innerText = bestStreak;

        openModal('profileModal');
    }

    function copyProfileId() {
        const uid = localStorage.getItem('uniqueId') || '';
        navigator.clipboard?.writeText(uid).then(() => showToast('ID Copied: ' + uid, 'success'))
            .catch(() => showToast('ID: ' + uid, 'info'));
        hapticFeedback('success');
    }

    function openModal(modalId) { 
        document.getElementById(modalId).classList.add('active'); 
        if(modalId === 'analyticsModal') setTimeout(() => setReportPeriod(reportPeriod), 100); 
    }
    
    function closeModal(modalId) { 
        document.getElementById(modalId).classList.remove('active'); 
    }

    // --- Leaderboard ---
    function openLeaderboard() {
        openModal('leaderboardModal');
        const cont = document.getElementById("leaderboardContainer"); 
        cont.innerHTML = "<p style='text-align:center;'>Fetching...</p>";
        db.collection("users").orderBy("habitXP_tasks", "desc").limit(10).get().then((querySnapshot) => {
            let html = ""; 
            let rank = 1;
            let foundSelf = false;
            querySnapshot.forEach((doc) => {
                const data = doc.data(); 
                let trophy = rank === 1 ? "🥇" : (rank === 2 ? "🥈" : (rank === 3 ? "🥉" : "🏅"));
                const isMe = currentUser && doc.id === currentUser.uid;
                if (isMe) foundSelf = true;
                html += `<div style="padding:12px; background:${isMe ? '#e5f1ff' : '#ffffff'}; margin-bottom:8px; border-radius:12px; display:flex; justify-content:space-between; box-shadow:0 2px 4px rgba(0,0,0,0.02); ${isMe ? 'border:2px solid var(--primary);' : ''}"><span>${trophy} ${data.userName || "Unknown"}${isMe ? ' (You)' : ''}</span><span style="font-weight:700; color:var(--primary);">${(data.habitXP_tasks||0)*10} XP</span></div>`;
                rank++;
            }); 
            cont.innerHTML = html || "<p>No data found.</p>";
            if (!foundSelf && currentUser) {
                const myXP = (parseInt(localStorage.getItem('habitXP_tasks')) || 0) * 10;
                cont.innerHTML += `<div style="margin-top:10px; padding:12px; background:#fff8e8; border-radius:12px; display:flex; justify-content:space-between; border:2px dashed #ff9500;"><span>🎯 You (not in top 10)</span><span style="font-weight:700; color:#ff9500;">${myXP} XP</span></div>`;
            }
        });
    }

    // --- Full Calendar ---
    function formatDateLocal(d) {
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }

    function setCalView(view) {
        calView = view;
        document.querySelectorAll('.cal-view-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('calview-' + view).classList.add('active');
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
        const displayEl = document.getElementById("homeCalMonthDisplay");
        if(!displayEl) return;

        const weekdaysRow = document.getElementById("calWeekdaysRow");
        const grid = document.getElementById("homeCalendarGrid");
        const agendaContainer = document.getElementById("agendaListContainer");

        if (calView === 'agenda') {
            weekdaysRow.style.display = 'none';
            grid.style.display = 'none';
            agendaContainer.style.display = 'block';
            renderAgendaView(displayEl, agendaContainer);
            document.getElementById("clearFilterWrapper").style.display = "none";
            return;
        }

        weekdaysRow.style.display = '';
        grid.style.display = '';
        agendaContainer.style.display = 'none';

        if (calView === 'week') {
            renderWeekView(displayEl, grid);
        } else {
            renderMonthView(displayEl, grid);
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
        document.getElementById("clearFilterWrapper").style.display = isFilterActive ? "flex" : "none";
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

        document.getElementById("clearFilterWrapper").style.display = selectedDateFilter ? "flex" : "none";
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
                html += `<div class="agenda-item"><span class="agenda-dot" style="background:${prioColor};"></span><span class="agenda-time">${timeStr}</span><span style="flex:1;">${r.task}</span></div>`;
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
        document.getElementById("pomodoroDisplay").innerText = `${Math.floor(pomoTime / 60).toString().padStart(2, '0')}:${(pomoTime % 60).toString().padStart(2, '0')}`; 
    }
    
    function openPomoModal() {
        const select = document.getElementById("pomoTaskSelect");
        let html = `<option value="">🎯 Select Task (Optional)</option>`;
        const reminders = safeStorage("reminders", []);
        reminders.filter(r => r.status === 'pending').forEach(r => { 
            html += `<option value="${r.id}">${r.task}</option>`; 
        });
        select.innerHTML = html; 
        openModal('pomodoroModal');
    }
    
    function resetPomo() { 
        clearInterval(pomoInterval); 
        focusAudio.pause(); 
        pomoTime = parseInt(document.getElementById("pomoTimeSelect").value) || 1500; 
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

    // --- AI Features (Gemini Integration) ---
    async function aiSuggestTime() {
        const apiKey = document.getElementById("aiApiKeyInput").value.trim() || localStorage.getItem("geminiKey"); 
        const taskName = document.getElementById("taskInput").value.trim();
        if(!taskName) return showToast("Enter Task Title!", "error"); 
        if(!apiKey) { 
            switchPage('settings'); 
            return showToast("Paste Free API Key!", "error"); 
        }
        showToast("🪄 AI is thinking...", "info");
        try {
            const now = new Date();
            const prompt = `Task: "${taskName}". Current time: ${now.toISOString()}. Suggest a logical future date/time. Respond ONLY with format: YYYY-MM-DDTHH:mm.`;
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) 
            });
            const data = await response.json(); 
            if(data.error) throw new Error(data.error.message);
            let aiTime = data.candidates[0].content.parts[0].text.trim(); 
            document.getElementById("timeInput").value = aiTime; 
            showToast("🪄 Time set!", "success");
        } catch(e) { 
            showToast("AI Error.", "error"); 
        }
    }
    
    async function generateAIReview() {
        const apiKey = document.getElementById("aiApiKeyInput").value.trim() || localStorage.getItem("geminiKey");
        if(!apiKey) { 
            switchPage('settings'); 
            return showToast("Paste API Key first!", "error"); 
        }
        const outputDiv = document.getElementById("aiReviewOutput"); 
        outputDiv.innerText = "🪄 Analyzing...";
        try {
            const reminders = safeStorage("reminders", []);
            const comp = reminders.filter(r => r.status === "completed").length; 
            const pend = reminders.length - comp; 
            const xp = localStorage.getItem("habitXP_tasks") || "0";
            const prompt = `Act as a coach. Completed: ${comp}, Pending: ${pend}, XP: ${xp}. Write a punchy 2-sentence review with emojis.`;
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) 
            });
            const data = await response.json(); 
            if(data.error) throw new Error(data.error.message);
            outputDiv.innerText = data.candidates[0].content.parts[0].text.trim(); 
            showToast("Review Generated!", "success");
        } catch(e) { 
            outputDiv.innerText = "Error checking API Key."; 
        }
    }
    
    async function startSmartVoiceAssistant() {
        const apiKey = document.getElementById("aiApiKeyInput").value.trim() || localStorage.getItem("geminiKey");
        if(!apiKey) { 
            switchPage('settings'); 
            return showToast("Paste API Key first!", "error"); 
        }
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
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { 
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify({contents: [{parts:[{text: prompt}]}]}) 
                });
                const data = await res.json(); 
                let result = data.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim(); 
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
                showToast("AI could not understand.", "error"); 
            }
        }; 
        rec.start();
    }

    // --- Subtasks Handling ---
    function addSubtaskField(val = "", done = false) {
        const cont = document.getElementById("subtasksContainer");
        const id = Date.now() + Math.random(); 
        const div = document.createElement("div"); 
        div.style.display = "flex"; 
        div.style.gap="10px"; 
        div.style.marginBottom="10px"; 
        div.className="subtask-item";
        div.innerHTML = `<input type="checkbox" class="subtask-checkbox" style="width:20px;height:20px;" ${done ? 'checked' : ''} id="cb_${id}">
                         <input type="text" style="flex:1; margin:0; padding:8px 12px; border-radius:10px; border:1px solid #e5e5ea;" class="subtask-inp" placeholder="Sub-task..." value="${val}" id="inp_${id}">
                         <button style="background:#ffe5e5; color:#ff3b30; border:none; border-radius:10px; padding:8px; cursor:pointer;" onclick="this.parentElement.remove()">✖</button>`; 
        cont.appendChild(div);
    }
    
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
        
        const ctx = document.getElementById('productivityChart').getContext('2d'); 
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
            habitHtml = habits.map(h => `<span style="display:inline-block; background:#fff; padding:4px 10px; border-radius:8px; font-size:12px; font-weight:700; margin:2px 4px 2px 0;">🔥 ${h.name}: ${h.streak}</span>`).join('');
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
            html += `<option value="custom_${i}">⭐ ${t.title}</option>`; 
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
            `<option value="${t.name}">${t.name}</option>`
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
        const reminders = safeStorage("reminders", []);
        const habits = safeStorage("habits", []); 
        const todayStr = getTodayStr(); 
        const tomorrow = new Date(); 
        tomorrow.setHours(0,0,0,0); 
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        let todayPendingTasks = 0; 
        let todayCompletedTasks = 0;
        
        reminders.forEach(r => { 
            const rDate = new Date(r.time);
            if (r.status !== "completed") { 
                if (rDate < tomorrow) todayPendingTasks++; 
            } else { 
                if(r.time.split('T')[0] === todayStr) todayCompletedTasks++; 
            }
        });
        
        document.getElementById("widgetTasksToday").innerText = `${todayPendingTasks}`;
        document.getElementById("widgetHabitsToday").innerText = `${habits.filter(h => h.lastCheckIn !== todayStr).length} habits pending`;

        // Upcoming count
        const now = new Date();
        const upcomingTasks = reminders.filter(r => r.status !== 'completed' && !r.archived && r.time && new Date(r.time) > now);
        const upcomingEl = document.getElementById('widgetUpcomingCount');
        const nextLabelEl = document.getElementById('widgetNextLabel');
        if (upcomingEl) upcomingEl.innerText = upcomingTasks.length;
        if (nextLabelEl) {
            const next = upcomingTasks.sort((a,b) => new Date(a.time)-new Date(b.time))[0];
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
                    <h4 style="margin:0 0 5px 0; font-size:15px; color:#1c1c1e;">${habit.name}</h4>
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
            document.getElementById("modalTitle").innerText = "Edit Task"; 
            document.getElementById("submitBtn").innerText = "Update Task"; 
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
            tagsHtml += `<button class="template-chip ${activeTagFilter===t?'active':''}" onclick="filterByTag('${t}')">${t}</button>`; 
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
            li.className = `reminder-item ${priorityClass}`;
            if(isCompleted) { 
                li.style.opacity = "0.6"; 
                li.style.borderLeftColor = "#8e8e93"; 
            }
            li.id = `rem_card_${reminder.id}`; 
            li.setAttribute('data-id', reminder.id);
            
            const formattedTime = new Date(reminder.time).toLocaleString("en-IN", { 
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' 
            });

            let pinnedBadge = reminder.pinned ? `<div style="position:absolute; top:-10px; right:-10px; font-size:16px;">⭐</div>` : ``;
            let catHTML = reminder.category ? `<div style="background:#e5f1ff; color:#007aff; padding:4px 8px; border-radius:8px; font-size:11px; font-weight:700; margin-bottom:5px; display:inline-block;">${reminder.category.icon} ${reminder.category.name}</div>` : '';
            
            let projHTML = '';
            if (reminder.project) {
                const allProjects = safeStorage('projects', []);
                const proj = allProjects.find(p => String(p.id) === String(reminder.project));
                if (proj) projHTML = `<div class="project-badge-tag" style="background:${proj.color}22; color:${proj.color};">${proj.emoji} ${proj.name}</div>`;
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
                    if(tag.trim()) tagsHTML += `<span style="background:#e5e5ea; color:#8e8e93; padding:4px 8px; border-radius:8px; font-size:11px; font-weight:700; margin-bottom:5px; display:inline-block; margin-left:5px;">${tag.trim()}</span> `; 
                }); 
            }
            
            let subHTML = "";
            if(reminder.subtasks && reminder.subtasks.length > 0) {
                let doneCount = reminder.subtasks.filter(s=>s.done).length;
                let totalCount = reminder.subtasks.length; 
                let pct = (doneCount/totalCount)*100;
                subHTML = `<div style="width:100%; height:6px; background:#e5e5ea; border-radius:6px; margin:8px 0; overflow:hidden;"><div style="height:100%; width:${pct}%; background:#34c759;"></div></div><ul style="list-style:none; padding:0; margin:0;">`;
                reminder.subtasks.forEach((sub, idx) => { 
                    subHTML += `<li style="display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:4px; color:#666;"><input type="checkbox" style="width:16px;height:16px;margin:0;" ${sub.done?'checked':''} onchange="toggleSubtaskLocal(${reminder.id}, ${idx}, this)" ${isCompleted?'disabled':''}> <span style="${sub.done?'text-decoration:line-through;opacity:0.6;':''} font-weight:500;">${sub.text}</span></li>`; 
                });
                subHTML += `</ul>`;
            }

            let notesHTML = reminder.notes ? `<div style="margin: 8px 0; font-size: 13px; color: #666; background: #f2f2f7; padding: 10px; border-radius: 10px;">${reminder.notes}</div>` : "";
            
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
                    <h4 style="margin:5px 0; font-size:16px; color:#1c1c1e; font-weight:600; ${isCompleted?'text-decoration:line-through;':''}">${reminder.task}</h4>
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
            const taskHtml = `<div style="font-size:12px; background:white; padding:8px; border-radius:8px; margin-bottom:6px; cursor:pointer;" onclick="editReminder(${r.id}); closeModal('matrixModal')">👉 ${r.task}</div>`;
            
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
    // FEATURE 1: PUSH NOTIFICATIONS
    // ============================================================
    function requestNotificationPermission() {
        if (!('Notification' in window)) {
            return showToast('Browser does not support notifications', 'error');
        }
        Notification.requestPermission().then(perm => {
            if (perm === 'granted') {
                localStorage.setItem('pushNotif', 'true');
                const btn = document.getElementById('notifBtn');
                if (btn) { btn.innerText = '✅ On'; btn.style.background = '#34c759'; }
                new Notification('Master App', { body: 'Notifications are now active! ✅' });
                showToast('Push Notifications Enabled!', 'success');
            } else {
                localStorage.setItem('pushNotif', 'false');
                showToast('Notification permission denied', 'error');
            }
        });
    }
    // Alias so Settings button works
    const requestPushNotification = requestNotificationPermission;

    function showPushNotification(title, body) {
        if (Notification.permission === 'granted' && localStorage.getItem('pushNotif') === 'true') {
            const n = new Notification('⏰ ' + title, {
                body: body || 'Time to complete this task!',
                requireInteraction: true,
                tag: 'reminder-' + title
            });
            n.onclick = function() { window.focus(); n.close(); };
            // Persistent: stays until user dismisses/clicks (no auto-close)
        }
    }

    // Init notification button state on load
    document.addEventListener('DOMContentLoaded', () => {
        if (localStorage.getItem('pushNotif') === 'true' && Notification.permission === 'granted') {
            const btn = document.getElementById('notifBtn');
            if (btn) { btn.innerText = '✅ On'; btn.style.background = '#34c759'; }
        }
        applyCalendarColors();
    });

    // ============================================================
    // FEATURE 2: PROJECTS / FOLDERS
    // ============================================================
    let activeProjectFilter = '';

    function openProjectsModal() {
        renderProjectsList();
        openModal('projectsModal');
    }

    function addProject() {
        const nameEl = document.getElementById('newProjectName');
        const name = nameEl.value.trim();
        if (!name) return showToast('Enter project name!', 'error');
        const emojiEl = document.getElementById('newProjectEmoji');
        const colorEl = document.getElementById('newProjectColor');
        const projects = safeStorage('projects', []);
        projects.push({
            id: Date.now(),
            name,
            color: colorEl.value || '#007aff',
            emoji: emojiEl.value || '📁',
            milestones: []
        });
        localStorage.setItem('projects', JSON.stringify(projects));
        nameEl.value = ''; emojiEl.value = '';
        renderProjectsList();
        renderProjectFilter();
        renderProjectDropdown();
        syncToCloud();
        showToast('Project added! 📁', 'success');
    }

    function deleteProject(id) {
        let projects = safeStorage('projects', []);
        projects = projects.filter(p => p.id !== id);
        localStorage.setItem('projects', JSON.stringify(projects));
        renderProjectsList();
        renderProjectFilter();
        renderProjectDropdown();
        syncToCloud();
        showToast('Project deleted.', 'error');
    }

    function renderProjectsList() {
        const container = document.getElementById('projectsListContainer');
        if (!container) return;
        const projects = safeStorage('projects', []);
        if (projects.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#8e8e93; font-size:13px; padding:15px;">No projects yet. Add one above!</p>';
            return;
        }
        const reminders = safeStorage('reminders', []);
        container.innerHTML = projects.map(p => {
            const tasks = reminders.filter(r => String(r.project) === String(p.id) && !r.archived);
            const completed = tasks.filter(r => r.status === 'completed').length;
            const pct = tasks.length > 0 ? Math.round((completed/tasks.length)*100) : 0;
            return `
            <div style="background:#f2f2f7; padding:12px 14px; border-radius:12px; margin-bottom:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:10px; cursor:pointer; flex:1;" onclick="openProjectDetail(${p.id})">
                        <div style="width:10px; height:10px; border-radius:50%; background:${p.color}; flex-shrink:0;"></div>
                        <span style="font-size:18px;">${p.emoji}</span>
                        <span style="font-weight:600; font-size:14px;">${p.name}</span>
                    </div>
                    <button onclick="deleteProject(${p.id})" style="background:#ffe5e5; color:#ff3b30; border:none; border-radius:8px; padding:6px 10px; cursor:pointer; font-size:13px;">🗑️</button>
                </div>
                <div class="project-progress-track"><div class="project-progress-fill" style="width:${pct}%; background:${p.color};"></div></div>
                <p style="margin:5px 0 0; font-size:11px; color:#8e8e93;">${completed}/${tasks.length} tasks · ${pct}% · tap for details 👆</p>
            </div>
        `;
        }).join('');
    }

    function renderProjectFilter() {
        const container = document.getElementById('projectFilterContainer');
        if (!container) return;
        const projects = safeStorage('projects', []);
        if (projects.length === 0) { container.innerHTML = ''; return; }
        let html = `<button class="template-chip ${activeProjectFilter === '' ? 'active' : ''}" onclick="filterByProject('')">📋 All</button>`;
        projects.forEach(p => {
            const isActive = String(activeProjectFilter) === String(p.id);
            html += `<button class="template-chip ${isActive ? 'active' : ''}" onclick="filterByProject(${p.id})">${p.emoji} ${p.name}</button>`;
        });
        container.innerHTML = html;
    }

    function filterByProject(projectId) {
        activeProjectFilter = projectId;
        renderProjectFilter();
        loadReminders();
    }

    function renderProjectDropdown() {
        const select = document.getElementById('taskProjectInput');
        if (!select) return;
        const projects = safeStorage('projects', []);
        let html = '<option value="">📋 No Project</option>';
        projects.forEach(p => {
            html += `<option value="${p.id}">${p.emoji} ${p.name}</option>`;
        });
        select.innerHTML = html;
    }

    // ============================================================
    // FEATURE 3: MOOD TRACKER
    // ============================================================
    const moodData = [
        { emoji: '😄', label: 'Great', color: '#34c759' },
        { emoji: '😊', label: 'Good',  color: '#30d158' },
        { emoji: '😐', label: 'Okay',  color: '#ff9500' },
        { emoji: '😔', label: 'Sad',   color: '#5e5ce6' },
        { emoji: '😢', label: 'Bad',   color: '#ff3b30' }
    ];

    function logMood(moodIndex) {
        const todayStr = getTodayStr();
        const moodLog = safeStorage('moodLog', {});
        moodLog[todayStr] = moodIndex;
        localStorage.setItem('moodLog', JSON.stringify(moodLog));
        renderMoodTracker();
        syncToCloud();
        showToast(`Mood logged: ${moodData[moodIndex].emoji} ${moodData[moodIndex].label}`, 'success');
    }

    function renderMoodTracker() {
        const container = document.getElementById('moodTrackerCard');
        if (!container) return;
        const todayStr = getTodayStr();
        const moodLog = safeStorage('moodLog', {});
        const todayMood = moodLog[todayStr] !== undefined ? moodLog[todayStr] : -1;
        const last7 = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });
        const historyHtml = last7.map(date => {
            const idx = moodLog[date];
            return `<span style="font-size:20px;" title="${date}">${idx !== undefined ? moodData[idx].emoji : '⬜'}</span>`;
        }).join('');
        const moodBtnsHtml = moodData.map((m, i) => `
            <button onclick="logMood(${i})" class="mood-emoji-btn ${todayMood === i ? 'selected' : ''}"
                    title="${m.label}" style="${todayMood === i ? `border-color:${m.color}; background:${m.color}22;` : ''}">
                ${m.emoji}
            </button>
        `).join('');
        container.innerHTML = `
            <h5 style="margin:0 0 10px 0; color:#8e8e93; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
                😊 TODAY'S MOOD ${todayMood >= 0 ? '— ' + moodData[todayMood].label : ''}
            </h5>
            <div class="mood-emojis">${moodBtnsHtml}</div>
            <div style="border-top:1px solid #f2f2f7; margin-top:10px; padding-top:10px;">
                <p style="font-size:11px; color:#8e8e93; margin:0 0 6px 0; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Last 7 days</p>
                <div class="mood-history">${historyHtml}</div>
            </div>
        `;
    }

    // ============================================================
    // FEATURE 4: GOOGLE CALENDAR EXPORT (.ICS)
    // ============================================================
    function exportToGoogleCalendar() {
        const reminders = safeStorage('reminders', []);
        const pending = reminders.filter(r => r.status !== 'completed' && r.time);
        if (pending.length === 0) return showToast('No pending tasks to export!', 'error');
        const fmt = (d) => d.toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z';
        let ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Master Reminder App//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
        pending.forEach(r => {
            const start = new Date(r.time);
            const end   = new Date(start.getTime() + 3600000);
            const desc  = (r.notes || '').replace(/<[^>]*>/g,'').replace(/,/g,'\\,').replace(/\n/g,'\\n');
            const title = (r.task || 'Task').replace(/,/g,'\\,');
            const prio  = r.priority === 'high' ? '1' : r.priority === 'low' ? '9' : '5';
            ics.push('BEGIN:VEVENT',`UID:${r.id}@masterapp`,`DTSTAMP:${fmt(new Date())}`,
                `DTSTART:${fmt(start)}`,`DTEND:${fmt(end)}`,`SUMMARY:${title}`,
                `DESCRIPTION:${desc}`,`PRIORITY:${prio}`,
                `CATEGORIES:${r.category ? r.category.name : 'Task'}`,'END:VEVENT');
        });
        ics.push('END:VCALENDAR');
        const blob = new Blob([ics.join('\r\n')], { type:'text/calendar;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = 'MasterApp_Tasks.ics';
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        showToast(`📅 ${pending.length} tasks exported! Import .ics into Google Calendar.`, 'success');
    }

    // ============================================================
    // FEATURE 5: FAMILY TASK SHARING (Firebase)
    // ============================================================
    let sharedTaskIdToShare = null;

    function openShareModal(taskId) {
        sharedTaskIdToShare = taskId;
        const r = (safeStorage('reminders', [])).find(x => x.id === taskId);
        if (r) document.getElementById('shareTaskTitle').innerText = '📤 Share: ' + r.task;
        document.getElementById('shareEmailInput').value = '';
        openModal('shareTaskModal');
    }

    async function shareTaskWithFamily() {
        if (!currentUser) return showToast('Login required!', 'error');
        const email = document.getElementById('shareEmailInput').value.trim().toLowerCase();
        if (!email || !email.includes('@')) return showToast('Enter valid email!', 'error');
        const r = (safeStorage('reminders', [])).find(x => x.id === sharedTaskIdToShare);
        if (!r) return;
        showToast('Sharing...', 'info');
        try {
            await db.collection('shared_tasks').add({
                fromUid:   currentUser.uid,
                fromName:  userName || currentUser.email,
                toEmail:   email,
                task:      r.task,
                notes:     r.notes || '',
                time:      r.time,
                priority:  r.priority || 'medium',
                category:  r.category || null,
                sharedAt:  new Date().toISOString(),
                status:    'pending'
            });
            closeModal('shareTaskModal');
            showToast(`✅ Shared with ${email}!`, 'success');
        } catch(e) { showToast('Share error: ' + e.message, 'error'); }
    }

    async function openSharedModal() {
        openModal('sharedWithMeModal');
        loadSharedWithMe();
    }

    async function loadSharedWithMe() {
        if (!currentUser) return;
        const container = document.getElementById('sharedTasksContainer');
        if (!container) return;
        container.innerHTML = '<p style="text-align:center; color:#8e8e93; font-size:13px; padding:20px;">Loading...</p>';
        try {
            const snap = await db.collection('shared_tasks')
                .where('toEmail', '==', currentUser.email.toLowerCase())
                .where('status',  '==', 'pending')
                .get();
            const badge = document.getElementById('sharedBadge');
            if (!snap.empty && badge) { badge.style.display='flex'; badge.innerText = snap.size; }
            else if (badge) { badge.style.display = 'none'; }
            if (snap.empty) {
                container.innerHTML = '<p style="text-align:center; color:#8e8e93; font-size:13px; padding:20px;">No shared tasks 📭</p>';
                return;
            }
            let html = '';
            snap.forEach(doc => {
                const t = doc.data();
                const date = new Date(t.time).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
                const prioColor = t.priority==='high'?'#ff3b30':t.priority==='low'?'#34c759':'#ff9500';
                html += `
                    <div style="background:#f2f2f7; border-radius:14px; padding:14px; margin-bottom:10px; border-left:4px solid ${prioColor};">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                            <div style="flex:1;">
                                <h4 style="margin:0 0 4px; font-size:15px;">${t.task}</h4>
                                <p style="margin:0; font-size:12px; color:#8e8e93;">📅 ${date}</p>
                                <p style="margin:4px 0 0; font-size:12px; color:var(--primary); font-weight:600;">From: ${t.fromName}</p>
                                ${t.notes ? `<p style="margin:6px 0 0; font-size:12px; color:#666; background:white; padding:8px; border-radius:8px;">${t.notes}</p>` : ''}
                            </div>
                            <button onclick="acceptSharedTask('${doc.id}')" style="background:#34c759; color:white; border:none; border-radius:10px; padding:8px 14px; font-weight:700; font-size:12px; cursor:pointer; white-space:nowrap; flex-shrink:0;">Add ✅</button>
                        </div>
                    </div>`;
            });
            container.innerHTML = html;
        } catch(e) {
            container.innerHTML = '<p style="text-align:center; color:#ff3b30; font-size:13px;">Error loading. Check Firestore rules.</p>';
        }
    }

    async function acceptSharedTask(docId) {
        try {
            const doc = await db.collection('shared_tasks').doc(docId).get();
            if (!doc.exists) return;
            const t = doc.data();
            let reminders = safeStorage('reminders', []);
            reminders.push({
                id: Date.now(), task: t.task, notes: t.notes || '', time: t.time,
                priority: t.priority || 'medium', category: t.category || {name:'Task',icon:'📝'},
                repeat: 'none', status: 'pending', notified: false, pinned: false,
                tags: 'shared', preAlarm: 0, assignee: t.fromName || '', project: ''
            });
            localStorage.setItem('reminders', JSON.stringify(reminders));
            await db.collection('shared_tasks').doc(docId).update({ status: 'accepted' });
            syncToCloud(); loadReminders(); loadSharedWithMe();
            showToast('Task added to your list! ✅', 'success');
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    }

    // ============================================================
    // BATCH 2 — SNOOZE
    // ============================================================
    function snoozeTask(id, minutes) {
        let reminders = safeStorage("reminders", []);
        const idx = reminders.findIndex(r => r.id === id);
        if (idx === -1) return;
        const d = new Date(new Date(reminders[idx].time).getTime() + minutes * 60000);
        const pad = n => String(n).padStart(2, '0');
        reminders[idx].time = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        reminders[idx].notified = false;
        localStorage.setItem("reminders", JSON.stringify(reminders));
        loadReminders();
        syncToCloud();
        showToast(`😴 Snoozed ${minutes} min`, "success");
    }

    // ============================================================
    // BATCH 2 — FONT SIZE
    // ============================================================
    function setFontSize(size, sync = true) {
        const zoomMap = { small: '0.9', medium: '1', large: '1.15' };
        const mainAppEl = document.getElementById('mainApp');
        if (mainAppEl) mainAppEl.style.zoom = zoomMap[size] || '1';
        localStorage.setItem('appFontSize', size);
        document.querySelectorAll('.font-size-btn').forEach(b => b.classList.remove('active-font'));
        const btn = document.getElementById('fontBtn-' + size);
        if (btn) btn.classList.add('active-font');
        if (sync) { syncToCloud(); showToast('Font size updated!', 'success'); }
    }

    // ============================================================
    // BATCH 2 — SLEEP TRACKER
    // ============================================================
    function logSleep() {
        const hoursInput = document.getElementById('sleepHoursInput');
        const hours = parseFloat(hoursInput.value);
        if (isNaN(hours) || hours < 0 || hours > 16) return showToast('Enter valid hours (0-16)', 'error');
        const todayStr = getTodayStr();
        const sleepLog = safeStorage('sleepLog', {});
        sleepLog[todayStr] = hours;
        localStorage.setItem('sleepLog', JSON.stringify(sleepLog));
        renderSleepTracker();
        syncToCloud();
        showToast(`😴 Logged ${hours}h sleep`, 'success');
    }

    function renderSleepTracker() {
        const container = document.getElementById('sleepHistoryBars');
        if (!container) return;
        const sleepLog = safeStorage('sleepLog', {});
        const last7 = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });
        const maxH = 10;
        container.innerHTML = last7.map(date => {
            const h = sleepLog[date] || 0;
            const pct = Math.min(100, (h / maxH) * 100);
            const color = h === 0 ? '#e5e5ea' : h < 6 ? '#ff9500' : '#34c759';
            return `<div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%;">
                        <div style="width:100%; max-width:18px; height:${Math.max(pct,4)}%; background:${color}; border-radius:4px;" title="${date}: ${h}h"></div>
                    </div>`;
        }).join('');
        const todayStr = getTodayStr();
        const hoursInput = document.getElementById('sleepHoursInput');
        if (hoursInput && sleepLog[todayStr] !== undefined) hoursInput.value = sleepLog[todayStr];
    }

    // ============================================================
    // BATCH 2 — TASK ARCHIVE
    // ============================================================
    function archiveTask(id) {
        let reminders = safeStorage('reminders', []);
        const idx = reminders.findIndex(r => r.id === id);
        if (idx === -1) return;
        reminders[idx].archived = true;
        localStorage.setItem('reminders', JSON.stringify(reminders));
        loadReminders();
        syncToCloud();
        showToast('Archived 📦', 'success');
    }

    function unarchiveTask(id) {
        let reminders = safeStorage('reminders', []);
        const idx = reminders.findIndex(r => r.id === id);
        if (idx === -1) return;
        reminders[idx].archived = false;
        localStorage.setItem('reminders', JSON.stringify(reminders));
        loadReminders();
        syncToCloud();
        showToast('Restored from archive 📤', 'success');
    }

    // ============================================================
    // BATCH 2 — BULK SELECT / ACTIONS
    // ============================================================
    let bulkMode = false;
    let selectedBulkIds = new Set();

    function toggleBulkMode() {
        bulkMode = !bulkMode;
        selectedBulkIds.clear();
        const bar = document.getElementById('bulkActionBar');
        const btn = document.getElementById('bulkToggleBtn');
        if (bulkMode) {
            bar.style.display = 'flex';
            btn.style.background = '#34c759';
            btn.style.color = 'white';
            btn.innerText = '☑️ Selecting...';
        } else {
            bar.style.display = 'none';
            btn.style.background = '';
            btn.style.color = '#34c759';
            btn.innerText = '☑️ Select';
        }
        updateBulkCount();
        loadReminders();
    }

    function toggleBulkSelect(id, checked) {
        if (checked) selectedBulkIds.add(id);
        else selectedBulkIds.delete(id);
        updateBulkCount();
    }

    function updateBulkCount() {
        const el = document.getElementById('bulkCountText');
        if (el) el.innerText = `${selectedBulkIds.size} selected`;
    }

    function bulkComplete() {
        if (selectedBulkIds.size === 0) return showToast('Select tasks first!', 'error');
        let reminders = safeStorage('reminders', []);
        reminders.forEach(r => { if (selectedBulkIds.has(r.id)) r.status = 'completed'; });
        localStorage.setItem('reminders', JSON.stringify(reminders));
        showToast(`${selectedBulkIds.size} tasks marked Done ✅`, 'success');
        toggleBulkMode();
        syncToCloud();
    }

    function bulkArchive() {
        if (selectedBulkIds.size === 0) return showToast('Select tasks first!', 'error');
        let reminders = safeStorage('reminders', []);
        reminders.forEach(r => { if (selectedBulkIds.has(r.id)) { r.archived = true; r.status = 'completed'; } });
        localStorage.setItem('reminders', JSON.stringify(reminders));
        showToast(`${selectedBulkIds.size} tasks archived 📦`, 'success');
        toggleBulkMode();
        syncToCloud();
    }

    function bulkDelete() {
        if (selectedBulkIds.size === 0) return showToast('Select tasks first!', 'error');
        if (!confirm(`Delete ${selectedBulkIds.size} tasks? This cannot be undone.`)) return;
        let reminders = safeStorage('reminders', []);
        reminders = reminders.filter(r => !selectedBulkIds.has(r.id));
        localStorage.setItem('reminders', JSON.stringify(reminders));
        showToast(`${selectedBulkIds.size} tasks deleted 🗑️`, 'error');
        toggleBulkMode();
        syncToCloud();
    }

    // ============================================================
    // BATCH 2 — WEBHOOK (WhatsApp/SMS via Zapier/Make/IFTTT)
    // ============================================================
    function sendWebhookNotification(reminder) {
        const url = (localStorage.getItem('webhookUrl') || '').trim();
        if (!url) return;
        const plainNotes = (reminder.notes || '').replace(/<[^>]*>/g, '');
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `⏰ Reminder: ${reminder.task}`,
                task: reminder.task,
                notes: plainNotes,
                time: reminder.time,
                priority: reminder.priority || 'medium'
            })
        }).catch(() => {});
    }

    // ============================================================
    // BATCH 2 — GOOGLE CALENDAR 2-WAY SYNC
    // ============================================================
    let gcalTokenClient = null;
    let gcalAccessToken = null;

    function loadGcalScripts(callback) {
        if (window.google && window.google.accounts) return callback();
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.onload = callback;
        s.onerror = () => showToast('Could not load Google script. Check internet.', 'error');
        document.head.appendChild(s);
    }

    function connectGoogleCalendar() {
        const clientId = document.getElementById('gcalClientIdInput').value.trim();
        if (!clientId) return showToast('Paste Google Client ID first!', 'error');
        localStorage.setItem('gcalClientId', clientId);
        loadGcalScripts(() => {
            gcalTokenClient = google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: 'https://www.googleapis.com/auth/calendar.events',
                callback: (resp) => {
                    if (resp.error) return showToast('Google auth error: ' + resp.error, 'error');
                    gcalAccessToken = resp.access_token;
                    document.getElementById('gcalStatusText').innerText = '✅ Connected! Tap "Sync Now" to sync.';
                    showToast('Google Calendar Connected! 🎉', 'success');
                    syncToCloud();
                }
            });
            gcalTokenClient.requestAccessToken();
        });
    }

    async function syncFromGoogleCalendar() {
        if (!gcalAccessToken) return showToast('Tap "Connect" first!', 'error');
        document.getElementById('gcalStatusText').innerText = '🔄 Syncing...';
        let reminders = safeStorage('reminders', []);
        let pushCount = 0, pullCount = 0;

        for (let r of reminders) {
            if (!r.gcalEventId && r.status !== 'completed' && !r.archived && r.time) {
                try {
                    const start = new Date(r.time);
                    const end = new Date(start.getTime() + 3600000);
                    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + gcalAccessToken, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            summary: r.task,
                            description: (r.notes||'').replace(/<[^>]*>/g,''),
                            start: { dateTime: start.toISOString() },
                            end: { dateTime: end.toISOString() }
                        })
                    });
                    const data = await res.json();
                    if (data.id) { r.gcalEventId = data.id; pushCount++; }
                } catch(e) {}
            }
        }

        try {
            const timeMin = new Date().toISOString();
            const timeMax = new Date(Date.now() + 30*86400000).toISOString();
            const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`, {
                headers: { 'Authorization': 'Bearer ' + gcalAccessToken }
            });
            const data = await res.json();
            const existingIds = new Set(reminders.map(r => r.gcalEventId).filter(Boolean));
            (data.items || []).forEach(ev => {
                if (existingIds.has(ev.id)) return;
                const startTime = ev.start.dateTime || (ev.start.date + 'T09:00');
                reminders.push({
                    id: Date.now() + Math.floor(Math.random()*1000),
                    task: ev.summary || 'Untitled Event',
                    notes: ev.description || '',
                    time: startTime.slice(0,16),
                    priority: 'medium',
                    repeat: 'none', status: 'pending', notified: false, pinned: false,
                    tags: 'gcal', preAlarm: 0, gcalEventId: ev.id, category: {name:'Calendar', icon:'📅'}
                });
                pullCount++;
            });
        } catch(e) {}

        localStorage.setItem('reminders', JSON.stringify(reminders));
        loadReminders();
        syncToCloud();
        document.getElementById('gcalStatusText').innerText = `✅ Synced! ${pushCount} sent, ${pullCount} imported.`;
        showToast(`Calendar Synced: ${pushCount} sent, ${pullCount} new 📅`, 'success');
    }

    function showGcalInstructions() {
        alert(
            "📅 Free Google Calendar Client ID Setup:\n\n" +
            "1. Go to console.cloud.google.com\n" +
            "2. Create a new Project\n" +
            "3. APIs & Services → Enable 'Google Calendar API'\n" +
            "4. OAuth consent screen → External → Add your email as Test User\n" +
            "5. Credentials → Create Credentials → OAuth Client ID → Web application\n" +
            "6. Add this app's URL under 'Authorized JavaScript origins'\n" +
            "7. Copy the Client ID and paste it above!\n\n" +
            "Free forever for personal use 🎉\n" +
            "Note: You'll need to tap 'Connect' once per session (token expires after ~1 hour)."
        );
    }

    // ============================================================
    // BATCH 2 — AI CHAT ASSISTANT / DAILY PLANNER / SMART RESCHEDULE
    // ============================================================
    async function callGeminiAI(prompt) {
        const apiKey = document.getElementById("aiApiKeyInput").value.trim() || localStorage.getItem("geminiKey");
        if (!apiKey) throw new Error("NO_KEY");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.candidates[0].content.parts[0].text.trim();
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
        if (e.message === 'NO_KEY') {
            bubble.innerText = "⚠️ Free Gemini API Key joiye. Settings ma jaine paste karo!";
            closeModal('aiChatModal');
            switchPage('settings');
            showToast("Add Gemini API Key in Settings!", "error");
        } else {
            bubble.innerText = "⚠️ Error: " + e.message;
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
    async function openFamilyModal() {
        openModal('familyModal');
        const container = document.getElementById('familyContainer');
        if (!currentUser) {
            container.innerHTML = '<p style="text-align:center; color:#8e8e93; font-size:13px; padding:20px;">Login required.</p>';
            return;
        }
        container.innerHTML = '<p style="text-align:center; color:#8e8e93; font-size:13px; padding:20px;">Loading...</p>';
        try {
            const [sentSnap, receivedSnap] = await Promise.all([
                db.collection('shared_tasks').where('fromUid','==',currentUser.uid).get(),
                db.collection('shared_tasks').where('toEmail','==',currentUser.email.toLowerCase()).get()
            ]);

            let html = `<div class="family-section-title">📤 You Shared (${sentSnap.size})</div>`;
            if (sentSnap.empty) {
                html += `<p style="font-size:12px; color:#8e8e93;">Nothing shared yet.</p>`;
            } else {
                sentSnap.forEach(doc => {
                    const t = doc.data();
                    const date = t.time ? new Date(t.time).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
                    const statusBadge = t.status === 'accepted' ? '✅' : '⏳';
                    html += `<div class="family-task-item"><div><b style="font-size:13px;">${t.task}</b><br><span style="font-size:11px; color:#8e8e93;">📧 ${t.toEmail} · 📅 ${date}</span></div><span>${statusBadge}</span></div>`;
                });
            }

            html += `<div class="family-section-title" style="margin-top:18px;">📥 Shared With You (${receivedSnap.size})</div>`;
            if (receivedSnap.empty) {
                html += `<p style="font-size:12px; color:#8e8e93;">Nothing received yet.</p>`;
            } else {
                receivedSnap.forEach(doc => {
                    const t = doc.data();
                    const date = t.time ? new Date(t.time).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
                    const statusBadge = t.status === 'accepted' ? '✅ Added' : '⏳ Pending';
                    html += `<div class="family-task-item"><div><b style="font-size:13px;">${t.task}</b><br><span style="font-size:11px; color:#8e8e93;">👤 ${t.fromName||'?'} · 📅 ${date}</span></div><span style="font-size:11px; font-weight:700;">${statusBadge}</span></div>`;
                });
            }

            container.innerHTML = html;
        } catch(e) {
            container.innerHTML = `<p style="text-align:center; color:#ff3b30; font-size:13px;">Error: ${e.message}<br><span style="color:#8e8e93; font-size:11px;">Check Firestore index/rules for 'shared_tasks'.</span></p>`;
        }
    }

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
            if (e.message === 'NO_KEY') { switchPage('settings'); showToast("Add free Gemini API Key in Settings!", "error"); }
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
        badge.innerHTML = `${cat.icon} ${cat.name}`;
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
            if (e.message === 'NO_KEY') { switchPage('settings'); showToast("Add free Gemini API Key in Settings!", "error"); }
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
                habitPredictions += `<div class="report-stat-row"><span style="font-size:13px;">🎯 ${h.name}</span><span style="font-weight:700; color:#8e8e93;">Start today!</span></div>`;
            } else if (next) {
                const daysLeft = next - streak;
                habitPredictions += `<div class="report-stat-row"><span style="font-size:13px;">🎯 ${h.name} → ${next}-day streak</span><span style="font-weight:700; color:var(--primary);">${daysLeft}d left</span></div>`;
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
                    <div class="kanban-card-title"><span class="kanban-priority-dot" style="background:${prioColor};"></span>${r.task}</div>
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

        document.getElementById('projectDetailTitle').innerHTML = `${proj.emoji} ${proj.name}`;
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
            html += `<div class="timeline-marker" style="left:${pos}%; background:${color};" title="${t.task}"></div>`;
        });
        milestones.forEach(m => {
            const pos = ((new Date(m.date + 'T00:00:00') - minDate)/totalMs)*100;
            html += `<div class="timeline-milestone" style="left:${pos}%; background:${m.done ? '#34c759' : '#5e5ce6'};" title="🏁 ${m.name}"></div>`;
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
                <span class="milestone-name" style="flex:1;">${m.name}</span>
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
                <span class="workspace-task-text" style="flex:1; font-size:13px;">${t.text}</span>
                <span style="font-size:10px; color:#8e8e93;">${t.addedBy || ''}</span>
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
    // SHIFT SCHEDULE
    // ============================================================
    function getShiftConfig() {
        let cfg = safeStorage('shiftConfig', null);
        if (!cfg) {
            cfg = {
                types: [
                    { id: 1, name: 'Morning', icon: '🌅', color: '#ff9500', start: '06:00', end: '14:00' },
                    { id: 2, name: 'Evening', icon: '🌇', color: '#5e5ce6', start: '14:00', end: '22:00' },
                    { id: 3, name: 'Night',   icon: '🌙', color: '#007aff', start: '22:00', end: '06:00' },
                    { id: 4, name: 'Off',     icon: '🏖️', color: '#34c759', start: null,    end: null }
                ],
                pattern: [],
                patternStart: getTodayStr(),
                overrides: {},
                notes: {},
                reminderEnabled: false,
                reminderMinutes: 60
            };
            localStorage.setItem('shiftConfig', JSON.stringify(cfg));
        }
        if (!cfg.overrides) cfg.overrides = {};
        if (!cfg.pattern) cfg.pattern = [];
        if (!cfg.notes) cfg.notes = {};
        return cfg;
    }

    function saveShiftConfig(cfg, sync = true) {
        localStorage.setItem('shiftConfig', JSON.stringify(cfg));
        if (sync) syncToCloud();
    }

    function getShiftForDate(dateStr) {
        const cfg = getShiftConfig();
        if (cfg.overrides[dateStr] !== undefined) {
            return cfg.types.find(t => t.id === cfg.overrides[dateStr]) || null;
        }
        if (cfg.pattern.length === 0 || !cfg.patternStart) return null;
        const start = new Date(cfg.patternStart + 'T00:00:00');
        const target = new Date(dateStr + 'T00:00:00');
        let diffDays = Math.round((target - start) / 86400000);
        diffDays = ((diffDays % cfg.pattern.length) + cfg.pattern.length) % cfg.pattern.length;
        const typeId = cfg.pattern[diffDays];
        return cfg.types.find(t => t.id === typeId) || null;
    }

    // --- Today's Shift Home Widget ---
    function renderTodayShiftWidget() {
        const card = document.getElementById('todayShiftCard');
        if (!card) return;
        const todayStr = getTodayStr();
        const shift = getShiftForDate(todayStr);

        if (!shift) {
            document.getElementById('shiftCardIcon').innerText = '🔄';
            document.getElementById('shiftCardName').innerText = 'Set up Shift Schedule';
            document.getElementById('shiftCardTime').innerText = 'Tap to configure your rotation 👆';
            document.getElementById('shiftCardNext').innerText = '';
            return;
        }
        document.getElementById('shiftCardIcon').innerText = shift.icon;
        document.getElementById('shiftCardName').innerText = shift.name + (shift.start ? ' Shift' : '');
        document.getElementById('shiftCardTime').innerText = shift.start ? `${shift.start} – ${shift.end}` : 'Day off 🎉 Enjoy!';

        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
        const nextShift = getShiftForDate(formatDateLocal(tomorrow));
        document.getElementById('shiftCardNext').innerHTML = nextShift ? `Tomorrow<br>${nextShift.icon} ${nextShift.name}` : '';
    }

    // --- Shift Modal & Tabs ---
    function openShiftModal() {
        const cfg = getShiftConfig();
        document.getElementById('shiftReminderToggle').checked = cfg.reminderEnabled;
        document.getElementById('shiftReminderMinutes').value = cfg.reminderMinutes;
        document.getElementById('shiftReminderMinutesWrap').style.display = cfg.reminderEnabled ? 'block' : 'none';
        renderShiftTypes();
        setShiftTab('setup');
        openModal('shiftModal');
    }

    function setShiftTab(tab) {
        document.querySelectorAll('.shift-view-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('shifttab-' + tab).classList.add('active');
        document.getElementById('shiftTabSetup').style.display = (tab === 'setup') ? 'block' : 'none';
        document.getElementById('shiftTabCalendar').style.display = (tab === 'calendar') ? 'block' : 'none';
        document.getElementById('shiftTabSummary').style.display = (tab === 'summary') ? 'block' : 'none';
        if (tab === 'calendar') renderShiftCalendar();
        if (tab === 'summary') renderShiftSummary();
    }

    // --- Shift Types ---
    function renderShiftTypes() {
        const cfg = getShiftConfig();
        const container = document.getElementById('shiftTypesContainer');
        container.innerHTML = cfg.types.map(t => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#f2f2f7; padding:10px 12px; border-radius:10px; margin-bottom:6px;">
                <div style="display:flex; align-items:center; gap:8px; font-size:13px;">
                    <div style="width:10px; height:10px; border-radius:50%; background:${t.color}; flex-shrink:0;"></div>
                    <span>${t.icon} <b>${t.name}</b></span>
                    <span style="font-size:11px; color:#8e8e93;">${t.start ? t.start+'–'+t.end : 'All day off'}</span>
                    ${t.rate ? `<span style="font-size:10px; color:#34c759; font-weight:700;">₹${t.rate}/hr</span>` : ''}
                </div>
                <button onclick="deleteShiftType(${t.id})" style="background:#ffe5e5; color:#ff3b30; border:none; border-radius:8px; padding:5px 9px; cursor:pointer; font-size:12px;">🗑️</button>
            </div>
        `).join('');
        renderShiftPatternBuilder();
    }

    function addShiftType() {
        const name = document.getElementById('newShiftName').value.trim();
        if (!name) return showToast('Enter shift name!', 'error');
        const start = document.getElementById('newShiftStart').value || null;
        const end = document.getElementById('newShiftEnd').value || null;
        const icon = document.getElementById('newShiftEmoji').value.trim() || '🔄';
        const color = document.getElementById('newShiftColor').value || '#007aff';
        const rate = Number(document.getElementById('newShiftRate').value) || 0;

        const cfg = getShiftConfig();
        cfg.types.push({ id: Date.now(), name, icon, color, start, end, rate });
        saveShiftConfig(cfg);

        document.getElementById('newShiftName').value = '';
        document.getElementById('newShiftStart').value = '';
        document.getElementById('newShiftEnd').value = '';
        document.getElementById('newShiftEmoji').value = '';
        document.getElementById('newShiftRate').value = '';
        renderShiftTypes();
        showToast('Shift type added! ✅', 'success');
    }

    function deleteShiftType(id) {
        const cfg = getShiftConfig();
        cfg.types = cfg.types.filter(t => t.id !== id);
        cfg.pattern = cfg.pattern.filter(pid => pid !== id);
        Object.keys(cfg.overrides).forEach(d => { if (cfg.overrides[d] === id) delete cfg.overrides[d]; });
        saveShiftConfig(cfg);
        renderShiftTypes();
        renderTodayShiftWidget();
        syncShiftReminders();
        showToast('Shift type removed', 'info');
    }

    // --- Rotation Pattern ---
    function renderShiftPatternBuilder() {
        const cfg = getShiftConfig();
        const builder = document.getElementById('shiftPatternBuilder');
        builder.innerHTML = cfg.types.map(t =>
            `<button class="shift-type-chip" style="background:${t.color}22; color:${t.color};" onclick="addToPattern(${t.id})">${t.icon} ${t.name}</button>`
        ).join('');
        renderShiftPatternSequence();
    }

    function renderShiftPatternSequence() {
        const cfg = getShiftConfig();
        const container = document.getElementById('shiftPatternSequence');
        if (cfg.pattern.length === 0) {
            container.innerHTML = '<span style="font-size:12px; color:#8e8e93; padding:6px;">Tap chips above to build your cycle (e.g. 🌅🌅🌇🌇🌙🌙🏖️🏖️)</span>';
        } else {
            container.innerHTML = cfg.pattern.map((typeId, idx) => {
                const t = cfg.types.find(x => x.id === typeId);
                if (!t) return '';
                return `<span class="shift-pattern-item" style="background:${t.color};">${idx+1}. ${t.icon}<span class="remove-x" onclick="removeFromPattern(${idx})">✖</span></span>`;
            }).join('');
        }
        document.getElementById('shiftPatternStartDate').value = cfg.patternStart || getTodayStr();
    }

    function addToPattern(typeId) {
        const cfg = getShiftConfig();
        cfg.pattern.push(typeId);
        saveShiftConfig(cfg);
        renderShiftPatternSequence();
        renderTodayShiftWidget();
        syncShiftReminders();
    }

    function removeFromPattern(idx) {
        const cfg = getShiftConfig();
        cfg.pattern.splice(idx, 1);
        saveShiftConfig(cfg);
        renderShiftPatternSequence();
        renderTodayShiftWidget();
        syncShiftReminders();
    }

    function saveShiftPattern() {
        const cfg = getShiftConfig();
        cfg.patternStart = document.getElementById('shiftPatternStartDate').value || getTodayStr();
        saveShiftConfig(cfg);
        renderTodayShiftWidget();
        syncShiftReminders();
        showToast('Pattern start date saved!', 'success');
    }

    // --- Shift Reminder Settings ---
    function saveShiftReminderSettings() {
        const cfg = getShiftConfig();
        cfg.reminderEnabled = document.getElementById('shiftReminderToggle').checked;
        cfg.reminderMinutes = parseInt(document.getElementById('shiftReminderMinutes').value) || 60;
        document.getElementById('shiftReminderMinutesWrap').style.display = cfg.reminderEnabled ? 'block' : 'none';
        saveShiftConfig(cfg);
        syncShiftReminders();
        showToast(cfg.reminderEnabled ? '🔔 Shift reminders ON' : 'Shift reminders OFF', 'info');
    }

    // --- Auto-generate Shift Reminders (next 14 days) ---
    function syncShiftReminders() {
        const cfg = getShiftConfig();
        const todayStr = getTodayStr();
        let reminders = safeStorage('reminders', []);

        // Remove future un-completed auto-generated shift reminders (regenerate fresh)
        reminders = reminders.filter(r => !(r.shiftGenerated && r.status !== 'completed' && r.time.split('T')[0] >= todayStr));

        if (cfg.reminderEnabled) {
            const pad = n => String(n).padStart(2,'0');
            for (let i = 0; i < 14; i++) {
                const d = new Date(); d.setDate(d.getDate() + i);
                const dStr = formatDateLocal(d);
                const shift = getShiftForDate(dStr);
                if (!shift || !shift.start) continue;

                const [h, m] = shift.start.split(':').map(Number);
                const shiftDateTime = new Date(d); shiftDateTime.setHours(h, m, 0, 0);
                const remindAt = new Date(shiftDateTime.getTime() - cfg.reminderMinutes * 60000);
                if (remindAt < new Date()) continue;

                const timeStr = `${remindAt.getFullYear()}-${pad(remindAt.getMonth()+1)}-${pad(remindAt.getDate())}T${pad(remindAt.getHours())}:${pad(remindAt.getMinutes())}`;
                reminders.push({
                    id: Date.now() + i,
                    task: `${shift.icon} ${shift.name} Shift starts at ${shift.start}`,
                    notes: `Get ready! ${shift.name} shift: ${shift.start} – ${shift.end}`,
                    time: timeStr, priority: 'medium', repeat: 'none', status: 'pending',
                    notified: false, pinned: false, tags: 'shift', preAlarm: 0,
                    category: { name: 'Shift', icon: '🔄' }, shiftGenerated: true
                });
            }
        }

        localStorage.setItem('reminders', JSON.stringify(reminders));
        loadReminders();
        renderHomeCalendar();
        syncToCloud();
    }

    // --- Shift Calendar (Preview + Override) ---
    let shiftCalMonth = new Date().getMonth();
    let shiftCalYear = new Date().getFullYear();

    function changeShiftCalMonth(dir) {
        shiftCalMonth += dir;
        if (shiftCalMonth > 11) { shiftCalMonth = 0; shiftCalYear++; }
        if (shiftCalMonth < 0) { shiftCalMonth = 11; shiftCalYear--; }
        renderShiftCalendar();
    }

    function renderShiftCalendar() {
        const grid = document.getElementById('shiftCalGrid');
        if (!grid) return;
        const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        document.getElementById('shiftCalMonthDisplay').innerText = `${monthNames[shiftCalMonth]} ${shiftCalYear}`;

        const cfg = getShiftConfig();
        let firstDay = new Date(shiftCalYear, shiftCalMonth, 1).getDay();
        let daysInMonth = new Date(shiftCalYear, shiftCalMonth + 1, 0).getDate();
        const todayStr = getTodayStr();

        let html = '';
        for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;
        for (let i = 1; i <= daysInMonth; i++) {
            const dStr = `${shiftCalYear}-${String(shiftCalMonth+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            const shift = getShiftForDate(dStr);
            const isToday = dStr === todayStr;
            const isOverride = cfg.overrides[dStr] !== undefined;
            const hasNote = cfg.notes && cfg.notes[dStr];
            let style = shift ? `background:${shift.color}22; color:${shift.color};` : '';
            let cls = 'cal-day';
            if (isToday) cls += ' today';
            html += `<div class="${cls}" style="${style} position:relative;" onclick="openShiftOverride('${dStr}')">
                ${i}${shift ? `<span style="position:absolute; bottom:2px; right:3px; font-size:9px;">${shift.icon}</span>` : ''}
                ${isOverride ? `<span style="position:absolute; top:1px; left:3px; font-size:8px;">📌</span>` : ''}
                ${hasNote ? `<span style="position:absolute; top:1px; right:3px; font-size:8px;">📝</span>` : ''}
            </div>`;
        }
        grid.innerHTML = html;

        const legend = document.getElementById('shiftCalLegend');
        legend.innerHTML = cfg.types.map(t =>
            `<span class="shift-legend-item"><span class="shift-legend-dot" style="background:${t.color};"></span>${t.icon} ${t.name}</span>`
        ).join('');
    }

    let shiftOverrideDate = null;

    function openShiftOverride(dateStr) {
        shiftOverrideDate = dateStr;
        const cfg = getShiftConfig();
        const dt = new Date(dateStr + 'T00:00:00');
        document.getElementById('shiftOverrideDateLabel').innerText = dt.toLocaleDateString('en-IN', {weekday:'long', day:'numeric', month:'short'});

        let html = cfg.types.map(t =>
            `<button class="shift-override-btn" onclick="setShiftOverride(${t.id})"><span style="font-size:20px;">${t.icon}</span> ${t.name}</button>`
        ).join('');
        if (cfg.overrides[dateStr] !== undefined) {
            html += `<button class="shift-override-btn" style="color:var(--primary);" onclick="setShiftOverride('auto')">🔄 Reset to Rotation</button>`;
        }
        document.getElementById('shiftOverrideOptions').innerHTML = html;
        document.getElementById('shiftNoteInput').value = (cfg.notes && cfg.notes[dateStr]) || '';
        openModal('shiftOverrideModal');
    }

    function saveShiftNote() {
        const cfg = getShiftConfig();
        const note = document.getElementById('shiftNoteInput').value.trim();
        if (!cfg.notes) cfg.notes = {};
        if (note) cfg.notes[shiftOverrideDate] = note;
        else delete cfg.notes[shiftOverrideDate];
        saveShiftConfig(cfg);
        closeModal('shiftOverrideModal');
        renderShiftCalendar();
        showToast('Note saved! 📝', 'success');
    }

    function setShiftOverride(typeIdOrAuto) {
        const cfg = getShiftConfig();
        if (typeIdOrAuto === 'auto') {
            delete cfg.overrides[shiftOverrideDate];
        } else {
            cfg.overrides[shiftOverrideDate] = Number(typeIdOrAuto);
        }
        saveShiftConfig(cfg);
        closeModal('shiftOverrideModal');
        renderShiftCalendar();
        renderTodayShiftWidget();
        syncShiftReminders();
        showToast('Shift updated! 🔄', 'success');
    }

    // --- Shift Summary (Monthly hours/income) ---
    let shiftSummaryMonth = new Date().getMonth();
    let shiftSummaryYear = new Date().getFullYear();

    function changeShiftSummaryMonth(dir) {
        shiftSummaryMonth += dir;
        if (shiftSummaryMonth > 11) { shiftSummaryMonth = 0; shiftSummaryYear++; }
        if (shiftSummaryMonth < 0) { shiftSummaryMonth = 11; shiftSummaryYear--; }
        renderShiftSummary();
    }

    function shiftHoursDiff(start, end) {
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        let mins = (eh*60+em) - (sh*60+sm);
        if (mins <= 0) mins += 24*60; // overnight shift
        return mins / 60;
    }

    function renderShiftSummary() {
        const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        document.getElementById('shiftSummaryMonthDisplay').innerText = `${monthNames[shiftSummaryMonth]} ${shiftSummaryYear}`;

        const cfg = getShiftConfig();
        const daysInMonth = new Date(shiftSummaryYear, shiftSummaryMonth + 1, 0).getDate();
        const counts = {};
        let totalHours = 0;
        let totalIncome = 0;

        for (let i = 1; i <= daysInMonth; i++) {
            const dStr = `${shiftSummaryYear}-${String(shiftSummaryMonth+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            const shift = getShiftForDate(dStr);
            if (!shift) continue;
            counts[shift.id] = (counts[shift.id] || 0) + 1;
            if (shift.start && shift.end) {
                const hrs = shiftHoursDiff(shift.start, shift.end);
                totalHours += hrs;
                if (shift.rate) totalIncome += hrs * shift.rate;
            }
        }

        const countsEl = document.getElementById('shiftSummaryTypeCounts');
        countsEl.innerHTML = cfg.types.map(t => {
            const c = counts[t.id] || 0;
            return `<div style="display:flex; justify-content:space-between; align-items:center; background:#f2f2f7; padding:10px 12px; border-radius:10px; margin-bottom:6px;">
                <span style="font-size:13px;">${t.icon} ${t.name}</span>
                <span style="font-weight:700; color:${t.color};">${c} day${c !== 1 ? 's' : ''}</span>
            </div>`;
        }).join('');

        document.getElementById('shiftSummaryHours').innerText = Math.round(totalHours) + 'h';
        document.getElementById('shiftSummaryIncome').innerText = '₹' + Math.round(totalIncome).toLocaleString('en-IN');
        window._shiftSummaryIncome = Math.round(totalIncome);
        window._shiftSummaryMonthLabel = `${monthNames[shiftSummaryMonth]} ${shiftSummaryYear}`;
    }

    function addShiftIncomeToFinance() {
        const income = window._shiftSummaryIncome || 0;
        if (!income) return showToast('No income to add — set hourly rates first!', 'error');
        const d = getFinData();
        d.income.unshift({ id: Date.now(), name: 'Shift Income - ' + (window._shiftSummaryMonthLabel||''), amount: income, category: 'Salary', date: getTodayStr(), type: 'income' });
        saveFinData(d);
        hapticFeedback('success');
        showToast('₹' + income.toLocaleString('en-IN') + ' added to Finance! 💰', 'success');
    }

    // FINANCE
    function getFinData(){return safeStorage('finData',{"expenses":[],"income":[],"budgets":[],"bills":[],"emis":[],"investments":[]})}    function saveFinData(d){localStorage.setItem('finData',JSON.stringify(d));syncToCloud()}
    function setFinTab(tab){document.querySelectorAll('.fin-tab-btn').forEach(b=>b.classList.remove('active'));document.querySelectorAll('[id^="finTab-"]').forEach(el=>el.style.display='none');const btn=document.querySelector(`.fin-tab-btn[onclick*="'${tab}'"]`);if(btn)btn.classList.add('active');const el=document.getElementById('finTab-'+tab);if(el)el.style.display='block';if(tab==='expenses')renderExpenses();if(tab==='income')renderIncome();if(tab==='budget')renderBudgets();if(tab==='bills')renderBills();if(tab==='emi')renderEMIs();if(tab==='invest')renderInvestments()}
    function renderFinanceDashboard(){const d=getFinData();const now=new Date();const ms=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;const mExp=d.expenses.filter(e=>e.date&&e.date.startsWith(ms)).reduce((s,e)=>s+safeNum(e.amount),0);const mInc=d.income.filter(e=>e.date&&e.date.startsWith(ms)).reduce((s,e)=>s+safeNum(e.amount),0);const emi=d.emis.reduce((s,e)=>s+safeNum(e.amount),0);const tb=d.budgets.reduce((s,b)=>s+safeNum(b.limit),0);const fi=document.getElementById('finIncome');const fe=document.getElementById('finExpense');const fs=document.getElementById('finSavings');const fb=document.getElementById('finBudgetLeft');if(fi)fi.innerText='₹'+mInc.toLocaleString('en-IN');if(fe)fe.innerText='₹'+mExp.toLocaleString('en-IN');if(fs)fs.innerText='₹'+Math.max(0,mInc-mExp-emi).toLocaleString('en-IN');if(fb)fb.innerText='₹'+Math.max(0,tb-mExp).toLocaleString('en-IN');renderExpenses();const summary=renderMonthlyFinanceSummary();const el=document.getElementById('finMonthSummary');if(el)el.innerHTML='Savings rate: <b style="color:'+(summary.savingRate>=20?'#34c759':'#ff9500')+'">'+summary.savingRate+'%</b> this month';}
    function addExpense(type){const iE=type==='expense';const name=document.getElementById(iE?'expNameInput':'incNameInput').value.trim();const amt=safeNum(document.getElementById(iE?'expAmtInput':'incAmtInput').value);const cat=document.getElementById(iE?'expCatInput':'incCatInput').value;const date=document.getElementById(iE?'expDateInput':'incDateInput').value||getTodayStr();const note=iE?(document.getElementById('expNoteInput')?.value.trim()||''):'';if(!name||!amt||amt<0)return showToast('Enter valid name & amount!','error');const d=getFinData();d[iE?'expenses':'income'].unshift({id:Date.now(),name:sanitizeHTML(name),amount:amt,category:cat,date,type,note:sanitizeHTML(note)});saveFinData(d);document.getElementById(iE?'expNameInput':'incNameInput').value='';document.getElementById(iE?'expAmtInput':'incAmtInput').value='';if(iE&&document.getElementById('expNoteInput'))document.getElementById('expNoteInput').value='';renderFinanceDashboard();if(!iE)renderIncome();hapticFeedback('success');showToast(iE?'Expense added!':'Income added!','success')}
    function renderExpenses(){const c=document.getElementById('expensesList');if(!c)return;const d=getFinData();c.innerHTML=d.expenses.slice(0,20).map(e=>`<div class="expense-item"><div><b style="font-size:13px">${e.name}</b>${e.note?`<br><span style="font-size:11px;color:#8e8e93;font-style:italic">${e.note}</span>`:''}<br><span style="font-size:11px;color:#8e8e93">${e.category}·${e.date}</span></div><div style="display:flex;align-items:center;gap:8px"><span style="font-weight:700;color:#ff3b30">₹${Number(e.amount).toLocaleString('en-IN')}</span><button onclick="deleteFinEntry('expenses',${e.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:16px">✖</button></div></div>`).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:20px">No expenses yet.</p>'}
    function renderIncome(){const c=document.getElementById('incomeList');if(!c)return;const d=getFinData();c.innerHTML=d.income.slice(0,20).map(e=>`<div class="expense-item"><div><b style="font-size:13px">${e.name}</b><br><span style="font-size:11px;color:#8e8e93">${e.category}·${e.date}</span></div><div style="display:flex;align-items:center;gap:8px"><span style="font-weight:700;color:#34c759">₹${Number(e.amount).toLocaleString('en-IN')}</span><button onclick="deleteFinEntry('income',${e.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:16px">✖</button></div></div>`).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:20px">No income.</p>'}
    function addBudget(){const cat=document.getElementById('budgetCatInput').value.trim();const limit=Number(document.getElementById('budgetAmtInput').value);if(!cat||!limit)return showToast('Enter category & limit!','error');const d=getFinData();d.budgets=d.budgets.filter(b=>b.cat!==cat);d.budgets.push({cat,limit});saveFinData(d);renderBudgets();document.getElementById('budgetCatInput').value='';document.getElementById('budgetAmtInput').value='';showToast('Budget set!','success')}
    function renderBudgets(){const c=document.getElementById('budgetList');if(!c)return;const d=getFinData();const now=new Date();const ms=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;const bc={};d.expenses.filter(e=>e.date&&e.date.startsWith(ms)).forEach(e=>{bc[e.category]=(bc[e.category]||0)+Number(e.amount)});c.innerHTML=d.budgets.map(b=>{const sp=bc[b.cat]||0;const pct=Math.min(100,Math.round((sp/b.limit)*100));const col=pct>=90?'#ff3b30':pct>=70?'#ff9500':'#34c759';return`<div style="background:#f2f2f7;border-radius:12px;padding:12px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;margin-bottom:6px"><span>${b.cat}</span><span style="color:${col}">₹${sp.toLocaleString('en-IN')}/₹${Number(b.limit).toLocaleString('en-IN')} (${pct}%)</span></div><div class="project-progress-track"><div class="project-progress-fill" style="width:${pct}%;background:${col}"></div></div></div>`}).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No budgets set.</p>'}
    function addBill(){const name=document.getElementById('billNameInput').value.trim();const amt=Number(document.getElementById('billAmtInput').value);const due=document.getElementById('billDueInput').value;const type=document.getElementById('billTypeInput').value;if(!name||!due)return showToast('Enter name & due date!','error');const d=getFinData();d.bills.unshift({id:Date.now(),name,amount:amt,due,type,paid:false});saveFinData(d);renderBills();document.getElementById('billNameInput').value='';document.getElementById('billAmtInput').value='';showToast('Bill added!','success')}
    function renderBills(){const c=document.getElementById('billsList');if(!c)return;const d=getFinData();const today=getTodayStr();c.innerHTML=d.bills.map(b=>{const dl=Math.ceil((new Date(b.due)-new Date(today))/86400000);const urg=dl<0?'bill-urgent':dl<=3?'bill-upcoming':'';return`<div class="bill-item ${urg}"><div><b style="font-size:13px">${b.type} ${b.name}</b><br><span style="font-size:11px;color:#8e8e93">Due:${b.due}·${dl<0?'⚠️Overdue':dl===0?'🔴Today!':dl+'d'}</span></div><div style="display:flex;align-items:center;gap:8px">${b.amount?`<span style="font-weight:700">₹${Number(b.amount).toLocaleString('en-IN')}</span>`:''}<button onclick="toggleBillPaid(${b.id})" style="background:${b.paid?'#e5e5ea':'#e5f9e9'};color:${b.paid?'#8e8e93':'#34c759'};border:none;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer">${b.paid?'Paid ✅':'Pay'}</button><button onclick="deleteFinEntry('bills',${b.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`}).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No bills.</p>'}
    function toggleBillPaid(id){const d=getFinData();const b=d.bills.find(x=>x.id===id);if(b)b.paid=!b.paid;saveFinData(d);renderBills()}
    function addEMI(){const name=document.getElementById('emiNameInput').value.trim();const amt=Number(document.getElementById('emiAmtInput').value);const due=document.getElementById('emiDueInput').value;const months=Number(document.getElementById('emiMonthsInput').value);if(!name||!amt)return showToast('Enter name & EMI!','error');const d=getFinData();d.emis.unshift({id:Date.now(),name,amount:amt,due:due?due.slice(8,10):'1',monthsLeft:months});saveFinData(d);renderEMIs();document.getElementById('emiNameInput').value='';document.getElementById('emiAmtInput').value='';showToast('EMI added!','success')}
    function renderEMIs(){const c=document.getElementById('emiList');if(!c)return;const d=getFinData();const total=d.emis.reduce((s,e)=>s+Number(e.amount),0);c.innerHTML=(total?`<div style="background:#ffe5e5;border-radius:12px;padding:10px;margin-bottom:10px;text-align:center"><b style="color:#ff3b30">Total EMI/month: ₹${total.toLocaleString('en-IN')}</b></div>`:'')+d.emis.map(e=>`<div class="bill-item"><div><b style="font-size:13px">${e.name}</b><br><span style="font-size:11px;color:#8e8e93">Day:${e.due}·${e.monthsLeft||'?'} mo left</span></div><div style="display:flex;align-items:center;gap:8px"><span style="font-weight:700;color:#ff3b30">₹${Number(e.amount).toLocaleString('en-IN')}</span><button onclick="deleteFinEntry('emis',${e.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No EMIs.</p>'}
    function addInvestment(){const name=document.getElementById('invNameInput').value.trim();const amt=Number(document.getElementById('invAmtInput').value);const type=document.getElementById('invTypeInput').value;const ret=Number(document.getElementById('invReturnInput').value);if(!name||!amt)return showToast('Enter name & amount!','error');const d=getFinData();d.investments.unshift({id:Date.now(),name,amount:amt,type,returnPct:ret});saveFinData(d);renderInvestments();document.getElementById('invNameInput').value='';document.getElementById('invAmtInput').value='';showToast('Investment added!','success')}
    function renderInvestments(){const c=document.getElementById('investList');if(!c)return;const d=getFinData();const total=d.investments.reduce((s,e)=>s+Number(e.amount),0);c.innerHTML=(total?`<div style="background:#e5f9e9;border-radius:12px;padding:10px;margin-bottom:10px;text-align:center"><b style="color:#34c759">Total: ₹${total.toLocaleString('en-IN')}</b></div>`:'')+d.investments.map(e=>`<div class="expense-item"><div><b style="font-size:13px">${e.type} ${e.name}</b>${e.returnPct?`<br><span style="font-size:11px;color:#34c759">Return:${e.returnPct}%</span>`:''}</div><div style="display:flex;align-items:center;gap:8px"><span style="font-weight:700;color:#34c759">₹${Number(e.amount).toLocaleString('en-IN')}</span><button onclick="deleteFinEntry('investments',${e.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No investments.</p>'}
    function deleteFinEntry(col,id){const d=getFinData();d[col]=d[col].filter(e=>e.id!==id);saveFinData(d);renderFinanceDashboard()}
    let currentTaxRegime = 'new';
    function setTaxRegime(regime) {
        currentTaxRegime = regime;
        document.getElementById('regime-new').classList.toggle('active', regime==='new');
        document.getElementById('regime-old').classList.toggle('active', regime==='old');
        const label = document.getElementById('taxDeductionLabel');
        if(label) label.innerText = regime==='old' ? 'Deductions u/s 80C,80D,HRA etc. (Rs)' : 'Deductions (limited use in New Regime) (Rs)';
        const result = document.getElementById('taxResult');
        if(result) result.innerHTML = '';
    }

    function calcNewRegimeTax(taxable) {
        let tax = 0;
        if(taxable > 300000 && taxable <= 600000) tax = (taxable-300000)*0.05;
        else if(taxable > 600000 && taxable <= 900000) tax = 15000 + (taxable-600000)*0.10;
        else if(taxable > 900000 && taxable <= 1200000) tax = 45000 + (taxable-900000)*0.15;
        else if(taxable > 1200000 && taxable <= 1500000) tax = 90000 + (taxable-1200000)*0.20;
        else if(taxable > 1500000) tax = 150000 + (taxable-1500000)*0.30;
        return tax;
    }

    function calcOldRegimeTax(taxable) {
        let tax = 0;
        if(taxable > 250000 && taxable <= 500000) tax = (taxable-250000)*0.05;
        else if(taxable > 500000 && taxable <= 1000000) tax = 12500 + (taxable-500000)*0.20;
        else if(taxable > 1000000) tax = 112500 + (taxable-1000000)*0.30;
        return tax;
    }

    function calculateTax(){
        const income=Number(document.getElementById('taxIncomeInput').value);
        const ded=Number(document.getElementById('taxDeductionInput').value)||0;
        if(!income) return showToast('Enter income!','error');

        const stdDeduction = 50000;
        let taxable, tax;
        if(currentTaxRegime === 'old') {
            taxable = Math.max(0, income - stdDeduction - ded);
            tax = calcOldRegimeTax(taxable);
        } else {
            taxable = Math.max(0, income - stdDeduction);
            tax = calcNewRegimeTax(taxable);
        }
        const cess = tax * 0.04;
        const total = tax + cess;

        // Compute the other regime too for comparison
        const otherTaxable = currentTaxRegime === 'old' ? Math.max(0, income - stdDeduction) : Math.max(0, income - stdDeduction - ded);
        const otherTax = currentTaxRegime === 'old' ? calcNewRegimeTax(otherTaxable) : calcOldRegimeTax(otherTaxable);
        const otherTotal = otherTax * 1.04;
        const betterRegime = total <= otherTotal ? currentTaxRegime : (currentTaxRegime === 'old' ? 'new' : 'old');
        const savings = Math.abs(total - otherTotal);

        const el=document.getElementById('taxResult');
        if(el) el.innerHTML=`<div style="background:#fff;border-radius:12px;padding:12px;margin-top:8px;text-align:left;">
            <p style="margin:3px 0;font-size:12px">Taxable Income: Rs ${taxable.toLocaleString('en-IN')}</p>
            <p style="margin:3px 0;font-size:12px">Income Tax: Rs ${Math.round(tax).toLocaleString('en-IN')}</p>
            <p style="margin:3px 0;font-size:12px">Health & Education Cess (4%): Rs ${Math.round(cess).toLocaleString('en-IN')}</p>
            <p style="margin:6px 0 0;font-size:14px;font-weight:800;color:#ff3b30">Total Tax (${currentTaxRegime==='old'?'Old':'New'} Regime): Rs ${Math.round(total).toLocaleString('en-IN')}</p>
            <p style="margin:8px 0 0;font-size:11px;color:#34c759;font-weight:700;">${betterRegime===currentTaxRegime ? 'This regime saves you Rs '+Math.round(savings).toLocaleString('en-IN')+' vs the other!' : 'Tip: '+(betterRegime==='old'?'Old':'New')+' Regime would save Rs '+Math.round(savings).toLocaleString('en-IN')+' more'}</p>
            <p style="margin:6px 0 0;font-size:10px;color:#8e8e93">*Estimate for FY2024-25, salaried individual</p>
        </div>`;
        hapticFeedback('success');
    }

    // STUDENT MODE
    function getStudentData(){return safeStorage('studentData',{"exams":[],"subjects":[]})}    function saveStudentData(d){localStorage.setItem('studentData',JSON.stringify(d));syncToCloud()}
    function addExam(){const name=document.getElementById('examNameInput').value.trim();const date=document.getElementById('examDateInput').value;const emoji=document.getElementById('examEmojiInput').value.trim()||'📝';if(!name||!date)return showToast('Enter exam name & date!','error');const d=getStudentData();d.exams.unshift({id:Date.now(),name,date,emoji});saveStudentData(d);renderExamCountdowns();document.getElementById('examNameInput').value='';document.getElementById('examDateInput').value='';showToast('Exam added!','success')}
    function renderExamCountdowns(){const c=document.getElementById('examCountdownsContainer');if(!c)return;const d=getStudentData();const today=new Date();today.setHours(0,0,0,0);const upcoming=d.exams.filter(e=>new Date(e.date)>=today).sort((a,b)=>new Date(a.date)-new Date(b.date));if(!upcoming.length){c.innerHTML='';return}c.innerHTML=upcoming.slice(0,3).map(e=>{const days=Math.ceil((new Date(e.date)-today)/86400000);const col=days<=7?'#ff3b30':days<=30?'#ff9500':'#34c759';return`<div class="exam-countdown-card" style="background:linear-gradient(135deg,${col},${col}aa);position:relative"><div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:11px;opacity:0.8;font-weight:600;text-transform:uppercase">EXAM</div><div style="font-size:18px;font-weight:800;margin-top:2px">${e.emoji} ${e.name}</div><div style="font-size:12px;opacity:0.85;margin-top:2px">📅 ${new Date(e.date+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div></div><div style="text-align:center"><div style="font-size:36px;font-weight:900;line-height:1">${days}</div><div style="font-size:10px;opacity:0.85">${days===1?'DAY':'DAYS'} LEFT</div></div></div><button onclick="deleteExam(${e.id})" style="position:absolute;right:8px;top:8px;background:rgba(255,255,255,0.2);border:none;color:white;border-radius:6px;padding:2px 6px;cursor:pointer;font-size:11px">✖</button></div>`}).join('')}
    function deleteExam(id){const d=getStudentData();d.exams=d.exams.filter(e=>e.id!==id);saveStudentData(d);renderExamCountdowns()}
    function addSubject(){const name=document.getElementById('subjectNameInput').value.trim();const color=document.getElementById('subjectColorInput').value;if(!name)return showToast('Enter subject!','error');const d=getStudentData();d.subjects.unshift({id:Date.now(),name,color,studyHours:0});saveStudentData(d);renderSubjects();updateStudySubjectSelect();document.getElementById('subjectNameInput').value='';showToast('Subject added!','success')}
    function renderSubjects(){const c=document.getElementById('subjectsList');if(!c)return;const d=getStudentData();c.innerHTML=d.subjects.map(s=>`<div class="subject-item"><div style="display:flex;align-items:center;gap:10px"><div style="width:10px;height:10px;border-radius:50%;background:${s.color};flex-shrink:0"></div><div><b style="font-size:13px">${s.name}</b><br><span style="font-size:11px;color:#8e8e93">📚 ${s.studyHours||0}h</span></div></div><div style="display:flex;align-items:center;gap:6px"><button onclick="logStudyHour(${s.id})" style="background:${s.color}22;color:${s.color};border:none;border-radius:8px;padding:6px 10px;font-weight:700;cursor:pointer;font-size:12px">+1h</button><button onclick="deleteSubject(${s.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No subjects.</p>'}
    function logStudyHour(id){const d=getStudentData();const s=d.subjects.find(x=>x.id===id);if(s)s.studyHours=(s.studyHours||0)+1;saveStudentData(d);renderSubjects();showToast('📚 1h logged!','success')}
    function deleteSubject(id){const d=getStudentData();d.subjects=d.subjects.filter(s=>s.id!==id);saveStudentData(d);renderSubjects();updateStudySubjectSelect()}
    function updateStudySubjectSelect(){const sel=document.getElementById('studySubjectSelect');if(!sel)return;const d=getStudentData();sel.innerHTML='<option value="">Select Subject</option>'+d.subjects.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}

    // JOURNAL
    function getJournalEntries(){return safeStorage('journalEntries', {})}
    function saveJournalEntries(data){localStorage.setItem('journalEntries',JSON.stringify(data));syncToCloud()}
    function loadTodayJournalEntry(){const e=getJournalEntries()[getTodayStr()];const el=document.getElementById('journalEntryInput');if(el&&e)el.value=e.text||'';const tagsEl=document.getElementById('journalTagsInput');if(tagsEl&&e)tagsEl.value=(e.tags||[]).join(', ')}

    const JOURNAL_PROMPTS = [
        "What's one thing you're grateful for today?",
        "What was the most challenging part of your day, and how did you handle it?",
        "Describe a moment today that made you smile.",
        "What's one goal you're working towards this week?",
        "What did you learn today that you didn't know before?",
        "If you could change one thing about today, what would it be?",
        "What's something kind someone did for you recently?",
        "Write about a small win you had today.",
        "What's been on your mind lately?",
        "Describe your ideal tomorrow, what would make it great?",
        "What's a habit you'd like to build, and why?",
        "Who made a positive impact on your day today?",
        "What's something you're looking forward to?",
        "Write three words that describe your mood today and explain why.",
        "What's one thing you'd tell your past self from a year ago?",
    ];

    function getJournalPrompt() {
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(),0,0)) / 86400000);
        return JOURNAL_PROMPTS[dayOfYear % JOURNAL_PROMPTS.length];
    }

    function usePrompt() {
        const prompt = document.getElementById('journalPromptText').innerText;
        const el = document.getElementById('journalEntryInput');
        if (!el.value.trim()) el.value = prompt + '\n\n';
        el.focus();
        hapticFeedback('light');
    }

    function calculateJournalStreak() {
        const entries = getJournalEntries();
        const dates = Object.keys(entries);
        if (!dates.length) return { current: 0, longest: 0 };

        let current = 0;
        const todayStr = getTodayStr();
        const yesterdayStr = formatDateLocal(new Date(Date.now() - 86400000));

        if (entries[todayStr] || entries[yesterdayStr]) {
            let d = entries[todayStr] ? new Date(todayStr+'T00:00:00') : new Date(yesterdayStr+'T00:00:00');
            while (entries[formatDateLocal(d)]) {
                current++;
                d.setDate(d.getDate() - 1);
            }
        }

        let longest = 0, streak = 0, prevDate = null;
        dates.slice().sort().forEach(dStr => {
            const d = new Date(dStr + 'T00:00:00');
            if (prevDate && (d - prevDate) === 86400000) streak++;
            else streak = 1;
            longest = Math.max(longest, streak);
            prevDate = d;
        });

        return { current, longest: Math.max(longest, current) };
    }

    function renderJournalStats() {
        const entries = getJournalEntries();
        const stk = calculateJournalStreak();
        const sEl = document.getElementById('journalStreak');
        const tEl = document.getElementById('journalTotalEntries');
        const lEl = document.getElementById('journalLongestStreak');
        if (sEl) sEl.innerText = stk.current + '🔥';
        if (tEl) tEl.innerText = Object.keys(entries).length;
        if (lEl) lEl.innerText = stk.longest;
        const pEl = document.getElementById('journalPromptText');
        if (pEl) pEl.innerText = getJournalPrompt();
    }

    function saveJournalEntry(){
        const text=document.getElementById('journalEntryInput').value.trim();
        if(!text)return showToast('Write something!','error');
        const entries=getJournalEntries();
        const todayStr=getTodayStr();
        const ml=safeStorage('moodLog', {});
        const tagsRaw = document.getElementById('journalTagsInput').value.trim();
        const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [];
        entries[todayStr]={text,mood:ml[todayStr],tags,savedAt:new Date().toISOString()};
        saveJournalEntries(entries);
        renderJournalEntries();
        renderJournalStats();
        hapticFeedback('success');
        showToast('Journal saved! 📓','success');
    }

    function getAllJournalTags() {
        const entries = getJournalEntries();
        const tagSet = new Set();
        Object.values(entries).forEach(e => (e.tags||[]).forEach(t => tagSet.add(t)));
        return [...tagSet];
    }

    let activeJournalTagFilter = null;

    function filterJournalByTag(tag) {
        activeJournalTagFilter = activeJournalTagFilter === tag ? null : tag;
        renderJournalEntries();
    }

    function renderJournalTagFilters() {
        const container = document.getElementById('journalTagFilters');
        if (!container) return;
        const tags = getAllJournalTags();
        container.innerHTML = tags.map(t => `<button onclick="filterJournalByTag('${t}')" class="fin-tab-btn${activeJournalTagFilter===t?' active':''}" style="font-size:11px;">#${t}</button>`).join('');
    }

    function renderJournalEntries(){const c=document.getElementById('journalEntriesContainer');if(!c)return;const entries=getJournalEntries();const search=(document.getElementById('journalSearchInput')?.value||'').toLowerCase();const me=['😄','😊','😐','😔','😢'];let sorted=Object.entries(entries).sort((a,b)=>b[0].localeCompare(a[0])).filter(([_,e])=>!search||e.text.toLowerCase().includes(search));if(activeJournalTagFilter)sorted=sorted.filter(([_,e])=>(e.tags||[]).includes(activeJournalTagFilter));renderJournalTagFilters();if(!sorted.length){c.innerHTML='<p style="text-align:center;color:#8e8e93;font-size:13px;padding:20px">No entries yet. Start writing! ✍️</p>';return}c.innerHTML=sorted.slice(0,30).map(([date,entry])=>{const ms=entry.mood!==undefined?me[entry.mood]:'';const dt=new Date(date+'T00:00:00');const tagsHtml=(entry.tags||[]).map(t=>`<span style="background:#e5f1ff;color:var(--primary);font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;margin-right:4px;">#${t}</span>`).join('');return`<div class="journal-entry"><div class="journal-date">${dt.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} ${ms}</div><p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:inherit">${entry.text.slice(0,200)}${entry.text.length>200?'...':''}</p>${tagsHtml?`<div style="margin-bottom:6px;">${tagsHtml}</div>`:''}<div style="display:flex;gap:8px;margin-top:8px"><button onclick="editJournalEntry('${date}')" style="background:#f2f2f7;border:none;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer">✏️ Edit</button><button onclick="deleteJournalEntry('${date}')" style="background:#ffe5e5;color:#ff3b30;border:none;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer">🗑️</button></div></div>`}).join('')}
    function editJournalEntry(date){const e=getJournalEntries();const el=document.getElementById('journalEntryInput');if(el&&e[date])el.value=e[date].text;const tagsEl=document.getElementById('journalTagsInput');if(tagsEl&&e[date])tagsEl.value=(e[date].tags||[]).join(', ');showToast('Editing...','info')}
    function deleteJournalEntry(date){const e=getJournalEntries();delete e[date];saveJournalEntries(e);renderJournalEntries();renderJournalStats()}

    // MEDICINE
    function getMeds(){return safeStorage('medicines', [])}
    function saveMeds(data){localStorage.setItem('medicines',JSON.stringify(data));syncToCloud()}
    function openMedicineModal(){renderMedicineList();openModal('medicineModal')}
    function addMedicine(){const name=document.getElementById('medNameInput').value.trim();const dose=document.getElementById('medDoseInput').value.trim();const time=document.getElementById('medTimeInput').value;const freq=document.getElementById('medFreqInput').value;if(!name)return showToast('Enter medicine name!','error');const meds=getMeds();meds.unshift({id:Date.now(),name,dose,time,freq,takenDate:null});saveMeds(meds);renderMedicineList();document.getElementById('medNameInput').value='';document.getElementById('medDoseInput').value='';if(time){let rems=safeStorage('reminders', []);rems.push({id:Date.now(),task:`💊 Take ${name}`,notes:dose||'',time:`${getTodayStr()}T${time}`,priority:'high',repeat:'daily',status:'pending',notified:false,pinned:false,tags:'medicine',preAlarm:0,category:{name:'Health',icon:'💊'}});localStorage.setItem('reminders',JSON.stringify(rems));loadReminders()}showToast('💊 Medicine added!','success')}
    function renderMedicineList(){const c=document.getElementById('medicineList');if(!c)return;const meds=getMeds();const ts=getTodayStr();c.innerHTML=meds.map(m=>`<div class="med-item ${m.takenDate===ts?'med-taken':''}"><div><b style="font-size:13px">💊 ${m.name}</b><br><span style="font-size:11px;color:#8e8e93">${m.dose||''}${m.time?' · '+m.time:''}·${m.freq}</span></div><div style="display:flex;gap:8px;align-items:center"><button onclick="toggleMedTaken(${m.id})" style="background:${m.takenDate===ts?'#e5e5ea':'#e5f9e9'};color:${m.takenDate===ts?'#8e8e93':'#34c759'};border:none;border-radius:8px;padding:5px 10px;font-weight:700;cursor:pointer;font-size:12px">${m.takenDate===ts?'Taken ✅':'Take'}</button><button onclick="deleteMed(${m.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No medicines.</p>'}
    function toggleMedTaken(id){const m=getMeds();const x=m.find(x=>x.id===id);if(x)x.takenDate=(x.takenDate===getTodayStr()?null:getTodayStr());saveMeds(m);renderMedicineList()}
    function deleteMed(id){saveMeds(getMeds().filter(x=>x.id!==id));renderMedicineList()}

    // VEHICLE
    function getVehicles(){return safeStorage('vehicleReminders', [])}
    function saveVehicles(d){localStorage.setItem('vehicleReminders',JSON.stringify(d));syncToCloud()}
    function openVehicleModal(){renderVehicleList();openModal('vehicleModal')}
    function addVehicleReminder(){const veh=document.getElementById('vehNameInput').value.trim();const reminder=document.getElementById('vehReminderInput').value.trim();const due=document.getElementById('vehDueInput').value;const type=document.getElementById('vehTypeInput').value;if(!veh||!due)return showToast('Enter vehicle & due date!','error');const data=getVehicles();data.unshift({id:Date.now(),veh,reminder,due,type});saveVehicles(data);let rems=safeStorage('reminders', []);rems.push({id:Date.now(),task:`🚗 ${veh}: ${reminder||type}`,notes:'',time:`${due}T09:00`,priority:'high',repeat:'none',status:'pending',notified:false,pinned:false,tags:'vehicle',preAlarm:0,category:{name:'Vehicle',icon:'🚗'}});localStorage.setItem('reminders',JSON.stringify(rems));loadReminders();document.getElementById('vehNameInput').value='';document.getElementById('vehReminderInput').value='';renderVehicleList();showToast('Vehicle reminder added!','success')}
    function renderVehicleList(){const c=document.getElementById('vehicleReminderList');if(!c)return;const data=getVehicles();const today=getTodayStr();c.innerHTML=data.map(v=>{const dl=Math.ceil((new Date(v.due)-new Date(today))/86400000);const col=dl<0?'#ff3b30':dl<=7?'#ff9500':'#34c759';return`<div class="vehicle-item" style="border-left:3px solid ${col}"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><b style="font-size:13px">${v.type} ${v.veh}</b>${v.reminder?`<br><span style="font-size:12px;color:var(--primary)">${v.reminder}</span>`:''}<br><span style="font-size:11px;color:#8e8e93">📅 ${v.due}·${dl<0?'⚠️Overdue':dl===0?'🔴Today!':dl+'d'}</span></div><button onclick="deleteVehicle(${v.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`}).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No vehicle reminders.</p>'}
    function deleteVehicle(id){saveVehicles(getVehicles().filter(x=>x.id!==id));renderVehicleList()}

    // SHOPPING
    function getShopData(){return safeStorage('shopData',{"lists":{},"activeList":""})}    function saveShopData(d){localStorage.setItem('shopData',JSON.stringify(d));syncToCloud()}
    function openShoppingModal(){renderShopListSelect();renderShoppingItems();openModal('shoppingModal')}
    function addShopList(){const name=document.getElementById('shopNameInput').value.trim();if(!name)return showToast('Enter list name!','error');const d=getShopData();if(!d.lists[name])d.lists[name]=[];d.activeList=name;saveShopData(d);document.getElementById('shopNameInput').value='';renderShopListSelect();renderShoppingItems()}
    function renderShopListSelect(){const sel=document.getElementById('shopListSelect');if(!sel)return;const d=getShopData();sel.innerHTML=Object.keys(d.lists).map(l=>`<option value="${l}" ${l===d.activeList?'selected':''}>${l} (${d.lists[l].length})</option>`).join('')}
    function addShopItem(){const d=getShopData();const list=document.getElementById('shopListSelect')?.value||d.activeList;if(!list)return showToast('Create a list first!','error');const name=document.getElementById('shopItemInput').value.trim();const qty=document.getElementById('shopQtyInput').value||1;if(!name)return showToast('Enter item!','error');if(!d.lists[list])d.lists[list]=[];d.lists[list].unshift({id:Date.now(),name,qty:Number(qty),done:false});saveShopData(d);document.getElementById('shopItemInput').value='';document.getElementById('shopQtyInput').value='';renderShoppingItems()}
    function renderShoppingItems(){const c=document.getElementById('shoppingItems');const te=document.getElementById('shoppingTotal');if(!c)return;const d=getShopData();const ln=document.getElementById('shopListSelect')?.value||d.activeList;if(!ln||!d.lists[ln]){c.innerHTML='<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">Select/create a list.</p>';return}const items=d.lists[ln];const done=items.filter(i=>i.done).length;if(te)te.innerText=`${done}/${items.length} items`;c.innerHTML=items.map(i=>`<div class="shop-item ${i.done?'done':''}"><input type="checkbox" ${i.done?'checked':''} onchange="toggleShopItem('${ln}',${i.id})" style="width:18px;height:18px;margin:0;flex-shrink:0"><span style="flex:1;font-size:13px">${i.name}</span><span style="font-size:11px;color:#8e8e93">×${i.qty}</span><button onclick="deleteShopItem('${ln}',${i.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div>`).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">Empty list.</p>'}
    function toggleShopItem(list,id){const d=getShopData();const item=d.lists[list]?.find(x=>x.id===id);if(item)item.done=!item.done;saveShopData(d);renderShoppingItems()}
    function deleteShopItem(list,id){const d=getShopData();if(d.lists[list])d.lists[list]=d.lists[list].filter(x=>x.id!==id);saveShopData(d);renderShoppingItems()}

    // TRAVEL
    function getTravelData(){return safeStorage('travelData',{"trips":[],"packing":[]})}    function saveTravelData(d){localStorage.setItem('travelData',JSON.stringify(d));syncToCloud()}
    function openTravelModal(){setTravelTab('trips');renderTrips();openModal('travelModal')}
    function setTravelTab(tab){document.querySelectorAll('[id^="traveltab-"]').forEach(b=>b.classList.remove('active'));document.getElementById('traveltab-'+tab).classList.add('active');document.getElementById('travelTabTrips').style.display=tab==='trips'?'block':'none';document.getElementById('travelTabPacking').style.display=tab==='packing'?'block':'none';if(tab==='packing')renderPackingList()}
    function addTrip(){const name=document.getElementById('tripNameInput').value.trim();const dest=document.getElementById('tripDestInput').value.trim();const from=document.getElementById('tripFromInput').value;const to=document.getElementById('tripToInput').value;if(!name)return showToast('Enter trip name!','error');const d=getTravelData();d.trips.unshift({id:Date.now(),name,dest,from,to});saveTravelData(d);renderTrips();document.getElementById('tripNameInput').value='';document.getElementById('tripDestInput').value='';showToast('Trip added! ✈️','success')}
    function renderTrips(){const c=document.getElementById('tripsList');if(!c)return;const d=getTravelData();c.innerHTML=d.trips.map(t=>{const days=t.from&&t.to?Math.ceil((new Date(t.to)-new Date(t.from))/86400000)+1:null;return`<div class="trip-item"><div><b style="font-size:13px">✈️ ${t.name}</b>${t.dest?`<br><span style="font-size:11px;color:var(--primary)">📍${t.dest}</span>`:''}${t.from?`<br><span style="font-size:11px;color:#8e8e93">${t.from}→${t.to||'?'}${days?` (${days}d)`:''}</span>`:''}</div><button onclick="deleteTrip(${t.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div>`}).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No trips.</p>'}
    function deleteTrip(id){const d=getTravelData();d.trips=d.trips.filter(x=>x.id!==id);saveTravelData(d);renderTrips()}
    function addPackingItem(){const name=document.getElementById('packItemInput').value.trim();const cat=document.getElementById('packCatInput').value;if(!name)return showToast('Enter item!','error');const d=getTravelData();d.packing.unshift({id:Date.now(),name,cat,packed:false});saveTravelData(d);renderPackingList();document.getElementById('packItemInput').value=''}
    function renderPackingList(){const c=document.getElementById('packingList');if(!c)return;const d=getTravelData();const done=d.packing.filter(x=>x.packed).length;c.innerHTML=`<p style="font-size:12px;color:#8e8e93;margin:0 0 10px">✅ ${done}/${d.packing.length} packed</p>`+d.packing.map(item=>`<div class="packing-item"><input type="checkbox" ${item.packed?'checked':''} onchange="togglePackItem(${item.id})" style="width:18px;height:18px;margin:0;flex-shrink:0"><span style="flex:1;font-size:13px;${item.packed?'text-decoration:line-through;opacity:0.5':''}">${item.name}</span><span style="font-size:10px;color:#8e8e93">${item.cat.split(' ')[0]}</span><button onclick="deletePackItem(${item.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:14px">✖</button></div>`).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">Empty.</p>'}
    function togglePackItem(id){const d=getTravelData();const i=d.packing.find(x=>x.id===id);if(i)i.packed=!i.packed;saveTravelData(d);renderPackingList()}
    function deletePackItem(id){const d=getTravelData();d.packing=d.packing.filter(x=>x.id!==id);saveTravelData(d);renderPackingList()}

    // ATTENDANCE
    function getAttData(){return safeStorage('attData',{"subjects":[]})}    function saveAttData(d){localStorage.setItem('attData',JSON.stringify(d));syncToCloud()}
    function openAttendanceModal(){renderAttSubjectList();openModal('attendanceModal')}
    function addAttSubject(){const name=document.getElementById('attSubjectInput').value.trim();if(!name)return showToast('Enter subject!','error');const d=getAttData();d.subjects.unshift({id:Date.now(),name,log:{}});saveAttData(d);renderAttSubjectList();document.getElementById('attSubjectInput').value='';showToast('Subject added!','success')}
    function renderAttSubjectList(){const c=document.getElementById('attSubjectList');if(!c)return;const d=getAttData();const ts=getTodayStr();c.innerHTML=d.subjects.map(s=>{const total=Object.keys(s.log).filter(k=>s.log[k]).length;const present=Object.values(s.log).filter(v=>v==='P').length;const pct=total>0?Math.round((present/total)*100):0;const tv=s.log[ts]||'';return`<div style="background:#f2f2f7;border-radius:14px;padding:12px;margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div><b style="font-size:14px">${s.name}</b><br><span style="font-size:11px;color:${pct>=75?'#34c759':'#ff3b30'};font-weight:700">${pct}% (${present}/${total})</span></div><button onclick="deleteAttSubject(${s.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px"><button onclick="markAtt(${s.id},'${ts}','P')" class="att-day ${tv==='P'?'att-present':'att-unmarked'}">✅ P</button><button onclick="markAtt(${s.id},'${ts}','A')" class="att-day ${tv==='A'?'att-absent':'att-unmarked'}">❌ A</button><button onclick="markAtt(${s.id},'${ts}','H')" class="att-day ${tv==='H'?'att-holiday':'att-unmarked'}">🏖️ H</button></div><div class="project-progress-track"><div class="project-progress-fill" style="width:${pct}%;background:${pct>=75?'#34c759':'#ff3b30'}"></div></div></div>`}).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No subjects.</p>'}
    function markAtt(subId,dateStr,status){const d=getAttData();const s=d.subjects.find(x=>x.id===subId);if(s)s.log[dateStr]=(s.log[dateStr]===status?'':status);saveAttData(d);renderAttSubjectList()}
    function deleteAttSubject(id){const d=getAttData();d.subjects=d.subjects.filter(x=>x.id!==id);saveAttData(d);renderAttSubjectList()}

    // LIFE EVENTS
    function getLifeEvents(){return safeStorage('lifeEvents', [])}
    function saveLifeEvents(d){localStorage.setItem('lifeEvents',JSON.stringify(d));syncToCloud()}
    function openLifeEventsModal(){renderLifeEvents();openModal('lifeEventsModal')}
    function addLifeEvent(){const name=document.getElementById('lifeEventNameInput').value.trim();const date=document.getElementById('lifeEventDateInput').value;const emoji=document.getElementById('lifeEventEmojiInput').value.trim()||'⭐';const color=document.getElementById('lifeEventColorInput').value;if(!name||!date)return showToast('Enter name & date!','error');const events=getLifeEvents();events.push({id:Date.now(),name,date,emoji,color});events.sort((a,b)=>b.date.localeCompare(a.date));saveLifeEvents(events);document.getElementById('lifeEventNameInput').value='';document.getElementById('lifeEventEmojiInput').value='';renderLifeEvents();showToast('Life event added! 🌟','success')}
    function renderLifeEvents(){const c=document.getElementById('lifeEventsContainer');if(!c)return;const events=getLifeEvents();if(!events.length){c.innerHTML='<p style="text-align:center;color:#8e8e93;font-size:13px;padding:20px">No events yet. Add your milestones! 🌟</p>';return}c.innerHTML=events.map(e=>{const dt=new Date(e.date+'T00:00:00');const da=Math.floor((new Date()-dt)/86400000);const label=da===0?'Today!':da>0?`${da} days ago`:`in ${Math.abs(da)} days`;return`<div class="life-event-item"><div class="life-event-dot" style="background:${e.color}"></div><div style="flex:1"><div style="font-size:15px;font-weight:700">${e.emoji} ${e.name}</div><div style="font-size:11px;color:#8e8e93;margin-top:2px">📅 ${dt.toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}·${label}</div></div><button onclick="deleteLifeEvent(${e.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div>`}).join('')}
    function deleteLifeEvent(id){saveLifeEvents(getLifeEvents().filter(x=>x.id!==id));renderLifeEvents()}

    // SUBSCRIPTIONS
    function getSubs(){return safeStorage('subscriptions', [])}
    function saveSubs(d){localStorage.setItem('subscriptions',JSON.stringify(d));syncToCloud()}
    function openSubModal(){renderSubSummary();renderSubList();openModal('subModal')}
    function addSubscription(){const name=document.getElementById('subNameInput').value.trim();const amt=Number(document.getElementById('subAmtInput').value);const renew=document.getElementById('subRenewInput').value;const freq=document.getElementById('subFreqInput').value;if(!name||!amt)return showToast('Enter name & amount!','error');const subs=getSubs();subs.unshift({id:Date.now(),name,amount:amt,renew,freq});saveSubs(subs);renderSubSummary();renderSubList();document.getElementById('subNameInput').value='';document.getElementById('subAmtInput').value='';showToast('Subscription added!','success')}
    function renderSubSummary(){const el=document.getElementById('subSummary');if(!el)return;const subs=getSubs();const m=subs.reduce((s,x)=>s+(x.freq==='yearly'?x.amount/12:x.freq==='weekly'?x.amount*4.33:x.amount),0);el.innerHTML=`<p style="margin:0;font-size:13px;font-weight:700">Monthly:<span style="color:var(--primary)"> ₹${m.toFixed(0)}</span> &nbsp; Yearly:<span style="color:#ff3b30"> ₹${(m*12).toFixed(0)}</span></p>`}
    function renderSubList(){const c=document.getElementById('subList');if(!c)return;const subs=getSubs();const today=getTodayStr();c.innerHTML=subs.map(s=>{const dl=s.renew?Math.ceil((new Date(s.renew)-new Date(today))/86400000):null;const col=dl!==null&&dl<=3?'#ff3b30':dl!==null&&dl<=7?'#ff9500':'#8e8e93';return`<div class="sub-item"><div><b style="font-size:13px">${s.name}</b><br><span style="font-size:11px;color:${col}">${s.renew?`Renews:${s.renew}${dl!==null?` · ${dl<0?'⚠️Overdue':dl+'d'}`:''}`:'No date'}</span></div><div style="display:flex;align-items:center;gap:8px"><span style="font-weight:700;font-size:13px">₹${s.amount}/${s.freq==='monthly'?'mo':s.freq==='yearly'?'yr':'wk'}</span><button onclick="deleteSub(${s.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`}).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No subscriptions.</p>'}
    function deleteSub(id){saveSubs(getSubs().filter(x=>x.id!==id));renderSubSummary();renderSubList()}

    // SECRET SPACE
    function openSecretModal(){document.getElementById('secretLockScreen').style.display='block';document.getElementById('secretUnlocked').style.display='none';document.getElementById('secretPinInput').value='';openModal('secretModal')}
    async function unlockSecret(){
        const entered=document.getElementById('secretPinInput').value;
        const stored=localStorage.getItem('secretPinHash');
        if(!stored){showToast('Set a PIN first!','error');return}
        const hash=await sha256(entered);
        if(hash===stored){
            document.getElementById('secretLockScreen').style.display='none';
            document.getElementById('secretUnlocked').style.display='block';
            document.getElementById('secretNoteInput').value=localStorage.getItem('secretNote')||'';
        }else{
            showToast('Wrong PIN!','error');
            document.getElementById('secretPinInput').value='';
            hapticFeedback('medium');
        }
    }
    async function setupSecretPin(){
        const pin=prompt('Enter a new 4-digit PIN:');
        if(!pin)return;
        if(!/^\d{4}$/.test(pin)){showToast('Use exactly 4 digits!','error');return}
        const hash=await sha256(pin);
        localStorage.setItem('secretPinHash',hash);
        localStorage.removeItem('secretPin'); // remove old unhashed PIN if exists
        showToast('PIN set securely!','success');
    }
    function saveSecretNote(){localStorage.setItem('secretNote',document.getElementById('secretNoteInput').value);showToast('Saved 🔒','success');lockSecret()}
    function lockSecret(){document.getElementById('secretLockScreen').style.display='block';document.getElementById('secretUnlocked').style.display='none';document.getElementById('secretNoteInput').value='';document.getElementById('secretPinInput').value=''}

    // WEATHER
    function openWeatherModal(){document.getElementById('weatherApiKeyInput').value=localStorage.getItem('weatherApiKey')||'';document.getElementById('weatherCityInput').value=localStorage.getItem('weatherCity')||'';openModal('weatherModal')}
    function saveWeatherKey(){localStorage.setItem('weatherApiKey',document.getElementById('weatherApiKeyInput').value.trim());showToast('API Key saved! 🌤️','success')}
    async function fetchWeather(){const city=document.getElementById('weatherCityInput').value.trim();const apiKey=document.getElementById('weatherApiKeyInput').value.trim()||localStorage.getItem('weatherApiKey');if(!city)return showToast('Enter city!','error');if(!apiKey)return showToast('Add free API Key from openweathermap.org!','error');localStorage.setItem('weatherCity',city);const re=document.getElementById('weatherResult');re.innerHTML='<p style="color:#8e8e93;font-size:13px">Loading... ⏳</p>';try{const res=await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`);const data=await res.json();if(data.cod!==200){re.innerHTML=`<p style="color:#ff3b30;font-size:13px">⚠️ ${data.message}</p>`;return}re.innerHTML=`<div class="weather-widget" style="text-align:left"><div style="display:flex;align-items:center;gap:12px"><img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" style="width:60px;height:60px"><div><div style="font-size:22px;font-weight:800">${Math.round(data.main.temp)}°C</div><div style="font-size:14px;opacity:0.9">${data.weather[0].description}</div><div style="font-size:12px;opacity:0.8">📍 ${data.name},${data.sys.country}</div></div></div><div style="display:flex;gap:15px;margin-top:12px;font-size:12px;opacity:0.9"><span>💧${data.main.humidity}%</span><span>🌬️${Math.round(data.wind.speed)}m/s</span><span>🌡️Feels ${Math.round(data.main.feels_like)}°C</span></div></div>`}catch(e){re.innerHTML='<p style="color:#ff3b30;font-size:13px">⚠️ Error. Check internet.</p>'}}


    // ============================================================
    // BACKUP & RESTORE
    // ============================================================
    function exportAllData() {
        const keys = ['reminders','habits','finData','moodLog','sleepLog','projects','shiftConfig','studentData','journalEntries','medicines','vehicleReminders','vehicleLogs','warranties','shopData','travelData','attData','lifeEvents','subscriptions','birthdays','homeManagement','quickNotes','pomodoroHistory','savingsGoals','recurringExps','taskDeps','appTheme','appFontSize','darkMode','geminiKey','pushNotif','webhookUrl','gcalClientId','activeWorkspace'];
        const backup = { version:'2.0', exportedAt:new Date().toISOString() };
        keys.forEach(k => { const v = localStorage.getItem(k); if(v) backup[k] = v; });
        const blob = new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `MasterApp_Backup_${getTodayStr()}.json`; a.click();
        URL.revokeObjectURL(url);
        hapticFeedback('success'); showToast('📦 Backup exported!', 'success');
    }

    function restoreAllData(event) {
        const file = event.target.files[0]; if(!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const backup = JSON.parse(e.target.result);
                if(!backup.version) return showToast('Invalid backup file!', 'error');
                const skip = ['version','exportedAt'];
                Object.entries(backup).forEach(([k,v]) => { if(!skip.includes(k)) localStorage.setItem(k, v); });
                showToast('✅ Restore successful! Reloading...', 'success');
                setTimeout(() => location.reload(), 1500);
            } catch(err) { showToast('Error reading backup!', 'error'); }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    // ============================================================
    // HAPTIC FEEDBACK
    // ============================================================
    function hapticFeedback(type='light') {
        if(!navigator.vibrate || localStorage.getItem('haptic') !== 'true') return;
        const patterns = { light:[20], medium:[40], success:[20,50,20], error:[100,50,100] };
        navigator.vibrate(patterns[type] || [20]);
    }

    // ============================================================
    // PWA INSTALL
    // ============================================================
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault(); deferredPrompt = e;
        setTimeout(() => { const b = document.getElementById('pwaBanner'); if(b) b.style.display='flex'; }, 3000);
    });
    function installPWA() {
        document.getElementById('pwaBanner').style.display='none';
        if(deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then(() => { deferredPrompt = null; }); }
    }

    // ============================================================
    // DARK AUTO SCHEDULE
    // ============================================================
    function saveAutoDarkSettings() {
        const enabled = document.getElementById('autoDarkToggle').checked;
        const from = document.getElementById('autoDarkFrom').value;
        const to = document.getElementById('autoDarkTo').value;
        localStorage.setItem('autoDark', JSON.stringify({enabled,from,to}));
        document.getElementById('autoDarkTimesWrap').style.display = enabled ? 'block' : 'none';
        checkAutoDark();
        showToast(enabled ? '🌙 Auto dark mode ON' : 'Auto dark OFF', 'info');
    }

    function checkAutoDark() {
        const cfg = safeStorage('autoDark', null);
        if(!cfg || !cfg.enabled) return;
        const now = new Date();
        const cur = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        const isDark = (cfg.from < cfg.to) ? (cur >= cfg.from && cur < cfg.to) : (cur >= cfg.from || cur < cfg.to);
        const body = document.body;
        const toggle = document.getElementById('darkModeToggle');
        if(isDark && !body.classList.contains('dark-mode')) { body.classList.add('dark-mode'); if(toggle) toggle.checked=true; localStorage.setItem('darkMode','true'); }
        else if(!isDark && body.classList.contains('dark-mode')) { body.classList.remove('dark-mode'); if(toggle) toggle.checked=false; localStorage.setItem('darkMode','false'); }
    }
    setInterval(checkAutoDark, 60000);

    // ============================================================
    // WIDGET CUSTOMIZATION
    // ============================================================
    function toggleWidget(name, show) {
        const map = { mood:'todayMoodSection', sleep:'todaySleepSection', shift:'todayShiftCard', aitip:'aiTipContainer' };
        const el = document.getElementById(map[name]);
        if(el) el.style.display = show ? '' : 'none';
        const prefs = safeStorage('widgetPrefs', {});
        prefs[name] = show; localStorage.setItem('widgetPrefs', JSON.stringify(prefs));
        syncToCloud();
    }

    function applyWidgetPrefs() {
        const prefs = safeStorage('widgetPrefs', {"mood":true,"sleep":true,"shift":true,"aitip":true});
        Object.entries(prefs).forEach(([k,v]) => {
            toggleWidget(k, v);
            const chk = document.getElementById('w-'+k);
            if(chk) chk.checked = v;
        });
    }

    // ============================================================
    // BIRTHDAY TRACKER
    // ============================================================
    function getBirthdays() { return safeStorage('birthdays', []); }
    function saveBirthdays(d) { localStorage.setItem('birthdays', JSON.stringify(d)); syncToCloud(); }
    function openBirthdayModal() { renderBirthdayList(); openModal('birthdayModal'); }

    function addBirthday() {
        const name = document.getElementById('bdayNameInput').value.trim();
        const date = document.getElementById('bdayDateInput').value;
        const rel = document.getElementById('bdayRelInput').value;
        const emoji = document.getElementById('bdayEmojiInput').value.trim() || '🎂';
        if(!name || !date) return showToast('Enter name & birthday!', 'error');
        const bdays = getBirthdays();
        bdays.push({id:Date.now(), name, date, rel, emoji});
        saveBirthdays(bdays);
        document.getElementById('bdayNameInput').value = '';
        document.getElementById('bdayEmojiInput').value = '';
        renderBirthdayList();
        createBirthdayReminders();
        hapticFeedback('success');
        showToast('🎂 Birthday added!', 'success');
    }

    function renderBirthdayList() {
        const c = document.getElementById('birthdayList'); if(!c) return;
        const bdays = getBirthdays();
        const now = new Date(); const thisYear = now.getFullYear();
        const sorted = bdays.map(b => {
            const [_,mm,dd] = b.date.split('-');
            const next = new Date(`${thisYear}-${mm}-${dd}`);
            if(next < now) next.setFullYear(thisYear+1);
            const days = Math.ceil((next - now) / 86400000);
            return {...b, days, next};
        }).sort((a,b) => a.days - b.days);
        c.innerHTML = sorted.map(b => {
            const isSoon = b.days <= 7;
            return `<div class="bday-item ${isSoon ? 'bday-soon' : ''}">
                <div><b style="font-size:13px">${b.emoji} ${b.name}</b><br>
                    <span style="font-size:11px;color:#8e8e93">${b.rel} · 📅 ${b.date.slice(5)} · ${b.days===0?'🎉 Today!':b.days===1?'Tomorrow!':b.days+' days'}</span>
                </div>
                <button onclick="deleteBirthday(${b.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button>
            </div>`;
        }).join('') || '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No birthdays added.</p>';
    }

    function deleteBirthday(id) { saveBirthdays(getBirthdays().filter(x=>x.id!==id)); renderBirthdayList(); }

    function createBirthdayReminders() {
        const bdays = getBirthdays();
        const now = new Date(); const thisYear = now.getFullYear();
        let reminders = safeStorage('reminders', []);
        reminders = reminders.filter(r => r.tags !== 'birthday');
        bdays.forEach(b => {
            const [_,mm,dd] = b.date.split('-');
            let next = new Date(`${thisYear}-${mm}-${dd}T09:00`);
            if(next < now) next = new Date(`${thisYear+1}-${mm}-${dd}T09:00`);
            const pad = n => String(n).padStart(2,'0');
            const timeStr = `${next.getFullYear()}-${pad(next.getMonth()+1)}-${pad(next.getDate())}T09:00`;
            reminders.push({id:Date.now()+Math.random(), task:`🎂 ${b.name}'s Birthday!`, notes:`${b.rel} birthday`, time:timeStr, priority:'high', repeat:'yearly', status:'pending', notified:false, pinned:false, tags:'birthday', preAlarm:1440, category:{name:'Birthday',icon:'🎂'}});
        });
        localStorage.setItem('reminders', JSON.stringify(reminders));
        loadReminders(); syncToCloud();
    }

    // ============================================================
    // HOME MANAGEMENT
    // ============================================================
    function getChores() { return safeStorage('homeManagement', []); }
    function saveChores(d) { localStorage.setItem('homeManagement', JSON.stringify(d)); syncToCloud(); }
    function openHomeManagementModal() { renderChoreList('all'); openModal('homeManagementModal'); }

    function addChore() {
        const name = document.getElementById('choreNameInput').value.trim();
        const freq = document.getElementById('choreFreqInput').value;
        const area = document.getElementById('choreAreaInput').value;
        if(!name) return showToast('Enter task name!', 'error');
        const chores = getChores();
        chores.unshift({id:Date.now(), name, freq, area, done:false, lastDone:null});
        saveChores(chores); renderChoreList(currentChoreFilter || 'all');
        document.getElementById('choreNameInput').value = '';
        hapticFeedback('success'); showToast('Chore added! 🏠', 'success');
    }

    let currentChoreFilter = 'all';
    function filterChores(filter) {
        currentChoreFilter = filter;
        document.querySelectorAll('[id^="choreTab-"]').forEach(b => b.classList.remove('active'));
        document.getElementById('choreTab-'+filter).classList.add('active');
        renderChoreList(filter);
    }

    function renderChoreList(filter) {
        const c = document.getElementById('choreList'); if(!c) return;
        const chores = getChores();
        const freqColors = {daily:'#34c759', weekly:'#007aff', monthly:'#ff9500', once:'#5e5ce6'};
        const filtered = filter === 'all' ? chores : chores.filter(ch => ch.freq === filter);
        c.innerHTML = filtered.map(ch => `
            <div class="chore-item ${ch.done ? 'done' : ''}">
                <input type="checkbox" ${ch.done?'checked':''} onchange="toggleChore(${ch.id})" style="width:18px;height:18px;margin:0;flex-shrink:0;">
                <div style="flex:1;">
                    <span>${ch.area.split(' ')[0]} <b>${ch.name}</b></span>
                    ${ch.lastDone?`<br><span style="font-size:10px;color:#8e8e93">Last: ${ch.lastDone}</span>`:''}
                </div>
                <span class="chore-freq-badge" style="background:${freqColors[ch.freq]}">${ch.freq}</span>
                <button onclick="deleteChore(${ch.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:14px;">✖</button>
            </div>`).join('') || '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No tasks in this category.</p>';
    }

    function toggleChore(id) {
        const chores = getChores(); const ch = chores.find(x => x.id === id);
        if(ch) { ch.done = !ch.done; ch.lastDone = ch.done ? getTodayStr() : ch.lastDone; }
        saveChores(chores); renderChoreList(currentChoreFilter || 'all');
        hapticFeedback('light');
    }

    function deleteChore(id) { saveChores(getChores().filter(x=>x.id!==id)); renderChoreList(currentChoreFilter||'all'); }

    // ============================================================
    // QUICK NOTES
    // ============================================================
    function getQuickNotes() { return safeStorage('quickNotes', []); }
    function saveQuickNotes(d) { localStorage.setItem('quickNotes', JSON.stringify(d)); syncToCloud(); }
    function openQuickNotesModal() { renderQuickNotes(); openModal('quickNotesModal'); }

    function addQuickNote() {
        const text = document.getElementById('quickNoteInput').value.trim();
        const color = document.getElementById('quickNoteColor').value;
        if(!text) return showToast('Type a note!', 'error');
        const notes = getQuickNotes();
        notes.unshift({id:Date.now(), text, color, pinned:false, created:new Date().toISOString()});
        saveQuickNotes(notes); renderQuickNotes();
        document.getElementById('quickNoteInput').value = '';
        hapticFeedback('success');
    }

    function renderQuickNotes() {
        const c = document.getElementById('quickNotesList'); if(!c) return;
        const search = (document.getElementById('noteSearchInput')?.value || '').toLowerCase();
        const notes = getQuickNotes().filter(n => !search || n.text.toLowerCase().includes(search));
        if(!notes.length) { c.innerHTML='<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No notes yet. Add one! 📝</p>'; return; }
        c.innerHTML = notes.map(n => `
            <div class="qnote-card ${n.pinned?'qnote-pinned':''}" style="background:${n.color||'#fffde7'};">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <p style="margin:0;font-size:13px;line-height:1.5;flex:1;">${n.text}</p>
                    <div style="display:flex;gap:4px;margin-left:8px;flex-shrink:0;">
                        <button onclick="pinNote(${n.id})" style="background:none;border:none;cursor:pointer;font-size:15px;">${n.pinned?'📌':'📍'}</button>
                        <button onclick="deleteNote(${n.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px;">✖</button>
                    </div>
                </div>
                <p style="margin:6px 0 0;font-size:10px;color:#8e8e93;">${new Date(n.created).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
            </div>`).join('');
    }

    function pinNote(id) { const n=getQuickNotes(); const x=n.find(x=>x.id===id); if(x) x.pinned=!x.pinned; n.sort((a,b)=>b.pinned-a.pinned); saveQuickNotes(n); renderQuickNotes(); }
    function deleteNote(id) { saveQuickNotes(getQuickNotes().filter(x=>x.id!==id)); renderQuickNotes(); }

    // ============================================================
    // POMODORO HISTORY
    // ============================================================
    function getPomoHistory() { return safeStorage('pomodoroHistory', []); }
    function logPomoSession(taskName, mins) {
        const hist = getPomoHistory();
        hist.unshift({id:Date.now(), task:taskName||'Focus Session', mins, date:getTodayStr(), time:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})});
        localStorage.setItem('pomodoroHistory', JSON.stringify(hist.slice(0,100)));
        syncToCloud();
    }

    function openPomoHistoryModal() { renderPomoHistory(); openModal('pomoHistoryModal'); }

    function renderPomoHistory() {
        const hist = getPomoHistory();
        const sumEl = document.getElementById('pomoHistSummary');
        const listEl = document.getElementById('pomoHistList');
        if(!sumEl || !listEl) return;
        const totalSessions = hist.length;
        const totalMins = hist.reduce((s,h)=>s+h.mins,0);
        const todaySessions = hist.filter(h=>h.date===getTodayStr()).length;
        sumEl.innerHTML = `
            <div style="background:#e5f1ff;border-radius:12px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:800;color:var(--primary)">${totalSessions}</div><div style="font-size:11px;color:#8e8e93;font-weight:600">Total Sessions</div></div>
            <div style="background:#e5f9e9;border-radius:12px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:800;color:#34c759">${Math.round(totalMins/60)}h</div><div style="font-size:11px;color:#8e8e93;font-weight:600">Total Focus</div></div>
            <div style="background:#fff8e8;border-radius:12px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:800;color:#ff9500">${todaySessions}</div><div style="font-size:11px;color:#8e8e93;font-weight:600">Today</div></div>`;
        listEl.innerHTML = hist.slice(0,30).map(h=>`
            <div class="pomo-hist-item">
                <div><b>${h.task}</b><br><span style="color:#8e8e93">${h.date} · ${h.time}</span></div>
                <span style="font-weight:700;color:#ff3b30">${h.mins}m 🍅</span>
            </div>`).join('') || '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No sessions yet. Start a Pomodoro!</p>';
    }

    // ============================================================
    // QR CODE SHARE
    // ============================================================
    let qrInstance = null;
    function openQRModal() {
        const sel = document.getElementById('qrTaskSelect');
        const reminders = safeStorage('reminders', []);
        const active = reminders.filter(r=>r.status!=='completed'&&!r.archived).slice(0,30);
        sel.innerHTML = '<option value="">-- Select Task to Share --</option>' + active.map(r=>`<option value="${r.id}">${r.task}</option>`).join('');
        openModal('qrModal');
    }

    function generateQR() {
        const sel = document.getElementById('qrTaskSelect');
        const id = Number(sel.value);
        const display = document.getElementById('qrCodeDisplay');
        const textEl = document.getElementById('qrTaskText');
        if(!id) { display.innerHTML=''; if(textEl) textEl.innerText=''; return; }
        const reminders = safeStorage('reminders', []);
        const task = reminders.find(r=>r.id===id);
        if(!task) return;
        const payload = JSON.stringify({task:task.task, time:task.time, priority:task.priority, notes:(task.notes||'').replace(/<[^>]*>/g,'').slice(0,100)});
        display.innerHTML = '';
        try {
            qrInstance = new QRCode(display, {text:payload, width:200, height:200, colorDark:'#1c1c1e', colorLight:'#ffffff', correctLevel:QRCode.CorrectLevel.M});
            if(textEl) textEl.innerText = task.task + (task.time ? ' · ' + new Date(task.time).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '');
        } catch(e) { display.innerHTML='<p style="color:#ff3b30">QR library not loaded. Check internet.</p>'; }
    }

    function downloadQR() {
        const canvas = document.querySelector('#qrCodeDisplay canvas');
        if(!canvas) return showToast('Generate QR first!', 'error');
        const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = 'task-qr.png'; a.click();
        showToast('QR downloaded! 📱', 'success');
    }

    // ============================================================
    // FINANCE CHARTS
    // ============================================================
    let expPieChart = null, incExpChart = null;
    function openFinanceChartsModal() {
        openModal('financeChartsModal');
        setTimeout(renderFinanceCharts, 200);
    }

    function renderFinanceCharts() {
        const d = getFinData();
        const catTotals = {};
        d.expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category]||0) + Number(e.amount); });
        const pieCtx = document.getElementById('expensePieChart')?.getContext('2d');
        if(pieCtx) {
            if(expPieChart) expPieChart.destroy();
            const cats = Object.keys(catTotals);
            const colors = ['#ff3b30','#ff9500','#ffcc00','#34c759','#5ac8fa','#007aff','#5e5ce6','#af52de','#ff2d55'];
            expPieChart = new Chart(pieCtx, { type:'doughnut', data:{labels:cats, datasets:[{data:cats.map(c=>catTotals[c]), backgroundColor:colors.slice(0,cats.length), borderWidth:0}]}, options:{plugins:{legend:{position:'right',labels:{font:{size:11}}}},cutout:'60%'} });
        }
        const now = new Date();
        const months = []; const incData = []; const expData = [];
        for(let i=5;i>=0;i--) {
            const d2 = new Date(now.getFullYear(), now.getMonth()-i, 1);
            const ms = `${d2.getFullYear()}-${String(d2.getMonth()+1).padStart(2,'0')}`;
            months.push(ms.slice(5));
            incData.push(d.income.filter(e=>e.date?.startsWith(ms)).reduce((s,e)=>s+Number(e.amount),0));
            expData.push(d.expenses.filter(e=>e.date?.startsWith(ms)).reduce((s,e)=>s+Number(e.amount),0));
        }
        const barCtx = document.getElementById('incomeExpenseChart')?.getContext('2d');
        if(barCtx) {
            if(incExpChart) incExpChart.destroy();
            incExpChart = new Chart(barCtx, { type:'bar', data:{labels:months, datasets:[{label:'Income',data:incData,backgroundColor:'#34c759',borderRadius:6},{label:'Expense',data:expData,backgroundColor:'#ff3b30',borderRadius:6}]}, options:{scales:{y:{beginAtZero:true}},plugins:{legend:{labels:{font:{size:11}}}}} });
        }
        const el = document.getElementById('finInsightsAI');
        if(el) {
            const total = d.expenses.reduce((s,e)=>s+Number(e.amount),0);
            const topCat = Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];
            el.innerHTML = `<b>💡 Quick Insights</b><br>Total expenses: ₹${total.toLocaleString('en-IN')}<br>${topCat?`Top category: ${topCat[0]} (₹${topCat[1].toLocaleString('en-IN')})`:''}`;
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
            if(el) el.innerHTML = reply.replace(/\n/g,'<br>');
            const card = document.getElementById('aiCoachCard');
            if(card) card.innerHTML = `<p style="margin:0;font-size:13px;opacity:0.9">Last coaching: ${new Date().toLocaleString('en-IN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'})}</p>`;
        } catch(e) {
            if(el) el.innerHTML = e.message==='NO_KEY' ? '<p>⚠️ Add Gemini API Key in Settings → Save to use AI Coach!</p>' : '<p>⚠️ Error: '+e.message+'</p>';
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
                    document.getElementById('taskInput').value = parsed.task;
                    if(parsed.priority) document.getElementById('priorityInput').value = parsed.priority;
                    if(parsed.time) document.getElementById('timeInput').value = parsed.time;
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


    // ============================================================
    // OFFLINE BANNER
    // ============================================================
    window.addEventListener('offline', () => {
        const b = document.getElementById('offlineBanner');
        if(b) b.classList.add('show');
    });
    window.addEventListener('online', () => {
        const b = document.getElementById('offlineBanner');
        if(b) b.classList.remove('show');
        showToast('✅ Back online! Syncing...', 'success');
        syncToCloud();
    });

    // ============================================================
    // POMODORO AUTO-LOG (patch existing pomo complete)
    // ============================================================
    const _origStartPomo = typeof startPomo !== 'undefined' ? startPomo : null;
    function patchPomoComplete() {
        const origReset = window.resetPomo;
        const origStart = window.startPomo;
        if(!origStart) return;
        window.startPomo = function() {
            origStart();
            const sel = document.getElementById('pomoTaskSelect');
            const mins = parseInt(document.getElementById('pomoTimeSelect')?.value || 1500) / 60;
            const task = sel?.options[sel.selectedIndex]?.text || 'Focus Session';
            window._pomoTask = task;
            window._pomoMins = mins;
        };
    }
    function completePomoSession() {
        const task = window._pomoTask || 'Focus Session';
        const mins = window._pomoMins || 25;
        logPomoSession(task, Math.round(mins));
        hapticFeedback('success');
        showToast(`🍅 Session logged: ${Math.round(mins)} min!`, 'success');
    }

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
    function exportToCSV() {
        const reminders = safeStorage('reminders', []);
        const finData = getFinData();
        const NL = '\r\n';
        let csv = 'Type,Name,Category,Amount/Priority,Date,Status' + NL;
        reminders.forEach(r => { csv += ['Task', '"'+(r.task||'').replace(/"/g,'""')+'"', '"'+(r.category?.name||'')+'"', r.priority, r.time?.slice(0,10)||'', r.status].join(',') + NL; });
        finData.expenses.forEach(e => { csv += ['Expense', '"'+(e.name||'').replace(/"/g,'""')+'"', '"'+(e.category||'')+'"', e.amount, e.date, 'expense'].join(',') + NL; });
        finData.income.forEach(e => { csv += ['Income', '"'+(e.name||'').replace(/"/g,'""')+'"', '"'+(e.category||'')+'"', e.amount, e.date, 'income'].join(',') + NL; });
        finData.bills.forEach(b => { csv += ['Bill', '"'+(b.name||'').replace(/"/g,'""')+'"', '"'+(b.type||'')+'"', b.amount||0, b.due, b.paid?'paid':'unpaid'].join(',') + NL; });
        const blob = new Blob([csv], {type:'text/csv'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href=url; a.download=`MasterApp_${getTodayStr()}.csv`; a.click();
        URL.revokeObjectURL(url);
        hapticFeedback('success'); showToast('📊 CSV exported!', 'success');
    }

    // ============================================================
    // AUTOMATION SYSTEM
    // ============================================================
    const QUICK_RULES = [
        { id:'r1', trigger:'overdue', action:'notify', label:'Overdue Tasks → Notification', icon:'⏰' },
        { id:'r2', trigger:'budget_exceeded', action:'notify', label:'Budget Exceeded → Alert', icon:'💰' },
        { id:'r3', trigger:'habit_missed', action:'notify', label:'Habit Missed 2d → Reminder', icon:'🔥' },
        { id:'r4', trigger:'bill_due', action:'notify', label:'Bill Due Soon → Reminder', icon:'🧾' },
        { id:'r5', trigger:'birthday_soon', action:'notify', label:'Birthday in 3 days → Alert', icon:'🎂' },
    ];

    function openAutomationModal() {
        renderAutomationQuickRules();
        renderCustomRulesList();
        openModal('automationModal');
    }

    function renderAutomationQuickRules() {
        const el = document.getElementById('automationQuickRules'); if(!el) return;
        const enabled = safeStorage("enabledRules", ["r1","r2","r3","r4","r5"]);
        el.innerHTML = QUICK_RULES.map(r => `
            <div class="auto-rule-item">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:13px;">${r.icon} ${r.label}</span>
                    <input type="checkbox" ${enabled.includes(r.id)?'checked':''} onchange="toggleQuickRule('${r.id}',this.checked)" style="width:20px;height:20px;margin:0;">
                </div>
            </div>`).join('');
    }

    function toggleQuickRule(id, on) {
        let enabled = safeStorage("enabledRules", ["r1","r2","r3","r4","r5"]);
        if(on) { if(!enabled.includes(id)) enabled.push(id); }
        else enabled = enabled.filter(x => x !== id);
        localStorage.setItem('enabledRules', JSON.stringify(enabled));
        showToast(on ? 'Rule enabled ✅' : 'Rule disabled', 'info');
    }

    function addAutomationRule() {
        const trigger = document.getElementById('autoTriggerInput').value;
        const action = document.getElementById('autoActionInput').value;
        const rules = safeStorage('customRules', []);
        rules.unshift({ id:Date.now(), trigger, action });
        localStorage.setItem('customRules', JSON.stringify(rules));
        renderCustomRulesList();
        showToast('Automation rule added! ⚙️', 'success');
    }

    function renderCustomRulesList() {
        const el = document.getElementById('customRulesList'); if(!el) return;
        const rules = safeStorage('customRules', []);
        const trigLabels = { overdue:'Task Overdue', budget_exceeded:'Budget Exceeded', habit_missed:'Habit Missed 2d', bill_due:'Bill Due 3d', birthday_soon:'Birthday 3d' };
        const actLabels = { notify:'Notify', reschedule:'Auto-Reschedule', pin:'Pin Task', ai_suggest:'AI Suggest' };
        if(!rules.length) { el.innerHTML='<p style="text-align:center;color:#8e8e93;font-size:13px;padding:10px">No custom rules yet.</p>'; return; }
        el.innerHTML = rules.map(r => `
            <div class="auto-rule-item">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:12px;">IF <b>${trigLabels[r.trigger]||r.trigger}</b> → <b>${actLabels[r.action]||r.action}</b></span>
                    <button onclick="deleteCustomRule(${r.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px;">✖</button>
                </div>
            </div>`).join('');
    }

    function deleteCustomRule(id) {
        const rules = safeStorage('customRules', []).filter(r => r.id !== id);
        localStorage.setItem('customRules', JSON.stringify(rules));
        renderCustomRulesList();
    }

    async function runAutomations() {
        const enabled = safeStorage("enabledRules", ["r1","r2","r3","r4","r5"]);
        let actions = 0;
        const reminders = safeStorage('reminders', []);
        const finData = getFinData();
        const habits = safeStorage('habits', []);
        const bdays = getBirthdays();
        const today = new Date(); today.setHours(0,0,0,0);

        if(enabled.includes('r1')) {
            const overdue = reminders.filter(r => r.status!=='completed' && !r.archived && new Date(r.time) < new Date());
            if(overdue.length) { addNotifLog('Overdue Tasks', overdue.length + ' task(s) overdue', 'error'); actions++; }
        }
        if(enabled.includes('r2')) {
            const now = new Date(); const ms = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
            const spent = finData.expenses.filter(e=>e.date?.startsWith(ms)).reduce((s,e)=>s+Number(e.amount),0);
            const budget = finData.budgets.reduce((s,b)=>s+Number(b.limit),0);
            if(budget > 0 && spent > budget) { addNotifLog('Budget Exceeded', 'Over by Rs '+(spent-budget).toLocaleString('en-IN'), 'error'); actions++; }
        }
        if(enabled.includes('r3')) {
            habits.forEach(h => {
                if(h.streak === 0 || (h.lastCheckIn && Math.floor((Date.now()-new Date(h.lastCheckIn))/86400000) >= 2)) {
                    addNotifLog('Habit', h.name + ' streak broken! Restart today!', 'warning');
                    actions++;
                }
            });
        }
        if(enabled.includes('r4')) {
            finData.bills.filter(b => !b.paid).forEach(b => {
                const dl = Math.ceil((new Date(b.due)-today)/86400000);
                if(dl >= 0 && dl <= 3) { addNotifLog('Bill Due', b.name+' due in '+dl+'d (Rs '+(b.amount||'?')+')', 'warning'); actions++; }
            });
        }
        if(enabled.includes('r5')) {
            bdays.forEach(b => {
                const [_,mm,dd] = b.date.split('-'); const thisYear = today.getFullYear();
                let next = new Date(`${thisYear}-${mm}-${dd}`); if(next < today) next.setFullYear(thisYear+1);
                const dl = Math.ceil((next-today)/86400000);
                if(dl >= 0 && dl <= 3) { addNotifLog('Birthday', b.name+"'s birthday in "+dl+'d!', 'success'); actions++; }
            });
        }

        hapticFeedback(actions > 0 ? 'success' : 'light');
        showToast(actions > 0 ? `✅ ${actions} automation(s) fired!` : '✅ All clear — no triggers!', actions>0?'success':'info');
    }

    // ============================================================
    // NOTIFICATION CENTRE
    // ============================================================
    function getNotifLog() { return safeStorage('notifLog', []); }
    function addNotifLog(title, body, type='info') {
        const log = getNotifLog();
        log.unshift({id:Date.now(), title, body, type, time:new Date().toISOString(), read:false});
        localStorage.setItem('notifLog', JSON.stringify(log.slice(0,100)));
        showPushNotification(title, body);
    }

    function openNotifCentreModal() {
        renderNotifCentre();
        openModal('notifCentreModal');
    }

    function renderNotifCentre() {
        const log = getNotifLog();
        const unreadEl = document.getElementById('notifUnreadCount');
        const listEl = document.getElementById('notifCentreList');
        if(!listEl) return;
        const unread = log.filter(n => !n.read).length;
        if(unreadEl) unreadEl.innerText = `${unread} unread`;
        const colors = { error:'#ff3b30', warning:'#ff9500', success:'#34c759', info:'#007aff' };
        listEl.innerHTML = log.map(n => {
            const dt = new Date(n.time).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
            return `<div class="notif-item" onclick="markNotifRead(${n.id})" style="cursor:pointer;${n.read?'opacity:0.6':''}">
                <div class="notif-dot" style="background:${colors[n.type]||'#8e8e93'}"></div>
                <div style="flex:1;"><b style="font-size:13px">${n.title}</b><br><span style="color:#8e8e93">${n.body}</span></div>
                <span style="font-size:10px;color:#8e8e93;flex-shrink:0">${dt}</span>
            </div>`;
        }).join('') || '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:20px">No notifications yet.</p>';

        // Mark all as read
        const all = getNotifLog().map(n => ({...n, read:true}));
        localStorage.setItem('notifLog', JSON.stringify(all));
    }

    function markNotifRead(id) {
        const log = getNotifLog().map(n => n.id===id ? {...n,read:true} : n);
        localStorage.setItem('notifLog', JSON.stringify(log));
        renderNotifCentre();
    }

    function clearAllNotifs() {
        localStorage.setItem('notifLog', '[]');
        renderNotifCentre();
        showToast('Notifications cleared', 'info');
    }

    // ============================================================
    // SAVINGS GOAL
    // ============================================================
    function getSavingsGoals() { return safeStorage('savingsGoals', []); }
    function saveSavingsGoals(d) { localStorage.setItem('savingsGoals', JSON.stringify(d)); syncToCloud(); }
    function openSavingsGoalModal() { renderSavingsGoals(); openModal('savingsGoalModal'); }

    function addSavingsGoal() {
        const name = document.getElementById('goalNameInput').value.trim();
        const emoji = document.getElementById('goalEmojiInput').value.trim() || '🎯';
        const target = Number(document.getElementById('goalTargetInput').value);
        const saved = Number(document.getElementById('goalSavedInput').value) || 0;
        const deadline = document.getElementById('goalDeadlineInput').value;
        if(!name || !target) return showToast('Enter goal name & target!', 'error');
        const goals = getSavingsGoals();
        goals.unshift({id:Date.now(), name, emoji, target, saved, deadline});
        saveSavingsGoals(goals); renderSavingsGoals();
        document.getElementById('goalNameInput').value = '';
        document.getElementById('goalTargetInput').value = '';
        document.getElementById('goalSavedInput').value = '';
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
                    <div><h4 style="margin:0;font-size:16px;">${g.emoji} ${g.name}</h4>
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
        }).join('') || '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No savings goals yet.</p>';
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
                        <b style="font-size:13px">${e.emoji} ${e.name}</b>
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

        if(!results.length) { container.innerHTML = '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:20px">No results found for "'+q+'"</p>'; return; }
        container.innerHTML = results.map(r => `
            <div onclick="${r.action}" style="display:flex;align-items:center;gap:12px;padding:12px;background:#f2f2f7;border-radius:12px;margin-bottom:8px;cursor:pointer;">
                <div style="width:36px;height:36px;border-radius:10px;background:${r.color}22;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${r.icon}</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.title}</div>
                    <div style="font-size:11px;color:#8e8e93;">${r.type} · ${r.sub}</div>
                </div>
            </div>`).join('');
    }

    // ============================================================
    // TASK DEPENDENCIES
    // ============================================================
    function openTaskDepsModal() {
        const reminders = safeStorage('reminders', []);
        const active = reminders.filter(r => r.status !== 'completed' && !r.archived);
        const makeOpts = () => active.map(r => `<option value="${r.id}">${r.task.slice(0,40)}</option>`).join('');
        document.getElementById('depBlockedTask').innerHTML = makeOpts();
        document.getElementById('depRequiredTask').innerHTML = makeOpts();
        renderDependenciesList();
        openModal('taskDepsModal');
    }

    function addDependency() {
        const blocked = Number(document.getElementById('depBlockedTask').value);
        const required = Number(document.getElementById('depRequiredTask').value);
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
            </div>`).join('') || '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:10px">No dependencies set.</p>';
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
    // AI RECOMMENDATIONS
    // ============================================================
    async function getAIRecommend(type) {
        const el = document.getElementById('aiRecommendOutput');
        if(el) el.innerHTML = '<p style="text-align:center;color:#8e8e93">Thinking...</p>';
        const habits = safeStorage('habits', []);
        const reminders = safeStorage('reminders', []);
        const fin = getFinData();
        let prompt = '';
        if(type === 'habits') {
            const existing = habits.map(h=>h.name).join(', ') || 'none';
            prompt = 'My current habits: '+existing+'. My task completion rate: '+Math.round(reminders.filter(r=>r.status==="completed").length/Math.max(1,reminders.length)*100)+'%. Suggest 5 new daily habits with brief reasons. Use emojis, bullet points, max 6 lines.';
        } else if(type === 'tasks') {
            const overdue = reminders.filter(r=>r.status!=="completed"&&new Date(r.time)<new Date()).length;
            prompt = 'I have '+reminders.filter(r=>r.status!=="completed").length+' pending tasks, '+overdue+' overdue. Give 4 specific productivity tips for managing these better. Use emojis, max 5 lines.';
        } else {
            const monthExp = fin.expenses.slice(0,20).reduce((s,e)=>s+Number(e.amount),0);
            prompt = 'My monthly expenses are around Rs '+monthExp.toLocaleString('en-IN')+'. I have '+fin.emis.length+' EMIs and '+fin.bills.length+' bills. Give 4 specific money-saving tips. Use emojis, max 5 lines.';
        }
        try {
            const reply = await callGeminiAI(prompt);
            if(el) el.innerHTML = reply.replace(/\n/g, '<br>');
        } catch(e) {
            if(el) el.innerHTML = e.message === 'NO_KEY' ? '<p>Add Gemini API Key in Settings to use AI Recommendations!</p>' : '<p>Error: '+e.message+'</p>';
        }
    }

    // ============================================================
    // CONFLICT RESOLUTION (Timestamp-based)
    // ============================================================
    function resolveConflict(localData, cloudData, key) {
        if(!cloudData || !localData) return localData || cloudData;
        if(Array.isArray(localData) && Array.isArray(cloudData)) {
            const merged = [...localData];
            cloudData.forEach(cloudItem => {
                if(!cloudItem.id) return;
                const localIdx = merged.findIndex(l => l.id === cloudItem.id);
                if(localIdx === -1) {
                    merged.push(cloudItem);
                } else {
                    const localTs = merged[localIdx].updatedAt || merged[localIdx].id || 0;
                    const cloudTs = cloudItem.updatedAt || cloudItem.id || 0;
                    if(cloudTs > localTs) merged[localIdx] = cloudItem;
                }
            });
            return merged;
        }
        return localData;
    }

    // Stamp updatedAt on task changes
    const _origToggleStatus = window.toggleStatus;
    if(_origToggleStatus) {
        window.toggleStatus = function(id) {
            _origToggleStatus(id);
            let rems = safeStorage('reminders', []);
            const r = rems.find(x => x.id === id);
            if(r) r.updatedAt = Date.now();
            localStorage.setItem('reminders', JSON.stringify(rems));
        };
    }

    // ============================================================
    // TASK BLOCKED BADGE (show in task cards)
    // ============================================================
    // Patch loadReminders to show blocked badge - call after render
    const _origLoadReminders = loadReminders;

    // ============================================================
    // SMART DAILY BRIEFING ENHANCEMENT
    // ============================================================
    function checkMorningBriefing() {
        if(!currentUser) { setTimeout(checkMorningBriefing, 1000); return; }
        const todayStr = getTodayStr();
        const lastBriefing = localStorage.getItem('lastBriefingDate');
        if(lastBriefing === todayStr) return;
        localStorage.setItem('lastBriefingDate', todayStr);

        const reminders = safeStorage('reminders', []);
        const todayTasks = reminders.filter(r => r.status !== 'completed' && r.time?.startsWith(todayStr));
        const overdue = reminders.filter(r => r.status !== 'completed' && !r.archived && r.time && new Date(r.time) < new Date(todayStr));
        const bdays = getBirthdays ? getBirthdays() : [];
        const todayBdays = bdays.filter(b => { const parts = b.date.split('-'); return parts[1]+'-'+parts[2] === todayStr.slice(5); });

        let msgs = [];
        if(todayBdays.length) msgs.push('🎂 Birthday: '+todayBdays.map(b=>b.name).join(', '));
        if(overdue.length) msgs.push(overdue.length+' overdue task(s) need attention');
        if(todayTasks.length) msgs.push(todayTasks.length+' task(s) due today');

        if(msgs.length) {
            setTimeout(() => showToast('Good morning! '+msgs[0], 'info'), 1500);
            msgs.slice(1).forEach((m,i) => setTimeout(() => showToast(m, 'info'), 2500+(i*1500)));
        }
    }

    // ============================================================
    // SETTINGS INIT PATCH (autoDark + haptic + widgets)
    // ============================================================
    // Settings init handled in earlier DOMContentLoaded block


    // ============================================================
    // HEALTH TIPS
    // ============================================================
    const HEALTH_CHECKLIST = [
        {id:'h1', label:'8 glasses of water', icon:'💧', done:false},
        {id:'h2', label:'30 min exercise', icon:'🏃', done:false},
        {id:'h3', label:'7-8 hours sleep', icon:'😴', done:false},
        {id:'h4', label:'Healthy breakfast', icon:'🥗', done:false},
        {id:'h5', label:'10 min meditation', icon:'🧘', done:false},
        {id:'h6', label:'No junk food', icon:'🚫', done:false},
    ];

    function openHealthTipsModal() {
        renderHealthChecklist();
        openModal('healthTipsModal');
        getHealthTip('general');
    }

    async function getHealthTip(type) {
        const el = document.getElementById('healthTipContent');
        if(el) el.innerHTML = '<p style="color:#8e8e93">Loading...</p>';
        const moodLog = safeStorage('moodLog', {});
        const sleepLog = safeStorage('sleepLog', {});
        const todayStr = getTodayStr();
        const mood = moodLog[todayStr];
        const sleep = sleepLog[todayStr];
        const prompts = {
            sleep: 'Give 4 science-backed sleep improvement tips. Keep it brief with emojis, bullet points.',
            nutrition: 'Give 4 practical daily nutrition tips for productivity. Brief, with emojis and bullet points.',
            exercise: 'Give 4 quick exercise tips for busy people. Brief, emojis, bullet points.',
            mental: 'Give 4 mental wellness tips for better focus and mood. Brief, emojis, bullet points.',
            general: 'Based on mood level ' + (mood !== undefined ? mood : 'unknown') + '/4 and ' + (sleep || '?') + 'h sleep last night, give 3 personalized health tips. Brief, emojis, bullet points.'
        };
        try {
            const reply = await callGeminiAI(prompts[type] || prompts.general);
            if(el) el.innerHTML = reply.replace(/\n/g,'<br>');
        } catch(e) {
            if(el) el.innerHTML = e.message === 'NO_KEY'
                ? '<p>Add Gemini API Key in Settings for AI health tips!</p><br><b>General Tips:</b><br>Stay hydrated, exercise 30 min daily, sleep 7-8h, eat vegetables, meditate 10 min.'
                : '<p>Error: '+e.message+'</p>';
        }
    }

    function renderHealthChecklist() {
        const container = document.getElementById('healthChecklist'); if(!container) return;
        const saved = safeStorage('healthCheck_'+getTodayStr(), []);
        container.innerHTML = HEALTH_CHECKLIST.map(item => {
            const done = saved.includes(item.id);
            return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f2f2f7;">
                <input type="checkbox" ${done?'checked':''} onchange="toggleHealthCheck('${item.id}',this.checked)" style="width:18px;height:18px;margin:0;flex-shrink:0;">
                <span style="${done?'text-decoration:line-through;opacity:0.5':''}">${item.icon} ${item.label}</span>
            </div>`;
        }).join('');
    }

    function toggleHealthCheck(id, checked) {
        const key = 'healthCheck_'+getTodayStr();
        let saved = safeStorage(key, []);
        if(checked) { if(!saved.includes(id)) saved.push(id); }
        else saved = saved.filter(x => x !== id);
        localStorage.setItem(key, JSON.stringify(saved));
        renderHealthChecklist();
        hapticFeedback('light');
        if(saved.length === HEALTH_CHECKLIST.length) showToast('Perfect health day! 💪', 'success');
    }

    // ============================================================
    // ACHIEVEMENT SHARING
    // ============================================================
    function shareAchievement() {
        const reminders = safeStorage('reminders', []);
        const habits = safeStorage('habits', []);
        const pomoHist = safeStorage('pomodoroHistory', []);
        const completed = reminders.filter(r => r.status === 'completed').length;
        const bestStreak = Math.max(0, ...habits.map(h => h.streak||0));
        const focusHours = Math.round(pomoHist.reduce((s,h)=>s+h.mins,0)/60);

        let badge = '🏅', title = 'Productivity Champion', desc = '';
        if(completed >= 100) { badge = '💎'; title = 'Diamond Achiever'; }
        else if(completed >= 50) { badge = '🏆'; title = 'Gold Achiever'; }
        else if(completed >= 25) { badge = '🥈'; title = 'Silver Achiever'; }
        if(bestStreak >= 30) { badge = '🔥'; title = 'Habit Master'; }
        if(focusHours >= 50) { badge = '🧠'; title = 'Focus Legend'; }

        desc = completed + ' tasks completed · ' + bestStreak + ' day streak · ' + focusHours + 'h focused';

        const badgeEl = document.getElementById('achieveBadge');
        const titleEl = document.getElementById('achieveTitle');
        const descEl = document.getElementById('achieveDesc');
        if(badgeEl) badgeEl.innerText = badge;
        if(titleEl) titleEl.innerText = title;
        if(descEl) descEl.innerText = desc;

        openModal('achievementModal');
        hapticFeedback('success');
    }

    function copyAchievementText() {
        const badge = document.getElementById('achieveBadge')?.innerText || '';
        const title = document.getElementById('achieveTitle')?.innerText || '';
        const desc = document.getElementById('achieveDesc')?.innerText || '';
        const text = badge + ' ' + title + '\n' + desc + '\n\nTracked with Master Reminder App!';
        navigator.clipboard?.writeText(text).then(() => showToast('Copied to clipboard!', 'success'))
            .catch(() => showToast('Copy: ' + text, 'info'));
        hapticFeedback('success');
    }

    // ============================================================
    // EXPENSE NOTES (add note field to expense)
    // ============================================================
    function addExpenseWithNote() {
        const iE = true;
        const name = document.getElementById('expNameInput').value.trim();
        const amt = Number(document.getElementById('expAmtInput').value);
        const cat = document.getElementById('expCatInput').value;
        const date = document.getElementById('expDateInput').value || getTodayStr();
        const note = document.getElementById('expNoteInput')?.value.trim() || '';
        if(!name||!amt) return showToast('Enter name & amount!', 'error');
        const d = getFinData();
        d.expenses.unshift({id:Date.now(), name, amount:amt, category:cat, date, type:'expense', note});
        saveFinData(d);
        document.getElementById('expNameInput').value = '';
        document.getElementById('expAmtInput').value = '';
        if(document.getElementById('expNoteInput')) document.getElementById('expNoteInput').value = '';
        renderFinanceDashboard();
        hapticFeedback('success');
        showToast('Expense added!', 'success');
    }

    // ============================================================
    // KEYBOARD SHORTCUT (/ for search)
    // ============================================================
    document.addEventListener('keydown', e => {
        if(e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
            e.preventDefault();
            openGlobalSearch();
        }
        if(e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        }
    });

    // ============================================================
    // FINANCE TABS FIX (use event.currentTarget instead of event.target)
    // ============================================================
    // setFinTab defined earlier - this override fixes tab highlighting
    window.setFinTab = function(tab) {
        document.querySelectorAll('.fin-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('[id^="finTab-"]').forEach(el => el.style.display='none');
        document.querySelectorAll('.fin-tab-btn').forEach(btn => {
            const oc = btn.getAttribute('onclick') || '';
            if(oc.includes("'"+tab+"'") || oc.includes('"'+tab+'"')) btn.classList.add('active');
        });
        const tabEl = document.getElementById('finTab-'+tab);
        if(tabEl) tabEl.style.display = 'block';
        if(tab==='expenses') renderExpenses();
        else if(tab==='income') renderIncome();
        else if(tab==='budget') renderBudgets();
        else if(tab==='bills') renderBills();
        else if(tab==='emi') renderEMIs();
        else if(tab==='invest') renderInvestments();
        else if(tab==='khata') renderKhataPartyList();
    };

    // ============================================================
    // WEEKLY REVIEW AUTO-PROMPT (Sunday evening)
    // ============================================================
    function checkWeeklyReview() {
        const now = new Date();
        if(now.getDay() === 0 && now.getHours() >= 18) {
            const lastReview = localStorage.getItem('lastWeeklyReview');
            const thisWeek = getTodayStr();
            if(lastReview !== thisWeek) {
                localStorage.setItem('lastWeeklyReview', thisWeek);
                setTimeout(() => {
                    showToast('Weekly review time! Check your Report for insights.', 'info');
                }, 5000);
            }
        }
    }

    // ============================================================
    // SMART REMINDERS (Pre-alarm notifications in browser)
    // ============================================================
    function checkPreAlarmNotifications() {
        if(Notification.permission !== 'granted') return;
        const reminders = safeStorage('reminders', []);
        const now = new Date().getTime();
        reminders.filter(r => r.status !== 'completed' && !r.archived && r.preAlarm > 0 && !r.preNotified).forEach(r => {
            const taskTime = new Date(r.time).getTime();
            const preMs = r.preAlarm * 60000;
            if(now >= taskTime - preMs && now < taskTime) {
                showPushNotification('Pre-reminder: ' + r.task, r.preAlarm + ' min before due time');
                r.preNotified = true;
            }
        });
    }
    setInterval(checkPreAlarmNotifications, 60000);
    setInterval(checkWeeklyReview, 3600000);


    // ============================================================
    // NEXT TASK WIDGET
    // ============================================================
    function updateNextTaskWidget() {
        const reminders = safeStorage('reminders', []);
        const now = new Date();
        const upcoming = reminders
            .filter(r => r.status !== 'completed' && !r.archived && r.time && new Date(r.time) > now)
            .sort((a,b) => new Date(a.time) - new Date(b.time));
        const nameEl = document.getElementById('nextTaskName');
        const timeEl = document.getElementById('nextTaskTime');
        if(!nameEl || !timeEl) return;
        if(!upcoming.length) {
            nameEl.innerText = 'All clear!';
            timeEl.innerText = 'No upcoming tasks';
            return;
        }
        const next = upcoming[0];
        const dt = new Date(next.time);
        const mins = Math.round((dt - now) / 60000);
        nameEl.innerText = next.task;
        if(mins < 60) timeEl.innerText = 'in ' + mins + ' min';
        else if(mins < 1440) timeEl.innerText = 'in ' + Math.round(mins/60) + 'h';
        else timeEl.innerText = dt.toLocaleDateString('en-IN',{day:'2-digit',month:'short'});
    }

    // ============================================================
    // DAILY CHALLENGE
    // ============================================================
    const CHALLENGES = [
        {icon:'💧', title:'Hydration Hero', desc:'Drink 8 glasses of water today and log your sleep tonight.'},
        {icon:'📵', title:'Phone-Free Hour', desc:'Put your phone away for 1 full hour and focus on one important task.'},
        {icon:'🏃', title:'Move It!', desc:'Do 20 minutes of physical activity today — walk, run, or stretch.'},
        {icon:'📝', title:'Brain Dump', desc:'Write 3 things you are grateful for and 3 goals for the week.'},
        {icon:'🍎', title:'Eat Clean', desc:'Eat one fully healthy meal today with no junk food.'},
        {icon:'📚', title:'Learn Something', desc:'Read for 20 minutes or watch one educational video today.'},
        {icon:'🤝', title:'Connect', desc:'Call or message someone you have not spoken to in a while.'},
        {icon:'🧘', title:'Mindfulness', desc:'Meditate for 10 minutes and track your mood at the end of the day.'},
        {icon:'🎯', title:'Focus Sprint', desc:'Complete 3 tasks from your list before checking social media.'},
        {icon:'💤', title:'Sleep Champion', desc:'Be in bed by 10 PM tonight and get 8 hours of sleep.'},
        {icon:'💰', title:'Save Mode', desc:'Track every expense today and skip one unnecessary purchase.'},
        {icon:'🔥', title:'Habit Streak', desc:'Check in on all your habits before the day ends.'},
        {icon:'🧹', title:'Declutter', desc:'Clean one room, drawer, or digital folder completely.'},
        {icon:'⏰', title:'Early Bird', desc:'Wake up 30 minutes earlier than usual and plan your day.'},
        {icon:'🌟', title:'Compliment', desc:'Give 3 genuine compliments to people around you today.'},
    ];

    function generateDailyChallenge() {
        const todayIdx = new Date().getDate() % CHALLENGES.length;
        const challenge = CHALLENGES[todayIdx];
        const iconEl = document.getElementById('challengeIcon');
        const titleEl = document.getElementById('challengeTitle');
        const descEl = document.getElementById('challengeDesc');
        const statusEl = document.getElementById('challengeStatus');
        const widgetEl = document.getElementById('dailyChallengeText');
        if(iconEl) iconEl.innerText = challenge.icon;
        if(titleEl) titleEl.innerText = challenge.title;
        if(descEl) descEl.innerText = challenge.desc;
        if(widgetEl) widgetEl.innerText = challenge.icon + ' ' + challenge.title;
        const done = localStorage.getItem('challenge_' + getTodayStr()) === 'done';
        if(statusEl) statusEl.innerText = done ? 'Completed today! +50 XP earned' : '';
    }

    function openDailyChallengeModal() {
        generateDailyChallenge();
        openModal('dailyChallengeModal');
    }

    function markChallengeComplete() {
        const key = 'challenge_' + getTodayStr();
        if(localStorage.getItem(key) === 'done') return showToast('Already completed today!', 'info');
        localStorage.setItem(key, 'done');
        const statusEl = document.getElementById('challengeStatus');
        if(statusEl) statusEl.innerText = 'Completed today! +50 XP earned';
        let xp = parseInt(localStorage.getItem('habitXP_tasks') || '0') + 5;
        localStorage.setItem('habitXP_tasks', xp);
        hapticFeedback('success');
        showToast('Challenge complete! +50 XP', 'success');
        syncToCloud();
    }

    // ============================================================
    // FOCUS MODE
    // ============================================================
    let focusTimerInterval = null;
    let focusTimeLeft = 1500;
    let focusRunning = false;

    function openFocusMode(taskName) {
        const overlay = document.getElementById('focusModeOverlay');
        const taskEl = document.getElementById('focusModeTask');
        if(!overlay) return;
        focusTimeLeft = 1500;
        focusRunning = false;
        if(taskEl) taskEl.innerText = taskName || 'Focus Session';
        updateFocusDisplay();
        overlay.style.display = 'flex';
        hapticFeedback('medium');
        // Try to request wake lock
        if(navigator.wakeLock) navigator.wakeLock.request('screen').catch(()=>{});
    }

    function exitFocusMode() {
        clearInterval(focusTimerInterval);
        focusRunning = false;
        const overlay = document.getElementById('focusModeOverlay');
        if(overlay) overlay.style.display = 'none';
        hapticFeedback('light');
    }

    function toggleFocusTimer() {
        const btn = document.getElementById('focusStartBtn');
        if(focusRunning) {
            clearInterval(focusTimerInterval);
            focusRunning = false;
            if(btn) btn.innerText = 'Resume';
        } else {
            focusRunning = true;
            if(btn) btn.innerText = 'Pause';
            focusTimerInterval = setInterval(() => {
                focusTimeLeft--;
                updateFocusDisplay();
                if(focusTimeLeft <= 0) {
                    clearInterval(focusTimerInterval);
                    focusRunning = false;
                    const taskEl = document.getElementById('focusModeTask');
                    logPomoSession(taskEl?.innerText || 'Focus Session', 25);
                    hapticFeedback('success');
                    playAlarm();
                    showToast('Focus session complete! 25 min logged', 'success');
                    setTimeout(exitFocusMode, 3000);
                }
            }, 1000);
        }
    }

    function updateFocusDisplay() {
        const el = document.getElementById('focusModeTimer');
        if(el) {
            const m = String(Math.floor(focusTimeLeft/60)).padStart(2,'0');
            const s = String(focusTimeLeft%60).padStart(2,'0');
            el.innerText = m + ':' + s;
        }
    }

    // ============================================================
    // RECURRING EXPENSES
    // ============================================================
    function getRecurringExps() { return safeStorage('recurringExps', []); }
    function saveRecurringExps(d) { localStorage.setItem('recurringExps', JSON.stringify(d)); syncToCloud(); }

    function openRecurringExpModal() { renderRecurringExpList(); openModal('recurringExpModal'); }

    function addRecurringExpense() {
        const name = document.getElementById('recExpName').value.trim();
        const amt = Number(document.getElementById('recExpAmt').value);
        const cat = document.getElementById('recExpCat').value;
        const freq = document.getElementById('recExpFreq').value;
        if(!name || !amt) return showToast('Enter name & amount!', 'error');
        const exps = getRecurringExps();
        exps.unshift({id:Date.now(), name, amount:amt, category:cat, freq, lastProcessed:null});
        saveRecurringExps(exps);
        renderRecurringExpList();
        document.getElementById('recExpName').value = '';
        document.getElementById('recExpAmt').value = '';
        hapticFeedback('success');
        showToast('Recurring expense added!', 'success');
    }

    function renderRecurringExpList() {
        const c = document.getElementById('recurringExpList'); if(!c) return;
        const exps = getRecurringExps();
        c.innerHTML = exps.map(e => `
            <div class="bill-item">
                <div><b style="font-size:13px">${e.name}</b><br>
                    <span style="font-size:11px;color:#8e8e93">${e.category} · Rs ${Number(e.amount).toLocaleString('en-IN')} · ${e.freq}</span>
                    ${e.lastProcessed ? '<br><span style="font-size:11px;color:#8e8e93">Last: '+e.lastProcessed+'</span>' : ''}
                </div>
                <button onclick="deleteRecurringExp(${e.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px;">X</button>
            </div>`).join('') || '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No recurring expenses.</p>';
    }

    function deleteRecurringExp(id) {
        saveRecurringExps(getRecurringExps().filter(x => x.id !== id));
        renderRecurringExpList();
    }

    function processRecurringExpenses() {
        const exps = getRecurringExps();
        const today = getTodayStr();
        let processed = 0;
        exps.forEach(e => {
            const last = e.lastProcessed;
            let shouldProcess = false;
            if(!last) { shouldProcess = true; }
            else {
                const lastDate = new Date(last);
                const now = new Date(today);
                const diffDays = Math.floor((now - lastDate) / 86400000);
                if(e.freq === 'daily' && diffDays >= 1) shouldProcess = true;
                else if(e.freq === 'weekly' && diffDays >= 7) shouldProcess = true;
                else if(e.freq === 'monthly' && diffDays >= 28) shouldProcess = true;
            }
            if(shouldProcess) {
                addExpenseEntry(e.name, e.amount, e.category, today);
                e.lastProcessed = today;
                processed++;
            }
        });
        saveRecurringExps(exps);
        renderRecurringExpList();
        renderFinanceDashboard();
        hapticFeedback(processed > 0 ? 'success' : 'light');
        showToast(processed > 0 ? processed + ' recurring expense(s) processed!' : 'No expenses due today.', processed > 0 ? 'success' : 'info');
    }

    function addExpenseEntry(name, amount, category, date) {
        const d = getFinData();
        d.expenses.unshift({id:Date.now(), name, amount, category, date, type:'expense', note:'Auto-recurring'});
        saveFinData(d);
    }

    // ============================================================
    // MORE PAGE - ADD REMAINING TILES (via JS patch)
    // ============================================================
    function openFocusModeFromHome() {
        const reminders = safeStorage('reminders', []);
        const next = reminders.filter(r => r.status !== 'completed' && !r.archived).sort((a,b) => new Date(a.time)-new Date(b.time))[0];
        openFocusMode(next?.task || 'Focus Session');
    }

    // ============================================================
    // INIT PATCHES ON APP READY
    // ============================================================
    // Update next task widget whenever reminders load
    const _origLoadRem = loadReminders;
    loadReminders = function(...args) {
        const result = _origLoadRem.apply(this, args);
        setTimeout(updateNextTaskWidget, 200);
        return result;
    };

    // Generate challenge on home page load
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            generateDailyChallenge();
            updateNextTaskWidget();
        }, 1000);
    });

    // Wire Recurring Expense tile on More page
    document.addEventListener('DOMContentLoaded', () => {
        // Add Focus Mode and Recurring tiles dynamically if not already present
        const moreGrid = document.querySelector('#page-more .features-grid');
        if(moreGrid && !document.getElementById('focusModeTile')) {
            const tiles = [
                {id:'focusModeTile', icon:'🎯', label:'Focus Mode', fn:'openFocusModeFromHome()'},
                {id:'recurringExpTile', icon:'🔁', label:'Recurring Exp', fn:'openRecurringExpModal()'},
                {id:'habitAITile', icon:'🤖', label:'Habit AI', fn:'openHabitAIModal()'},
            ];
            tiles.forEach(t => {
                const div = document.createElement('div');
                div.className = 'feature-tile';
                div.id = t.id;
                div.setAttribute('onclick', t.fn);
                div.innerHTML = '<span class="ft-icon">'+t.icon+'</span><span class="ft-label">'+t.label+'</span>';
                moreGrid.appendChild(div);
            });
        }
    });

    // ============================================================
    // HABIT AI RECOMMENDATIONS MODAL
    // ============================================================
    function openHabitAIModal() {
        openModal('aiRecommendModal');
        getAIRecommend('habits');
    }

    // ============================================================
    // MONTHLY FINANCE SUMMARY
    // ============================================================
    function renderMonthlyFinanceSummary() {
        const d = getFinData();
        const now = new Date();
        const ms = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
        const mExp = d.expenses.filter(e=>e.date?.startsWith(ms)).reduce((s,e)=>s+Number(e.amount),0);
        const mInc = d.income.filter(e=>e.date?.startsWith(ms)).reduce((s,e)=>s+Number(e.amount),0);
        const emiTotal = d.emis.reduce((s,e)=>s+Number(e.amount),0);
        const savings = Math.max(0, mInc - mExp - emiTotal);
        const savingRate = mInc > 0 ? Math.round((savings/mInc)*100) : 0;
        return {mExp, mInc, emiTotal, savings, savingRate, month:ms};
    }

    // Wire monthly summary to finance dashboard
    // renderFinanceDashboard already includes monthly summary - no override needed


    // ============================================================
    // WARRANTY TRACKER
    // ============================================================
    function getWarranties() { return safeStorage('warranties', []); }
    function saveWarranties(d) { localStorage.setItem('warranties', JSON.stringify(d)); syncToCloud(); }

    function openWarrantyModal() { renderWarrantyList(); openModal('warrantyModal'); }

    function addWarranty() {
        const item = document.getElementById('warrItemInput').value.trim();
        const cat = document.getElementById('warrCatInput').value;
        const purchaseDate = document.getElementById('warrPurchaseInput').value;
        const months = Number(document.getElementById('warrMonthsInput').value);
        const seller = document.getElementById('warrSellerInput').value.trim();
        const price = Number(document.getElementById('warrPriceInput').value) || 0;
        if(!item || !purchaseDate || !months) return showToast('Enter product, purchase date & warranty months!', 'error');

        const expiry = new Date(purchaseDate);
        expiry.setMonth(expiry.getMonth() + months);
        const expiryStr = formatDateLocal(expiry);

        const list = getWarranties();
        const id = Date.now();
        list.unshift({ id, item, cat, purchaseDate, months, seller, price, expiry: expiryStr });
        saveWarranties(list);

        // Add expiry reminder 30 days before
        const remindDate = new Date(expiry); remindDate.setDate(remindDate.getDate() - 30);
        if(remindDate > new Date()) {
            let reminders = safeStorage('reminders', []);
            reminders.push({
                id: Date.now()+1, task: 'Warranty expiring: ' + item, notes: 'Warranty ends ' + expiryStr,
                time: formatDateLocal(remindDate) + 'T10:00', priority: 'medium', repeat: 'none',
                status: 'pending', notified: false, pinned: false, tags: 'warranty', preAlarm: 0,
                category: { name: 'Warranty', icon: '🛡️' }
            });
            localStorage.setItem('reminders', JSON.stringify(reminders));
            loadReminders();
        }

        document.getElementById('warrItemInput').value = '';
        document.getElementById('warrMonthsInput').value = '';
        document.getElementById('warrSellerInput').value = '';
        document.getElementById('warrPriceInput').value = '';
        renderWarrantyList();
        hapticFeedback('success');
        showToast('Warranty added! Reminder set 30d before expiry 🛡️', 'success');
    }

    function renderWarrantyList() {
        const c = document.getElementById('warrantyList'); if(!c) return;
        const list = getWarranties();
        const today = getTodayStr();
        const sorted = [...list].sort((a,b) => a.expiry.localeCompare(b.expiry));
        c.innerHTML = sorted.map(w => {
            const daysLeft = Math.ceil((new Date(w.expiry) - new Date(today)) / 86400000);
            let cls = 'warranty-card';
            let statusText = '';
            if(daysLeft < 0) { cls += ' warranty-expired'; statusText = 'Expired ' + Math.abs(daysLeft) + 'd ago'; }
            else if(daysLeft <= 30) { cls += ' warranty-urgent'; statusText = daysLeft + 'd left — expiring soon!'; }
            else if(daysLeft <= 90) { cls += ' warranty-soon'; statusText = daysLeft + 'd left'; }
            else { statusText = daysLeft + 'd left'; }
            return `<div class="${cls}">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <div>
                        <b style="font-size:13px;">${w.cat} ${w.item}</b><br>
                        <span style="font-size:11px;color:#8e8e93;">Expires: ${w.expiry} · ${statusText}</span>
                        ${w.seller ? `<br><span style="font-size:11px;color:#8e8e93;">Seller: ${w.seller}</span>` : ''}
                        ${w.price ? `<br><span style="font-size:11px;color:#8e8e93;">Price: Rs ${w.price.toLocaleString('en-IN')}</span>` : ''}
                    </div>
                    <button onclick="deleteWarranty(${w.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px;">✖</button>
                </div>
            </div>`;
        }).join('') || '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px;">No warranties tracked yet.</p>';
    }

    function deleteWarranty(id) {
        saveWarranties(getWarranties().filter(w => w.id !== id));
        renderWarrantyList();
    }

    // ============================================================
    // LOAN EMI CALCULATOR
    // ============================================================
    let lastCalculatedEMI = null;

    function openEMICalcModal() {
        document.getElementById('emiCalcAmount').value = '';
        document.getElementById('emiCalcRate').value = '';
        document.getElementById('emiCalcTenure').value = '';
        document.getElementById('emiCalcResult').innerHTML = '';
        lastCalculatedEMI = null;
        openModal('emiCalcModal');
    }

    function calculateLoanEMI() {
        const P = Number(document.getElementById('emiCalcAmount').value);
        const annualRate = Number(document.getElementById('emiCalcRate').value);
        const years = Number(document.getElementById('emiCalcTenure').value);
        if(!P || !annualRate || !years) return showToast('Fill all fields!', 'error');

        const r = annualRate / 12 / 100;
        const n = Math.round(years * 12);
        const emi = (P * r * Math.pow(1+r, n)) / (Math.pow(1+r, n) - 1);
        const totalPayment = emi * n;
        const totalInterest = totalPayment - P;

        lastCalculatedEMI = { amount: Math.round(emi), principal: P, rate: annualRate, months: n };

        const el = document.getElementById('emiCalcResult');
        if(el) el.innerHTML = `
            <div class="emi-result-card">
                <p style="margin:0;font-size:11px;opacity:0.85;text-transform:uppercase;letter-spacing:0.5px;">Monthly EMI</p>
                <h2 style="margin:6px 0 0;font-size:32px;">Rs ${Math.round(emi).toLocaleString('en-IN')}</h2>
                <div class="emi-result-grid">
                    <div><p style="margin:0;font-size:10px;opacity:0.8;">Principal</p><p style="margin:2px 0 0;font-weight:700;font-size:14px;">Rs ${P.toLocaleString('en-IN')}</p></div>
                    <div><p style="margin:0;font-size:10px;opacity:0.8;">Total Interest</p><p style="margin:2px 0 0;font-weight:700;font-size:14px;">Rs ${Math.round(totalInterest).toLocaleString('en-IN')}</p></div>
                    <div><p style="margin:0;font-size:10px;opacity:0.8;">Total Payment</p><p style="margin:2px 0 0;font-weight:700;font-size:14px;">Rs ${Math.round(totalPayment).toLocaleString('en-IN')}</p></div>
                    <div><p style="margin:0;font-size:10px;opacity:0.8;">Tenure</p><p style="margin:2px 0 0;font-weight:700;font-size:14px;">${n} months</p></div>
                </div>
            </div>
            <button onclick="addCalculatedEMIToTracker()" style="background:#34c759;color:white;border:none;border-radius:10px;padding:12px;width:100%;font-weight:700;cursor:pointer;margin-top:12px;">+ Add to My EMI Tracker</button>
        `;
        hapticFeedback('success');
    }

    function addCalculatedEMIToTracker() {
        if(!lastCalculatedEMI) return;
        const name = prompt('Name this loan (e.g. Home Loan, Car Loan):', 'Loan');
        if(!name) return;
        const d = getFinData();
        d.emis.unshift({ id: Date.now(), name, amount: lastCalculatedEMI.amount, due: '1', monthsLeft: lastCalculatedEMI.months });
        saveFinData(d);
        hapticFeedback('success');
        showToast('Added to EMI Tracker! 🎉', 'success');
        closeModal('emiCalcModal');
        switchPage('finance');
        setTimeout(() => setFinTab('emi'), 200);
    }

    // ============================================================
    // VEHICLE LOG (Fuel/Service/Repair expense tracking)
    // ============================================================
    function getVehicleLogs() { return safeStorage('vehicleLogs', []); }
    function saveVehicleLogs(d) { localStorage.setItem('vehicleLogs', JSON.stringify(d)); syncToCloud(); }

    function setVehTab(tab) {
        document.querySelectorAll('#vehicleModal .cal-view-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('vehtab-' + tab).classList.add('active');
        document.getElementById('vehTabReminders').style.display = tab === 'reminders' ? 'block' : 'none';
        document.getElementById('vehTabLog').style.display = tab === 'log' ? 'block' : 'none';
        if(tab === 'log') renderVehicleLogList();
    }

    function addVehicleLog() {
        const veh = document.getElementById('vlogVehInput').value.trim();
        const type = document.getElementById('vlogTypeInput').value;
        const cost = Number(document.getElementById('vlogCostInput').value);
        const odo = Number(document.getElementById('vlogOdoInput').value) || null;
        const date = document.getElementById('vlogDateInput').value || getTodayStr();
        if(!veh || !cost) return showToast('Enter vehicle & cost!', 'error');

        const logs = getVehicleLogs();
        logs.unshift({ id: Date.now(), veh, type, cost, odo, date });
        saveVehicleLogs(logs);

        document.getElementById('vlogVehInput').value = '';
        document.getElementById('vlogCostInput').value = '';
        document.getElementById('vlogOdoInput').value = '';
        renderVehicleLogList();
        hapticFeedback('success');
        showToast('Log entry added! 📒', 'success');
    }

    function renderVehicleLogList() {
        const c = document.getElementById('vehicleLogList'); if(!c) return;
        const logs = getVehicleLogs();
        const summaryEl = document.getElementById('vlogSummary');
        const totalCost = logs.reduce((s,l) => s + Number(l.cost), 0);
        const fuelCost = logs.filter(l => l.type.includes('Fuel')).reduce((s,l) => s + Number(l.cost), 0);
        if(summaryEl) summaryEl.innerHTML = `<b style="font-size:14px;">Total Spent: Rs ${totalCost.toLocaleString('en-IN')}</b><br><span style="font-size:11px;color:#8e8e93;">Fuel: Rs ${fuelCost.toLocaleString('en-IN')} · ${logs.length} entries</span>`;

        c.innerHTML = logs.slice(0,30).map(l => `
            <div class="vlog-item">
                <div><b style="font-size:13px;">${l.type} ${l.veh}</b><br>
                    <span style="font-size:11px;color:#8e8e93;">${l.date}${l.odo ? ' · '+l.odo.toLocaleString('en-IN')+' km' : ''}</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-weight:700;color:#ff3b30;">Rs ${Number(l.cost).toLocaleString('en-IN')}</span>
                    <button onclick="deleteVehicleLog(${l.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px;">✖</button>
                </div>
            </div>`).join('') || '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px;">No log entries yet.</p>';
    }

    function deleteVehicleLog(id) {
        saveVehicleLogs(getVehicleLogs().filter(l => l.id !== id));
        renderVehicleLogList();
    }


    // ============================================================
    // KHATA BOOK (LEDGER) - Party-wise debit/credit tracker
    // ============================================================
    function getKhataData() {
        return safeStorage('khataData', {"parties":[],"entries":[]});
    }
    function saveKhataData(d) {
        localStorage.setItem('khataData', JSON.stringify(d));
        syncToCloud();
    }

    function getKhataBalance(partyId) {
        const d = getKhataData();
        const entries = d.entries.filter(e => e.partyId === partyId);
        const gave = entries.filter(e => e.type === 'gave').reduce((s,e) => s + Number(e.amount), 0);
        const got = entries.filter(e => e.type === 'got').reduce((s,e) => s + Number(e.amount), 0);
        return gave - got;
    }

    function addKhataParty() {
        const name = document.getElementById('khataPartyName').value.trim();
        const phone = document.getElementById('khataPartyPhone').value.trim();
        if (!name) return showToast('Enter party name!', 'error');
        const d = getKhataData();
        d.parties.unshift({ id: Date.now(), name, phone });
        saveKhataData(d);
        document.getElementById('khataPartyName').value = '';
        document.getElementById('khataPartyPhone').value = '';
        renderKhataPartyList();
        hapticFeedback('success');
        showToast('Party added!', 'success');
    }

    function renderKhataPartyList() {
        const container = document.getElementById('khataPartyList');
        if (!container) return;
        const d = getKhataData();

        let totalReceive = 0, totalPay = 0;
        d.parties.forEach(p => {
            const bal = getKhataBalance(p.id);
            if (bal > 0) totalReceive += bal;
            else totalPay += Math.abs(bal);
        });
        const tr = document.getElementById('khataTotalReceive');
        const tp = document.getElementById('khataTotalPay');
        if (tr) tr.innerText = '₹' + totalReceive.toLocaleString('en-IN');
        if (tp) tp.innerText = '₹' + totalPay.toLocaleString('en-IN');

        container.innerHTML = d.parties.map(p => {
            const bal = getKhataBalance(p.id);
            const color = bal > 0 ? '#34c759' : bal < 0 ? '#ff3b30' : '#8e8e93';
            const label = bal > 0 ? 'will get' : bal < 0 ? 'will give' : 'settled';
            return `<div class="khata-party-card" onclick="openKhataPartyModal(${p.id})">
                <div>
                    <b style="font-size:14px;">${p.name}</b>
                    ${p.phone ? `<br><span style="font-size:11px; color:#8e8e93;">${p.phone}</span>` : ''}
                </div>
                <div style="text-align:right;">
                    <span style="font-weight:800; color:${color}; font-size:14px;">₹${Math.abs(bal).toLocaleString('en-IN')}</span>
                    <br><span style="font-size:10px; color:#8e8e93; font-weight:700; text-transform:uppercase;">${label}</span>
                </div>
            </div>`;
        }).join('') || '<p style="text-align:center; color:#8e8e93; font-size:13px; padding:20px;">No parties yet. Add someone to start tracking!</p>';
    }

    let currentKhataPartyId = null;
    let currentKhataEntryType = 'gave';

    function openKhataPartyModal(partyId) {
        currentKhataPartyId = partyId;
        currentKhataEntryType = 'gave';
        const d = getKhataData();
        const party = d.parties.find(p => p.id === partyId);
        if (!party) return;

        document.getElementById('khataPartyModalName').innerText = party.name;
        document.getElementById('khataPartyModalPhone').innerText = party.phone || '';
        document.getElementById('khataEntryDate').value = getTodayStr();
        setKhataEntryType('gave');
        renderKhataPartyDetail();
        openModal('khataPartyModal');
    }

    function setKhataEntryType(type) {
        currentKhataEntryType = type;
        document.getElementById('khataTypeGave').classList.toggle('active', type === 'gave');
        document.getElementById('khataTypeGot').classList.toggle('active', type === 'got');
    }

    function renderKhataPartyDetail() {
        const d = getKhataData();
        const bal = getKhataBalance(currentKhataPartyId);
        const balEl = document.getElementById('khataPartyBalance');
        const labelEl = document.getElementById('khataPartyBalanceLabel');
        balEl.innerText = '₹' + Math.abs(bal).toLocaleString('en-IN');
        balEl.style.color = bal > 0 ? '#34c759' : bal < 0 ? '#ff3b30' : '#8e8e93';
        labelEl.innerText = bal > 0 ? 'WILL GET (They owe you)' : bal < 0 ? 'WILL GIVE (You owe them)' : 'SETTLED';

        const entries = d.entries.filter(e => e.partyId === currentKhataPartyId).sort((a,b) => new Date(b.date) - new Date(a.date) || b.id - a.id);
        const historyEl = document.getElementById('khataPartyHistory');
        historyEl.innerHTML = entries.map(e => `
            <div class="khata-entry-row">
                <div>
                    <span style="font-weight:700; color:${e.type==='gave'?'#ff3b30':'#34c759'};">${e.type==='gave'?'You Gave':'You Got'}</span>
                    ${e.note ? `<br><span style="color:#8e8e93; font-style:italic;">${e.note}</span>` : ''}
                    <br><span style="color:#8e8e93;">${e.date}</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-weight:800; color:${e.type==='gave'?'#ff3b30':'#34c759'};">₹${Number(e.amount).toLocaleString('en-IN')}</span>
                    <button onclick="deleteKhataEntry(${e.id})" style="background:none; border:none; color:#8e8e93; cursor:pointer; font-size:14px;">✖</button>
                </div>
            </div>
        `).join('') || '<p style="text-align:center; color:#8e8e93; font-size:13px; padding:15px;">No transactions yet.</p>';
    }

    function addKhataEntry() {
        const amount = Number(document.getElementById('khataEntryAmt').value);
        const date = document.getElementById('khataEntryDate').value || getTodayStr();
        const note = document.getElementById('khataEntryNote').value.trim();
        if (!amount) return showToast('Enter amount!', 'error');

        const d = getKhataData();
        d.entries.push({ id: Date.now(), partyId: currentKhataPartyId, type: currentKhataEntryType, amount, date, note });
        saveKhataData(d);

        document.getElementById('khataEntryAmt').value = '';
        document.getElementById('khataEntryNote').value = '';
        renderKhataPartyDetail();
        renderKhataPartyList();
        hapticFeedback('success');
        showToast('Entry added!', 'success');
    }

    function deleteKhataEntry(entryId) {
        const d = getKhataData();
        d.entries = d.entries.filter(e => e.id !== entryId);
        saveKhataData(d);
        renderKhataPartyDetail();
        renderKhataPartyList();
    }

    function deleteKhataParty() {
        if (!confirm('Delete this party and all their transaction history?')) return;
        const d = getKhataData();
        d.parties = d.parties.filter(p => p.id !== currentKhataPartyId);
        d.entries = d.entries.filter(e => e.partyId !== currentKhataPartyId);
        saveKhataData(d);
        closeModal('khataPartyModal');
        renderKhataPartyList();
        showToast('Party deleted', 'info');
    }


    // ============================================================
    // MORE PAGE - SEARCH & PIN SYSTEM
    // ============================================================
    function filterMoreFeatures() {
        const q = (document.getElementById('moreSearchInput')?.value || '').toLowerCase().trim();
        document.querySelectorAll('#moreFeaturesGrid .feature-tile').forEach(tile => {
            const label = (tile.getAttribute('data-label') || '') + ' ' + tile.innerText;
            const match = !q || label.toLowerCase().includes(q);
            tile.classList.toggle('hidden-by-search', !match);
        });
    }

    function getMorePins() {
        return safeStorage('morePinnedFeatures', []);
    }

    function toggleMorePin(id, icon, label, action) {
        let pins = getMorePins();
        const idx = pins.findIndex(p => p.id === id);
        if (idx > -1) {
            pins.splice(idx, 1);
            showToast('Removed from Quick Access', 'info');
        } else {
            if (pins.length >= 6) { showToast('Max 6 pins - remove one first!', 'error'); return; }
            pins.push({ id, icon, label, action });
            showToast('Pinned to Quick Access! ⭐', 'success');
        }
        localStorage.setItem('morePinnedFeatures', JSON.stringify(pins));
        syncToCloud();
        renderMorePinned();
        updatePinStars();
        hapticFeedback('light');
    }

    function updatePinStars() {
        const pins = getMorePins();
        document.querySelectorAll('#moreFeaturesGrid .ft-pin').forEach(starEl => {
            const onclickAttr = starEl.getAttribute('onclick') || '';
            const match = onclickAttr.match(/toggleMorePin\('([^']+)'/);
            if (match) {
                const isPinned = pins.some(p => p.id === match[1]);
                starEl.classList.toggle('pinned', isPinned);
                starEl.innerText = isPinned ? '★' : '☆';
            }
        });
    }

    function renderMorePinned() {
        const container = document.getElementById('morePinnedRow');
        if (!container) return;
        const pins = getMorePins();
        if (!pins.length) { container.innerHTML = ''; return; }
        container.innerHTML = `<h5 style="font-size:11px; color:#8e8e93; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin:0 0 8px;">⭐ Quick Access</h5>
            <div style="display:flex; gap:8px; overflow-x:auto; padding-bottom:4px;">
                ${pins.map(p => `<div onclick="${p.action}" style="flex-shrink:0; background:linear-gradient(135deg, var(--primary), #5e5ce6); color:white; border-radius:14px; padding:12px 16px; text-align:center; cursor:pointer; min-width:72px;">
                    <span style="font-size:22px; display:block; margin-bottom:4px;">${p.icon}</span>
                    <span style="font-size:10px; font-weight:700;">${p.label}</span>
                </div>`).join('')}
            </div>`;
    }


    // ============================================================
    // ADVANCED OPTIONS PANEL TOGGLE (Add page)
    // ============================================================
    function toggleAdvancedOptions() {
        const panel = document.getElementById('advancedOptionsPanel');
        const arrow = document.getElementById('advOptionsArrow');
        const btn = document.getElementById('advOptionsBtn');
        if (!panel) return;
        const isOpen = panel.style.display === 'block';
        panel.style.display = isOpen ? 'none' : 'block';
        if (arrow) arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
        if (btn) btn.style.borderRadius = isOpen ? '12px' : '12px 12px 0 0';
    }

    // ============================================================
    // ADVANCED SETTINGS PANEL TOGGLE (Settings page)
    // ============================================================
    function toggleAdvancedSettings() {
        const panel = document.getElementById('advancedSettingsPanel');
        const arrow = document.getElementById('advSettingsArrow');
        if (!panel) return;
        const isOpen = panel.style.display === 'block';
        panel.style.display = isOpen ? 'none' : 'block';
        if (arrow) arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
    }

    // ============================================================
    // SUBTASKS
    // ============================================================
    function addSubtaskField(text, done) {
        const container = document.getElementById('subtasksContainer');
        if (!container) return;
        const div = document.createElement('div');
        div.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.checked = done || false;
        cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;margin:0;';
        const inp = document.createElement('input');
        inp.type = 'text'; inp.value = text || '';
        inp.placeholder = 'Subtask...';
        inp.style.cssText = 'flex:1;margin:0;padding:10px;border-radius:8px;border:1px solid #e5e5ea;font-size:13px;';
        const rm = document.createElement('button');
        rm.innerText = '✖'; rm.type = 'button';
        rm.style.cssText = 'background:none;border:none;color:#ff3b30;cursor:pointer;font-size:18px;flex-shrink:0;';
        rm.onclick = () => div.remove();
        div.appendChild(cb); div.appendChild(inp); div.appendChild(rm);
        container.appendChild(div);
    }

    function getSubtasks() {
        const container = document.getElementById('subtasksContainer');
        if (!container) return [];
        const rows = container.querySelectorAll('div');
        return [...rows].map(row => ({
            text: row.querySelector('input[type=text]')?.value.trim() || '',
            done: row.querySelector('input[type=checkbox]')?.checked || false
        })).filter(s => s.text);
    }

    async function aiGenerateSubtasks() {
        const task = document.getElementById('taskInput')?.value.trim();
        if (!task) return showToast('Enter task name first!', 'error');
        showToast('AI generating subtasks...', 'info');
        try {
            const prompt = 'Break this task into 3-5 actionable subtasks. Return ONLY a JSON array of strings, no other text. Task: ' + task;
            const reply = await callGeminiAI(prompt);
            const clean = reply.replace(/```json|```/g,'').trim();
            const subtasks = JSON.parse(clean);
            const container = document.getElementById('subtasksContainer');
            if (container) container.innerHTML = '';
            subtasks.forEach(st => addSubtaskField(st));
            hapticFeedback('success');
            showToast('Subtasks generated! ✅', 'success');
        } catch(e) {
            showToast(e.message === 'NO_KEY' ? 'Add Gemini API key first!' : 'AI error: '+e.message, 'error');
        }
    }

    // ============================================================
    // MORE PAGE DATE LABEL
    // ============================================================
    function updateMorePageLabel() {
        const el = document.getElementById('morePageDateLabel');
        if (el) el.innerText = new Date().toLocaleDateString('en-IN', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
    }

    // ============================================================
    // EXTENDED WIDGET TOGGLES (new widgets in Settings)
    // ============================================================
    const WIDGET_ID_MAP = {
        aitip: 'aiTipContainer',
        sleep: 'todaySleepSection',
        nexttask: 'nextTaskWidget',
        challenge: 'dailyChallengeWidget',
        analytics: null, // handled by class
        calendar: null,  // handled by id
        habits: null,    // handled by id
    };

    function applyWidgetPrefs() {
        const prefs = safeStorage('widgetPrefs', {aitip:true,sleep:true,nexttask:true,challenge:true,analytics:true,calendar:true,habits:true});
        const ID_MAP = {
            aitip: 'aiTipContainer',
            sleep: 'todaySleepSection',
            nexttask: 'nextTaskWidget',
            challenge: 'dailyChallengeWidget',
            analytics: 'analyticsSection',
            calendar: 'homeCal',
            habits: 'homeHabitsSection',
        };
        Object.keys(prefs).forEach(key => {
            const el = document.getElementById(ID_MAP[key]);
            if (el) el.style.display = prefs[key] === false ? 'none' : '';
            const toggle = document.getElementById('w-'+key);
            if (toggle) toggle.checked = prefs[key] !== false;
        });
    }

    function toggleWidget(key, on) {
        const prefs = safeStorage('widgetPrefs', {});
        prefs[key] = on;
        localStorage.setItem('widgetPrefs', JSON.stringify(prefs));
        applyWidgetPrefs();
        showToast((on ? 'Widget shown' : 'Widget hidden'), 'info');
    }

    // ============================================================
    // ADD IDs to home section wrappers for widget toggling
    // ============================================================
    // Patch analytics section id - done via CSS selector fallback in applyWidgetPrefs

    // ============================================================
    // PRINT IMPROVEMENT
    // ============================================================
    function printTaskList() {
        const reminders = safeStorage('reminders', []);
        const habits = safeStorage('habits', []);
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-IN', {weekday:'long', day:'numeric', month:'long', year:'numeric'});

        const pending = reminders.filter(r => r.status !== 'completed' && !r.archived).sort((a,b) => new Date(a.time) - new Date(b.time));
        const completed = reminders.filter(r => r.status === 'completed');

        const taskRows = pending.map(r => {
            const dt = r.time ? new Date(r.time).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
            return `<tr>
                <td style="padding:8px;border-bottom:1px solid #eee;">${r.task}</td>
                <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${dt}</td>
                <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${r.priority||'medium'}</td>
                <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">[ ]</td>
            </tr>`;
        }).join('');

        const habitRows = habits.map(h => `<tr>
            <td style="padding:8px;border-bottom:1px solid #eee;">${h.icon||''} ${h.name}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${h.streak||0} days</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">[ ]</td>
        </tr>`).join('');

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Master App — Task Report</title>
        <style>
            body{font-family:-apple-system,sans-serif;margin:30px;color:#1c1c1e}
            h1{font-size:22px;margin:0}h2{font-size:16px;color:#007aff;margin:24px 0 8px}
            table{width:100%;border-collapse:collapse;font-size:13px}
            th{background:#007aff;color:white;padding:10px;text-align:left}
            .summary{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin:16px 0}
            .stat-box{background:#f2f2f7;border-radius:8px;padding:12px;text-align:center}
            .stat-num{font-size:24px;font-weight:700;color:#007aff}
            .stat-lbl{font-size:11px;color:#8e8e93;font-weight:600}
            @media print{.no-print{display:none}}
        </style></head><body>
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #007aff;padding-bottom:12px;margin-bottom:16px;">
            <div><h1>Master Reminder App</h1><p style="margin:4px 0 0;color:#8e8e93;font-size:13px;">${dateStr}</p></div>
            <div style="text-align:right;font-size:12px;color:#8e8e93;">${userName||'User'}</div>
        </div>
        <div class="summary">
            <div class="stat-box"><div class="stat-num">${reminders.length}</div><div class="stat-lbl">Total Tasks</div></div>
            <div class="stat-box"><div class="stat-num">${pending.length}</div><div class="stat-lbl">Pending</div></div>
            <div class="stat-box"><div class="stat-num">${completed.length}</div><div class="stat-lbl">Completed</div></div>
            <div class="stat-box"><div class="stat-num">${habits.length}</div><div class="stat-lbl">Habits</div></div>
        </div>
        <h2>📋 Pending Tasks (${pending.length})</h2>
        <table><thead><tr><th>Task</th><th>Due Date</th><th>Priority</th><th>Done</th></tr></thead>
        <tbody>${taskRows || '<tr><td colspan="4" style="padding:20px;text-align:center;color:#8e8e93;">No pending tasks</td></tr>'}</tbody></table>
        ${habitRows ? `<h2>🔥 Habits</h2><table><thead><tr><th>Habit</th><th>Streak</th><th>Today</th></tr></thead><tbody>${habitRows}</tbody></table>` : ''}
        <p style="margin-top:30px;font-size:11px;color:#8e8e93;text-align:center;">Generated by Master Reminder App · ${new Date().toLocaleString('en-IN')}</p>
        <script>window.onload=function(){window.print();}<\/script>
        </body></html>`;

        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); }
        else showToast('Allow pop-ups to print!', 'error');
    }

    // ============================================================
    // LOAD CUSTOM TEMPLATES ON ADD PAGE OPEN
    // ============================================================
    const _origSwitchPage = switchPage;
    switchPage = function(pageId) {
        _origSwitchPage(pageId);
        if (pageId === 'add') {
            loadCustomTemplates();
            // Clear advanced panel if fresh add
            const panel = document.getElementById('advancedOptionsPanel');
            if (panel && !window._editMode) panel.style.display = 'none';
        }
        if (pageId === 'more') {
            updateMorePageLabel();
        }
    };

    // ============================================================
    // PROFILE MODAL EDIT NAME
    // ============================================================
    function openProfileEditModal() {
        const newName = prompt('Enter your name:', userName || '');
        if (newName === null) return;
        if (newName.trim().length < 1) return showToast('Name cannot be empty!', 'error');
        userName = newName.trim().slice(0, 40);
        const el1 = document.getElementById('displayUserName');
        const el2 = document.getElementById('profileNameInput');
        const el3 = document.getElementById('profileCardName');
        if (el1) el1.innerText = userName;
        if (el2) el2.value = userName;
        if (el3) el3.innerText = userName;
        saveProfileSettings();
        showToast('Name updated! ✅', 'success');
        hapticFeedback('success');
    }


    // ============================================================
    // SCROLL TO TABS (dashboard card tap)
    // ============================================================
    function scrollToTabs() {
        setTimeout(() => {
            const tabs = document.getElementById('tabContainer');
            if (tabs) tabs.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
    }

    // ============================================================
    // FAMILY MEMBERS
    // ============================================================
    function getFamilyMembers() { return safeStorage('familyMembers', []); }
    function saveFamilyMembers(d) { localStorage.setItem('familyMembers', JSON.stringify(d)); syncToCloud(); }

    function openFamilyModal() {
        const myIdEl = document.getElementById('familyMyId');
        if (myIdEl) myIdEl.innerText = localStorage.getItem('uniqueId') || 'Generate in Settings first';
        renderFamilyMembersList();
        openModal('familyModal');
    }

    function addFamilyMember() {
        const input = document.getElementById('familyMemberIdInput');
        const id = (input?.value || '').trim().toUpperCase();
        if (!id || id.length < 8) return showToast('Enter a valid Unique ID!', 'error');
        const myId = localStorage.getItem('uniqueId');
        if (id === myId) return showToast("That's your own ID!", 'error');
        const members = getFamilyMembers();
        if (members.find(m => m.id === id)) return showToast('Already added!', 'error');

        // Try to look up in Firestore
        const nameGuess = 'Member ' + (members.length + 1);
        members.unshift({ id, name: nameGuess, addedAt: new Date().toISOString(), status: 'pending' });
        saveFamilyMembers(members);

        // Try to fetch name from Firestore
        if (typeof db !== 'undefined') {
            db.collection('users').where('uniqueId', '==', id).get().then(snap => {
                if (!snap.empty) {
                    const data = snap.docs[0].data();
                    const updated = getFamilyMembers().map(m => m.id === id ? {...m, name: data.userName || nameGuess, status: 'connected'} : m);
                    saveFamilyMembers(updated);
                    renderFamilyMembersList();
                    showToast('Connected with ' + (data.userName || 'member') + '! 🎉', 'success');
                } else {
                    showToast('ID added (member not found in DB)', 'info');
                }
            }).catch(() => {});
        }

        if (input) input.value = '';
        renderFamilyMembersList();
        hapticFeedback('success');
    }

    function renderFamilyMembersList() {
        const c = document.getElementById('familyMembersList'); if (!c) return;
        const members = getFamilyMembers();
        c.innerHTML = members.map(m => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#f2f2f7; border-radius:12px; padding:12px 14px; margin-bottom:8px;">
                <div>
                    <b style="font-size:13px;">${m.name}</b>
                    <br><span style="font-size:11px; color:#8e8e93;">${m.id} · ${m.status === 'connected' ? '🟢 Connected' : '⏳ Pending'}</span>
                </div>
                <button onclick="removeFamilyMember('${m.id}')" style="background:none; border:none; color:#ff3b30; cursor:pointer; font-size:15px;">✖</button>
            </div>`).join('') || '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No family members yet. Add someone using their Unique ID!</p>';
    }

    function removeFamilyMember(id) {
        saveFamilyMembers(getFamilyMembers().filter(m => m.id !== id));
        renderFamilyMembersList();
        showToast('Member removed', 'info');
    }

    // ============================================================
    // SMART REMINDERS SETTINGS
    // ============================================================
    function getSmartSettings() { return safeStorage('smartSettings', { morning:false, overdue:true, birthday:true, budget:true, habit:true, evening:false, quietFrom:'22:00', quietTo:'07:00' }); }

    function saveSmartSettings() {
        const s = {
            morning: document.getElementById('smartMorningBriefing')?.checked || false,
            overdue: document.getElementById('smartOverdueAlert')?.checked !== false,
            birthday: document.getElementById('smartBirthdayAlert')?.checked !== false,
            budget: document.getElementById('smartBudgetAlert')?.checked !== false,
            habit: document.getElementById('smartHabitReminder')?.checked !== false,
            evening: document.getElementById('smartEveningReview')?.checked || false,
            quietFrom: document.getElementById('quietFrom')?.value || '22:00',
            quietTo: document.getElementById('quietTo')?.value || '07:00',
        };
        localStorage.setItem('smartSettings', JSON.stringify(s));
        syncToCloud();
        showToast('Smart settings saved!', 'success');
    }

    function loadSmartSettings() {
        const s = getSmartSettings();
        const set = (id, val) => { const el = document.getElementById(id); if(el) el.checked = val; };
        set('smartMorningBriefing', s.morning);
        set('smartOverdueAlert', s.overdue !== false);
        set('smartBirthdayAlert', s.birthday !== false);
        set('smartBudgetAlert', s.budget !== false);
        set('smartHabitReminder', s.habit !== false);
        set('smartEveningReview', s.evening);
        const qf = document.getElementById('quietFrom'); if(qf) qf.value = s.quietFrom || '22:00';
        const qt = document.getElementById('quietTo'); if(qt) qt.value = s.quietTo || '07:00';
    }

    function isQuietHours() {
        const s = getSmartSettings();
        const now = new Date();
        const [fh, fm] = (s.quietFrom || '22:00').split(':').map(Number);
        const [th, tm] = (s.quietTo || '07:00').split(':').map(Number);
        const nowMins = now.getHours()*60 + now.getMinutes();
        const fromMins = fh*60+fm;
        const toMins = th*60+tm;
        if (fromMins < toMins) return nowMins >= fromMins && nowMins < toMins;
        return nowMins >= fromMins || nowMins < toMins; // overnight
    }

    // Override showPushNotification to respect quiet hours
    const _origShowPush = typeof showPushNotification === 'function' ? showPushNotification : null;
    if (_origShowPush) {
        window.showPushNotification = function(title, body) {
            if (isQuietHours()) {
                console.log('[Quiet Hours] Suppressed:', title);
                return;
            }
            _origShowPush(title, body);
        };
    }

    // ============================================================
    // OFFLINE BACKGROUND SYNC
    // ============================================================
    window.addEventListener('online', () => {
        if (typeof syncToCloud === 'function') syncToCloud();
        if (window.requestBackgroundSync) window.requestBackgroundSync('sync-reminders');
        showToast('Back online! Syncing data...', 'success');
    });
    window.addEventListener('offline', () => {
        showToast('Offline mode: changes saved locally', 'info');
    });

    // ============================================================
    // PERFORMANCE: Lazy-load app stats chart
    // ============================================================
    let _appStatsRendered = false;
    const _origOpenAppStats = openAppStatsModal;
    openAppStatsModal = function() {
        _origOpenAppStats();
        _appStatsRendered = true;
    };

    // ============================================================
    // CONFLICT RESOLUTION (improved)
    // ============================================================
    function mergeReminders(local, cloud) {
        if (!Array.isArray(cloud) || !cloud.length) return local;
        if (!Array.isArray(local) || !local.length) return cloud;
        const merged = new Map();
        local.forEach(r => merged.set(r.id, r));
        cloud.forEach(r => {
            if (!merged.has(r.id)) {
                merged.set(r.id, r);
            } else {
                const localItem = merged.get(r.id);
                const localTs = localItem.updatedAt || localItem.id || 0;
                const cloudTs = r.updatedAt || r.id || 0;
                if (cloudTs > localTs) merged.set(r.id, r);
            }
        });
        return Array.from(merged.values()).sort((a,b) => (b.id||0)-(a.id||0));
    }

    // ============================================================
    // INIT ON APP START
    // ============================================================
    document.addEventListener('DOMContentLoaded', () => {
        loadSmartSettings();
        applyCalendarColors();
        applyWidgetPrefs();
        // Register for periodic background sync if supported
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'APP_READY' });
        }
    });

    // ============================================================
    // PERFORMANCE: requestIdleCallback for non-critical renders
    // ============================================================
    function idleRender(fn) {
        if (window.requestIdleCallback) window.requestIdleCallback(fn, { timeout: 2000 });
        else setTimeout(fn, 200);
    }

    // ============================================================
    // URL DEEPLINK HANDLER (from manifest shortcuts)
    // ============================================================
    (function() {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        if (action === 'add') document.addEventListener('DOMContentLoaded', () => setTimeout(() => switchPage('add'), 500));
        if (action === 'finance') document.addEventListener('DOMContentLoaded', () => setTimeout(() => switchPage('finance'), 500));
    })();


    // ============================================================
    // NOTIFICATION BADGE on nav
    // ============================================================
    function updateNotifBadge() {
        const log = safeStorage('notifLog', []);
        const unread = log.filter(n => !n.read).length;
        const badge = document.getElementById('notifNavBadge');
        if (!badge) return;
        badge.style.display = unread > 0 ? 'block' : 'none';
        badge.innerText = unread > 9 ? '9+' : String(unread);
    }

    // Update badge after every notification
    const _origAddNotif = addNotifLog;
    addNotifLog = function(title, body, type) {
        _origAddNotif(title, body, type);
        updateNotifBadge();
    };

    // ============================================================
    // MORNING BRIEFING SCHEDULER
    // ============================================================
    function scheduleMorningBriefing() {
        const s = getSmartSettings();
        if (!s.morning) return;
        const now = new Date();
        const next8am = new Date(now);
        next8am.setHours(8, 0, 0, 0);
        if (next8am <= now) next8am.setDate(next8am.getDate() + 1);
        const msUntil = next8am - now;
        setTimeout(() => {
            if (getSmartSettings().morning && !isQuietHours()) checkMorningBriefing();
            scheduleMorningBriefing(); // reschedule for next day
        }, msUntil);
    }

    function scheduleEveningReview() {
        const s = getSmartSettings();
        if (!s.evening) return;
        const now = new Date();
        const next9pm = new Date(now);
        next9pm.setHours(21, 0, 0, 0);
        if (next9pm <= now) next9pm.setDate(next9pm.getDate() + 1);
        setTimeout(() => {
            if (!isQuietHours()) {
                const reminders = safeStorage('reminders', []);
                const todayStr = getTodayStr();
                const todayDone = reminders.filter(r => r.status === 'completed' && r.time?.startsWith(todayStr)).length;
                const todayTotal = reminders.filter(r => r.time?.startsWith(todayStr)).length;
                showToast('Evening recap: ' + todayDone + '/' + todayTotal + ' tasks done today!', 'info');
                addNotifLog('Evening Review', todayDone + '/' + todayTotal + ' tasks completed today', 'info');
            }
            scheduleEveningReview();
        }, next9pm - now);
    }

    // ============================================================
    // ADVANCED NOTIFICATIONS: Grouped & Smart
    // ============================================================
    function checkSmartReminders() {
        const s = getSmartSettings();
        if (isQuietHours()) return;
        const reminders = safeStorage('reminders', []);
        const habits = safeStorage('habits', []);
        const todayStr = getTodayStr();
        const now = new Date();

        // Overdue tasks
        if (s.overdue !== false) {
            const overdue = reminders.filter(r => r.status !== 'completed' && !r.archived && r.time && new Date(r.time) < now);
            if (overdue.length) {
                addNotifLog('Overdue Tasks', overdue.length + ' task(s) need attention', 'error');
                if (Notification.permission === 'granted' && overdue.length > 0) {
                    new Notification('Master App', { body: overdue.length + ' overdue task(s)!', icon: '/icon-192.png' });
                }
            }
        }

        // Habit streak at risk
        if (s.habit !== false) {
            habits.forEach(h => {
                if (h.lastCheckIn !== todayStr && h.streak > 0) {
                    addNotifLog('Habit Reminder', h.name + ' — check in to keep your ' + h.streak + ' day streak!', 'warning');
                }
            });
        }

        // Budget check
        if (s.budget !== false) {
            const finData = getFinData();
            const ms = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
            const spent = finData.expenses.filter(e => e.date?.startsWith(ms)).reduce((s,e) => s+safeNum(e.amount), 0);
            const budget = finData.budgets.reduce((s,b) => s+safeNum(b.limit), 0);
            if (budget > 0 && spent >= budget * 0.9) {
                addNotifLog('Budget Warning', 'Spent Rs ' + Math.round(spent).toLocaleString('en-IN') + ' of Rs ' + budget.toLocaleString('en-IN') + ' budget', 'warning');
            }
        }

        updateNotifBadge();
    }

    // ============================================================
    // CONFLICT RESOLUTION: merge cloud data with local
    // ============================================================
    function applyCloudDataWithConflictResolution(data) {
        if (!data) return;

        // Reminders: smart merge
        if (data.reminders) {
            const localRem = safeStorage('reminders', []);
            const merged = mergeReminders(localRem, data.reminders);
            localStorage.setItem('reminders', JSON.stringify(merged));
        }

        // Habits: take whichever has higher streak (no overwrite)
        if (data.habits) {
            const localH = safeStorage('habits', []);
            const merged = data.habits.map(ch => {
                const lh = localH.find(h => h.id === ch.id || h.name === ch.name);
                if (!lh) return ch;
                return (ch.streak || 0) > (lh.streak || 0) ? ch : lh;
            });
            // Add any local habits not in cloud
            localH.forEach(lh => { if (!merged.find(m => m.id === lh.id)) merged.push(lh); });
            localStorage.setItem('habits', JSON.stringify(merged));
        }

        // Finance: take cloud if it has more entries
        if (data.finData) {
            const localFin = getFinData();
            const cloudFin = data.finData;
            const resolved = {
                expenses: cloudFin.expenses?.length > localFin.expenses?.length ? cloudFin.expenses : localFin.expenses,
                income: cloudFin.income?.length > localFin.income?.length ? cloudFin.income : localFin.income,
                budgets: localFin.budgets?.length ? localFin.budgets : cloudFin.budgets || [],
                bills: cloudFin.bills?.length > localFin.bills?.length ? cloudFin.bills : localFin.bills,
                emis: localFin.emis?.length ? localFin.emis : cloudFin.emis || [],
                investments: localFin.investments?.length ? localFin.investments : cloudFin.investments || [],
            };
            localStorage.setItem('finData', JSON.stringify(resolved));
        }
    }

    // ============================================================
    // PERFORMANCE: Debounce search input
    // ============================================================
    function debounce(fn, delay) {
        let t;
        return function(...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // Debounce global search
    const _origRunGlobalSearch = runGlobalSearch;
    runGlobalSearch = debounce(_origRunGlobalSearch, 180);
    const _origFilterMore = filterMoreFeatures;
    filterMoreFeatures = debounce(_origFilterMore, 120);

    // ============================================================
    // PERFORMANCE: Virtual list for large task lists
    // ============================================================
    const MAX_VISIBLE_TASKS = 50; // Show max 50 tasks at once

    // ============================================================
    // PERFORMANCE: Throttle syncToCloud
    // ============================================================
    let _syncTimeout = null;
    const _origSyncToCloud = syncToCloud;
    syncToCloud = function() {
        clearTimeout(_syncTimeout);
        _syncTimeout = setTimeout(() => _origSyncToCloud(), 1500); // debounce 1.5s
    };

    // ============================================================
    // MULTI-LANGUAGE: Gujarati UI labels
    // ============================================================
    const LANG_GU = {
        'Add Task': 'કાર્ય ઉમેરો',
        'Today': 'આજે',
        'Upcoming': 'આગામી',
        'Done': 'પૂર્ણ',
        'All': 'બધા',
        'Settings': 'સેટિંગ',
        'Finance': 'ફાઇનાન્સ',
        'Habits': 'આદતો',
        'Save': 'સાચવો',
    };

    let currentLang = localStorage.getItem('appLang') || 'en';

    function setAppLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('appLang', lang);
        // Reload to apply (Google Translate handles full translation)
        if (lang === 'gu') {
            showToast('ભાષા: ગુજરાતી ✅', 'success');
        } else {
            showToast('Language: English ✅', 'success');
        }
    }

    // ============================================================
    // INIT: Run all startup checks
    // ============================================================
    const _origCheckMorning = typeof checkMorningBriefing === 'function' ? checkMorningBriefing : null;
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            updateNotifBadge();
            scheduleMorningBriefing();
            scheduleEveningReview();
            loadSmartSettings();
            // Run smart check once on startup (with delay)
            setTimeout(checkSmartReminders, 4000);
            // Run smart reminders every 2 hours
            setInterval(checkSmartReminders, 2 * 60 * 60 * 1000);
        }, 2000);
    });

    // ============================================================
    // URL action deeplink: ?action=add opens add page automatically
    // ============================================================
    window.addEventListener('load', () => {
        const params = new URLSearchParams(location.search);
        if (params.get('action') === 'add') {
            const waitForAuth = setInterval(() => {
                if (typeof currentUser !== 'undefined' && currentUser) {
                    clearInterval(waitForAuth);
                    switchPage('add');
                }
            }, 500);
        }
    });