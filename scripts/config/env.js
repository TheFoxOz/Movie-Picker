/**
 * Environment Configuration
 * Loads from Vite environment variables (.env.local)
 * 
 * SECURITY: Never hardcode API keys here!
 * All keys are loaded from import.meta.env (populated by Vite from .env.local)
 */

// ✅ IMPROVED: Only validate CRITICAL required variables
const criticalVars = [
    'VITE_TMDB_API_KEY',
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID'
];

// Check for missing critical variables
const missingVars = criticalVars.filter(varName => {
    const value = import.meta.env[varName];
    return !value || value === '' || value === 'undefined';
});

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    console.error('📝 Steps to fix:');
    console.error('   1. Copy .env.example to .env.local');
    console.error('   2. Fill in your API keys');
    console.error('   3. Restart the dev server (Ctrl+C then npm run dev)');
    console.error('');
    console.error('   Current env values:', {
        TMDB: import.meta.env.VITE_TMDB_API_KEY ? '✓ Set' : '✗ Missing',
        Firebase: import.meta.env.VITE_FIREBASE_API_KEY ? '✓ Set' : '✗ Missing',
        DTD: import.meta.env.VITE_DTD_API_KEY ? '✓ Set' : '⚠ Optional'
    });
    
    // ✅ FIX: Use parentheses instead of backticks
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}. Check console for details.`);
}

export const ENV = {
    // TMDB API Configuration
    TMDB_API_KEY: import.meta.env.VITE_TMDB_API_KEY,
    
    // DoesTheDogDie API Configuration (OPTIONAL)
    DTD_API_KEY: import.meta.env.VITE_DTD_API_KEY || '',
    
    // Firebase Configuration
    FIREBASE: {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ''
    },
    
    // Feature Flags
    ENABLE_AVAILABILITY: import.meta.env.VITE_ENABLE_AVAILABILITY === 'true',
    ENABLE_TRIGGER_WARNINGS: import.meta.env.VITE_ENABLE_TRIGGER_WARNINGS === 'true',
    DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE === 'true',
    
    // API Configuration
    DDD_PROXY_URL: import.meta.env.VITE_DDD_PROXY_URL || '/api/ddd-proxy',
    APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
    APP_ENV: import.meta.env.VITE_APP_ENV || 'development'
};

// Debug logging in development
if (ENV.DEBUG_MODE || ENV.APP_ENV === 'development') {
    console.log('[ENV] Configuration loaded:', {
        TMDB_API_KEY: ENV.TMDB_API_KEY ? `✓ Set (${ENV.TMDB_API_KEY.substring(0, 8)}...)` : '✗ Missing',
        DTD_API_KEY: ENV.DTD_API_KEY ? `✓ Set (${ENV.DTD_API_KEY.substring(0, 8)}...)` : '⚠ Not set (optional)',
        FIREBASE: ENV.FIREBASE.apiKey ? `✓ Set (${ENV.FIREBASE.apiKey.substring(0, 8)}...)` : '✗ Missing',
        FIREBASE_PROJECT: ENV.FIREBASE.projectId || '✗ Missing',
        FEATURES: {
            availability: ENV.ENABLE_AVAILABILITY,
            triggerWarnings: ENV.ENABLE_TRIGGER_WARNINGS
        },
        DEBUG_MODE: ENV.DEBUG_MODE,
        APP_ENV: ENV.APP_ENV
    });
}

// ✅ HELPFUL: Log reminder if running in development without proper setup
if (ENV.APP_ENV === 'development' && (!ENV.TMDB_API_KEY || !ENV.FIREBASE.apiKey)) {
    console.warn('⚠️ Running in development mode without all API keys set!');
    console.warn('📝 Create a .env.local file with your API keys to get started.');
}
