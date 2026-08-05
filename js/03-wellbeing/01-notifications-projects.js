// Push notification permission & settings, Projects/Folders CRUD and rendering.
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".

    // FEATURE 1: PUSH NOTIFICATIONS
    // ============================================================
    function requestNotificationPermission() {
        if (!('Notification' in window)) {
            return showToast('Browser does not support notifications', 'error');
        }
        window.Permissions.requestNotifications().then(granted => {
            if (granted) {
                localStorage.setItem('pushNotif', 'true');
                const btn = document.getElementById('notifBtn');
                if (btn) { btn.innerText = '✅ On'; btn.style.background = '#34c759'; }
                new Notification('Master App', { body: 'Notifications are now active! ✅' });
                showToast('Push Notifications Enabled!', 'success');
            } else {
                localStorage.setItem('pushNotif', 'false');
                showToast('Notification permission denied', 'error');
            }
        });
    }
    // Alias so Settings button works
    const requestPushNotification = requestNotificationPermission;

    function showPushNotification(title, body, reminderId, priority) {
        if (Notification.permission !== 'granted' || localStorage.getItem('pushNotif') !== 'true') return;

        // NOTIFICATION IMPROVEMENT: vibration now reflects urgency instead of
        // every notification feeling the same; icon/badge give it a branded
        // look instead of the browser's generic placeholder.
        const vibrate = priority === 'high' ? [200, 100, 200, 100, 200] : priority === 'low' ? [120] : [150, 75, 150];
        const options = {
            body: body || 'Time to complete this task!',
            requireInteraction: true,
            tag: 'reminder-' + title,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            vibrate,
            data: { reminderId: reminderId || null }
        };

        // Action buttons (Mark Done / Snooze) only work via a Service-Worker-
        // registered notification, not the plain Notification constructor —
        // and only make sense when there's an actual reminder to act on.
        if (reminderId && navigator.serviceWorker) {
            navigator.serviceWorker.ready.then(reg => {
                reg.showNotification('⏰ ' + title, {
                    ...options,
                    actions: [
                        { action: 'done', title: '✅ Mark Done' },
                        { action: 'snooze', title: '⏰ Snooze 10m' }
                    ]
                });
            }).catch(() => {
                const n = new Notification('⏰ ' + title, options);
                n.onclick = function() { window.focus(); n.close(); };
            });
        } else {
            const n = new Notification('⏰ ' + title, options);
            n.onclick = function() { window.focus(); n.close(); };
        }
    }

    // Handles a tap on a notification's action button, relayed here via
    // postMessage from sw.js's notificationclick listener (see index.html's
    // service worker message handler).
    function handleNotificationAction(action, reminderId) {
        if (!reminderId) return;
        if (action === 'done' && typeof toggleStatus === 'function') {
            toggleStatus(reminderId);
        } else if (action === 'snooze' && typeof snoozeTask === 'function') {
            snoozeTask(reminderId, 10);
        }
    }

    // Init notification button state on load
    document.addEventListener('DOMContentLoaded', () => {
        if (localStorage.getItem('pushNotif') === 'true' && Notification.permission === 'granted') {
            const btn = document.getElementById('notifBtn');
            if (btn) { btn.innerText = '✅ On'; btn.style.background = '#34c759'; }
        }
        applyCalendarColors();
    });

    // ============================================================
    // FEATURE 2: PROJECTS / FOLDERS
    // ============================================================
    let activeProjectFilter = '';

    function openProjectsModal() {
        renderProjectsList();
        openModal('projectsModal');
    }

    function addProject() {
        const nameEl = document.getElementById('newProjectName');
        const name = nameEl.value.trim();
        if (!name) return showToast('Enter project name!', 'error');
        const emojiEl = document.getElementById('newProjectEmoji');
        const colorEl = document.getElementById('newProjectColor');
        const projects = safeStorage('projects', []);
        projects.push({
            id: Date.now(),
            name,
            color: colorEl.value || '#007aff',
            emoji: emojiEl.value || '📁',
            milestones: []
        });
        localStorage.setItem('projects', JSON.stringify(projects));
        nameEl.value = ''; emojiEl.value = '';
        renderProjectsList();
        renderProjectFilter();
        renderProjectDropdown();
        syncToCloud();
        showToast('Project added! 📁', 'success');
    }

    function deleteProject(id) {
        let projects = safeStorage('projects', []);
        projects = projects.filter(p => p.id !== id);
        localStorage.setItem('projects', JSON.stringify(projects));
        renderProjectsList();
        renderProjectFilter();
        renderProjectDropdown();
        syncToCloud();
        showToast('Project deleted.', 'error');
    }

    function renderProjectsList() {
        const container = document.getElementById('projectsListContainer');
        if (!container) return;
        const projects = safeStorage('projects', []);
        if (projects.length === 0) {
            container.innerHTML = emptyStateHTML('📁', 'No projects yet. Add one above!');
            return;
        }
        const reminders = safeStorage('reminders', []);
        container.innerHTML = projects.map(p => {
            const tasks = reminders.filter(r => String(r.project) === String(p.id) && !r.archived);
            const completed = tasks.filter(r => r.status === 'completed').length;
            const pct = tasks.length > 0 ? Math.round((completed/tasks.length)*100) : 0;
            return `
            <div style="background:#f2f2f7; padding:12px 14px; border-radius:12px; margin-bottom:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:10px; cursor:pointer; flex:1;" onclick="openProjectDetail(${p.id})">
                        <div style="width:10px; height:10px; border-radius:50%; background:${p.color}; flex-shrink:0;"></div>
                        <span style="font-size:18px;">${p.emoji}</span>
                        <span style="font-weight:600; font-size:14px;">${sanitizeHTML(p.name||'')}</span>
                    </div>
                    <button onclick="deleteProject(${p.id})" style="background:#ffe5e5; color:#ff3b30; border:none; border-radius:8px; padding:6px 10px; cursor:pointer; font-size:13px;">🗑️</button>
                </div>
                <div class="project-progress-track"><div class="project-progress-fill" style="width:${pct}%; background:${p.color};"></div></div>
                <p style="margin:5px 0 0; font-size:11px; color:#8e8e93;">${completed}/${tasks.length} tasks · ${pct}% · tap for details 👆</p>
            </div>
        `;
        }).join('');
    }

    function renderProjectFilter() {
        const container = document.getElementById('projectFilterContainer');
        if (!container) return;
        const projects = safeStorage('projects', []);
        if (projects.length === 0) { container.innerHTML = ''; return; }
        let html = `<button class="template-chip ${activeProjectFilter === '' ? 'active' : ''}" onclick="filterByProject('')">📋 All</button>`;
        projects.forEach(p => {
            const isActive = String(activeProjectFilter) === String(p.id);
            html += `<button class="template-chip ${isActive ? 'active' : ''}" onclick="filterByProject(${p.id})">${sanitizeHTML(p.emoji||'')} ${sanitizeHTML(p.name||'')}</button>`;
        });
        container.innerHTML = html;
    }

    function filterByProject(projectId) {
        activeProjectFilter = projectId;
        renderProjectFilter();
        loadReminders();
    }

    function renderProjectDropdown() {
        const select = document.getElementById('taskProjectInput');
        if (!select) return;
        const projects = safeStorage('projects', []);
        let html = '<option value="">📋 No Project</option>';
        projects.forEach(p => {
            html += `<option value="${p.id}">${sanitizeHTML(p.emoji||'')} ${sanitizeHTML(p.name||'')}</option>`;
        });
        select.innerHTML = html;
    }

    // ============================================================
