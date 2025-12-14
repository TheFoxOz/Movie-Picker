/**
 * Onboarding Flow - FIXED
 * ✅ Skips login page if user is already authenticated (from index.html login)
 * ✅ Goes directly to platform selection for authenticated users
 */

import { authService } from '../services/auth-service.js';
import { store } from '../state/store.js';
import { ENV } from '../config/env.js';

export class OnboardingFlow {
    constructor() {
        this.currentStep = 'login';
        this.overlay = null;
    }

    async start() {
        console.log('[Onboarding] Starting onboarding flow...');
        
        // ✅ CRITICAL FIX: Check if user is already logged in
        if (authService.isAuthenticated()) {
            console.log('[Onboarding] User is authenticated');
            
            const preferences = store.getState().preferences;
            const hasCompletedOnboarding = preferences?.onboardingCompleted || false;
            
            if (hasCompletedOnboarding) {
                console.log('[Onboarding] User already onboarded, skipping');
                return false; // Don't show onboarding
            }
            
            // ✅ User is logged in but hasn't completed onboarding
            // Skip login and go straight to platform selection
            console.log('[Onboarding] User authenticated but onboarding incomplete, showing platform selection');
            this.showPlatformSelection();
            return true;
        }

        // User not logged in - this shouldn't happen because index.html handles login
        // But keep this as fallback
        console.warn('[Onboarding] User not authenticated - this should be handled by index.html login');
        return false;
    }

    showPlatformSelection() {
        console.log('[Onboarding] Showing platform selection');
        this.createOverlay();
        this.currentStep = 'platforms';
        
        this.overlay.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem;">
                <div style="background: linear-gradient(180deg, #1a1a2e 0%, #0a0a0f 100%); border-radius: 2rem; max-width: 500px; width: 100%; padding: 3rem 2rem; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 60px rgba(0,0,0,0.6);">
                    
                    <!-- Progress Indicator -->
                    <div style="display: flex; gap: 0.5rem; margin-bottom: 2rem;">
                        <div style="flex: 1; height: 4px; background: #ff2e63; border-radius: 2px;"></div>
                        <div style="flex: 1; height: 4px; background: #ff2e63; border-radius: 2px;"></div>
                        <div style="flex: 1; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px;"></div>
                    </div>

                    <!-- Header -->
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📺</div>
                        <h2 style="font-size: 1.75rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0;">
                            Select Your Platforms
                        </h2>
                        <p style="color: rgba(255,255,255,0.6); font-size: 0.875rem; margin: 0;">
                            Choose the streaming services you have access to
                        </p>
                    </div>

                    <!-- Platform Selection -->
                    <div id="platform-selection" style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 2rem;">
                        ${this.renderPlatformOptions()}
                    </div>

                    <!-- Select All Toggle -->
                    <button id="select-all-btn" style="width: 100%; padding: 0.75rem; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3); border-radius: 0.75rem; color: #818cf8; font-weight: 600; cursor: pointer; margin-bottom: 2rem; transition: all 0.2s;">
                        Select All
                    </button>

                    <!-- Continue Button -->
                    <button id="continue-btn" disabled style="width: 100%; padding: 1.25rem; background: linear-gradient(135deg,#ff2e63,#d90062); border: none; border-radius: 0.75rem; color: white; font-weight: 700; font-size: 1.125rem; cursor: pointer; opacity: 0.5; transition: all 0.2s;">
                        Continue
                    </button>

                    <p style="text-align: center; color: rgba(255,255,255,0.5); font-size: 0.75rem; margin: 1rem 0 0 0;">
                        You can change these anytime in Settings
                    </p>

                </div>
            </div>
        `;

        this.attachPlatformListeners();
    }

    renderPlatformOptions() {
        const platforms = [
            { name: 'Netflix', emoji: '🔴', color: '#E50914' },
            { name: 'Hulu', emoji: '🟢', color: '#1CE783' },
            { name: 'Prime Video', emoji: '🔵', color: '#00A8E1' },
            { name: 'Disney+', emoji: '⭐', color: '#113CCF' },
            { name: 'HBO Max', emoji: '🟣', color: '#B200FF' },
            { name: 'Apple TV+', emoji: '🍎', color: '#000000' }
        ];

        return platforms.map(platform => `
            <label class="platform-option" data-platform="${platform.name}" style="display: flex; align-items: center; justify-content: space-between; padding: 1.25rem; background: rgba(255,255,255,0.03); border: 2px solid rgba(255,255,255,0.1); border-radius: 1rem; cursor: pointer; transition: all 0.3s;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <span style="font-size: 2rem;">${platform.emoji}</span>
                    <span style="font-weight: 700; color: white; font-size: 1.125rem;">
                        ${platform.name}
                    </span>
                </div>
                <input type="checkbox" class="platform-checkbox" data-platform="${platform.name}" 
                       style="width: 24px; height: 24px; cursor: pointer; accent-color: ${platform.color};">
            </label>
        `).join('');
    }

    completeOnboarding() {
        console.log('[Onboarding] Completing onboarding...');
        
        // Mark onboarding as complete in Firebase
        const user = authService.getCurrentUser();
        if (user) {
            authService.completeOnboarding(user.uid).catch(err => {
                console.error('[Onboarding] Failed to mark onboarding complete:', err);
            });
        }

        // Save that onboarding is complete in local state
        const preferences = store.getState().preferences || {};
        preferences.onboardingCompleted = true;
        store.setState({ preferences });

        // Save to localStorage
        try {
            localStorage.setItem('moviePickerPreferences', JSON.stringify(preferences));
        } catch (error) {
            console.error('[Onboarding] Failed to save preferences:', error);
        }

        // Show success message briefly
        this.overlay.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem;">
                <div style="text-align: center;">
                    <div style="font-size: 5rem; margin-bottom: 1rem; animation: bounce 0.6s ease-in-out;">🎉</div>
                    <h2 style="font-size: 2rem; font-weight: 800; color: white; margin: 0 0 1rem 0;">
                        You're All Set!
                    </h2>
                    <p style="color: rgba(255,255,255,0.6); font-size: 1.125rem; margin: 0;">
                        Let's start swiping...
                    </p>
                </div>
            </div>
            <style>
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
            </style>
        `;

        // Remove overlay after 2 seconds
        setTimeout(() => {
            console.log('[Onboarding] Removing overlay and navigating to app');
            this.removeOverlay();
            
            // Navigate to swipe tab
            window.dispatchEvent(new CustomEvent('navigate-to-tab', {
                detail: 'swipe'
            }));
        }, 2000);
    }

