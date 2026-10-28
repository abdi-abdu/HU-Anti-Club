/**
 * Cloud Functions for HU Anti-Drug Club
 * --------------------------------------
 * Server-side logic for the Anti-Drug Club backend.
 *
 * Install dependencies before deploying:
 *   cd backend/functions && npm install
 *
 * Deploy:
 *   cd backend && firebase deploy --only functions
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * Triggered when a new anonymous help message is submitted.
 * Can be extended to send notifications to counselors/admins.
 */
exports.onAnonymousMessage = onDocumentCreated(
  "anonymousMessages/{messageId}",
  (event) => {
    const messageData = event.data?.data();
    console.log("New anonymous message received:", messageData?.subject);
    // TODO: Add notification logic (email, push, etc.)
  }
);

/**
 * Triggered when a new user registers.
 * Can be extended to send a welcome email or notify admins of pending approval.
 */
exports.onUserCreate = onDocumentCreated(
  "users/{userId}",
  (event) => {
    const userData = event.data?.data();
    console.log("New user registered:", userData?.fullName);
    // TODO: Add admin notification logic
  }
);
