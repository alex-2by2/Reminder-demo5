// Secret space (hidden notes), weather widget, backup & restore, haptic feedback, PWA install prompt, auto dark mode schedule, home-screen widget customization, birthday tracker, home management, quick notes, Pomodoro history, QR code share.
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".
    // WEATHER
    function openWeatherModal(){
        const apiInput = document.getElementById('weatherApiKeyInput');
        const cityInput = document.getElementById('weatherCityInput');
        if(apiInput) apiInput.value = localStorage.getItem('weatherApiKey')||'';
        if(cityInput) cityInput.value = localStorage.getItem('weatherCity')||'';
        openModal('weatherModal');
    }
    function saveWeatherKey(){
        const apiInput = document.getElementById('weatherApiKeyInput');
        if(!apiInput) return showToast('Weather API form unavailable.', 'error');
        localStorage.setItem('weatherApiKey',apiInput.value.trim());
        showToast('API Key saved! 🌤️','success');
    }
    async function fetchWeather(){
        const cityInput = document.getElementById('weatherCityInput');
        const apiInput = document.getElementById('weatherApiKeyInput');
        const resultEl = document.getElementById('weatherResult');
        if(!cityInput || !apiInput || !resultEl) return showToast('Weather widget unavailable.', 'error');
        const city = cityInput.value.trim();
        const apiKey = apiInput.value.trim()||localStorage.getItem('weatherApiKey');
        if(!city) return showToast('Enter city!','error');
        if(!apiKey) return showToast('Add free API Key from openweathermap.org!','error');
        localStorage.setItem('weatherCity',city);
        resultEl.innerHTML='<p style="color:#8e8e93;font-size:13px">Loading... ⏳</p>';
        try{
            const res=await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`);
            const data=await res.json();
            if(data.cod!==200){
                resultEl.innerHTML=`<p style="color:#ff3b30;font-size:13px">⚠️ ${sanitizeHTML(data.message||'')}</p>`;
                return;
            }
            resultEl.innerHTML=`<div class="weather-widget" style="text-align:left"><div style="display:flex;align-items:center;gap:12px"><img src="https://openweathermap.org/img/wn/${encodeURIComponent(data.weather[0].icon)}@2x.png" style="width:60px;height:60px" alt="${sanitizeHTML(data.weather[0].description||'Weather icon')}"><div><div style="font-size:22px;font-weight:800">${Math.round(data.main.temp)}°C</div><div style="font-size:14px;opacity:0.9">${sanitizeHTML(data.weather[0].description||'')}</div><div style="font-size:12px;opacity:0.8">📍 ${sanitizeHTML(data.name||'')},${sanitizeHTML(data.sys.country||'')}</div></div></div><div style="display:flex;gap:15px;margin-top:12px;font-size:12px;opacity:0.9"><span>💧${data.main.humidity}%</span><span>🌬️${Math.round(data.wind.speed)}m/s</span><span>🌡️Feels ${Math.round(data.main.feels_like)}°C</span></div></div>`
        }catch(e){
            resultEl.innerHTML='<p style="color:#ff3b30;font-size:13px">⚠️ Error. Check internet.</p>'
        }
    }


    // ============================================================
    // BACKUP & RESTORE
    // ============================================================
    function exportAllData() {
        const keys = ['reminders','habits','finData','moodLog','sleepLog','projects','shiftConfig','studentData','journalEntries','medicines','vehicleReminders','vehicleLogs','warranties','shopData','travelData','attData','lifeEvents','subscriptions','birthdays','homeManagement','quickNotes','pomodoroHistory','savingsGoals','recurringExps','taskDeps','appTheme','appFontSize','darkMode','geminiKey','pushNotif','webhookUrl','gcalClientId','activeWorkspace'];
        const backup = { version:'2.0', exportedAt:new Date().toISOString() };
        keys.forEach(k => { const v = localStorage.getItem(k); if(v) backup[k] = v; });
        const blob = new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `MasterApp_Backup_${getTodayStr()}.json`; a.click();
        URL.revokeObjectURL(url);
        hapticFeedback('success'); showToast('📦 Backup exported!', 'success');
    }

    function restoreAllData(event) {
        const file = event.target.files[0]; if(!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const backup = JSON.parse(e.target.result);
                if(!backup.version) return showToast('Invalid backup file!', 'error');
                const skip = ['version','exportedAt'];
                Object.entries(backup).forEach(([k,v]) => { if(!skip.includes(k)) localStorage.setItem(k, v); });
                showToast('✅ Restore successful! Reloading...', 'success');
                setTimeout(() => location.reload(), 1500);
            } catch(err) { showToast('Error reading backup!', 'error'); }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    // ============================================================
    // HAPTIC FEEDBACK
    // ============================================================
    function hapticFeedback(type='light') {
        if(!navigator.vibrate || localStorage.getItem('haptic') !== 'true') return;
        const patterns = { light:[20], medium:[40], success:[20,50,20], error:[100,50,100] };
        navigator.vibrate(patterns[type] || [20]);
    }

    // ============================================================
    // PWA INSTALL
    // ============================================================
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault(); deferredPrompt = e;
        setTimeout(() => { const b = document.getElementById('pwaBanner'); if(b) b.style.display='flex'; }, 3000);
    });
    function installPWA() {
        const banner = document.getElementById('pwaBanner');
        if(banner) banner.style.display='none';
        if(deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then(() => { deferredPrompt = null; }); }
    }

    // ============================================================
    // DARK AUTO SCHEDULE
    // ============================================================
    function saveAutoDarkSettings() {
        const toggleEl = document.getElementById('autoDarkToggle');
        const fromEl = document.getElementById('autoDarkFrom');
        const toEl = document.getElementById('autoDarkTo');
        const wrapEl = document.getElementById('autoDarkTimesWrap');
        if(!toggleEl || !fromEl || !toEl || !wrapEl) return showToast('Auto dark settings unavailable.', 'error');
        const enabled = toggleEl.checked;
        const from = fromEl.value;
        const to = toEl.value;
        localStorage.setItem('autoDark', JSON.stringify({enabled,from,to}));
        wrapEl.style.display = enabled ? 'block' : 'none';
        checkAutoDark();
        showToast(enabled ? '🌙 Auto dark mode ON' : 'Auto dark OFF', 'info');
    }

    function checkAutoDark() {
        const cfg = safeStorage('autoDark', null);
        if(!cfg || !cfg.enabled) return;
        const now = new Date();
        const cur = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        const isDark = (cfg.from < cfg.to) ? (cur >= cfg.from && cur < cfg.to) : (cur >= cfg.from || cur < cfg.to);
        const body = document.body;
        const toggle = document.getElementById('darkModeToggle');
        if(isDark && !body.classList.contains('dark-mode')) { body.classList.add('dark-mode'); if(toggle) toggle.checked=true; localStorage.setItem('darkMode','true'); }
        else if(!isDark && body.classList.contains('dark-mode')) { body.classList.remove('dark-mode'); if(toggle) toggle.checked=false; localStorage.setItem('darkMode','false'); }
    }
    setInterval(checkAutoDark, (window.APP_CONFIG && window.APP_CONFIG.INTERVALS.AUTO_DARK_CHECK_MS) || 60000);

    // ============================================================
    // WIDGET CUSTOMIZATION
    // ============================================================
    function toggleWidget(name, show) {
        const map = { mood:'todayMoodSection', sleep:'todaySleepSection', shift:'todayShiftCard', aitip:'aiTipContainer', healthsnapshot:'healthSnapshotWidget', financesnapshot:'financeSnapshotWidget' };
        const el = document.getElementById(map[name]);
        if(el) el.style.display = show ? '' : 'none';
        const prefs = safeStorage('widgetPrefs', {});
        prefs[name] = show; localStorage.setItem('widgetPrefs', JSON.stringify(prefs));
        syncToCloud();
    }


    // ============================================================
    // BIRTHDAY TRACKER
    // ============================================================
    function getBirthdays() { return safeStorage('birthdays', []); }
    function saveBirthdays(d) { localStorage.setItem('birthdays', JSON.stringify(d)); syncToCloud(); }
    function openBirthdayModal() { renderBirthdayList(); openModal('birthdayModal'); }

    function addBirthday() {
        const nameInput = document.getElementById('bdayNameInput');
        const dateInput = document.getElementById('bdayDateInput');
        const relInput = document.getElementById('bdayRelInput');
        const emojiInput = document.getElementById('bdayEmojiInput');
        if(!nameInput || !dateInput || !relInput || !emojiInput) return showToast('Birthday form unavailable.', 'error');
        const name = nameInput.value.trim();
        const date = dateInput.value;
        const rel = relInput.value;
        const emoji = emojiInput.value.trim() || '🎂';
        if(!name || !date) return showToast('Enter name & birthday!', 'error');
        const bdays = getBirthdays();
        bdays.push({id:Date.now(), name, date, rel, emoji});
        saveBirthdays(bdays);
        nameInput.value = '';
        emojiInput.value = '';
        renderBirthdayList();
        createBirthdayReminders();
        hapticFeedback('success');
        showToast('🎂 Birthday added!', 'success');
    }

    function renderBirthdayList() {
        const c = document.getElementById('birthdayList'); if(!c) return;
        const bdays = getBirthdays();
        const now = new Date(); const thisYear = now.getFullYear();
        const sorted = bdays.map(b => {
            const [_,mm,dd] = b.date.split('-');
            const next = new Date(`${thisYear}-${mm}-${dd}`);
            if(next < now) next.setFullYear(thisYear+1);
            const days = Math.ceil((next - now) / 86400000);
            return {...b, days, next};
        }).sort((a,b) => a.days - b.days);
        c.innerHTML = sorted.map(b => {
            const isSoon = b.days <= 7;
            return `<div class="bday-item ${isSoon ? 'bday-soon' : ''}">
                <div><b style="font-size:13px">${sanitizeHTML(b.emoji||'')} ${sanitizeHTML(b.name||'')}</b><br>
                    <span style="font-size:11px;color:#8e8e93">${b.rel} · 📅 ${b.date.slice(5)} · ${b.days===0?'🎉 Today!':b.days===1?'Tomorrow!':b.days+' days'}</span>
                </div>
                <button onclick="deleteBirthday(${b.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button>
            </div>`;
        }).join('') || emptyStateHTML('🎂', 'No birthdays added.');
    }

    function deleteBirthday(id) { saveBirthdays(getBirthdays().filter(x=>x.id!==id)); renderBirthdayList(); }

    function createBirthdayReminders() {
        const bdays = getBirthdays();
        const now = new Date(); const thisYear = now.getFullYear();
        let reminders = safeStorage('reminders', []);
        reminders = reminders.filter(r => r.tags !== 'birthday');
        bdays.forEach(b => {
            const [_,mm,dd] = b.date.split('-');
            let next = new Date(`${thisYear}-${mm}-${dd}T09:00`);
            if(next < now) next = new Date(`${thisYear+1}-${mm}-${dd}T09:00`);
            const pad = n => String(n).padStart(2,'0');
            const timeStr = `${next.getFullYear()}-${pad(next.getMonth()+1)}-${pad(next.getDate())}T09:00`;
            reminders.push({id:Date.now()+Math.random(), task:`🎂 ${b.name}'s Birthday!`, notes:`${b.rel} birthday`, time:timeStr, priority:'high', repeat:'yearly', status:'pending', notified:false, pinned:false, tags:'birthday', preAlarm:1440, category:{name:'Birthday',icon:'🎂'}});
        });
        localStorage.setItem('reminders', JSON.stringify(reminders));
        loadReminders(); syncToCloud();
    }

    // ============================================================
    // HOME MANAGEMENT
    // ============================================================
    function getChores() { return safeStorage('homeManagement', []); }
    function saveChores(d) { localStorage.setItem('homeManagement', JSON.stringify(d)); syncToCloud(); }
    function openHomeManagementModal() { renderChoreList('all'); openModal('homeManagementModal'); }

    function addChore() {
        const nameInput  = document.getElementById('choreNameInput');
        const freqInput  = document.getElementById('choreFreqInput');
        const areaInput  = document.getElementById('choreAreaInput');
        if(!nameInput || !freqInput || !areaInput) return showToast('Chore form unavailable.', 'error');
        const name = nameInput.value.trim();
        const freq = freqInput.value;
        const area = areaInput.value;
        if(!name) return showToast('Enter task name!', 'error');
        const chores = getChores();
        chores.unshift({id:Date.now(), name, freq, area, done:false, lastDone:null});
        saveChores(chores); renderChoreList(currentChoreFilter || 'all');
        nameInput.value = '';
        hapticFeedback('success'); showToast('Chore added! 🏠', 'success');
    }

    let currentChoreFilter = 'all';
    function filterChores(filter) {
        currentChoreFilter = filter;
        document.querySelectorAll('[id^="choreTab-"]').forEach(b => b.classList.remove('active'));
        document.getElementById('choreTab-'+filter).classList.add('active');
        renderChoreList(filter);
    }

    function renderChoreList(filter) {
        const c = document.getElementById('choreList'); if(!c) return;
        const chores = getChores();
        const freqColors = {daily:'#34c759', weekly:'#007aff', monthly:'#ff9500', once:'#5e5ce6'};
        const filtered = filter === 'all' ? chores : chores.filter(ch => ch.freq === filter);
        c.innerHTML = filtered.map(ch => `
            <div class="chore-item ${ch.done ? 'done' : ''}">
                <input type="checkbox" ${ch.done?'checked':''} onchange="toggleChore(${ch.id})" style="width:18px;height:18px;margin:0;flex-shrink:0;">
                <div style="flex:1;">
                    <span>${sanitizeHTML((ch.area||'').split(' ')[0])} <b>${sanitizeHTML(ch.name||'')}</b></span>
                    ${ch.lastDone?`<br><span style="font-size:10px;color:#8e8e93">Last: ${ch.lastDone}</span>`:''}
                </div>
                <span class="chore-freq-badge" style="background:${freqColors[ch.freq]}">${ch.freq}</span>
                <button onclick="deleteChore(${ch.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:14px;">✖</button>
            </div>`).join('') || emptyStateHTML('📋', 'No tasks in this category.');
    }

    function toggleChore(id) {
        const chores = getChores(); const ch = chores.find(x => x.id === id);
        if(ch) { ch.done = !ch.done; ch.lastDone = ch.done ? getTodayStr() : ch.lastDone; }
        saveChores(chores); renderChoreList(currentChoreFilter || 'all');
        hapticFeedback('light');
    }

    function deleteChore(id) { saveChores(getChores().filter(x=>x.id!==id)); renderChoreList(currentChoreFilter||'all'); }

    // ============================================================
    // QUICK NOTES
    // ============================================================
    function getQuickNotes() { return safeStorage('quickNotes', []); }
    function saveQuickNotes(d) { localStorage.setItem('quickNotes', JSON.stringify(d)); syncToCloud(); }
    function openQuickNotesModal() { renderQuickNotes(); openModal('quickNotesModal'); }

    function addQuickNote() {
        const textInput = document.getElementById('quickNoteInput');
        const colorInput = document.getElementById('quickNoteColor');
        if(!textInput || !colorInput) return showToast('Quick note form unavailable.', 'error');
        const text = textInput.value.trim();
        const color = colorInput.value;
        if(!text) return showToast('Type a note!', 'error');
        const notes = getQuickNotes();
        notes.unshift({id:Date.now(), text, color, pinned:false, created:new Date().toISOString()});
        saveQuickNotes(notes); renderQuickNotes();
        textInput.value = '';
        hapticFeedback('success');
    }

    function renderQuickNotes() {
        const c = document.getElementById('quickNotesList'); if(!c) return;
        const search = (document.getElementById('noteSearchInput')?.value || '').toLowerCase();
        const notes = getQuickNotes().filter(n => !search || n.text.toLowerCase().includes(search));
        if(!notes.length) { c.innerHTML=emptyStateHTML('📝', 'No notes yet. Add one!'); return; }
        c.innerHTML = notes.map(n => `
            <div class="qnote-card ${n.pinned?'qnote-pinned':''}" style="background:${n.color||'#fffde7'};">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <p style="margin:0;font-size:13px;line-height:1.5;flex:1;">${sanitizeHTML(n.text||'')}</p>
                    <div style="display:flex;gap:4px;margin-left:8px;flex-shrink:0;">
                        <button onclick="pinNote(${n.id})" style="background:none;border:none;cursor:pointer;font-size:15px;">${n.pinned?'📌':'📍'}</button>
                        <button onclick="deleteNote(${n.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px;">✖</button>
                    </div>
                </div>
                <p style="margin:6px 0 0;font-size:10px;color:#8e8e93;">${new Date(n.created).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
            </div>`).join('');
    }

    function pinNote(id) { const n=getQuickNotes(); const x=n.find(x=>x.id===id); if(x) x.pinned=!x.pinned; n.sort((a,b)=>b.pinned-a.pinned); saveQuickNotes(n); renderQuickNotes(); }
    function deleteNote(id) { saveQuickNotes(getQuickNotes().filter(x=>x.id!==id)); renderQuickNotes(); }

    // ============================================================
    // POMODORO HISTORY
    // ============================================================
    function getPomoHistory() { return safeStorage('pomodoroHistory', []); }
    function logPomoSession(taskName, mins) {
        const hist = getPomoHistory();
        hist.unshift({id:Date.now(), task:taskName||'Focus Session', mins, date:getTodayStr(), time:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})});
        localStorage.setItem('pomodoroHistory', JSON.stringify(hist.slice(0,100)));
        syncToCloud();
    }

    function openPomoHistoryModal() { renderPomoHistory(); openModal('pomoHistoryModal'); }

    function renderPomoHistory() {
        const hist = getPomoHistory();
        const sumEl = document.getElementById('pomoHistSummary');
        const listEl = document.getElementById('pomoHistList');
        if(!sumEl || !listEl) return;
        const totalSessions = hist.length;
        const totalMins = hist.reduce((s,h)=>s+h.mins,0);
        const todaySessions = hist.filter(h=>h.date===getTodayStr()).length;
        sumEl.innerHTML = `
            <div style="background:#e5f1ff;border-radius:12px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:800;color:var(--primary)">${totalSessions}</div><div style="font-size:11px;color:#8e8e93;font-weight:600">Total Sessions</div></div>
            <div style="background:#e5f9e9;border-radius:12px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:800;color:#34c759">${Math.round(totalMins/60)}h</div><div style="font-size:11px;color:#8e8e93;font-weight:600">Total Focus</div></div>
            <div style="background:#fff8e8;border-radius:12px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:800;color:#ff9500">${todaySessions}</div><div style="font-size:11px;color:#8e8e93;font-weight:600">Today</div></div>`;
        listEl.innerHTML = hist.slice(0,30).map(h=>`
            <div class="pomo-hist-item">
                <div><b>${sanitizeHTML(h.task||'')}</b><br><span style="color:#8e8e93">${h.date} · ${h.time}</span></div>
                <span style="font-weight:700;color:#ff3b30">${h.mins}m 🍅</span>
            </div>`).join('') || emptyStateHTML('🍅', 'No sessions yet. Start a Pomodoro!');
    }

    // ============================================================
    // QR CODE SHARE
    // ============================================================
    let qrInstance = null;
    function openQRModal() {
        const sel = document.getElementById('qrTaskSelect');
        const reminders = safeStorage('reminders', []);
        const active = reminders.filter(r=>r.status!=='completed'&&!r.archived).slice(0,30);
        sel.innerHTML = '<option value="">-- Select Task to Share --</option>' + active.map(r=>`<option value="${r.id}">${sanitizeHTML(r.task||'')}</option>`).join('');
        openModal('qrModal');
    }

    function generateQR() {
        const sel = document.getElementById('qrTaskSelect');
        const id = Number(sel.value);
        const display = document.getElementById('qrCodeDisplay');
        const textEl = document.getElementById('qrTaskText');
        if(!id) { display.innerHTML=''; if(textEl) textEl.innerText=''; return; }
        const reminders = safeStorage('reminders', []);
        const task = reminders.find(r=>r.id===id);
        if(!task) return;
        const payload = JSON.stringify({task:task.task, time:task.time, priority:task.priority, notes:(task.notes||'').replace(/<[^>]*>/g,'').slice(0,100)});
        display.innerHTML = '';
        try {
            qrInstance = new QRCode(display, {text:payload, width:200, height:200, colorDark:'#1c1c1e', colorLight:'#ffffff', correctLevel:QRCode.CorrectLevel.M});
            if(textEl) textEl.innerText = task.task + (task.time ? ' · ' + new Date(task.time).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '');
        } catch(e) { display.innerHTML='<p style="color:#ff3b30">QR library not loaded. Check internet.</p>'; }
    }

    function downloadQR() {
        const canvas = document.querySelector('#qrCodeDisplay canvas');
        if(!canvas) return showToast('Generate QR first!', 'error');
        const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = 'task-qr.png'; a.click();
        showToast('QR downloaded! 📱', 'success');
    }

    // ============================================================
