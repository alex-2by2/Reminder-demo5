// Profile modal edit name, family members (add/remove via unique ID, shared visibility), smart reminders settings, app-start init sequence, morning briefing scheduler.
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".
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
            db.collection('public_profiles').where('uniqueId', '==', id).get().then(snap => {
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
                    <b style="font-size:13px;">${sanitizeHTML(m.name||'')}</b>
                    <br><span style="font-size:11px; color:#8e8e93;">${m.id} · ${m.status === 'connected' ? '🟢 Connected' : '⏳ Pending'}</span>
                </div>
                <button onclick="removeFamilyMember('${m.id}')" style="background:none; border:none; color:#ff3b30; cursor:pointer; font-size:15px;">✖</button>
            </div>`).join('') || emptyStateHTML('👨‍👩‍👧‍👦', 'No family members yet. Add someone using their Unique ID!');
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

    // OFFLINE BACKGROUND SYNC: handled by the consolidated online/offline
    // listener in js/01-core-init.js (this file used to register its own
    // third copy — see CHANGELOG.md — which meant syncToCloud() and the
    // background sync request both ran redundantly on every reconnect).

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
        if (typeof initAnalyticsIfAllowed === 'function') initAnalyticsIfAllowed();
        if (typeof maybeShowCookieBanner === 'function') maybeShowCookieBanner();
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
        const validPages = ['add', 'finance', 'home', 'journal', 'student'];
        if (validPages.includes(action)) {
            document.addEventListener('DOMContentLoaded', () => setTimeout(() => switchPage(action), 500));
        }
    })();


    // ============================================================
    // NOTIFICATION BADGE on nav
    // ============================================================
    function updateNotifBadge() {
        const log = safeStorage('notifLog', []);
        const unread = log.filter(n => !n.read).length;
        [document.getElementById('notifNavBadge'), document.getElementById('notifNavBadge2')].forEach(badge => {
            if (!badge) return;
            badge.style.display = unread > 0 ? 'block' : 'none';
            badge.innerText = unread > 9 ? '9+' : String(unread);
        });
    }

    function markAllNotifsRead() {
        const log = safeStorage('notifLog', []).map(n => ({...n, read:true}));
        localStorage.setItem('notifLog', JSON.stringify(log));
        updateNotifBadge();
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

    // PERFORMANCE: syncToCloud debouncing lives in ONE place now — its own
    // definition in js/01-core-init.js (2000ms). This file used to wrap it
    // in a second, independent 1500ms debounce, so every call actually
    // waited ~3.5s end-to-end across two files for no added benefit — see
    // CHANGELOG.md.

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
            setInterval(checkSmartReminders, (window.APP_CONFIG && window.APP_CONFIG.INTERVALS.SMART_REMINDER_CHECK_MS) || 2 * 60 * 60 * 1000);
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


    // ============================================================
    // SMART IMPORT (Paste text → AI detects tasks)
    // ============================================================
    async function pasteFromClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            const el = document.getElementById('smartImportInput');
            if (el) { el.value = text; showToast('Pasted from clipboard!', 'success'); }
        } catch(e) {
            showToast('Allow clipboard access or paste manually', 'info');
        }
    }

    async function runSmartImport() {
        const text = document.getElementById('smartImportInput')?.value.trim();
        if (!text) return showToast('Paste some text first!', 'error');

        const resultsEl = document.getElementById('smartImportResults');
        if (resultsEl) resultsEl.innerHTML = '<p style="text-align:center;color:#8e8e93;padding:20px;">🪄 AI analyzing...</p>';

        try {
            const prompt = `Extract tasks/reminders from this text. Return ONLY valid JSON array like: [{"task":"title","time":"YYYY-MM-DDTHH:MM","priority":"high|medium|low","notes":"optional"}]. Use today's date (${getTodayStr()}) for relative dates like "tomorrow". If no time found, use 09:00. Text: ${text}`;
            const reply = await callGeminiAI(prompt);
            const clean = reply.replace(/```json|```/g,'').trim();
            const tasks = JSON.parse(clean);

            if (!resultsEl) return;
            if (!tasks.length) {
                resultsEl.innerHTML = emptyStateHTML('🤔', 'No tasks detected. Try with more specific text.');
                return;
            }

            window._importedTasks = tasks;
            resultsEl.innerHTML = `<h5 style="font-size:11px;color:#8e8e93;font-weight:700;text-transform:uppercase;margin:0 0 10px;">Found ${tasks.length} task(s)</h5>` +
                tasks.map((t, i) => `
                    <div style="background:#f2f2f7;border-radius:12px;padding:12px;margin-bottom:8px;display:flex;align-items:flex-start;gap:10px;">
                        <input type="checkbox" checked id="imp_${i}" style="margin:2px 0 0;flex-shrink:0;width:18px;height:18px;">
                        <div style="flex:1;">
                            <b style="font-size:13px;">${sanitizeHTML(t.task)}</b>
                            <br><span style="font-size:11px;color:#8e8e93;">${t.time||'No time'} · ${t.priority||'medium'}</span>
                            ${t.notes ? `<br><span style="font-size:11px;color:#8e8e93;font-style:italic;">${sanitizeHTML(t.notes)}</span>` : ''}
                        </div>
                    </div>`).join('') +
                `<button onclick="confirmSmartImport()" style="background:#34c759;color:white;border:none;border-radius:10px;padding:12px;width:100%;font-weight:700;cursor:pointer;margin-top:8px;">✅ Import Selected Tasks</button>`;

            hapticFeedback('success');
        } catch(e) {
            if (resultsEl) resultsEl.innerHTML = !currentUser
                ? '<p style="text-align:center;color:#8e8e93;">Sign in to use AI Import!</p><p style="text-align:center;font-size:12px;color:#8e8e93;margin-top:8px;">Or paste one task per line and click manual import.</p><button onclick="manualImport()" style="background:var(--primary);color:white;border:none;border-radius:10px;padding:10px;width:100%;font-weight:700;cursor:pointer;margin-top:8px;">📝 Manual Line-by-Line Import</button>'
                : `<p style="text-align:center;color:#ff3b30;">Error: ${sanitizeHTML(e.message)}</p>`;
        }
    }

    function manualImport() {
        const text = document.getElementById('smartImportInput')?.value.trim();
        if (!text) return showToast('No text to import!', 'error');
        const lines = text.split('\n').map(l => l.trim().replace(/^[-•*✓✗\d.]+\s*/, '')).filter(l => l.length > 2);
        const todayStr = getTodayStr();
        const tasks = lines.map(l => ({ task: l, time: todayStr + 'T09:00', priority: 'medium' }));
        window._importedTasks = tasks;
        const resultsEl = document.getElementById('smartImportResults');
        if (!resultsEl) return;
        resultsEl.innerHTML = `<h5 style="font-size:11px;color:#8e8e93;font-weight:700;text-transform:uppercase;margin:0 0 10px;">${tasks.length} line(s) found</h5>` +
            tasks.map((t, i) => `<div style="background:#f2f2f7;border-radius:10px;padding:10px;margin-bottom:6px;display:flex;align-items:center;gap:8px;"><input type="checkbox" checked id="imp_${i}" style="width:18px;height:18px;flex-shrink:0;"><span style="font-size:13px;flex:1;">${sanitizeHTML(t.task)}</span></div>`).join('') +
            `<button onclick="confirmSmartImport()" style="background:#34c759;color:white;border:none;border-radius:10px;padding:12px;width:100%;font-weight:700;cursor:pointer;margin-top:8px;">✅ Import</button>`;
    }

    function confirmSmartImport() {
        const tasks = window._importedTasks || [];
        const reminders = safeStorage('reminders', []);
        let added = 0;
        tasks.forEach((t, i) => {
            const cb = document.getElementById('imp_' + i);
            if (cb && !cb.checked) return;
            reminders.unshift({
                id: Date.now() + i, task: t.task.slice(0, 200), time: t.time || (getTodayStr() + 'T09:00'),
                priority: t.priority || 'medium', repeat: 'none', status: 'pending',
                notified: false, pinned: false, notes: t.notes || '', tags: '', preAlarm: 0,
                category: { name: 'Task', icon: '📋' }
            });
            added++;
        });
        localStorage.setItem('reminders', JSON.stringify(reminders));
        syncToCloud();
        loadReminders();
        closeModal('smartImportModal');
        hapticFeedback('success');
        showToast(added + ' task(s) imported! ✅', 'success');
    }

    // ============================================================
