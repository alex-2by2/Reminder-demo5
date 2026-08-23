"use strict";
/**
 * Run with:  node --test tests/
 *
 * createRequireOwner (src/middleware/requireOwner.js) is the ONE thing
 * standing between "an admin server that only you can use" and "an admin
 * server anyone who finds the URL can use" — see CHANGELOG.md §20. It's
 * deliberately dependency-injected (takes a verifyIdToken function instead
 * of importing firebaseAdmin.js) specifically so it could be tested this
 * thoroughly without a real Firebase project, real credentials, or network
 * access — none of which are available in this environment. See the
 * comment at the top of src/middleware/requireOwner.js for the reasoning.
 */
const test = require("node:test");
const assert = require("node:assert");
const { createRequireOwner } = require("../src/middleware/requireOwner");

function mockReq(authHeader) {
  return { headers: authHeader ? { authorization: authHeader } : {} };
}

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

function mockNext() {
  const calls = [];
  const next = (err) => calls.push(err);
  next.calls = calls;
  return next;
}

test("fails closed: rejects everything when no owner is configured at all", async () => {
  const mw = createRequireOwner({ verifyIdToken: async () => ({ uid: "anyone" }), ownerUid: "", ownerEmail: "" });
  const req = mockReq("Bearer sometoken");
  const res = mockRes();
  const next = mockNext();
  await mw(req, res, next);
  assert.strictEqual(res.statusCode, 503);
  assert.strictEqual(next.calls.length, 0, "next() must not be called");
});

test("rejects a request with no Authorization header", async () => {
  const mw = createRequireOwner({ verifyIdToken: async () => ({ uid: "owner1" }), ownerUid: "owner1" });
  const req = mockReq(undefined);
  const res = mockRes();
  const next = mockNext();
  await mw(req, res, next);
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(next.calls.length, 0);
});

test("rejects a malformed Authorization header (missing 'Bearer ')", async () => {
  const mw = createRequireOwner({ verifyIdToken: async () => ({ uid: "owner1" }), ownerUid: "owner1" });
  const req = mockReq("sometoken-with-no-scheme");
  const res = mockRes();
  const next = mockNext();
  await mw(req, res, next);
  assert.strictEqual(res.statusCode, 401);
});

test("rejects an invalid/expired token (verifyIdToken throws)", async () => {
  const mw = createRequireOwner({
    verifyIdToken: async () => { throw new Error("Firebase: token expired"); },
    ownerUid: "owner1",
  });
  const req = mockReq("Bearer expired-token");
  const res = mockRes();
  const next = mockNext();
  await mw(req, res, next);
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(next.calls.length, 0);
});

test("rejects a valid token for a UID that isn't the configured owner", async () => {
  const mw = createRequireOwner({
    verifyIdToken: async () => ({ uid: "some-other-user" }),
    ownerUid: "owner1",
  });
  const req = mockReq("Bearer valid-but-not-owner");
  const res = mockRes();
  const next = mockNext();
  await mw(req, res, next);
  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(next.calls.length, 0);
});

test("accepts a valid token matching OWNER_UID, and sets req.ownerUid", async () => {
  const mw = createRequireOwner({
    verifyIdToken: async () => ({ uid: "owner1", email: "owner@example.com" }),
    ownerUid: "owner1",
  });
  const req = mockReq("Bearer valid-owner-token");
  const res = mockRes();
  const next = mockNext();
  await mw(req, res, next);
  assert.strictEqual(next.calls.length, 1);
  assert.strictEqual(next.calls[0], undefined, "next() should be called with no error");
  assert.strictEqual(req.ownerUid, "owner1");
  assert.strictEqual(res.statusCode, null, "should not have written a response");
});

test("accepts a valid token matching OWNER_EMAIL, case-insensitively", async () => {
  const mw = createRequireOwner({
    verifyIdToken: async () => ({ uid: "some-uid", email: "Owner@Example.com" }),
    ownerEmail: "owner@example.com",
  });
  const req = mockReq("Bearer valid-owner-token");
  const res = mockRes();
  const next = mockNext();
  await mw(req, res, next);
  assert.strictEqual(next.calls.length, 1);
  assert.strictEqual(req.ownerUid, "some-uid");
});

test("rejects a real, valid token that simply belongs to someone else's email", async () => {
  const mw = createRequireOwner({
    verifyIdToken: async () => ({ uid: "attacker-uid", email: "attacker@evil.com" }),
    ownerUid: "owner1",
    ownerEmail: "owner@example.com",
  });
  const req = mockReq("Bearer attacker-signed-in-for-real");
  const res = mockRes();
  const next = mockNext();
  await mw(req, res, next);
  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(next.calls.length, 0);
});

test("an unexpected error (not an auth failure) is passed to next(err), not swallowed", async () => {
  const mw = createRequireOwner({
    verifyIdToken: async () => { throw { notAnError: true }; }, // still caught as invalid token, not a crash
    ownerUid: "owner1",
  });
  const req = { headers: { authorization: "Bearer x" } };
  // Force a genuinely unexpected failure: no res.status method at all.
  const res = {};
  const next = mockNext();
  await mw(req, res, next);
  assert.strictEqual(next.calls.length, 1);
  assert.ok(next.calls[0] instanceof Error, "the thrown TypeError from calling res.status() should reach next()");
});
