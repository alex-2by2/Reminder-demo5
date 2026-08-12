// Free Tier Limits Enforcement.
// Central place for what's capped on the free plan vs unlimited on Pro.
// checkFreeTierLimit(type) is called from creation points across the new
// feature modules (family wallet, webhooks, recipes) and from
// addHabit()/addOrUpdateReminder()/addRecurringExpense() (see the one-line
// guards added at each of those call sites) — each already has this
// function available since all app scripts share one global scope. Returns
// true if the action is allowed, otherwise shows the Pro upsell and returns
// false.
//
// NOTE ON AI CALLS: the Gemini daily limit (50/day) is enforced server-side in
// functions/index.js's callGeminiProxy and applies flat to everyone today —
// giving Pro users a higher server-side limit is a real, reasonable next step,
// but changing that shared/working function's core logic wasn't done here to
// avoid touching a function that's already working correctly for every user.

    const FREE_LIMITS = {
        reminders: 50,
        habits: 10,
        familyWallets: 2,
        webhooks: 2,
        recipes: 15,
        recurringExpenses: 5
    };

    function checkFreeTierLimit(type) {
        if (isProUser) return true;
        const limit = FREE_LIMITS[type];
        if (limit === undefined) return true; // no cap defined for this type
        const count = countForLimitType(type);
        if (count >= limit) {
            showToast(`Free plan limit reached (${limit} ${type}). Upgrade to Pro for unlimited.`, 'error');
            openModal('proModal');
            return false;
        }
        return true;
    }

    function countForLimitType(type) {
        switch (type) {
            case 'reminders': return safeStorage('reminders', []).filter(r => !r.archived).length;
            case 'habits': return safeStorage('habits', []).length;
            case 'familyWallets': return safeStorage('myFamilyWalletCodes', []).length;
            case 'webhooks': return safeStorage('webhooks', []).length;
            case 'recipes': return safeStorage('recipes', []).length;
            case 'recurringExpenses': return safeStorage('recurringExps', []).length;
            default: return 0;
        }
    }

    function renderFreeTierBadges() {
        Object.keys(FREE_LIMITS).forEach(type => {
            const el = document.getElementById('limitBadge_' + type);
            if (!el) return;
            el.innerText = isProUser ? 'Unlimited' : `${countForLimitType(type)}/${FREE_LIMITS[type]}`;
        });
    }
