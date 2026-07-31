// Health Dashboard — aggregates mood, sleep, water intake, and medicine
// adherence into one view. Reuses existing data (moodLog, sleepLog,
// medicines) rather than introducing new tracking systems, with one
// exception: water intake logging is genuinely new here. waterCount /
// waterDate already existed as variables (js/01-core/02-navigation-auth.js,
// synced to cloud in js/01-core/03-sync-profile.js) but had no function or
// UI anywhere that ever changed them — this is their first real use.

    const WATER_GOAL_CUPS = 8;

    function logWaterCup() {
        const today = getTodayStr();
        if (waterDate !== today) { waterCount = 0; waterDate = today; }
        waterCount = Math.min(WATER_GOAL_CUPS + 4, waterCount + 1); // small headroom past the goal, not unbounded
        localStorage.setItem('waterDate', waterDate);
        syncToCloud();
        renderHealthDashboard();
        hapticFeedback && hapticFeedback('light');
    }

    function getHealthSnapshot() {
        const today = getTodayStr();
        const moodLog = safeStorage('moodLog', {});
        const sleepLog = safeStorage('sleepLog', {});
        const meds = safeStorage('medicines', []);

        const last7 = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        const recentMoods = last7.map(d => moodLog[d]).filter(m => m !== undefined);
        const avgMoodIdx = recentMoods.length ? recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length : null;

        const recentSleep = last7.map(d => sleepLog[d]).filter(h => h !== undefined && h > 0);
        const avgSleep = recentSleep.length ? (recentSleep.reduce((a, b) => a + b, 0) / recentSleep.length) : null;

        const dueToday = meds.filter(m => (m.freq || 'daily') !== 'sos');
        const takenToday = dueToday.filter(m => m.takenDate === today).length;

        const todayWater = (waterDate === today) ? waterCount : 0;

        return {
            todayMood: moodLog[today], avgMoodIdx, moodDaysLogged: recentMoods.length,
            todaySleep: sleepLog[today], avgSleep,
            todayWater, waterGoal: WATER_GOAL_CUPS,
            medsTaken: takenToday, medsDue: dueToday.length
        };
    }

    function openHealthDashboard() {
        renderHealthDashboard();
        openModal('healthDashboardModal');
    }

    function renderHealthDashboard() {
        const c = document.getElementById('healthDashboardContent');
        if (!c) return;
        const s = getHealthSnapshot();

        const moodBlock = s.todayMood !== undefined
            ? `${moodData[s.todayMood].emoji} ${sanitizeHTML(moodData[s.todayMood].label)}`
            : 'Not logged today';
        const avgMoodBlock = s.avgMoodIdx !== null
            ? `${moodData[Math.round(s.avgMoodIdx)].emoji} avg over ${s.moodDaysLogged} day${s.moodDaysLogged === 1 ? '' : 's'}`
            : 'No recent data';

        const sleepBlock = s.todaySleep !== undefined ? s.todaySleep + 'h last night' : 'Not logged';
        const avgSleepBlock = s.avgSleep !== null ? s.avgSleep.toFixed(1) + 'h avg (7d)' : 'No recent data';

        const waterPct = Math.min(100, Math.round((s.todayWater / s.waterGoal) * 100));
        const medsPct = s.medsDue > 0 ? Math.round((s.medsTaken / s.medsDue) * 100) : null;

        c.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="health-tile">
                    <div class="health-tile-label">😊 Mood Today</div>
                    <div style="font-size:16px; font-weight:700;">${moodBlock}</div>
                    <div style="font-size:11px; color:#8e8e93; margin-top:4px;">${avgMoodBlock}</div>
                </div>
                <div class="health-tile">
                    <div class="health-tile-label">😴 Sleep</div>
                    <div style="font-size:16px; font-weight:700;">${sleepBlock}</div>
                    <div style="font-size:11px; color:#8e8e93; margin-top:4px;">${avgSleepBlock}</div>
                </div>
                <div class="health-tile">
                    <div class="health-tile-label">💧 Water</div>
                    <div style="font-size:16px; font-weight:700;">${s.todayWater} / ${s.waterGoal} cups</div>
                    <div style="background:#e5e5ea; border-radius:6px; height:6px; margin-top:8px; overflow:hidden;"><div style="width:${waterPct}%; height:100%; background:#00c7be;"></div></div>
                    <button onclick="logWaterCup()" style="margin-top:8px; width:100%; background:#00c7be; color:white; border:none; border-radius:8px; padding:6px; font-weight:700; font-size:12px; cursor:pointer;">+ 1 cup</button>
                </div>
                <div class="health-tile">
                    <div class="health-tile-label">💊 Medicine</div>
                    ${s.medsDue > 0
                        ? `<div style="font-size:16px; font-weight:700;">${s.medsTaken} / ${s.medsDue} taken</div>
                           <div style="background:#e5e5ea; border-radius:6px; height:6px; margin-top:8px; overflow:hidden;"><div style="width:${medsPct}%; height:100%; background:${medsPct === 100 ? '#34c759' : '#ff9500'};"></div></div>`
                        : `<div style="font-size:13px; color:#8e8e93;">No scheduled medicines</div>`}
                </div>
            </div>
        `;
    }
