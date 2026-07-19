        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(reg => {
                // Check for SW update every 30 min
                setInterval(() => reg.update(), 30 * 60 * 1000);
                // Background sync registration
                if (reg.sync) {
                    window.requestBackgroundSync = tag => reg.sync.register(tag).catch(()=>{});
                }
                // Periodic sync for reminders (if supported)
                if (reg.periodicSync) {
                    reg.periodicSync.register('check-reminders', { minInterval: 15 * 60 * 1000 }).catch(()=>{});
                }
            }).catch(console.error);

            // Listen for SW messages (e.g. SYNC_NOW when back online)
            navigator.serviceWorker.addEventListener('message', e => {
                if (e.data?.type === 'SYNC_NOW' && typeof syncToCloud === 'function') {
                    syncToCloud();
                    if (typeof showToast === 'function') showToast('Data synced!', 'success');
                }
                if (e.data?.type === 'SW_UPDATED') {
                    if (confirm('App update available! Reload now?')) location.reload();
                }
            });
        }
