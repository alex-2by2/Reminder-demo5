// Khata Book (ledger), More-page search/pin, Subtasks, Print, Custom templates load, Profile edit, Family members, Smart reminders settings, Offline background sync, app-start init, URL deeplink handler, Morning briefing scheduler, Debounce, Virtual list, Multi-language labels, Weekly planner, Task statistics modal, Duplicate task, global keyboard shortcuts, Share task, Swipe-to-complete.

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
                    <b style="font-size:14px;">${sanitizeHTML(p.name||'')}</b>
                    ${p.phone ? `<br><span style="font-size:11px; color:#8e8e93;">${sanitizeHTML(p.phone)}</span>` : ''}
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
                    ${e.note ? `<br><span style="color:#8e8e93; font-style:italic;">${sanitizeHTML(e.note)}</span>` : ''}
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

    function toggleOnboardingChip(btn) {
        btn.classList.toggle('active');
        hapticFeedback('light');
    }

    function finishOnboarding() {
        const chips = document.querySelectorAll('#onboardingChips .onboarding-chip.active');
        let pins = getMorePins();
        chips.forEach(chip => {
            try {
                const data = JSON.parse(chip.getAttribute('data-pin'));
                if (!pins.some(p => p.id === data.id) && pins.length < 6) pins.push(data);
            } catch(e) {}
        });
        localStorage.setItem('morePinnedFeatures', JSON.stringify(pins));
        localStorage.setItem('onboardingComplete', 'true');
        renderMorePinned();
        closeModal('onboardingModal');
        syncToCloud();
        renderGettingStartedCard();
        showToast(chips.length ? `Pinned ${chips.length} feature${chips.length > 1 ? 's' : ''} to Quick Access! ⭐` : 'Welcome aboard! 🎉', 'success');
    }

    function skipOnboarding() {
        localStorage.setItem('onboardingComplete', 'true');
        closeModal('onboardingModal');
        renderGettingStartedCard();
    }

    function renderGettingStartedCard() {
        const container = document.getElementById('gettingStartedCard');
        if (!container) return;
        if (localStorage.getItem('onboardingChecklistDismissed') === 'true') {
            container.innerHTML = ''; container.style.display = 'none'; return;
        }
        const reminders = safeStorage('reminders', []);
        const habits = safeStorage('habits', []);
        const pins = getMorePins();
        const steps = [
            { done: reminders.length > 0, label: 'Add your first task', action: "switchPage('add')" },
            { done: habits.length > 0, label: 'Start a habit to build', action: "document.getElementById('habitInput')?.focus()" },
            { done: pins.length > 0, label: 'Check out your pinned features', action: "switchPage('more')" }
        ];
        if (steps.every(s => s.done)) {
            container.innerHTML = ''; container.style.display = 'none';
            localStorage.setItem('onboardingChecklistDismissed', 'true');
            return;
        }
        container.style.display = 'block';
        container.innerHTML = `<div style="background:linear-gradient(135deg, var(--primary), #5e5ce6); border-radius:16px; padding:16px; margin-bottom:15px; color:white; position:relative;">
            <span onclick="dismissGettingStarted()" role="button" tabindex="0" aria-label="Dismiss" style="position:absolute; top:10px; right:12px; cursor:pointer; opacity:0.8; font-size:14px;">✖</span>
            <h5 style="margin:0 0 10px; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; opacity:0.9;">🚀 Getting Started</h5>
            ${steps.map(s => `<div ${s.done ? '' : `onclick="${s.action}" role="button" tabindex="0"`} style="display:flex; align-items:center; gap:10px; padding:8px 0; ${s.done ? '' : 'cursor:pointer;'}">
                <span style="width:20px;height:20px;border-radius:50%;background:${s.done ? '#34c759' : 'rgba(255,255,255,0.25)'};display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;">${s.done ? '✓' : ''}</span>
                <span style="font-size:13px; ${s.done ? 'text-decoration:line-through;opacity:0.7;' : 'font-weight:600;'}">${sanitizeHTML(s.label)}</span>
            </div>`).join('')}
        </div>`;
    }

    function dismissGettingStarted() {
        localStorage.setItem('onboardingChecklistDismissed', 'true');
        renderGettingStartedCard();
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
                <td style="padding:8px;border-bottom:1px solid #eee;">${sanitizeHTML(r.task||'')}</td>
                <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${dt}</td>
                <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${r.priority||'medium'}</td>
                <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">[ ]</td>
            </tr>`;
        }).join('');

        const habitRows = habits.map(h => `<tr>
            <td style="padding:8px;border-bottom:1px solid #eee;">${sanitizeHTML(h.icon||'')} ${sanitizeHTML(h.name||'')}</td>
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
                resultsEl.innerHTML = '<p style="text-align:center;color:#8e8e93;">No tasks detected. Try with more specific text.</p>';
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
    // WEEKLY PLANNER
    // ============================================================
    let weeklyPlannerSelectedDate = getTodayStr();

    function openWeeklyPlanner() {
        renderWeeklyPlanner();
        openModal('weeklyPlannerModal');
    }

    function renderWeeklyPlanner() {
        const grid = document.getElementById('weeklyPlannerGrid');
        const tasksEl = document.getElementById('weeklyPlannerTasks');
        if (!grid || !tasksEl) return;

        const today = new Date(); today.setHours(0,0,0,0);
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday

        const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const reminders = safeStorage('reminders', []);
        const colors = ['#ff3b30','#ff9500','#34c759','#007aff','#5e5ce6','#ff2d55','#af52de'];

        grid.innerHTML = '';
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i);
            const dStr = formatDateLocal(d);
            const taskCount = reminders.filter(r => r.time?.startsWith(dStr) && r.status !== 'completed').length;
            const isToday = dStr === getTodayStr();
            const isSelected = dStr === weeklyPlannerSelectedDate;

            const btn = document.createElement('div');
            btn.onclick = () => { weeklyPlannerSelectedDate = dStr; renderWeeklyPlanner(); };
            btn.style.cssText = `text-align:center;padding:8px 4px;border-radius:12px;cursor:pointer;background:${isSelected ? 'var(--primary)' : isToday ? '#e5f1ff' : '#f2f2f7'};color:${isSelected ? 'white' : '#1c1c1e'};border:${isToday && !isSelected ? '2px solid var(--primary)' : '2px solid transparent'};`;
            btn.innerHTML = `<div style="font-size:9px;font-weight:700;opacity:${isSelected?1:0.7};text-transform:uppercase;">${dayNames[i]}</div><div style="font-size:18px;font-weight:800;margin:2px 0;">${d.getDate()}</div>${taskCount > 0 ? `<div style="font-size:8px;background:${isSelected?'rgba(255,255,255,0.3)':colors[i]};color:white;border-radius:6px;padding:1px 4px;font-weight:700;">${taskCount}</div>` : '<div style="height:14px;"></div>'}`;
            grid.appendChild(btn);
        }

        // Show tasks for selected date
        const dayTasks = reminders.filter(r => r.time?.startsWith(weeklyPlannerSelectedDate)).sort((a,b) => new Date(a.time)-new Date(b.time));
        const selectedDt = new Date(weeklyPlannerSelectedDate + 'T00:00:00');
        const selectedLabel = selectedDt.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'});

        tasksEl.innerHTML = `<h5 style="font-size:13px;font-weight:700;margin:8px 0 10px;">${selectedLabel}</h5>` +
            (dayTasks.length ? dayTasks.map(t => `
                <div style="display:flex;align-items:center;gap:10px;padding:10px;background:#f2f2f7;border-radius:12px;margin-bottom:8px;border-left:4px solid ${t.priority==='high'?'#ff3b30':t.priority==='low'?'#34c759':'#ff9500'};">
                    <input type="checkbox" ${t.status==='completed'?'checked':''} onchange="toggleStatus(${t.id}); renderWeeklyPlanner();" style="width:18px;height:18px;flex-shrink:0;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:13px;font-weight:600;${t.status==='completed'?'text-decoration:line-through;opacity:0.5':''}">${sanitizeHTML(t.task)}</div>
                        <div style="font-size:11px;color:#8e8e93;">${new Date(t.time).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                    <button onclick="editReminder(${t.id});closeModal('weeklyPlannerModal');" style="background:none;border:none;cursor:pointer;font-size:16px;opacity:0.5;">✏️</button>
                </div>`).join('')
            : '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:20px;">No tasks for this day. Tap + to add!</p>');
    }

    // ============================================================
    // HABIT CALENDAR MODAL (full history view)
    // ============================================================
    let habitCalYear = new Date().getFullYear();
    let habitCalMonth = new Date().getMonth();
    let selectedHabitId = null;

    function openHabitCalendarModal() {
        const habits = safeStorage('habits', []);
        const sel = document.getElementById('habitCalSelect');
        if (sel) {
            sel.innerHTML = '<option value="">Select a habit...</option>' +
                habits.map(h => `<option value="${h.id}">${sanitizeHTML(h.name||'')}</option>`).join('');
        }
        habitCalYear = new Date().getFullYear();
        habitCalMonth = new Date().getMonth();
        renderHabitCalendarModal();
        openModal('habitCalendarModal');
    }

    function changeHabitCalMonth(dir) {
        habitCalMonth += dir;
        if (habitCalMonth > 11) { habitCalMonth = 0; habitCalYear++; }
        if (habitCalMonth < 0) { habitCalMonth = 11; habitCalYear--; }
        renderHabitCalendarModal();
    }

    function renderHabitCalendarModal() {
        const sel = document.getElementById('habitCalSelect');
        selectedHabitId = sel ? Number(sel.value) : null;
        const habits = safeStorage('habits', []);
        const habit = habits.find(h => h.id === selectedHabitId);

        const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        const displayEl = document.getElementById('habitCalMonthDisplay');
        if (displayEl) displayEl.innerText = `${monthNames[habitCalMonth]} ${habitCalYear}`;

        const grid = document.getElementById('habitCalGrid');
        const stats = document.getElementById('habitCalStats');
        if (!grid) return;

        if (!habit) {
            grid.innerHTML = '<p style="text-align:center;color:#8e8e93;font-size:13px;grid-column:span 7;">Select a habit above</p>';
            if (stats) stats.innerHTML = '';
            return;
        }

        const history = habit.history || [];
        const firstDay = new Date(habitCalYear, habitCalMonth, 1).getDay();
        const daysInMonth = new Date(habitCalYear, habitCalMonth + 1, 0).getDate();
        const todayStr = getTodayStr();

        let checkIns = 0;
        let html = '';

        // Empty cells for first day offset
        for (let i = 0; i < firstDay; i++) html += '<div></div>';

        for (let d = 1; d <= daysInMonth; d++) {
            const dStr = `${habitCalYear}-${String(habitCalMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const done = history.includes(dStr) || (habit.lastCheckIn === dStr);
            const isToday = dStr === todayStr;
            const isFuture = dStr > todayStr;
            if (done) checkIns++;

            html += `<div style="aspect-ratio:1;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;cursor:pointer;${
                done ? 'background:var(--primary);color:white;' :
                isToday ? 'background:#e5f1ff;color:var(--primary);border:2px solid var(--primary);' :
                isFuture ? 'background:#f2f2f7;color:#c7c7cc;' :
                'background:#ffe5e5;color:#ff3b30;'
            }" onclick="toggleHabitDayManual('${dStr}','${habit.id}')">${d}</div>`;
        }
        grid.innerHTML = html;

        const rate = Math.round((checkIns / Math.max(1, daysInMonth - (daysInMonth - Math.min(daysInMonth, new Date().getDate())))) * 100);
        if (stats) stats.innerHTML = `
            <div class="stat-box"><div class="stat-num" style="color:var(--primary);">${checkIns}</div><div class="stat-lbl">Check-ins</div></div>
            <div class="stat-box"><div class="stat-num" style="color:#34c759;">${habit.streak||0}🔥</div><div class="stat-lbl">Streak</div></div>
            <div class="stat-box"><div class="stat-num" style="color:#ff9500;">${rate}%</div><div class="stat-lbl">Rate</div></div>`;
    }

    function toggleHabitDayManual(dateStr, habitId) {
        if (dateStr > getTodayStr()) return showToast("Can't mark future dates!", 'error');
        const habits = safeStorage('habits', []);
        const habit = habits.find(h => h.id === Number(habitId));
        if (!habit) return;
        if (!habit.history) habit.history = [];
        const idx = habit.history.indexOf(dateStr);
        if (idx > -1) habit.history.splice(idx, 1);
        else habit.history.push(dateStr);
        localStorage.setItem('habits', JSON.stringify(habits));
        syncToCloud();
        hapticFeedback('light');
        renderHabitCalendarModal();
    }

    // ============================================================
    // TASK STATISTICS MODAL
    // ============================================================
    function openTaskStatsModal() {
        renderTaskStats();
        openModal('taskStatsModal');
    }

    function renderTaskStats() {
        const el = document.getElementById('taskStatsContent');
        if (!el) return;

        const reminders = safeStorage('reminders', []);
        const now = new Date();
        const todayStr = getTodayStr();
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate()-7);
        const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

        const total = reminders.length;
        const completed = reminders.filter(r => r.status === 'completed').length;
        const overdue = reminders.filter(r => r.status !== 'completed' && r.time && new Date(r.time) < now).length;
        const thisWeek = reminders.filter(r => r.status === 'completed' && new Date(r.time||r.id) >= weekAgo).length;
        const thisMonth = reminders.filter(r => r.time?.startsWith(monthStr) && r.status === 'completed').length;
        const rate = total ? Math.round((completed/total)*100) : 0;

        // Priority breakdown
        const highTotal = reminders.filter(r => r.priority==='high').length;
        const highDone = reminders.filter(r => r.priority==='high' && r.status==='completed').length;
        const medTotal = reminders.filter(r => r.priority==='medium'||!r.priority).length;
        const medDone = reminders.filter(r => (r.priority==='medium'||!r.priority) && r.status==='completed').length;

        // Category breakdown (top 5)
        const cats = {};
        reminders.forEach(r => { const c = r.category?.name || 'Task'; cats[c] = (cats[c]||0)+1; });
        const topCats = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,5);

        // Most productive day
        const dayCount = [0,0,0,0,0,0,0];
        reminders.filter(r => r.status==='completed').forEach(r => {
            if (r.time) dayCount[new Date(r.time).getDay()]++;
        });
        const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const bestDay = dayNames[dayCount.indexOf(Math.max(...dayCount))];

        el.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;">
                <div class="stat-box"><div class="stat-num">${total}</div><div class="stat-lbl">Total Tasks</div></div>
                <div class="stat-box"><div class="stat-num" style="color:#34c759;">${completed}</div><div class="stat-lbl">Completed</div></div>
                <div class="stat-box"><div class="stat-num" style="color:#ff3b30;">${overdue}</div><div class="stat-lbl">Overdue</div></div>
                <div class="stat-box"><div class="stat-num" style="color:#ff9500;">${rate}%</div><div class="stat-lbl">Success Rate</div></div>
            </div>

            <div style="background:#f2f2f7;border-radius:14px;padding:14px;margin-bottom:15px;">
                <h5 style="font-size:11px;color:#8e8e93;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;margin:0 0 10px;">This Period</h5>
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e5e5ea;"><span style="font-size:13px;">This Week</span><b>${thisWeek} done</b></div>
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e5e5ea;"><span style="font-size:13px;">This Month</span><b>${thisMonth} done</b></div>
                <div style="display:flex;justify-content:space-between;padding:6px 0;"><span style="font-size:13px;">Best Day</span><b>${bestDay} 🌟</b></div>
            </div>

            <div style="background:#f2f2f7;border-radius:14px;padding:14px;margin-bottom:15px;">
                <h5 style="font-size:11px;color:#8e8e93;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;margin:0 0 10px;">By Priority</h5>
                <div style="margin-bottom:8px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:12px;font-weight:700;">🔴 High</span><span style="font-size:12px;color:#8e8e93;">${highDone}/${highTotal}</span></div>
                    <div style="background:#e5e5ea;border-radius:6px;height:6px;"><div style="background:#ff3b30;border-radius:6px;height:100%;width:${highTotal?Math.round(highDone/highTotal*100):0}%;"></div></div>
                </div>
                <div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:12px;font-weight:700;">🟡 Medium</span><span style="font-size:12px;color:#8e8e93;">${medDone}/${medTotal}</span></div>
                    <div style="background:#e5e5ea;border-radius:6px;height:6px;"><div style="background:#ff9500;border-radius:6px;height:100%;width:${medTotal?Math.round(medDone/medTotal*100):0}%;"></div></div>
                </div>
            </div>

            <div style="background:#f2f2f7;border-radius:14px;padding:14px;">
                <h5 style="font-size:11px;color:#8e8e93;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;margin:0 0 10px;">Top Categories</h5>
                ${topCats.map(([cat, count]) => `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e5e5ea;font-size:13px;"><span>${cat}</span><b>${count} tasks</b></div>`).join('')}
            </div>`;
    }

    // ============================================================
    // DUPLICATE / COPY TASK
    // ============================================================
    function duplicateTask(id) {
        const reminders = safeStorage('reminders', []);
        const original = reminders.find(r => r.id === id);
        if (!original) return showToast('Task not found!', 'error');
        const copy = { ...original, id: Date.now(), task: original.task + ' (copy)', status: 'pending', notified: false, pinned: false };
        reminders.unshift(copy);
        localStorage.setItem('reminders', JSON.stringify(reminders));
        loadReminders();
        syncToCloud();
        hapticFeedback('success');
        showToast('Task duplicated! ✅', 'success');
    }

    // ============================================================
    // KEYBOARD SHORTCUTS (global)
    // ============================================================
    document.addEventListener('keydown', e => {
        if (['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
        if (e.key === '/' || (e.key === 'f' && !e.ctrlKey)) { e.preventDefault(); openGlobalSearch(); }
        if (e.key === 'n' && !e.ctrlKey) { e.preventDefault(); switchPage('add'); }
        if (e.key === 'h') switchPage('home');
        if (e.key === 'm') switchPage('more');
        if (e.key === 'Escape') closeAllModals();
        if (e.key === '1') changeTab('upcoming');
        if (e.key === '2') changeTab('today');
        if (e.key === '3') changeTab('done');
        if (e.key === '4') changeTab('all');
    });

    // ============================================================
    // SHARE TASK (native share API)
    // ============================================================
    function shareTask(id) {
        const reminders = safeStorage('reminders', []);
        const task = reminders.find(r => r.id === id);
        if (!task) return;
        const text = `Task: ${task.task}\nDue: ${task.time ? new Date(task.time).toLocaleString('en-IN') : 'No date'}\nPriority: ${task.priority||'medium'}`;
        if (navigator.share) {
            navigator.share({ title: 'Shared Task', text }).catch(()=>{});
        } else {
            navigator.clipboard?.writeText(text).then(() => showToast('Task copied to clipboard!', 'success'));
        }
    }

    // ============================================================
    // SWIPE TO COMPLETE (touch gesture on task cards)
    // ============================================================
    function addSwipeToComplete(element, taskId) {
        let startX = 0;
        element.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
        element.addEventListener('touchend', e => {
            const diff = e.changedTouches[0].clientX - startX;
            if (diff > 80) { toggleStatus(taskId); hapticFeedback('success'); }
            else if (diff < -80) { togglePin(taskId); hapticFeedback('light'); }
        }, { passive: true });
    }

