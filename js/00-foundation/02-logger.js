// ============================================================================
// 00-LOGGER.JS — Error Logging & Crash Reporting
// ============================================================================
// This app already had a global window.onerror / window.onunhandledrejection
// pair (previously in what's now the js/02-tasks/ folder) that console.log'd
// crashes. That old pair has been removed entirely — this file is its
// replacement, and does three things the old version didn't:
//
//   1. Persists a rolling log of the last 50 errors to localStorage, so a
//      crash survives a reload/relaunch instead of vanishing the moment the
//      console closes.
//   2. Gives app code a real logging API (AppLogger.log/warn/error) instead
//      of ad-hoc console.log calls, so future work has one place to route
//      through (e.g. if a remote reporting endpoint is added later, it's a
//      one-file change here, not a find-and-replace across 8 files).
//   3. Exposes a way to actually SEE the log (getRecentErrors/exportLog),
//      wired into Settings as "View Error Log" so a user hitting a bug can
//      hand you something more useful than "it just didn't work."
//
// No data leaves the device — this is a local, on-device log, not a remote
// crash-reporting service. Wiring this to a real backend (e.g. an
// error-tracking provider) is a separate, deliberate decision involving a
// privacy-policy update; this just makes sure the information isn't
// thrown away before that decision gets made.
// ============================================================================

(function () {
    'use strict';

    const KEY = (window.STORAGE_KEYS && window.STORAGE_KEYS.ERROR_LOG) || 'errorLog';
    const MAX_ENTRIES = 50;

    function readLog() {
        try {
            return JSON.parse(localStorage.getItem(KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    function persist(entry) {
        try {
            const log = readLog();
            log.push(entry);
            while (log.length > MAX_ENTRIES) log.shift();
            localStorage.setItem(KEY, JSON.stringify(log));
        } catch (e) {
            // Storage full or unavailable (private browsing). The entry
            // still went to console below — nothing more we can safely do.
        }
    }

    function record(level, message, extra) {
        const entry = {
            level: level,
            message: String(message == null ? '' : message).slice(0, 500),
            extra: extra ? String(extra).slice(0, 2000) : undefined,
            page: (typeof location !== 'undefined' ? location.pathname : ''),
            time: new Date().toISOString()
        };
        persist(entry);
        if (level === 'error') console.error('[App]', message, extra || '');
        else if (level === 'warn') console.warn('[App]', message, extra || '');
        else console.log('[App]', message, extra || '');
        return entry;
    }

    window.AppLogger = {
        log: function (msg, extra) { return record('info', msg, extra); },
        warn: function (msg, extra) { return record('warn', msg, extra); },
        error: function (msg, extra) { return record('error', msg, extra); },
        getRecentErrors: readLog,
        clear: function () { try { localStorage.removeItem(KEY); } catch (e) {} },
        exportLog: function () { return JSON.stringify(readLog(), null, 2); }
    };

    // UI hooks for the "View Error Log" button in Settings. Defined here
    // (not called until a user taps the button, long after every file has
    // loaded) so it's fine that sanitizeHTML/openModal/showToast are
    // declared later, in 01/02.
    window.openErrorLogModal = function () {
        const container = document.getElementById('errorLogContainer');
        if (container) {
            const entries = window.AppLogger.getRecentErrors();
            if (!entries.length) {
                container.innerHTML = '<p style="text-align:center;color:#8e8e93;margin:0;">No errors logged. 🎉</p>';
            } else {
                const esc = typeof sanitizeHTML === 'function' ? sanitizeHTML : function (s) { return s; };
                container.innerHTML = entries.slice().reverse().map(function (e) {
                    return esc('[' + e.time + '] ' + e.level.toUpperCase() + ': ' + e.message + (e.extra ? ' (' + e.extra + ')' : ''));
                }).join('\n\n');
            }
        }
        if (typeof openModal === 'function') openModal('errorLogModal');
    };

    window.copyErrorLog = function () {
        const text = window.AppLogger.exportLog();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                if (typeof showToast === 'function') showToast('Error log copied!', 'success');
            }).catch(function () {
                if (typeof showToast === 'function') showToast('Could not copy — try selecting the text manually.', 'error');
            });
        }
    };

    window.clearErrorLog = function () {
        window.AppLogger.clear();
        window.openErrorLogModal();
        if (typeof showToast === 'function') showToast('Error log cleared.', 'success');
    };

    // Global crash capture. Using addEventListener (not window.onerror=)
    // so this coexists safely with anything else that might listen for
    // these events, rather than silently clobbering/being clobbered.
    // This replaces the equivalent window.onerror/onunhandledrejection pair
    // that used to live in what's now the js/02-tasks/ folder, including its
    // toast (with the same noise filter for extension/ResizeObserver errors
    // that aren't actionable or the app's fault).
    window.addEventListener('error', function (e) {
        const msg = e.message || 'Unknown error';
        window.AppLogger.error(msg, (e.filename || '') + ':' + (e.lineno || '?'));
        if (typeof showToast === 'function' && !(msg.includes('Script error') || msg.includes('ResizeObserver'))) {
            showToast('Something went wrong. Please try again.', 'error');
        }
    });
    window.addEventListener('unhandledrejection', function (e) {
        const reason = e.reason && e.reason.message ? e.reason.message : e.reason;
        window.AppLogger.error('Unhandled promise rejection', reason);
    });
})();
