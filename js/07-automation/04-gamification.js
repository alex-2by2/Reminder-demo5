// Coins, Rewards, and Weekly Missions — the app already has XP, Levels,
// Streaks, and a Leaderboard (js/02-tasks/01-reminders-utils.js,
// js/01-core/03-sync-profile.js). XP there is a *derived* display stat,
// recomputed from total completions each time — fine for a level display,
// but it can't be spent (spend it on a Reward, then it'd just reappear on
// the next recompute). Coins are a real, separately-tracked balance:
// earned on completion, actually decremented on redemption.
//
// Coin rate matches XP's existing rate (10 XP / 5 coins per completion —
// half of XP, since coins are meant to feel spendable rather than just a
// counter) for consistency with the numbers already established elsewhere.

    const COINS_PER_COMPLETION = 5;
    const MISSION_BONUS_COINS = 30;

    function getCoinBalance() { return safeNum(localStorage.getItem('coinBalance'), 0); }
    function setCoinBalance(n) { localStorage.setItem('coinBalance', String(Math.max(0, Math.round(n)))); syncToCloud(); }
    function earnCoins(amount) { setCoinBalance(getCoinBalance() + amount); refreshCoinDisplay(); }
    function spendCoins(amount) {
        if (getCoinBalance() < amount) return false;
        setCoinBalance(getCoinBalance() - amount);
        refreshCoinDisplay();
        return true;
    }
    function refreshCoinDisplay() {
        const el = document.getElementById('coinBalanceDisplay');
        if (el) el.innerText = '🪙 ' + getCoinBalance().toLocaleString('en-IN');
        const el2 = document.getElementById('coinBalanceDisplay2');
        if (el2) el2.innerText = 'Balance: 🪙 ' + getCoinBalance().toLocaleString('en-IN');
    }

    // --- Rewards (user-defined, redeemable with coins) ---
    function getRewards() { return safeStorage('rewards', []); }
    function saveRewards(d) { localStorage.setItem('rewards', JSON.stringify(d)); syncToCloud(); }

    function addReward() {
        const nameInput = document.getElementById('rewardNameInput');
        const costInput = document.getElementById('rewardCostInput');
        const name = nameInput.value.trim();
        const cost = safeNum(costInput.value);
        if (!name || !cost) return showToast('Enter a reward and coin cost!', 'error');
        const rewards = getRewards();
        rewards.push({ id: Date.now(), name, cost, timesRedeemed: 0 });
        saveRewards(rewards);
        nameInput.value = ''; costInput.value = '';
        renderRewards();
        showToast('Reward added! 🎁', 'success');
    }

    function redeemReward(id) {
        const rewards = getRewards();
        const reward = rewards.find(r => r.id === id);
        if (!reward) return;
        if (!spendCoins(reward.cost)) {
            return showToast(`Need ${reward.cost - getCoinBalance()} more coins for this. Keep completing tasks! 🪙`, 'error');
        }
        reward.timesRedeemed = (reward.timesRedeemed || 0) + 1;
        saveRewards(rewards);
        renderRewards();
        hapticFeedback && hapticFeedback('success');
        fireConfetti && fireConfetti();
        showToast(`🎉 Redeemed: ${reward.name}!`, 'success');
    }

    function deleteReward(id) {
        saveRewards(getRewards().filter(r => r.id !== id));
        renderRewards();
    }

    function renderRewards() {
        const c = document.getElementById('rewardsList');
        if (!c) return;
        refreshCoinDisplay();
        const balance = getCoinBalance();
        c.innerHTML = getRewards().map(r => {
            const affordable = balance >= r.cost;
            return `<div style="display:flex; justify-content:space-between; align-items:center; background:#f2f2f7; border-radius:12px; padding:10px 12px; margin-bottom:8px;">
                <div>
                    <b style="font-size:13px;">${sanitizeHTML(r.name)}</b>
                    <br><span style="font-size:11px; color:#8e8e93;">🪙 ${r.cost}${r.timesRedeemed ? ' · redeemed ' + r.timesRedeemed + 'x' : ''}</span>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    <button onclick="redeemReward(${r.id})" ${affordable ? '' : 'disabled'} style="background:${affordable ? '#34c759' : '#e5e5ea'}; color:${affordable ? 'white' : '#8e8e93'}; border:none; border-radius:8px; padding:6px 12px; font-weight:700; cursor:${affordable ? 'pointer' : 'not-allowed'}; font-size:11px;">Redeem</button>
                    <button onclick="deleteReward(${r.id})" style="background:none; border:none; color:#ff3b30; cursor:pointer; font-size:15px;">✖</button>
                </div>
            </div>`;
        }).join('') || emptyStateHTML('🎁', 'No rewards set up yet. Add something to look forward to!');
    }

    function openRewardsModal() { renderRewards(); openModal('rewardsModal'); }

    // --- Weekly Missions ---
    // Three small, fixed mission templates evaluated against real existing
    // data (tasks completed, habit streaks, mood logs this week) rather than
    // a separate tracked-from-scratch system. Resets every ISO week.
    function getISOWeekKey(d = new Date()) {
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = date.getUTCDay() || 7;
        date.setUTCDate(date.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
        return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    }

    function getWeeklyMissionsState() {
        const key = getISOWeekKey();
        const stored = safeStorage('weeklyMissions', {});
        if (stored.week !== key) {
            // New week — reset claimed status, keep the same mission templates.
            return { week: key, claimed: {} };
        }
        return stored;
    }

    function getWeekStartDate() {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as week start
        return new Date(d.getFullYear(), d.getMonth(), diff);
    }

    function computeWeeklyMissions() {
        const weekStart = getWeekStartDate();
        const weekStartStr = formatDateLocal(weekStart);
        const reminders = safeStorage('reminders', []);
        const habits = safeStorage('habits', []);
        const moodLog = safeStorage('moodLog', {});

        const completedThisWeek = reminders.filter(r => r.status === 'completed' && r.completedAt && r.completedAt.split('T')[0] >= weekStartStr).length;
        const bestStreak = Math.max(0, ...habits.map(h => h.streak || 0));
        const moodDaysThisWeek = Object.keys(moodLog).filter(d => d >= weekStartStr).length;

        return [
            { id: 'tasks15', label: 'Complete 15 tasks this week', progress: completedThisWeek, target: 15, reward: MISSION_BONUS_COINS },
            { id: 'streak5', label: 'Reach a 5-day habit streak', progress: Math.min(bestStreak, 5), target: 5, reward: MISSION_BONUS_COINS },
            { id: 'mood5', label: 'Log your mood 5 times this week', progress: moodDaysThisWeek, target: 5, reward: Math.round(MISSION_BONUS_COINS * 0.6) },
        ];
    }

    function openWeeklyMissionsModal() { renderWeeklyMissions(); openModal('weeklyMissionsModal'); }

    function renderWeeklyMissions() {
        const c = document.getElementById('weeklyMissionsList');
        if (!c) return;
        const state = getWeeklyMissionsState();
        const missions = computeWeeklyMissions();
        c.innerHTML = missions.map(m => {
            const done = m.progress >= m.target;
            const claimed = !!state.claimed[m.id];
            const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
            return `<div style="background:#f2f2f7; border-radius:12px; padding:12px; margin-bottom:8px;">
                <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:700; margin-bottom:6px;">
                    <span>${done ? '✅' : '🎯'} ${sanitizeHTML(m.label)}</span>
                    <span style="color:#8e8e93; font-weight:600;">${m.progress}/${m.target}</span>
                </div>
                <div style="background:#e5e5ea; border-radius:6px; height:6px; overflow:hidden; margin-bottom:${done && !claimed ? '8px' : '0'};">
                    <div style="width:${pct}%; height:100%; background:${done ? '#34c759' : '#ff9500'};"></div>
                </div>
                ${done && !claimed ? `<button onclick="claimWeeklyMission('${m.id}',${m.reward})" style="width:100%; background:#ffd60a; color:#5c4200; border:none; border-radius:8px; padding:6px; font-weight:700; font-size:12px; cursor:pointer;">Claim 🪙 ${m.reward}</button>` : ''}
                ${claimed ? `<span style="font-size:11px; color:#34c759; font-weight:700;">Claimed this week ✓</span>` : ''}
            </div>`;
        }).join('');
    }

    function claimWeeklyMission(missionId, reward) {
        const state = getWeeklyMissionsState();
        if (state.claimed[missionId]) return;
        state.claimed[missionId] = true;
        localStorage.setItem('weeklyMissions', JSON.stringify(state));
        syncToCloud();
        earnCoins(reward);
        renderWeeklyMissions();
        hapticFeedback && hapticFeedback('success');
        fireConfetti && fireConfetti();
        showToast(`🏆 Mission complete! +${reward} coins`, 'success');
    }
