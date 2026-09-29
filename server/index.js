"use strict";

const express = require("express");
const rateLimit = require("express-rate-limit");
const admin = require("firebase-admin");
const helmet = require("helmet");

const PORT = Number(process.env.PORT) || 3000;
const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 100;

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function createApp({ auth, db, frontendOrigins = [] }) {
  const app = express();
  const allowedOrigins = new Set(frontendOrigins);

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "32kb" }));
  app.use((req, res, next) => {
    const origin = req.get("origin");
    res.vary("Origin");
    if (origin && !allowedOrigins.has(origin)) {
      return res.status(403).json({ error: "Origin not allowed." });
    }
    if (origin) {
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.set("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
  app.use("/api", rateLimit({ windowMs: 60 * 1000, limit: 120 }));

  app.get("/", (_req, res) => {
    res.json({ name: "Reminder Demo Admin API", health: "/health" });
  });
  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  async function requireOwner(req, res, next) {
    const match = /^Bearer\s+([^\s]+)$/i.exec(req.get("authorization") || "");
    if (!match) return res.status(401).json({ error: "Sign-in required." });

    try {
      const decoded = await auth.verifyIdToken(match[1], true);
      const ownerUids = splitList(process.env.OWNER_UIDS);
      const ownerEmails = splitList(process.env.OWNER_EMAILS).map((email) => email.toLowerCase());
      const isOwnerUid = ownerUids.includes(decoded.uid);
      const isVerifiedOwnerEmail = decoded.email_verified === true
        && ownerEmails.includes(String(decoded.email || "").toLowerCase());
      if (!isOwnerUid && !isVerifiedOwnerEmail) {
        return res.status(403).json({ error: "Owner access required." });
      }
      req.owner = { uid: decoded.uid };
      next();
    } catch (_error) {
      res.status(401).json({ error: "Invalid or expired sign-in token." });
    }
  }

  app.use("/api/admin", requireOwner);

  app.get("/api/admin/overview", async (_req, res, next) => {
    try {
      const [users, proUsers, crashReports, referrals, payments] = await Promise.all([
        db.collection("users").count().get(),
        db.collection("users").where("isProUser", "==", true).count().get(),
        db.collection("crash_reports").count().get(),
        db.collection("users").where("referralCount", ">", 0).count().get(),
        db.collectionGroup("payments").select("amount", "status").get(),
      ]);
      const totalUsers = users.data().count;
      const proUserCount = proUsers.data().count;
      const successfulPayments = payments.docs.filter((doc) => doc.get("status") === "success");
      const revenuePaise = successfulPayments.reduce((sum, doc) => {
        const amount = doc.get("amount");
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0);

      res.json({
        totalUsers,
        proUsers: proUserCount,
        freeUsers: Math.max(0, totalUsers - proUserCount),
        crashReports: crashReports.data().count,
        referredUsers: referrals.data().count,
        successfulPayments: successfulPayments.length,
        revenuePaise,
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/users", async (req, res, next) => {
    try {
      const limit = parseLimit(req.query.limit, PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX);
      const page = await auth.listUsers(limit, req.query.pageToken || undefined);
      const refs = page.users.map((user) => db.collection("users").doc(user.uid));
      const profiles = refs.length ? await db.getAll(...refs) : [];
      const users = page.users.map((user, index) => {
        const profile = profiles[index].exists ? profiles[index].data() : {};
        return {
          uid: user.uid,
          email: user.email || null,
          displayName: user.displayName || profile.userName || null,
          emailVerified: user.emailVerified,
          disabled: user.disabled,
          createdAt: user.metadata.creationTime || null,
          isProUser: profile.isProUser === true,
          joinedAt: profile.joinedAt || null,
          referralCount: Number(profile.referralCount) || 0,
        };
      });
      res.json({ users, nextPageToken: page.pageToken || null });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/admin/users/:uid", async (req, res, next) => {
    if (typeof req.body.disabled !== "boolean") {
      return res.status(400).json({ error: "Expected a boolean 'disabled' value." });
    }
    if (req.params.uid === req.owner.uid && req.body.disabled) {
      return res.status(400).json({ error: "You cannot disable your own owner account." });
    }
    try {
      const user = await auth.updateUser(req.params.uid, { disabled: req.body.disabled });
      res.json({ uid: user.uid, disabled: user.disabled });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/crash-reports", async (req, res, next) => {
    try {
      const limit = parseLimit(req.query.limit, 50, PAGE_SIZE_MAX);
      let query = db.collection("crash_reports").orderBy("ts", "desc").limit(limit);
      if (req.query.cursor) {
        const cursorId = Buffer.from(String(req.query.cursor), "base64url").toString("utf8");
        if (!/^[A-Za-z0-9_-]+$/.test(cursorId)) {
          return res.status(400).json({ error: "Invalid cursor." });
        }
        const cursor = await db.collection("crash_reports").doc(cursorId).get();
        if (!cursor.exists) return res.status(400).json({ error: "Invalid cursor." });
        query = query.startAfter(cursor);
      }
      const snapshot = await query.get();
      const reports = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const last = snapshot.docs[snapshot.docs.length - 1];
      res.json({ reports, nextCursor: last ? Buffer.from(last.id).toString("base64url") : null });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/referrals", async (req, res, next) => {
    try {
      const limit = parseLimit(req.query.limit, 20, PAGE_SIZE_MAX);
      const snapshot = await db.collection("users")
        .where("referralCount", ">", 0)
        .orderBy("referralCount", "desc")
        .limit(limit)
        .get();
      res.json({ referrals: snapshot.docs.map((doc) => ({
        uid: doc.id,
        displayName: doc.get("userName") || null,
        referralCount: Number(doc.get("referralCount")) || 0,
      })) });
    } catch (error) {
      next(error);
    }
  });

  app.use((_req, res) => res.status(404).json({ error: "Not found." }));
  app.use((error, _req, res, _next) => {
    console.error("Admin API request failed:", error.message);
    res.status(500).json({ error: "The request could not be completed." });
  });

  return app;
}

function parseLimit(value, fallback, maximum) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

function initializeAdmin() {
  if (admin.apps.length) return;
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    throw new Error("Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.");
  }
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
    projectId: FIREBASE_PROJECT_ID,
  });
}

if (require.main === module) {
  initializeAdmin();
  const app = createApp({
    auth: admin.auth(),
    db: admin.firestore(),
    frontendOrigins: splitList(process.env.FRONTEND_ORIGINS),
  });
  app.listen(PORT, "0.0.0.0", () => console.log(`Admin API listening on port ${PORT}`));
}

module.exports = { createApp, parseLimit, splitList };