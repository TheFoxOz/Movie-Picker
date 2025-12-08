/**
 * Environment Configuration
 * Loads from Vite environment variables (.env.local)
 * 
 * SECURITY: Never hardcode API keys here!
 * All keys are loaded from import.meta.env (populated by Vite from .env.local)
 */

// Validate required environment variables
const requiredVars = [
    'VITE_TMDB_API_KEY',
    'VITE_DTD_API_KEY',
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID'
];

const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    console.error('📝 Copy .env.example to .env.local and fill in your keys');
    // ✅ FIX: Changed backticks to parentheses
    throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
}

export const ENV = {
    // TMDB API Configuration
    TMDB_API_KEY: import.meta.env.VITE_TMDB_API_KEY,
    
    // DoesTheDogDie API Configuration
    DTD_API_KEY: import.meta.env.VITE_DTD_API_KEY,
    
    // Firebase Configuration
    FIREBASE: {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
    },
    
    // Feature Flags
    ENABLE_AVAILABILITY: import.meta.env.VITE_ENABLE_AVAILABILITY === 'true',
    ENABLE_TRIGGER_WARNINGS: import.meta.env.VITE_ENABLE_TRIGGER_WARNINGS === 'true',
    DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE === 'true',
    
    // API Configuration
    DDD_PROXY_URL: import.meta.env.VITE_DDD_PROXY_URL || '/api/ddd-proxy',
    APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0'
};

// Debug logging in development
if (ENV.DEBUG_MODE) {
    console.log('[ENV] Configuration loaded:', {
        TMDB_API_KEY: ENV.TMDB_API_KEY ? '✓ Set' : '✗ Missing',
        DTD_API_KEY: ENV.DTD_API_KEY ? '✓ Set' : '✗ Missing',
        FIREBASE: ENV.FIREBASE.apiKey ? '✓ Set' : '✗ Missing',
        FEATURES: {
            availability: ENV.ENABLE_AVAILABILITY,
            triggerWarnings: ENV.ENABLE_TRIGGER_WARNINGS
        }
    });
}
