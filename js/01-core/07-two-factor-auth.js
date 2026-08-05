// Two-Factor Authentication — real phone/SMS-based MFA using Firebase
// Auth's actual Multi-Factor Auth APIs (firebase.auth().currentUser.multiFactor,
// PhoneAuthProvider, PhoneMultiFactorGenerator), not a decorative toggle.
//
// SETUP NEEDED (one-time, only the project owner can do this):
//   1. Firebase Console -> Authentication -> Sign-in method -> scroll to
//      "Multi-factor authentication" -> enable it, add SMS as a provider.
//   2. This requires the Blaze (pay-as-you-go) plan — phone verification
//      SMS messages cost a small amount each. There is no way around this;
//      it's Firebase's own pricing for SMS delivery, not a limitation of
//      this app's code.
//   3. Phone auth also expects a reCAPTCHA check (the invisible container
//      below, #recaptcha-container-2fa) — this is Firebase's own abuse
//      prevention for phone auth, already wired up here.
// Until step 1 is done in the Firebase Console, enrollment will fail with a
// clear Firebase error message (surfaced via showToast) rather than a silent
// broken button — see the catch blocks below.

    let recaptchaVerifier2FA = null;
    let mfaVerificationId = null;
    let mfaEnrollSession = null;
    let mfaSignInResolver = null; // set when a login attempt hits auth/multi-factor-auth-required

    function getRecaptchaVerifier2FA() {
        if (!recaptchaVerifier2FA) {
            recaptchaVerifier2FA = new firebase.auth.RecaptchaVerifier('recaptcha-container-2fa', { size: 'invisible' }, auth);
        }
        return recaptchaVerifier2FA;
    }

    function refresh2FAStatusUI() {
        const statusEl = document.getElementById('pc2faStatus');
        const btnEl = document.getElementById('pc2faActionBtn');
        if (!statusEl || !btnEl || !currentUser) return;
        const enrolledFactors = currentUser.multiFactor?.enrolledFactors || [];
        if (enrolledFactors.length) {
            statusEl.innerText = '✅ Enabled';
            statusEl.style.color = '#34c759';
            btnEl.innerText = 'Disable 2FA';
            btnEl.style.background = '#ff3b30';
            btnEl.onclick = disable2FA;
        } else {
            statusEl.innerText = 'Not enabled';
            statusEl.style.color = '#8e8e93';
            btnEl.innerText = 'Enable 2FA';
            btnEl.style.background = 'var(--primary)';
            btnEl.onclick = open2FAEnrollModal;
        }
    }

    // --- Enrollment (for the currently signed-in user) ---
    function open2FAEnrollModal() {
        document.getElementById('tfaPhoneInput').value = '';
        document.getElementById('tfaCodeInput').value = '';
        document.getElementById('tfaEnrollStep1').style.display = 'block';
        document.getElementById('tfaEnrollStep2').style.display = 'none';
        openModal('twoFactorEnrollModal');
    }

    async function send2FAEnrollmentCode() {
        const phone = document.getElementById('tfaPhoneInput').value.trim();
        if (!phone || !phone.startsWith('+')) {
            return showToast('Enter your phone number in international format, e.g. +919876543210', 'error');
        }
        try {
            mfaEnrollSession = await currentUser.multiFactor.getSession();
            const phoneAuthProvider = new firebase.auth.PhoneAuthProvider(auth);
            mfaVerificationId = await phoneAuthProvider.verifyPhoneNumber(
                { phoneNumber: phone, session: mfaEnrollSession },
                getRecaptchaVerifier2FA()
            );
            document.getElementById('tfaEnrollStep1').style.display = 'none';
            document.getElementById('tfaEnrollStep2').style.display = 'block';
            showToast('Code sent! Check your SMS messages.', 'success');
        } catch (e) {
            showToast(explain2FAError(e), 'error');
        }
    }

    async function confirm2FAEnrollment() {
        const code = document.getElementById('tfaCodeInput').value.trim();
        if (!code) return showToast('Enter the code you received.', 'error');
        try {
            const credential = firebase.auth.PhoneAuthProvider.credential(mfaVerificationId, code);
            const assertion = firebase.auth.PhoneMultiFactorGenerator.assertion(credential);
            await currentUser.multiFactor.enroll(assertion, 'Phone number');
            closeModal('twoFactorEnrollModal');
            refresh2FAStatusUI();
            hapticFeedback && hapticFeedback('success');
            showToast('🔐 Two-Factor Authentication enabled!', 'success');
        } catch (e) {
            showToast(explain2FAError(e), 'error');
        }
    }

    async function disable2FA() {
        if (!confirm('Turn off Two-Factor Authentication? Your account will only be protected by your password.')) return;
        try {
            const enrolledFactors = currentUser.multiFactor.enrolledFactors;
            for (const factor of enrolledFactors) {
                await currentUser.multiFactor.unenroll(factor);
            }
            refresh2FAStatusUI();
            showToast('Two-Factor Authentication disabled.', 'info');
        } catch (e) {
            showToast(explain2FAError(e), 'error');
        }
    }

    // --- Sign-in challenge (for a user who already has 2FA enrolled) ---
    // Called from loginUser()'s .catch() in js/01-core/02-navigation-auth.js
    // when Firebase throws auth/multi-factor-auth-required instead of
    // completing the sign-in.
    function handleMFASignInChallenge(error) {
        mfaSignInResolver = error.resolver;
        const hint = mfaSignInResolver.hints[0];
        document.getElementById('mfaChallengePhoneHint').innerText = hint.phoneNumber || 'your registered phone';
        document.getElementById('mfaChallengeCodeInput').value = '';
        openModal('mfaSignInChallengeModal');

        const phoneAuthProvider = new firebase.auth.PhoneAuthProvider(auth);
        phoneAuthProvider.verifyPhoneNumber(
            { multiFactorHint: hint, session: mfaSignInResolver.session },
            getRecaptchaVerifier2FA()
        ).then(verificationId => {
            mfaVerificationId = verificationId;
        }).catch(e => {
            closeModal('mfaSignInChallengeModal');
            showToast(explain2FAError(e), 'error');
        });
    }

    async function confirmMFASignInChallenge() {
        const code = document.getElementById('mfaChallengeCodeInput').value.trim();
        if (!code || !mfaVerificationId || !mfaSignInResolver) return showToast('Enter the code you received.', 'error');
        try {
            const credential = firebase.auth.PhoneAuthProvider.credential(mfaVerificationId, code);
            const assertion = firebase.auth.PhoneMultiFactorGenerator.assertion(credential);
            await mfaSignInResolver.resolveSignIn(assertion);
            closeModal('mfaSignInChallengeModal');
            mfaSignInResolver = null;
            // onAuthStateChanged (js/01-core/02-navigation-auth.js) picks up
            // the now-completed sign-in from here automatically.
        } catch (e) {
            showToast(explain2FAError(e), 'error');
        }
    }

    function explain2FAError(e) {
        if (e.code === 'auth/operation-not-allowed' || e.code === 'auth/admin-restricted-operation') {
            return 'Two-Factor Authentication isn\u2019t turned on for this app yet (needs a one-time setup in the Firebase Console).';
        }
        if (e.code === 'auth/invalid-verification-code') return 'That code doesn\u2019t look right — check and try again.';
        if (e.code === 'auth/too-many-requests') return 'Too many attempts — please wait a bit and try again.';
        return e.message || 'Something went wrong.';
    }
