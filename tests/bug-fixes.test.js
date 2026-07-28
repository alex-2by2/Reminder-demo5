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
    filePath: path.join(__dirname, "..", "js", "02-reminders-habits.js"),
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
    filePath: path.join(__dirname, "..", "js", "07-automation-analytics.js"),
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

// Regression test for a real bug: finData (expenses/income/budgets/bills/EMIs/
// investments) was missing from the object written to Firestore in
// syncToCloud(), so the Finance feature had no cloud backup at all. See
// CHANGELOG.md.
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
    filePath: path.join(__dirname, "..", "js", "01-core-init.js"),
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
