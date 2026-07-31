// Premium Themes — 5 additional, richer theme combinations beyond the
// original 6 free swatches (see index.html Appearance section), gated
// behind Pro status. isProUser already existed (js/01-core/02-navigation-auth.js)
// but wasn't gating anything yet — this is its first real use.

    function tryApplyPremiumTheme(name, p, ph, b1, b2) {
        if (!isProUser) {
            showToast('🔒 ' + name + ' is a Pro theme — upgrade to unlock all premium themes.', 'error');
            openModal('proModal');
            return;
        }
        setThemeColor(p, ph, b1, b2);
        showToast(name + ' theme applied! ✨', 'success');
    }

    // Called from toggleAdvancedSettings() each time the Appearance panel is
    // opened, since that's the one place these swatches become visible —
    // simpler and just as correct as toggling a body class from every place
    // isProUser gets set, since isProUser is always current by the time a
    // user can actually open this panel.
    function refreshPremiumThemeLocks() {
        const badge = document.getElementById('premiumThemesBadge');
        if (badge) badge.style.display = isProUser ? 'none' : 'inline-block';
        document.querySelectorAll('.theme-swatch-lock').forEach(el => {
            el.style.display = isProUser ? 'none' : 'inline-block';
        });
    }
