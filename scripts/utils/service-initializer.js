/**
 * Service Initialization
 * Sets up all services with proper configuration
 */

import { ENV, getAvailabilityProvider, validateEnv } from '../config/env.js';
import { availabilityService } from '../services/availability-service.js';
import { triggerWarningService } from '../services/trigger-warning-service.js';
import { userProfileService } from '../services/user-profile-revised.js';

export class ServiceInitializer {
    constructor() {
        this.initialized = false;
    }

    /**
     * Initialize all services
     */
    async initialize() {
        if (this.initialized) {
            console.log('[Init] Services already initialized');
            return true;
        }

        console.log('[Init] Starting service initialization...');

        // Step 1: Validate environment
        if (!validateEnv()) {
            console.error('[Init] Environment validation failed');
            alert('Configuration error. Please check your API keys in config/env.js');
            return false;
        }

        try {
            // Step 2: Initialize availability service
            console.log('[Init] Initializing availability service...');
            const provider = getAvailabilityProvider();
            
            if (provider === 'tmdb') {
                availabilityService.initialize('tmdb', ENV.TMDB_API_KEY);
                console.log('[Init] ✓ Using TMDB provider (FREE)');
            } else {
                availabilityService.initialize('streaming-availability', ENV.SA_API_KEY);
                console.log('[Init] ✓ Using Streaming Availability provider (PREMIUM)');
            }

            // Step 3: Initialize trigger warning service
            console.log('[Init] Initializing trigger warning service...');
            triggerWarningService.initialize(ENV.DTD_API_KEY);
            console.log('[Init] ✓ Trigger warning service ready');

            // Step 4: Load user profile
            console.log('[Init] Loading user profile...');
            const profile = userProfileService.getProfile();
            console.log('[Init] ✓ User profile loaded:', {
                region: profile.region,
                platforms: profile.selectedPlatforms.length,
                triggers: profile.triggerWarnings.enabledCategories.length
            });

            // Step 5: Listen for profile updates
            this.setupEventListeners();

            this.initialized = true;
            console.log('[Init] ✓ All services initialized successfully');

            return true;

        } catch (error) {
            console.error('[Init] Failed to initialize services:', error);
            return false;
        }
    }

    /**
     * Setup event listeners for profile changes
     */
    setupEventListeners() {
        // Region changed - clear availability cache
        window.addEventListener('profile-region-updated', (e) => {
            console.log('[Init] Region changed to:', e.detail.region);
            availabilityService.clearCache();
            console.log('[Init] Availability cache cleared');
        });

        // Platforms changed - no cache clear needed
        window.addEventListener('profile-platforms-updated', (e) => {
            console.log('[Init] Platforms updated:', e.detail.platforms.length);
        });

        // Trigger preferences changed - no cache clear needed
        window.addEventListener('profile-triggers-updated', (e) => {
            console.log('[Init] Trigger preferences updated');
        });

        console.log('[Init] ✓ Event listeners registered');
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            availability: {
                provider: getAvailabilityProvider(),
                cache: availabilityService.getCacheStats()
            },
            triggerWarnings: {
                cache: triggerWarningService.getCacheStats()
            },
            userProfile: userProfileService.getStats()
        };
    }

    /**
     * Switch availability provider (upgrade path)
     */
    switchAvailabilityProvider(providerType, apiKey) {
        console.log(`[Init] Switching availability provider to: ${providerType}`);
        
        try {
            availabilityService.switchProvider(providerType, apiKey);
            
            // Update env
            if (providerType === 'streaming-availability') {
                ENV.SA_API_KEY = apiKey;
            }
            
            console.log('[Init] ✓ Provider switched successfully');
            return true;
        } catch (error) {
            console.error('[Init] Failed to switch provider:', error);
            return false;
        }
    }

    /**
     * Clear all caches
     */
    clearAllCaches() {
        availabilityService.clearCache();
        triggerWarningService.clearCache();
        console.log('[Init] All caches cleared');
    }
}

// Singleton instance
export const serviceInitializer = new ServiceInitializer();

/**
 * Quick initialization function
 */
export async function initializeServices() {
    return await serviceInitializer.initialize();
}

/**
 * Get service status
 */
export function getServiceStatus() {
    return serviceInitializer.getStatus();
}
