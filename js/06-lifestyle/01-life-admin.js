// Medicine tracker, vehicle log/reminders, shopping list, travel/trips, attendance, life events, subscriptions.
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".

    // MEDICINE
    function getMeds(){return safeStorage('medicines', [])}
    function saveMeds(data){localStorage.setItem('medicines',JSON.stringify(data));syncToCloud()}
    function openMedicineModal(){renderMedicineList();openModal('medicineModal')}
    function addMedicine(){
        const nameInput = document.getElementById('medNameInput');
        const doseInput = document.getElementById('medDoseInput');
        const timeInput = document.getElementById('medTimeInput');
        const timeInput2 = document.getElementById('medTimeInput2');
        const freqInput = document.getElementById('medFreqInput');
        const qtyInput = document.getElementById('medQtyInput');
        const refillAtInput = document.getElementById('medRefillAtInput');
        if(!nameInput || !doseInput || !timeInput || !freqInput) return showToast('Medicine form unavailable.', 'error');
        const name = nameInput.value.trim();
        const dose = doseInput.value.trim();
        // MEDICINE SCHEDULE UPGRADE: `times` (array) replaces the old single `time`
        // string — supports the common twice-daily pattern. `time` is still saved
        // (first entry) so anything reading the old field keeps working.
        const times = [timeInput.value, timeInput2 ? timeInput2.value : ''].filter(Boolean);
        const freq = freqInput.value;
        const quantity = qtyInput && qtyInput.value !== '' ? safeNum(qtyInput.value) : null;
        const refillAt = refillAtInput && refillAtInput.value !== '' ? safeNum(refillAtInput.value) : null;
        if(!name) return showToast('Enter medicine name!','error');
        const meds = getMeds();
        meds.unshift({id:Date.now(),name,dose,time:times[0]||'',times,freq,takenDate:null,quantity,refillAt});
        saveMeds(meds);
        renderMedicineList();
        nameInput.value = '';
        doseInput.value = '';
        if(qtyInput) qtyInput.value = '';
        if(refillAtInput) refillAtInput.value = '';
        if(times.length){
            let rems = safeStorage('reminders', []);
            times.forEach((t, i) => {
                rems.push({id:Date.now()+i,task:`💊 Take ${name}`,notes:dose||'',time:`${getTodayStr()}T${t}`,priority:'high',repeat:'daily',status:'pending',notified:false,pinned:false,tags:'medicine',preAlarm:0,category:{name:'Health',icon:'💊'}});
            });
            localStorage.setItem('reminders',JSON.stringify(rems));
            loadReminders();
        }
        showToast(times.length > 1 ? `💊 Medicine added — ${times.length} doses/day scheduled!` : '💊 Medicine added!','success')
    }
    function renderMedicineList(){
        const c=document.getElementById('medicineList');if(!c)return;
        const meds=getMeds();const ts=getTodayStr();
        c.innerHTML=meds.map(m=>{
            const times = (m.times && m.times.length ? m.times : [m.time]).filter(Boolean);
            const lowStock = m.quantity != null && m.refillAt != null && m.quantity <= m.refillAt;
            const stockLine = m.quantity != null
                ? `<br><span style="font-size:11px; font-weight:700; color:${lowStock ? '#ff3b30' : '#8e8e93'};">${lowStock ? '⚠️ Low stock: ' : '📦 '}${m.quantity} left</span>`
                : '';
            return `<div class="med-item ${m.takenDate===ts?'med-taken':''}"><div><b style="font-size:13px">💊 ${sanitizeHTML(m.name||'')}</b><br><span style="font-size:11px;color:#8e8e93">${sanitizeHTML(m.dose||'')}${times.length?' · '+times.join(', '):''}·${sanitizeHTML(m.freq||'')}</span>${stockLine}</div><div style="display:flex;gap:8px;align-items:center"><button onclick="toggleMedTaken(${m.id})" style="background:${m.takenDate===ts?'#e5e5ea':'#e5f9e9'};color:${m.takenDate===ts?'#8e8e93':'#34c759'};border:none;border-radius:8px;padding:5px 10px;font-weight:700;cursor:pointer;font-size:12px">${m.takenDate===ts?'Taken ✅':'Take'}</button><button onclick="deleteMed(${m.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`;
        }).join('')||emptyStateHTML('💊', 'No medicines.')
    }
    function toggleMedTaken(id){
        const m=getMeds();const x=m.find(x=>x.id===id);
        if(x){
            const wasTaken = x.takenDate===getTodayStr();
            x.takenDate = wasTaken ? null : getTodayStr();
            // Decrement stock on marking taken, restore it if un-marked (tapped by mistake).
            if (x.quantity != null) {
                x.quantity = Math.max(0, x.quantity + (wasTaken ? 1 : -1));
                if (!wasTaken && x.refillAt != null && x.quantity <= x.refillAt) {
                    showToast(`⚠️ ${x.name}: only ${x.quantity} left — time to refill.`, 'error');
                }
            }
        }
        saveMeds(m);renderMedicineList()
    }
    function deleteMed(id){saveMeds(getMeds().filter(x=>x.id!==id));renderMedicineList()}

    // VEHICLE
    function getVehicles(){return safeStorage('vehicleReminders', [])}
    function saveVehicles(d){localStorage.setItem('vehicleReminders',JSON.stringify(d));syncToCloud()}
    function openVehicleModal(){renderVehicleList();openModal('vehicleModal')}
    function addVehicleReminder(){
        const vehInput = document.getElementById('vehNameInput');
        const reminderInput = document.getElementById('vehReminderInput');
        const dueInput = document.getElementById('vehDueInput');
        const typeInput = document.getElementById('vehTypeInput');
        if(!vehInput || !reminderInput || !dueInput || !typeInput) return showToast('Vehicle form unavailable.', 'error');
        const veh = vehInput.value.trim();
        const reminder = reminderInput.value.trim();
        const due = dueInput.value;
        const type = typeInput.value;
        if(!veh||!due) return showToast('Enter vehicle & due date!','error');
        const data = getVehicles();
        data.unshift({id:Date.now(),veh,reminder,due,type});
        saveVehicles(data);
        let rems = safeStorage('reminders', []);
        rems.push({id:Date.now(),task:`🚗 ${veh}: ${reminder||type}`,notes:'',time:`${due}T09:00`,priority:'high',repeat:'none',status:'pending',notified:false,pinned:false,tags:'vehicle',preAlarm:0,category:{name:'Vehicle',icon:'🚗'}});
        localStorage.setItem('reminders',JSON.stringify(rems));
        loadReminders();
        vehInput.value = '';
        reminderInput.value = '';
        renderVehicleList();
        showToast('Vehicle reminder added!','success')
    }
    function renderVehicleList(){const c=document.getElementById('vehicleReminderList');if(!c)return;const data=getVehicles();const today=getTodayStr();c.innerHTML=data.map(v=>{const dl=Math.ceil((new Date(v.due)-new Date(today))/86400000);const col=dl<0?'#ff3b30':dl<=7?'#ff9500':'#34c759';return`<div class="vehicle-item" style="border-left:3px solid ${col}"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><b style="font-size:13px">${sanitizeHTML(v.type||'')} ${sanitizeHTML(v.veh||'')}</b>${v.reminder?`<br><span style="font-size:12px;color:var(--primary)">${sanitizeHTML(v.reminder)}</span>`:''}<br><span style="font-size:11px;color:#8e8e93">📅 ${v.due}·${dl<0?'⚠️Overdue':dl===0?'🔴Today!':dl+'d'}</span></div><button onclick="deleteVehicle(${v.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`}).join('')||emptyStateHTML('🚗', 'No vehicle reminders.')}
    function deleteVehicle(id){saveVehicles(getVehicles().filter(x=>x.id!==id));renderVehicleList()}

    // SHOPPING
    function getShopData(){return safeStorage('shopData',{"lists":{},"activeList":""})}    function saveShopData(d){localStorage.setItem('shopData',JSON.stringify(d));syncToCloud()}
    function openShoppingModal(){renderShopListSelect();renderShoppingItems();openModal('shoppingModal')}
    function addShopList(){
        const nameInput = document.getElementById('shopNameInput');
        if(!nameInput) return showToast('Shop list form unavailable.', 'error');
        const name = nameInput.value.trim();
        if(!name) return showToast('Enter list name!','error');
        const d = getShopData();
        if(!d.lists[name]) d.lists[name]=[];
        d.activeList=name;
        saveShopData(d);
        nameInput.value='';
        renderShopListSelect();
        renderShoppingItems();
    }
    function renderShopListSelect(){const sel=document.getElementById('shopListSelect');if(!sel)return;const d=getShopData();sel.innerHTML=Object.keys(d.lists).map(l=>`<option value="${sanitizeHTML(l)}" ${l===d.activeList?'selected':''}>${sanitizeHTML(l)} (${d.lists[l].length})</option>`).join('')}
    function addShopItem(){
        const d=getShopData();
        const listSelect = document.getElementById('shopListSelect');
        const list = listSelect?.value||d.activeList;
        if(!list) return showToast('Create a list first!','error');
        const nameInput = document.getElementById('shopItemInput');
        const qtyInput = document.getElementById('shopQtyInput');
        if(!nameInput || !qtyInput) return showToast('Shop item form unavailable.', 'error');
        const name=nameInput.value.trim();
        const qty=qtyInput.value||1;
        if(!name) return showToast('Enter item!','error');
        if(!d.lists[list]) d.lists[list]=[];
        d.lists[list].unshift({id:Date.now(),name,qty:Number(qty),done:false});
        saveShopData(d);
        nameInput.value='';
        qtyInput.value='';
        renderShoppingItems();
    }
    function renderShoppingItems(){const c=document.getElementById('shoppingItems');const te=document.getElementById('shoppingTotal');if(!c)return;const d=getShopData();const ln=document.getElementById('shopListSelect')?.value||d.activeList;if(!ln||!d.lists[ln]){c.innerHTML='<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">Select/create a list.</p>';return}const items=d.lists[ln];const done=items.filter(i=>i.done).length;if(te)te.innerText=`${done}/${items.length} items`;const lnAttr=escInline(ln);c.innerHTML=items.map(i=>`<div class="shop-item ${i.done?'done':''}"><input type="checkbox" ${i.done?'checked':''} onchange="toggleShopItem('${lnAttr}',${i.id})" style="width:18px;height:18px;margin:0;flex-shrink:0"><span style="flex:1;font-size:13px">${sanitizeHTML(i.name||'')}</span><span style="font-size:11px;color:#8e8e93">×${i.qty}</span><button onclick="deleteShopItem('${lnAttr}',${i.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div>`).join('')||emptyStateHTML('📋', 'Empty list.')}
    function toggleShopItem(list,id){const d=getShopData();const item=d.lists[list]?.find(x=>x.id===id);if(item)item.done=!item.done;saveShopData(d);renderShoppingItems()}
    function deleteShopItem(list,id){const d=getShopData();if(d.lists[list])d.lists[list]=d.lists[list].filter(x=>x.id!==id);saveShopData(d);renderShoppingItems()}

    // TRAVEL
    function getTravelData(){return safeStorage('travelData',{"trips":[],"packing":[]})}    function saveTravelData(d){localStorage.setItem('travelData',JSON.stringify(d));syncToCloud()}
    function openTravelModal(){setTravelTab('trips');renderTrips();openModal('travelModal')}
    function setTravelTab(tab){
        document.querySelectorAll('[id^="traveltab-"]').forEach(b=>b.classList.remove('active'));
        const tabBtn = document.getElementById('traveltab-'+tab);
        const tripsEl = document.getElementById('travelTabTrips');
        const packingEl = document.getElementById('travelTabPacking');
        if(tabBtn) tabBtn.classList.add('active');
        if(tripsEl) tripsEl.style.display = tab==='trips'?'block':'none';
        if(packingEl) packingEl.style.display = tab==='packing'?'block':'none';
        if(tab==='packing') renderPackingList();
    }
    function addTrip(){
        const nameInput = document.getElementById('tripNameInput');
        const destInput = document.getElementById('tripDestInput');
        const fromInput = document.getElementById('tripFromInput');
        const toInput = document.getElementById('tripToInput');
        if(!nameInput || !destInput || !fromInput || !toInput) return showToast('Trip form unavailable.', 'error');
        const name=nameInput.value.trim();
        const dest=destInput.value.trim();
        const from=fromInput.value;
        const to=toInput.value;
        if(!name) return showToast('Enter trip name!','error');
        const d=getTravelData();
        d.trips.unshift({id:Date.now(),name,dest,from,to});
        saveTravelData(d);
        renderTrips();
        nameInput.value='';
        destInput.value='';
        showToast('Trip added! ✈️','success')
    }
    function renderTrips(){const c=document.getElementById('tripsList');if(!c)return;const d=getTravelData();c.innerHTML=d.trips.map(t=>{const days=t.from&&t.to?Math.ceil((new Date(t.to)-new Date(t.from))/86400000)+1:null;return`<div class="trip-item"><div><b style="font-size:13px">✈️ ${sanitizeHTML(t.name||'')}</b>${t.dest?`<br><span style="font-size:11px;color:var(--primary)">📍${sanitizeHTML(t.dest)}</span>`:''}${t.from?`<br><span style="font-size:11px;color:#8e8e93">${t.from}→${t.to||'?'}${days?` (${days}d)`:''}</span>`:''}</div><button onclick="deleteTrip(${t.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div>`}).join('')||emptyStateHTML('✈️', 'No trips.')}
    function deleteTrip(id){const d=getTravelData();d.trips=d.trips.filter(x=>x.id!==id);saveTravelData(d);renderTrips()}
    function addPackingItem(){
        const nameInput = document.getElementById('packItemInput');
        const catInput = document.getElementById('packCatInput');
        if(!nameInput || !catInput) return showToast('Packing item form unavailable.', 'error');
        const name=nameInput.value.trim();
        const cat=catInput.value;
        if(!name) return showToast('Enter item!','error');
        const d=getTravelData();
        d.packing.unshift({id:Date.now(),name,cat,packed:false});
        saveTravelData(d);
        renderPackingList();
        nameInput.value='';
    }
    function renderPackingList(){const c=document.getElementById('packingList');if(!c)return;const d=getTravelData();const done=d.packing.filter(x=>x.packed).length;c.innerHTML=`<p style="font-size:12px;color:#8e8e93;margin:0 0 10px">✅ ${done}/${d.packing.length} packed</p>`+d.packing.map(item=>`<div class="packing-item"><input type="checkbox" ${item.packed?'checked':''} onchange="togglePackItem(${item.id})" style="width:18px;height:18px;margin:0;flex-shrink:0"><span style="flex:1;font-size:13px;${item.packed?'text-decoration:line-through;opacity:0.5':''}">${sanitizeHTML(item.name||'')}</span><span style="font-size:10px;color:#8e8e93">${item.cat.split(' ')[0]}</span><button onclick="deletePackItem(${item.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:14px">✖</button></div>`).join('')||emptyStateHTML('📋', 'Empty.')}
    function togglePackItem(id){const d=getTravelData();const i=d.packing.find(x=>x.id===id);if(i)i.packed=!i.packed;saveTravelData(d);renderPackingList()}
    function deletePackItem(id){const d=getTravelData();d.packing=d.packing.filter(x=>x.id!==id);saveTravelData(d);renderPackingList()}

    // ATTENDANCE
    function getAttData(){return safeStorage('attData',{"subjects":[]})}    function saveAttData(d){localStorage.setItem('attData',JSON.stringify(d));syncToCloud()}
    function openAttendanceModal(){renderAttSubjectList();openModal('attendanceModal')}
    function addAttSubject(){
        const nameInput = document.getElementById('attSubjectInput');
        if(!nameInput) return showToast('Attendance form unavailable.', 'error');
        const name = nameInput.value.trim();
        if(!name) return showToast('Enter subject!','error');
        const d=getAttData();
        d.subjects.unshift({id:Date.now(),name,log:{}});
        saveAttData(d);
        renderAttSubjectList();
        nameInput.value='';
        showToast('Subject added!','success')
    }
    function renderAttSubjectList(){const c=document.getElementById('attSubjectList');if(!c)return;const d=getAttData();const ts=getTodayStr();c.innerHTML=d.subjects.map(s=>{const total=Object.keys(s.log).filter(k=>s.log[k]).length;const present=Object.values(s.log).filter(v=>v==='P').length;const pct=total>0?Math.round((present/total)*100):0;const tv=s.log[ts]||'';return`<div style="background:#f2f2f7;border-radius:14px;padding:12px;margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div><b style="font-size:14px">${sanitizeHTML(s.name||'')}</b><br><span style="font-size:11px;color:${pct>=75?'#34c759':'#ff3b30'};font-weight:700">${pct}% (${present}/${total})</span></div><button onclick="deleteAttSubject(${s.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px"><button onclick="markAtt(${s.id},'${ts}','P')" class="att-day ${tv==='P'?'att-present':'att-unmarked'}">✅ P</button><button onclick="markAtt(${s.id},'${ts}','A')" class="att-day ${tv==='A'?'att-absent':'att-unmarked'}">❌ A</button><button onclick="markAtt(${s.id},'${ts}','H')" class="att-day ${tv==='H'?'att-holiday':'att-unmarked'}">🏖️ H</button></div><div class="project-progress-track"><div class="project-progress-fill" style="width:${pct}%;background:${pct>=75?'#34c759':'#ff3b30'}"></div></div></div>`}).join('')||emptyStateHTML('📚', 'No subjects.')}
    function markAtt(subId,dateStr,status){const d=getAttData();const s=d.subjects.find(x=>x.id===subId);if(s)s.log[dateStr]=(s.log[dateStr]===status?'':status);saveAttData(d);renderAttSubjectList()}
    function deleteAttSubject(id){const d=getAttData();d.subjects=d.subjects.filter(x=>x.id!==id);saveAttData(d);renderAttSubjectList()}

    // LIFE EVENTS
    function getLifeEvents(){return safeStorage('lifeEvents', [])}
    function saveLifeEvents(d){localStorage.setItem('lifeEvents',JSON.stringify(d));syncToCloud()}
    function openLifeEventsModal(){renderLifeEvents();openModal('lifeEventsModal')}
    function addLifeEvent(){
        const nameInput = document.getElementById('lifeEventNameInput');
        const dateInput = document.getElementById('lifeEventDateInput');
        const emojiInput = document.getElementById('lifeEventEmojiInput');
        const colorInput = document.getElementById('lifeEventColorInput');
        if(!nameInput || !dateInput || !emojiInput || !colorInput) return showToast('Life event form unavailable.', 'error');
        const name = nameInput.value.trim();
        const date = dateInput.value;
        const emoji = emojiInput.value.trim()||'⭐';
        const color = colorInput.value;
        if(!name||!date) return showToast('Enter name & date!','error');
        const events=getLifeEvents();
        events.push({id:Date.now(),name,date,emoji,color});
        events.sort((a,b)=>b.date.localeCompare(a.date));
        saveLifeEvents(events);
        nameInput.value='';
        emojiInput.value='';
        renderLifeEvents();
        showToast('Life event added! 🌟','success')
    }
    function renderLifeEvents(){const c=document.getElementById('lifeEventsContainer');if(!c)return;const events=getLifeEvents();if(!events.length){c.innerHTML=emptyStateHTML('🌟', 'No events yet. Add your milestones!');return}c.innerHTML=events.map(e=>{const dt=new Date(e.date+'T00:00:00');const da=Math.floor((new Date()-dt)/86400000);const label=da===0?'Today!':da>0?`${da} days ago`:`in ${Math.abs(da)} days`;return`<div class="life-event-item"><div class="life-event-dot" style="background:${e.color}"></div><div style="flex:1"><div style="font-size:15px;font-weight:700">${sanitizeHTML(e.emoji||'')} ${sanitizeHTML(e.name||'')}</div><div style="font-size:11px;color:#8e8e93;margin-top:2px">📅 ${dt.toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}·${label}</div></div><button onclick="deleteLifeEvent(${e.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div>`}).join('')}
    function deleteLifeEvent(id){saveLifeEvents(getLifeEvents().filter(x=>x.id!==id));renderLifeEvents()}

    // SUBSCRIPTIONS
    function getSubs(){return safeStorage('subscriptions', [])}
    function saveSubs(d){localStorage.setItem('subscriptions',JSON.stringify(d));syncToCloud()}
    function openSubModal(){renderSubSummary();renderSubList();openModal('subModal')}
    function addSubscription(){
        const nameInput = document.getElementById('subNameInput');
        const amtInput = document.getElementById('subAmtInput');
        const renewInput = document.getElementById('subRenewInput');
        const freqInput = document.getElementById('subFreqInput');
        if(!nameInput || !amtInput || !renewInput || !freqInput) return showToast('Subscription form unavailable.', 'error');
        const name = nameInput.value.trim();
        const amt = Number(amtInput.value);
        const renew = renewInput.value;
        const freq = freqInput.value;
        if(!name||!amt) return showToast('Enter name & amount!','error');
        const subs = getSubs();
        subs.unshift({id:Date.now(),name,amount:amt,renew,freq});
        saveSubs(subs);
        renderSubSummary();
        renderSubList();
        nameInput.value='';
        amtInput.value='';
        showToast('Subscription added!','success')
    }
    function renderSubSummary(){const el=document.getElementById('subSummary');if(!el)return;const subs=getSubs();const m=subs.reduce((s,x)=>s+(x.freq==='yearly'?x.amount/12:x.freq==='weekly'?x.amount*4.33:x.amount),0);el.innerHTML=`<p style="margin:0;font-size:13px;font-weight:700">Monthly:<span style="color:var(--primary)"> ₹${m.toFixed(0)}</span> &nbsp; Yearly:<span style="color:#ff3b30"> ₹${(m*12).toFixed(0)}</span></p>`}
    function renderSubList(){const c=document.getElementById('subList');if(!c)return;const subs=getSubs();const today=getTodayStr();c.innerHTML=subs.map(s=>{const dl=s.renew?Math.ceil((new Date(s.renew)-new Date(today))/86400000):null;const col=dl!==null&&dl<=3?'#ff3b30':dl!==null&&dl<=7?'#ff9500':'#8e8e93';return`<div class="sub-item"><div><b style="font-size:13px">${sanitizeHTML(s.name||'')}</b><br><span style="font-size:11px;color:${col}">${s.renew?`Renews:${s.renew}${dl!==null?` · ${dl<0?'⚠️Overdue':dl+'d'}`:''}`:'No date'}</span></div><div style="display:flex;align-items:center;gap:8px"><span style="font-weight:700;font-size:13px">₹${s.amount}/${s.freq==='monthly'?'mo':s.freq==='yearly'?'yr':'wk'}</span><button onclick="deleteSub(${s.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`}).join('')||emptyStateHTML('💳', 'No subscriptions.')}
    function deleteSub(id){saveSubs(getSubs().filter(x=>x.id!==id));renderSubSummary();renderSubList()}

    // SECRET SPACE
    function openSecretModal(){
        const lockScreen = document.getElementById('secretLockScreen');
        const unlocked = document.getElementById('secretUnlocked');
        const pinInput = document.getElementById('secretPinInput');
        if(lockScreen) lockScreen.style.display='block';
        if(unlocked) unlocked.style.display='none';
        if(pinInput) pinInput.value='';
        openModal('secretModal');
    }
    async function unlockSecret(){
        const pinInput = document.getElementById('secretPinInput');
        const noteInput = document.getElementById('secretNoteInput');
        if(!pinInput) return showToast('Secret unlock unavailable.', 'error');
        const entered=pinInput.value;
        const stored=localStorage.getItem('secretPinHash');
        if(!stored){showToast('Set a PIN first!','error');return}
        const hash=await sha256(entered);
        if(hash===stored){
            const lockScreen = document.getElementById('secretLockScreen');
            const unlocked = document.getElementById('secretUnlocked');
            if(lockScreen) lockScreen.style.display='none';
            if(unlocked) unlocked.style.display='block';
            if(noteInput) noteInput.value=localStorage.getItem('secretNote')||'';
        }else{
            showToast('Wrong PIN!','error');
            pinInput.value='';
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
    function saveSecretNote(){
        const noteInput = document.getElementById('secretNoteInput');
        if(!noteInput) return showToast('Secret note unavailable.', 'error');
        localStorage.setItem('secretNote',noteInput.value);
        showToast('Saved 🔒','success');
        lockSecret();
    }
    function lockSecret(){
        const lockScreen = document.getElementById('secretLockScreen');
        const unlocked = document.getElementById('secretUnlocked');
        const noteInput = document.getElementById('secretNoteInput');
        const pinInput = document.getElementById('secretPinInput');
        if(lockScreen) lockScreen.style.display='block';
        if(unlocked) unlocked.style.display='none';
        if(noteInput) noteInput.value='';
        if(pinInput) pinInput.value='';
    }

