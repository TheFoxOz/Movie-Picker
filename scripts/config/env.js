/**
 * Environment Configuration
 * API keys and configuration settings
 */

export const ENV = {
    // TMDB API (you should already have these)
    TMDB_API_KEY: 'YOUR_TMDB_API_KEY',  // Replace with your actual TMDB key
    TMDB_API_TOKEN: 'YOUR_TMDB_TOKEN',  // Replace with your actual TMDB token
    
    // DoesTheDogDie API
    DTD_API_KEY: '8422ca0f3512e1d0cb973215099d0f20',
    
    // Streaming Availability API (optional - for Phase 2 upgrade)
    SA_API_KEY: null,  // Leave null to use free TMDB provider
    
    // Feature flags
    ENABLE_AVAILABILITY: true,
    ENABLE_TRIGGER_WARNINGS: true,
    
    // Cache settings
    AVAILABILITY_CACHE_DURATION: 3600000,    // 1 hour
    TRIGGER_WARNING_CACHE_DURATION: 86400000, // 24 hours
    
    // Debug mode
    DEBUG_MODE: true
};

/**
 * Get availability provider type
 * Returns 'tmdb' (free) or 'streaming-availability' (premium)
 */
export function getAvailabilityProvider() {
    return ENV.SA_API_KEY ? 'streaming-availability' : 'tmdb';
}

/**
 * Validate environment configuration
 */
export function validateEnv() {
    const errors = [];
    
    if (!ENV.TMDB_API_KEY || ENV.TMDB_API_KEY === 'YOUR_TMDB_API_KEY') {
        errors.push('TMDB_API_KEY not configured');
    }
    
    if (!ENV.DTD_API_KEY) {
        errors.push('DTD_API_KEY not configured');
    }
    
    if (errors.length > 0) {
        console.error('[ENV] Configuration errors:', errors);
        return false;
    }
    
    console.log('[ENV] Configuration valid ✓');
    console.log('[ENV] Availability provider:', getAvailabilityProvider());
    return true;
}
