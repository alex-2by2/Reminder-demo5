const express = require('express');
const { db, auth } = require('../firebaseAdmin');
const { logAdminAction } = require('../auditLog');

const router = express.Router();

// Wraps logAdminAction so a logging hiccup never turns an action that
// actually succeeded into an error response — it's a record, not a gate.
async function logSafely(req, action, targetUid, details) {
  try {
    await logAdminAction(db, { action, targetUid, performedBy: req.ownerUid, details });
  } catch (e) {
    console.error('Failed to write admin_audit_log entry:', e);
  }
}

// Deliberately NOT the whole users/{uid} document — that document also holds
// reminders, habits, khataData (other real people's names and money owed),
// moodLog, sleepLog, vehicleLogs, familyMembers, and more (see
// firestore.rules' own description of it). An admin API returning all of
// that on every user lookup would turn one compromised admin session into a
// far bigger leak than it needs to be. This allowlist is the account/support
// -relevant subset — for anything beyond it, the Firebase Console's
// Firestore data tab is already the tool this project uses for raw
// inspection (see firestore.rules on crash_reports for the same pattern).
const ADMIN_PROFILE_FIELDS = [
  'userName', 'uniqueId', 'userLevel', 'habitXP_tasks',
  'isProUser', 'proExpiresAt', 'proGrantedManually',
  'coinBalance', 'referralCount', 'referredBy',
  'joinedAt', 'termsAcceptedAt', 'termsVersion',
];

function pickProfileFields(data) {
  const out = {};
  for (const key of ADMIN_PROFILE_FIELDS) out[key] = data && key in data ? data[key] : null;
  return out;
}

// GET /api/users?limit=25&pageToken=...
// Combines Firebase Auth (email, disabled, sign-in times — this project
// doesn't duplicate these into Firestore) with each user's Firestore profile,
// fetched as one batched read rather than one request per row.
router.get('/', async (req, res, next) => {
  try {
    const maxResults = Math.min(parseInt(req.query.limit, 10) || 25, 200);
    const pageToken = req.query.pageToken || undefined;

    const listResult = await auth.listUsers(maxResults, pageToken);
    const uids = listResult.users.map((u) => u.uid);
    const refs = uids.map((uid) => db.collection('users').doc(uid));
    const snaps = uids.length ? await db.getAll(...refs) : [];

    const profileByUid = {};
    snaps.forEach((snap) => {
      profileByUid[snap.id] = snap.exists ? pickProfileFields(snap.data()) : null;
    });

    const users = listResult.users.map((u) => ({
      uid: u.uid,
      email: u.email || null,
      emailVerified: u.emailVerified,
      disabled: u.disabled,
      createdAt: u.metadata.creationTime,
      lastSignInAt: u.metadata.lastSignInTime,
      profile: profileByUid[u.uid],
    }));

    res.json({ users, nextPageToken: listResult.pageToken || null });
  } catch (e) {
    next(e);
  }
});

// GET /api/users/:uid
router.get('/:uid', async (req, res, next) => {
  try {
    const { uid } = req.params;
    let authUser;
    try {
      authUser = await auth.getUser(uid);
    } catch (e) {
      return res.status(404).json({ error: 'No such user.' });
    }

    const [profileSnap, paymentsSnap] = await Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('users').doc(uid).collection('payments').orderBy('createdAt', 'desc').limit(20).get(),
    ]);

    res.json({
      uid: authUser.uid,
      email: authUser.email || null,
      emailVerified: authUser.emailVerified,
      disabled: authUser.disabled,
      createdAt: authUser.metadata.creationTime,
      lastSignInAt: authUser.metadata.lastSignInTime,
      profile: profileSnap.exists ? pickProfileFields(profileSnap.data()) : null,
      recentPayments: paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/users/:uid/disable  — blocks sign-in immediately (ToS violations,
// a deletion request you're still processing, etc.)
router.post('/:uid/disable', async (req, res, next) => {
  try {
    await auth.updateUser(req.params.uid, { disabled: true });
    await logSafely(req, 'disable', req.params.uid);
    res.json({ success: true, uid: req.params.uid, disabled: true });
  } catch (e) {
    next(e);
  }
});

// POST /api/users/:uid/enable
router.post('/:uid/enable', async (req, res, next) => {
  try {
    await auth.updateUser(req.params.uid, { disabled: false });
    await logSafely(req, 'enable', req.params.uid);
    res.json({ success: true, uid: req.params.uid, disabled: false });
  } catch (e) {
    next(e);
  }
});

// POST /api/users/:uid/grant-pro  { days?: number }  — for support requests /
// manual comps. Mirrors exactly the fields verifyRazorpayPayment sets in
// functions/index.js, so the app's own isProUser checks (see
// js/09-new-features/15-free-tier-limits.js) pick it up with no client change.
router.post('/:uid/grant-pro', async (req, res, next) => {
  try {
    const days = Math.min(Math.max(parseInt(req.body && req.body.days, 10) || 365, 1), 3650);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    await db.collection('users').doc(req.params.uid).update({
      isProUser: true,
      proExpiresAt: expiresAt.toISOString(),
      proGrantedManually: true,
    });
    await logSafely(req, 'grant-pro', req.params.uid, { days });

    res.json({ success: true, isProUser: true, proExpiresAt: expiresAt.toISOString() });
  } catch (e) {
    next(e);
  }
});

// POST /api/users/:uid/revoke-pro
router.post('/:uid/revoke-pro', async (req, res, next) => {
  try {
    await db.collection('users').doc(req.params.uid).update({ isProUser: false });
    await logSafely(req, 'revoke-pro', req.params.uid);
    res.json({ success: true, isProUser: false });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/users/:uid — removes the Auth account plus users/{uid} (and its
// payments subcollection) and public_profiles/{uid}.
// KNOWN LIMITATION, matching the one firestore.rules already documents for
// workspaces/family_wallets: this does not remove the uid from any
// workspaces/{code}.members or family_wallets/{code}.members array it may
// belong to, or any shared_tasks/{id} addressed to their email. Those are
// keyed by invite-code/email rather than uid, so finding "every place this
// person is a member of" needs a collection scan this route doesn't do. Not
// a data leak (those collections were never readable by anyone but their
// members, and a deleted uid can't sign in to become a member again) but
// worth knowing about if you're doing this for a GDPR-style erasure request.
router.delete('/:uid', async (req, res, next) => {
  try {
    const { uid } = req.params;

    const paymentsSnap = await db.collection('users').doc(uid).collection('payments').get();
    const batch = db.batch();
    paymentsSnap.forEach((doc) => batch.delete(doc.ref));
    batch.delete(db.collection('users').doc(uid));
    batch.delete(db.collection('public_profiles').doc(uid));
    await batch.commit();

    await auth.deleteUser(uid);
    await logSafely(req, 'delete', uid);

    res.json({ success: true, uid, deleted: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
