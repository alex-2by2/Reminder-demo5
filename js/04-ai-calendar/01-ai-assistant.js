// Gemini AI chat assistant, daily planner, smart reschedule.
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".

    // BATCH 2 — AI CHAT ASSISTANT / DAILY PLANNER / SMART RESCHEDULE
    // ============================================================
    async function callGeminiAI(prompt) {
        // Delegates to the API layer (js/00-services.js) — same behavior,
        // one place instead of a second copy of the same error handling.
        return window.API.callAI(prompt);
    }

    function appendChatBubble(text, sender) {
        const container = document.getElementById('aiChatMessages');
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${sender}`;
        bubble.innerText = text;
        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;
        return bubble;
    }

    function buildAIContext() {
        const reminders = safeStorage('reminders', []);
        const habits = safeStorage('habits', []);
        const todayStr = getTodayStr();
        const pending = reminders.filter(r => r.status !== 'completed' && !r.archived);
        const todayTasks = pending.filter(r => r.time.split('T')[0] === todayStr);
        const overdue = pending.filter(r => new Date(r.time) < new Date());
        const moodLog = safeStorage('moodLog', {});
        const sleepLog = safeStorage('sleepLog', {});
        const moodLabels = ['Great 😄','Good 😊','Okay 😐','Sad 😔','Bad 😢'];

        let ctx = `You are a friendly productivity assistant inside "${userName}"'s reminder app. Today is ${todayStr}.\n`;
        ctx += `Today's tasks (${todayTasks.length}): ${todayTasks.map(t=>t.task).join(', ') || 'none'}\n`;
        ctx += `Overdue tasks (${overdue.length}): ${overdue.map(t=>t.task).join(', ') || 'none'}\n`;
        ctx += `Total pending tasks: ${pending.length}\n`;
        ctx += `Habits: ${habits.map(h=>`${h.name} (streak ${h.streak})`).join(', ') || 'none'}\n`;
        if (moodLog[todayStr] !== undefined) ctx += `Today's mood: ${moodLabels[moodLog[todayStr]]}\n`;
        if (sleepLog[todayStr] !== undefined) ctx += `Last night's sleep: ${sleepLog[todayStr]}h\n`;
        return ctx;
    }

    function openAIChat() {
        openModal('aiChatModal');
        setTimeout(() => { const el = document.getElementById('aiChatInput'); if (el) el.focus(); }, 200);
    }

    function aiHandleError(bubble, e) {
        if (!currentUser) {
            bubble.innerText = "⚠️ Please sign in to use AI features.";
            closeModal('aiChatModal');
        } else {
            bubble.innerText = "⚠️ " + e.message;
        }
    }

    async function sendAIChatMessage() {
        const input = document.getElementById('aiChatInput');
        const msg = input.value.trim();
        if (!msg) return;
        appendChatBubble(msg, 'user');
        input.value = '';
        const thinking = appendChatBubble('🤔 Thinking...', 'ai');
        try {
            const context = buildAIContext();
            const prompt = `${context}\nUser question: ${msg}\n\nAnswer briefly and helpfully (max 4 sentences), in the same language/script the user used.`;
            const reply = await callGeminiAI(prompt);
            thinking.innerText = reply;
        } catch(e) { aiHandleError(thinking, e); }
    }

    async function aiQuickAction(type) {
        if (type === 'plan') return aiPlanMyDay();
        if (type === 'reschedule') return aiFixOverdue();
        if (type === 'summary') return aiDailySummary();
    }

    async function aiPlanMyDay() {
        appendChatBubble('🪄 Plan My Day', 'user');
        const thinking = appendChatBubble('🤔 Planning your day...', 'ai');
        try {
            const reminders = safeStorage('reminders', []);
            const todayStr = getTodayStr();
            const todayTasks = reminders.filter(r => r.status !== 'completed' && !r.archived && r.time.split('T')[0] === todayStr);
            if (todayTasks.length === 0) {
                thinking.innerText = "🎉 No pending tasks for today! Enjoy your free time.";
                return;
            }
            const list = todayTasks.map(t => `- ${t.task} (priority: ${t.priority||'medium'}, time: ${t.time.split('T')[1]})`).join('\n');
            const prompt = `Here are today's pending tasks:\n${list}\n\nSuggest an optimal order/schedule to complete these today, considering priority and time. Keep it short, friendly, with emojis, max 6 lines.`;
            const reply = await callGeminiAI(prompt);
            thinking.innerText = reply;
        } catch(e) { aiHandleError(thinking, e); }
    }

    async function aiFixOverdue() {
        appendChatBubble('🔄 Fix Overdue Tasks', 'user');
        const thinking = appendChatBubble('🤔 Checking overdue tasks...', 'ai');
        try {
            let reminders = safeStorage('reminders', []);
            const now = new Date();
            const overdue = reminders.filter(r => r.status !== 'completed' && !r.archived && new Date(r.time) < now);
            if (overdue.length === 0) {
                thinking.innerText = "✅ No overdue tasks! You're all caught up.";
                return;
            }
            const list = overdue.map((t,i) => `${i+1}. ${t.task} (was due: ${new Date(t.time).toLocaleString('en-IN')})`).join('\n');
            const prompt = `Current time is ${now.toLocaleString('en-IN')}. These tasks are overdue:\n${list}\n\nFor each numbered task, suggest a new realistic time (later today or tomorrow). Reply ONLY in this exact format, one line per task, no extra text:\n1. YYYY-MM-DD HH:MM\n2. YYYY-MM-DD HH:MM`;
            const reply = await callGeminiAI(prompt);

            const lines = reply.split('\n').map(l => l.trim()).filter(Boolean);
            let applied = 0;
            lines.forEach(line => {
                const m = line.match(/(\d+)\.\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/);
                if (m) {
                    const idx = parseInt(m[1]) - 1;
                    if (overdue[idx]) {
                        const target = reminders.find(r => r.id === overdue[idx].id);
                        if (target) {
                            target.time = `${m[2]}T${m[3]}`;
                            target.notified = false;
                            applied++;
                        }
                    }
                }
            });
            if (applied > 0) {
                localStorage.setItem('reminders', JSON.stringify(reminders));
                loadReminders();
                renderHomeCalendar();
                syncToCloud();
                thinking.innerText = `✅ Rescheduled ${applied} of ${overdue.length} overdue task(s) to new times!`;
            } else {
                thinking.innerText = "⚠️ Couldn't auto-apply. Try again or reschedule manually using ✏️ Edit.";
            }
        } catch(e) { aiHandleError(thinking, e); }
    }

    async function aiDailySummary() {
        appendChatBubble('📊 Summary', 'user');
        const thinking = appendChatBubble('🤔 Summarizing...', 'ai');
        try {
            const context = buildAIContext();
            const prompt = `${context}\nGive a short, encouraging summary of my day/progress (max 3 sentences) with emojis.`;
            const reply = await callGeminiAI(prompt);
            thinking.innerText = reply;
        } catch(e) { aiHandleError(thinking, e); }
    }

    // ============================================================
