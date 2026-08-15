// ============================================================================
// 00-SERVICES.JS — Permission Manager, API Layer, Service Registry
// ============================================================================
// Three related, previously-missing pieces of architecture:
//
// PERMISSIONS — every browser permission prompt (notifications, microphone,
// geolocation, wake lock) used to be requested inline, at the call site,
// with its own one-off .catch() and its own wording. That's still true for
// most call sites after this pass (rewriting every one was more churn than
// this pass could safely verify without a browser to test in) — but the
// two highest-traffic ones (notifications, microphone) now go through here,
// and everything else can be migrated to this same pattern incrementally.
//
// API — a thin layer in front of the direct `db.collection(...)` /
// `functions.httpsCallable(...)` calls for the operations that read/write
// the user's whole document (sync + initial load) and call the AI proxy.
// This is NOT a rewrite of every Firestore call in the app (there are
// several dozen, scattered by feature area, and moving all of them here
// blind is a much larger and riskier change) — it's the handful of calls
// that are central enough to be worth one seam. Everything else still
// calls `db`/`auth`/`functions` directly, which remains completely valid.
//
// SERVICE REGISTRY (window.App) — this app has no build step, no ES
// modules, and no dependency-injection framework, and introducing one
// would mean rewriting the load order and every cross-file call in all 8
// files — too large a change to make safely in this pass. What's here
// instead is the pragmatic version of what DI is actually FOR in an app
// like this: one object where the app's cross-cutting services live, so
// code depends on `App.logger` / `App.api` rather than reaching for
// scattered globals, and a test can swap in a fake by reassigning a
// property instead of monkeypatching `window`.
// ============================================================================

(function () {
    'use strict';

    // ------------------------------------------------------------------
    // PERMISSIONS
    // ------------------------------------------------------------------
    const Permissions = {
        /**
         * Requests Notification permission if not already decided.
         * Returns a promise resolving to true/false. Never throws.
         */
        requestNotifications: function () {
            if (typeof Notification === 'undefined') return Promise.resolve(false);
            if (Notification.permission === 'granted') return Promise.resolve(true);
            if (Notification.permission === 'denied') return Promise.resolve(false);
            return Notification.requestPermission().then(function (perm) {
                return perm === 'granted';
            }).catch(function () { return false; });
        },

        /**
         * Requests microphone access for voice memos. Returns a promise
         * resolving to the MediaStream on success, or null on denial/error
         * (never rejects, so callers don't need their own catch).
         */
        requestMicrophone: function () {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                return Promise.resolve(null);
            }
            return navigator.mediaDevices.getUserMedia({ audio: true }).catch(function () {
                return null;
            });
        },

        /**
         * Requests the current position once. Resolves to {lat, lng} or
         * null (denied/unsupported/error) — never rejects.
         */
        requestLocation: function () {
            if (!navigator.geolocation) return Promise.resolve(null);
            return new Promise(function (resolve) {
                navigator.geolocation.getCurrentPosition(
                    function (pos) { resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
                    function () { resolve(null); },
                    { timeout: 8000 }
                );
            });
        },

        /**
         * Requests a screen wake lock. Resolves to the lock object or null.
         * Safe to call even where wakeLock isn't supported.
         */
        requestWakeLock: function () {
            if (!('wakeLock' in navigator)) return Promise.resolve(null);
            return navigator.wakeLock.request('screen').catch(function () { return null; });
        }
    };

    // ------------------------------------------------------------------
    // API LAYER
    // ------------------------------------------------------------------
    // NOTE: these read `db` / `auth` / `functions` / `currentUser` at CALL
    // time, not at file-load time. This file loads before
    // js/01-core/01-bootstrap.js (which is where those are declared), but
    // every script on the page shares one global scope, and none of these
    // functions run until well after all files have finished loading — so
    // the lookup always
    // succeeds. (Verified: `let`/`const` declared at the top level of any
    // classic <script> is visible to every other classic <script> on the
    // page once it has executed, regardless of load order in the source.)
    const API = {
        /** Writes `data` into the signed-in user's Firestore document (merge). */
        saveUserData: function (data) {
            if (!currentUser) return Promise.reject(new Error('Not signed in.'));
            return db.collection('users').doc(currentUser.uid).set(data, { merge: true });
        },

        /** One-time read of the signed-in user's Firestore document. */
        getUserData: function () {
            if (!currentUser) return Promise.reject(new Error('Not signed in.'));
            return db.collection('users').doc(currentUser.uid).get().then(function (doc) {
                return doc.exists ? doc.data() : null;
            });
        },

        /** Subscribes to realtime changes on the signed-in user's document. */
        onUserDataChange: function (callback, onError) {
            if (!currentUser) return function () {};
            return db.collection('users').doc(currentUser.uid).onSnapshot(callback, onError || function (err) {
                window.AppLogger && window.AppLogger.error('onUserDataChange listener failed', err.message);
            });
        },

        /** Top N public profiles ordered by task XP, for the leaderboard. */
        getLeaderboard: function (limit) {
            if (!currentUser) return Promise.reject(new Error('Please sign in to view the leaderboard.'));
            return db.collection('public_profiles')
                .orderBy('habitXP_tasks', 'desc')
                .limit(limit || 10)
                .get();
        },

        /** Calls the server-side Gemini proxy. Throws a plain Error with a display-ready message. */
        callAI: function (prompt) {
            if (!currentUser) return Promise.reject(new Error('Please sign in to use AI features.'));
            const maxChars = (window.APP_CONFIG && window.APP_CONFIG.AI.MAX_PROMPT_CHARS) || 8000;
            if (prompt && prompt.length > maxChars) {
                return Promise.reject(new Error('Prompt too long (max ' + maxChars + ' characters).'));
            }
            const callProxy = functions.httpsCallable('callGeminiProxy');
            return callProxy({ prompt: prompt }).then(function (result) {
                return result.data.text;
            }).catch(function (e) {
                if (e.code === 'resource-exhausted') throw new Error(e.message);
                throw new Error(e.message || 'AI request failed.');
            });
        }
    };

    // ------------------------------------------------------------------
    // SERVICE REGISTRY — populated incrementally as the other 00-*.js
    // files load (each one attaches its piece; order in index.html is
    // config -> logger -> services, so config/logger are already present
    // by the time this line runs).
    // ------------------------------------------------------------------
    window.Permissions = Permissions;
    window.API = API;
    window.App = {
        config: window.APP_CONFIG,
        keys: window.STORAGE_KEYS,
        features: window.Features,
        logger: window.AppLogger,
        permissions: Permissions,
        api: API
    };
})();
