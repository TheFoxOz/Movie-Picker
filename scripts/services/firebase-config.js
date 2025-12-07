/**
 * Firebase Configuration
 * Loads config from env.js (secure, gitignored)
 */

import { ENV } from '../config/env.js';

// Validate Firebase is loaded from CDN
if (typeof window.firebase === 'undefined') {
    throw new Error('[Firebase] Firebase SDK not loaded! Check index.html');
}

const firebaseInstance = window.firebase;

// Initialize Firebase with config from env.js
const app = firebaseInstance.initializeApp(ENV.FIREBASE);

// Get services
const db = firebaseInstance.firestore();
const auth = firebaseInstance.auth();

// Configure Firestore settings
db.settings({
    cacheSizeBytes: firebaseInstance.firestore.CACHE_SIZE_UNLIMITED
});

// Enable offline persistence
try {
    db.enablePersistence({ synchronizeTabs: true })
        .then(() => {
            console.log('[Firebase] ✅ Offline persistence enabled');
        })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('[Firebase] ⚠️ Multiple tabs - persistence disabled');
            } else if (err.code === 'unimplemented') {
                console.warn('[Firebase] ⚠️ Browser doesn\'t support persistence');
            } else {
                console.error('[Firebase] Persistence error:', err);
            }
        });
} catch (err) {
    console.error('[Firebase] Error setting up persistence:', err);
}

// Export services
export { auth, db, firebase as firebaseInstance };
export const firebase = firebaseInstance;

console.log('[Firebase] Initialized successfully');
