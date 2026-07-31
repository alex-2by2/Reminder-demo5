// Speed-dial FAB menu, page switching/navigation, app-lock PIN, Firebase auth (Google/email login, register, logout, password reset), unique ID generation, email verification.
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".
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

        // CONSOLIDATED: this used to be three separate online/offline handler
        // pairs spread across js/01, js/06 and js/08 (each added independently,
        // none aware of the others). Net effect was 2-3 overlapping toasts and
        // up to 3 simultaneous syncToCloud() calls every time connectivity
        // changed. This single pair now does everything all three used to do.
        window.addEventListener('offline', () => {
            const _sst4 = document.getElementById("syncStatusText"); if (_sst4) _sst4.innerText = "Offline Mode";
            const _banner = document.getElementById('offlineBanner'); if (_banner) _banner.classList.add('show');
            showToast("Working in Offline Mode.", "error");
        });
        window.addEventListener('online', () => {
            setTxt("syncStatusText", "☁️ Syncing...");
            const _banner = document.getElementById('offlineBanner'); if (_banner) _banner.classList.remove('show');
            showToast("Back online! Syncing...", "success");
            syncToCloud();
            if (window.requestBackgroundSync) window.requestBackgroundSync('sync-reminders');
        });
        
        // પેજ ખુલે ત્યારે તરત જ લિસ્ટ અને કેલેન્ડર બતાવો
        loadReminders();
        renderGettingStartedCard();
        renderHomeCalendar();
        renderProjectDropdown();
        renderMoodTracker();
        renderSleepTracker();
        if (typeof renderTodayShiftWidget === 'function') renderTodayShiftWidget();
        if (typeof renderHomeMoodWidget === 'function') renderHomeMoodWidget();
        if (typeof renderHealthSnapshotWidget === 'function') renderHealthSnapshotWidget();
        if (typeof renderFinanceSnapshotWidget === 'function') renderFinanceSnapshotWidget();
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
