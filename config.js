// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(console.error);
}

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDc-k1JnOySVExS4QbDsbkh7Ro9pvNydIY", 
  authDomain: "reminder-76588.firebaseapp.com", 
  projectId: "reminder-76588", 
  storageBucket: "reminder-76588.firebasestorage.app", 
  messagingSenderId: "813515230126", 
  appId: "1:813515230126:web:dde11175645257dc44d63f"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(); 
const db = firebase.firestore();
db.enablePersistence().catch(err => { console.log("Offline mode error:", err.code); });

// --- Global Variables ---
let currentUser = null; let timerInterval; let currentTab = 'all';
let editId = null; let userLevel = 1; let selectedDateFilter = null; let currentImageBase64 = null; let isDoc = false;
let userName = "User"; let userAlarmSound = "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"; let voiceAlarmEnabled = false; let pomoInterval; let pomoTime = 1500;
let chartInstance = null; let focusAudio = new Audio(); let currentCalMonth = new Date().getMonth(); let currentCalYear = new Date().getFullYear();
let deletedTaskTemp = null; let deleteTimeout = null; let wakeLock = null; let activeTagFilter = ""; let waterCount = 0;
let mediaRecorder; let audioChunks = []; let voiceMemoBase64 = null; let isProUser = false; let appPinCode = localStorage.getItem("appPin") || null;
let currentEnteredPin = ""; let isMusicPlaying = false; let syncTimeout = null;
