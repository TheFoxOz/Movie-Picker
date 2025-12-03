/**
 * Firebase Configuration and Initialization
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';

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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { app, auth, db, analytics };
