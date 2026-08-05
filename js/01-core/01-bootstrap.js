// Firebase init, auth/db/functions singletons, security & crash-proof utilities (safeStorage, sanitizeHTML, escInline, emptyStateHTML), localStorage schema versioning/migration, small DOM helpers.
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".

    // --- FIREBASE INITIALIZATION & OFFLINE PERSISTENCE ---
    const firebaseConfig = {
      apiKey: "AIzaSyDc-k1JnOySVExS4QbDsbkh7Ro9pvNydIY",
      authDomain: "reminder-76588.firebaseapp.com",
      projectId: "reminder-76588",
      storageBucket: "reminder-76588.firebasestorage.app",
      messagingSenderId: "813515230126",
      appId: "1:813515230126:web:dde11175645257dc44d63f",
      // SETUP NEEDED: Firebase Analytics (js/00-foundation/04-privacy-analytics.js)
      // won't record anything without this. Get it from Firebase Console ->
      // Project Settings -> Integrations -> Google Analytics (link it if not
      // already linked, which generates this ID) -> paste it here. Until then,
      // analytics calls are harmless no-ops, not errors.
      measurementId: "G-XXXXXXXXXX"
    };

    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    const functions = firebase.functions();
    db.enablePersistence().catch(err => { console.log("Offline mode error:", err.code); });

    // --- Global Variables ---
    let currentUser = null; 
    let timerInterval; 
    let currentTab = 'upcoming';

    // ============================================================
    // SECURITY & CRASH-PROOF UTILITIES
    // ============================================================
    function safeStorage(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null || raw === undefined) return fallback;
            return JSON.parse(raw);
        } catch (e) {
            console.warn('[safeStorage] Corrupt data for key:', key, '- resetting.');
            localStorage.removeItem(key);
            return fallback;
        }
    }

    // ============================================================
    // LOCALSTORAGE SCHEMA VERSIONING
    // ============================================================
    // This app has 57+ separate localStorage keys with no version tracking, which
    // means a future change to any data shape (e.g. renaming a field, changing an
    // array to an object) has no safe way to update existing users' already-stored
    // data — it would just silently break or lose information for anyone who
    // installed before the change.
    //
    // HOW TO ADD A FUTURE MIGRATION:
    //   1. Bump SCHEMA_VERSION by 1.
    //   2. Add an `if (version < N) { migrateToVN_yourDescription(); version = N; }`
    //      block inside runSchemaMigrations, in order.
    //   3. Write migrateToVN_yourDescription() below, following the pattern of
    //      migrateToV2_normalizeReminders: read the key(s) involved, fix them up,
    //      write back ONLY if something actually changed, and never throw —
    //      catch and log, so one bad migration can't brick the whole app on load.
    //
    // Existing users (who predate this system entirely) have no `schemaVersion`
    // key yet. Treating that as version 1 is intentional: version 1 IS today's
    // current data shape, so nothing needs migrating for them until version 2+
    // introduces an actual change.
    const SCHEMA_VERSION = 2;

    function runSchemaMigrations() {
        let version = parseInt(localStorage.getItem('schemaVersion'), 10);
        if (isNaN(version)) version = 1;
        if (version >= SCHEMA_VERSION) return;

        if (version < 2) { migrateToV2_normalizeReminders(); version = 2; }
        // Next one goes here: if (version < 3) { migrateToV3_xyz(); version = 3; }

        localStorage.setItem('schemaVersion', String(version));
    }

    // v2: reminder fields (subtasks, tags, assignee, project, preAlarm, notified, status...)
    // were added incrementally across many feature batches over this app's history.
    // Records saved before a given field existed simply don't have it, which can cause
    // subtle bugs (e.g. `reminder.subtasks.length` on undefined). This fills in safe
    // defaults for anything missing — it never removes or overwrites existing values.
    function migrateToV2_normalizeReminders() {
        try {
            const reminders = safeStorage('reminders', []);
            if (!Array.isArray(reminders) || reminders.length === 0) return;
            let changed = false;
            const normalized = reminders.map(r => {
                const fixed = Object.assign({}, r);
                if (!Array.isArray(fixed.subtasks)) { fixed.subtasks = []; changed = true; }
                if (typeof fixed.tags !== 'string') { fixed.tags = ''; changed = true; }
                if (typeof fixed.notes !== 'string') { fixed.notes = ''; changed = true; }
                if (typeof fixed.assignee !== 'string') { fixed.assignee = ''; changed = true; }
                if (typeof fixed.notified !== 'boolean') { fixed.notified = false; changed = true; }
                if (typeof fixed.pinned !== 'boolean') { fixed.pinned = false; changed = true; }
                if (typeof fixed.archived !== 'boolean') { fixed.archived = false; changed = true; }
                if (!fixed.status) { fixed.status = 'pending'; changed = true; }
                if (!fixed.priority) { fixed.priority = 'medium'; changed = true; }
                return fixed;
            });
            if (changed) {
                localStorage.setItem('reminders', JSON.stringify(normalized));
                console.log('[Migration v2] Normalized', normalized.length, 'reminder records.');
            }
        } catch (e) {
            console.error('[Migration v2] Failed, leaving data untouched:', e);
        }
    }

    function sanitizeHTML(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    // SECURITY: use this (not sanitizeHTML) when a value is embedded inside an inline
    // event-handler attribute as a JS string argument, e.g. onclick="fn('${escInline(x)}')".
    // HTML entity-escaping alone (sanitizeHTML) is NOT enough there: the browser decodes
    // entities in the attribute value BEFORE running it as JS, so an encoded quote (&#39;)
    // still becomes a real ' once the handler executes, and can break out of the JS string.
    // This escapes backslash/quotes for JS-string safety first, then HTML-escapes the rest.
    function escInline(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\r?\n/g, '\\n')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function safeNum(val, fallback) {
        const n = Number(val);
        return isNaN(n) || !isFinite(n) ? (fallback || 0) : n;
    }

    // UI POLISH: styled empty state (icon + message) for "no data yet" screens.
    // The .empty-state/.empty-state-icon/.empty-state-text classes already existed
    // in styles.css but nothing in the app actually used them — every empty list
    // rendered as a single line of plain gray text. This is now the one shared
    // way every list in the app renders "nothing here yet."
    function emptyStateHTML(icon, text) {
        return `<div class="empty-state"><span class="empty-state-icon">${icon}</span><p class="empty-state-text">${sanitizeHTML(text)}</p></div>`;
    }

    function isValidDate(str) {
        if (!str) return false;
        const d = new Date(str);
        return d instanceof Date && !isNaN(d.getTime());
    }

    async function sha256(str) {
        const encoded = new TextEncoder().encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('');
    }

    // India National Holidays & Major Festivals 2026
    const INDIA_HOLIDAYS_2026 = [
        { date: '2026-01-26', name: 'Republic Day', icon: '🇮🇳' },
        { date: '2026-03-04', name: 'Holi', icon: '🎨' },
        { date: '2026-03-21', name: 'Id-ul-Fitr (Eid)', icon: '🌙' },
        { date: '2026-03-26', name: 'Ram Navami', icon: '🙏' },
        { date: '2026-04-03', name: 'Good Friday', icon: '✝️' },
        { date: '2026-05-01', name: 'Labour Day', icon: '🛠️' },
        { date: '2026-05-27', name: 'Bakrid (Eid al-Adha)', icon: '🐐' },
        { date: '2026-06-26', name: 'Muharram', icon: '🕌' },
        { date: '2026-08-15', name: 'Independence Day', icon: '🇮🇳' },
        { date: '2026-09-04', name: 'Janmashtami', icon: '🦚' },
        { date: '2026-10-02', name: 'Gandhi Jayanti', icon: '🕊️' },
        { date: '2026-10-20', name: 'Dussehra', icon: '🏹' },
        { date: '2026-11-08', name: 'Diwali', icon: '🪔' },
        { date: '2026-11-24', name: 'Guru Nanak Jayanti', icon: '☬' },
        { date: '2026-12-25', name: 'Christmas', icon: '🎄' },
    ];

    function getIndiaHoliday(dateStr) {
        return INDIA_HOLIDAYS_2026.find(h => h.date === dateStr) || null;
    }

    function $id(id) { return document.getElementById(id); }
    function setVal(id, value) { const el = $id(id); if (el) el.value = value; }
    function setTxt(id, text) { const el = $id(id); if (el) el.innerText = text; }
    function setDisplay(id, value) { const el = $id(id); if (el) el.style.display = value; }

    // ============================================================
    // SPEED-DIAL FLOATING ACTION BUTTON
    // ============================================================
    let fabMenuOpen = false;

