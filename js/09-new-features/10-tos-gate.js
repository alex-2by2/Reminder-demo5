// Privacy Policy + ToS In-App Gate.
// BEFORE: the signup screen showed a passive "By creating an account, you
// agree to Terms/Privacy" line with links, but nothing actually required
// reading or agreeing to anything — registerUser() proceeded regardless, and
// termsVersion was silently stamped on the new account without real consent.
// AFTER: signup requires an explicit checkbox (see registerUser() edit and
// the checkbox added next to the existing links in index.html). This module
// additionally re-gates EXISTING users whose stored termsVersion is missing
// or older than the current version — e.g. after you update the ToS — with a
// blocking modal they must accept before using the app again.

    const CURRENT_TERMS_VERSION = '2026-08-02'; // bump this whenever terms-of-service.html / privacy-policy.html materially change

    function tosCheckboxOk() {
        const cb = document.getElementById('signupTosCheckbox');
        if (cb && !cb.checked) {
            showToast('Please accept the Terms of Service and Privacy Policy to continue.', 'error');
            return false;
        }
        return true;
    }

    // Called from the auth.onAuthStateChanged hook (see 00-glue.js) after login,
    // for EXISTING accounts that predate this gate or haven't accepted a newer version.
    async function checkTosGate() {
        if (!currentUser) return;
        try {
            const doc = await db.collection('users').doc(currentUser.uid).get();
            const data = doc.exists ? doc.data() : {};
            if (data.termsVersion === CURRENT_TERMS_VERSION) return; // already up to date, nothing to do
            openModal('tosGateModal');
        } catch (e) { /* fail open rather than locking someone out over a network blip */ }
    }

    async function acceptTosGate() {
        const cb = document.getElementById('tosGateCheckbox');
        if (!cb || !cb.checked) return showToast('Please check the box to confirm you agree.', 'error');
        if (!currentUser) return;
        try {
            await db.collection('users').doc(currentUser.uid).update({
                termsVersion: CURRENT_TERMS_VERSION,
                termsAcceptedAt: new Date().toISOString()
            });
            closeModal('tosGateModal');
            showToast('Thanks! You can continue using the app.', 'success');
        } catch (e) { showToast('Error saving — please try again: ' + e.message, 'error'); }
    }
