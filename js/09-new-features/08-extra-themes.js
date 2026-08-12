// More Premium Themes.
// CORRECTION: this file originally also added a system-prefers-color-scheme
// "auto" dark mode option. Turned out the app already has a real auto dark
// mode — a TIME-SCHEDULE version (autoDark / checkAutoDark() in
// js/06-lifestyle/02-settings-core.js, "dark from 8pm to 6am" style), running
// on its own setInterval and writing the same 'darkMode' key and
// 'darkModeToggle' checkbox this file was about to touch too. Two
// independent auto-dark systems fighting over the same key/checkbox would
// flicker unpredictably depending on which one last fired. Rather than
// replace a working, arguably more useful (schedule beats OS-preference for
// a reminder app people use at fixed hours) existing feature, this file now
// does ONLY the genuinely new part: five extra premium themes, reusing
// tryApplyPremiumTheme() exactly as defined in js/01-core/05-premium-themes.js
// (same Pro gate, no changes needed there, no conflict possible).

    function applyThemeSunset() { tryApplyPremiumTheme('Sunset', '#ff6b6b', '#ffa06b', '#fff5f0', '#ffe8dc'); }
    function applyThemeForest() { tryApplyPremiumTheme('Forest', '#2d6a4f', '#40916c', '#f0f7f2', '#d8eadf'); }
    function applyThemeOcean() { tryApplyPremiumTheme('Ocean', '#0077b6', '#00b4d8', '#f0f9ff', '#d6f0fb'); }
    function applyThemeLavender() { tryApplyPremiumTheme('Lavender', '#7c5cbf', '#a78bda', '#f6f3fc', '#e9e1f7'); }
    function applyThemeMonochrome() { tryApplyPremiumTheme('Monochrome', '#2b2b2b', '#5a5a5a', '#f5f5f5', '#e0e0e0'); }