    attachPlatformListeners() {
        const checkboxes = this.overlay.querySelectorAll('.platform-checkbox');
        const labels = this.overlay.querySelectorAll('.platform-option');
        const continueBtn = this.overlay.querySelector('#continue-btn');
        const selectAllBtn = this.overlay.querySelector('#select-all-btn');

        // Update continue button state
        const updateContinueButton = () => {
            const selected = Array.from(checkboxes).filter(cb => cb.checked);
            if (selected.length > 0) {
                continueBtn.disabled = false;
                continueBtn.style.opacity = '1';
                continueBtn.style.cursor = 'pointer';
            } else {
                continueBtn.disabled = true;
                continueBtn.style.opacity = '0.5';
                continueBtn.style.cursor = 'not-allowed';
            }
        };

        // Checkbox change
        checkboxes.forEach((checkbox, index) => {
            const label = labels[index];
            
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    label.style.border = '2px solid #ff2e63';
                    label.style.background = 'rgba(255,46,99,0.1)';
                } else {
                    label.style.border = '2px solid rgba(255,255,255,0.1)';
                    label.style.background = 'rgba(255,255,255,0.03)';
                }
                updateContinueButton();
            });

            // Label click
            label.addEventListener('mouseover', () => {
                label.style.transform = 'translateX(4px)';
            });
            label.addEventListener('mouseout', () => {
                label.style.transform = 'translateX(0)';
            });
        });

        // Select all
        let allSelected = false;
        selectAllBtn?.addEventListener('click', () => {
            allSelected = !allSelected;
            checkboxes.forEach((checkbox, index) => {
                checkbox.checked = allSelected;
                const label = labels[index];
                if (allSelected) {
                    label.style.border = '2px solid #ff2e63';
                    label.style.background = 'rgba(255,46,99,0.1)';
                } else {
                    label.style.border = '2px solid rgba(255,255,255,0.1)';
                    label.style.background = 'rgba(255,255,255,0.03)';
                }
            });
            selectAllBtn.textContent = allSelected ? 'Deselect All' : 'Select All';
            updateContinueButton();
        });

        // Continue button
        continueBtn?.addEventListener('click', () => {
            const selected = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.dataset.platform);

            console.log('[Onboarding] Selected platforms:', selected);

            // Save to preferences
            const preferences = store.getState().preferences || {};
            preferences.platforms = {
                'Netflix': selected.includes('Netflix'),
                'Hulu': selected.includes('Hulu'),
                'Prime Video': selected.includes('Prime Video'),
                'Disney+': selected.includes('Disney+'),
                'HBO Max': selected.includes('HBO Max'),
                'Apple TV+': selected.includes('Apple TV+')
            };
            store.setState({ preferences });

            // Complete onboarding
            this.completeOnboarding();
        });
    }

    createOverlay() {
        console.log('[Onboarding] Creating overlay');
        // Remove existing overlay if any
        this.removeOverlay();

        this.overlay = document.createElement('div');
        this.overlay.id = 'onboarding-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 10000;
            background: linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 100%);
            overflow-y: auto;
        `;

        document.body.appendChild(this.overlay);
        document.body.style.overflow = 'hidden';
        
        // Hide login page
        const loginContainer = document.getElementById('login-container');
        if (loginContainer) {
            loginContainer.style.display = 'none';
            console.log('[Onboarding] Login page hidden');
        }
    }

    removeOverlay() {
        console.log('[Onboarding] Removing overlay');
        const existing = document.getElementById('onboarding-overlay');
        if (existing) {
            existing.remove();
        }
        document.body.style.overflow = 'auto';
    }
}

// Export singleton
export const onboardingFlow = new OnboardingFlow();
