/**
 * Environment Configuration
 * Reads API keys and secrets from environment variables
 * 
 * SECURITY: API keys should NEVER be hardcoded in this file!
 * Set them in Vercel Dashboard → Settings → Environment Variables
 */

export const ENV = {
  // TMDB API Configuration
  TMDB_API_KEY: import.meta.env.VITE_TMDB_API_KEY || 
                window.__tmdb_api_key || 
                null,
  
  // Firebase Configuration
  FIREBASE: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || null,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || null,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || null,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || null,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || null,
    appId: import.meta.env.VITE_FIREBASE_APP_ID || null,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || null
  },
  
  // App Configuration
  APP: {
    name: 'Movie Picker',
    version: '2.0.0',
    environment: import.meta.env.MODE || 'production'
  }
};

// Validation
const validateEnv = () => {
  const errors = [];
  
  // Check TMDB API Key
  if (!ENV.TMDB_API_KEY) {
    errors.push('TMDB API key not found (VITE_TMDB_API_KEY)');
  }
  
  // Check Firebase Config
  const requiredFirebaseKeys = [
    'apiKey', 'authDomain', 'projectId', 
    'storageBucket', 'messagingSenderId', 'appId'
  ];
  
  requiredFirebaseKeys.forEach(key => {
    if (!ENV.FIREBASE[key]) {
      errors.push(`Firebase ${key} not found (VITE_FIREBASE_${key.toUpperCase().replace(/([A-Z])/g, '_$1')})`);
    }
  });
  
  // Log results
  if (errors.length > 0) {
    console.error('[ENV] ❌ Missing environment variables:');
    errors.forEach(error => console.error(`  - ${error}`));
    console.error('[ENV] Set these in Vercel Dashboard → Settings → Environment Variables');
    return false;
  }
  
  console.log('[ENV] ✅ All environment variables loaded successfully');
  console.log('[ENV] Environment:', ENV.APP.environment);
  console.log('[ENV] TMDB API Key:', ENV.TMDB_API_KEY ? '✅ Present' : '❌ Missing');
  console.log('[ENV] Firebase Project:', ENV.FIREBASE.projectId || '❌ Missing');
  
  return true;
};

// Run validation
validateEnv();

// Export for use in other modules
export default ENV;
