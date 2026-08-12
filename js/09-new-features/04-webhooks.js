// IFTTT / Zapier Webhook Triggers — multi-webhook event dispatcher.
// ADDITIVE to the existing single-URL webhook in js/03-wellbeing/04-integrations.js
// (sendWebhookNotification / localStorage 'webhookUrl') — that one keeps working
// exactly as before. This adds: multiple named webhooks, each subscribed to a
// specific event type (or 'any'), a Send Test button, enable/disable per hook,
// and a delivery log. fireWebhookEvent() is exposed globally so it can be
// called from any future event source, not just reminders.

    const WEBHOOK_EVENTS = ['reminder.due', 'task.completed', 'habit.checkedIn', 'expense.added', 'budget.exceeded', 'period.logged', 'any'];

    function getWebhooks() { return safeStorage('webhooks', []); }
    function saveWebhooks(list) { localStorage.setItem('webhooks', JSON.stringify(list)); syncToCloud(); }
    function getWebhookLog() { return safeStorage('webhookLog', []); }
    function pushWebhookLog(entry) {
        const log = getWebhookLog();
        log.unshift(entry);
        localStorage.setItem('webhookLog', JSON.stringify(log.slice(0, 20)));
        renderWebhookLog();
    }

    function addWebhook() {
        if (!checkFreeTierLimit('webhooks')) return;
        const label = document.getElementById('webhookLabelInput').value.trim();
        const url = document.getElementById('newWebhookUrlInput').value.trim();
        const event = document.getElementById('webhookEventInput').value;
        if (!label || !url) return showToast('Enter a label and URL!', 'error');
        if (!/^https?:\/\//i.test(url)) return showToast('URL must start with http(s)://', 'error');
        const list = getWebhooks();
        list.push({ id: Date.now(), label, url, event, enabled: true });
        saveWebhooks(list);
        document.getElementById('webhookLabelInput').value = '';
        document.getElementById('newWebhookUrlInput').value = '';
        renderWebhooks();
        showToast('Webhook added! 🔗', 'success');
    }

    function deleteWebhook(id) {
        saveWebhooks(getWebhooks().filter(w => w.id !== id));
        renderWebhooks();
    }

    function toggleWebhook(id) {
        const list = getWebhooks();
        const w = list.find(x => x.id === id);
        if (w) w.enabled = !w.enabled;
        saveWebhooks(list);
        renderWebhooks();
    }

    async function testWebhook(id) {
        const w = getWebhooks().find(x => x.id === id);
        if (!w) return;
        await deliverWebhook(w, { test: true, message: 'Test event from Master Reminder App', ts: new Date().toISOString() });
        showToast('Test sent — check your Zapier/IFTTT/Make history', 'info');
    }

    async function deliverWebhook(webhook, payload) {
        let status = 'sent';
        try {
            await fetch(webhook.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) { status = 'failed'; }
        pushWebhookLog({ id: Date.now(), label: webhook.label, event: payload.event || 'test', status, time: new Date().toLocaleString('en-IN') });
    }

    // Call this from anywhere in the app to notify all subscribed webhooks.
    // e.g. fireWebhookEvent('habit.checkedIn', { habit: name, streak: n })
    function fireWebhookEvent(eventName, payload) {
        const list = getWebhooks().filter(w => w.enabled && (w.event === eventName || w.event === 'any'));
        if (!list.length) return;
        const body = Object.assign({ event: eventName }, payload);
        list.forEach(w => deliverWebhook(w, body));
    }

    function renderWebhooks() {
        const c = document.getElementById('webhooksList');
        if (!c) return;
        const list = getWebhooks();
        if (!list.length) { c.innerHTML = '<p style="text-align:center; font-size:12px; color:#8e8e93; padding:12px 0;">No webhooks yet.</p>'; return; }
        c.innerHTML = list.map(w => `
            <div style="background:var(--card-bg,#f7f7f9); border-radius:12px; padding:10px 12px; margin-bottom:8px; opacity:${w.enabled ? '1' : '0.5'};">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <b style="font-size:13px;">${sanitizeHTML(w.label)}</b>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <input type="checkbox" ${w.enabled ? 'checked' : ''} onchange="toggleWebhook(${w.id})">
                        <span onclick="testWebhook(${w.id})" role="button" tabindex="0" style="font-size:11px; color:var(--primary); cursor:pointer;">Test</span>
                        <span onclick="deleteWebhook(${w.id})" role="button" tabindex="0" style="color:#ff3b30; cursor:pointer;">✖</span>
                    </div>
                </div>
                <div style="font-size:11px; color:#8e8e93; margin-top:3px; word-break:break-all;">${sanitizeHTML(w.event)} → ${sanitizeHTML(w.url)}</div>
            </div>
        `).join('');
    }

    function renderWebhookLog() {
        const c = document.getElementById('webhookLogList');
        if (!c) return;
        const log = getWebhookLog();
        c.innerHTML = log.map(l => `
            <div style="display:flex; justify-content:space-between; font-size:11px; padding:4px 0; border-bottom:1px solid var(--border-color,#e5e5ea);">
                <span>${sanitizeHTML(l.label)} · ${sanitizeHTML(l.event)}</span>
                <span style="color:${l.status === 'sent' ? '#34c759' : '#ff3b30'};">${l.status} · ${l.time}</span>
            </div>
        `).join('') || '<p style="font-size:11px; color:#8e8e93;">No deliveries yet.</p>';
    }

    function openWebhooksModal() {
        renderWebhooks();
        renderWebhookLog();
        openModal('webhooksModal');
    }
