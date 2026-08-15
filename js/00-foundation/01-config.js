// ============================================================================
// 00-CONFIG.JS — Central Configuration, Storage Keys & Feature Flags
// ============================================================================
// Loads FIRST, before 01-08, so every other file can read from it. This does
// three things that were previously scattered across all 8 files:
//
//   1. STORAGE_KEYS — every localStorage key the app uses, in one place.
//      Previously ~67 keys were referenced as raw string literals at 150+
//      call sites. That's not being rewritten wholesale here (too large a
//      blast radius to do safely without a real browser to test in) — but
//      every NEW call site in this pass uses this registry, and it gives
//      future work one place to look instead of grepping 8 files.
//
//   2. APP_CONFIG — tunable numbers that used to be "magic numbers" inlined
//      at their call site (debounce delays, check intervals, limits). Where
//      a fix in this pass touched one of these, the call site now reads
//      from here instead of a bare literal.
//
//   3. Feature flags — a small on/off registry with localStorage overrides,
//      so a feature can be disabled centrally (e.g. while debugging) without
//      hunting down every call site. Everything defaults to `true` (on) —
//      turning this file on changes NO behavior by itself.
//
// Everything is exposed on `window` because the app's 01-08 files are
// classic (non-module) scripts that share one global scope by design — see
// DEPLOY.md. Introducing ES modules here would mean rewriting the load
// order and every cross-file function call in the app; this keeps the same
// architecture the rest of the app already uses.
// ============================================================================

