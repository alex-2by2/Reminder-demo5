// Period / Cycle Tracker — logs period start/end dates, tracks daily symptoms,
// and predicts next period, ovulation, and fertile window from cycle history.
// New module — added post-refactor, follows the same conventions as the
// 01-08 files (safeStorage/localStorage, syncToCloud, modal pattern).

    const CYCLE_SYMPTOMS = ['Cramps', 'Headache', 'Mood swings', 'Bloating', 'Fatigue', 'Acne', 'Tender breasts', 'Backache', 'Nausea', 'Cravings'];
    const CYCLE_DEFAULTS = { avgCycleLength: 28, avgPeriodLength: 5, manualOverride: false };

    // ------------------------------------------------------------------
    // DATA HELPERS
    // ------------------------------------------------------------------
    function getCyclePeriods() {
        return safeStorage('cyclePeriods', []).slice().sort((a, b) => a.start.localeCompare(b.start));
    }

    function getCycleSymptoms() {
        return safeStorage('cycleSymptoms', {});
    }

    function getCycleSettings() {
        return Object.assign({}, CYCLE_DEFAULTS, safeStorage('cycleSettings', {}));
    }

    function saveCycleSettings(settings) {
        localStorage.setItem('cycleSettings', JSON.stringify(settings));
    }

    // ------------------------------------------------------------------
    // LOGGING
    // ------------------------------------------------------------------
    function logPeriodStart() {
        const periods = getCyclePeriods();
        const today = getTodayStr();
        const open = periods.find(p => !p.end);
        if (open) { showToast('A period is already logged as ongoing — log its end first, or undo it below.', 'error'); return; }
        if (periods.some(p => p.start === today)) { showToast('Already logged for today.', 'info'); return; }
        periods.push({ start: today, end: null });
        localStorage.setItem('cyclePeriods', JSON.stringify(periods));
        syncToCloud();
        renderCycleTracker();
        hapticFeedback && hapticFeedback('light');
        showToast('🌸 Period start logged', 'success');
    }

    function logPeriodEnd() {
        const periods = getCyclePeriods();
        const open = periods.find(p => !p.end);
        if (!open) { showToast('No ongoing period to end — log a start first.', 'error'); return; }
        const today = getTodayStr();
        if (today < open.start) { showToast('End date can\'t be before the start date.', 'error'); return; }
        open.end = today;
        localStorage.setItem('cyclePeriods', JSON.stringify(periods));
        syncToCloud();
        renderCycleTracker();
        hapticFeedback && hapticFeedback('light');
        showToast('Period end logged', 'success');
    }

    function undoLastCycleLog() {
        const periods = getCyclePeriods();
        if (!periods.length) return;
        periods.pop();
        localStorage.setItem('cyclePeriods', JSON.stringify(periods));
        syncToCloud();
        renderCycleTracker();
        showToast('Last entry undone', 'info');
    }

    function toggleCycleSymptom(symptom) {
        const today = getTodayStr();
        const symptoms = getCycleSymptoms();
        const list = symptoms[today] || [];
        const idx = list.indexOf(symptom);
        if (idx > -1) list.splice(idx, 1); else list.push(symptom);
        if (list.length) symptoms[today] = list; else delete symptoms[today];
        localStorage.setItem('cycleSymptoms', JSON.stringify(symptoms));
        syncToCloud();
        renderCycleSymptomChips();
    }

    function setCycleManualAverage(field, value) {
        const settings = getCycleSettings();
        const n = parseInt(value, 10);
        if (isNaN(n) || n < 1 || n > 90) return;
        settings[field] = n;
        settings.manualOverride = true;
        saveCycleSettings(settings);
        syncToCloud();
        renderCycleTracker();
    }

    function toggleCycleManualOverride(checked) {
        const settings = getCycleSettings();
        settings.manualOverride = !!checked;
        saveCycleSettings(settings);
        renderCycleTracker();
    }

    // ------------------------------------------------------------------
    // PREDICTION MATH
    // ------------------------------------------------------------------
    function daysBetween(a, b) {
        return Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 86400000);
    }

    function computeCycleAverages(periods) {
        const settings = getCycleSettings();
        if (settings.manualOverride) {
            return { avgCycleLength: settings.avgCycleLength, avgPeriodLength: settings.avgPeriodLength, source: 'manual' };
        }
        const starts = periods.map(p => p.start);
        const gaps = [];
        for (let i = 1; i < starts.length; i++) gaps.push(daysBetween(starts[i - 1], starts[i]));
        const recentGaps = gaps.slice(-6).filter(g => g >= 15 && g <= 60);
        const avgCycleLength = recentGaps.length ? Math.round(recentGaps.reduce((a, b) => a + b, 0) / recentGaps.length) : CYCLE_DEFAULTS.avgCycleLength;

        const completed = periods.filter(p => p.end).slice(-6);
        const lengths = completed.map(p => daysBetween(p.start, p.end) + 1).filter(l => l >= 1 && l <= 14);
        const avgPeriodLength = lengths.length ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : CYCLE_DEFAULTS.avgPeriodLength;

        return { avgCycleLength, avgPeriodLength, source: gaps.length ? 'calculated' : 'default' };
    }

    function getCyclePrediction() {
        const periods = getCyclePeriods();
        const { avgCycleLength, avgPeriodLength, source } = computeCycleAverages(periods);
        if (!periods.length) return { hasData: false, avgCycleLength, avgPeriodLength, source };

        const last = periods[periods.length - 1];
        const today = getTodayStr();
        const cycleDay = daysBetween(last.start, today) + 1;

        const nextPeriodDate = new Date(last.start + 'T00:00');
        nextPeriodDate.setDate(nextPeriodDate.getDate() + avgCycleLength);
        const nextPeriodStr = nextPeriodDate.toISOString().split('T')[0];
        const daysUntilNext = daysBetween(today, nextPeriodStr);

        const ovulationDayIdx = Math.max(1, avgCycleLength - 14); // day-of-cycle, 1-indexed
        const ovulation = new Date(last.start + 'T00:00');
        ovulation.setDate(ovulation.getDate() + ovulationDayIdx - 1);
        const fertileStart = new Date(ovulation); fertileStart.setDate(fertileStart.getDate() - 5);
        const fertileEnd = new Date(ovulation); fertileEnd.setDate(fertileEnd.getDate() + 1);

        let phase = 'luteal';
        const open = !last.end && cycleDay <= avgPeriodLength + 3;
        if (open || cycleDay <= avgPeriodLength) phase = 'menstrual';
        else if (cycleDay < ovulationDayIdx - 2) phase = 'follicular';
        else if (cycleDay <= ovulationDayIdx + 1) phase = 'ovulation';

        return {
            hasData: true, cycleDay, avgCycleLength, avgPeriodLength, source,
            nextPeriodDate: nextPeriodStr, daysUntilNext,
            ovulationDate: ovulation.toISOString().split('T')[0],
            fertileStart: fertileStart.toISOString().split('T')[0],
            fertileEnd: fertileEnd.toISOString().split('T')[0],
            phase, isOngoing: !last.end
        };
    }

    // ------------------------------------------------------------------
    // RENDER
    // ------------------------------------------------------------------
    const PHASE_LABEL = { menstrual: '🌸 Period', follicular: '🌱 Follicular', ovulation: '🥚 Ovulation', luteal: '🌙 Luteal' };

    function openCycleModal() {
        renderCycleTracker();
        openModal('cycleTrackerModal');
    }

    function renderCycleTracker() {
        const c = document.getElementById('cycleTrackerContent');
        if (!c) return;
        const p = getCyclePrediction();
        const periods = getCyclePeriods();
        const open = periods.find(pd => !pd.end);

        let statsHtml;
        if (!p.hasData) {
            statsHtml = `<p style="font-size:13px; color:#8e8e93; text-align:center; padding:10px 0;">No periods logged yet. Tap "Log Period Start" below to begin tracking.</p>`;
        } else {
            statsHtml = `<div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px;">
                <div style="flex:1; min-width:100px; background:var(--card-bg,#f7f7f9); border-radius:12px; padding:10px; text-align:center;">
                    <div style="font-size:11px; color:#8e8e93;">Cycle Day</div>
                    <div style="font-size:20px; font-weight:700;">${p.cycleDay}</div>
                </div>
                <div style="flex:1; min-width:100px; background:var(--card-bg,#f7f7f9); border-radius:12px; padding:10px; text-align:center;">
                    <div style="font-size:11px; color:#8e8e93;">Phase</div>
                    <div style="font-size:15px; font-weight:700;">${PHASE_LABEL[p.phase]}</div>
                </div>
                <div style="flex:1; min-width:100px; background:var(--card-bg,#f7f7f9); border-radius:12px; padding:10px; text-align:center;">
                    <div style="font-size:11px; color:#8e8e93;">Next Period</div>
                    <div style="font-size:14px; font-weight:700;">${p.daysUntilNext >= 0 ? `in ${p.daysUntilNext}d` : `${Math.abs(p.daysUntilNext)}d late`}</div>
                </div>
            </div>
            <p style="font-size:12px; color:#8e8e93; margin:0 0 14px;">Predicted fertile window: <b>${p.fertileStart}</b> to <b>${p.fertileEnd}</b> (estimate — ovulation timing varies).</p>`;
        }

        const logButtons = `<div style="display:flex; gap:8px; margin-bottom:14px;">
            <button onclick="logPeriodStart()" ${open ? 'disabled' : ''} style="flex:1; ${open ? 'opacity:0.5;' : ''}">🌸 Log Period Start</button>
            <button onclick="logPeriodEnd()" ${!open ? 'disabled' : ''} style="flex:1; ${!open ? 'opacity:0.5;' : ''}">✅ Log Period End</button>
        </div>
        ${periods.length ? `<div style="text-align:right; margin:-8px 0 14px;"><span onclick="undoLastCycleLog()" role="button" tabindex="0" style="font-size:12px; color:#ff3b30; cursor:pointer;">Undo last entry</span></div>` : ''}`;

        const settings = getCycleSettings();
        const historyRows = periods.slice(-6).reverse().map((pd, i, arr) => {
            const len = pd.end ? (daysBetween(pd.start, pd.end) + 1) + 'd' : 'ongoing';
            return `<div style="display:flex; justify-content:space-between; padding:6px 0; font-size:13px; border-bottom:1px solid var(--border-color,#e5e5ea);">
                <span>${pd.start}${pd.end ? ' → ' + pd.end : ''}</span><span style="color:#8e8e93;">${len}</span>
            </div>`;
        }).join('') || `<p style="font-size:12px; color:#8e8e93;">No history yet.</p>`;

        c.innerHTML = `
            ${statsHtml}
            ${logButtons}
            <div style="margin-bottom:14px;">
                <h5 style="font-size:12px; text-transform:uppercase; color:#8e8e93; margin:0 0 8px;">Today's Symptoms</h5>
                <div id="cycleSymptomChips" style="display:flex; flex-wrap:wrap; gap:6px;"></div>
            </div>
            <div style="margin-bottom:14px;">
                <h5 style="font-size:12px; text-transform:uppercase; color:#8e8e93; margin:0 0 8px;">Recent History</h5>
                ${historyRows}
            </div>
            <details>
                <summary style="font-size:12px; color:#8e8e93; cursor:pointer;">Prediction settings</summary>
                <div style="margin-top:10px; font-size:13px;">
                    <label style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                        <input type="checkbox" ${settings.manualOverride ? 'checked' : ''} onchange="toggleCycleManualOverride(this.checked)">
                        Set averages manually (default: auto-calculated from your history)
                    </label>
                    <div style="display:flex; gap:8px;">
                        <div style="flex:1;">
                            <label style="font-size:11px; color:#8e8e93;">Avg cycle length (days)</label>
                            <input type="number" min="15" max="60" value="${settings.avgCycleLength}" onchange="setCycleManualAverage('avgCycleLength', this.value)" ${!settings.manualOverride ? 'disabled' : ''}>
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:11px; color:#8e8e93;">Avg period length (days)</label>
                            <input type="number" min="1" max="14" value="${settings.avgPeriodLength}" onchange="setCycleManualAverage('avgPeriodLength', this.value)" ${!settings.manualOverride ? 'disabled' : ''}>
                        </div>
                    </div>
                </div>
            </details>
            <p style="font-size:11px; color:#8e8e93; margin-top:14px;">Estimates only, based on your logged history — not medical advice.</p>
        `;
        renderCycleSymptomChips();
    }

    function renderCycleSymptomChips() {
        const container = document.getElementById('cycleSymptomChips');
        if (!container) return;
        const today = getTodayStr();
        const active = (getCycleSymptoms()[today] || []);
        container.innerHTML = CYCLE_SYMPTOMS.map(s => `
            <span onclick="toggleCycleSymptom('${s}')" role="button" tabindex="0" style="padding:6px 12px; border-radius:20px; font-size:12px; cursor:pointer; border:1px solid ${active.includes(s) ? 'var(--primary)' : 'var(--border-color,#e5e5ea)'}; background:${active.includes(s) ? 'var(--primary)' : 'transparent'}; color:${active.includes(s) ? '#fff' : 'inherit'};">${sanitizeHTML(s)}</span>
        `).join('');
    }
