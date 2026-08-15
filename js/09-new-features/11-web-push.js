// Web Push Notifications — true background push via Firebase Cloud Messaging,
// distinct from the app's existing LOCAL notifications (js/03-wellbeing/
// 01-notifications-projects.js's showPushNotification), which only fire while
// a tab is open. This delivers notifications even when the app is fully
// closed, sent by the scheduled Cloud Function `sendDueReminderPushes` (see
// functions/index.js) reading each user's fcmTokens field.
//
// SETUP YOU NEED TO DO (this code alone isn't enough — FCM requires a real key):
//   1. Firebase Console → Project Settings → Cloud Messaging → generate a
//      "Web Push certificate" (VAPID key) and paste it into FCM_VAPID_KEY below.
//   2. Deploy functions/index.js (adds the scheduled sender).
//   3. firebase-messaging-compat.js script tag must be added to index.html
//      (see integration notes) and this app registered as a valid messaging
//      sender (already true — it uses the same firebaseConfig as everything else).

    const FCM_VAPID_KEY = 'PASTE_YOUR_VAPID_KEY_HERE';

    async function requestWebPushPermission() {
        if (!('Notification' in window)) return showToast('Push notifications are not supported in this browser.', 'error');
        if (!currentUser) return showToast('Login required!', 'error');
        if (FCM_VAPID_KEY === 'PASTE_YOUR_VAPID_KEY_HERE') {
            return showToast('Push isn\'t configured yet — add your VAPID key first (see 11-web-push.js).', 'error');
        }
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return showToast('Notification permission denied.', 'error');
            const messaging = firebase.messaging();
            const token = await messaging.getToken({ vapidKey: FCM_VAPID_KEY });
            if (!token) return showToast('Could not get a push token — try again.', 'error');
            await saveFcmToken(token);
            showToast('Push notifications enabled! 🔔', 'success');
            refreshWebPushStatus();
        } catch (e) { showToast('Push setup error: ' + e.message, 'error'); }
    }

    async function saveFcmToken(token) {
        const ref = db.collection('users').doc(currentUser.uid);
        const doc = await ref.get();
        const existing = (doc.exists && doc.data().fcmTokens) || [];
        if (!existing.includes(token)) {
            await ref.update({ fcmTokens: [...existing, token] });
        }
        localStorage.setItem('fcmTokenRegistered', 'true');
    }

    async function disableWebPush() {
        if (!currentUser || !firebase.messaging) return;
        try {
            const messaging = firebase.messaging();
            const token = await messaging.getToken({ vapidKey: FCM_VAPID_KEY }).catch(() => null);
            if (token) {
                const ref = db.collection('users').doc(currentUser.uid);
                const doc = await ref.get();
                const existing = (doc.exists && doc.data().fcmTokens) || [];
                await ref.update({ fcmTokens: existing.filter(t => t !== token) });
                await messaging.deleteToken();
            }
        } catch (e) { /* best-effort cleanup */ }
        localStorage.removeItem('fcmTokenRegistered');
        showToast('Push notifications disabled', 'info');
        refreshWebPushStatus();
    }

    function refreshWebPushStatus() {
        const el = document.getElementById('webPushStatus');
        if (!el) return;
        const registered = localStorage.getItem('fcmTokenRegistered') === 'true';
        const permission = ('Notification' in window) ? Notification.permission : 'unsupported';
        el.innerText = registered && permission === 'granted' ? '🔔 Enabled on this device' : '🔕 Not enabled on this device';
    }
