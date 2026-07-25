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
 * CLIENT-SIDE CHANGE NEEDED: your app's callGeminiAI() (and its duplicated
 * inline copies) currently fetch generativelanguage.googleapis.com directly.
 * Replace those with a call to this function instead — see the accompanying
 * client-callgeminiai-replacement.js file for the drop-in replacement.
 * ============================================================================
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

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
