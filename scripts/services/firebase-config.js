/**
 * Firebase Configuration and Initialization
 * Using Firebase v8 (Namespaced SDK) - Works with CDN
 */

// Import Firebase v8 from CDN
import 'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js';
import 'https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js';
import 'https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAGcGmVODn3UF4wuBzEKJlkst8J1Ul8Onw",
  authDomain: "movie-picker-19390.firebaseapp.com",
  projectId: "movie-picker-19390",
  storageBucket: "movie-picker-19390.firebasestorage.app",
  messagingSenderId: "123870382386",
  appId: "1:123870382386:web:a4189b35dd1da0a95bef2b",
  measurementId: "G-5TEXFJFSNR"
};

// Initialize Firebase (v8 attaches to window.firebase)
if (!window.firebase.apps.length) {
  window.firebase.initializeApp(firebaseConfig);
}

// Export Firebase services
export const firebase = window.firebase;
export const auth = firebase.auth();
export const db = firebase.firestore();

// Optional: Analytics
let analytics = null;
try {
  if (typeof firebase.analytics === 'function') {
    analytics = firebase.analytics();
  }
} catch (e) {
  console.log('[Firebase] Analytics not available');
}

export { analytics };

console.log('[Firebase] Initialized successfully with v8 SDK');
