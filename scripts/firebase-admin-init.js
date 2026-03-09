// scripts/firebase-admin-init.js
// Shared Firebase Admin SDK initialization for standalone scripts.
// Usage: const { adminDb } = require("./firebase-admin-init");

const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const path = require("path");

// Load .env.local from project root
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

let app;
if (!getApps().length) {
  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
} else {
  app = getApps()[0];
}

const adminDb = getFirestore(app);

module.exports = { adminDb };
