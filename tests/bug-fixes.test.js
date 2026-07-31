"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const vm = require("node:vm");
const { extractFunction } = require("./extract-fn");

function loadFunctionsInSandbox({ filePath, names, initialLocalStorage = {}, extraContext = {}, preamble = "" }) {
  const store = Object.assign({}, initialLocalStorage || {});
  const localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };

  const elements = {};
  const document = {
    getElementById(id) {
      if (!elements[id]) {
        elements[id] = { innerText: "", style: {}, classList: { add() {}, remove() {}, toggle() {} } };
      }
      return elements[id];
    },
    querySelectorAll() { return []; },
    body: { classList: { add() {}, remove() {}, toggle() {} } },
  };

  const safeStorage = function(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      localStorage.removeItem(key);
      return fallback;
    }
  };

  const context = Object.assign({
    localStorage,
    document,
    console,
    JSON,
    Array,
    Object,
    Math,
    Date,
    Number,
    String,
    Boolean,
    parseInt,
    isNaN,
    safeStorage,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  }, extraContext);

  vm.createContext(context);
  if (preamble) vm.runInContext(preamble, context);
  for (const name of names) {
    const source = extractFunction(filePath, name);
    vm.runInContext(source, context);
  }

  return { context, store, elements };
}

test("updateMiniDashboard calculates completion stats without throwing", () => {
  const { context, elements } = loadFunctionsInSandbox({
    filePath: path.join(__dirname, "..", "js", "02-tasks", "01-reminders-utils.js"),
    names: ["getTodayStr", "updateMiniDashboard"],
    initialLocalStorage: {
      reminders: JSON.stringify([
        { id: 1, status: "completed", time: "2026-01-01T09:00", archived: false },
        { id: 2, status: "pending", time: "2026-01-02T09:00", archived: false },
      ]),
      habits: JSON.stringify([{ id: 1, name: "Read", streak: 3, lastCheckIn: null }]),
    },
  });

  assert.doesNotThrow(() => context.updateMiniDashboard());
  assert.strictEqual(String(elements.widgetTasksToday.innerText), "1");
  assert.strictEqual(String(elements.widgetDoneCount.innerText), "1");
  assert.strictEqual(String(elements.widgetCompletionRate.innerText), "50% completion");
  assert.strictEqual(String(elements.widgetStreakCount.innerText), "3🔥");
});

// Regression test for a real bug: r.preNotified was previously set only on the
// in-memory array returned by safeStorage() and never written back to
// localStorage, so the exact same pre-alarm notification re-fired every 60
// seconds for the whole pre-alarm window instead of once. See CHANGELOG.md.
test("checkPreAlarmNotifications persists preNotified so it does not re-fire", () => {
  const now = new Date("2026-03-01T09:50:00");
  const taskTime = "2026-03-01T10:00:00"; // 10 minutes from `now`
  const pushed = [];

  const { context, store } = loadFunctionsInSandbox({
    filePath: path.join(__dirname, "..", "js", "07-automation", "03-engagement-reports.js"),
    names: ["checkPreAlarmNotifications"],
    initialLocalStorage: {
      reminders: JSON.stringify([
        { id: 1, task: "Standup", time: taskTime, preAlarm: 15, status: "pending", archived: false },
      ]),
    },
    extraContext: {
      Notification: { permission: "granted" },
      showPushNotification: (title, body) => { pushed.push({ title, body }); },
      Date: (function () {
        // Freeze "now" so the reminder is deterministically inside its pre-alarm window.
        const RealDate = Date;
        function FakeDate(...args) { return args.length ? new RealDate(...args) : new RealDate(now); }
        FakeDate.now = () => now.getTime();
        FakeDate.prototype = RealDate.prototype;
        return FakeDate;
      })(),
    },
  });

  context.checkPreAlarmNotifications();
  assert.strictEqual(pushed.length, 1, "should push exactly one notification the first time");

  const savedAfterFirstRun = JSON.parse(store.reminders);
  assert.strictEqual(savedAfterFirstRun[0].preNotified, true, "preNotified must be persisted to localStorage, not just set in memory");

  // Simulate the interval firing again a minute later, same pre-alarm window:
  // with the fix, safeStorage('reminders', []) now re-reads the PERSISTED
  // preNotified:true, so the filter excludes it and nothing fires again.
  context.checkPreAlarmNotifications();
  assert.strictEqual(pushed.length, 1, "must not push a second, duplicate notification once preNotified is persisted");
});

