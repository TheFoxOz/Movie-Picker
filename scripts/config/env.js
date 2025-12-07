/**
 * Environment Configuration
 * 
 * SETUP INSTRUCTIONS:
 * 1. This file is gitignored for security
 * 2. Add your API keys below
 * 3. NEVER commit this file to Git!
 */

export const ENV = {
    // TMDB API
    // Get from: https://www.themoviedb.org/settings/api
    TMDB_API_KEY: 'YOUR_TMDB_API_KEY_HERE',
    TMDB_API_TOKEN: 'YOUR_TMDB_TOKEN_HERE',
    
    // DoesTheDogDie API
    // IMPORTANT: Get a NEW key (revoke the old exposed one!)
    // Get from: https://www.doesthedogdie.com/api/
    DTD_API_KEY: 'YOUR_NEW_DTD_API_KEY_HERE',
    
    // Streaming Availability API (optional - for future)
    SA_API_KEY: null,
    
    // Feature flags
    ENABLE_AVAILABILITY: true,
    ENABLE_TRIGGER_WARNINGS: true,
    
    // Cache settings
    AVAILABILITY_CACHE_DURATION: 3600000,    // 1 hour
    TRIGGER_WARNING_CACHE_DURATION: 86400000, // 24 hours
    
    // Debug mode
    DEBUG_MODE: true
};

export function getAvailabilityProvider() {
    return ENV.SA_API_KEY ? 'streaming-availability' : 'tmdb';
}

export function validateEnv() {
    const errors = [];
    
    if (!ENV.TMDB_API_KEY || ENV.TMDB_API_KEY === 'fb172ed62b2cd58897d484ad8ba0cf60') {
        errors.push('TMDB_API_KEY not configured');
    }
    
    if (!ENV.DTD_API_KEY || ENV.DTD_API_KEY === '8422ca0f3512e1d0cb973215099d0f20') {
        errors.push('DTD_API_KEY not configured - Please get a NEW key!');
    }
    
    if (errors.length > 0) {
        console.error('[ENV] ❌ Configuration errors:', errors);
        console.error('[ENV] Please update scripts/config/env.js with your API keys');
        return false;
    }
    
    console.log('[ENV] ✅ Configuration valid');
    console.log('[ENV] Availability provider:', getAvailabilityProvider());
    return true;
}
