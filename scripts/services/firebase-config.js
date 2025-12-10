// services/firebase-config.js

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';

// Configuration loaded securely from environment variables exposed by Vite
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize and Export Services
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- Offline Persistence (Modern v10+ API) ---
try {
  // Persistence is configured directly on the Firestore service instance (db)
  enableIndexedDbPersistence(db, { synchronizeTabs: true })
    .then(() => {
      console.log('[Firebase] ✅ Offline persistence enabled');
    })
    .catch((err) => {
      // Modern Firebase SDK uses codes like 'resource-exhausted' for multiple tabs
      if (err.code === 'failed-precondition' || err.code === 'resource-exhausted') {
        console.warn('[Firebase] ⚠️ Multiple tabs - persistence disabled or not possible.');
      } else if (err.code === 'unimplemented') {
        console.warn('[Firebase] ⚠️ Browser doesn\'t support persistence');
      } else {
        console.error('[Firebase] Persistence error:', err);
      }
    });
} catch (err) {
  console.error('[Firebase] Error setting up persistence:', err);
}

// NOTE: The cache size setting is no longer necessary in v10 as it's the default behavior.
// If you still need to set it, it's passed during getFirestore initialization options, not via db.settings().

console.log('[Firebase] Initialized successfully');
