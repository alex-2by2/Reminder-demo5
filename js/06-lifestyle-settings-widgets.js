// Medicine, Vehicle log, Shopping lists, Travel/trips, Attendance, Life events, Subscriptions, Secret space, Weather, Backup/Restore, Haptics, PWA install, Dark mode schedule, Widget customization, Birthday tracker, Home management, Quick notes, Pomodoro history, QR share, Finance charts, AI coach, Voice commands, Settings init, Offline banner, App statistics, CSV export.

    // MEDICINE
    function getMeds(){return safeStorage('medicines', [])}
    function saveMeds(data){localStorage.setItem('medicines',JSON.stringify(data));syncToCloud()}
    function openMedicineModal(){renderMedicineList();openModal('medicineModal')}
    function addMedicine(){const name=document.getElementById('medNameInput').value.trim();const dose=document.getElementById('medDoseInput').value.trim();const time=document.getElementById('medTimeInput').value;const freq=document.getElementById('medFreqInput').value;if(!name)return showToast('Enter medicine name!','error');const meds=getMeds();meds.unshift({id:Date.now(),name,dose,time,freq,takenDate:null});saveMeds(meds);renderMedicineList();document.getElementById('medNameInput').value='';document.getElementById('medDoseInput').value='';if(time){let rems=safeStorage('reminders', []);rems.push({id:Date.now(),task:`💊 Take ${name}`,notes:dose||'',time:`${getTodayStr()}T${time}`,priority:'high',repeat:'daily',status:'pending',notified:false,pinned:false,tags:'medicine',preAlarm:0,category:{name:'Health',icon:'💊'}});localStorage.setItem('reminders',JSON.stringify(rems));loadReminders()}showToast('💊 Medicine added!','success')}
    function renderMedicineList(){const c=document.getElementById('medicineList');if(!c)return;const meds=getMeds();const ts=getTodayStr();c.innerHTML=meds.map(m=>`<div class="med-item ${m.takenDate===ts?'med-taken':''}"><div><b style="font-size:13px">💊 ${sanitizeHTML(m.name||'')}</b><br><span style="font-size:11px;color:#8e8e93">${sanitizeHTML(m.dose||'')}${m.time?' · '+m.time:''}·${sanitizeHTML(m.freq||'')}</span></div><div style="display:flex;gap:8px;align-items:center"><button onclick="toggleMedTaken(${m.id})" style="background:${m.takenDate===ts?'#e5e5ea':'#e5f9e9'};color:${m.takenDate===ts?'#8e8e93':'#34c759'};border:none;border-radius:8px;padding:5px 10px;font-weight:700;cursor:pointer;font-size:12px">${m.takenDate===ts?'Taken ✅':'Take'}</button><button onclick="deleteMed(${m.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No medicines.</p>'}
    function toggleMedTaken(id){const m=getMeds();const x=m.find(x=>x.id===id);if(x)x.takenDate=(x.takenDate===getTodayStr()?null:getTodayStr());saveMeds(m);renderMedicineList()}
    function deleteMed(id){saveMeds(getMeds().filter(x=>x.id!==id));renderMedicineList()}

    // VEHICLE
    function getVehicles(){return safeStorage('vehicleReminders', [])}
    function saveVehicles(d){localStorage.setItem('vehicleReminders',JSON.stringify(d));syncToCloud()}
    function openVehicleModal(){renderVehicleList();openModal('vehicleModal')}
    function addVehicleReminder(){const veh=document.getElementById('vehNameInput').value.trim();const reminder=document.getElementById('vehReminderInput').value.trim();const due=document.getElementById('vehDueInput').value;const type=document.getElementById('vehTypeInput').value;if(!veh||!due)return showToast('Enter vehicle & due date!','error');const data=getVehicles();data.unshift({id:Date.now(),veh,reminder,due,type});saveVehicles(data);let rems=safeStorage('reminders', []);rems.push({id:Date.now(),task:`🚗 ${veh}: ${reminder||type}`,notes:'',time:`${due}T09:00`,priority:'high',repeat:'none',status:'pending',notified:false,pinned:false,tags:'vehicle',preAlarm:0,category:{name:'Vehicle',icon:'🚗'}});localStorage.setItem('reminders',JSON.stringify(rems));loadReminders();document.getElementById('vehNameInput').value='';document.getElementById('vehReminderInput').value='';renderVehicleList();showToast('Vehicle reminder added!','success')}
    function renderVehicleList(){const c=document.getElementById('vehicleReminderList');if(!c)return;const data=getVehicles();const today=getTodayStr();c.innerHTML=data.map(v=>{const dl=Math.ceil((new Date(v.due)-new Date(today))/86400000);const col=dl<0?'#ff3b30':dl<=7?'#ff9500':'#34c759';return`<div class="vehicle-item" style="border-left:3px solid ${col}"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><b style="font-size:13px">${sanitizeHTML(v.type||'')} ${sanitizeHTML(v.veh||'')}</b>${v.reminder?`<br><span style="font-size:12px;color:var(--primary)">${sanitizeHTML(v.reminder)}</span>`:''}<br><span style="font-size:11px;color:#8e8e93">📅 ${v.due}·${dl<0?'⚠️Overdue':dl===0?'🔴Today!':dl+'d'}</span></div><button onclick="deleteVehicle(${v.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`}).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No vehicle reminders.</p>'}
    function deleteVehicle(id){saveVehicles(getVehicles().filter(x=>x.id!==id));renderVehicleList()}

    // SHOPPING
    function getShopData(){return safeStorage('shopData',{"lists":{},"activeList":""})}    function saveShopData(d){localStorage.setItem('shopData',JSON.stringify(d));syncToCloud()}
    function openShoppingModal(){renderShopListSelect();renderShoppingItems();openModal('shoppingModal')}
    function addShopList(){const name=document.getElementById('shopNameInput').value.trim();if(!name)return showToast('Enter list name!','error');const d=getShopData();if(!d.lists[name])d.lists[name]=[];d.activeList=name;saveShopData(d);document.getElementById('shopNameInput').value='';renderShopListSelect();renderShoppingItems()}
    function renderShopListSelect(){const sel=document.getElementById('shopListSelect');if(!sel)return;const d=getShopData();sel.innerHTML=Object.keys(d.lists).map(l=>`<option value="${sanitizeHTML(l)}" ${l===d.activeList?'selected':''}>${sanitizeHTML(l)} (${d.lists[l].length})</option>`).join('')}
    function addShopItem(){const d=getShopData();const list=document.getElementById('shopListSelect')?.value||d.activeList;if(!list)return showToast('Create a list first!','error');const name=document.getElementById('shopItemInput').value.trim();const qty=document.getElementById('shopQtyInput').value||1;if(!name)return showToast('Enter item!','error');if(!d.lists[list])d.lists[list]=[];d.lists[list].unshift({id:Date.now(),name,qty:Number(qty),done:false});saveShopData(d);document.getElementById('shopItemInput').value='';document.getElementById('shopQtyInput').value='';renderShoppingItems()}
    function renderShoppingItems(){const c=document.getElementById('shoppingItems');const te=document.getElementById('shoppingTotal');if(!c)return;const d=getShopData();const ln=document.getElementById('shopListSelect')?.value||d.activeList;if(!ln||!d.lists[ln]){c.innerHTML='<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">Select/create a list.</p>';return}const items=d.lists[ln];const done=items.filter(i=>i.done).length;if(te)te.innerText=`${done}/${items.length} items`;const lnAttr=escInline(ln);c.innerHTML=items.map(i=>`<div class="shop-item ${i.done?'done':''}"><input type="checkbox" ${i.done?'checked':''} onchange="toggleShopItem('${lnAttr}',${i.id})" style="width:18px;height:18px;margin:0;flex-shrink:0"><span style="flex:1;font-size:13px">${sanitizeHTML(i.name||'')}</span><span style="font-size:11px;color:#8e8e93">×${i.qty}</span><button onclick="deleteShopItem('${lnAttr}',${i.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div>`).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">Empty list.</p>'}
    function toggleShopItem(list,id){const d=getShopData();const item=d.lists[list]?.find(x=>x.id===id);if(item)item.done=!item.done;saveShopData(d);renderShoppingItems()}
    function deleteShopItem(list,id){const d=getShopData();if(d.lists[list])d.lists[list]=d.lists[list].filter(x=>x.id!==id);saveShopData(d);renderShoppingItems()}

    // TRAVEL
    function getTravelData(){return safeStorage('travelData',{"trips":[],"packing":[]})}    function saveTravelData(d){localStorage.setItem('travelData',JSON.stringify(d));syncToCloud()}
    function openTravelModal(){setTravelTab('trips');renderTrips();openModal('travelModal')}
    function setTravelTab(tab){document.querySelectorAll('[id^="traveltab-"]').forEach(b=>b.classList.remove('active'));document.getElementById('traveltab-'+tab).classList.add('active');document.getElementById('travelTabTrips').style.display=tab==='trips'?'block':'none';document.getElementById('travelTabPacking').style.display=tab==='packing'?'block':'none';if(tab==='packing')renderPackingList()}
    function addTrip(){const name=document.getElementById('tripNameInput').value.trim();const dest=document.getElementById('tripDestInput').value.trim();const from=document.getElementById('tripFromInput').value;const to=document.getElementById('tripToInput').value;if(!name)return showToast('Enter trip name!','error');const d=getTravelData();d.trips.unshift({id:Date.now(),name,dest,from,to});saveTravelData(d);renderTrips();document.getElementById('tripNameInput').value='';document.getElementById('tripDestInput').value='';showToast('Trip added! ✈️','success')}
    function renderTrips(){const c=document.getElementById('tripsList');if(!c)return;const d=getTravelData();c.innerHTML=d.trips.map(t=>{const days=t.from&&t.to?Math.ceil((new Date(t.to)-new Date(t.from))/86400000)+1:null;return`<div class="trip-item"><div><b style="font-size:13px">✈️ ${sanitizeHTML(t.name||'')}</b>${t.dest?`<br><span style="font-size:11px;color:var(--primary)">📍${sanitizeHTML(t.dest)}</span>`:''}${t.from?`<br><span style="font-size:11px;color:#8e8e93">${t.from}→${t.to||'?'}${days?` (${days}d)`:''}</span>`:''}</div><button onclick="deleteTrip(${t.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div>`}).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No trips.</p>'}
    function deleteTrip(id){const d=getTravelData();d.trips=d.trips.filter(x=>x.id!==id);saveTravelData(d);renderTrips()}
    function addPackingItem(){const name=document.getElementById('packItemInput').value.trim();const cat=document.getElementById('packCatInput').value;if(!name)return showToast('Enter item!','error');const d=getTravelData();d.packing.unshift({id:Date.now(),name,cat,packed:false});saveTravelData(d);renderPackingList();document.getElementById('packItemInput').value=''}
    function renderPackingList(){const c=document.getElementById('packingList');if(!c)return;const d=getTravelData();const done=d.packing.filter(x=>x.packed).length;c.innerHTML=`<p style="font-size:12px;color:#8e8e93;margin:0 0 10px">✅ ${done}/${d.packing.length} packed</p>`+d.packing.map(item=>`<div class="packing-item"><input type="checkbox" ${item.packed?'checked':''} onchange="togglePackItem(${item.id})" style="width:18px;height:18px;margin:0;flex-shrink:0"><span style="flex:1;font-size:13px;${item.packed?'text-decoration:line-through;opacity:0.5':''}">${sanitizeHTML(item.name||'')}</span><span style="font-size:10px;color:#8e8e93">${item.cat.split(' ')[0]}</span><button onclick="deletePackItem(${item.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:14px">✖</button></div>`).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">Empty.</p>'}
    function togglePackItem(id){const d=getTravelData();const i=d.packing.find(x=>x.id===id);if(i)i.packed=!i.packed;saveTravelData(d);renderPackingList()}
    function deletePackItem(id){const d=getTravelData();d.packing=d.packing.filter(x=>x.id!==id);saveTravelData(d);renderPackingList()}

    // ATTENDANCE
    function getAttData(){return safeStorage('attData',{"subjects":[]})}    function saveAttData(d){localStorage.setItem('attData',JSON.stringify(d));syncToCloud()}
    function openAttendanceModal(){renderAttSubjectList();openModal('attendanceModal')}
    function addAttSubject(){const name=document.getElementById('attSubjectInput').value.trim();if(!name)return showToast('Enter subject!','error');const d=getAttData();d.subjects.unshift({id:Date.now(),name,log:{}});saveAttData(d);renderAttSubjectList();document.getElementById('attSubjectInput').value='';showToast('Subject added!','success')}
    function renderAttSubjectList(){const c=document.getElementById('attSubjectList');if(!c)return;const d=getAttData();const ts=getTodayStr();c.innerHTML=d.subjects.map(s=>{const total=Object.keys(s.log).filter(k=>s.log[k]).length;const present=Object.values(s.log).filter(v=>v==='P').length;const pct=total>0?Math.round((present/total)*100):0;const tv=s.log[ts]||'';return`<div style="background:#f2f2f7;border-radius:14px;padding:12px;margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div><b style="font-size:14px">${sanitizeHTML(s.name||'')}</b><br><span style="font-size:11px;color:${pct>=75?'#34c759':'#ff3b30'};font-weight:700">${pct}% (${present}/${total})</span></div><button onclick="deleteAttSubject(${s.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px"><button onclick="markAtt(${s.id},'${ts}','P')" class="att-day ${tv==='P'?'att-present':'att-unmarked'}">✅ P</button><button onclick="markAtt(${s.id},'${ts}','A')" class="att-day ${tv==='A'?'att-absent':'att-unmarked'}">❌ A</button><button onclick="markAtt(${s.id},'${ts}','H')" class="att-day ${tv==='H'?'att-holiday':'att-unmarked'}">🏖️ H</button></div><div class="project-progress-track"><div class="project-progress-fill" style="width:${pct}%;background:${pct>=75?'#34c759':'#ff3b30'}"></div></div></div>`}).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No subjects.</p>'}
    function markAtt(subId,dateStr,status){const d=getAttData();const s=d.subjects.find(x=>x.id===subId);if(s)s.log[dateStr]=(s.log[dateStr]===status?'':status);saveAttData(d);renderAttSubjectList()}
    function deleteAttSubject(id){const d=getAttData();d.subjects=d.subjects.filter(x=>x.id!==id);saveAttData(d);renderAttSubjectList()}

    // LIFE EVENTS
    function getLifeEvents(){return safeStorage('lifeEvents', [])}
    function saveLifeEvents(d){localStorage.setItem('lifeEvents',JSON.stringify(d));syncToCloud()}
    function openLifeEventsModal(){renderLifeEvents();openModal('lifeEventsModal')}
    function addLifeEvent(){const name=document.getElementById('lifeEventNameInput').value.trim();const date=document.getElementById('lifeEventDateInput').value;const emoji=document.getElementById('lifeEventEmojiInput').value.trim()||'⭐';const color=document.getElementById('lifeEventColorInput').value;if(!name||!date)return showToast('Enter name & date!','error');const events=getLifeEvents();events.push({id:Date.now(),name,date,emoji,color});events.sort((a,b)=>b.date.localeCompare(a.date));saveLifeEvents(events);document.getElementById('lifeEventNameInput').value='';document.getElementById('lifeEventEmojiInput').value='';renderLifeEvents();showToast('Life event added! 🌟','success')}
    function renderLifeEvents(){const c=document.getElementById('lifeEventsContainer');if(!c)return;const events=getLifeEvents();if(!events.length){c.innerHTML='<p style="text-align:center;color:#8e8e93;font-size:13px;padding:20px">No events yet. Add your milestones! 🌟</p>';return}c.innerHTML=events.map(e=>{const dt=new Date(e.date+'T00:00:00');const da=Math.floor((new Date()-dt)/86400000);const label=da===0?'Today!':da>0?`${da} days ago`:`in ${Math.abs(da)} days`;return`<div class="life-event-item"><div class="life-event-dot" style="background:${e.color}"></div><div style="flex:1"><div style="font-size:15px;font-weight:700">${sanitizeHTML(e.emoji||'')} ${sanitizeHTML(e.name||'')}</div><div style="font-size:11px;color:#8e8e93;margin-top:2px">📅 ${dt.toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}·${label}</div></div><button onclick="deleteLifeEvent(${e.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div>`}).join('')}
    function deleteLifeEvent(id){saveLifeEvents(getLifeEvents().filter(x=>x.id!==id));renderLifeEvents()}

    // SUBSCRIPTIONS
    function getSubs(){return safeStorage('subscriptions', [])}
    function saveSubs(d){localStorage.setItem('subscriptions',JSON.stringify(d));syncToCloud()}
    function openSubModal(){renderSubSummary();renderSubList();openModal('subModal')}
    function addSubscription(){const name=document.getElementById('subNameInput').value.trim();const amt=Number(document.getElementById('subAmtInput').value);const renew=document.getElementById('subRenewInput').value;const freq=document.getElementById('subFreqInput').value;if(!name||!amt)return showToast('Enter name & amount!','error');const subs=getSubs();subs.unshift({id:Date.now(),name,amount:amt,renew,freq});saveSubs(subs);renderSubSummary();renderSubList();document.getElementById('subNameInput').value='';document.getElementById('subAmtInput').value='';showToast('Subscription added!','success')}
    function renderSubSummary(){const el=document.getElementById('subSummary');if(!el)return;const subs=getSubs();const m=subs.reduce((s,x)=>s+(x.freq==='yearly'?x.amount/12:x.freq==='weekly'?x.amount*4.33:x.amount),0);el.innerHTML=`<p style="margin:0;font-size:13px;font-weight:700">Monthly:<span style="color:var(--primary)"> ₹${m.toFixed(0)}</span> &nbsp; Yearly:<span style="color:#ff3b30"> ₹${(m*12).toFixed(0)}</span></p>`}
    function renderSubList(){const c=document.getElementById('subList');if(!c)return;const subs=getSubs();const today=getTodayStr();c.innerHTML=subs.map(s=>{const dl=s.renew?Math.ceil((new Date(s.renew)-new Date(today))/86400000):null;const col=dl!==null&&dl<=3?'#ff3b30':dl!==null&&dl<=7?'#ff9500':'#8e8e93';return`<div class="sub-item"><div><b style="font-size:13px">${sanitizeHTML(s.name||'')}</b><br><span style="font-size:11px;color:${col}">${s.renew?`Renews:${s.renew}${dl!==null?` · ${dl<0?'⚠️Overdue':dl+'d'}`:''}`:'No date'}</span></div><div style="display:flex;align-items:center;gap:8px"><span style="font-weight:700;font-size:13px">₹${s.amount}/${s.freq==='monthly'?'mo':s.freq==='yearly'?'yr':'wk'}</span><button onclick="deleteSub(${s.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`}).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No subscriptions.</p>'}
    function deleteSub(id){saveSubs(getSubs().filter(x=>x.id!==id));renderSubSummary();renderSubList()}

    // SECRET SPACE
    function openSecretModal(){document.getElementById('secretLockScreen').style.display='block';document.getElementById('secretUnlocked').style.display='none';document.getElementById('secretPinInput').value='';openModal('secretModal')}
    async function unlockSecret(){
        const entered=document.getElementById('secretPinInput').value;
        const stored=localStorage.getItem('secretPinHash');
        if(!stored){showToast('Set a PIN first!','error');return}
        const hash=await sha256(entered);
        if(hash===stored){
            document.getElementById('secretLockScreen').style.display='none';
            document.getElementById('secretUnlocked').style.display='block';
            document.getElementById('secretNoteInput').value=localStorage.getItem('secretNote')||'';
        }else{
            showToast('Wrong PIN!','error');
            document.getElementById('secretPinInput').value='';
            hapticFeedback('medium');
        }
    }
    async function setupSecretPin(){
        const pin=prompt('Enter a new 4-digit PIN:');
        if(!pin)return;
        if(!/^\d{4}$/.test(pin)){showToast('Use exactly 4 digits!','error');return}
        const hash=await sha256(pin);
        localStorage.setItem('secretPinHash',hash);
        localStorage.removeItem('secretPin'); // remove old unhashed PIN if exists
        showToast('PIN set securely!','success');
    }
    function saveSecretNote(){localStorage.setItem('secretNote',document.getElementById('secretNoteInput').value);showToast('Saved 🔒','success');lockSecret()}
    function lockSecret(){document.getElementById('secretLockScreen').style.display='block';document.getElementById('secretUnlocked').style.display='none';document.getElementById('secretNoteInput').value='';document.getElementById('secretPinInput').value=''}

    // WEATHER
    function openWeatherModal(){document.getElementById('weatherApiKeyInput').value=localStorage.getItem('weatherApiKey')||'';document.getElementById('weatherCityInput').value=localStorage.getItem('weatherCity')||'';openModal('weatherModal')}
    function saveWeatherKey(){localStorage.setItem('weatherApiKey',document.getElementById('weatherApiKeyInput').value.trim());showToast('API Key saved! 🌤️','success')}
    async function fetchWeather(){const city=document.getElementById('weatherCityInput').value.trim();const apiKey=document.getElementById('weatherApiKeyInput').value.trim()||localStorage.getItem('weatherApiKey');if(!city)return showToast('Enter city!','error');if(!apiKey)return showToast('Add free API Key from openweathermap.org!','error');localStorage.setItem('weatherCity',city);const re=document.getElementById('weatherResult');re.innerHTML='<p style="color:#8e8e93;font-size:13px">Loading... ⏳</p>';try{const res=await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`);const data=await res.json();if(data.cod!==200){re.innerHTML=`<p style="color:#ff3b30;font-size:13px">⚠️ ${sanitizeHTML(data.message||'')}</p>`;return}re.innerHTML=`<div class="weather-widget" style="text-align:left"><div style="display:flex;align-items:center;gap:12px"><img src="https://openweathermap.org/img/wn/${encodeURIComponent(data.weather[0].icon)}@2x.png" style="width:60px;height:60px" alt="${sanitizeHTML(data.weather[0].description||'Weather icon')}"><div><div style="font-size:22px;font-weight:800">${Math.round(data.main.temp)}°C</div><div style="font-size:14px;opacity:0.9">${sanitizeHTML(data.weather[0].description||'')}</div><div style="font-size:12px;opacity:0.8">📍 ${sanitizeHTML(data.name||'')},${sanitizeHTML(data.sys.country||'')}</div></div></div><div style="display:flex;gap:15px;margin-top:12px;font-size:12px;opacity:0.9"><span>💧${data.main.humidity}%</span><span>🌬️${Math.round(data.wind.speed)}m/s</span><span>🌡️Feels ${Math.round(data.main.feels_like)}°C</span></div></div>`}catch(e){re.innerHTML='<p style="color:#ff3b30;font-size:13px">⚠️ Error. Check internet.</p>'}}


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
        document.getElementById('pwaBanner').style.display='none';
        if(deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then(() => { deferredPrompt = null; }); }
    }

    // ============================================================
    // DARK AUTO SCHEDULE
    // ============================================================
    function saveAutoDarkSettings() {
        const enabled = document.getElementById('autoDarkToggle').checked;
        const from = document.getElementById('autoDarkFrom').value;
        const to = document.getElementById('autoDarkTo').value;
        localStorage.setItem('autoDark', JSON.stringify({enabled,from,to}));
        document.getElementById('autoDarkTimesWrap').style.display = enabled ? 'block' : 'none';
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
    setInterval(checkAutoDark, 60000);

    // ============================================================
    // WIDGET CUSTOMIZATION
    // ============================================================
    function toggleWidget(name, show) {
        const map = { mood:'todayMoodSection', sleep:'todaySleepSection', shift:'todayShiftCard', aitip:'aiTipContainer' };
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
        const name = document.getElementById('bdayNameInput').value.trim();
        const date = document.getElementById('bdayDateInput').value;
        const rel = document.getElementById('bdayRelInput').value;
        const emoji = document.getElementById('bdayEmojiInput').value.trim() || '🎂';
        if(!name || !date) return showToast('Enter name & birthday!', 'error');
        const bdays = getBirthdays();
        bdays.push({id:Date.now(), name, date, rel, emoji});
        saveBirthdays(bdays);
        document.getElementById('bdayNameInput').value = '';
        document.getElementById('bdayEmojiInput').value = '';
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
        }).join('') || '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No birthdays added.</p>';
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
        const name = document.getElementById('choreNameInput').value.trim();
        const freq = document.getElementById('choreFreqInput').value;
        const area = document.getElementById('choreAreaInput').value;
        if(!name) return showToast('Enter task name!', 'error');
        const chores = getChores();
        chores.unshift({id:Date.now(), name, freq, area, done:false, lastDone:null});
        saveChores(chores); renderChoreList(currentChoreFilter || 'all');
        document.getElementById('choreNameInput').value = '';
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
            </div>`).join('') || '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No tasks in this category.</p>';
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
        const text = document.getElementById('quickNoteInput').value.trim();
        const color = document.getElementById('quickNoteColor').value;
        if(!text) return showToast('Type a note!', 'error');
        const notes = getQuickNotes();
        notes.unshift({id:Date.now(), text, color, pinned:false, created:new Date().toISOString()});
        saveQuickNotes(notes); renderQuickNotes();
        document.getElementById('quickNoteInput').value = '';
        hapticFeedback('success');
    }

    function renderQuickNotes() {
        const c = document.getElementById('quickNotesList'); if(!c) return;
        const search = (document.getElementById('noteSearchInput')?.value || '').toLowerCase();
        const notes = getQuickNotes().filter(n => !search || n.text.toLowerCase().includes(search));
        if(!notes.length) { c.innerHTML='<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No notes yet. Add one! 📝</p>'; return; }
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
            </div>`).join('') || '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No sessions yet. Start a Pomodoro!</p>';
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
    // FINANCE CHARTS
    // ============================================================
    let expPieChart = null, incExpChart = null;
    function openFinanceChartsModal() {
        openModal('financeChartsModal');
        setTimeout(renderFinanceCharts, 200);
    }

    function renderFinanceCharts() {
        const d = getFinData();
        const catTotals = {};
        d.expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category]||0) + Number(e.amount); });
        const pieCtx = document.getElementById('expensePieChart')?.getContext('2d');
        if(pieCtx) {
            if(expPieChart) expPieChart.destroy();
            const cats = Object.keys(catTotals);
            const colors = ['#ff3b30','#ff9500','#ffcc00','#34c759','#5ac8fa','#007aff','#5e5ce6','#af52de','#ff2d55'];
            expPieChart = new Chart(pieCtx, { type:'doughnut', data:{labels:cats, datasets:[{data:cats.map(c=>catTotals[c]), backgroundColor:colors.slice(0,cats.length), borderWidth:0}]}, options:{plugins:{legend:{position:'right',labels:{font:{size:11}}}},cutout:'60%'} });
        }
        const now = new Date();
        const months = []; const incData = []; const expData = [];
        for(let i=5;i>=0;i--) {
            const d2 = new Date(now.getFullYear(), now.getMonth()-i, 1);
            const ms = `${d2.getFullYear()}-${String(d2.getMonth()+1).padStart(2,'0')}`;
            months.push(ms.slice(5));
            incData.push(d.income.filter(e=>e.date?.startsWith(ms)).reduce((s,e)=>s+Number(e.amount),0));
            expData.push(d.expenses.filter(e=>e.date?.startsWith(ms)).reduce((s,e)=>s+Number(e.amount),0));
        }
        const barCtx = document.getElementById('incomeExpenseChart')?.getContext('2d');
        if(barCtx) {
            if(incExpChart) incExpChart.destroy();
            incExpChart = new Chart(barCtx, { type:'bar', data:{labels:months, datasets:[{label:'Income',data:incData,backgroundColor:'#34c759',borderRadius:6},{label:'Expense',data:expData,backgroundColor:'#ff3b30',borderRadius:6}]}, options:{scales:{y:{beginAtZero:true}},plugins:{legend:{labels:{font:{size:11}}}}} });
        }
        const el = document.getElementById('finInsightsAI');
        if(el) {
            const total = d.expenses.reduce((s,e)=>s+Number(e.amount),0);
            const topCat = Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];
            el.innerHTML = `<b>💡 Quick Insights</b><br>Total expenses: ₹${total.toLocaleString('en-IN')}<br>${topCat?`Top category: ${topCat[0]} (₹${topCat[1].toLocaleString('en-IN')})`:''}`;
        }
    }

    // ============================================================
    // AI COACH
    // ============================================================
    async function openAICoachModal() {
        openModal('aiCoachModal');
        await getAICoachReport('productivity');
    }

    async function getAICoachReport(type) {
        const el = document.getElementById('aiCoachDetail');
        if(el) el.innerHTML = '<p style="text-align:center;color:#8e8e93">🤔 Analyzing your data...</p>';
        try {
            const reminders = safeStorage('reminders', []);
            const habits = safeStorage('habits', []);
            const finData = getFinData();
            const moodLog = safeStorage('moodLog', {});
            const totalTasks = reminders.length;
            const completedTasks = reminders.filter(r=>r.status==='completed').length;
            const streak = Math.max(0, ...habits.map(h=>h.streak||0));
            const moodVals = Object.values(moodLog).filter(v=>v!==undefined);
            const avgMood = moodVals.length ? (moodVals.reduce((a,b)=>a+b,0)/moodVals.length).toFixed(1) : 'N/A';
            const monthExp = finData.expenses.slice(0,30).reduce((s,e)=>s+Number(e.amount),0);
            let prompt = '';
            if(type==='productivity') prompt = `User stats: ${completedTasks}/${totalTasks} tasks completed, best habit streak: ${streak} days, avg mood: ${avgMood}/4. Give 3 specific, actionable productivity tips in bullet points (max 4 lines total). Be encouraging and direct.`;
            else if(type==='habits') prompt = `User has ${habits.length} habits. Best streak: ${streak} days. Habits: ${habits.map(h=>h.name+'('+h.streak+' days)').join(', ')||'none'}. Give 3 habit improvement tips in bullet points. Max 4 lines.`;
            else if(type==='finance') prompt = `Monthly expenses: ₹${monthExp.toLocaleString('en-IN')}. Income: ₹${finData.income.slice(0,5).reduce((s,e)=>s+Number(e.amount),0).toLocaleString('en-IN')}. EMIs: ${finData.emis.length}. Give 3 finance tips in bullet points. Max 4 lines.`;
            const reply = await callGeminiAI(prompt);
            if(el) el.innerHTML = sanitizeHTML(reply).replace(/\n/g,'<br>');
            const card = document.getElementById('aiCoachCard');
            if(card) card.innerHTML = `<p style="margin:0;font-size:13px;opacity:0.9">Last coaching: ${new Date().toLocaleString('en-IN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'})}</p>`;
        } catch(e) {
            if(el) el.innerHTML = !currentUser ? '<p>⚠️ Sign in to use AI Coach!</p>' : '<p>⚠️ Error: '+sanitizeHTML(e.message)+'</p>';
        }
    }

    // ============================================================
    // VOICE COMMANDS
    // ============================================================
    let voiceRecognition = null;
    function startVoiceCommand() {
        if(!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            return showToast('Voice not supported in this browser. Try Chrome!', 'error');
        }
        const overlay = document.getElementById('voiceOverlay');
        if(overlay) overlay.style.display='flex';
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        voiceRecognition = new SpeechRecognition();
        voiceRecognition.continuous = false; voiceRecognition.interimResults = true;
        voiceRecognition.lang = 'en-IN';
        voiceRecognition.onresult = e => {
            const transcript = Array.from(e.results).map(r=>r[0].transcript).join('');
            const el = document.getElementById('voiceTranscript'); if(el) el.innerText = transcript;
            if(e.results[0].isFinal) processVoiceCommand(transcript);
        };
        voiceRecognition.onerror = () => { stopVoiceCommand(); showToast('Voice error. Try again!', 'error'); };
        voiceRecognition.onend = () => stopVoiceCommand();
        voiceRecognition.start();
        hapticFeedback('medium');
    }

    function stopVoiceCommand() {
        if(voiceRecognition) { try { voiceRecognition.stop(); } catch(e) {} voiceRecognition = null; }
        const overlay = document.getElementById('voiceOverlay'); if(overlay) overlay.style.display='none';
    }

    async function processVoiceCommand(transcript) {
        stopVoiceCommand();
        showToast(`🎤 Heard: "${transcript}"`, 'info');
        if(!transcript.trim()) return;
        try {
            const prompt = `The user said: "${transcript}"\nExtract a task from this voice command. Reply ONLY in this exact JSON format (no extra text): {"task":"task name here","priority":"low/medium/high","time":"YYYY-MM-DDTHH:MM or null"}\nIf no clear time mentioned, set time to null. Today is ${getTodayStr()}.`;
            const reply = await callGeminiAI(prompt);
            const clean = reply.replace(/```json?|```/g,'').trim();
            const parsed = JSON.parse(clean);
            if(parsed.task) {
                switchPage('add');
                setTimeout(() => {
                    document.getElementById('taskInput').value = parsed.task;
                    if(parsed.priority) document.getElementById('priorityInput').value = parsed.priority;
                    if(parsed.time) document.getElementById('timeInput').value = parsed.time;
                    updateCategoryPreview();
                    showToast('✅ Task ready! Tap Save.', 'success');
                }, 300);
            }
        } catch(e) {
            const taskInput = document.getElementById('taskInput');
            switchPage('add');
            setTimeout(() => { if(taskInput) taskInput.value = transcript; updateCategoryPreview(); }, 300);
        }
    }

    // ============================================================
    // SETTINGS INIT ON LOAD
    // ============================================================
    document.addEventListener('DOMContentLoaded', () => {
        const autoDark = safeStorage('autoDark', null);
        if(autoDark) {
            const toggle = document.getElementById('autoDarkToggle');
            if(toggle) toggle.checked = autoDark.enabled;
            const fromEl = document.getElementById('autoDarkFrom');
            const toEl = document.getElementById('autoDarkTo');
            if(fromEl) fromEl.value = autoDark.from || '20:00';
            if(toEl) toEl.value = autoDark.to || '07:00';
            const wrap = document.getElementById('autoDarkTimesWrap');
            if(wrap) wrap.style.display = autoDark.enabled ? 'block' : 'none';
            checkAutoDark();
        }
        const hapticEl = document.getElementById('hapticToggle');
        if(hapticEl) hapticEl.checked = localStorage.getItem('haptic') === 'true';
        applyWidgetPrefs();
    });


    // ============================================================
    // OFFLINE BANNER
    // ============================================================
    window.addEventListener('offline', () => {
        const b = document.getElementById('offlineBanner');
        if(b) b.classList.add('show');
    });
    window.addEventListener('online', () => {
        const b = document.getElementById('offlineBanner');
        if(b) b.classList.remove('show');
        showToast('✅ Back online! Syncing...', 'success');
        syncToCloud();
    });

    // ============================================================
    // POMODORO AUTO-LOG (patch existing pomo complete)
    // ============================================================
    const _origStartPomo = typeof startPomo !== 'undefined' ? startPomo : null;
    function patchPomoComplete() {
        const origReset = window.resetPomo;
        const origStart = window.startPomo;
        if(!origStart) return;
        window.startPomo = function() {
            origStart();
            const sel = document.getElementById('pomoTaskSelect');
            const mins = parseInt(document.getElementById('pomoTimeSelect')?.value || 1500) / 60;
            const task = sel?.options[sel.selectedIndex]?.text || 'Focus Session';
            window._pomoTask = task;
            window._pomoMins = mins;
        };
    }
    function completePomoSession() {
        const task = window._pomoTask || 'Focus Session';
        const mins = window._pomoMins || 25;
        logPomoSession(task, Math.round(mins));
        hapticFeedback('success');
        showToast(`🍅 Session logged: ${Math.round(mins)} min!`, 'success');
    }

    // ============================================================
    // APP STATISTICS
    // ============================================================
    let taskTrendChartInst = null;
    function openAppStatsModal() {
        openModal('appStatsModal');
        setTimeout(renderAppStats, 150);
    }

    function renderAppStats() {
        const reminders = safeStorage('reminders', []);
        const habits = safeStorage('habits', []);
        const finData = getFinData();
        const notes = safeStorage('quickNotes', []);
        const journal = safeStorage('journalEntries', {});

        const total = reminders.length;
        const completed = reminders.filter(r => r.status === 'completed').length;
        const rate = total ? Math.round((completed/total)*100) : 0;
        const bestStreak = Math.max(0, ...habits.map(h => h.streak||0));
        const totalMins = safeStorage('pomodoroHistory', []).reduce((s,h)=>s+h.mins,0);

        const grid = document.getElementById('appStatsGrid');
        if(grid) grid.innerHTML = `
            <div style="background:#e5f1ff;border-radius:12px;padding:12px;text-align:center;"><h3 style="margin:0;font-size:22px;color:var(--primary)">${total}</h3><p style="margin:2px 0 0;font-size:11px;color:#8e8e93;font-weight:700">Total Tasks</p></div>
            <div style="background:#e5f9e9;border-radius:12px;padding:12px;text-align:center;"><h3 style="margin:0;font-size:22px;color:#34c759">${rate}%</h3><p style="margin:2px 0 0;font-size:11px;color:#8e8e93;font-weight:700">Completion Rate</p></div>
            <div style="background:#fff8e8;border-radius:12px;padding:12px;text-align:center;"><h3 style="margin:0;font-size:22px;color:#ff9500">${bestStreak}🔥</h3><p style="margin:2px 0 0;font-size:11px;color:#8e8e93;font-weight:700">Best Streak</p></div>
            <div style="background:#ffe5e5;border-radius:12px;padding:12px;text-align:center;"><h3 style="margin:0;font-size:22px;color:#ff3b30">${Math.round(totalMins/60)}h</h3><p style="margin:2px 0 0;font-size:11px;color:#8e8e93;font-weight:700">Focus Time</p></div>`;

        const details = document.getElementById('appStatsDetails');
        if(details) details.innerHTML = `
            📓 Journal entries: ${Object.keys(journal).length}<br>
            📝 Quick notes: ${notes.length}<br>
            💊 Medicines tracked: ${safeStorage('medicines', []).length}<br>
            🎂 Birthdays tracked: ${safeStorage('birthdays', []).length}<br>
            💰 Total expenses recorded: ${finData.expenses.length}<br>
            ✈️ Trips planned: ${safeStorage('travelData',{"trips":[]}).trips.length}`;

        // 30-day task trend chart
        const ctx = document.getElementById('taskTrendChart')?.getContext('2d');
        if(ctx) {
            if(taskTrendChartInst) taskTrendChartInst.destroy();
            const labels = [], data = [];
            for(let i=13;i>=0;i--) {
                const d = new Date(); d.setDate(d.getDate()-i);
                const ds = formatDateLocal(d);
                labels.push(ds.slice(5));
                data.push(reminders.filter(r => r.time?.startsWith(ds) && r.status==='completed').length);
            }
            taskTrendChartInst = new Chart(ctx, { type:'line', data:{labels, datasets:[{label:'Completed', data, borderColor:'#34c759', backgroundColor:'#34c75922', tension:0.4, fill:true, borderWidth:2, pointRadius:3}]}, options:{scales:{y:{beginAtZero:true,ticks:{stepSize:1}}},plugins:{legend:{display:false}}} });
        }
    }

    // ============================================================
    // CSV EXPORT
    // ============================================================

    // ============================================================
