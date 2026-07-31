// Advanced Dashboard Widgets — new optional home-page widgets, registered
// into the existing toggleWidget() system (js/06-lifestyle/02-settings-core.js).
// Also fixes two pre-existing widgets that were already fully wired up in
// JS (renderTodayShiftWidget, called from 6 places; the 'mood' toggle) but
// whose target elements didn't exist in index.html, so neither had ever
// actually rendered anything.

    function renderHomeMoodWidget() {
        const c = document.getElementById('homeMoodQuickLog');
        if (!c || typeof moodData === 'undefined') return;
        const today = getTodayStr();
        const moodLog = safeStorage('moodLog', {});
        const todayMood = moodLog[today];
        c.innerHTML = moodData.map((m, i) => `
            <span onclick="logMood(${i}); if(typeof renderHomeMoodWidget==='function') renderHomeMoodWidget();"
                  style="font-size:26px; cursor:pointer; opacity:${todayMood === i ? '1' : '0.4'}; transform:scale(${todayMood === i ? '1.15' : '1'}); transition:0.15s;">${m.emoji}</span>
        `).join('');
    }

    function renderHealthSnapshotWidget() {
        const c = document.getElementById('healthSnapshotContent');
        if (!c || typeof getHealthSnapshot !== 'function') return;
        const s = getHealthSnapshot();
        c.innerHTML = `
            <span>💧 ${s.todayWater}/${s.waterGoal} cups</span>
            <span>💊 ${s.medsDue > 0 ? s.medsTaken + '/' + s.medsDue + ' taken' : 'None due'}</span>
        `;
    }

    function renderFinanceSnapshotWidget() {
        const c = document.getElementById('financeSnapshotContent');
        if (!c || typeof renderMonthlyFinanceSummary !== 'function') return;
        const s = renderMonthlyFinanceSummary();
        const overBudget = s.savings < 0;
        c.innerHTML = `
            <span>Spent: ₹${s.mExp.toLocaleString('en-IN')}</span>
            <span style="color:${overBudget ? '#ff3b30' : '#34c759'};">${overBudget ? '⚠️ Over' : '✅'} ₹${Math.abs(s.savings).toLocaleString('en-IN')} ${overBudget ? 'short' : 'saved'}</span>
        `;
    }

    // toggleWidget()'s map (js/06-lifestyle/02-settings-core.js) already
    // includes 'healthsnapshot'/'financesnapshot' — extended there directly
    // rather than monkey-patched from here.

    // Widget on/off preferences (including these two) are applied by the
    // existing applyWidgetPrefs() in js/08-khata-family/02-more-page.js,
    // which already runs at real app startup — its ID_MAP was extended
    // there rather than duplicating the mechanism here.
