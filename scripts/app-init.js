/**
 * App Initialization
 * Handles app startup, onboarding flow, and tab navigation
 * ✅ INTEGRATED: user-profile-revised.js for proper user settings
 */

import { onboardingFlow } from './components/onboarding-flow.js';
import { SwipeTab } from './tabs/swipe.js';
import { LibraryTab } from './tabs/library.js';
import { ProfileTab } from './tabs/profile.js';
import { HomeTab } from './tabs/home.js';
import { MatchesTab } from './tabs/matches.js';
import { store } from './state/store.js';
import { authService } from './services/auth-service.js';
import { userProfileService } from './services/user-profile-revised.js';

class MoviePickerApp {
    constructor() {
        this.currentTab = 'swipe';
        this.tabs = {};
        this.container = null;
        this.bottomNav = null;
        this.services = {
            triggerWarnings: null,
            userProfile: null
        };
    }

    async init() {
        console.log('[App] Initializing Movie Picker App...');

        // ✅ NEW: Initialize user profile service first
        this.initializeUserProfile();

        // Initialize enhanced services
        await this.initializeEnhancedServices();

        // Initialize tabs
        console.log('[App] Initializing tabs...');
        this.tabs = {
            home: new HomeTab(),
            swipe: new SwipeTab(),
            library: new LibraryTab(),
            matches: new MatchesTab(),
            profile: new ProfileTab()
        };
        console.log('[App] Tabs initialized:', Object.keys(this.tabs));

        // Setup DOM
        this.setupDOM();

        // Check if onboarding is needed
        const needsOnboarding = await onboardingFlow.start();

        if (!needsOnboarding) {
            console.log('[App] User already onboarded, showing app');
            this.showApp();
        } else {
            console.log('[App] Starting onboarding flow');
            
            const handleNavigation = (e) => {
                console.log('[App] Onboarding complete, showing app');
                this.showApp();
                this.navigateToTab(e.detail);
                window.removeEventListener('navigate-to-tab', handleNavigation);
            };
            
            window.addEventListener('navigate-to-tab', handleNavigation);
        }
    }

    // ✅ NEW: Initialize user profile service
    initializeUserProfile() {
        console.log('[App] Initializing user profile...');
        
        const profile = userProfileService.getProfile();
        
        // Sync profile to store for backwards compatibility
        store.setState({ 
            userProfile: profile,
            preferences: {
                platforms: profile.selectedPlatforms.reduce((acc, platform) => {
                    acc[platform] = true;
                    return acc;
                }, {}),
                region: profile.region,
                triggerWarnings: profile.triggerWarnings,
                theme: profile.theme,
                language: profile.language,
                location: profile.location
            }
        });
        
        console.log('[App] ✅ User profile initialized');
        console.log('[App] Region:', profile.region);
        console.log('[App] Platforms:', profile.selectedPlatforms);
        console.log('[App] Trigger categories:', profile.triggerWarnings.enabledCategories.length);
        
        // Listen for profile updates
        this.setupProfileListeners();
    }

    // ✅ NEW: Setup profile event listeners
    setupProfileListeners() {
        // Region changed
        window.addEventListener('profile-region-updated', (e) => {
            console.log('[App] Region changed to:', e.detail.region);
            
            const preferences = store.getState().preferences || {};
            preferences.region = e.detail.region;
            store.setState({ preferences });
            
            if (this.currentTab === 'home' || this.currentTab === 'library') {
                this.renderCurrentTab();
            }
        });

        // Platforms changed
        window.addEventListener('profile-platforms-updated', (e) => {
            console.log('[App] Platforms updated:', e.detail.platforms);
            
            const preferences = store.getState().preferences || {};
            preferences.platforms = e.detail.platforms.reduce((acc, platform) => {
                acc[platform] = true;
                return acc;
            }, {});
            store.setState({ preferences });
            
            window.dispatchEvent(new CustomEvent('preferences-updated', {
                detail: preferences
            }));
        });

        // Trigger warnings changed
        window.addEventListener('profile-triggers-updated', (e) => {
            console.log('[App] Trigger preferences updated');
            
            const preferences = store.getState().preferences || {};
            preferences.triggerWarnings = e.detail.triggers;
            store.setState({ preferences });
        });

        console.log('[App] ✅ Profile event listeners registered');
    }

    async initializeEnhancedServices() {
        console.log('[App] Initializing enhanced services...');
        
        // Load trigger warning service
        try {
            const { triggerWarningService } = await import('./services/trigger-warning-service.js');
            const { ENV } = await import('./config/env.js');
            
            if (triggerWarningService && ENV && ENV.DTD_API_KEY) {
                await triggerWarningService.initialize(ENV.DTD_API_KEY);
                this.services.triggerWarnings = triggerWarningService;
                console.log('[App] ✅ Trigger warning service ready');
            } else {
                console.warn('[App] ⚠️ Trigger warning service: Missing DTD key');
            }
        } catch (error) {
            console.warn('[App] ⚠️ Trigger warning service not loaded:', error.message);
        }
        
        // User profile service already initialized
        this.services.userProfile = userProfileService;
        
        const loadedServices = Object.entries(this.services)
            .filter(([_, service]) => service !== null)
            .map(([name]) => name);
        
        console.log(`[App] ✅ Loaded ${loadedServices.length}/2 enhanced services:`, loadedServices);
        
        if (typeof window !== 'undefined') {
            window.moviePickerServices = this.services;
        }
    }

