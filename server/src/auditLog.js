// Records who did what, to whom, and when — every time a route below makes
// a real change (disable/enable/grant-pro/revoke-pro/delete), it calls this.
// Nothing reads this to make decisions; it exists purely so that six months
// from now, "wait, why does this account have Pro" or "who disabled this
// user" has an actual answer instead of a shrug.
//
// Takes `db` as a parameter rather than importing firebaseAdmin.js directly,
// so it can be unit-tested with a fake db (see tests/auditLog.test.js) with
// no real Firebase project involved.

async function logAdminAction(db, { action, targetUid, performedBy, details }) {
  const entry = {
    action,
    targetUid,
    performedBy,
    details: details || null,
    ts: new Date().toISOString(),
  };
  await db.collection('admin_audit_log').add(entry);
  return entry;
}

module.exports = { logAdminAction };
