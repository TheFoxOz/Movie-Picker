/**
 * Firebase Configuration and Initialization
 * Using Firebase v9 Compat SDK for easier integration
 */

// Import Firebase using compat mode (works without build system)
import firebase from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics-compat.js';

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

// Get Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const analytics = firebase.analytics();

export { firebase, auth, db, analytics };
