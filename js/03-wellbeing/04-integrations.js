// Webhook integration (WhatsApp/SMS via Zapier/Make/IFTTT), Google Calendar 2-way OAuth sync.
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".
    // BATCH 2 — WEBHOOK (WhatsApp/SMS via Zapier/Make/IFTTT)
    // ============================================================
    function sendWebhookNotification(reminder) {
        const url = (localStorage.getItem('webhookUrl') || '').trim();
        if (!url) return;
        const plainNotes = (reminder.notes || '').replace(/<[^>]*>/g, '');
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `⏰ Reminder: ${reminder.task}`,
                task: reminder.task,
                notes: plainNotes,
                time: reminder.time,
                priority: reminder.priority || 'medium'
            })
        }).catch(() => {});
    }

    // ============================================================
    // BATCH 2 — GOOGLE CALENDAR 2-WAY SYNC
    // ============================================================
    let gcalTokenClient = null;
    let gcalAccessToken = null;

    function loadGcalScripts(callback) {
        if (window.google && window.google.accounts) return callback();
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.onload = callback;
        s.onerror = () => showToast('Could not load Google script. Check internet.', 'error');
        document.head.appendChild(s);
    }

    function connectGoogleCalendar() {
        const clientIdInput = document.getElementById('gcalClientIdInput');
        const clientId = clientIdInput?.value.trim();
        if (!clientId) return showToast('Paste Google Client ID first!', 'error');
        localStorage.setItem('gcalClientId', clientId);
        loadGcalScripts(() => {
            gcalTokenClient = google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: 'https://www.googleapis.com/auth/calendar.events',
                callback: (resp) => {
                    if (resp.error) return showToast('Google auth error: ' + resp.error, 'error');
                    gcalAccessToken = resp.access_token;
                    document.getElementById('gcalStatusText').innerText = '✅ Connected! Tap "Sync Now" to sync.';
                    showToast('Google Calendar Connected! 🎉', 'success');
                    syncToCloud();
                }
            });
            gcalTokenClient.requestAccessToken();
        });
    }

    async function syncFromGoogleCalendar() {
        if (!gcalAccessToken) return showToast('Tap "Connect" first!', 'error');
        document.getElementById('gcalStatusText').innerText = '🔄 Syncing...';
        let reminders = safeStorage('reminders', []);
        let pushCount = 0, pullCount = 0;

        for (let r of reminders) {
            if (!r.gcalEventId && r.status !== 'completed' && !r.archived && r.time) {
                try {
                    const start = new Date(r.time);
                    const end = new Date(start.getTime() + 3600000);
                    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + gcalAccessToken, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            summary: r.task,
                            description: (r.notes||'').replace(/<[^>]*>/g,''),
                            start: { dateTime: start.toISOString() },
                            end: { dateTime: end.toISOString() }
                        })
                    });
                    const data = await res.json();
                    if (data.id) { r.gcalEventId = data.id; pushCount++; }
                } catch(e) {}
            }
        }

        try {
            const timeMin = new Date().toISOString();
            const timeMax = new Date(Date.now() + 30*86400000).toISOString();
            const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`, {
                headers: { 'Authorization': 'Bearer ' + gcalAccessToken }
            });
            const data = await res.json();
            const existingIds = new Set(reminders.map(r => r.gcalEventId).filter(Boolean));
            (data.items || []).forEach(ev => {
                if (existingIds.has(ev.id)) return;
                const startTime = ev.start.dateTime || (ev.start.date + 'T09:00');
                reminders.push({
                    id: Date.now() + Math.floor(Math.random()*1000),
                    task: ev.summary || 'Untitled Event',
                    notes: ev.description || '',
                    time: startTime.slice(0,16),
                    priority: 'medium',
                    repeat: 'none', status: 'pending', notified: false, pinned: false,
                    tags: 'gcal', preAlarm: 0, gcalEventId: ev.id, category: {name:'Calendar', icon:'📅'}
                });
                pullCount++;
            });
        } catch(e) {}

        localStorage.setItem('reminders', JSON.stringify(reminders));
        loadReminders();
        syncToCloud();
        document.getElementById('gcalStatusText').innerText = `✅ Synced! ${pushCount} sent, ${pullCount} imported.`;
        showToast(`Calendar Synced: ${pushCount} sent, ${pullCount} new 📅`, 'success');
    }

    function showGcalInstructions() {
        alert(
            "📅 Free Google Calendar Client ID Setup:\n\n" +
            "1. Go to console.cloud.google.com\n" +
            "2. Create a new Project\n" +
            "3. APIs & Services → Enable 'Google Calendar API'\n" +
            "4. OAuth consent screen → External → Add your email as Test User\n" +
            "5. Credentials → Create Credentials → OAuth Client ID → Web application\n" +
            "6. Add this app's URL under 'Authorized JavaScript origins'\n" +
            "7. Copy the Client ID and paste it above!\n\n" +
            "Free forever for personal use 🎉\n" +
            "Note: You'll need to tap 'Connect' once per session (token expires after ~1 hour)."
        );
    }

    // ============================================================
