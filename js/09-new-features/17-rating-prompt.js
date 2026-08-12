// App Rating Prompt — asks at a reasonable moment (not on first launch), only
// once unless snoozed, and routes based on sentiment: 4-5 stars → store link
// (protects your public rating from premature negative reviews, standard
// practice); 1-3 stars → private feedback box instead of the store.
//
// STORE LINKS: fill these in once the app is actually listed (see feature #12,
// store-listing-copy.md) — until then the buttons just say so instead of
// opening a broken link.

    const PLAY_STORE_URL = 'PASTE_YOUR_PLAY_STORE_URL_HERE';
    const APP_STORE_URL = 'PASTE_YOUR_APP_STORE_URL_HERE';
    const RATING_MIN_DAYS = 3;
    const RATING_MIN_TASKS_COMPLETED = 10;
    const RATING_SNOOZE_DAYS = 30;

    function getFirstOpenDate() {
        let d = localStorage.getItem('firstOpenDate');
        if (!d) { d = getTodayStr(); localStorage.setItem('firstOpenDate', d); }
        return d;
    }

    function daysSince(dateStr) {
        return Math.floor((new Date(getTodayStr()) - new Date(dateStr)) / 86400000);
    }

    function maybeShowRatingPrompt() {
        if (localStorage.getItem('ratingPromptDone') === 'true') return;
        const snoozedAt = localStorage.getItem('ratingPromptSnoozedAt');
        if (snoozedAt && daysSince(snoozedAt) < RATING_SNOOZE_DAYS) return;

        const firstOpen = getFirstOpenDate();
        if (daysSince(firstOpen) < RATING_MIN_DAYS) return;

        const reminders = safeStorage('reminders', []);
        const completed = reminders.filter(r => r.status === 'completed').length;
        if (completed < RATING_MIN_TASKS_COMPLETED) return;

        setTimeout(() => openModal('ratingPromptModal'), 1200);
    }

    function submitRatingPromptStars(stars) {
        localStorage.setItem('ratingPromptStars', String(stars));
        if (stars >= 4) {
            document.getElementById('ratingPromptHappyView').style.display = 'block';
            document.getElementById('ratingPromptFeedbackView').style.display = 'none';
        } else {
            document.getElementById('ratingPromptHappyView').style.display = 'none';
            document.getElementById('ratingPromptFeedbackView').style.display = 'block';
        }
    }

    function openStoreForRating() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const url = isIOS ? APP_STORE_URL : PLAY_STORE_URL;
        if (!url || url.startsWith('PASTE_')) {
            showToast('Thanks! (Store link isn\'t set up yet — see 17-rating-prompt.js)', 'info');
        } else {
            window.open(url, '_blank');
        }
        localStorage.setItem('ratingPromptDone', 'true');
        closeModal('ratingPromptModal');
    }

    function submitRatingFeedback() {
        const text = document.getElementById('ratingPromptFeedbackInput').value.trim();
        if (text) {
            const feedback = safeStorage('ratingFeedback', []);
            feedback.push({ stars: localStorage.getItem('ratingPromptStars'), text, date: getTodayStr() });
            localStorage.setItem('ratingFeedback', JSON.stringify(feedback));
            syncToCloud();
        }
        localStorage.setItem('ratingPromptDone', 'true');
        closeModal('ratingPromptModal');
        showToast('Thanks for the feedback — we\'ll use it to improve! 🙏', 'success');
    }

    function snoozeRatingPrompt() {
        localStorage.setItem('ratingPromptSnoozedAt', getTodayStr());
        closeModal('ratingPromptModal');
    }
