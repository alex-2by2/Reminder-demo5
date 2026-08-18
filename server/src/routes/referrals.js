const express = require('express');
const { db } = require('../firebaseAdmin');

const router = express.Router();

// GET /api/referrals/leaderboard?limit=20
// referralCount is incremented by the applyReferral Cloud Function
// (functions/index.js) inside a transaction, so it's already trustworthy —
// nothing client-side can inflate it directly.
router.get('/leaderboard', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    // Filtering and ordering on the SAME field (referralCount) — this only
    // needs the automatic single-field index Firestore already maintains,
    // unlike the cross-field case noted in routes/crashReports.js.
    const snap = await db.collection('users')
      .where('referralCount', '>', 0)
      .orderBy('referralCount', 'desc')
      .limit(limit)
      .get();

    const uids = snap.docs.map((d) => d.id);
    const profileRefs = uids.map((uid) => db.collection('public_profiles').doc(uid));
    const profileSnaps = uids.length ? await db.getAll(...profileRefs) : [];
    const nameByUid = {};
    profileSnaps.forEach((s) => {
      nameByUid[s.id] = s.exists ? s.data().userName || null : null;
    });

    const leaderboard = snap.docs.map((d, i) => ({
      rank: i + 1,
      uid: d.id,
      userName: nameByUid[d.id] || 'User',
      referralCount: d.data().referralCount || 0,
      coinBalance: d.data().coinBalance || 0,
    }));

    res.json({ leaderboard });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
