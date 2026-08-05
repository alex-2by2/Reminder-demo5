// Emergency Contacts — quick-access safety contacts (family doctor, building
// security, a relative, etc.) with one-tap calling via tel: links. New
// feature, not an extension of anything existing.

    function getEmergencyContacts() { return safeStorage('emergencyContacts', []); }
    function saveEmergencyContacts(d) { localStorage.setItem('emergencyContacts', JSON.stringify(d)); syncToCloud(); }

    function openEmergencyContactsModal() { renderEmergencyContacts(); openModal('emergencyContactsModal'); }

    function addEmergencyContact() {
        const nameInput = document.getElementById('ecNameInput');
        const relInput = document.getElementById('ecRelationInput');
        const phoneInput = document.getElementById('ecPhoneInput');
        const name = nameInput.value.trim();
        const relation = relInput.value.trim();
        const phone = phoneInput.value.trim();
        if (!name || !phone) return showToast('Enter name & phone number!', 'error');
        const contacts = getEmergencyContacts();
        contacts.push({ id: Date.now(), name, relation, phone });
        saveEmergencyContacts(contacts);
        nameInput.value = ''; relInput.value = ''; phoneInput.value = '';
        renderEmergencyContacts();
        showToast('Contact added! 🚨', 'success');
    }

    function deleteEmergencyContact(id) {
        saveEmergencyContacts(getEmergencyContacts().filter(c => c.id !== id));
        renderEmergencyContacts();
    }

    function renderEmergencyContacts() {
        const c = document.getElementById('emergencyContactsList');
        if (!c) return;
        c.innerHTML = getEmergencyContacts().map(ct => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#fff2f2; border-left:3px solid #ff3b30; border-radius:12px; padding:10px 12px; margin-bottom:8px;">
                <div>
                    <b style="font-size:13px;">${sanitizeHTML(ct.name)}</b>${ct.relation ? ` <span style="font-size:11px; color:#8e8e93;">(${sanitizeHTML(ct.relation)})</span>` : ''}
                    <br><span style="font-size:12px; color:#8e8e93;">${sanitizeHTML(ct.phone)}</span>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    <a href="tel:${sanitizeHTML(ct.phone)}" onclick="hapticFeedback('light')" style="background:#34c759; color:white; border-radius:8px; padding:6px 12px; font-weight:700; font-size:11px; text-decoration:none;">📞 Call</a>
                    <button onclick="deleteEmergencyContact(${ct.id})" style="background:none; border:none; color:#ff3b30; cursor:pointer; font-size:15px;">✖</button>
                </div>
            </div>
        `).join('') || emptyStateHTML('🚨', 'No emergency contacts yet. Add family, your doctor, or building security.');
    }
