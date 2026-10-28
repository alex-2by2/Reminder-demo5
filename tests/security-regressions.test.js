"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("web push no longer compares the configured VAPID key to itself", () => {
  const source = read("js/09-new-features/11-web-push.js");
  assert.match(source, /FCM_VAPID_KEY === 'PASTE_YOUR_WEB_PUSH_VAPID_KEY_HERE'/);
  assert.doesNotMatch(source, /FCM_VAPID_KEY === 'BFG9RxWVk2iaPw2eD6zOkGf2MwvBrMDT2SP7FMKpxo3lxHBIXHY9efXGTdd83i8E8o7UUwSaIupxVepny6scSEI'/);
});

test("Razorpay checkout uses the server-returned public key ID", () => {
  const client = read("js/09-new-features/13-payments.js");
  const functions = read("functions/index.js");
  assert.match(client, /const \{ orderId, amount, currency, keyId \} = result\.data/);
  assert.match(client, /key: keyId/);
  assert.doesNotMatch(client, /PASTE_YOUR_RAZORPAY_KEY_ID_HERE/);
  assert.match(functions, /order\.notes\.uid !== request\.auth\.uid/);
  assert.match(functions, /payment\.status !== "captured"/);
  assert.match(functions, /collection\("processed_payments"\)/);
});

test("client Firestore rules cannot change server-owned Pro entitlements", () => {
  const rules = read("firestore.rules");
  assert.match(rules, /allow create:[\s\S]*?hasAny\(\['isProUser', 'proExpiresAt'\]\)/);
  assert.match(rules, /allow update:[\s\S]*?affectedKeys\(\)[\s\S]*?hasAny\(\['isProUser', 'proExpiresAt'\]\)/);
  const sync = read("js/01-core/03-sync-profile.js");
  assert.doesNotMatch(sync, /^\s*isProUser:\s*isProUser,/m);
});

test("legacy client-only Pro activation shortcut is absent", () => {
  assert.doesNotMatch(read("js/01-core/02-navigation-auth.js"), /function activatePro\s*\(/);
});

test("Terms gate does not silently fail open on read errors", () => {
  const source = read("js/09-new-features/10-tos-gate.js");
  assert.match(source, /catch \(e\) \{[\s\S]*?openModal\('tosGateModal'\)/);
  assert.doesNotMatch(source, /fail open rather than locking someone out/);
});
