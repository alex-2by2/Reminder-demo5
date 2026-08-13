// Referral / Invite System — reuses the uniqueId every account already has
// (js/01-core/02-navigation-auth.js's generateUniqueId()) as the shareable
// referral code, so no new code-generation/collision logic is needed. Reward
// crediting happens server-side via the applyReferral Cloud Function (see
// functions/index.js) since it needs to write to the REFERRER's document,
// which the referred user has no permission to touch directly.

    function getReferralLink() {
        const uid = localStorage.getItem('uniqueId') || '';
        return `${window.location.origin}${window.location.pathname}?ref=${uid}`;
    }

    // Now a tab inside the merged Achievements modal (leaderboardModal) —
    // see switchAchieveTab() in js/09-new-features/00-glue.js.
    function openReferralModal() { openModal('leaderboardModal'); switchAchieveTab('refer'); }

    function renderReferralTab() {
        const link = getReferralLink();
        const linkEl = document.getElementById('referralLinkDisplay');
        if (linkEl) linkEl.innerText = link;
        const codeEl = document.getElementById('referralCodeDisplay');
        if (codeEl) codeEl.innerText = localStorage.getItem('uniqueId') || '—';
        renderReferralStats();
    }

    function copyReferralLink() {
        navigator.clipboard.writeText(getReferralLink())
            .then(() => showToast('Referral link copied! 📋', 'success'))
            .catch(() => showToast('Could not copy — long-press the link to copy manually.', 'error'));
    }

    function shareReferralLink() {
        const link = getReferralLink();
        if (navigator.share) {
            navigator.share({ title: 'Master Reminder App', text: 'Join me on Master Reminder App — get a bonus when you sign up with my link!', url: link }).catch(() => {});
        } else {
            copyReferralLink();
        }
    }

    async function renderReferralStats() {
        const el = document.getElementById('referralStatsDisplay');
        if (!el || !currentUser) return;
        try {
            const doc = await db.collection('users').doc(currentUser.uid).get();
            const count = (doc.exists && doc.data().referralCount) || 0;
            el.innerText = `${count} friend${count === 1 ? '' : 's'} referred · ${count * 50} coins earned`;
        } catch (e) { el.innerText = ''; }
    }

    // Captures ?ref=CODE from the URL BEFORE signup, so it survives the
    // redirect/reload signup can trigger. Call captureReferralParam() once at
    // load (see 00-glue.js), and applyPendingReferral() once after a NEW
    // account is created (see registerUser() edit).
    function captureReferralParam() {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        if (ref) sessionStorage.setItem('pendingReferralCode', ref);
    }

    async function applyPendingReferral() {
        const code = sessionStorage.getItem('pendingReferralCode');
        if (!code || !currentUser) return;
        sessionStorage.removeItem('pendingReferralCode');
        try {
            const apply = firebase.functions().httpsCallable('applyReferral');
            const result = await apply({ referralCode: code });
            if (result.data.success) {
                earnCoins(result.data.bonusEarned);
                showToast(`Welcome bonus: +${result.data.bonusEarned} coins! 🪙`, 'success');
            }
        } catch (e) { /* invalid/self code, or already applied — fail silently, not the new user's fault */ }
    }
