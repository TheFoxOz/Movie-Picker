/**
 * Firebase Configuration (SECURE VERSION)
 * Uses environment variables from Vercel
 * 
 * SECURITY: This file contains NO hardcoded API keys!
 * All secrets are loaded from environment variables.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ENV } from '../config/env.js';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: ENV.FIREBASE.apiKey,
  authDomain: ENV.FIREBASE.authDomain,
  projectId: ENV.FIREBASE.projectId,
  storageBucket: ENV.FIREBASE.storageBucket,
  messagingSenderId: ENV.FIREBASE.messagingSenderId,
  appId: ENV.FIREBASE.appId,
  measurementId: ENV.FIREBASE.measurementId
};

// Validate configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('[Firebase] ❌ Missing configuration!');
  console.error('[Firebase] Set environment variables in Vercel Dashboard');
  throw new Error('Firebase configuration not found in environment variables');
}

// Initialize Firebase
let app, auth, db;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  
  console.log('[Firebase] ✅ Initialized from environment variables');
  console.log('[Firebase] Project:', firebaseConfig.projectId);
  console.log('[Firebase] Auth Domain:', firebaseConfig.authDomain);
  
} catch (error) {
  console.error('[Firebase] ❌ Initialization failed:', error);
  throw error;
}

// Export initialized services
export { auth, db, app };
export default { auth, db, app };
