// Firebase init, security/storage utilities (sanitizeHTML, escInline, safeStorage), speed-dial FAB, Pomodoro timer, weekly/monthly report stats.

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
    const functions = firebase.functions();
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

    // ============================================================
    // LOCALSTORAGE SCHEMA VERSIONING
    // ============================================================
    // This app has 57+ separate localStorage keys with no version tracking, which
    // means a future change to any data shape (e.g. renaming a field, changing an
    // array to an object) has no safe way to update existing users' already-stored
    // data — it would just silently break or lose information for anyone who
    // installed before the change.
    //
    // HOW TO ADD A FUTURE MIGRATION:
    //   1. Bump SCHEMA_VERSION by 1.
    //   2. Add an `if (version < N) { migrateToVN_yourDescription(); version = N; }`
    //      block inside runSchemaMigrations, in order.
    //   3. Write migrateToVN_yourDescription() below, following the pattern of
    //      migrateToV2_normalizeReminders: read the key(s) involved, fix them up,
    //      write back ONLY if something actually changed, and never throw —
    //      catch and log, so one bad migration can't brick the whole app on load.
    //
    // Existing users (who predate this system entirely) have no `schemaVersion`
    // key yet. Treating that as version 1 is intentional: version 1 IS today's
    // current data shape, so nothing needs migrating for them until version 2+
    // introduces an actual change.
    const SCHEMA_VERSION = 2;

    function runSchemaMigrations() {
        let version = parseInt(localStorage.getItem('schemaVersion'), 10);
        if (isNaN(version)) version = 1;
        if (version >= SCHEMA_VERSION) return;

        if (version < 2) { migrateToV2_normalizeReminders(); version = 2; }
        // Next one goes here: if (version < 3) { migrateToV3_xyz(); version = 3; }

        localStorage.setItem('schemaVersion', String(version));
    }

    // v2: reminder fields (subtasks, tags, assignee, project, preAlarm, notified, status...)
    // were added incrementally across many feature batches over this app's history.
    // Records saved before a given field existed simply don't have it, which can cause
    // subtle bugs (e.g. `reminder.subtasks.length` on undefined). This fills in safe
    // defaults for anything missing — it never removes or overwrites existing values.
    function migrateToV2_normalizeReminders() {
        try {
            const reminders = safeStorage('reminders', []);
            if (!Array.isArray(reminders) || reminders.length === 0) return;
            let changed = false;
            const normalized = reminders.map(r => {
                const fixed = Object.assign({}, r);
                if (!Array.isArray(fixed.subtasks)) { fixed.subtasks = []; changed = true; }
                if (typeof fixed.tags !== 'string') { fixed.tags = ''; changed = true; }
                if (typeof fixed.notes !== 'string') { fixed.notes = ''; changed = true; }
                if (typeof fixed.assignee !== 'string') { fixed.assignee = ''; changed = true; }
                if (typeof fixed.notified !== 'boolean') { fixed.notified = false; changed = true; }
                if (typeof fixed.pinned !== 'boolean') { fixed.pinned = false; changed = true; }
                if (typeof fixed.archived !== 'boolean') { fixed.archived = false; changed = true; }
                if (!fixed.status) { fixed.status = 'pending'; changed = true; }
                if (!fixed.priority) { fixed.priority = 'medium'; changed = true; }
                return fixed;
            });
            if (changed) {
                localStorage.setItem('reminders', JSON.stringify(normalized));
                console.log('[Migration v2] Normalized', normalized.length, 'reminder records.');
            }
        } catch (e) {
            console.error('[Migration v2] Failed, leaving data untouched:', e);
        }
    }

    function sanitizeHTML(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    // SECURITY: use this (not sanitizeHTML) when a value is embedded inside an inline
    // event-handler attribute as a JS string argument, e.g. onclick="fn('${escInline(x)}')".
    // HTML entity-escaping alone (sanitizeHTML) is NOT enough there: the browser decodes
    // entities in the attribute value BEFORE running it as JS, so an encoded quote (&#39;)
    // still becomes a real ' once the handler executes, and can break out of the JS string.
    // This escapes backslash/quotes for JS-string safety first, then HTML-escapes the rest.
    function escInline(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\r?\n/g, '\\n')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
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

    function $id(id) { return document.getElementById(id); }
    function setVal(id, value) { const el = $id(id); if (el) el.value = value; }
    function setTxt(id, text) { const el = $id(id); if (el) el.innerText = text; }
    function setDisplay(id, value) { const el = $id(id); if (el) el.style.display = value; }

    // ============================================================
    // SPEED-DIAL FLOATING ACTION BUTTON
    // ============================================================
    let fabMenuOpen = false;

    function toggleFabMenu() {
        fabMenuOpen = !fabMenuOpen;
        const mainFabBtn = $id('mainFabBtn');
        const fabBackdrop = $id('fabBackdrop');
        if (mainFabBtn) mainFabBtn.classList.toggle('open', fabMenuOpen);
        document.querySelectorAll('.fab-speed-item').forEach(el => el.classList.toggle('show', fabMenuOpen));
        if (fabBackdrop) fabBackdrop.classList.toggle('show', fabMenuOpen);
        hapticFeedback('light');
    }

    function closeFabMenu() {
        if (!fabMenuOpen) return;
        fabMenuOpen = false;
        const mainFabBtn = $id('mainFabBtn');
        const fabBackdrop = $id('fabBackdrop');
        if (mainFabBtn) mainFabBtn.classList.remove('open');
        document.querySelectorAll('.fab-speed-item').forEach(el => el.classList.remove('show'));
        if (fabBackdrop) fabBackdrop.classList.remove('show');
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
        document.querySelectorAll('.nav-item').forEach(n => { n.classList.remove('active'); n.removeAttribute('aria-current'); });
        const pageEl = document.getElementById('page-' + pageId);
        if (!pageEl) return;
        pageEl.classList.add('active');

        // Sub-pages show "More" as active nav
        const navId = ['finance','student','journal'].includes(pageId) ? 'more' : pageId;
        const navEl = document.getElementById('nav-' + navId);
        if (navEl) { navEl.classList.add('active'); navEl.setAttribute('aria-current', 'page'); }

        if(pageId === 'add') { loadDraft(); loadCustomTemplates(); }
        if(pageId === 'home') {
            setVal("taskInput", "");
            setTxt("notesInput", "");
            setVal("timeInput", "");
            setVal("repeatInput", "none");
            setVal("priorityInput", "medium");
            setVal("tagsInput", "");
            const asEl = $id("assigneeInput"); if(asEl) asEl.value = "";
            const subtasksContainer = $id("subtasksContainer"); if(subtasksContainer) subtasksContainer.innerHTML = "";
            removeImage(); 
            removeVoiceMemo();
            editId = null; 
            window._editMode = false;
            const customRepeatUI = $id("customRepeatUI"); if(customRepeatUI) customRepeatUI.style.display = "none";
            // Close Advanced Options panel
            const advPanel = $id('advancedOptionsPanel');
            const advArrow = $id('advOptionsArrow');
            if (advPanel) advPanel.style.display = 'none';
            if (advArrow) advArrow.style.transform = '';
            const _sb1 = $id("submitBtn"); if(_sb1) _sb1.innerText = "Save Task"; 
            const _mt2 = $id("modalTitle"); if(_mt2) _mt2.innerText = "New Task";
            setVal("preAlarmInput", "0");
            setVal("categoryOverrideInput", "");
            updateCategoryPreview();
        }
        if (pageId === 'finance') { renderFinanceDashboard(); setFinTab('expenses'); }
        if (pageId === 'student') { renderExamCountdowns(); renderSubjects(); updateStudySubjectSelect(); }
        if (pageId === 'journal') {
            setTxt('journalTodayLabel', new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'}));
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
            const splash = $id('splashScreen');
            if (splash) splash.style.opacity = '0';
            setTimeout(() => { 
                if (splash) splash.style.display = 'none'; 
                if(appPinCode && localStorage.getItem("loggedIn") === "true") { 
                    const _ps = $id("pinScreen"); if(_ps) _ps.style.display = "flex"; 
                } else { 
                    checkMorningBriefing(); 
                }
            }, 500);
        }, 1500);
    });

    document.addEventListener("DOMContentLoaded", () => {
        runSchemaMigrations();
        applyTimeOfDayTheme(); 
        isProUser = localStorage.getItem("isPro") === "true";
        const proBadge = document.getElementById("proBadgeDisplay");
        if(isProUser && proBadge) { proBadge.style.display = "inline-flex"; }
        const appLockToggle = document.getElementById("appLockToggle");
        if(appPinCode && appLockToggle) appLockToggle.checked = true;

        window.addEventListener('offline', () => { 
            const _sst4=document.getElementById("syncStatusText"); if(_sst4) _sst4.innerText = "Offline Mode"; 
            showToast("Working in Offline Mode.", "error"); 
        });
              window.addEventListener('online', () => { 
            setTxt("syncStatusText", "☁️ Syncing..."); 
            showToast("Back online! Syncing...", "success"); 
            syncToCloud(); 
        });
        
        // પેજ ખુલે ત્યારે તરત જ લિસ્ટ અને કેલેન્ડર બતાવો
        loadReminders();
        renderGettingStartedCard();
        renderHomeCalendar();
        renderProjectDropdown();
        renderMoodTracker();
        renderSleepTracker();
        if (typeof renderTodayShiftWidget === 'function') renderTodayShiftWidget();
        setFontSize(localStorage.getItem("appFontSize") || "medium", false);
        const webhookInput = document.getElementById("webhookUrlInput");
        const gcalInput = document.getElementById("gcalClientIdInput");
        if (webhookInput) webhookInput.value = localStorage.getItem("webhookUrl") || "";
        if (gcalInput) gcalInput.value = localStorage.getItem("gcalClientId") || "";
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
        if (currentEnteredPin.length < 4) {
            currentEnteredPin += num;
            const dot = document.getElementById("dot" + currentEnteredPin.length);
            if (dot) dot.style.background = "var(--primary)";
            if (currentEnteredPin.length === 4) {
                setTimeout(async () => {
                    const storedHash = localStorage.getItem("appPinHash");
                    const storedPlain = localStorage.getItem("appPin"); // legacy
                    let correct = false;
                    if (storedHash) {
                        const hash = await sha256(currentEnteredPin);
                        correct = hash === storedHash;
                    } else if (storedPlain) {
                        correct = currentEnteredPin === storedPlain;
                        // Upgrade to hash on first correct entry
                        if (correct) sha256(storedPlain).then(h => { localStorage.setItem("appPinHash", h); localStorage.removeItem("appPin"); });
                    } else {
                        correct = currentEnteredPin === (appPinCode || '');
                    }
                    if (correct) {
                        appPinCode = currentEnteredPin;
                        const ps = document.getElementById("pinScreen");
                        if (ps) ps.style.display = "none";
                        checkMorningBriefing();
                        hapticFeedback('success');
                    } else {
                        showToast("Incorrect PIN!", "error");
                        hapticFeedback('medium');
                        clearPin();
                    }
                }, 200);
            }
        }
    }
    
    function clearPin() { 
        currentEnteredPin = ""; 
        document.querySelectorAll(".pin-dot").forEach(d => d.style.background = ""); 
    }
    
    function deletePin() { 
        if (currentEnteredPin.length > 0) { 
            const dot = document.getElementById("dot" + currentEnteredPin.length);
            if (dot) dot.style.background = "";
            currentEnteredPin = currentEnteredPin.slice(0, -1); 
        } 
    }
    
    function toggleAppLockSetup() {
        const toggle = document.getElementById("appLockToggle");
        if (toggle.checked) {
            const pin = prompt("Enter a 4-digit PIN for App Lock:");
            if (pin && /^\d{4}$/.test(pin)) {
                sha256(pin).then(hash => {
                    appPinCode = pin; // keep in memory for session
                    localStorage.setItem("appPinHash", hash);
                    localStorage.removeItem("appPin"); // remove old plain-text pin
                    showToast("App Lock Enabled! 🔒", "success");
                });
            } else {
                toggle.checked = false;
                showToast("Use exactly 4 digits!", "error");
            }
        } else {
            appPinCode = null;
            localStorage.removeItem("appPin");
            localStorage.removeItem("appPinHash");
            showToast("App Lock Disabled", "info");
        }
    }

    // --- Premium Features ---
    function activatePro() {
        isProUser = true; 
        localStorage.setItem("isPro", "true");
        const pb = document.getElementById("proBadgeDisplay");
        if (pb) pb.style.display = "inline-flex";
        closeModal('proModal'); 
        showToast("Welcome to PRO! 🎉", "success");
    }

    // --- Morning Briefing ---

    // --- Authentication ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user; 
            localStorage.setItem("loggedIn", "true");
            document.getElementById('authScreen').style.display = 'none'; 
            document.getElementById('mainApp').style.display = 'flex';
            switchPage('home');
            if(!appPinCode) showToast("Logged in! Ready.", "success"); 
            // Nudge email/password users to verify (Google sign-in accounts are already verified by Google)
            if (!user.emailVerified && user.providerData.some(p => p.providerId === 'password')) {
                setTimeout(() => showToast("Please verify your email — check your inbox 📧", "warning"), 2500);
            }
            // First-time onboarding (fires once, regardless of signup method)
            if (localStorage.getItem('onboardingComplete') !== 'true') {
                setTimeout(() => openModal('onboardingModal'), 600);
            }
            startCloudSync();
            loadSharedWithMe();
        } else {
            currentUser = null; 
            localStorage.setItem("loggedIn", "false");
            document.getElementById('authScreen').style.display = 'block'; 
            document.getElementById('mainApp').style.display = 'none';
        }
    });

    function resendVerificationEmail() {
        if (!currentUser) return showToast("Not logged in", "error");
        if (currentUser.emailVerified) return showToast("Already verified! ✅", "success");
        currentUser.sendEmailVerification().then(() => {
            showToast("Verification email sent! 📧", "success");
        }).catch((e) => showToast(e.message, "error"));
    }

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
        auth.signInWithRedirect(provider).catch(err => showToast(err.message, "error")); 
    }

    // Handles the result after Google redirects back to the app (signInWithRedirect
    // doesn't resolve inline like signInWithPopup did - it navigates away and back).
    auth.getRedirectResult().then((result) => {
        if (!result || !result.user) return;
        const ref = db.collection("users").doc(result.user.uid);
        ref.get().then(doc => {
            const update = { userName: result.user.displayName };
            if (!doc.exists || !doc.data().uniqueId) {
                update.uniqueId = generateUniqueId();
                update.joinedAt = doc.exists && doc.data().joinedAt ? doc.data().joinedAt : new Date().toISOString();
            }
            if (!doc.exists) { update.userLevel = 1; update.habitXP_tasks = 0; }
            ref.set(update, { merge: true });
            db.collection("public_profiles").doc(result.user.uid).set({
                userName: update.userName,
                habitXP_tasks: update.habitXP_tasks ?? 0,
                uniqueId: update.uniqueId || doc.data()?.uniqueId || null
            }, { merge: true }).catch(() => {});
        });
    }).catch(err => showToast(err.message, "error"));
    
    function registerUser() { 
        const email = document.getElementById("emailInput").value; 
        const password = document.getElementById("passwordInput").value; 
        if(!email || password.length < 6) return showToast("Enter valid email/password", "error"); 
        auth.createUserWithEmailAndPassword(email, password).then((u) => { 
            const uid = generateUniqueId();
            db.collection("users").doc(u.user.uid).set({ reminders: [], habits: [], userLevel: 1, habitXP_tasks: 0, userName: "User", alarmSound: userAlarmSound, voiceAlarm: false, uniqueId: uid, joinedAt: new Date().toISOString() }); 
            db.collection("public_profiles").doc(u.user.uid).set({ userName: "User", habitXP_tasks: 0, uniqueId: uid }).catch(() => {});
            u.user.sendEmailVerification().then(() => {
                showToast("Account created! Check your email to verify. ✉️", "success");
            }).catch(() => {
                showToast("Account created!", "success");
            });
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
    }

    function closeAllModals() {
        document.querySelectorAll('.modal-overlay.active').forEach(m => closeModal(m.id));
    }

    // ACCESSIBILITY: .close-modal-btn elements are <span onclick="">, which are invisible to
    // keyboard/screen-reader users by default (no label, not tabbable, no Enter/Space activation).
    // Patch all of them once, in place, rather than editing every modal's markup individually.
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.close-modal-btn, .nav-item').forEach(btn => {
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
        db.collection("public_profiles").orderBy("habitXP_tasks", "desc").limit(10).get().then((querySnapshot) => {
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
        });
    }

    // --- Full Calendar ---
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
