// Crash / Error Monitoring — catches uncaught JS errors and unhandled promise
// rejections app-wide. Logs locally via the existing logger (js/00-foundation/
// 02-logger.js's record()), and additionally writes a create-only report to a
// new Firestore collection (crash_reports) so you — the developer — can see
// what's breaking for real users via the Firebase Console, without needing a
// third-party crash service. Users can never read each other's (or even their
// own) reports back; see firestore.rules.
// Rate-limited per session so an error loop can't spam Firestore.

    let crashReportsSentThisSession = 0;
    const MAX_CRASH_REPORTS_PER_SESSION = 5;

    function buildCrashReport(message, stack, source) {
        return {
            message: String(message || '').slice(0, 500),
            stack: String(stack || '').slice(0, 2000),
            source, // 'error' | 'unhandledrejection'
            url: window.location.href,
            userAgent: navigator.userAgent,
            appVersion: (typeof APP_VERSION !== 'undefined') ? APP_VERSION : 'unknown',
            uid: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : null,
            ts: new Date().toISOString()
        };
    }

    async function reportCrash(message, stack, source) {
        try {
            if (typeof record === 'function') record('error', message, { stack, source });
        } catch (e) { /* logger itself must never throw */ }

        if (crashReportsSentThisSession >= MAX_CRASH_REPORTS_PER_SESSION) return;
        if (typeof db === 'undefined' || !db) return; // Firestore not ready yet (e.g. very early load errors)
        crashReportsSentThisSession++;
        try {
            const report = buildCrashReport(message, stack, source);
            await db.collection('crash_reports').add(report);
        } catch (e) { /* never let crash reporting itself crash the app */ }
    }

    window.addEventListener('error', (event) => {
        reportCrash(event.message, event.error && event.error.stack, 'error');
    });

    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        reportCrash(reason && reason.message ? reason.message : String(reason), reason && reason.stack, 'unhandledrejection');
    });
