// Widget Page — a dedicated dashboard (page-widgets) showing pinned live
// widget cards the user chooses, independent of the main Home page/timeline.
// Reads directly from each feature's own localStorage keys (safeStorage) so
// it has no load-order dependency on any other module's render functions.

    const AVAILABLE_WIDGETS = {
        tasks: { label: '📋 Tasks Today', render: renderTasksWidget },
        habits: { label: '🔥 Habit Streaks', render: renderHabitsWidget },
        finance: { label: '💰 Finance', render: renderFinanceWidget },
        mood: { label: '😊 Mood', render: renderMoodWidget },
        fitness: { label: '🏃 Fitness', render: renderFitnessWidget },
        cycle: { label: '🌸 Cycle', render: renderCycleWidget },
        coins: { label: '🪙 Coins & Level', render: renderCoinsWidget }
    };

    function getPinnedWidgets() {
        const stored = safeStorage('pinnedWidgets', null);
        return stored || ['tasks', 'habits', 'finance', 'mood'];
    }
    function savePinnedWidgets(list) { localStorage.setItem('pinnedWidgets', JSON.stringify(list)); syncToCloud(); }

    function togglePinnedWidget(key) {
        let list = getPinnedWidgets();
        if (list.includes(key)) list = list.filter(k => k !== key); else list.push(key);
        savePinnedWidgets(list);
        renderWidgetPage();
    }

    function renderWidgetPage() {
        const grid = document.getElementById('widgetPageGrid');
        const picker = document.getElementById('widgetPagePicker');
        if (!grid) return;
        const pinned = getPinnedWidgets();
        grid.innerHTML = pinned.filter(k => AVAILABLE_WIDGETS[k]).map(k => `
            <div style="background:var(--card-bg,#fff); border-radius:16px; padding:14px; box-shadow:0 1px 4px rgba(0,0,0,0.06);">
                <div style="font-size:12px; font-weight:700; color:#8e8e93; margin-bottom:8px; display:flex; justify-content:space-between;">
                    <span>${AVAILABLE_WIDGETS[k].label}</span>
                    <span onclick="togglePinnedWidget('${k}')" role="button" tabindex="0" style="cursor:pointer;">✖</span>
                </div>
                <div>${AVAILABLE_WIDGETS[k].render()}</div>
            </div>
        `).join('') || '<p style="text-align:center; grid-column:1/-1; color:#8e8e93; font-size:13px; padding:20px 0;">No widgets pinned. Add some below 👇</p>';

        if (picker) {
            picker.innerHTML = Object.keys(AVAILABLE_WIDGETS).map(k => `
                <span onclick="togglePinnedWidget('${k}')" role="button" tabindex="0" style="display:inline-block; margin:4px; padding:6px 12px; border-radius:20px; font-size:12px; cursor:pointer; border:1px solid ${pinned.includes(k) ? 'var(--primary)' : 'var(--border-color,#e5e5ea)'}; background:${pinned.includes(k) ? 'var(--primary)' : 'transparent'}; color:${pinned.includes(k) ? '#fff' : 'inherit'};">${AVAILABLE_WIDGETS[k].label}</span>
            `).join('');
        }
    }

    function renderTasksWidget() {
        const reminders = safeStorage('reminders', []);
        const today = getTodayStr();
        const dueToday = reminders.filter(r => !r.archived && r.status !== 'completed' && r.time && r.time.startsWith(today));
        return `<div style="font-size:22px; font-weight:700;">${dueToday.length}</div><div style="font-size:11px; color:#8e8e93;">tasks due today</div>`;
    }
    function renderHabitsWidget() {
        const habits = safeStorage('habits', []);
        const top = habits.slice().sort((a, b) => (b.streak || 0) - (a.streak || 0)).slice(0, 3);
        if (!top.length) return `<div style="font-size:11px; color:#8e8e93;">No habits yet</div>`;
        return top.map(h => `<div style="font-size:12px; display:flex; justify-content:space-between;"><span>${sanitizeHTML(h.name)}</span><b>🔥${h.streak || 0}</b></div>`).join('');
    }
    function renderFinanceWidget() {
        const d = safeStorage('finData', { expenses: [] });
        const now = new Date(); const ms = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const mExp = (d.expenses || []).filter(e => e.date && e.date.startsWith(ms)).reduce((s, e) => s + (Number(e.amount) || 0), 0);
        return `<div style="font-size:20px; font-weight:700;">₹${mExp.toLocaleString('en-IN')}</div><div style="font-size:11px; color:#8e8e93;">spent this month</div>`;
    }
    function renderMoodWidget() {
        const moodLog = safeStorage('moodLog', {});
        const today = moodLog[getTodayStr()];
        return today !== undefined ? `<div style="font-size:26px;">${(typeof moodData !== 'undefined' && moodData[today]) ? moodData[today].emoji : '🙂'}</div>` : `<div style="font-size:11px; color:#8e8e93;">Not logged today</div>`;
    }
    function renderFitnessWidget() {
        const log = safeStorage('fitnessLog', {});
        const today = log[getTodayStr()];
        return today ? `<div style="font-size:18px; font-weight:700;">${(today.steps || 0).toLocaleString('en-IN')} steps</div>` : `<div style="font-size:11px; color:#8e8e93;">Not logged today</div>`;
    }
    function renderCycleWidget() {
        if (typeof getCyclePrediction !== 'function') return `<div style="font-size:11px; color:#8e8e93;">—</div>`;
        const p = getCyclePrediction();
        if (!p.hasData) return `<div style="font-size:11px; color:#8e8e93;">No data yet</div>`;
        return `<div style="font-size:13px; font-weight:700;">${p.phase === 'menstrual' ? '🌸' : p.phase === 'ovulation' ? '🥚' : p.phase === 'follicular' ? '🌱' : '🌙'} Day ${p.cycleDay}</div><div style="font-size:11px; color:#8e8e93;">Next period in ${p.daysUntilNext}d</div>`;
    }
    function renderCoinsWidget() {
        const coins = safeNum(localStorage.getItem('coinBalance'), 0);
        const level = safeStorage('userLevel', 1);
        return `<div style="font-size:20px; font-weight:700;">🪙 ${coins}</div><div style="font-size:11px; color:#8e8e93;">Level ${level}</div>`;
    }
