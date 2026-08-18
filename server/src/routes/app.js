'use strict';

const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const { config } = require('./config');
const { getDb } = require('./db');
const { requireFirebaseUser, requireOwner } = require('./auth');

function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.frontendOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true
  }));

  app.get('/health', async (req, res) => {
    const db = await getDb();
    res.json({ ok: true, database: db ? 'mongodb' : 'not-configured' });
  });

  app.get('/api/public/config', (req, res) => {
    res.json({
      appName: 'Master Reminder App',
      authProvider: 'firebase',
      backend: 'render'
    });
  });

  app.get('/api/me', requireFirebaseUser, (req, res) => {
    res.json({ uid: req.user.uid, email: req.user.email || null });
  });

  app.get('/api/owner/users', requireOwner, async (req, res) => {
    const db = await getDb();
    if (!db) return res.json({ users: [], source: 'mongodb-not-configured' });
    const users = await db.collection('users')
      .find({}, { projection: { email: 1, displayName: 1, createdAt: 1, lastActiveAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    return res.json({ users });
  });

  app.post('/api/owner/announcements', requireOwner, async (req, res) => {
    const { title, message } = req.body || {};
    if (!title || !message) return res.status(400).json({ error: 'title and message are required.' });
    const db = await getDb();
    if (!db) return res.status(503).json({ error: 'MongoDB is not configured.' });
    const now = new Date();
    const result = await db.collection('announcements').insertOne({
      title: String(title).trim(),
      message: String(message).trim(),
      createdBy: req.user.uid,
      createdAt: now,
      updatedAt: now
    });
    return res.status(201).json({ id: result.insertedId.toString() });
  });

  app.use((req, res) => res.status(404).json({ error: 'Not found.' }));
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}

module.exports = { createApp };
