const express = require('express');
const { db } = require('../firebaseAdmin');

const router = express.Router();

// GET /api/audit-log?limit=50&startAfter=<ISO ts cursor>
// Every entry here was written by routes/users.js after a successful
// disable/enable/grant-pro/revoke-pro/delete — see src/auditLog.js.
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    let query = db.collection('admin_audit_log').orderBy('ts', 'desc');
    if (req.query.startAfter) query = query.startAfter(req.query.startAfter);

    const snap = await query.limit(limit).get();
    const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    res.json({
      entries,
      nextCursor: entries.length === limit ? entries[entries.length - 1].ts : null,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
