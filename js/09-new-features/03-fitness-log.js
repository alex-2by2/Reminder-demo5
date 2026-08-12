// Fitness Log — manual step/calorie/activity tracking.
//
// WHY NOT REAL GOOGLE FIT / APPLE HEALTH SYNC: Apple never exposes HealthKit
// to web browsers at all — it's an iOS-native framework only, unreachable from
// Safari or any PWA, with no workaround. Google Fit's REST API stopped
// accepting new developer signups on 1 May 2024 and is being fully shut down
// in 2026 (Google's own migration notice), so a new integration built on it
// today would likely stop working almost immediately, before it could ever be
// deployed. Google's replacement, Health Connect, is an Android on-device API
// with no web access either — it requires a native Android app, not a
// browser. So there is currently no real path for a website/PWA to pull
// step/calorie data automatically from either platform. This module is the
// practical fallback: quick manual daily entry, so the data still lives
// somewhere useful (synced, charted) even without automatic sync. If you ever
// wrap this app natively (e.g. Capacitor), true HealthKit/Health Connect sync
// becomes possible then — flagging that as a future path, not something this
// web build can do today.

    function getFitnessLog() { return safeStorage('fitnessLog', {}); }

    function logFitnessToday() {
        const steps = parseInt(document.getElementById('fitStepsInput').value) || 0;
        const calories = parseInt(document.getElementById('fitCaloriesInput').value) || 0;
        const activeMinutes = parseInt(document.getElementById('fitActiveMinInput').value) || 0;
        const workoutType = document.getElementById('fitWorkoutTypeInput').value.trim();
        if (!steps && !calories && !activeMinutes) return showToast('Enter at least one value.', 'error');
        const log = getFitnessLog();
        const today = getTodayStr();
        log[today] = { steps, calories, activeMinutes, workoutType, loggedAt: new Date().toISOString() };
        localStorage.setItem('fitnessLog', JSON.stringify(log));
        syncToCloud();
        renderFitnessLog();
        hapticFeedback && hapticFeedback('success');
        showToast('🏃 Activity logged', 'success');
    }

    function computeFitnessWeekTotal() {
        const log = getFitnessLog();
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            days.push(d.toISOString().split('T')[0]);
        }
        const totals = days.reduce((acc, d) => {
            const e = log[d];
            if (e) { acc.steps += e.steps || 0; acc.calories += e.calories || 0; acc.activeMinutes += e.activeMinutes || 0; }
            return acc;
        }, { steps: 0, calories: 0, activeMinutes: 0 });
        return { days, totals };
    }

    function openFitnessModal() {
        const today = getTodayStr();
        const log = getFitnessLog();
        const t = log[today];
        document.getElementById('fitStepsInput').value = t?.steps || '';
        document.getElementById('fitCaloriesInput').value = t?.calories || '';
        document.getElementById('fitActiveMinInput').value = t?.activeMinutes || '';
        document.getElementById('fitWorkoutTypeInput').value = t?.workoutType || '';
        renderFitnessLog();
        openModal('fitnessLogModal');
    }

    function renderFitnessLog() {
        const c = document.getElementById('fitnessWeekSummary');
        if (!c) return;
        const { totals } = computeFitnessWeekTotal();
        c.innerHTML = `
            <div style="display:flex; gap:10px; margin-bottom:14px;">
                <div style="flex:1; background:var(--card-bg,#f7f7f9); border-radius:12px; padding:10px; text-align:center;">
                    <div style="font-size:11px; color:#8e8e93;">Steps (7d)</div>
                    <div style="font-size:18px; font-weight:700;">${totals.steps.toLocaleString('en-IN')}</div>
                </div>
                <div style="flex:1; background:var(--card-bg,#f7f7f9); border-radius:12px; padding:10px; text-align:center;">
                    <div style="font-size:11px; color:#8e8e93;">Calories (7d)</div>
                    <div style="font-size:18px; font-weight:700;">${totals.calories.toLocaleString('en-IN')}</div>
                </div>
                <div style="flex:1; background:var(--card-bg,#f7f7f9); border-radius:12px; padding:10px; text-align:center;">
                    <div style="font-size:11px; color:#8e8e93;">Active min (7d)</div>
                    <div style="font-size:18px; font-weight:700;">${totals.activeMinutes}</div>
                </div>
            </div>
        `;
    }
