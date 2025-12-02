/**
 * Environment Configuration
 * Reads API keys from window globals (set in index.html)
 * 
 * SECURITY: API keys should be set in index.html using window.__ variables
 */

export const ENV = {
  // TMDB API Configuration
  TMDB_API_KEY: window.__tmdb_api_key || null,
  
  // Firebase Configuration (for future use)
  FIREBASE: {
    apiKey: window.__firebase_api_key || null,
    authDomain: window.__firebase_auth_domain || null,
    projectId: window.__firebase_project_id || null,
    storageBucket: window.__firebase_storage_bucket || null,
    messagingSenderId: window.__firebase_messaging_sender_id || null,
    appId: window.__firebase_app_id || null,
    measurementId: window.__firebase_measurement_id || null
  },
  
  // App Configuration
  APP: {
    name: 'Movie Picker',
    version: '2.0.0',
    environment: 'production'
  }
};

// Validation
const validateEnv = () => {
  const errors = [];
  
  // Check TMDB API Key
  if (!ENV.TMDB_API_KEY) {
    errors.push('TMDB API key not found. Set window.__tmdb_api_key in index.html');
  }
  
  // Log results
  if (errors.length > 0) {
    console.warn('[ENV] ⚠️  Missing environment variables:');
    errors.forEach(error => console.warn(`  - ${error}`));
  } else {
    console.log('[ENV] ✅ Environment configured successfully');
    console.log('[ENV] TMDB API Key:', ENV.TMDB_API_KEY ? '✅ Present' : '❌ Missing');
  }
  
  return errors.length === 0;
};

// Run validation
validateEnv();

// Export for use in other modules
export default ENV;
