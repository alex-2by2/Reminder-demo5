// "More" page search & pin system, subtasks helpers, date label, print improvements, custom template loading on Add page.
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".
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
                    <span style="font-size:22px; display:block; margin-bottom:4px;">${sanitizeHTML(p.icon||'')}</span>
                    <span style="font-size:10px; font-weight:700;">${sanitizeHTML(p.label||'')}</span>
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
        if (!isOpen && typeof refreshPremiumThemeLocks === 'function') refreshPremiumThemeLocks();
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
            mood: 'todayMoodSection',
            shift: 'todayShiftCard',
            healthsnapshot: 'healthSnapshotWidget',
            financesnapshot: 'financeSnapshotWidget',
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
