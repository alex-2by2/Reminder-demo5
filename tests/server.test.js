"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../server");

function aggregate(count) {
  return { get: async () => ({ data: () => ({ count }) }) };
}

function makeDb() {
  const paymentDocs = [
    { get: (field) => ({ amount: 49900, status: "success" })[field] },
    { get: (field) => ({ amount: 49900, status: "failed" })[field] },
  ];
  return {
    collection(name) {
      let filter;
      const query = {
        count: () => aggregate(name === "users"
          ? (filter?.[0] === "isProUser" ? 2 : filter?.[0] === "referralCount" ? 1 : 3)
          : 4),
        where: (...args) => { filter = args; return query; },
        orderBy: () => query,
        limit: () => query,
        select: () => query,
        get: async () => ({ docs: [] }),
        doc: (uid) => ({ uid }),
      };
      return query;
    },
    collectionGroup: () => ({ select: () => ({ get: async () => ({ docs: paymentDocs }) }) }),
    getAll: async () => [{
      exists: true,
      data: () => ({ userName: "Owner", isProUser: true, joinedAt: "2026-01-01", referralCount: 2 }),
    }],
  };
}

test("admin API protects owner routes and serves limited owner data", async (t) => {
  const previousOwnerUids = process.env.OWNER_UIDS;
  process.env.OWNER_UIDS = "owner-1";
  t.after(() => {
    if (previousOwnerUids === undefined) delete process.env.OWNER_UIDS;
    else process.env.OWNER_UIDS = previousOwnerUids;
  });

  const app = createApp({
    auth: {
      verifyIdToken: async (token) => ({ uid: token }),
      listUsers: async () => ({
        users: [{
          uid: "owner-1",
          email: "owner@example.com",
          displayName: "Owner",
          emailVerified: true,
          disabled: false,
          metadata: { creationTime: "2026-01-01T00:00:00Z" },
        }],
        pageToken: undefined,
      }),
      updateUser: async (uid, update) => ({ uid, disabled: update.disabled }),
    },
    db: makeDb(),
    frontendOrigins: ["https://app.example"],
  });
  const server = app.listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "ok" });

  const anonymous = await fetch(`${baseUrl}/api/admin/overview`);
  assert.equal(anonymous.status, 401);

  const nonOwner = await fetch(`${baseUrl}/api/admin/overview`, {
    headers: { authorization: "Bearer visitor-1" },
  });
  assert.equal(nonOwner.status, 403);

  const overviewResponse = await fetch(`${baseUrl}/api/admin/overview`, {
    headers: { authorization: "Bearer owner-1" },
  });
  assert.equal(overviewResponse.status, 200);
  assert.deepEqual(await overviewResponse.json(), {
    totalUsers: 3,
    proUsers: 2,
    freeUsers: 1,
    crashReports: 4,
    referredUsers: 1,
    successfulPayments: 1,
    revenuePaise: 49900,
  });

  const usersResponse = await fetch(`${baseUrl}/api/admin/users`, {
    headers: { authorization: "Bearer owner-1" },
  });
  const users = await usersResponse.json();
  assert.equal(users.users[0].email, "owner@example.com");
  assert.equal(users.users[0].isProUser, true);
  assert.equal(Object.hasOwn(users.users[0], "reminders"), false);

  const selfDisable = await fetch(`${baseUrl}/api/admin/users/owner-1`, {
    method: "PATCH",
    headers: { authorization: "Bearer owner-1", "content-type": "application/json" },
    body: JSON.stringify({ disabled: true }),
  });
  assert.equal(selfDisable.status, 400);

  const blockedOrigin = await fetch(`${baseUrl}/health`, {
    headers: { origin: "https://untrusted.example" },
  });
  assert.equal(blockedOrigin.status, 403);
});