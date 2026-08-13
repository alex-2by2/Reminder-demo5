// Glue — wires the new features (period tracker excluded, it's fully
// self-contained) into the app's existing lifecycle at exactly one point:
// a single added line inside auth.onAuthStateChanged in
// js/01-core/02-navigation-auth.js: `runPostLoginHooks();`
// Keeping all the new post-login logic HERE, in one place, rather than
// scattering edits across the existing auth handler.

    // Runs at script load (before login) so a ?ref= link survives even if the
    // person isn't signed in yet and needs to register first.
    if (typeof captureReferralParam === 'function') captureReferralParam();

    function runPostLoginHooks() {
        if (typeof applyPendingReferral === 'function') applyPendingReferral();
        if (typeof checkTosGate === 'function') checkTosGate();
        // This is the EXISTING recurring-expense feature (js/07-automation/
        // 03-engagement-reports.js) — previously only ran when someone
        // manually tapped "Process Due Expenses" inside its modal. This is
        // what makes it actually automatic, per feature request #7.
        if (typeof processRecurringExpenses === 'function') processRecurringExpenses(true);
        if (typeof checkProExpiry === 'function') checkProExpiry();
        if (typeof renderFreeTierBadges === 'function') renderFreeTierBadges();
        if (typeof refreshWebPushStatus === 'function') refreshWebPushStatus();
        if (typeof maybeShowRatingPrompt === 'function') maybeShowRatingPrompt();
    }

    // ============================================================
    // ACHIEVEMENTS HUB — merges what used to be 4 separate tiles/modals
    // (Leaderboard, Weekly Missions, Share Win, Refer & Earn) into one
    // "leaderboardModal" with 4 tabs. Each original function (openLeaderboard,
    // openWeeklyMissionsModal, shareAchievement, openReferralModal) still
    // exists under its original name, still opens something when called
    // directly, and now delegates here to switch to its tab.
    // ============================================================
    function switchAchieveTab(tab) {
        ['rank', 'missions', 'share', 'refer'].forEach(t => {
            const pane = document.getElementById('achieveTab-' + t);
            const btn = document.getElementById('achieveTabBtn-' + t);
            const active = (t === tab);
            if (pane) pane.style.display = active ? 'block' : 'none';
            if (btn) {
                btn.style.background = active ? '#fff' : 'transparent';
                btn.style.boxShadow = active ? '0 2px 6px rgba(0,0,0,0.06)' : 'none';
                btn.style.color = active ? 'inherit' : '#8e8e93';
            }
        });
        if (tab === 'rank' && typeof loadLeaderboardData === 'function') loadLeaderboardData();
        else if (tab === 'missions' && typeof renderWeeklyMissions === 'function') renderWeeklyMissions();
        else if (tab === 'share' && typeof renderAchievementCard === 'function') renderAchievementCard();
        else if (tab === 'refer' && typeof renderReferralTab === 'function') renderReferralTab();
    }
