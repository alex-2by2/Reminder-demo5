// Every route in this server (except /health) sits behind this. It does two
// checks, in order, and both must pass:
//
//   1. Is the request carrying a genuine, currently-valid Firebase Auth ID
//      token? (Proves "this is a real, signed-in Firebase user," using the
//      exact same Firebase project the app itself signs people into.)
//   2. Does that token belong to the one account configured as the owner?
//      (Proves "...and specifically it's you.")
//
// Step 1 alone is what firestore.rules already does for every normal user —
// it's necessary but not sufficient here, since this server's whole reason
// to exist is doing things a normal signed-in user specifically should NOT
// be able to do (read every user's data, disable accounts, grant Pro for
// free). Step 2 is what actually enforces "owner only."
//
// Fails CLOSED: if neither ownerUid nor ownerEmail is configured, every
// request is rejected — a misconfigured deployment locks everyone out
// rather than accidentally locking no one out.
//
// This file exports a FACTORY (createRequireOwner) rather than a ready-made
// middleware, and doesn't import firebaseAdmin.js. That's deliberate: the
// only genuinely security-critical logic here is "given a decoded token, is
// this the owner?" — that logic shouldn't need a real Firebase project to
// exercise in a test. Real wiring (the actual verifyIdToken call, the actual
// env vars) lives in src/index.js, right where the app is assembled; see
// tests/requireOwner.test.js for this file tested completely in isolation.

function createRequireOwner({ verifyIdToken, ownerUid, ownerEmail }) {
  const OWNER_UID = (ownerUid || '').trim();
  const OWNER_EMAIL = (ownerEmail || '').trim().toLowerCase();

  return async function requireOwner(req, res, next) {
    try {
      if (!OWNER_UID && !OWNER_EMAIL) {
        return res.status(503).json({
          error: 'Server misconfigured: set OWNER_UID and/or OWNER_EMAIL before this API can be used.',
        });
      }

      const header = (req.headers && req.headers.authorization) || '';
      const [scheme, token] = header.split(' ');
      if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Missing or malformed Authorization header. Expected: Bearer <Firebase ID token>.' });
      }

      let decoded;
      try {
        decoded = await verifyIdToken(token);
      } catch (e) {
        return res.status(401).json({ error: 'Invalid or expired sign-in token. Sign in again.' });
      }

      const isOwner =
        (OWNER_UID && decoded.uid === OWNER_UID) ||
        (OWNER_EMAIL && (decoded.email || '').toLowerCase() === OWNER_EMAIL);

      if (!isOwner) {
        return res.status(403).json({ error: 'Forbidden: this account is not authorized to use this server.' });
      }

      req.ownerUid = decoded.uid;
      next();
    } catch (e) {
      next(e);
    }
  };
}

module.exports = { createRequireOwner };
