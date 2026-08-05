// Account Deletion — makes the Privacy Policy's "delete your account and
// associated data at any time directly from Settings" claim actually true.
// Deletes the Firestore user document, the public_profiles entry (used by
// the leaderboard), the Firebase Auth account itself, and clears local data.
//
// SCOPE NOTE: does not cascade-delete shared_tasks documents this user
// created by sharing a task/grocery list with someone else — those become
// orphaned (harmless; the recipient's own copy, once accepted, is already
// theirs) rather than retracted, the same way deleting your email account
// doesn't unsend mail you already sent. Doing a full cascade delete would
// need a new Firestore rule permission and Cloud Function to be safe against
// a user deleting data they don't own; out of scope for this pass.
//
// Firebase requires a *recent* sign-in before allowing account deletion
// (throws auth/requires-recent-login otherwise) — handled by re-authenticating
// with whichever method the user actually signed in with (Google popup, or
// their password) before retrying the delete.

    function openAccountDeletionModal() {
        if (!currentUser) return showToast('You need to be signed in.', 'error');
        const emailEl = document.getElementById('deleteAccountEmailConfirm');
        if (emailEl) emailEl.value = '';
        openModal('accountDeletionModal');
    }

    async function confirmAccountDeletion() {
        if (!currentUser) return;
        const confirmInput = document.getElementById('deleteAccountEmailConfirm');
        const typed = (confirmInput?.value || '').trim().toLowerCase();
        const actualEmail = (currentUser.email || '').toLowerCase();
        if (typed !== actualEmail) {
            return showToast('Type your email address exactly to confirm.', 'error');
        }

        showToast('Deleting your account...', 'info');
        try {
            await performAccountDeletion();
        } catch (e) {
            if (e.code === 'auth/requires-recent-login') {
                showToast('For your security, please sign in again to confirm this.', 'error');
                try {
                    await reauthenticateCurrentUser();
                    await performAccountDeletion();
                } catch (reauthErr) {
                    showToast('Could not re-authenticate: ' + reauthErr.message, 'error');
                }
            } else {
                showToast('Deletion failed: ' + e.message, 'error');
            }
        }
    }

    async function reauthenticateCurrentUser() {
        const providerId = currentUser.providerData[0]?.providerId;
        if (providerId === 'google.com') {
            const provider = new firebase.auth.GoogleAuthProvider();
            await currentUser.reauthenticateWithPopup(provider);
        } else {
            const password = window.prompt('Re-enter your password to confirm account deletion:');
            if (!password) throw new Error('Password required.');
            const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, password);
            await currentUser.reauthenticateWithCredential(credential);
        }
    }

    async function performAccountDeletion() {
        const uid = currentUser.uid;
        // Delete Firestore data first — if this fails, the Auth account (and
        // therefore the user's ability to try again) is still intact.
        await db.collection('users').doc(uid).delete();
        await db.collection('public_profiles').doc(uid).delete().catch(() => {});
        await currentUser.delete();
        localStorage.clear();
        showToast('Account deleted. Sorry to see you go.', 'success');
        setTimeout(() => location.reload(), 1200);
    }