// Regression/coverage test for the new Health Dashboard's aggregation math
// (mood/sleep averages, water goal, medicine adherence) — this kind of
// averaging is exactly where a wrong divisor or off-by-one hides silently.
test("getHealthSnapshot aggregates mood, sleep, water, and medicine data correctly", () => {
  function todayStr() {
    const today = new Date();
    return (new Date(today - today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  }
  function daysAgoStr(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  }
  const today = todayStr();

  const { context } = loadFunctionsInSandbox({
    filePath: path.join(__dirname, "..", "js", "06-lifestyle", "05-health-dashboard.js"),
    names: ["getHealthSnapshot"],
    initialLocalStorage: {
      moodLog: JSON.stringify({ [today]: 4, [daysAgoStr(1)]: 2, [daysAgoStr(2)]: 0 }), // avg of 4,2,0 = 2
      sleepLog: JSON.stringify({ [today]: 7, [daysAgoStr(1)]: 5 }), // avg of 7,5 = 6
      medicines: JSON.stringify([
        { id: 1, name: "Vitamin D", freq: "daily", takenDate: today },
        { id: 2, name: "Ibuprofen", freq: "sos", takenDate: null }, // SOS meds are excluded from the "due today" count
        { id: 3, name: "Blood Pressure", freq: "morning", takenDate: null },
      ]),
    },
    extraContext: {
      getTodayStr: todayStr,
      waterDate: today,
      waterCount: 3,
    },
    // WATER_GOAL_CUPS is a separate top-level const in the real file (not
    // part of the extracted function itself) — same situation as
    // syncToCloud's syncTimeout above.
    preamble: "const WATER_GOAL_CUPS = 8;",
  });

  const snap = context.getHealthSnapshot();

  assert.strictEqual(snap.todayMood, 4, "today's mood should read straight from moodLog");
  assert.strictEqual(snap.avgMoodIdx, 2, "7-day mood average should be (4+2+0)/3 = 2");
  assert.strictEqual(snap.moodDaysLogged, 3);

  assert.strictEqual(snap.todaySleep, 7);
  assert.strictEqual(snap.avgSleep, 6, "7-day sleep average should be (7+5)/2 = 6");

  assert.strictEqual(snap.todayWater, 3);
  assert.strictEqual(snap.waterGoal, 8);

  assert.strictEqual(snap.medsDue, 2, "SOS medicines should not count toward doses due today");
  assert.strictEqual(snap.medsTaken, 1, "only the Vitamin D dose was marked taken today");
});

// Coverage test for the shift rotation-pattern cycle math — getShiftForDate()
// is the single most-depended-on function in the Shift Schedule feature
// (used by the home widget, calendar, summary, and — new this session —
// bulk override and .ics export), and had no test at all before this.
test("getShiftForDate cycles through the rotation pattern correctly, with overrides taking priority", () => {
  const { context } = loadFunctionsInSandbox({
    filePath: path.join(__dirname, "..", "js", "05-work-finance", "01-shifts.js"),
    names: ["getShiftConfig", "getShiftForDate"],
    initialLocalStorage: {
      shiftConfig: JSON.stringify({
        types: [
          { id: 1, name: "Morning", icon: "🌅", color: "#ff9500", start: "06:00", end: "14:00" },
          { id: 2, name: "Evening", icon: "🌇", color: "#5e5ce6", start: "14:00", end: "22:00" },
          { id: 4, name: "Off", icon: "🏖️", color: "#34c759", start: null, end: null },
        ],
        pattern: [1, 1, 2, 4], // Morning, Morning, Evening, Off — repeats every 4 days
        patternStart: "2026-01-01", // a Thursday
        overrides: { "2026-01-03": 4 }, // Evening day manually overridden to Off
        notes: {},
      }),
    },
  });

  // Day 0 of the cycle (the start date itself) -> pattern[0] -> Morning
  assert.strictEqual(context.getShiftForDate("2026-01-01").name, "Morning");
  // Day 1 -> pattern[1] -> Morning
  assert.strictEqual(context.getShiftForDate("2026-01-02").name, "Morning");
  // Day 2 would be pattern[2] -> Evening, but this date has an override -> Off
  assert.strictEqual(context.getShiftForDate("2026-01-03").name, "Off");
  // Day 3 -> pattern[3] -> Off
  assert.strictEqual(context.getShiftForDate("2026-01-04").name, "Off");
  // Day 4 wraps back to pattern[0] -> Morning (cycle length 4)
  assert.strictEqual(context.getShiftForDate("2026-01-05").name, "Morning");
  // A date well before patternStart must cycle correctly backwards too
  // (2025-12-28 is 4 days before start -> exactly one full cycle back -> Morning)
  assert.strictEqual(context.getShiftForDate("2025-12-28").name, "Morning");
});

test("syncToCloud includes finData in the payload written to Firestore", () => {
  const savedDocs = {};
  const fakeDb = {
    collection(name) {
      return {
        doc() {
          return {
            set(data) {
              savedDocs[name] = data;
              return Promise.resolve();
            },
          };
        },
      };
    },
  };

  const { context } = loadFunctionsInSandbox({
    filePath: path.join(__dirname, "..", "js", "01-core", "03-sync-profile.js"),
    names: ["syncToCloud"],
    initialLocalStorage: {
      finData: JSON.stringify({
        expenses: [{ id: 1, name: "Groceries", amount: 500 }],
        income: [], budgets: [], bills: [], emis: [], investments: [],
      }),
    },
    extraContext: {
      db: fakeDb,
      currentUser: { uid: "test-uid-123" },
      navigator: { onLine: true },
      userName: "Test User",
      userAlarmSound: "default",
      voiceAlarmEnabled: false,
      waterCount: 0,
      isProUser: false,
      getTodayStr: () => "2026-03-01",
      // Run the debounced callback immediately instead of waiting 2000ms —
      // same real logic, just without slowing the test suite down.
      setTimeout: (fn) => { fn(); return 0; },
      clearTimeout: () => {},
    },
    // syncToCloud's own debounce timer variable is declared at module top
    // level in the real file (separately from the function itself); the
    // function assumes it already exists, same as it does in the browser.
    preamble: "let syncTimeout = null;",
  });

  context.syncToCloud();

  assert.ok(savedDocs.users, "syncToCloud should write to the users collection");
  assert.deepStrictEqual(
    savedDocs.users.finData,
    { expenses: [{ id: 1, name: "Groceries", amount: 500 }], income: [], budgets: [], bills: [], emis: [], investments: [] },
    "finData must be included in the synced payload so Finance data is actually backed up"
  );
});
