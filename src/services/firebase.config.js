/**
 * Firebase Configuration for Node.js Scripts
 * 
 * This file uses CommonJS require() format for Node.js compatibility
 * Used by migration scripts, seed scripts, etc.
 */

const { initializeApp } = require("firebase/app");
const { getFirestore, connectFirestoreEmulator } = require("firebase/firestore");
const { getAuth, connectAuthEmulator } = require("firebase/auth");
const { getStorage, connectStorageEmulator } = require("firebase/storage");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Your Firebase configuration - Using your actual credentials
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyCZHXBPSnC5kQJvw3L2BUl2Tm0fZJzPye8",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "geo-attendance-3c37e.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "geo-attendance-3c37e",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "geo-attendance-3c37e.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "198396136820",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:198396136820:web:3744718999bc8f2a4bb021"
};

// Log for debugging
console.log("🔥 [Node Script] Initializing Firebase with project:", firebaseConfig.projectId);
console.log("📦 [Node Script] Storage Bucket:", firebaseConfig.storageBucket);

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Optional: Connect to emulators for local development
if (process.env.REACT_APP_USE_FIREBASE_EMULATORS === 'true') {
  console.log("🔧 [Node Script] Connecting to Firebase Emulators...");
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectStorageEmulator(storage, 'localhost', 9199);
}

console.log("✅ [Node Script] Firebase initialized successfully");

module.exports = { db, auth, storage, app };