(function () {
    'use strict';

    // ------------------------------------------------------------------
    // STORAGE KEYS — grouped by feature area. Values are the exact strings
    // already used in localStorage today; renaming any of these would
    // orphan existing users' saved data, so treat the VALUES as frozen
    // even if you rename the constant on the left.
    // ------------------------------------------------------------------
    const STORAGE_KEYS = Object.freeze({
        // Core task data
        REMINDERS: 'reminders',
        HABITS: 'habits',
        TASK_DEPS: 'taskDeps',
        TASK_DRAFT: 'taskDraft',
        PROJECTS: 'projects',

        // Identity / auth / gamification
        UNIQUE_ID: 'uniqueId',
        JOINED_AT: 'joinedAt',
        USER_LEVEL: 'userLevel',
        HABIT_XP_TASKS: 'habitXP_tasks',
        LOGGED_IN: 'loggedIn',
        IS_PRO: 'isPro',

        // App lock / privacy
        APP_PIN: 'appPin',
        APP_PIN_HASH: 'appPinHash',
        SECRET_PIN: 'secretPin',
        SECRET_PIN_HASH: 'secretPinHash',
        SECRET_NOTE: 'secretNote',

        // Appearance
        APP_FONT_SIZE: 'appFontSize',
        DARK_MODE: 'darkMode',
        AUTO_DARK: 'autoDark',
        EVENT_COLOR: 'eventColor',
        HOLIDAY_COLOR: 'holidayColor',

        // Wellbeing
        MOOD_LOG: 'moodLog',
        SLEEP_LOG: 'sleepLog',
        JOURNAL_ENTRIES: 'journalEntries',

        // Finance / khata
        FIN_DATA: 'finData',
        KHATA_DATA: 'khataData',
        SAVINGS_GOALS: 'savingsGoals',
        RECURRING_EXPS: 'recurringExps',

        // Life admin
        BIRTHDAYS: 'birthdays',
        MEDICINES: 'medicines',
        VEHICLE_LOGS: 'vehicleLogs',
        VEHICLE_REMINDERS: 'vehicleReminders',
        WARRANTIES: 'warranties',
        HOME_MANAGEMENT: 'homeManagement',
        SHOP_DATA: 'shopData',
        TRAVEL_DATA: 'travelData',
        LIFE_EVENTS: 'lifeEvents',
        SUBSCRIPTIONS: 'subscriptions',
        QUICK_NOTES: 'quickNotes',
        FAMILY_MEMBERS: 'familyMembers',

        // Work / study
        SHIFT_CONFIG: 'shiftConfig',
        STUDENT_DATA: 'studentData',
        ATT_DATA: 'attData',
        LAST_SHIFT_SYNC: 'lastShiftSync',

        // Productivity tools
        POMODORO_HISTORY: 'pomodoroHistory',
        DAILY_TASK_GOAL: 'dailyTaskGoal',

        // Automation / notifications
        CUSTOM_RULES: 'customRules',
        ENABLED_RULES: 'enabledRules',
        NOTIF_LOG: 'notifLog',
        SMART_SETTINGS: 'smartSettings',
        LAST_BRIEFING_DATE: 'lastBriefingDate',
        LAST_WEEKLY_REVIEW: 'lastWeeklyReview',
        PUSH_NOTIF: 'pushNotif',
        WEBHOOK_URL: 'webhookUrl',
        HAPTIC: 'haptic',

        // Integrations
        GCAL_CLIENT_ID: 'gcalClientId',

        // Templates / customization
        CUSTOM_TEMPLATES: 'customTemplates',
        MORE_PINNED_FEATURES: 'morePinnedFeatures',
        WIDGET_PREFS: 'widgetPrefs',
        ACTIVE_WORKSPACE: 'activeWorkspace',

        // Onboarding
        ONBOARDING_COMPLETE: 'onboardingComplete',
        ONBOARDING_CHECKLIST_DISMISSED: 'onboardingChecklistDismissed',

        // Migrations
        SCHEMA_VERSION: 'schemaVersion',

        // Added by this refactor pass
        FEATURE_FLAGS: 'featureFlags',
        ERROR_LOG: 'errorLog',
        RECYCLE_BIN: 'recycleBin',
        COIN_BALANCE: 'coinBalance',
        REWARDS: 'rewards',
        WEEKLY_MISSIONS: 'weeklyMissions',
        EMERGENCY_CONTACTS: 'emergencyContacts',
        ANALYTICS_CONSENT: 'analyticsConsent',

        // Dynamic-suffix key (not a literal key on its own): actual key is
        // `healthCheck_` + a YYYY-MM-DD date string, one entry per day.
        HEALTH_CHECK_PREFIX: 'healthCheck_'
    });

    // ------------------------------------------------------------------
    // TUNABLE CONSTANTS — grouped by subsystem. Each note says where the
    // value came from so nobody has to go re-derive it.
    // ------------------------------------------------------------------
    const APP_CONFIG = Object.freeze({
        SYNC: Object.freeze({
            // syncToCloud()'s own internal debounce (js/01-core/03-sync-profile.js).
            // A second, redundant 1500ms debounce used to wrap this same
            // function from js/08 — removed in this pass; see CHANGELOG.
            DEBOUNCE_MS: 2000
        }),
        AI: Object.freeze({
            // Mirrors functions/index.js DAILY_LIMIT / MAX_PROMPT_CHARS.
            // These client-side copies are for UI messaging only — the
            // real enforcement is server-side in the Cloud Function and
            // can't be bypassed by changing this file.
            DAILY_CALL_LIMIT: 50,
            MAX_PROMPT_CHARS: 8000
        }),
        INTERVALS: Object.freeze({
            AUTO_DARK_CHECK_MS: 60 * 1000,
            PRE_ALARM_CHECK_MS: 60 * 1000,
            WEEKLY_REVIEW_CHECK_MS: 60 * 60 * 1000,
            SMART_REMINDER_CHECK_MS: 2 * 60 * 60 * 1000,
            SW_UPDATE_CHECK_MS: 30 * 60 * 1000
        }),
        TIMERS: Object.freeze({
            POMODORO_DEFAULT_SECONDS: 1500,
            FOCUS_MODE_DEFAULT_SECONDS: 1500
        }),
        UI: Object.freeze({
            MAX_PINNED_FEATURES: 6,
            TOAST_AUTO_DISMISS_MS: 3000
        })
    });

    // ------------------------------------------------------------------
    // FEATURE FLAGS — everything defaults to enabled, so loading this file
    // changes no behavior on its own. Flip one off at runtime with e.g.
    // Features.set('swipeToComplete', false) — persists across reloads.
    // ------------------------------------------------------------------
    const DEFAULT_FLAGS = Object.freeze({
        swipeToComplete: true,      // js/08 addSwipeToComplete, wired to the list in this pass
        aiPrioritySuggestion: true, // js/04 aiSuggestPriority, wired to a button in this pass
        icsCalendarExport: true,    // js/03 exportToGoogleCalendar, wired to a button in this pass
        leaderboard: true,          // js/01 openLeaderboard, wired to a button in this pass
        emailVerificationBanner: true
    });

    function loadStoredFlags() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.FEATURE_FLAGS);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    let flags = Object.assign({}, DEFAULT_FLAGS, loadStoredFlags());

    const Features = {
        isEnabled(name) {
            return !!flags[name];
        },
        set(name, enabled) {
            flags[name] = !!enabled;
            try {
                localStorage.setItem(STORAGE_KEYS.FEATURE_FLAGS, JSON.stringify(flags));
            } catch (e) { /* localStorage unavailable (private mode / full) - flag stays in-memory for this session */ }
        },
        getAll() {
            return Object.assign({}, flags);
        },
        reset() {
            flags = Object.assign({}, DEFAULT_FLAGS);
            try { localStorage.removeItem(STORAGE_KEYS.FEATURE_FLAGS); } catch (e) {}
        }
    };

    // Global exposure (existing architecture — see file header).
    window.STORAGE_KEYS = STORAGE_KEYS;
    window.APP_CONFIG = APP_CONFIG;
    window.Features = Features;
})();
