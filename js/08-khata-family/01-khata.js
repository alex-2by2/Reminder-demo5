// Khata (ledger) — parties, entries, running balances.
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".

    // KHATA BOOK (LEDGER) - Party-wise debit/credit tracker
    // ============================================================
    function getKhataData() {
        return safeStorage('khataData', {"parties":[],"entries":[]});
    }
    function saveKhataData(d) {
        localStorage.setItem('khataData', JSON.stringify(d));
        syncToCloud();
    }

    function getKhataBalance(partyId) {
        const d = getKhataData();
        const entries = d.entries.filter(e => e.partyId === partyId);
        const gave = entries.filter(e => e.type === 'gave').reduce((s,e) => s + Number(e.amount), 0);
        const got = entries.filter(e => e.type === 'got').reduce((s,e) => s + Number(e.amount), 0);
        return gave - got;
    }

    function addKhataParty() {
        const name = document.getElementById('khataPartyName').value.trim();
        const phone = document.getElementById('khataPartyPhone').value.trim();
        if (!name) return showToast('Enter party name!', 'error');
        const d = getKhataData();
        d.parties.unshift({ id: Date.now(), name, phone });
        saveKhataData(d);
        document.getElementById('khataPartyName').value = '';
        document.getElementById('khataPartyPhone').value = '';
        renderKhataPartyList();
        hapticFeedback('success');
        showToast('Party added!', 'success');
    }

    function renderKhataPartyList() {
        const container = document.getElementById('khataPartyList');
        if (!container) return;
        const d = getKhataData();

        let totalReceive = 0, totalPay = 0;
        d.parties.forEach(p => {
            const bal = getKhataBalance(p.id);
            if (bal > 0) totalReceive += bal;
            else totalPay += Math.abs(bal);
        });
        const tr = document.getElementById('khataTotalReceive');
        const tp = document.getElementById('khataTotalPay');
        if (tr) tr.innerText = '₹' + totalReceive.toLocaleString('en-IN');
        if (tp) tp.innerText = '₹' + totalPay.toLocaleString('en-IN');

        container.innerHTML = d.parties.map(p => {
            const bal = getKhataBalance(p.id);
            const color = bal > 0 ? '#34c759' : bal < 0 ? '#ff3b30' : '#8e8e93';
            const label = bal > 0 ? 'will get' : bal < 0 ? 'will give' : 'settled';
            return `<div class="khata-party-card" onclick="openKhataPartyModal(${p.id})">
                <div>
                    <b style="font-size:14px;">${sanitizeHTML(p.name||'')}</b>
                    ${p.phone ? `<br><span style="font-size:11px; color:#8e8e93;">${sanitizeHTML(p.phone)}</span>` : ''}
                </div>
                <div style="text-align:right;">
                    <span style="font-weight:800; color:${color}; font-size:14px;">₹${Math.abs(bal).toLocaleString('en-IN')}</span>
                    <br><span style="font-size:10px; color:#8e8e93; font-weight:700; text-transform:uppercase;">${label}</span>
                </div>
            </div>`;
        }).join('') || emptyStateHTML('🤝', 'No parties yet. Add someone to start tracking!');
    }

    let currentKhataPartyId = null;
    let currentKhataEntryType = 'gave';

    function openKhataPartyModal(partyId) {
        currentKhataPartyId = partyId;
        currentKhataEntryType = 'gave';
        const d = getKhataData();
        const party = d.parties.find(p => p.id === partyId);
        if (!party) return;

        document.getElementById('khataPartyModalName').innerText = party.name;
        document.getElementById('khataPartyModalPhone').innerText = party.phone || '';
        document.getElementById('khataEntryDate').value = getTodayStr();
        setKhataEntryType('gave');
        renderKhataPartyDetail();
        openModal('khataPartyModal');
    }

    function setKhataEntryType(type) {
        currentKhataEntryType = type;
        document.getElementById('khataTypeGave').classList.toggle('active', type === 'gave');
        document.getElementById('khataTypeGot').classList.toggle('active', type === 'got');
    }

    function renderKhataPartyDetail() {
        const d = getKhataData();
        const bal = getKhataBalance(currentKhataPartyId);
        const balEl = document.getElementById('khataPartyBalance');
        const labelEl = document.getElementById('khataPartyBalanceLabel');
        balEl.innerText = '₹' + Math.abs(bal).toLocaleString('en-IN');
        balEl.style.color = bal > 0 ? '#34c759' : bal < 0 ? '#ff3b30' : '#8e8e93';
        labelEl.innerText = bal > 0 ? 'WILL GET (They owe you)' : bal < 0 ? 'WILL GIVE (You owe them)' : 'SETTLED';

        const entries = d.entries.filter(e => e.partyId === currentKhataPartyId).sort((a,b) => new Date(b.date) - new Date(a.date) || b.id - a.id);
        const historyEl = document.getElementById('khataPartyHistory');
        historyEl.innerHTML = entries.map(e => `
            <div class="khata-entry-row">
                <div>
                    <span style="font-weight:700; color:${e.type==='gave'?'#ff3b30':'#34c759'};">${e.type==='gave'?'You Gave':'You Got'}</span>
                    ${e.note ? `<br><span style="color:#8e8e93; font-style:italic;">${sanitizeHTML(e.note)}</span>` : ''}
                    <br><span style="color:#8e8e93;">${e.date}</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-weight:800; color:${e.type==='gave'?'#ff3b30':'#34c759'};">₹${Number(e.amount).toLocaleString('en-IN')}</span>
                    <button onclick="deleteKhataEntry(${e.id})" style="background:none; border:none; color:#8e8e93; cursor:pointer; font-size:14px;">✖</button>
                </div>
            </div>
        `).join('') || emptyStateHTML('🧾', 'No transactions yet.');
    }

    function addKhataEntry() {
        const amount = Number(document.getElementById('khataEntryAmt').value);
        const date = document.getElementById('khataEntryDate').value || getTodayStr();
        const note = document.getElementById('khataEntryNote').value.trim();
        if (!amount) return showToast('Enter amount!', 'error');

        const d = getKhataData();
        d.entries.push({ id: Date.now(), partyId: currentKhataPartyId, type: currentKhataEntryType, amount, date, note });
        saveKhataData(d);

        document.getElementById('khataEntryAmt').value = '';
        document.getElementById('khataEntryNote').value = '';
        renderKhataPartyDetail();
        renderKhataPartyList();
        hapticFeedback('success');
        showToast('Entry added!', 'success');
    }

    function deleteKhataEntry(entryId) {
        const d = getKhataData();
        d.entries = d.entries.filter(e => e.id !== entryId);
        saveKhataData(d);
        renderKhataPartyDetail();
        renderKhataPartyList();
    }

    function deleteKhataParty() {
        if (!confirm('Delete this party and all their transaction history?')) return;
        const d = getKhataData();
        d.parties = d.parties.filter(p => p.id !== currentKhataPartyId);
        d.entries = d.entries.filter(e => e.partyId !== currentKhataPartyId);
        saveKhataData(d);
        closeModal('khataPartyModal');
        renderKhataPartyList();
        showToast('Party deleted', 'info');
    }


    // ============================================================
