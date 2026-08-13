# Setup Checklist — things only you can do

Everything else is done in code. These are the manual steps across the 17
features that need your own accounts/keys — nothing here works until you do
these.

## 1. Deploy the updated Cloud Functions & rules
```
firebase deploy --only firestore:rules
firebase deploy --only functions
```

## 2. Web Push Notifications (#11)
1. Firebase Console → Project Settings → Cloud Messaging → generate a
   "Web Push certificate" (VAPID key).
2. Paste it into `FCM_VAPID_KEY` in `js/09-new-features/11-web-push.js`.
3. Redeploy functions (step 1) — this is what runs `sendDueReminderPushes`
   every 5 minutes.

## 3. Payment Gateway (#13) + Subscription (#14) + Free Tier (#15)
1. Create a Razorpay account: https://dashboard.razorpay.com/signup
2. Get your **Key ID** and **Key Secret** from Settings → API Keys.
3. ```
   firebase functions:secrets:set RAZORPAY_KEY_ID
   firebase functions:secrets:set RAZORPAY_KEY_SECRET
   ```
4. Paste the **Key ID only** (never the secret) into `RAZORPAY_KEY_ID` in
   `js/09-new-features/13-payments.js`.
5. ```
   cd functions && npm install razorpay --save
   ```
6. Redeploy functions (step 1).
7. Price is ₹499/year, set in `functions/index.js`'s `PRO_PRICE_PAISE` —
   change that one constant if you want a different price.

## 4. App Store Listing (#12)
See `store-listing-copy.md` — packaging (TWA/Capacitor), listing copy, and
the two placeholder store links to fill in once you're actually listed
(`js/09-new-features/17-rating-prompt.js`).

## 5. Everything else (#1–10, 16, 17)
No external accounts needed — works as soon as you paste the files in and
deploy rules/functions (step 1).

## What to verify after deploying
- Sign up a fresh test account → confirm the ToS checkbox is required
- Create a family wallet on one account, join it from another (or a second
  browser profile) using the code
- Try the free-tier limits: add 3 family wallets, 3 webhooks, 16 recipes —
  each should block at its cap with an upgrade prompt
- Once Razorpay is live, do one real ₹499 test payment and confirm the Pro
  badge appears and `users/{uid}/payments` gets a record
