"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const vm = require("node:vm");
const { extractFunction } = require("./extract-fn");

function loadFunctionsInSandbox({ filePath, names, initialLocalStorage = {} }) {
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

  const context = {
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
  };

  vm.createContext(context);
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
