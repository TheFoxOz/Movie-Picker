/**
 * User Profile Service
 * Manages region, platform preferences, and trigger warning settings
 */

import { SUPPORTED_COUNTRIES } from '../config/streaming-platforms.js';
import { getAllCategories } from '../config/trigger-categories.js';

export class UserProfileService {
    constructor() {
        this.profile = this.loadProfile();
    }

    loadProfile() {
        try {
            const saved = localStorage.getItem('moviePickerUserProfile');
            if (saved) {
                const profile = JSON.parse(saved);
                console.log('[Profile] Loaded existing profile');
                return this.validateProfile(profile);
            }
        } catch (error) {
            console.error('[Profile] Failed to load:', error);
        }

        console.log('[Profile] Creating new profile');
        return this.createDefaultProfile();
    }

    createDefaultProfile() {
        return {
            userId: this.generateUserId(),
            
            // Region (ISO country code)
            region: 'US', // Default to US
            
            // Selected streaming platforms (user's subscriptions)
            selectedPlatforms: ['Netflix', 'Prime Video', 'Disney+'],
            
            // Trigger warning preferences
            triggerWarnings: {
                enabledCategories: [],     // Array of category IDs user wants to see
                showAllWarnings: {},       // Per-category: show detailed warnings
                lastUpdated: new Date().toISOString()
            },
            
            // Metadata
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    validateProfile(profile) {
        // Ensure region exists
        if (!profile.region) {
            profile.region = 'US';
        }

        // Ensure it's a valid region
        if (!SUPPORTED_COUNTRIES[profile.region]) {
            profile.region = 'US';
        }

        // Ensure selectedPlatforms is an array
        if (!Array.isArray(profile.selectedPlatforms)) {
            profile.selectedPlatforms = ['Netflix', 'Prime Video', 'Disney+'];
        }

        // Ensure triggerWarnings structure exists
        if (!profile.triggerWarnings) {
            profile.triggerWarnings = {
                enabledCategories: [],
                showAllWarnings: {},
                lastUpdated: new Date().toISOString()
            };
        }

        // Ensure enabledCategories is an array
        if (!Array.isArray(profile.triggerWarnings.enabledCategories)) {
            profile.triggerWarnings.enabledCategories = [];
        }

        // Ensure showAllWarnings is an object
        if (typeof profile.triggerWarnings.showAllWarnings !== 'object') {
            profile.triggerWarnings.showAllWarnings = {};
        }

        profile.updatedAt = new Date().toISOString();
        return profile;
    }

    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // ========================================================================
    // GETTERS
    // ========================================================================

    getProfile() {
        return { ...this.profile };
    }

    getRegion() {
        return this.profile.region;
    }

    getRegionName() {
        return SUPPORTED_COUNTRIES[this.profile.region]?.name || this.profile.region;
    }

    getSelectedPlatforms() {
        return [...this.profile.selectedPlatforms];
    }

    getTriggerPreferences() {
        return { ...this.profile.triggerWarnings };
    }

    getEnabledCategories() {
        return [...this.profile.triggerWarnings.enabledCategories];
    }

    // ========================================================================
    // REGION MANAGEMENT
    // ========================================================================

    /**
     * Update user's region
     * @param {string} regionCode - ISO country code (e.g., 'US', 'FR', 'GB')
     */
    updateRegion(regionCode) {
        if (!SUPPORTED_COUNTRIES[regionCode]) {
            console.error(`[Profile] Invalid region: ${regionCode}`);
            return false;
        }

        this.profile.region = regionCode;
        this.profile.updatedAt = new Date().toISOString();
        this.saveProfile();

        console.log(`[Profile] Region updated to ${regionCode}`);

        window.dispatchEvent(new CustomEvent('profile-region-updated', {
            detail: { region: regionCode }
        }));

        return true;
    }

    // ========================================================================
    // PLATFORM MANAGEMENT
    // ========================================================================

    /**
     * Update selected platforms
     * @param {Array<string>} platforms - Array of platform names
     */
    updatePlatforms(platforms) {
        this.profile.selectedPlatforms = platforms;
        this.profile.updatedAt = new Date().toISOString();
        this.saveProfile();

        console.log('[Profile] Platforms updated:', platforms);

        window.dispatchEvent(new CustomEvent('profile-platforms-updated', {
            detail: { platforms }
        }));
    }

    /**
     * Toggle a single platform
     * @param {string} platformName - Platform name to toggle
     */
    togglePlatform(platformName) {
        const index = this.profile.selectedPlatforms.indexOf(platformName);

        if (index > -1) {
            this.profile.selectedPlatforms.splice(index, 1);
            console.log(`[Profile] Removed platform: ${platformName}`);
        } else {
            this.profile.selectedPlatforms.push(platformName);
            console.log(`[Profile] Added platform: ${platformName}`);
        }

        this.profile.updatedAt = new Date().toISOString();
        this.saveProfile();

        window.dispatchEvent(new CustomEvent('profile-platforms-updated', {
            detail: { platforms: this.profile.selectedPlatforms }
        }));
    }

    // ========================================================================
    // TRIGGER WARNING MANAGEMENT
    // ========================================================================

    /**
     * Enable a trigger warning category
     * @param {number} categoryId - Category ID
     */
    enableTriggerCategory(categoryId) {
        if (!this.profile.triggerWarnings.enabledCategories.includes(categoryId)) {
            this.profile.triggerWarnings.enabledCategories.push(categoryId);
            this.profile.triggerWarnings.lastUpdated = new Date().toISOString();
            this.profile.updatedAt = new Date().toISOString();
            this.saveProfile();

            console.log(`[Profile] Enabled trigger category ${categoryId}`);

            window.dispatchEvent(new CustomEvent('profile-triggers-updated', {
                detail: { triggers: this.profile.triggerWarnings }
            }));
        }
    }

    /**
     * Disable a trigger warning category
     * @param {number} categoryId - Category ID
     */
    disableTriggerCategory(categoryId) {
        const index = this.profile.triggerWarnings.enabledCategories.indexOf(categoryId);

        if (index > -1) {
            this.profile.triggerWarnings.enabledCategories.splice(index, 1);
            
            // Also remove "show all warnings" setting for this category
            delete this.profile.triggerWarnings.showAllWarnings[categoryId];
            
            this.profile.triggerWarnings.lastUpdated = new Date().toISOString();
            this.profile.updatedAt = new Date().toISOString();
            this.saveProfile();

            console.log(`[Profile] Disabled trigger category ${categoryId}`);

            window.dispatchEvent(new CustomEvent('profile-triggers-updated', {
                detail: { triggers: this.profile.triggerWarnings }
            }));
        }
    }

    /**
     * Toggle "show all warnings" for a category
     * @param {number} categoryId - Category ID
     * @param {boolean} show - Whether to show detailed warnings
     */
    toggleShowAllWarnings(categoryId, show) {
        if (show) {
            this.profile.triggerWarnings.showAllWarnings[categoryId] = true;
        } else {
            delete this.profile.triggerWarnings.showAllWarnings[categoryId];
        }

        this.profile.triggerWarnings.lastUpdated = new Date().toISOString();
        this.profile.updatedAt = new Date().toISOString();
        this.saveProfile();

        console.log(`[Profile] ${show ? 'Enabled' : 'Disabled'} show all warnings for category ${categoryId}`);

        window.dispatchEvent(new CustomEvent('profile-triggers-updated', {
            detail: { triggers: this.profile.triggerWarnings }
        }));
    }

    /**
     * Enable all trigger categories
     */
    enableAllTriggers() {
        this.profile.triggerWarnings.enabledCategories = getAllCategories().map(cat => cat.id);
        this.profile.triggerWarnings.lastUpdated = new Date().toISOString();
        this.profile.updatedAt = new Date().toISOString();
        this.saveProfile();

        console.log('[Profile] Enabled all trigger categories');

        window.dispatchEvent(new CustomEvent('profile-triggers-updated', {
            detail: { triggers: this.profile.triggerWarnings }
        }));
    }

    /**
     * Disable all trigger categories
     */
    disableAllTriggers() {
        this.profile.triggerWarnings.enabledCategories = [];
        this.profile.triggerWarnings.showAllWarnings = {};
        this.profile.triggerWarnings.lastUpdated = new Date().toISOString();
        this.profile.updatedAt = new Date().toISOString();
        this.saveProfile();

        console.log('[Profile] Disabled all trigger categories');

        window.dispatchEvent(new CustomEvent('profile-triggers-updated', {
            detail: { triggers: this.profile.triggerWarnings }
        }));
    }

    /**
     * Check if a category is enabled
     * @param {number} categoryId - Category ID
     * @returns {boolean}
     */
    isCategoryEnabled(categoryId) {
        return this.profile.triggerWarnings.enabledCategories.includes(categoryId);
    }

    /**
     * Check if "show all warnings" is enabled for a category
     * @param {number} categoryId - Category ID
     * @returns {boolean}
     */
    isShowAllWarningsEnabled(categoryId) {
        return this.profile.triggerWarnings.showAllWarnings[categoryId] === true;
    }

    // ========================================================================
    // PERSISTENCE
    // ========================================================================

    saveProfile() {
        try {
            localStorage.setItem('moviePickerUserProfile', JSON.stringify(this.profile));
            console.log('[Profile] Saved to localStorage');
        } catch (error) {
            console.error('[Profile] Failed to save:', error);
        }
    }

    resetProfile() {
        this.profile = this.createDefaultProfile();
        this.saveProfile();

        console.log('[Profile] Reset to defaults');

        window.dispatchEvent(new CustomEvent('profile-reset'));
    }

    exportProfile() {
        return JSON.stringify(this.profile, null, 2);
    }

    importProfile(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            this.profile = this.validateProfile(imported);
            this.saveProfile();

            console.log('[Profile] Imported successfully');

            window.dispatchEvent(new CustomEvent('profile-imported'));
            return true;
        } catch (error) {
            console.error('[Profile] Import failed:', error);
            return false;
        }
    }

    // ========================================================================
    // STATS
    // ========================================================================

    getStats() {
        return {
            region: this.getRegionName(),
            platformsCount: this.profile.selectedPlatforms.length,
            triggersCount: this.profile.triggerWarnings.enabledCategories.length,
            createdDaysAgo: Math.floor(
                (Date.now() - new Date(this.profile.createdAt)) / (1000 * 60 * 60 * 24)
            )
        };
    }
}

// Singleton instance
export const userProfileService = new UserProfileService();
