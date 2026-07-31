// Habits: create/update/delete, streaks, check-in, rendering.
// Split from the original monolithic js/ files for maintainability — see CHANGELOG.md § "Project split".
    // --- Habits Core ---
    function addHabit() { 
        const raw = document.getElementById("habitInput").value.trim(); 
        if(!raw) return showToast("Enter habit name.", "error");
        const name = raw.slice(0, 80);
        const habits = safeStorage("habits", []);
        if (habits.some(h => h.name.toLowerCase() === name.toLowerCase())) return showToast('Habit already exists!', 'error');
        habits.push({ id: Date.now(), name, streak: 0, maxStreak: 0, lastCheckIn: null, history: [] }); 
        localStorage.setItem("habits", JSON.stringify(habits));
        document.getElementById("habitInput").value = "";
        showToast("Habit added! 🔥", "success"); 
        loadHabits(); 
        renderGettingStartedCard();
        syncToCloud(); 
        hapticFeedback('success');
    }
    
    function checkInHabit(id) {
        let habits = safeStorage("habits", []); 
        const todayStr = getTodayStr(); 
        const yesterdayStr = getYesterdayStr(); 
        let checkedIn = false;
        
        habits = habits.map(habit => {
            if (habit.id === id) {
                if (habit.lastCheckIn === todayStr) return habit;
                if (habit.lastCheckIn === yesterdayStr) { 
                    habit.streak += 1; 
                } else { 
                    habit.streak = 1; 
                }
                if (habit.streak > habit.maxStreak) habit.maxStreak = habit.streak;
                
                habit.lastCheckIn = todayStr; 
                checkedIn = true; 
                if(!habit.history) habit.history = []; 
                if(!habit.history.includes(todayStr)) habit.history.push(todayStr);
                
                showToast(`🔥 Streak: ${habit.streak}!`, "success");
            } 
            return habit;
        });
        
        if(checkedIn) { 
            localStorage.setItem("habits", JSON.stringify(habits)); 
            loadHabits(); 
            let completed = parseInt(localStorage.getItem("habitXP_tasks") || "0"); 
            localStorage.setItem("habitXP_tasks", completed + 1); 
            updateAnalyticsAndGamification(); 
            syncToCloud(); 
        }
    }

    function deleteHabit(id) { 
        let habits = safeStorage("habits", []); 
        localStorage.setItem("habits", JSON.stringify(habits.filter(h => h.id !== id))); 
        showToast("Deleted.", "error"); 
        loadHabits(); 
        syncToCloud(); 
    }

    function loadHabits() {
        const habitList = document.getElementById("habitList");
        habitList.innerHTML = ""; 
        const habits = safeStorage("habits", []); 
        const todayStr = getTodayStr();
        
        habits.forEach(habit => {
            const isCheckedInToday = habit.lastCheckIn === todayStr; 
            const li = document.createElement("li"); 
            li.className = "habit-item";
            li.style.background = "#fff"; 
            li.style.padding = "15px"; 
            li.style.borderRadius = "16px"; 
            li.style.marginBottom = "10px"; 
            li.style.border = "1px solid #f2f2f7";
            
            li.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <div>
                    <h4 style="margin:0 0 5px 0; font-size:15px; color:#1c1c1e;">${sanitizeHTML(habit.name||'')}</h4>
                    <span style="background:#e5f1ff; color:#007aff; font-size:11px; padding:4px 8px; border-radius:8px; font-weight:700;">🔥 ${habit.streak}</span>
                </div>
                <div style="display:flex; gap:8px;">
                    <button style="background:${isCheckedInToday?'#e5e5ea':'#34c759'}; color:${isCheckedInToday?'#8e8e93':'#fff'}; border:none; border-radius:10px; padding:8px 12px; font-weight:700; font-size:12px; cursor:pointer;" onclick="checkInHabit(${habit.id})" ${isCheckedInToday?"disabled":""}>${isCheckedInToday ? "Done ✅" : "Check-in"}</button>
                    <button style="background:#e5f1ff; color:var(--primary); border:none; border-radius:10px; padding:8px 10px; cursor:pointer;" onclick="openHabitDetail(${habit.id})" title="Habit Details">📊</button>
                    <button style="background:#ffe5e5; color:#ff3b30; border:none; border-radius:10px; padding:8px 12px; cursor:pointer;" onclick="deleteHabit(${habit.id})">🗑️</button>
                </div>
            </div>`;
            habitList.appendChild(li);
        }); 
        updateMiniDashboard();
    }

