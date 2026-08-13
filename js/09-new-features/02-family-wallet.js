// Shared Family Wallet — a Firestore-backed shared expense ledger between family
// members, addressed by a 6-char invite code. Mirrors the exact pattern already
// proven by workspaces/{code} in js/04-ai-calendar/03-workspace.js (members
// keyed by email, join-by-code, single-doc-with-array-field storage) — same
// tradeoffs and same KNOWN LIMITATION documented in firestore.rules apply here
// (a member could in theory overwrite another member's entry; fixing that needs
// a subcollection, a real data-model change, not just a rules tweak).

    // Local record of every wallet code this user has created or joined, used
    // only for the free-tier count (js/09-new-features/15-free-tier-limits.js)
    // — the source of truth for wallet membership is still the Firestore doc.
    function recordOwnedFamilyWalletCode(code) {
        const list = safeStorage('myFamilyWalletCodes', []);
        if (!list.includes(code)) list.push(code);
        localStorage.setItem('myFamilyWalletCodes', JSON.stringify(list));
        syncToCloud();
    }

    function generateWalletCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
        return code;
    }

    // Kept for backward compatibility — anyone who already pinned the old
    // standalone "Family Wallet" shortcut before the merge still has this
    // exact function name stored in their pin action, so it needs to keep
    // working. Now opens the unified Family modal straight to its Wallet tab
    // instead of a separate modal.
    async function openFamilyWalletModal() {
        openModal('familyModal');
        if (typeof switchFamilyTab === 'function') switchFamilyTab('wallet');
        else await loadActiveWallet();
    }

    async function loadActiveWallet() {
        const active = safeStorage('activeFamilyWallet', null);
        const setup = document.getElementById('familyWalletSetup');
        const activeEl = document.getElementById('familyWalletActive');
        if (!active) { setup.style.display = 'block'; activeEl.style.display = 'none'; return; }
        setup.style.display = 'none'; activeEl.style.display = 'block';
        document.getElementById('familyWalletActiveName').innerText = active.name;
        document.getElementById('familyWalletActiveCode').innerText = active.code;
        await syncFamilyWallet();
    }

    async function createFamilyWallet() {
        if (!currentUser) return showToast('Login required!', 'error');
        if (!checkFreeTierLimit('familyWallets')) return;
        const name = document.getElementById('familyWalletNameInput').value.trim();
        if (!name) return showToast('Enter a wallet name!', 'error');
        const code = generateWalletCode();
        const email = currentUser.email.toLowerCase();
        try {
            await db.collection('family_wallets').doc(code).set({
                name, members: [email], memberNames: { [email]: userName || 'Member' },
                entries: [], ownerUid: currentUser.uid, createdAt: new Date().toISOString()
            });
            localStorage.setItem('activeFamilyWallet', JSON.stringify({ code, name }));
            recordOwnedFamilyWalletCode(code);
            showToast(`Wallet created! Share code: ${code} 🎉`, 'success');
            await loadActiveWallet();
        } catch (e) { showToast('Error: ' + e.message, 'error'); }
    }

    async function joinFamilyWallet() {
        if (!currentUser) return showToast('Login required!', 'error');
        const code = document.getElementById('familyWalletJoinCode').value.trim().toUpperCase();
        if (!code) return showToast('Enter a code!', 'error');
        try {
            const ref = db.collection('family_wallets').doc(code);
            const doc = await ref.get();
            if (!doc.exists) return showToast('Wallet not found!', 'error');
            const data = doc.data();
            const email = currentUser.email.toLowerCase();
            if (!(data.members || []).includes(email)) {
                const memberNames = Object.assign({}, data.memberNames, { [email]: userName || 'Member' });
                await ref.update({ members: [...(data.members || []), email], memberNames });
            }
            localStorage.setItem('activeFamilyWallet', JSON.stringify({ code, name: data.name }));
            recordOwnedFamilyWalletCode(code);
            showToast(`Joined "${data.name}"! 🎉`, 'success');
            await loadActiveWallet();
        } catch (e) { showToast('Error: ' + e.message, 'error'); }
    }

    function leaveFamilyWallet() {
        localStorage.removeItem('activeFamilyWallet');
        document.getElementById('familyWalletSetup').style.display = 'block';
        document.getElementById('familyWalletActive').style.display = 'none';
        showToast('Left wallet', 'info');
    }

    async function syncFamilyWallet() {
        const active = safeStorage('activeFamilyWallet', null);
        if (!active) return;
        try {
            const doc = await db.collection('family_wallets').doc(active.code).get();
            if (!doc.exists) { showToast('Wallet no longer exists', 'error'); leaveFamilyWallet(); return; }
            const data = doc.data();
            document.getElementById('familyWalletMemberCount').innerText = (data.members || []).length;
            renderWalletBalances(data);
            renderWalletEntries(data);
        } catch (e) { showToast('Sync error: ' + e.message, 'error'); }
    }

    function computeWalletBalances(data) {
        const members = data.members || [];
        const paid = {}, fairShare = {};
        members.forEach(m => { paid[m] = 0; fairShare[m] = 0; });
        (data.entries || []).forEach(e => {
            const among = (e.splitAmong && e.splitAmong.length) ? e.splitAmong : members;
            const share = Number(e.amount) / (among.length || 1);
            if (paid[e.paidBy] !== undefined) paid[e.paidBy] += Number(e.amount);
            among.forEach(m => { if (fairShare[m] !== undefined) fairShare[m] += share; });
        });
        return members.map(m => ({ email: m, name: (data.memberNames || {})[m] || m, net: Math.round((paid[m] - fairShare[m]) * 100) / 100 }));
    }

    function renderWalletBalances(data) {
        const c = document.getElementById('familyWalletBalances');
        if (!c) return;
        const balances = computeWalletBalances(data);
        c.innerHTML = balances.map(b => `
            <div style="display:flex; justify-content:space-between; padding:6px 0; font-size:13px;">
                <span>${sanitizeHTML(b.name)}</span>
                <span style="font-weight:700; color:${b.net >= 0 ? '#34c759' : '#ff3b30'};">${b.net >= 0 ? '+' : ''}₹${b.net.toLocaleString('en-IN')}</span>
            </div>
        `).join('');
    }

    function renderWalletEntries(data) {
        const c = document.getElementById('familyWalletEntries');
        if (!c) return;
        const entries = (data.entries || []).slice().reverse();
        if (!entries.length) { c.innerHTML = '<p style="text-align:center; font-size:12px; color:#8e8e93; padding:15px 0;">No expenses yet. Add one below! 👇</p>'; return; }
        c.innerHTML = entries.map(e => `
            <div class="expense-item">
                <div><b style="font-size:13px;">${sanitizeHTML(e.desc || '')}</b><br>
                <span style="font-size:11px; color:#8e8e93;">Paid by ${sanitizeHTML((data.memberNames || {})[e.paidBy] || e.paidBy)} · ${e.date}</span></div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-weight:700; color:#ff3b30;">₹${Number(e.amount).toLocaleString('en-IN')}</span>
                    <button onclick="deleteWalletEntry('${e.id}')" style="background:none; border:none; color:#ff3b30; cursor:pointer; font-size:16px;">✖</button>
                </div>
            </div>
        `).join('');
    }

    async function addWalletEntry() {
        const active = safeStorage('activeFamilyWallet', null);
        if (!active || !currentUser) return;
        const desc = document.getElementById('familyWalletDescInput').value.trim();
        const amount = safeNum(document.getElementById('familyWalletAmtInput').value);
        if (!desc || !amount || amount < 0) return showToast('Enter valid description & amount!', 'error');
        try {
            const ref = db.collection('family_wallets').doc(active.code);
            const doc = await ref.get();
            const data = doc.data();
            const entries = data.entries || [];
            entries.push({ id: Date.now().toString(), desc, amount, paidBy: currentUser.email.toLowerCase(), date: getTodayStr(), splitAmong: data.members || [] });
            await ref.update({ entries });
            document.getElementById('familyWalletDescInput').value = '';
            document.getElementById('familyWalletAmtInput').value = '';
            renderWalletBalances(data.entries ? Object.assign({}, data, { entries }) : data);
            renderWalletEntries(Object.assign({}, data, { entries }));
            hapticFeedback && hapticFeedback('success');
            showToast('Expense added! 💸', 'success');
        } catch (e) { showToast('Error: ' + e.message, 'error'); }
    }

    async function deleteWalletEntry(id) {
        const active = safeStorage('activeFamilyWallet', null);
        if (!active) return;
        try {
            const ref = db.collection('family_wallets').doc(active.code);
            const doc = await ref.get();
            const data = doc.data();
            const entries = (data.entries || []).filter(e => e.id !== id);
            await ref.update({ entries });
            const updated = Object.assign({}, data, { entries });
            renderWalletBalances(updated);
            renderWalletEntries(updated);
        } catch (e) { showToast('Error: ' + e.message, 'error'); }
    }
