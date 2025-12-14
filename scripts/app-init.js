/**
 * App Initialization - COMPLETE FIX
 * ✅ Shows login page when no user is authenticated
 * ✅ Properly coordinates auth state with onboarding flow
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
        this.authInitialized = false;
    }

    async init() {
        console.log('[App] Initializing Movie Picker App...');
        
        // ✅ Setup DOM first (so we have containers to work with)
        this.setupDOM();
        
        // ✅ Wait for auth state to be determined
        await this.waitForAuthState();
        
        const user = authService.getCurrentUser();
        
        if (!user) {
            console.log('[App] No user authenticated, showing login page');
            // ✅ NEW: Make sure login page is visible
            this.showLoginPage();
            return;
        }
        
        console.log('[App] User authenticated:', user.email || 'anonymous');
        
        // User is authenticated, continue with app initialization
        this.initializeUserProfile();
        await this.initializeEnhancedServices();

        console.log('[App] Initializing tabs...');
        this.tabs = {
            home: new HomeTab(),
            swipe: new SwipeTab(),
            library: new LibraryTab(),
            matches: new MatchesTab(),
            profile: new ProfileTab()
        };
        
        // Check if user needs onboarding
        const needsOnboarding = await this.checkNeedsOnboarding(user);
        
        if (needsOnboarding) {
            console.log('[App] User needs onboarding, starting onboarding flow');
            const result = await onboardingFlow.start();
            
            if (!result) {
                this.showApp();
            } else {
                const handleNavigation = (e) => {
                    this.showApp();
                    this.navigateToTab(e.detail);
                    window.removeEventListener('navigate-to-tab', handleNavigation);
                };
                window.addEventListener('navigate-to-tab', handleNavigation);
            }
        } else {
            console.log('[App] User already onboarded, showing app');
            this.showApp();
        }
    }

    // ✅ NEW: Show login page
    showLoginPage() {
        console.log('[App] Showing login page');
        
        // Hide app container and bottom nav
        if (this.container) {
            this.container.style.display = 'none';
        }
        if (this.bottomNav) {
            this.bottomNav.style.display = 'none';
        }
        
        // Show login container (assuming it exists in your HTML)
        const loginContainer = document.getElementById('login-container') || 
                              document.querySelector('.login-container') ||
                              document.querySelector('[data-login]');
        
        if (loginContainer) {
            loginContainer.style.display = 'block';
            console.log('[App] ✅ Login container visible');
        } else {
            console.warn('[App] ⚠️ No login container found in DOM!');
            console.warn('[App] Expected: #login-container or .login-container or [data-login]');
            
            // The login form should be in your index.html
            // If it's not visible, check your HTML structure
        }
        
        // Hide any onboarding elements
        const onboardingContainer = document.getElementById('onboarding-container') ||
                                   document.querySelector('.onboarding-container');
        if (onboardingContainer) {
            onboardingContainer.style.display = 'none';
        }
    }

    async waitForAuthState() {
        return new Promise((resolve) => {
            if (authService.getCurrentUser() !== null || this.authInitialized) {
                console.log('[App] Auth state already determined');
                resolve();
                return;
            }
            
            console.log('[App] Waiting for auth state...');
            let timeout;
            
            const unsubscribe = store.subscribe((state) => {
                if (state.isAuthenticated !== undefined) {
                    console.log('[App] Auth state determined:', state.isAuthenticated);
                    clearTimeout(timeout);
                    this.authInitialized = true;
                    unsubscribe();
                    resolve();
                }
            });
            
            timeout = setTimeout(() => {
                console.log('[App] Auth state timeout, proceeding anyway');
                this.authInitialized = true;
                unsubscribe();
                resolve();
            }, 2000);
        });
    }

    async checkNeedsOnboarding(user) {
        try {
            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('./services/firebase-config.js');
            
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                console.log('[App] User doc does not exist, needs onboarding');
                return true;
            }
            
            const userData = userDoc.data();
            const needsOnboarding = !userData.onboardingCompleted;
            
            console.log('[App] Onboarding status:', userData.onboardingCompleted ? 'Complete' : 'Incomplete');
            return needsOnboarding;
            
        } catch (error) {
            console.error('[App] Error checking onboarding status:', error);
            return true;
        }
    }

    initializeUserProfile() {
        const profile = userProfileService.getProfile();
        store.setState({ 
            userProfile: profile,
            preferences: {
                platforms: profile.selectedPlatforms.reduce((acc, platform) => {
                    acc[platform] = true;
                    return acc;
                }, {}),
                region: profile.region,
                triggerWarnings: profile.triggerWarnings
            }
        });
        this.setupProfileListeners();
    }

    setupProfileListeners() {
        window.addEventListener('profile-region-updated', (e) => {
            const preferences = store.getState().preferences || {};
            preferences.region = e.detail.region;
            store.setState({ preferences });
        });

        window.addEventListener('profile-platforms-updated', (e) => {
            const preferences = store.getState().preferences || {};
            preferences.platforms = e.detail.platforms.reduce((acc, platform) => {
                acc[platform] = true;
                return acc;
            }, {});
            store.setState({ preferences });
        });

        window.addEventListener('profile-triggers-updated', (e) => {
            const preferences = store.getState().preferences || {};
            preferences.triggerWarnings = e.detail.triggers;
            store.setState({ preferences });
        });
    }

    async initializeEnhancedServices() {
        console.log('[App] Initializing enhanced services...');
        
        try {
            const { doesTheDogDieService } = await import('./services/does-the-dog-die.js');
            const { ENV } = await import('./config/env.js');
            
            if (doesTheDogDieService && ENV && ENV.DTD_API_KEY) {
                this.services.triggerWarnings = doesTheDogDieService;
                console.log('[App] ✅ DoesTheDogDie service ready');
            }
        } catch (error) {
            console.warn('[App] ⚠️ DoesTheDogDie service not loaded:', error.message);
        }
        
        this.services.userProfile = userProfileService;
        console.log('[App] ✅ Loaded services');
        
        if (typeof window !== 'undefined') {
            window.moviePickerServices = this.services;
        }
    }

    setupDOM() {
        this.container = document.getElementById('app-container') || this.createAppContainer();
        this.bottomNav = document.getElementById('bottom-nav') || this.createBottomNav();
        
        // ✅ Initially hide app container and bottom nav
        this.container.style.display = 'none';
        this.bottomNav.style.display = 'none';
        
        this.setupNavigationListeners();
        window.addEventListener('navigate-to-tab', (e) => this.navigateToTab(e.detail));
    }

    createAppContainer() {
        const container = document.createElement('div');
        container.id = 'app-container';
        container.style.cssText = 'min-height: 100vh; padding-bottom: 5rem; display: none;';
        document.body.appendChild(container);
        return container;
    }

    createBottomNav() {
        const nav = document.createElement('nav');
        nav.id = 'bottom-nav';
        nav.style.cssText = 'position: fixed; bottom: 0; left: 0; right: 0; background: rgba(17, 17, 27, 0.95); backdrop-filter: blur(10px); border-top: 1px solid rgba(255, 255, 255, 0.1); padding: 0.5rem; z-index: 1000; display: none;';
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
            if (btn) this.navigateToTab(btn.dataset.tab);
        });
    }

    navigateToTab(tabName) {
        if (!tabName) return;
        this.currentTab = tabName;
        if (tabName === 'swipe') this.tabs.swipe = new SwipeTab();
        this.updateNavigation();
        this.renderCurrentTab();
    }

    updateNavigation() {
        this.bottomNav.querySelectorAll('.nav-btn').forEach(btn => {
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
            } catch (error) {
                console.error(`[App] Error rendering ${this.currentTab}:`, error);
            }
        }
    }

    showApp() {
        console.log('[App] Showing main app interface');
        
        // ✅ Hide login page
        const loginContainer = document.getElementById('login-container') || 
                              document.querySelector('.login-container') ||
                              document.querySelector('[data-login]');
        if (loginContainer) {
            loginContainer.style.display = 'none';
        }
        
        // ✅ Show app
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
