/**
 * Firebase Configuration
 * Initialize Firebase services for Movie Picker
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration
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

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log('[Firebase] ✅ Initialized successfully');
console.log('[Firebase] Project:', firebaseConfig.projectId);
