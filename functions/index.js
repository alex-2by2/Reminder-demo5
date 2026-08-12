/**
 * Master Reminder App — Cloud Functions
 * ============================================================================
 * Server-side Gemini AI proxy.
 *
 * WHY THIS EXISTS: the client code previously called Google's Gemini API
 * directly from the browser, which meant every single user had to create
 * their own Google AI Studio account, generate their own API key, and paste
 * it into Settings before any AI feature would work. That's fine for one
 * developer testing their own app; it's not something a real user base will
 * ever do. This function holds ONE API key (yours, stored as a secret — never
 * shipped to the browser), verifies the caller is a logged-in user via
 * Firebase Auth, enforces a daily per-user limit so one account can't run up
 * your entire Gemini bill, and returns the result.
 *
 * DEPLOY:
 *   firebase functions:secrets:set GEMINI_API_KEY
 *   firebase deploy --only functions
 *
 * CLIENT-SIDE STATUS: already migrated. js/04-ai-features-calendar.js's
 * callGeminiAI() calls this function via functions.httpsCallable('callGeminiProxy')
 * — there is no direct generativelanguage.googleapis.com call left in the
 * client, and no API key ships to the browser. Nothing further to do here.
 * ============================================================================
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10, region: "us-central1" });

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const DAILY_LIMIT = 50; // calls per user per day — generous for real use, cheap to raise/lower later
const MAX_PROMPT_CHARS = 8000; // defensive cap so nobody can send a huge prompt and inflate cost

function todayStr() {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD (UTC)
}

/**
 * Atomically checks-and-increments today's usage count for this user.
 * Throws HttpsError('resource-exhausted') if they're over the daily limit.
 */
async function checkAndIncrementUsage(uid) {
  const ref = db.collection("ai_usage").doc(uid);
  const today = todayStr();

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const data = doc.exists ? doc.data() : null;

    if (!data || data.date !== today) {
      // First call today (or first call ever) — reset the counter.
      tx.set(ref, { date: today, count: 1 });
      return;
    }

    if (data.count >= DAILY_LIMIT) {
      throw new HttpsError(
        "resource-exhausted",
        `Daily AI limit reached (${DAILY_LIMIT}/day). Try again tomorrow.`
      );
    }

    tx.update(ref, { count: data.count + 1 });
  });
}

exports.callGeminiProxy = onCall(
  { secrets: [GEMINI_API_KEY] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in to use AI features.");
    }

    const prompt = request.data?.prompt;
    if (!prompt || typeof prompt !== "string") {
      throw new HttpsError("invalid-argument", "Missing prompt.");
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
      throw new HttpsError("invalid-argument", `Prompt too long (max ${MAX_PROMPT_CHARS} characters).`);
    }

    await checkAndIncrementUsage(request.auth.uid);

    const apiKey = GEMINI_API_KEY.value();
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    const data = await response.json();
    if (data.error) {
      throw new HttpsError("internal", data.error.message || "Gemini API error.");
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new HttpsError("internal", "Gemini returned an empty response.");
    }

    return { text: text.trim() };
  }
);

/**
 * ============================================================================
 * WEB PUSH — scheduled reminder sender.
 * ============================================================================
 * Runs every 5 minutes, scans every user's `reminders` array for anything due
 * in the next 5-minute window that hasn't already been pushed, and sends a
 * Firebase Cloud Messaging push to every token they've registered (see
 * js/09-new-features/11-web-push.js). Reads db.collection("users") directly
 * via the Admin SDK, which bypasses Firestore rules entirely (that's fine —
 * rules only govern client access, not server code you control).
 *
 * COST/SCALE NOTE: this does a full collection scan every 5 minutes. Fine for
 * a personal app or a few hundred users; if this app grows into the tens of
 * thousands of users, this should move to per-user scheduling (e.g. a
 * Firestore-triggered function that schedules a one-off Cloud Task per
 * reminder) instead of a blanket poll. Flagging that now rather than
 * pretending this scales infinitely.
 *
 * DEPLOY: firebase deploy --only functions
 * ============================================================================
 */
exports.sendDueReminderPushes = onSchedule("every 5 minutes", async () => {
  const now = Date.now();
  const windowEnd = now + 5 * 60 * 1000;

  const usersSnap = await db.collection("users").get();
  const messaging = admin.messaging();

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const tokens = data.fcmTokens;
    const reminders = data.reminders;
    if (!tokens || !tokens.length || !reminders || !reminders.length) continue;

    const due = reminders.filter((r) => {
      if (r.archived || r.status === "completed" || r.pushSent) return false;
      if (!r.time) return false;
      const t = new Date(r.time).getTime();
      return t >= now && t <= windowEnd;
    });
    if (!due.length) continue;

    for (const reminder of due) {
      const message = {
        notification: {
          title: "⏰ " + (reminder.task || "Reminder"),
          body: (reminder.notes || "").replace(/<[^>]*>/g, "").slice(0, 150),
        },
        data: { reminderId: String(reminder.id) },
        tokens,
      };
      try {
        await messaging.sendEachForMulticast(message);
      } catch (e) {
        // A bad/expired token shouldn't block the others — log and continue.
        console.error("Push send failed for user", doc.id, e.message);
      }
    }

    // Mark sent so the next run (5 min later) doesn't re-notify the same reminders.
    const updated = reminders.map((r) =>
      due.some((d) => d.id === r.id) ? Object.assign({}, r, { pushSent: true }) : r
    );
    await doc.ref.update({ reminders: updated });
  }
});

