"use strict";

const crypto = require("crypto");

const CLAIM_LEASE_MS = 2 * 60 * 1000;

function deliveryDocumentId(reminderId, scheduledAt, token) {
  return crypto.createHash("sha256")
    .update([String(reminderId), String(scheduledAt), String(token)].join("\\0"))
    .digest("hex");
}

function canClaimDelivery(delivery, now) {
  if (!delivery) return true;
  if (delivery.status === "sent") return false;
  return !(delivery.leaseUntil && Number(delivery.leaseUntil) > now);
}

function buildReminderPush(reminder) {
  return {
    notification: {
      title: "⏰ " + (reminder.task || "Reminder"),
      body: String(reminder.notes || "").replace(/<[^>]*>/g, "").slice(0, 150)
    },
    data: { reminderId: String(reminder.id) }
  };
}

module.exports = { CLAIM_LEASE_MS, deliveryDocumentId, canClaimDelivery, buildReminderPush };
