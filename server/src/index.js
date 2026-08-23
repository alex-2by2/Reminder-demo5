require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { createRequireOwner } = require('./middleware/requireOwner');
const { auth: adminAuth } = require('./firebaseAdmin');
const dashboardRoutes = require('./routes/dashboard');
const usersRoutes = require('./routes/users');
const crashReportsRoutes = require('./routes/crashReports');
const referralsRoutes = require('./routes/referrals');
const auditLogRoutes = require('./routes/auditLog');

const requireOwner = createRequireOwner({
  verifyIdToken: (token) => adminAuth.verifyIdToken(token),
  ownerUid: process.env.OWNER_UID,
  ownerEmail: process.env.OWNER_EMAIL,
});

const app = express();
app.set('trust proxy', 1); // Render sits behind a proxy; needed for correct req.ip / rate limiting

// ---- Security headers -------------------------------------------------------
// A relaxed-enough CSP to let the bundled admin.html (public/) load the
// Firebase client SDK from its CDN and call this API from the browser.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://www.gstatic.com'],
        connectSrc: ["'self'", 'https://*.googleapis.com', 'https://*.firebaseio.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
      },
    },
  })
);

// ---- CORS --------------------------------------------------------------------
// Requests with no Origin header (curl, server-to-server, and the bundled
// admin.html when it's served by this same app — same-origin requests don't
// carry a CORS-relevant Origin the browser restricts) are always allowed.
// Cross-origin browser requests are only allowed from ADMIN_ORIGIN, and if
// that's unset, nothing cross-origin is allowed at all — restrictive by
// default, matching "backend access: owner only."
const allowedOrigins = (process.env.ADMIN_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
  })
);

app.use(express.json({ limit: '100kb' }));

// ---- Rate limiting -----------------------------------------------------------
// Generous enough for normal dashboard use (loading the dashboard fires a
// handful of requests at once), tight enough to blunt brute-forcing or
// scripted abuse against a publicly-reachable Render URL.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ---- Minimal request log (stdout — Render captures this in its Logs tab) ----
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// ---- Public: health check, for Render's health checks and uptime pings -----
app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ---- Bundled admin UI (public/admin.html) — served openly; it's just HTML/JS,
// the DATA behind it is what's locked down, by every /api/* route below.
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---- Everything under /api requires a verified owner token ------------------
app.use('/api', requireOwner);

app.get('/api/whoami', (req, res) => res.json({ ownerUid: req.ownerUid }));
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/crash-reports', crashReportsRoutes);
app.use('/api/referrals', referralsRoutes);
app.use('/api/audit-log', auditLogRoutes);

// ---- 404 + error handler -----------------------------------------------------
app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Admin server listening on port ${PORT}`);
});
