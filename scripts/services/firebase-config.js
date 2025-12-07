/**
 * Firebase Configuration
 * v8 SDK with Offline Persistence
 * Compatible with CDN-loaded Firebase
 */

// Firebase v8 is loaded from CDN in index.html
// It's available as a global: window.firebase

const firebaseConfig = {
    apiKey: "AIzaSyDTCfzxBvYDRCB5LmLaTm5NrBZMkEb52yE",
    authDomain: "movie-picker-19390.firebaseapp.com",
    projectId: "movie-picker-19390",
    storageBucket: "movie-picker-19390.firebasestorage.app",
    messagingSenderId: "688022829806",
    appId: "1:688022829806:web:e09ca9dd27fd1b5ddb8d21",
    measurementId: "G-K6HV5HFNF0"
};

// Initialize Firebase (use global firebase from CDN)
if (!window.firebase) {
    console.error('[Firebase] Firebase SDK not loaded! Check index.html');
}

const app = window.firebase.initializeApp(firebaseConfig);

// Get services from global firebase
export const auth = window.firebase.auth();
export const db = window.firebase.firestore();
export const firebase = window.firebase;

// ✨ ENABLE OFFLINE PERSISTENCE
// This allows the app to work offline and sync when back online
try {
    db.enablePersistence({ synchronizeTabs: true })
        .then(() => {
            console.log('[Firebase] ✅ Offline persistence enabled');
        })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                // Multiple tabs open, persistence can only be enabled in one tab at a time
                console.warn('[Firebase] ⚠️ Multiple tabs open - persistence disabled');
            } else if (err.code === 'unimplemented') {
                // Browser doesn't support persistence
                console.warn('[Firebase] ⚠️ Browser doesn\'t support offline persistence');
            } else {
                console.error('[Firebase] Persistence error:', err);
            }
        });
} catch (err) {
    console.error('[Firebase] Error setting up persistence:', err);
}

// Settings for better offline experience
db.settings({
    cacheSizeBytes: window.firebase.firestore.CACHE_SIZE_UNLIMITED
});

console.log('[Firebase] Initialized successfully with v8 SDK');
