"use strict";
/**
 * Run with:  node --test tests/
 *
 * These tests target the highest-stakes pure-logic functions added or
 * modified during the security/architecture work on this app:
 *   - sanitizeHTML / escInline: the two escaping functions the entire XSS
 *     fix depends on. If either regresses, every one of the ~90 call sites
 *     that trust them becomes vulnerable again.
 *   - migrateToV2_normalizeReminders: the schema migration that runs on
 *     every single user's stored data on their next app load. A bug here
 *     doesn't just fail a test — it corrupts real people's task lists.
 *   - safeNum / isValidDate: small, easy to break by accident, used
 *     throughout finance and date-handling code.
 *
 * They read the CURRENT js/01-core-init.js at run time (see extract-fn.js),
 * so they test the real implementation, not a hand-copied stand-in.
 */
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const vm = require("node:vm");
const { extractFunction } = require("./extract-fn");

const CORE_FILE = path.join(__dirname, "..", "js", "01-core-init.js");

function loadFunctionsInSandbox(names, initialLocalStorage) {
  const store = Object.assign({}, initialLocalStorage || {});
  const localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  const context = {
    localStorage,
    console,
    JSON,
    Array,
    Object,
    isNaN,
    parseInt,
    String,
    Boolean,
  };
  vm.createContext(context);
  for (const name of names) {
    const source = extractFunction(CORE_FILE, name);
    vm.runInContext(source, context);
  }
  return { context, store };
}

// ---------------------------------------------------------------------------
// sanitizeHTML
// ---------------------------------------------------------------------------
test("sanitizeHTML escapes all five HTML-significant characters", () => {
  const { context } = loadFunctionsInSandbox(["sanitizeHTML"]);
  const result = context.sanitizeHTML(`<img src=x onerror="alert('hi')">&`);
  assert.ok(!result.includes("<"), "should escape <");
  assert.ok(!result.includes(">"), "should escape >");
  assert.ok(!result.includes('"'), "should escape double quotes");
  assert.ok(!result.includes("'"), "should escape single quotes");
  assert.strictEqual(
    result,
    "&lt;img src=x onerror=&quot;alert(&#39;hi&#39;)&quot;&gt;&amp;"
  );
});

test("sanitizeHTML returns empty string for non-string input (defensive default)", () => {
  const { context } = loadFunctionsInSandbox(["sanitizeHTML"]);
  assert.strictEqual(context.sanitizeHTML(null), "");
  assert.strictEqual(context.sanitizeHTML(undefined), "");
  assert.strictEqual(context.sanitizeHTML(42), "");
});

// ---------------------------------------------------------------------------
// escInline — the harder case: value embedded inside an inline event-handler
// attribute as a JS string argument, e.g. onclick="fn('VALUE')"
// ---------------------------------------------------------------------------
test("escInline prevents breaking out of a single-quoted inline handler", () => {
  const { context } = loadFunctionsInSandbox(["escInline"]);
  const malicious = "x'); spy.hit = true; //";
  const escaped = context.escInline(malicious);

  // Build the attribute exactly as the app does: onclick="filterByTag('ESCAPED')"
  const rawAttributeValue = `filterByTag('${escaped}')`;
  // Simulate what the browser's HTML parser does to an attribute value before
  // it becomes JS source: decode HTML entities.
  const decodedJsSource = rawAttributeValue
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');

  // Actually run it as the browser would run an onclick handler body, with a
  // spy in scope, and prove the injected statement never executes.
  const spy = { hit: false };
  let capturedArg = null;
  function filterByTag(arg) { capturedArg = arg; }

  const handler = new Function("filterByTag", "spy", decodedJsSource);
  handler(filterByTag, spy);

  assert.strictEqual(spy.hit, false, "the injected statement must never execute");
  assert.strictEqual(
    capturedArg, malicious,
    "filterByTag must receive the entire malicious string as ONE argument, proving the string literal was never broken out of"
  );
});

test("escInline still HTML-escapes angle brackets and double quotes", () => {
  const { context } = loadFunctionsInSandbox(["escInline"]);
  const result = context.escInline(`<b>"test"</b>`);
  assert.ok(!result.includes("<"));
  assert.ok(!result.includes('"'));
});

// ---------------------------------------------------------------------------
// safeNum
// ---------------------------------------------------------------------------
test("safeNum returns the fallback for non-numeric input", () => {
  const { context } = loadFunctionsInSandbox(["safeNum"]);
  assert.strictEqual(context.safeNum("not a number", 5), 5);
  assert.strictEqual(context.safeNum(undefined, 0), 0);
  assert.strictEqual(context.safeNum(Infinity, 7), 7);
});

test("safeNum passes through valid numbers (including numeric strings)", () => {
  const { context } = loadFunctionsInSandbox(["safeNum"]);
  assert.strictEqual(context.safeNum("42", 0), 42);
  assert.strictEqual(context.safeNum(3.14, 0), 3.14);
});

// ---------------------------------------------------------------------------
// migrateToV2_normalizeReminders — the schema migration
// ---------------------------------------------------------------------------
test("migration fills in missing fields on old reminder records without touching existing values", () => {
  const oldReminder = { id: 1, task: "Buy milk" }; // missing everything added since
  const alreadyGoodReminder = {
    id: 2, task: "Pay bill", subtasks: [{ text: "step 1", done: true }],
    tags: "urgent", notes: "call first", assignee: "me",
    notified: true, pinned: true, archived: false, status: "completed", priority: "high",
  };

  const { context, store } = loadFunctionsInSandbox(
    ["safeStorage", "migrateToV2_normalizeReminders"],
    { reminders: JSON.stringify([oldReminder, alreadyGoodReminder]) }
  );
  context.migrateToV2_normalizeReminders();

  const saved = JSON.parse(store.reminders);
  const migratedOld = saved.find((r) => r.id === 1);
  const untouchedGood = saved.find((r) => r.id === 2);

  assert.deepStrictEqual(migratedOld.subtasks, []);
  assert.strictEqual(migratedOld.tags, "");
  assert.strictEqual(migratedOld.status, "pending");
  assert.strictEqual(migratedOld.priority, "medium");
  assert.strictEqual(migratedOld.notified, false);
  assert.strictEqual(migratedOld.task, "Buy milk", "must not touch the original task text");

  // The already-complete record should be byte-for-byte unchanged.
  assert.deepStrictEqual(untouchedGood, alreadyGoodReminder);
});

test("migration is a no-op when there are no stored reminders yet (new user)", () => {
  const { context, store } = loadFunctionsInSandbox(
    ["safeStorage", "migrateToV2_normalizeReminders"],
    {} // no 'reminders' key at all
  );
  assert.doesNotThrow(() => context.migrateToV2_normalizeReminders());
  assert.strictEqual(store.reminders, undefined, "should not create a reminders key from nothing");
});

test("migration never throws, even if stored reminders JSON is corrupt", () => {
  const { context } = loadFunctionsInSandbox(
    ["safeStorage", "migrateToV2_normalizeReminders"],
    { reminders: "{not valid json" }
  );
  assert.doesNotThrow(() => context.migrateToV2_normalizeReminders());
});
