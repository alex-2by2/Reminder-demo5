// Privacy Center & Cookie Consent — ties together 2FA status, data export
// (already existed), account deletion (js/01-core/06-account-deletion.js),
// a DPA request mailto link, and analytics consent. Also where Firebase
// Analytics itself is initialized — gated on real, explicit consent from
// the start, not initialized-by-default with an opt-out available after
// the fact. A boolean "opted out?" flag that defaults to false (i.e.
// tracking ON until someone finds the toggle and turns it off) isn't
// meaningfully different from having no consent mechanism at all — this
// uses a three-state model (undecided / granted / denied) instead, and
// shows a real cookie-consent banner on first visit rather than silently
// tracking until someone stumbles on a settings toggle.
//
// SETUP DEPENDENCY: Firebase Analytics requires Google Analytics to be
// linked to the Firebase project (Firebase Console -> Project Settings ->
// Integrations -> Google Analytics) — a one-time console step only the
// project owner can do, the same way Google Calendar sync needs its own
// OAuth Client ID and 2FA needs Identity Platform enabled (see
// js/01-core/07-two-factor-auth.js). If Analytics isn't linked yet,
// firebase.analytics() calls are harmless no-ops, not errors.

    function getAnalyticsConsent() {
        // null = no choice made yet, 'granted' | 'denied' once they have.
        const v = localStorage.getItem('analyticsConsent');
        return v === 'granted' || v === 'denied' ? v : null;
    }

    function setAnalyticsConsent(value) {
        localStorage.setItem('analyticsConsent', value);
        syncToCloud();
        if (value === 'granted') initAnalyticsIfAllowed();
        else window._analytics = null;
    }

    function initAnalyticsIfAllowed() {
        if (getAnalyticsConsent() !== 'granted') return;
        if (typeof firebase === 'undefined' || !firebase.analytics) return;
        try {
            window._analytics = firebase.analytics();
            window._analytics.logEvent('app_open');
        } catch (e) {
            // Analytics not linked to this Firebase project yet, or unsupported
            // in this environment — not a real error, just means events won't
            // be recorded until the one-time Console setup above is done.
        }
    }

    function logAnalyticsEvent(name, params) {
        if (getAnalyticsConsent() !== 'granted' || !window._analytics) return;
        try { window._analytics.logEvent(name, params || {}); } catch (e) {}
    }

    // --- Cookie Consent Banner (first visit, before any choice is made) ---
    function maybeShowCookieBanner() {
        if (getAnalyticsConsent() !== null) return; // already decided, nothing to ask
        const banner = document.getElementById('cookieConsentBanner');
        if (banner) banner.classList.add('show');
    }

    function respondToCookieBanner(accept) {
        setAnalyticsConsent(accept ? 'granted' : 'denied');
        const banner = document.getElementById('cookieConsentBanner');
        if (banner) banner.classList.remove('show');
        const toggle = document.getElementById('analyticsOptOutToggle');
        if (toggle) toggle.checked = accept;
    }

    // --- Privacy Center toggle (same consent state, reachable any time after) ---
    function toggleAnalyticsOptOut(enabled) {
        setAnalyticsConsent(enabled ? 'granted' : 'denied');
        showToast(enabled ? 'Analytics enabled — thanks for helping us improve the app.' : 'Analytics disabled.', 'success');
    }

    function openPrivacyCenterModal() {
        const toggle = document.getElementById('analyticsOptOutToggle');
        if (toggle) toggle.checked = getAnalyticsConsent() === 'granted';
        refresh2FAStatusUI();
        openModal('privacyCenterModal');
    }
