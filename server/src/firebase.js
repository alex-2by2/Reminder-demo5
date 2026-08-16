'use strict';

const admin = require('firebase-admin');
const { config } = require('./config');

function hasServiceAccountConfig() {
  return Boolean(config.firebaseProjectId && config.firebaseClientEmail && config.firebasePrivateKey);
}

function getFirebaseApp() {
  if (admin.apps.length) return admin.app();

  if (hasServiceAccountConfig()) {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebaseProjectId,
        clientEmail: config.firebaseClientEmail,
        privateKey: config.firebasePrivateKey
      })
    });
  }

  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: config.firebaseProjectId || undefined
  });
}

function getAuth() {
  return getFirebaseApp().auth();
}

module.exports = { getAuth, getFirebaseApp, hasServiceAccountConfig };
