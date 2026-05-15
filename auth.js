// --- Authentication ---
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user; localStorage.setItem("loggedIn", "true"); document.getElementById('authScreen').style.display = 'none'; document.getElementById('mainApp').style.display = 'flex'; switchPage('home'); if(!appPinCode) showToast("Logged in! Ready.", "success"); startCloudSync();
    } else { currentUser = null; localStorage.setItem("loggedIn", "false"); document.getElementById('authScreen').style.display = 'block'; document.getElementById('mainApp').style.display = 'none'; }
});
function loginWithGoogle() { const provider = new firebase.auth.GoogleAuthProvider(); auth.signInWithPopup(provider).then((result) => { db.collection("users").doc(result.user.uid).set({ userName: result.user.displayName, userLevel: 1, habitXP_tasks: 0 }, { merge: true }); }).catch(err => showToast(err.message, "error"));
}
function registerUser() { const email = document.getElementById("emailInput").value; const password = document.getElementById("passwordInput").value;
    if(!email || password.length < 6) return showToast("Enter valid email/password", "error");
    auth.createUserWithEmailAndPassword(email, password).then((u) => { db.collection("users").doc(u.user.uid).set({ reminders: [], habits: [], userLevel: 1, habitXP_tasks: 0, userName: "User", alarmSound: userAlarmSound, voiceAlarm: false, dailyTaskGoal: 5 }); }).catch((e) => showToast(e.message, "error"));
}
function loginUser() { const email = document.getElementById("emailInput").value; const password = document.getElementById("passwordInput").value;
    if(!email || !password) return showToast("Enter email and password", "error"); auth.signInWithEmailAndPassword(email, password).catch((e) => showToast(e.message, "error"));
}
function resetPassword() { const email = document.getElementById("emailInput").value; if(!email) return showToast("Enter your email address first!", "error");
    auth.sendPasswordResetEmail(email).then(() => { showToast("Password reset link sent!", "success"); }).catch((e) => showToast(e.message, "error"));
}
function logoutUser() { auth.signOut().then(() => { showToast("Logged out.", "info"); localStorage.clear(); location.reload(); });
}

// --- Cloud Syncing ---
function startCloudSync() {
    if(!currentUser) return;
    db.collection("users").doc(currentUser.uid).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            if(!doc.metadata.hasPendingWrites) {
                localStorage.setItem("reminders", JSON.stringify(data.reminders || [])); localStorage.setItem("habits", JSON.stringify(data.habits || [])); localStorage.setItem("userLevel", data.userLevel || 1); localStorage.setItem("habitXP_tasks", data.habitXP_tasks || 0); localStorage.setItem("dailyTaskGoal", data.dailyTaskGoal || 5); userName = data.userName || "User"; userAlarmSound = data.alarmSound || "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"; voiceAlarmEnabled = data.voiceAlarm || false;
                waterCount = data.waterDate === getTodayStr() ? (data.waterCount || 0) : 0; 
                document.getElementById("waterIntake").innerText = waterCount;
                if(data.theme) setThemeColor(data.theme.p, data.theme.ph, data.theme.b1, data.theme.b2, false);
                if(data.customTemplates) localStorage.setItem("customTemplates", JSON.stringify(data.customTemplates));
                if(data.isProUser) { isProUser = true; localStorage.setItem("isPro", "true"); document.getElementById("proBadgeDisplay").style.display="inline-flex"; }
                document.getElementById("displayUserName").innerText = userName;
                document.getElementById("profileNameInput").value = userName; document.getElementById("dailyGoalInput").value = data.dailyTaskGoal || 5; document.getElementById("alarmSoundInput").value = userAlarmSound; document.getElementById("voiceAlarmToggle").checked = voiceAlarmEnabled; userLevel = data.userLevel || 1; 
                renderCustomTemplates();
                loadReminders(); loadHabits(); document.getElementById("syncStatusText").innerText = "☁️ Synced";
            }
        }
    });
}

function syncToCloud() {
    if(!currentUser) return; if(!navigator.onLine) return;
    document.getElementById("syncStatusText").innerText = "☁️ Saving...";
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        const dataToSave = {
            reminders: JSON.parse(localStorage.getItem("reminders")) || [], habits: JSON.parse(localStorage.getItem("habits")) || [], userLevel: parseInt(localStorage.getItem("userLevel")) || 1, habitXP_tasks: parseInt(localStorage.getItem("habitXP_tasks")) || 0, userName: userName, alarmSound: userAlarmSound, voiceAlarm: voiceAlarmEnabled, theme: JSON.parse(localStorage.getItem("appTheme")) || null, customTemplates: JSON.parse(localStorage.getItem("customTemplates")) || [], waterCount: waterCount, waterDate: getTodayStr(), isProUser: isProUser, dailyTaskGoal: parseInt(localStorage.getItem("dailyTaskGoal")) || 5
        };
        db.collection("users").doc(currentUser.uid).set(dataToSave, {merge: true}).then(() => { document.getElementById("syncStatusText").innerText = "☁️ Synced"; }).catch((e) => { document.getElementById("syncStatusText").innerText = "⚠️ Sync Error"; });
    }, 2000);
}
