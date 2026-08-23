"use strict";
/**
 * Run with:  node --test tests/
 *
 * Targets esc() — the one function every dynamic value rendered into the
 * admin dashboard's tables passes through before hitting innerHTML (see
 * public/admin.js and CHANGELOG.md §20). userName is a free-text field a
 * user sets themselves (js/01-core/03-sync-profile.js, in the main app) —
 * if esc() ever regresses, viewing the Users table becomes a stored-XSS hole
 * in the one browser session with admin API access. That's worth a real
 * test, not just "I looked at it and it seemed fine."
 *
 * Reads the CURRENT public/admin.js at run time (see extract-fn.js), so
 * this tests the real implementation, not a hand-copied stand-in.
 */
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const vm = require("node:vm");
const { extractFunction } = require("./extract-fn");

const ADMIN_JS = path.join(__dirname, "..", "public", "admin.js");

function loadEsc() {
  const src = extractFunction(ADMIN_JS, "esc");
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${src}\nthis.esc = esc;`, context);
  return context.esc;
}

test("esc() neutralizes a script tag", () => {
  const esc = loadEsc();
  assert.strictEqual(esc("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;");
});

test("esc() neutralizes an attribute-breakout/onerror payload", () => {
  const esc = loadEsc();
  const out = esc('"><img src=x onerror=alert(1)>');
  assert.ok(!out.includes("<"), "no raw < should survive");
  assert.ok(!out.includes(">"), "no raw > should survive");
  assert.ok(!out.includes('"'), "no raw \" should survive");
});

test("esc() escapes ampersands (so entities themselves can't be forged)", () => {
  const esc = loadEsc();
  assert.strictEqual(esc("Tom & Jerry"), "Tom &amp; Jerry");
  assert.strictEqual(esc("&lt;already encoded&gt;"), "&amp;lt;already encoded&amp;gt;");
});

test("esc() escapes single quotes (single-quoted-attribute breakout)", () => {
  const esc = loadEsc();
  assert.strictEqual(esc("O'Brien"), "O&#39;Brien");
});

test("esc() passes ordinary names through unchanged", () => {
  const esc = loadEsc();
  assert.strictEqual(esc("Alex Kumar"), "Alex Kumar");
  assert.strictEqual(esc(""), "");
});

test("esc() handles null/undefined without throwing", () => {
  const esc = loadEsc();
  assert.strictEqual(esc(null), "");
  assert.strictEqual(esc(undefined), "");
});

test("esc() coerces non-strings (numbers, objects) instead of throwing", () => {
  const esc = loadEsc();
  assert.strictEqual(esc(42), "42");
});
