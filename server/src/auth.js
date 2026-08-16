'use strict';

const { config } = require('./config');
const { getAuth } = require('./firebase');

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return /^Bearer$/i.test(scheme) && token ? token : '';
}

function isOwner(decodedToken) {
  const email = String(decodedToken.email || '').toLowerCase();
  return config.ownerUids.includes(decodedToken.uid) || (email && config.ownerEmails.includes(email));
}

async function requireFirebaseUser(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: 'Missing Firebase bearer token.' });
    req.user = await getAuth().verifyIdToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired Firebase token.' });
  }
}

async function requireOwner(req, res, next) {
  await requireFirebaseUser(req, res, () => {
    if (!isOwner(req.user)) {
      return res.status(403).json({ error: 'Owner access required.' });
    }
    return next();
  });
}

module.exports = { getBearerToken, isOwner, requireFirebaseUser, requireOwner };
