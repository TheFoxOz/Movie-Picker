/**
 * User Profile Service
 * Manages user preferences and profile data
 */

import { STREAMING_PLATFORMS } from '../config/streaming-platforms.js';
import { TRIGGER_CATEGORIES } from '../config/trigger-categories.js';

class UserProfileService {
    constructor() {
        this.storageKey = 'moviePickerUserProfile';
        this.defaultProfile = {
            region: 'US',
            selectedPlatforms: ['Netflix', 'Prime Video', 'Disney+'],
            triggerWarnings: {
                enabledCategories: [],
                showAllWarnings: false
            },
            preferences: {
                maxAgeRating: 'R',
                preferredGenres: [],
                language: 'en'
            }
        };
    }

    /**
     * Get user profile
     */
    getProfile() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const profile = JSON.parse(stored);
                // Merge with defaults to ensure all fields exist
                return {
                    ...this.defaultProfile,
                    ...profile,
                    triggerWarnings: {
                        ...this.defaultProfile.triggerWarnings,
                        ...(profile.triggerWarnings || {})
                    },
                    preferences: {
                        ...this.defaultProfile.preferences,
                        ...(profile.preferences || {})
                    }
                };
            }
        } catch (error) {
            console.error('[UserProfile] Failed to load profile:', error);
        }
        
        return { ...this.defaultProfile };
    }

    /**
     * Save profile
     */
    saveProfile(profile) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(profile));
            
            // Dispatch event for listeners
            window.dispatchEvent(new CustomEvent('profile-updated', {
                detail: { profile }
            }));
            
            console.log('[UserProfile] Profile saved');
            return true;
        } catch (error) {
            console.error('[UserProfile] Failed to save profile:', error);
            return false;
        }
    }

    /**
     * Update region
     */
    updateRegion(region) {
        const profile = this.getProfile();
        profile.region = region;
        this.saveProfile(profile);
        
        window.dispatchEvent(new CustomEvent('profile-region-updated', {
            detail: { region }
        }));
    }

    /**
     * Toggle platform
     */
    togglePlatform(platformId) {
        const profile = this.getProfile();
        const index = profile.selectedPlatforms.indexOf(platformId);
        
        if (index > -1) {
            profile.selectedPlatforms.splice(index, 1);
        } else {
            profile.selectedPlatforms.push(platformId);
        }
        
        this.saveProfile(profile);
        
        window.dispatchEvent(new CustomEvent('profile-platforms-updated', {
            detail: { platforms: profile.selectedPlatforms }
        }));
    }

    /**
     * Enable trigger category
     */
    enableTriggerCategory(categoryId) {
        const profile = this.getProfile();
        if (!profile.triggerWarnings.enabledCategories.includes(categoryId)) {
            profile.triggerWarnings.enabledCategories.push(categoryId);
            this.saveProfile(profile);
            
            window.dispatchEvent(new CustomEvent('profile-triggers-updated', {
                detail: { triggers: profile.triggerWarnings }
            }));
        }
    }

    /**
     * Disable trigger category
     */
    disableTriggerCategory(categoryId) {
        const profile = this.getProfile();
        const index = profile.triggerWarnings.enabledCategories.indexOf(categoryId);
        
        if (index > -1) {
            profile.triggerWarnings.enabledCategories.splice(index, 1);
            this.saveProfile(profile);
            
            window.dispatchEvent(new CustomEvent('profile-triggers-updated', {
                detail: { triggers: profile.triggerWarnings }
            }));
        }
    }

    /**
     * Set show all warnings
     */
    setShowAllWarnings(show) {
        const profile = this.getProfile();
        profile.triggerWarnings.showAllWarnings = show;
        this.saveProfile(profile);
        
        window.dispatchEvent(new CustomEvent('profile-triggers-updated', {
            detail: { triggers: profile.triggerWarnings }
        }));
    }

    /**
     * Export settings
     */
    exportSettings() {
        return this.getProfile();
    }

    /**
     * Import settings
     */
    importSettings(settings) {
        try {
            this.saveProfile(settings);
            console.log('[UserProfile] Settings imported successfully');
            return true;
        } catch (error) {
            console.error('[UserProfile] Failed to import settings:', error);
            return false;
        }
    }

    /**
     * Reset to defaults
     */
    reset() {
        this.saveProfile({ ...this.defaultProfile });
        console.log('[UserProfile] Profile reset to defaults');
    }

    /**
     * Get selected platform objects
     */
    getSelectedPlatforms() {
        const profile = this.getProfile();
        return STREAMING_PLATFORMS.filter(p => 
            profile.selectedPlatforms.includes(p.id)
        );
    }

    /**
     * Get enabled trigger categories
     */
    getEnabledTriggers() {
        const profile = this.getProfile();
        return TRIGGER_CATEGORIES.filter(c =>
            profile.triggerWarnings.enabledCategories.includes(c.id)
        );
    }
}

// Export singleton
export const userProfileService = new UserProfileService();
