// Personal finance: expenses, income, budgets, bills, EMIs, investments.
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".
    // FINANCE
    function getFinData(){return safeStorage('finData',{"expenses":[],"income":[],"budgets":[],"bills":[],"emis":[],"investments":[]})}    function saveFinData(d){localStorage.setItem('finData',JSON.stringify(d));syncToCloud()}
    function setFinTab(tab){document.querySelectorAll('.fin-tab-btn').forEach(b=>b.classList.remove('active'));document.querySelectorAll('[id^="finTab-"]').forEach(el=>el.style.display='none');document.querySelectorAll('.fin-tab-btn').forEach(btn=>{const oc=btn.getAttribute('onclick')||'';if(oc.includes("'"+tab+"'")||oc.includes('"'+tab+'"'))btn.classList.add('active')});const el=document.getElementById('finTab-'+tab);if(el)el.style.display='block';if(tab==='expenses')renderExpenses();if(tab==='income')renderIncome();if(tab==='budget')renderBudgets();if(tab==='bills')renderBills();if(tab==='emi')renderEMIs();if(tab==='invest')renderInvestments();if(tab==='khata'&&typeof renderKhataPartyList==='function')renderKhataPartyList();if(tab==='charts'&&typeof renderFinanceCharts==='function')setTimeout(renderFinanceCharts,150)}
    // Tab-highlight logic above uses each button's own onclick text (matches by tab
    // name) instead of a single querySelector — a fix that used to live as a separate
    // `window.setFinTab = function(tab){...}` override 900+ lines away in
    // js/07-automation/03-engagement-reports.js. That override always ran last (script
    // load order) so it was the version actually in effect — but it had also silently
    // dropped the 'charts' tab's setTimeout(renderFinanceCharts,150) call, so the
    // Finance > Charts tab opened to a blank canvas. Merged into one real definition
    // here, with the Charts rendering restored and the Khata case it had added kept.
    function renderFinanceDashboard(){const d=getFinData();const now=new Date();const ms=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;const mExp=d.expenses.filter(e=>e.date&&e.date.startsWith(ms)).reduce((s,e)=>s+safeNum(e.amount),0);const mInc=d.income.filter(e=>e.date&&e.date.startsWith(ms)).reduce((s,e)=>s+safeNum(e.amount),0);const emi=d.emis.reduce((s,e)=>s+safeNum(e.amount),0);const tb=d.budgets.reduce((s,b)=>s+safeNum(b.limit),0);const fi=document.getElementById('finIncome');const fe=document.getElementById('finExpense');const fs=document.getElementById('finSavings');const fb=document.getElementById('finBudgetLeft');if(fi)fi.innerText='₹'+mInc.toLocaleString('en-IN');if(fe)fe.innerText='₹'+mExp.toLocaleString('en-IN');if(fs)fs.innerText='₹'+Math.max(0,mInc-mExp-emi).toLocaleString('en-IN');if(fb)fb.innerText='₹'+Math.max(0,tb-mExp).toLocaleString('en-IN');renderExpenses();const summary=renderMonthlyFinanceSummary();const el=document.getElementById('finMonthSummary');if(el)el.innerHTML='Savings rate: <b style="color:'+(summary.savingRate>=20?'#34c759':'#ff9500')+'">'+summary.savingRate+'%</b> this month';}
    function addExpense(type){const iE=type==='expense';const name=document.getElementById(iE?'expNameInput':'incNameInput').value.trim();const amt=safeNum(document.getElementById(iE?'expAmtInput':'incAmtInput').value);const cat=document.getElementById(iE?'expCatInput':'incCatInput').value;const date=document.getElementById(iE?'expDateInput':'incDateInput').value||getTodayStr();const note=iE?(document.getElementById('expNoteInput')?.value.trim()||''):'';if(!name||!amt||amt<0)return showToast('Enter valid name & amount!','error');const d=getFinData();d[iE?'expenses':'income'].unshift({id:Date.now(),name:sanitizeHTML(name),amount:amt,category:cat,date,type,note:sanitizeHTML(note)});saveFinData(d);document.getElementById(iE?'expNameInput':'incNameInput').value='';document.getElementById(iE?'expAmtInput':'incAmtInput').value='';if(iE&&document.getElementById('expNoteInput'))document.getElementById('expNoteInput').value='';renderFinanceDashboard();if(!iE)renderIncome();hapticFeedback('success');showToast(iE?'Expense added!':'Income added!','success')}
    function renderExpenses(){const c=document.getElementById('expensesList');if(!c)return;const d=getFinData();c.innerHTML=d.expenses.slice(0,20).map(e=>`<div class="expense-item"><div><b style="font-size:13px">${sanitizeHTML(e.name||'')}</b>${e.note?`<br><span style="font-size:11px;color:#8e8e93;font-style:italic">${sanitizeHTML(e.note)}</span>`:''}<br><span style="font-size:11px;color:#8e8e93">${sanitizeHTML(e.category||'')}·${e.date}</span></div><div style="display:flex;align-items:center;gap:8px"><span style="font-weight:700;color:#ff3b30">₹${Number(e.amount).toLocaleString('en-IN')}</span><button onclick="deleteFinEntry('expenses',${e.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:16px">✖</button></div></div>`).join('')||emptyStateHTML('💸', 'No expenses yet.')}
    function renderIncome(){const c=document.getElementById('incomeList');if(!c)return;const d=getFinData();c.innerHTML=d.income.slice(0,20).map(e=>`<div class="expense-item"><div><b style="font-size:13px">${sanitizeHTML(e.name||'')}</b><br><span style="font-size:11px;color:#8e8e93">${sanitizeHTML(e.category||'')}·${e.date}</span></div><div style="display:flex;align-items:center;gap:8px"><span style="font-weight:700;color:#34c759">₹${Number(e.amount).toLocaleString('en-IN')}</span><button onclick="deleteFinEntry('income',${e.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:16px">✖</button></div></div>`).join('')||emptyStateHTML('💰', 'No income.')}
    function addBudget(){const cat=document.getElementById('budgetCatInput').value.trim();const limit=Number(document.getElementById('budgetAmtInput').value);if(!cat||!limit)return showToast('Enter category & limit!','error');const d=getFinData();d.budgets=d.budgets.filter(b=>b.cat!==cat);d.budgets.push({cat,limit});saveFinData(d);renderBudgets();document.getElementById('budgetCatInput').value='';document.getElementById('budgetAmtInput').value='';showToast('Budget set!','success')}
    function renderBudgets(){const c=document.getElementById('budgetList');if(!c)return;const d=getFinData();const now=new Date();const ms=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;const bc={};d.expenses.filter(e=>e.date&&e.date.startsWith(ms)).forEach(e=>{bc[e.category]=(bc[e.category]||0)+Number(e.amount)});c.innerHTML=d.budgets.map(b=>{const sp=bc[b.cat]||0;const pct=Math.min(100,Math.round((sp/b.limit)*100));const col=pct>=90?'#ff3b30':pct>=70?'#ff9500':'#34c759';return`<div style="background:#f2f2f7;border-radius:12px;padding:12px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;margin-bottom:6px"><span>${sanitizeHTML(b.cat||'')}</span><span style="color:${col}">₹${sp.toLocaleString('en-IN')}/₹${Number(b.limit).toLocaleString('en-IN')} (${pct}%)</span></div><div class="project-progress-track"><div class="project-progress-fill" style="width:${pct}%;background:${col}"></div></div></div>`}).join('')||emptyStateHTML('📊', 'No budgets set.')}
    function addBill(){const name=document.getElementById('billNameInput').value.trim();const amt=Number(document.getElementById('billAmtInput').value);const due=document.getElementById('billDueInput').value;const type=document.getElementById('billTypeInput').value;if(!name||!due)return showToast('Enter name & due date!','error');const d=getFinData();const billId=Date.now();d.bills.unshift({id:billId,name,amount:amt,due,type,paid:false});saveFinData(d);
        // BILL CALENDAR: bills previously generated no reminder at all (unlike
        // Warranty, which already auto-creates one) — zero calendar visibility.
        // Now shows up on the existing home calendar like everything else.
        let reminders=safeStorage('reminders',[]);
        reminders.push({id:billId+1,task:`${type} Due: ${name}`,notes:amt?`Amount: ₹${amt.toLocaleString('en-IN')}`:'',time:due+'T09:00',priority:'medium',repeat:'none',status:'pending',notified:false,pinned:false,tags:'bill',preAlarm:0,category:{name:'Bill',icon:'🧾'}});
        localStorage.setItem('reminders',JSON.stringify(reminders));loadReminders();
        renderBills();document.getElementById('billNameInput').value='';document.getElementById('billAmtInput').value='';showToast('Bill added — reminder set! 🧾','success')}
    function renderBills(){const c=document.getElementById('billsList');if(!c)return;const d=getFinData();const today=getTodayStr();c.innerHTML=d.bills.map(b=>{const dl=Math.ceil((new Date(b.due)-new Date(today))/86400000);const urg=dl<0?'bill-urgent':dl<=3?'bill-upcoming':'';return`<div class="bill-item ${urg}"><div><b style="font-size:13px">${sanitizeHTML(b.type||'')} ${sanitizeHTML(b.name||'')}</b><br><span style="font-size:11px;color:#8e8e93">Due:${b.due}·${dl<0?'⚠️Overdue':dl===0?'🔴Today!':dl+'d'}</span></div><div style="display:flex;align-items:center;gap:8px">${b.amount?`<span style="font-weight:700">₹${Number(b.amount).toLocaleString('en-IN')}</span>`:''}<button onclick="toggleBillPaid(${b.id})" style="background:${b.paid?'#e5e5ea':'#e5f9e9'};color:${b.paid?'#8e8e93':'#34c759'};border:none;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer">${b.paid?'Paid ✅':'Pay'}</button><button onclick="deleteFinEntry('bills',${b.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`}).join('')||emptyStateHTML('🧾', 'No bills.')}
    function toggleBillPaid(id){const d=getFinData();const b=d.bills.find(x=>x.id===id);if(b)b.paid=!b.paid;saveFinData(d);renderBills()}
    function addEMI(){const name=document.getElementById('emiNameInput').value.trim();const amt=Number(document.getElementById('emiAmtInput').value);const due=document.getElementById('emiDueInput').value;const months=Number(document.getElementById('emiMonthsInput').value);if(!name||!amt)return showToast('Enter name & EMI!','error');const d=getFinData();d.emis.unshift({id:Date.now(),name,amount:amt,due:due?due.slice(8,10):'1',monthsLeft:months});saveFinData(d);renderEMIs();document.getElementById('emiNameInput').value='';document.getElementById('emiAmtInput').value='';showToast('EMI added!','success')}
    function renderEMIs(){const c=document.getElementById('emiList');if(!c)return;const d=getFinData();const total=d.emis.reduce((s,e)=>s+Number(e.amount),0);c.innerHTML=(total?`<div style="background:#ffe5e5;border-radius:12px;padding:10px;margin-bottom:10px;text-align:center"><b style="color:#ff3b30">Total EMI/month: ₹${total.toLocaleString('en-IN')}</b></div>`:'')+d.emis.map(e=>`<div class="bill-item"><div><b style="font-size:13px">${sanitizeHTML(e.name||'')}</b><br><span style="font-size:11px;color:#8e8e93">Day:${e.due}·${e.monthsLeft||'?'} mo left</span></div><div style="display:flex;align-items:center;gap:8px"><span style="font-weight:700;color:#ff3b30">₹${Number(e.amount).toLocaleString('en-IN')}</span><button onclick="deleteFinEntry('emis',${e.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`).join('')||emptyStateHTML('🏦', 'No EMIs.')}
    function addInvestment(){const name=document.getElementById('invNameInput').value.trim();const amt=Number(document.getElementById('invAmtInput').value);const type=document.getElementById('invTypeInput').value;const ret=Number(document.getElementById('invReturnInput').value);if(!name||!amt)return showToast('Enter name & amount!','error');const d=getFinData();const isSip=document.getElementById('invIsSipInput')?.checked;const sipDay=Math.min(28,Math.max(1,Number(document.getElementById('sipDayInput')?.value)||5));const invId=Date.now();d.investments.unshift({id:invId,name,amount:amt,type,returnPct:ret,isSip,sipDay:isSip?sipDay:null});saveFinData(d);
        if(isSip){
            // Next occurrence: this month on sipDay if that hasn't passed yet, else next month.
            const now=new Date();let next=new Date(now.getFullYear(),now.getMonth(),sipDay);
            if(next<=now) next=new Date(now.getFullYear(),now.getMonth()+1,sipDay);
            let reminders=safeStorage('reminders',[]);
            reminders.push({id:invId+1,task:`📅 SIP: ${name}`,notes:`₹${amt.toLocaleString('en-IN')} · ${type}`,time:formatDateLocal(next)+'T09:00',priority:'high',repeat:'monthly',status:'pending',notified:false,pinned:false,tags:'sip',preAlarm:0,category:{name:'Investment',icon:'📈'}});
            localStorage.setItem('reminders',JSON.stringify(reminders));loadReminders();
        }
        renderInvestments();document.getElementById('invNameInput').value='';document.getElementById('invAmtInput').value='';showToast(isSip?'SIP added — monthly reminder set! 📅':'Investment added!','success')}
    function renderInvestments(){const c=document.getElementById('investList');if(!c)return;const d=getFinData();const total=d.investments.reduce((s,e)=>s+Number(e.amount),0);c.innerHTML=(total?`<div style="background:#e5f9e9;border-radius:12px;padding:10px;margin-bottom:10px;text-align:center"><b style="color:#34c759">Total: ₹${total.toLocaleString('en-IN')}</b></div>`:'')+d.investments.map(e=>`<div class="expense-item"><div><b style="font-size:13px">${sanitizeHTML(e.type||'')} ${sanitizeHTML(e.name||'')}</b>${e.returnPct?`<br><span style="font-size:11px;color:#34c759">Return:${e.returnPct}%</span>`:''}</div><div style="display:flex;align-items:center;gap:8px"><span style="font-weight:700;color:#34c759">₹${Number(e.amount).toLocaleString('en-IN')}</span><button onclick="deleteFinEntry('investments',${e.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`).join('')||emptyStateHTML('📈', 'No investments.')}
    function deleteFinEntry(col,id){const d=getFinData();d[col]=d[col].filter(e=>e.id!==id);saveFinData(d);renderFinanceDashboard()}
    let currentTaxRegime = 'new';
    function setTaxRegime(regime) {
        currentTaxRegime = regime;
        document.getElementById('regime-new').classList.toggle('active', regime==='new');
        document.getElementById('regime-old').classList.toggle('active', regime==='old');
        const label = document.getElementById('taxDeductionLabel');
        if(label) label.innerText = regime==='old' ? 'Deductions u/s 80C,80D,HRA etc. (Rs)' : 'Deductions (limited use in New Regime) (Rs)';
        const result = document.getElementById('taxResult');
        if(result) result.innerHTML = '';
    }

    function calcNewRegimeTax(taxable) {
        let tax = 0;
        if(taxable > 300000 && taxable <= 600000) tax = (taxable-300000)*0.05;
        else if(taxable > 600000 && taxable <= 900000) tax = 15000 + (taxable-600000)*0.10;
        else if(taxable > 900000 && taxable <= 1200000) tax = 45000 + (taxable-900000)*0.15;
        else if(taxable > 1200000 && taxable <= 1500000) tax = 90000 + (taxable-1200000)*0.20;
        else if(taxable > 1500000) tax = 150000 + (taxable-1500000)*0.30;
        return tax;
    }

    function calcOldRegimeTax(taxable) {
        let tax = 0;
        if(taxable > 250000 && taxable <= 500000) tax = (taxable-250000)*0.05;
        else if(taxable > 500000 && taxable <= 1000000) tax = 12500 + (taxable-500000)*0.20;
        else if(taxable > 1000000) tax = 112500 + (taxable-1000000)*0.30;
        return tax;
    }

    function calculateTax(){
        const income=Number(document.getElementById('taxIncomeInput').value);
        const ded=Number(document.getElementById('taxDeductionInput').value)||0;
        if(!income) return showToast('Enter income!','error');

        const stdDeduction = 50000;
        let taxable, tax;
        if(currentTaxRegime === 'old') {
            taxable = Math.max(0, income - stdDeduction - ded);
            tax = calcOldRegimeTax(taxable);
        } else {
            taxable = Math.max(0, income - stdDeduction);
            tax = calcNewRegimeTax(taxable);
        }
        const cess = tax * 0.04;
        const total = tax + cess;

        // Compute the other regime too for comparison
        const otherTaxable = currentTaxRegime === 'old' ? Math.max(0, income - stdDeduction) : Math.max(0, income - stdDeduction - ded);
        const otherTax = currentTaxRegime === 'old' ? calcNewRegimeTax(otherTaxable) : calcOldRegimeTax(otherTaxable);
        const otherTotal = otherTax * 1.04;
        const betterRegime = total <= otherTotal ? currentTaxRegime : (currentTaxRegime === 'old' ? 'new' : 'old');
        const savings = Math.abs(total - otherTotal);

        const el=document.getElementById('taxResult');
        if(el) el.innerHTML=`<div style="background:#fff;border-radius:12px;padding:12px;margin-top:8px;text-align:left;">
            <p style="margin:3px 0;font-size:12px">Taxable Income: Rs ${taxable.toLocaleString('en-IN')}</p>
            <p style="margin:3px 0;font-size:12px">Income Tax: Rs ${Math.round(tax).toLocaleString('en-IN')}</p>
            <p style="margin:3px 0;font-size:12px">Health & Education Cess (4%): Rs ${Math.round(cess).toLocaleString('en-IN')}</p>
            <p style="margin:6px 0 0;font-size:14px;font-weight:800;color:#ff3b30">Total Tax (${currentTaxRegime==='old'?'Old':'New'} Regime): Rs ${Math.round(total).toLocaleString('en-IN')}</p>
            <p style="margin:8px 0 0;font-size:11px;color:#34c759;font-weight:700;">${betterRegime===currentTaxRegime ? 'This regime saves you Rs '+Math.round(savings).toLocaleString('en-IN')+' vs the other!' : 'Tip: '+(betterRegime==='old'?'Old':'New')+' Regime would save Rs '+Math.round(savings).toLocaleString('en-IN')+' more'}</p>
            <p style="margin:6px 0 0;font-size:10px;color:#8e8e93">*Estimate for FY2024-25, salaried individual</p>
        </div>`;
        hapticFeedback('success');
    }

    // TAX DUE REMINDERS: the standard Indian advance-tax installment dates
    // (15th of Jun/Sep/Dec/Mar, per the Income Tax Department's own schedule)
    // plus the typical ITR filing deadline (Jul 31) — one tap instead of
    // manually adding each date as a bill.
    function addTaxDeadlineReminders() {
        const now = new Date();
        // Use the fiscal year deadlines that are still upcoming from today;
        // if we're past March, roll forward to next fiscal year's June date.
        const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        const deadlines = [
            { label: 'Advance Tax (15%) - Q1', date: `${fy}-06-15` },
            { label: 'Advance Tax (45%) - Q2', date: `${fy}-09-15` },
            { label: 'Advance Tax (75%) - Q3', date: `${fy}-12-15` },
            { label: 'Advance Tax (100%) - Q4', date: `${fy+1}-03-15` },
            { label: 'ITR Filing Deadline', date: `${fy+1}-07-31` },
        ].filter(d => new Date(d.date + 'T23:59:59') > now);

        if (!deadlines.length) return showToast('No upcoming tax deadlines this fiscal year.', 'error');

        const d = getFinData();
        let reminders = safeStorage('reminders', []);
        deadlines.forEach((dl, i) => {
            d.bills.unshift({ id: Date.now() + i, name: dl.label, amount: 0, due: dl.date, type: '🧾 Tax', paid: false });
            reminders.push({ id: Date.now() + i + 100, task: '🧾 Tax Due: ' + dl.label, notes: 'Check the latest amount with your CA/portal before paying.', time: dl.date + 'T09:00', priority: 'high', repeat: 'none', status: 'pending', notified: false, pinned: false, tags: 'tax', preAlarm: 0, category: { name: 'Tax', icon: '🧾' } });
        });
        saveFinData(d);
        localStorage.setItem('reminders', JSON.stringify(reminders));
        loadReminders();
        renderBills();
        hapticFeedback('success');
        showToast(`${deadlines.length} tax deadline reminder(s) added! 🧾`, 'success');
    }
