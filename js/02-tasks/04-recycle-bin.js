// Recently Deleted (Recycle Bin) — persistent, browsable trash for
// reminders and habits. The app already had a quick "UNDO" toast for
// deleting a reminder (js/02-tasks/03-reminders-core.js: deleteReminder/
// undoDelete) — that's kept as-is for the fast, in-the-moment case, but it
// only ever holds one item and only lasts 5 seconds. This adds a real,
// persistent bin behind it: every delete lands here too, recoverable for
// 30 days, browsable as a list, restorable individually.
//
// Scope note: covers reminders and habits — the two highest-stakes,
// most-frequently-deleted data types in the app. The same
// addToRecycleBin()/restoreFromRecycleBin() pair is written to be reusable
// for other data types (vehicle logs, expenses, etc.) by anyone who wants
// to extend it; wiring every delete function in the app into it was more
// surface area than this pass covers.

    const RECYCLE_BIN_RETENTION_DAYS = 30;

    function getRecycleBin() {
        const bin = safeStorage('recycleBin', []);
        const cutoff = Date.now() - RECYCLE_BIN_RETENTION_DAYS * 86400000;
        const kept = bin.filter(entry => entry.deletedAt >= cutoff);
        if (kept.length !== bin.length) {
            // Lazily purge expired entries whenever the bin is read, rather
            // than running a separate scheduled job for it.
            localStorage.setItem('recycleBin', JSON.stringify(kept));
        }
        return kept;
    }

    function addToRecycleBin(type, item) {
        if (!item) return;
        const bin = safeStorage('recycleBin', []);
        bin.unshift({ binId: Date.now() + Math.random(), type, item, deletedAt: Date.now() });
        localStorage.setItem('recycleBin', JSON.stringify(bin));
        syncToCloud();
    }

    function restoreFromRecycleBin(binId) {
        const bin = safeStorage('recycleBin', []);
        const entry = bin.find(e => e.binId === binId);
        if (!entry) return;
        const storageKey = entry.type === 'habit' ? 'habits' : 'reminders';
        const collection = safeStorage(storageKey, []);
        collection.push(entry.item);
        localStorage.setItem(storageKey, JSON.stringify(collection));
        localStorage.setItem('recycleBin', JSON.stringify(bin.filter(e => e.binId !== binId)));
        if (entry.type === 'habit') { loadHabits(); } else { searchReminders(); }
        syncToCloud();
        renderRecycleBin();
        showToast('Restored! ♻️', 'success');
    }

    function permanentlyDeleteFromBin(binId) {
        localStorage.setItem('recycleBin', JSON.stringify(getRecycleBin().filter(e => e.binId !== binId)));
        renderRecycleBin();
    }

    function emptyRecycleBin() {
        if (!getRecycleBin().length) return;
        localStorage.setItem('recycleBin', JSON.stringify([]));
        syncToCloud();
        renderRecycleBin();
        showToast('Recycle Bin emptied.', 'success');
    }

    function openRecycleBinModal() {
        renderRecycleBin();
        openModal('recycleBinModal');
    }

    function renderRecycleBin() {
        const c = document.getElementById('recycleBinList');
        if (!c) return;
        const bin = getRecycleBin();
        c.innerHTML = bin.map(entry => {
            const label = entry.type === 'habit' ? (entry.item.name || 'Habit') : (entry.item.task || 'Task');
            const icon = entry.type === 'habit' ? '🔥' : '✅';
            const daysAgo = Math.floor((Date.now() - entry.deletedAt) / 86400000);
            const daysLeft = RECYCLE_BIN_RETENTION_DAYS - daysAgo;
            return `<div style="display:flex; justify-content:space-between; align-items:center; background:#f2f2f7; border-radius:12px; padding:10px 12px; margin-bottom:8px;">
                <div>
                    <b style="font-size:13px;">${icon} ${sanitizeHTML(label)}</b>
                    <br><span style="font-size:11px; color:#8e8e93;">Deleted ${daysAgo === 0 ? 'today' : daysAgo + 'd ago'} · ${daysLeft}d left before permanent removal</span>
                </div>
                <div style="display:flex; gap:6px;">
                    <button onclick="restoreFromRecycleBin(${entry.binId})" style="background:#e5f9e9; color:#34c759; border:none; border-radius:8px; padding:6px 10px; font-weight:700; cursor:pointer; font-size:11px;">Restore</button>
                    <button onclick="permanentlyDeleteFromBin(${entry.binId})" style="background:none; border:none; color:#ff3b30; cursor:pointer; font-size:15px;">✖</button>
                </div>
            </div>`;
        }).join('') || emptyStateHTML('🗑️', 'Recycle Bin is empty.');
    }