    setupDOM() {
        this.container = document.getElementById('app-container') || this.createAppContainer();
        this.bottomNav = document.getElementById('bottom-nav') || this.createBottomNav();
        this.setupNavigationListeners();

        window.addEventListener('navigate-to-tab', (e) => {
            this.navigateToTab(e.detail);
        });
    }

    createAppContainer() {
        const container = document.createElement('div');
        container.id = 'app-container';
        container.style.cssText = 'min-height: 100vh; padding-bottom: 5rem;';
        document.body.appendChild(container);
        return container;
    }

    createBottomNav() {
        const nav = document.createElement('nav');
        nav.id = 'bottom-nav';
        nav.style.cssText = 'position: fixed; bottom: 0; left: 0; right: 0; background: rgba(17, 17, 27, 0.95); backdrop-filter: blur(10px); border-top: 1px solid rgba(255, 255, 255, 0.1); padding: 0.5rem; z-index: 1000;';

        nav.innerHTML = `
            <div style="display: flex; justify-content: space-around; max-width: 600px; margin: 0 auto;">
                ${this.renderNavButton('home', '🏠', 'Home')}
                ${this.renderNavButton('swipe', '👆', 'Swipe')}
                ${this.renderNavButton('library', '📚', 'Library')}
                ${this.renderNavButton('matches', '🤝', 'Matches')}
                ${this.renderNavButton('profile', '👤', 'Profile')}
            </div>
        `;

        document.body.appendChild(nav);
        return nav;
    }

    renderNavButton(tabName, icon, label) {
        const isActive = this.currentTab === tabName;
        return `
            <button class="nav-btn" data-tab="${tabName}" style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 0.75rem 0.5rem; background: ${isActive ? 'rgba(255, 46, 99, 0.1)' : 'transparent'}; border: none; border-radius: 0.75rem; color: ${isActive ? '#ff2e63' : 'rgba(255, 255, 255, 0.6)'}; font-size: 0.75rem; font-weight: ${isActive ? '700' : '600'}; cursor: pointer; transition: all 0.3s;">
                <span style="font-size: 1.5rem;">${icon}</span>
                <span>${label}</span>
            </button>
        `;
    }

    setupNavigationListeners() {
        this.bottomNav.addEventListener('click', (e) => {
            const btn = e.target.closest('.nav-btn');
            if (btn) {
                this.navigateToTab(btn.dataset.tab);
            }
        });
    }

    navigateToTab(tabName) {
        if (!tabName) return;

        console.log(`[App] Navigating to ${tabName} tab`);
        this.currentTab = tabName;

        if (tabName === 'swipe') {
            this.tabs.swipe = new SwipeTab();
        }

        this.updateNavigation();
        this.renderCurrentTab();
    }

    updateNavigation() {
        const buttons = this.bottomNav.querySelectorAll('.nav-btn');
        buttons.forEach(btn => {
            const isActive = btn.dataset.tab === this.currentTab;
            btn.style.background = isActive ? 'rgba(255, 46, 99, 0.1)' : 'transparent';
            btn.style.color = isActive ? '#ff2e63' : 'rgba(255, 255, 255, 0.6)';
            btn.style.fontWeight = isActive ? '700' : '600';
        });
    }

    async renderCurrentTab() {
        if (!this.container) return;

        this.container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:calc(100vh - 15rem);"><div style="width:48px;height:48px;border:4px solid rgba(255,46,99,0.3);border-top-color:#ff2e63;border-radius:50%;animation:spin 1s linear infinite;"></div></div><style>@keyframes spin { to { transform: rotate(360deg); }}</style>';

        await new Promise(resolve => setTimeout(resolve, 100));

        this.container.innerHTML = '';

        const tab = this.tabs[this.currentTab];
        if (tab && typeof tab.render === 'function') {
            try {
                await tab.render(this.container);
                console.log(`[App] ✅ Rendered ${this.currentTab} tab`);
            } catch (error) {
                console.error(`[App] ❌ Error rendering ${this.currentTab}:`, error);
            }
        }
    }

    showApp() {
        if (this.container) this.container.style.display = 'block';
        if (this.bottomNav) this.bottomNav.style.display = 'flex';
        
        const header = document.getElementById('app-header');
        if (header) header.style.display = 'block';

        this.renderCurrentTab();
        this.setupPreferencesSync();
    }

    setupPreferencesSync() {
        store.subscribe((state) => {
            try {
                if (state.swipeHistory) {
                    localStorage.setItem('moviePickerSwipeHistory', JSON.stringify(state.swipeHistory));
                }
            } catch (error) {
                console.error('[App] Failed to sync swipe history:', error);
            }
        });
    }
}

// Initialize app
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new MoviePickerApp();
        app.init();
    });
} else {
    const app = new MoviePickerApp();
    app.init();
}

export { MoviePickerApp };
