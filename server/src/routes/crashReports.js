const express = require('express');
const { db } = require('../firebaseAdmin');

const router = express.Router();

// GET /api/crash-reports?limit=50&source=error&startAfter=<ISO ts cursor>
// crash_reports/{id} is write-only from the client (js/09-new-features/
// 09-crash-monitoring.js) — firestore.rules explicitly denies read/update/
// delete to everyone, including the person who filed the report, with a
// comment saying to use the Firebase Console instead. This is that "instead,"
// via the Admin SDK, which bypasses those client-facing rules by design.
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const source = req.query.source; // 'error' | 'unhandledrejection' | undefined

    let query = db.collection('crash_reports').orderBy('ts', 'desc');

    if (source === 'error' || source === 'unhandledrejection') {
      // NOTE: adding this equality filter alongside orderBy('ts') makes this
      // a compound query, which needs a composite index — unlike everything
      // else in this route. The FIRST time this runs, Firestore will reject
      // it with a FAILED_PRECONDITION error containing a direct link to
      // create that exact index in one click; after that one-time step it
      // works going forward. Left this filter in because it's genuinely
      // useful (unhandledrejection vs thrown-error triage) rather than
      // working around Firestore's own recommended fix for it.
      query = query.where('source', '==', source);
    }

    if (req.query.startAfter) {
      query = query.startAfter(req.query.startAfter);
    }

    const snap = await query.limit(limit).get();
    const reports = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    res.json({
      reports,
      nextCursor: reports.length === limit ? reports[reports.length - 1].ts : null,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