/**
 * ============================================================================
 * PAYMENT GATEWAY — Razorpay (chosen for UPI/card/netbanking support for
 * Indian users; swap provider here if you'd rather use Stripe/PayPal instead).
 * ============================================================================
 * SETUP YOU NEED TO DO — this code cannot function without your own keys:
 *   1. Create a Razorpay account: https://dashboard.razorpay.com/signup
 *   2. Get your Key ID + Key Secret from Settings -> API Keys.
 *   3. firebase functions:secrets:set RAZORPAY_KEY_ID
 *      firebase functions:secrets:set RAZORPAY_KEY_SECRET
 *   4. Put the Key ID (not the secret) into js/09-new-features/13-payments.js
 *      (RAZORPAY_KEY_ID constant) — the key ID is meant to be public, the
 *      secret never is and never leaves this file.
 *   5. npm install razorpay --save   (inside functions/)
 *   6. firebase deploy --only functions
 * ============================================================================
 */
const RAZORPAY_KEY_ID = defineSecret("RAZORPAY_KEY_ID");
const RAZORPAY_KEY_SECRET = defineSecret("RAZORPAY_KEY_SECRET");
const PRO_PRICE_PAISE = 49900; // ₹499/year — change to whatever you're charging (amount is in paise)

exports.createRazorpayOrder = onCall(
  { secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
    const Razorpay = require("razorpay");
    const instance = new Razorpay({ key_id: RAZORPAY_KEY_ID.value(), key_secret: RAZORPAY_KEY_SECRET.value() });
    const order = await instance.orders.create({
      amount: PRO_PRICE_PAISE,
      currency: "INR",
      receipt: "pro_" + request.auth.uid + "_" + Date.now(),
      notes: { uid: request.auth.uid }
    });
    return { orderId: order.id, amount: order.amount, currency: order.currency, keyId: RAZORPAY_KEY_ID.value() };
  }
);

exports.verifyRazorpayPayment = onCall(
  { secrets: [RAZORPAY_KEY_SECRET] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
    const { orderId, paymentId, signature } = request.data || {};
    if (!orderId || !paymentId || !signature) throw new HttpsError("invalid-argument", "Missing payment details.");

    const expected = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET.value())
      .update(orderId + "|" + paymentId)
      .digest("hex");
    if (expected !== signature) throw new HttpsError("permission-denied", "Payment signature mismatch — cannot verify.");

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1-year Pro validity — matches PRO_PRICE_PAISE above

    await db.collection("users").doc(request.auth.uid).update({
      isProUser: true,
      proExpiresAt: expiresAt.toISOString()
    });
    await db.collection("users").doc(request.auth.uid).collection("payments").add({
      orderId, paymentId, amount: PRO_PRICE_PAISE, currency: "INR", status: "success", createdAt: new Date().toISOString()
    });

    return { success: true, proExpiresAt: expiresAt.toISOString() };
  }
);

/**
 * ============================================================================
 * REFERRAL SYSTEM — credits both sides of a referral. Runs server-side (not
 * client Firestore writes) because a referrer's document belongs to a
 * DIFFERENT uid than the caller, and firestore.rules correctly forbids one
 * user writing another user's document directly — this function uses the
 * Admin SDK to do it safely, after validating the code really exists.
 * ============================================================================
 */
exports.applyReferral = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
  const referralCode = (request.data && request.data.referralCode || "").trim().toUpperCase();
  if (!referralCode) throw new HttpsError("invalid-argument", "Missing referral code.");

  const newUserRef = db.collection("users").doc(request.auth.uid);
  const newUserDoc = await newUserRef.get();
  if (newUserDoc.exists && newUserDoc.data().referredBy) {
    throw new HttpsError("already-exists", "Referral already applied to this account.");
  }

  const matches = await db.collection("public_profiles").where("uniqueId", "==", referralCode).limit(1).get();
  if (matches.empty) throw new HttpsError("not-found", "Referral code not found.");
  const referrerUid = matches.docs[0].id;
  if (referrerUid === request.auth.uid) throw new HttpsError("invalid-argument", "You can't refer yourself.");

  const REFERRER_BONUS = 50;
  const NEW_USER_BONUS = 20;

  await db.runTransaction(async (tx) => {
    const referrerRef = db.collection("users").doc(referrerUid);
    const referrerDoc = await tx.get(referrerRef);
    const referrerCoins = (referrerDoc.data() && referrerDoc.data().coinBalance) || 0;
    const newUserCoins = (newUserDoc.data() && newUserDoc.data().coinBalance) || 0;

    tx.update(referrerRef, {
      coinBalance: referrerCoins + REFERRER_BONUS,
      referralCount: admin.firestore.FieldValue.increment(1)
    });
    tx.update(newUserRef, {
      coinBalance: newUserCoins + NEW_USER_BONUS,
      referredBy: referrerUid
    });
  });

  return { success: true, bonusEarned: NEW_USER_BONUS };
});
