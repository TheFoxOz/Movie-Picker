/**
 * Firebase Configuration and Initialization
 * Using Firebase v9 Compat SDK
 */

// Import Firebase v9.6.1 compat
import firebase from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js';
import 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js';
import 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js';

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

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Export Firebase services with proper named exports
export const auth = firebase.auth();
export const db = firebase.firestore();
export { firebase };

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
