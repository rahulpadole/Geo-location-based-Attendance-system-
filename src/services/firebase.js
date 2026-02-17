/**
 * Firebase Configuration for React App
 * 
 * This file uses ES6 import/export for the React application
 */

import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// Your Firebase configuration - Using your actual credentials
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyCZHXBPSnC5kQJvw3L2BUl2Tm0fZJzPye8",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "geo-attendance-3c37e.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "geo-attendance-3c37e",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "geo-attendance-3c37e.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "198396136820",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:198396136820:web:3744718999bc8f2a4bb021"
};

// Log Firebase config (without sensitive data) for debugging
console.log("🔥 Initializing Firebase with project:", firebaseConfig.projectId);
console.log("📦 Storage Bucket:", firebaseConfig.storageBucket);

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Optional: Connect to emulators for local development
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_FIREBASE_EMULATORS === 'true') {
  console.log("🔧 Connecting to Firebase Emulators...");
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
}

console.log("✅ Firebase initialized successfully");

export default app;