// Kanban board, project progress/milestones/timeline (Gantt-lite), shared workspace (family/team shared lists).
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".
    // BATCH 5 — KANBAN BOARD
    // ============================================================
    let kanbanSortables = [];

    function openKanbanModal() {
        openModal('kanbanModal');
        renderKanban();
        setTimeout(initKanbanSortable, 150);
    }

    function renderKanban() {
        const reminders = safeStorage('reminders', []);
        const active = reminders.filter(r => !r.archived);
        const cols = { todo: [], inprogress: [], done: [] };

        active.forEach(r => {
            let col = r.kanbanCol;
            if (!col) col = (r.status === 'completed') ? 'done' : 'todo';
            if (r.status === 'completed') col = 'done';
            if (!cols[col]) cols[col] = [];
            cols[col].push(r);
        });

        ['todo','inprogress','done'].forEach(col => {
            const idSuffix = col.charAt(0).toUpperCase() + col.slice(1);
            const container = document.getElementById('kanbanCol' + idSuffix);
            const countEl = document.getElementById('kanbanCount' + idSuffix);
            const list = cols[col] || [];
            countEl.innerText = list.length;
            container.innerHTML = list.map(r => {
                const prioColor = r.priority === 'high' ? '#ff3b30' : r.priority === 'low' ? '#34c759' : '#ff9500';
                const dateStr = r.time ? new Date(r.time).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : '';
                return `<div class="kanban-card" data-id="${r.id}">
                    <div class="kanban-card-title"><span class="kanban-priority-dot" style="background:${prioColor};"></span>${sanitizeHTML(r.task||'')}</div>
                    <div style="font-size:10px; color:#8e8e93; margin-top:4px;">📅 ${dateStr}</div>
                </div>`;
            }).join('') || `<p style="text-align:center; font-size:11px; color:#8e8e93; padding:25px 0;">Empty</p>`;
        });
    }

    function initKanbanSortable() {
        kanbanSortables.forEach(s => s.destroy());
        kanbanSortables = [];
        ['kanbanColTodo','kanbanColInprogress','kanbanColDone'].forEach(id => {
            const el = document.getElementById(id);
            const s = new Sortable(el, {
                group: 'kanban',
                animation: 150,
                delay: 100,
                delayOnTouchOnly: true,
                onEnd: function(evt) {
                    const taskId = Number(evt.item.getAttribute('data-id'));
                    const newCol = evt.to.getAttribute('data-col');
                    updateKanbanCard(taskId, newCol);
                }
            });
            kanbanSortables.push(s);
        });
    }

    function updateKanbanCard(id, newCol) {
        let reminders = safeStorage('reminders', []);
        const r = reminders.find(x => x.id === id);
        if (!r) return;
        r.kanbanCol = newCol;
        r.status = (newCol === 'done') ? 'completed' : 'pending';
        localStorage.setItem('reminders', JSON.stringify(reminders));
        renderKanban();
        loadReminders();
        syncToCloud();
    }

    // ============================================================
    // BATCH 5 — PROJECT PROGRESS / MILESTONES / TIMELINE (GANTT-LITE)
    // ============================================================
    let currentProjectDetailId = null;

    function openProjectDetail(projectId) {
        currentProjectDetailId = projectId;
        const projects = safeStorage('projects', []);
        const proj = projects.find(p => p.id === projectId);
        if (!proj) return;
        if (!proj.milestones) proj.milestones = [];

        document.getElementById('projectDetailTitle').innerHTML = `${sanitizeHTML(proj.emoji||'')} ${sanitizeHTML(proj.name||'')}`;
        renderProjectDetailProgress(proj);
        renderProjectTimeline(proj);
        renderMilestones(proj);
        openModal('projectDetailModal');
    }

    function renderProjectDetailProgress(proj) {
        const reminders = safeStorage('reminders', []);
        const tasks = reminders.filter(r => String(r.project) === String(proj.id) && !r.archived);
        const completed = tasks.filter(r => r.status === 'completed').length;
        const pct = tasks.length > 0 ? Math.round((completed/tasks.length)*100) : 0;
        document.getElementById('projectDetailProgress').innerHTML = `
            <div class="report-stat-row" style="border-bottom:none; padding-bottom:4px;">
                <span style="font-size:13px; font-weight:600;">Progress</span>
                <span style="font-weight:800; color:${proj.color};">${completed}/${tasks.length} (${pct}%)</span>
            </div>
            <div class="project-progress-track" style="height:8px;"><div class="project-progress-fill" style="width:${pct}%; background:${proj.color};"></div></div>
        `;
    }

    function renderProjectTimeline(proj) {
        const container = document.getElementById('projectTimeline');
        const reminders = safeStorage('reminders', []);
        const tasks = reminders.filter(r => String(r.project) === String(proj.id) && !r.archived && r.time);
        const milestones = proj.milestones || [];

        const allDates = tasks.map(t => new Date(t.time)).concat(milestones.map(m => new Date(m.date + 'T00:00:00')));
        if (allDates.length === 0) {
            container.style.width = '100%';
            container.innerHTML = '<p style="position:absolute; top:-6px; width:100%; text-align:center; font-size:12px; color:#8e8e93;">No dated tasks/milestones yet.</p>';
            return;
        }
        allDates.push(new Date());

        let minDate = new Date(Math.min(...allDates));
        let maxDate = new Date(Math.max(...allDates));
        minDate.setHours(0,0,0,0); minDate.setDate(minDate.getDate()-1);
        maxDate.setHours(0,0,0,0); maxDate.setDate(maxDate.getDate()+1);
        const totalMs = Math.max(1, maxDate - minDate);
        const totalDays = Math.max(1, Math.ceil(totalMs/86400000));
        const widthPerDay = 36;
        container.style.width = Math.max(totalDays*widthPerDay, 280) + 'px';

        let html = '';
        const labelStep = Math.max(1, Math.ceil(totalDays/8));
        for(let d=0; d<=totalDays; d+=labelStep){
            const dt = new Date(minDate); dt.setDate(dt.getDate()+d);
            const pct = (d/totalDays)*100;
            html += `<div class="timeline-date-label" style="left:${pct}%;">${dt.getDate()}/${dt.getMonth()+1}</div>`;
        }
        tasks.forEach(t => {
            const pos = ((new Date(t.time) - minDate)/totalMs)*100;
            const color = t.status === 'completed' ? '#34c759' : (t.priority === 'high' ? '#ff3b30' : t.priority === 'low' ? '#34c759' : '#ff9500');
            html += `<div class="timeline-marker" style="left:${pos}%; background:${color};" title="${sanitizeHTML(t.task||'')}"></div>`;
        });
        milestones.forEach(m => {
            const pos = ((new Date(m.date + 'T00:00:00') - minDate)/totalMs)*100;
            html += `<div class="timeline-milestone" style="left:${pos}%; background:${m.done ? '#34c759' : '#5e5ce6'};" title="🏁 ${sanitizeHTML(m.name||'')}"></div>`;
        });
        const todayPos = ((new Date() - minDate)/totalMs)*100;
        html += `<div class="timeline-today" style="left:${todayPos}%;" title="Today"></div>`;

        container.innerHTML = html;
    }

    function addMilestone() {
        const name = document.getElementById('milestoneNameInput').value.trim();
        const date = document.getElementById('milestoneDateInput').value;
        if (!name || !date) return showToast('Enter milestone name & date!', 'error');
        let projects = safeStorage('projects', []);
        const proj = projects.find(p => p.id === currentProjectDetailId);
        if (!proj) return;
        if (!proj.milestones) proj.milestones = [];
        proj.milestones.push({ id: Date.now(), name, date, done: false });
        localStorage.setItem('projects', JSON.stringify(projects));
        document.getElementById('milestoneNameInput').value = '';
        document.getElementById('milestoneDateInput').value = '';
        renderMilestones(proj);
        renderProjectTimeline(proj);
        syncToCloud();
        showToast('Milestone added! 🏁', 'success');
    }

    function toggleMilestone(id) {
        let projects = safeStorage('projects', []);
        const proj = projects.find(p => p.id === currentProjectDetailId);
        if (!proj || !proj.milestones) return;
        const m = proj.milestones.find(x => x.id === id);
        if (m) m.done = !m.done;
        localStorage.setItem('projects', JSON.stringify(projects));
        renderMilestones(proj);
        renderProjectTimeline(proj);
        syncToCloud();
    }

    function deleteMilestone(id) {
        let projects = safeStorage('projects', []);
        const proj = projects.find(p => p.id === currentProjectDetailId);
        if (!proj || !proj.milestones) return;
        proj.milestones = proj.milestones.filter(x => x.id !== id);
        localStorage.setItem('projects', JSON.stringify(projects));
        renderMilestones(proj);
        renderProjectTimeline(proj);
        syncToCloud();
    }

    function renderMilestones(proj) {
        const container = document.getElementById('milestonesContainer');
        const milestones = (proj.milestones || []).slice().sort((a,b) => new Date(a.date) - new Date(b.date));
        if (milestones.length === 0) {
            container.innerHTML = '<p style="font-size:12px; color:#8e8e93; text-align:center; padding:10px 0;">No milestones yet. Add one above! 🏁</p>';
            return;
        }
        container.innerHTML = milestones.map(m => `
            <div class="milestone-item ${m.done ? 'done' : ''}">
                <input type="checkbox" ${m.done ? 'checked' : ''} onchange="toggleMilestone(${m.id})" style="width:18px; height:18px; margin:0; flex-shrink:0;">
                <span class="milestone-name" style="flex:1;">${sanitizeHTML(m.name||'')}</span>
                <span style="font-size:11px; color:#8e8e93;">${new Date(m.date+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</span>
                <button onclick="deleteMilestone(${m.id})" style="background:none; border:none; color:#ff3b30; cursor:pointer; font-size:15px; padding:0;">✖</button>
            </div>
        `).join('');
    }

    // ============================================================
    // BATCH 5 — SHARED WORKSPACE (Family Shared Lists / Team Workspace)
    // ============================================================
    function generateWorkspaceCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for(let i=0;i<6;i++) code += chars[Math.floor(Math.random()*chars.length)];
        return code;
    }

    async function openWorkspaceModal() {
        openModal('workspaceModal');
        await loadActiveWorkspace();
    }

    async function loadActiveWorkspace() {
        const active = safeStorage('activeWorkspace', null);
        if (!active) {
            document.getElementById('workspaceSetup').style.display = 'block';
            document.getElementById('workspaceActive').style.display = 'none';
            return;
        }
        document.getElementById('workspaceSetup').style.display = 'none';
        document.getElementById('workspaceActive').style.display = 'block';
        document.getElementById('workspaceActiveName').innerText = active.name;
        document.getElementById('workspaceActiveCode').innerText = active.code;
        await syncWorkspace();
    }

    async function createWorkspace() {
        if (!currentUser) return showToast('Login required!', 'error');
        const name = document.getElementById('workspaceNameInput').value.trim();
        if (!name) return showToast('Enter workspace name!', 'error');
        const code = generateWorkspaceCode();
        try {
            await db.collection('workspaces').doc(code).set({
                name, members: [currentUser.email.toLowerCase()], tasks: [],
                createdAt: new Date().toISOString(), ownerUid: currentUser.uid
            });
            localStorage.setItem('activeWorkspace', JSON.stringify({code, name}));
            showToast(`Workspace created! Code: ${code} 🎉`, 'success');
            await loadActiveWorkspace();
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    }

    async function joinWorkspace() {
        if (!currentUser) return showToast('Login required!', 'error');
        const code = document.getElementById('workspaceJoinCode').value.trim().toUpperCase();
        if (!code) return showToast('Enter a code!', 'error');
        try {
            const ref = db.collection('workspaces').doc(code);
            const doc = await ref.get();
            if (!doc.exists) return showToast('Workspace not found!', 'error');
            const data = doc.data();
            const email = currentUser.email.toLowerCase();
            if (!(data.members||[]).includes(email)) {
                await ref.update({ members: [...(data.members||[]), email] });
            }
            localStorage.setItem('activeWorkspace', JSON.stringify({code, name: data.name}));
            showToast(`Joined "${data.name}"! 🎉`, 'success');
            await loadActiveWorkspace();
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    }

    function leaveWorkspace() {
        localStorage.removeItem('activeWorkspace');
        document.getElementById('workspaceSetup').style.display = 'block';
        document.getElementById('workspaceActive').style.display = 'none';
        showToast('Left workspace', 'info');
    }

    async function syncWorkspace() {
        const active = safeStorage('activeWorkspace', null);
        if (!active) return;
        try {
            const doc = await db.collection('workspaces').doc(active.code).get();
            if (!doc.exists) { showToast('Workspace no longer exists', 'error'); leaveWorkspace(); return; }
            const data = doc.data();
            document.getElementById('workspaceMemberCount').innerText = (data.members||[]).length;
            renderWorkspaceTasks(data.tasks || []);
        } catch(e) { showToast('Sync error: ' + e.message, 'error'); }
    }

    function renderWorkspaceTasks(tasks) {
        const container = document.getElementById('workspaceTasksContainer');
        if (tasks.length === 0) {
            container.innerHTML = '<p style="text-align:center; font-size:12px; color:#8e8e93; padding:15px 0;">No shared tasks yet. Add one! 👆</p>';
            return;
        }
        container.innerHTML = tasks.map(t => `
            <div class="workspace-task-item ${t.done ? 'done' : ''}">
                <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleWorkspaceTask('${t.id}')" style="width:18px; height:18px; margin:0; flex-shrink:0;">
                <span class="workspace-task-text" style="flex:1; font-size:13px;">${sanitizeHTML(t.text||'')}</span>
                <span style="font-size:10px; color:#8e8e93;">${sanitizeHTML(t.addedBy||'')}</span>
                <button onclick="deleteWorkspaceTask('${t.id}')" style="background:none; border:none; color:#ff3b30; cursor:pointer; font-size:15px; padding:0;">✖</button>
            </div>
        `).join('');
    }

    async function addWorkspaceTask() {
        const active = safeStorage('activeWorkspace', null);
        if (!active) return;
        const input = document.getElementById('workspaceTaskInput');
        const text = input.value.trim();
        if (!text) return;
        try {
            const ref = db.collection('workspaces').doc(active.code);
            const doc = await ref.get();
            const tasks = doc.data().tasks || [];
            tasks.push({ id: Date.now().toString(), text, done: false, addedBy: userName });
            await ref.update({ tasks });
            input.value = '';
            renderWorkspaceTasks(tasks);
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    }

    async function toggleWorkspaceTask(id) {
        const active = safeStorage('activeWorkspace', null);
        if (!active) return;
        try {
            const ref = db.collection('workspaces').doc(active.code);
            const doc = await ref.get();
            const tasks = doc.data().tasks || [];
            const t = tasks.find(x => x.id === id);
            if (t) t.done = !t.done;
            await ref.update({ tasks });
            renderWorkspaceTasks(tasks);
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    }

    async function deleteWorkspaceTask(id) {
        const active = safeStorage('activeWorkspace', null);
        if (!active) return;
        try {
            const ref = db.collection('workspaces').doc(active.code);
            const doc = await ref.get();
            let tasks = doc.data().tasks || [];
            tasks = tasks.filter(x => x.id !== id);
            await ref.update({ tasks });
            renderWorkspaceTasks(tasks);
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    }

    // ============================================================
