// Subscription Management Page — shows current plan, expiry, billing history
// (read from the payments subcollection written by verifyRazorpayPayment),
// and lets a Pro user "downgrade" (this is a one-time annual purchase model,
// not auto-renewing, so there's no subscription to cancel with the gateway —
// downgrading just means choosing not to renew when it lapses; see
// checkProExpiry() below for the automatic reversion once proExpiresAt passes).

    async function openSubscriptionModal() {
        renderSubscriptionPage();
        openModal('subscriptionModal');
        await loadBillingHistory();
    }

    function checkProExpiry() {
        const expiresAt = localStorage.getItem('proExpiresAt');
        if (!expiresAt) return; // legacy/demo Pro accounts (activatePro()) have no expiry — left alone
        if (new Date(expiresAt) < new Date()) {
            isProUser = false;
            localStorage.setItem('isPro', 'false');
            const pb = document.getElementById('proBadgeDisplay');
            if (pb) pb.style.display = 'none';
            showToast('Your Pro subscription has expired.', 'info');
        }
    }

    function renderSubscriptionPage() {
        const c = document.getElementById('subscriptionStatusCard');
        if (!c) return;
        const expiresAt = localStorage.getItem('proExpiresAt');
        c.innerHTML = isProUser ? `
            <div style="text-align:center; padding:10px 0;">
                <div style="font-size:32px;">👑</div>
                <div style="font-weight:700; font-size:16px; margin:6px 0;">Master PRO</div>
                ${expiresAt ? `<div style="font-size:12px; color:#8e8e93;">Renews/expires ${new Date(expiresAt).toLocaleDateString('en-IN')}</div>` : `<div style="font-size:12px; color:#8e8e93;">Active</div>`}
            </div>
        ` : `
            <div style="text-align:center; padding:10px 0;">
                <div style="font-size:32px;">🆓</div>
                <div style="font-weight:700; font-size:16px; margin:6px 0;">Free Plan</div>
                <button onclick="startProUpgrade()" style="background:linear-gradient(135deg,#ffd60a,#ff9f0a); border:none; border-radius:14px; padding:12px 20px; color:white; font-weight:700; margin-top:8px;">Upgrade to PRO</button>
            </div>
        `;
        if (typeof renderFreeTierBadges === 'function') renderFreeTierBadges();
    }

    async function loadBillingHistory() {
        const c = document.getElementById('billingHistoryList');
        if (!c || !currentUser) return;
        c.innerHTML = '<p style="text-align:center; font-size:12px; color:#8e8e93;">Loading…</p>';
        try {
            const snap = await db.collection('users').doc(currentUser.uid).collection('payments').orderBy('createdAt', 'desc').limit(20).get();
            if (snap.empty) { c.innerHTML = '<p style="text-align:center; font-size:12px; color:#8e8e93; padding:10px 0;">No payments yet.</p>'; return; }
            c.innerHTML = snap.docs.map(d => {
                const p = d.data();
                return `<div style="display:flex; justify-content:space-between; font-size:12px; padding:6px 0; border-bottom:1px solid var(--border-color,#e5e5ea);">
                    <span>${new Date(p.createdAt).toLocaleDateString('en-IN')}</span>
                    <span style="font-weight:700;">₹${(p.amount / 100).toLocaleString('en-IN')}</span>
                    <span style="color:${p.status === 'success' ? '#34c759' : '#ff3b30'};">${sanitizeHTML(p.status)}</span>
                </div>`;
            }).join('');
        } catch (e) { c.innerHTML = `<p style="text-align:center; font-size:12px; color:#ff3b30;">Couldn't load history: ${sanitizeHTML(e.message)}</p>`; }
    }
