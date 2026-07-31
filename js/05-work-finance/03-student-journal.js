// Student mode (attendance/study tracking) and daily journal.
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".
    // STUDENT MODE
    function getStudentData(){return safeStorage('studentData',{"exams":[],"subjects":[]})}    function saveStudentData(d){localStorage.setItem('studentData',JSON.stringify(d));syncToCloud()}
    function addExam(){const name=document.getElementById('examNameInput').value.trim();const date=document.getElementById('examDateInput').value;const emoji=document.getElementById('examEmojiInput').value.trim()||'📝';if(!name||!date)return showToast('Enter exam name & date!','error');const d=getStudentData();d.exams.unshift({id:Date.now(),name,date,emoji});saveStudentData(d);renderExamCountdowns();document.getElementById('examNameInput').value='';document.getElementById('examDateInput').value='';showToast('Exam added!','success')}
    function renderExamCountdowns(){const c=document.getElementById('examCountdownsContainer');if(!c)return;const d=getStudentData();const today=new Date();today.setHours(0,0,0,0);const upcoming=d.exams.filter(e=>new Date(e.date)>=today).sort((a,b)=>new Date(a.date)-new Date(b.date));if(!upcoming.length){c.innerHTML='';return}c.innerHTML=upcoming.slice(0,3).map(e=>{const days=Math.ceil((new Date(e.date)-today)/86400000);const col=days<=7?'#ff3b30':days<=30?'#ff9500':'#34c759';return`<div class="exam-countdown-card" style="background:linear-gradient(135deg,${col},${col}aa);position:relative"><div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:11px;opacity:0.8;font-weight:600;text-transform:uppercase">EXAM</div><div style="font-size:18px;font-weight:800;margin-top:2px">${sanitizeHTML(e.emoji||'')} ${sanitizeHTML(e.name||'')}</div><div style="font-size:12px;opacity:0.85;margin-top:2px">📅 ${new Date(e.date+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div></div><div style="text-align:center"><div style="font-size:36px;font-weight:900;line-height:1">${days}</div><div style="font-size:10px;opacity:0.85">${days===1?'DAY':'DAYS'} LEFT</div></div></div><button onclick="deleteExam(${e.id})" style="position:absolute;right:8px;top:8px;background:rgba(255,255,255,0.2);border:none;color:white;border-radius:6px;padding:2px 6px;cursor:pointer;font-size:11px">✖</button></div>`}).join('')}
    function deleteExam(id){const d=getStudentData();d.exams=d.exams.filter(e=>e.id!==id);saveStudentData(d);renderExamCountdowns()}
    function addSubject(){const name=document.getElementById('subjectNameInput').value.trim();const color=document.getElementById('subjectColorInput').value;if(!name)return showToast('Enter subject!','error');const d=getStudentData();d.subjects.unshift({id:Date.now(),name,color,studyHours:0});saveStudentData(d);renderSubjects();updateStudySubjectSelect();document.getElementById('subjectNameInput').value='';showToast('Subject added!','success')}
    function renderSubjects(){const c=document.getElementById('subjectsList');if(!c)return;const d=getStudentData();c.innerHTML=d.subjects.map(s=>`<div class="subject-item"><div style="display:flex;align-items:center;gap:10px"><div style="width:10px;height:10px;border-radius:50%;background:${s.color};flex-shrink:0"></div><div><b style="font-size:13px">${sanitizeHTML(s.name||'')}</b><br><span style="font-size:11px;color:#8e8e93">📚 ${s.studyHours||0}h</span></div></div><div style="display:flex;align-items:center;gap:6px"><button onclick="logStudyHour(${s.id})" style="background:${s.color}22;color:${s.color};border:none;border-radius:8px;padding:6px 10px;font-weight:700;cursor:pointer;font-size:12px">+1h</button><button onclick="deleteSubject(${s.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`).join('')||emptyStateHTML('📚', 'No subjects.')}
    function logStudyHour(id){const d=getStudentData();const s=d.subjects.find(x=>x.id===id);if(s)s.studyHours=(s.studyHours||0)+1;saveStudentData(d);renderSubjects();showToast('📚 1h logged!','success')}
    function deleteSubject(id){const d=getStudentData();d.subjects=d.subjects.filter(s=>s.id!==id);saveStudentData(d);renderSubjects();updateStudySubjectSelect()}
    function updateStudySubjectSelect(){const sel=document.getElementById('studySubjectSelect');if(!sel)return;const d=getStudentData();sel.innerHTML='<option value="">Select Subject</option>'+d.subjects.map(s=>`<option value="${s.id}">${sanitizeHTML(s.name||'')}</option>`).join('')}

    // JOURNAL
    function getJournalEntries(){return safeStorage('journalEntries', {})}
    function saveJournalEntries(data){localStorage.setItem('journalEntries',JSON.stringify(data));syncToCloud()}
    function loadTodayJournalEntry(){const e=getJournalEntries()[getTodayStr()];const el=document.getElementById('journalEntryInput');if(el&&e)el.value=e.text||'';const tagsEl=document.getElementById('journalTagsInput');if(tagsEl&&e)tagsEl.value=(e.tags||[]).join(', ')}

    const JOURNAL_PROMPTS = [
        "What's one thing you're grateful for today?",
        "What was the most challenging part of your day, and how did you handle it?",
        "Describe a moment today that made you smile.",
        "What's one goal you're working towards this week?",
        "What did you learn today that you didn't know before?",
        "If you could change one thing about today, what would it be?",
        "What's something kind someone did for you recently?",
        "Write about a small win you had today.",
        "What's been on your mind lately?",
        "Describe your ideal tomorrow, what would make it great?",
        "What's a habit you'd like to build, and why?",
        "Who made a positive impact on your day today?",
        "What's something you're looking forward to?",
        "Write three words that describe your mood today and explain why.",
        "What's one thing you'd tell your past self from a year ago?",
    ];

    function getJournalPrompt() {
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(),0,0)) / 86400000);
        return JOURNAL_PROMPTS[dayOfYear % JOURNAL_PROMPTS.length];
    }

    function usePrompt() {
        const prompt = document.getElementById('journalPromptText').innerText;
        const el = document.getElementById('journalEntryInput');
        if (!el.value.trim()) el.value = prompt + '\n\n';
        el.focus();
        hapticFeedback('light');
    }

    function calculateJournalStreak() {
        const entries = getJournalEntries();
        const dates = Object.keys(entries);
        if (!dates.length) return { current: 0, longest: 0 };

        let current = 0;
        const todayStr = getTodayStr();
        const yesterdayStr = formatDateLocal(new Date(Date.now() - 86400000));

        if (entries[todayStr] || entries[yesterdayStr]) {
            let d = entries[todayStr] ? new Date(todayStr+'T00:00:00') : new Date(yesterdayStr+'T00:00:00');
            while (entries[formatDateLocal(d)]) {
                current++;
                d.setDate(d.getDate() - 1);
            }
        }

        let longest = 0, streak = 0, prevDate = null;
        dates.slice().sort().forEach(dStr => {
            const d = new Date(dStr + 'T00:00:00');
            if (prevDate && (d - prevDate) === 86400000) streak++;
            else streak = 1;
            longest = Math.max(longest, streak);
            prevDate = d;
        });

        return { current, longest: Math.max(longest, current) };
    }

    function renderJournalStats() {
        const entries = getJournalEntries();
        const stk = calculateJournalStreak();
        const sEl = document.getElementById('journalStreak');
        const tEl = document.getElementById('journalTotalEntries');
        const lEl = document.getElementById('journalLongestStreak');
        if (sEl) sEl.innerText = stk.current + '🔥';
        if (tEl) tEl.innerText = Object.keys(entries).length;
        if (lEl) lEl.innerText = stk.longest;
        const pEl = document.getElementById('journalPromptText');
        if (pEl) pEl.innerText = getJournalPrompt();
    }

    function saveJournalEntry(){
        const text=document.getElementById('journalEntryInput').value.trim();
        if(!text)return showToast('Write something!','error');
        const entries=getJournalEntries();
        const todayStr=getTodayStr();
        const ml=safeStorage('moodLog', {});
        const tagsRaw = document.getElementById('journalTagsInput').value.trim();
        const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [];
        entries[todayStr]={text,mood:ml[todayStr],tags,savedAt:new Date().toISOString()};
        saveJournalEntries(entries);
        renderJournalEntries();
        renderJournalStats();
        hapticFeedback('success');
        showToast('Journal saved! 📓','success');
    }

    function getAllJournalTags() {
        const entries = getJournalEntries();
        const tagSet = new Set();
        Object.values(entries).forEach(e => (e.tags||[]).forEach(t => tagSet.add(t)));
        return [...tagSet];
    }

    let activeJournalTagFilter = null;

    function filterJournalByTag(tag) {
        activeJournalTagFilter = activeJournalTagFilter === tag ? null : tag;
        renderJournalEntries();
    }

    function renderJournalTagFilters() {
        const container = document.getElementById('journalTagFilters');
        if (!container) return;
        const tags = getAllJournalTags();
        container.innerHTML = tags.map(t => `<button onclick="filterJournalByTag('${escInline(t)}')" class="fin-tab-btn${activeJournalTagFilter===t?' active':''}" style="font-size:11px;">#${sanitizeHTML(t)}</button>`).join('');
    }

    function renderJournalEntries(){const c=document.getElementById('journalEntriesContainer');if(!c)return;const entries=getJournalEntries();const search=(document.getElementById('journalSearchInput')?.value||'').toLowerCase();const me=['😄','😊','😐','😔','😢'];let sorted=Object.entries(entries).sort((a,b)=>b[0].localeCompare(a[0])).filter(([_,e])=>!search||e.text.toLowerCase().includes(search));if(activeJournalTagFilter)sorted=sorted.filter(([_,e])=>(e.tags||[]).includes(activeJournalTagFilter));renderJournalTagFilters();if(!sorted.length){c.innerHTML=emptyStateHTML('✍️', 'No entries yet. Start writing!');return}c.innerHTML=sorted.slice(0,30).map(([date,entry])=>{const ms=entry.mood!==undefined?me[entry.mood]:'';const dt=new Date(date+'T00:00:00');const tagsHtml=(entry.tags||[]).map(t=>`<span style="background:#e5f1ff;color:var(--primary);font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;margin-right:4px;">#${sanitizeHTML(t)}</span>`).join('');return`<div class="journal-entry"><div class="journal-date">${dt.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} ${ms}</div><p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:inherit">${sanitizeHTML(entry.text.slice(0,200))}${entry.text.length>200?'...':''}</p>${tagsHtml?`<div style="margin-bottom:6px;">${tagsHtml}</div>`:''}<div style="display:flex;gap:8px;margin-top:8px"><button onclick="editJournalEntry('${date}')" style="background:#f2f2f7;border:none;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer">✏️ Edit</button><button onclick="deleteJournalEntry('${date}')" style="background:#ffe5e5;color:#ff3b30;border:none;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer">🗑️</button></div></div>`}).join('')}
    function editJournalEntry(date){const e=getJournalEntries();const el=document.getElementById('journalEntryInput');if(el&&e[date])el.value=e[date].text;const tagsEl=document.getElementById('journalTagsInput');if(tagsEl&&e[date])tagsEl.value=(e[date].tags||[]).join(', ');showToast('Editing...','info')}
    function deleteJournalEntry(date){const e=getJournalEntries();delete e[date];saveJournalEntries(e);renderJournalEntries();renderJournalStats()}

