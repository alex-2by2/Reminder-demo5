const express = require('express');
const { db } = require('../firebaseAdmin');

const router = express.Router();

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

// GET /api/dashboard/stats
// Headline numbers for the dashboard's stat cards. Uses Firestore's count()
// aggregate (reads a count, not the documents themselves — cheap even as the
// user base grows) rather than fetching every user just to count them.
router.get('/stats', async (req, res, next) => {
  try {
    const usersCol = db.collection('users');
    const crashCol = db.collection('crash_reports');

    const [
      totalUsersSnap,
      proUsersSnap,
      newTodaySnap,
      newThisWeekSnap,
      crash24hSnap,
      crash7dSnap,
    ] = await Promise.all([
      usersCol.count().get(),
      usersCol.where('isProUser', '==', true).count().get(),
      usersCol.where('joinedAt', '>=', isoDaysAgo(1)).count().get(),
      usersCol.where('joinedAt', '>=', isoDaysAgo(7)).count().get(),
      crashCol.where('ts', '>=', isoDaysAgo(1)).count().get(),
      crashCol.where('ts', '>=', isoDaysAgo(7)).count().get(),
    ]);

    const totalUsers = totalUsersSnap.data().count;
    const proUsers = proUsersSnap.data().count;

    res.json({
      totalUsers,
      proUsers,
      freeUsers: totalUsers - proUsers,
      newUsersToday: newTodaySnap.data().count,
      newUsersThisWeek: newThisWeekSnap.data().count,
      crashReportsLast24h: crash24hSnap.data().count,
      crashReportsLast7d: crash7dSnap.data().count,
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/dashboard/revenue?days=30
// Sums successful payments across every user's users/{uid}/payments
// subcollection (written only by the verifyRazorpayPayment Cloud Function —
// see functions/index.js — so this reflects real, verified payments, not
// client-reported ones). Deliberately filters by date IN MEMORY after a
// single simple where('status','==','success') fetch, rather than adding a
// second where() clause on createdAt: a single-field filter on a
// collection-group query works with Firestore's automatic indexes, but
// adding a second field would need a manually-created composite index, and
// payment volume for an app like this is small enough that summing in
// memory is simpler and just as fast in practice. If that stops being true,
// Firestore's own error message includes a direct link to create the exact
// index needed.
router.get('/revenue', async (req, res, next) => {
  try {
    const days = Math.min(parseInt(req.query.days, 10) || 30, 365);
    const cutoff = isoDaysAgo(days);

    const snap = await db.collectionGroup('payments').where('status', '==', 'success').get();

    let totalPaise = 0;
    let count = 0;
    snap.forEach((doc) => {
      const data = doc.data();
      if (data.createdAt && data.createdAt >= cutoff) {
        totalPaise += Number(data.amount) || 0;
        count += 1;
      }
    });

    res.json({
      sinceDays: days,
      currency: 'INR',
      paymentCount: count,
      totalPaise,
      totalRupees: Math.round(totalPaise / 100),
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
