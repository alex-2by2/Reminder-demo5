"use strict";
/**
 * Run with:  node --test tests/
 *
 * logAdminAction (src/auditLog.js) takes `db` as a parameter rather than
 * importing firebaseAdmin.js, specifically so it's testable with a fake
 * Firestore-shaped object like the one below — no real project needed.
 */
const test = require("node:test");
const assert = require("node:assert");
const { logAdminAction } = require("../src/auditLog");

function fakeDb(added) {
  return {
    collection(name) {
      assert.strictEqual(name, "admin_audit_log", "should only ever write to admin_audit_log");
      return {
        add: async (doc) => {
          added.push(doc);
          return { id: "fake-doc-id" };
        },
      };
    },
  };
}

test("writes the expected shape, including a valid ISO timestamp", async () => {
  const added = [];
  const entry = await logAdminAction(fakeDb(added), {
    action: "grant-pro",
    targetUid: "user-123",
    performedBy: "owner-uid",
    details: { days: 365 },
  });

  assert.strictEqual(added.length, 1);
  assert.strictEqual(added[0].action, "grant-pro");
  assert.strictEqual(added[0].targetUid, "user-123");
  assert.strictEqual(added[0].performedBy, "owner-uid");
  assert.deepStrictEqual(added[0].details, { days: 365 });
  assert.ok(typeof added[0].ts === "string" && !Number.isNaN(Date.parse(added[0].ts)), "ts should be a parseable ISO string");
  assert.strictEqual(entry, added[0], "should return the same entry it wrote");
});

test("defaults details to null when omitted", async () => {
  const added = [];
  await logAdminAction(fakeDb(added), { action: "disable", targetUid: "user-456", performedBy: "owner-uid" });
  assert.strictEqual(added[0].details, null);
});

test("propagates a Firestore write failure rather than swallowing it", async () => {
  const failingDb = {
    collection: () => ({ add: async () => { throw new Error("Firestore unavailable"); } }),
  };
  await assert.rejects(
    () => logAdminAction(failingDb, { action: "delete", targetUid: "u1", performedBy: "owner-uid" }),
    /Firestore unavailable/
  );
});
