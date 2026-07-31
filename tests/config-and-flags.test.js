"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// js/00-config.js is a self-contained IIFE that only touches `window` and
// `localStorage` — no DOM, no Firebase — so unlike the other test files it
// can be run in full rather than needing extractFunction() to pull out one
// function at a time.
function loadConfigModule(initialStore = {}) {
  const store = Object.assign({}, initialStore);
  const localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  const context = { window: {}, localStorage, JSON, Object, console };
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, "..", "js", "00-foundation", "01-config.js"), "utf8");
  vm.runInContext(source, context);
  return { window: context.window, store };
}

test("Features default to enabled and loading the module changes no behavior by itself", () => {
  const { window } = loadConfigModule();
  assert.strictEqual(window.Features.isEnabled("swipeToComplete"), true);
  assert.strictEqual(window.Features.isEnabled("aiPrioritySuggestion"), true);
  assert.strictEqual(window.Features.isEnabled("nonExistentFlag"), false);
});

test("Features.set persists across a reload (new sandbox reading the same store)", () => {
  const { window, store } = loadConfigModule();
  window.Features.set("swipeToComplete", false);
  assert.strictEqual(window.Features.isEnabled("swipeToComplete"), false);

  // Simulate a page reload: fresh module instance, same underlying storage.
  const reloaded = loadConfigModule(store);
  assert.strictEqual(reloaded.window.Features.isEnabled("swipeToComplete"), false);
  // Untouched flags still default correctly for the reloaded instance too.
  assert.strictEqual(reloaded.window.Features.isEnabled("leaderboard"), true);
});

test("STORAGE_KEYS and APP_CONFIG are frozen (accidental mutation is a no-op, not a silent bug)", () => {
  const { window } = loadConfigModule();
  assert.throws(() => {
    "use strict";
    window.STORAGE_KEYS.REMINDERS = "hacked";
  }, TypeError);
  assert.strictEqual(window.STORAGE_KEYS.REMINDERS, "reminders");
  assert.strictEqual(Object.isFrozen(window.APP_CONFIG), true);
});
