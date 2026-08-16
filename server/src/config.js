'use strict';

function csv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const config = Object.freeze({
  port: Number(process.env.PORT || 10000),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || '',
  mongoDbName: process.env.MONGODB_DB_NAME || 'reminder_demo5',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  firebasePrivateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  frontendOrigins: csv(process.env.FRONTEND_ORIGINS || 'http://localhost:3000,http://localhost:5000,http://localhost:5173,http://127.0.0.1:5500'),
  ownerUids: csv(process.env.OWNER_UIDS),
  ownerEmails: csv(process.env.OWNER_EMAILS).map((email) => email.toLowerCase())
});

module.exports = { config, csv };
