// Initializes the Firebase Admin SDK once, using a service account loaded
// from an environment variable (never a file committed to the repo).
//
// The Admin SDK talks to the SAME Firestore project and the SAME Firebase
// Auth user pool the app's client code already uses — there is no second
// database here. That's deliberate: an admin backend that read from a
// different store than the live app would always be showing something
// slightly stale or wrong. The Admin SDK also bypasses firestore.rules
// entirely (that's the point of it — it authenticates as a trusted server,
// not as a signed-in end user), which is exactly why every route that uses
// it is locked behind requireOwner (see middleware/requireOwner.js) instead.

const admin = require('firebase-admin');

function loadServiceAccount() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_BASE64 is not set. See server/README.md ' +
      '"1. Firebase service account" for how to create and encode it.'
    );
  }
  let json;
  try {
    json = Buffer.from(b64, 'base64').toString('utf8');
  } catch (e) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is not valid base64.');
  }
  try {
    return JSON.parse(json);
  } catch (e) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_BASE64 decoded, but is not valid JSON — ' +
      're-encode the exact service account key file Firebase gave you, with nothing added or removed.'
    );
  }
}

if (!admin.apps.length) {
  const serviceAccount = loadServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
