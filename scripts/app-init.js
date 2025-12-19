/**
 * MoviEase - App Initialization
 * Discover your next favorite film with ease
 * 
 * ✅ FIXED: Proper scrolling at app-container level
 * ✅ FIXED: Better error handling and container checks
 * ✅ FIXED: Matches tab uses init() instead of render()
 * ✅ IMPROVED AUTH WAIT: 5 seconds for Google redirect
 * ✅ Handles onboarding flow for new users
 * ✅ Manages tab navigation and rendering
 * ✅ MoviEase branding and colors
 */

import { onboardingFlow } from './components/onboarding-flow.js';
import { SwipeTab } from './tabs/swipe.js';
import { LibraryTab } from './tabs/library.js';
import { ProfileTab } from './tabs/profile.js';
import { HomeTab } from './tabs/home.js';
import { matchesTab } from './tabs/matches.js';
import { store } from './state/store.js';
import { authService } from './services/auth-service.js';
import { userProfileService } from './services/user-profile-revised.js';

class MoviEaseApp {
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
        console.log('[MoviEase] Initializing app...');
        
        this.setupDOM();
        this.setupLoginHandlers();
        
        // ✅ Wait for auth state with longer timeout
        await this.waitForAuthState();
        
        const user = authService.getCurrentUser();
        
        if (!user) {
            console.log('[MoviEase] No user authenticated, showing login page');
            this.showLoginPage();
            return;
        }
        
        console.log('[MoviEase] User authenticated:', user.email || 'anonymous');
        
        this.initializeUserProfile();
        await this.initializeEnhancedServices();

        console.log('[MoviEase] Initializing tabs...');
        this.tabs = {
            home: new HomeTab(),
            swipe: new SwipeTab(),
            library: new LibraryTab(),
            matches: matchesTab,  // ✅ Use singleton instance
            profile: new ProfileTab()
        };
        
        const needsOnboarding = await this.checkNeedsOnboarding(user);
        
        if (needsOnboarding) {
            console.log('[MoviEase] User needs onboarding, starting onboarding flow');
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
            console.log('[MoviEase] User already onboarded, showing app');
            this.showApp();
        }
    }

    setupLoginHandlers() {
        console.log('[MoviEase] Setting up login button handlers...');
        
        const setupHandlers = () => {
            // Google Sign-In
            const googleBtn = document.getElementById('google-signin-btn');
            if (googleBtn) {
                googleBtn.addEventListener('click', async () => {
                    try {
                        console.log('[MoviEase] Google sign-in clicked');
                        googleBtn.textContent = 'Redirecting to Google...';
                        googleBtn.disabled = true;
                        
                        await authService.signInWithGoogle();
                        // Page will redirect - no code after this runs
                    } catch (error) {
                        console.error('[MoviEase] Google sign-in failed:', error);
                        googleBtn.textContent = 'Continue with Google';
                        googleBtn.disabled = false;
                        alert('Google sign-in failed. Please try again.');
                    }
                });
                console.log('[MoviEase] ✅ Google button handler attached');
            }

            // Guest Sign-In
            const guestBtn = document.getElementById('guest-signin-btn');
            if (guestBtn) {
                guestBtn.addEventListener('click', async () => {
                    try {
                        console.log('[MoviEase] Guest sign-in clicked');
                        guestBtn.textContent = 'Signing in as guest...';
                        guestBtn.disabled = true;
                        
                        await authService.signInAnonymously();
                        // Redirect handled by auth service
                    } catch (error) {
                        console.error('[MoviEase] Guest sign-in failed:', error);
                        guestBtn.textContent = 'Continue as Guest';
                        guestBtn.disabled = false;
                        alert('Guest sign-in failed. Please try again.');
                    }
                });
                console.log('[MoviEase] ✅ Guest button handler attached');
            }

            // Email/Password Sign-In Form
            const emailForm = document.getElementById('email-signin-form');
            if (emailForm) {
                emailForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const email = document.getElementById('email')?.value;
                    const password = document.getElementById('password')?.value;
                    const submitBtn = emailForm.querySelector('button[type="submit"]');
                    
                    if (!email || !password) {
                        alert('Please enter email and password');
                        return;
                    }

                    try {
                        console.log('[MoviEase] Email sign-in clicked');
                        const originalText = submitBtn.textContent;
                        submitBtn.textContent = 'Signing in...';
                        submitBtn.disabled = true;
                        
                        await authService.signIn(email, password);
                        // Redirect handled by auth service
                    } catch (error) {
                        console.error('[MoviEase] Email sign-in failed:', error);
                        submitBtn.textContent = 'Sign In';
                        submitBtn.disabled = false;
                        alert('Sign in failed. Please check your credentials and try again.');
                    }
                });
                console.log('[MoviEase] ✅ Email signin form handler attached');
            }
        };

        setupHandlers();
        setTimeout(setupHandlers, 500);
    }

    showLoginPage() {
        console.log('[MoviEase] Showing login page');
        
        const loginContainers = [
            document.getElementById('login-container'),
            document.querySelector('.login-container'),
            document.querySelector('[data-login]')
        ].filter(Boolean);
        
        loginContainers.forEach(container => {
            container.style.display = 'block';
            container.style.visibility = 'visible';
            container.style.opacity = '1';
            container.style.position = 'relative';
            container.style.zIndex = '9999';
        });
        
        // ✅ Remove app-active class
        document.body.classList.remove('app-active');
        
        if (this.container) {
            this.container.style.display = 'none';
        }
        if (this.bottomNav) {
            this.bottomNav.style.display = 'none';
        }
        
        const header = document.getElementById('app-header');
        if (header) {
            header.style.display = 'none';
        }
        
        const onboarding = document.getElementById('onboarding-container');
        if (onboarding) {
            onboarding.style.display = 'none';
        }
        
        if (loginContainers.length > 0) {
            console.log('[MoviEase] ✅ Login container visible');
            setTimeout(() => this.setupLoginHandlers(), 100);
        } else {
            console.error('[MoviEase] ❌ No login container found!');
        }
    }

    async waitForAuthState() {
        return new Promise((resolve) => {
            if (authService.getCurrentUser() !== null || this.authInitialized) {
                console.log('[MoviEase] Auth state already determined');
                resolve();
                return;
            }
            
            console.log('[MoviEase] Waiting for auth state...');
            let timeout;
            
            const unsubscribe = store.subscribe((state) => {
                if (state.isAuthenticated !== undefined) {
                    console.log('[MoviEase] Auth state determined:', state.isAuthenticated);
                    clearTimeout(timeout);
                    this.authInitialized = true;
                    unsubscribe();
                    resolve();
                }
            });
            
            // ✅ INCREASED TIMEOUT: 5 seconds instead of 2 (for Google redirect)
            timeout = setTimeout(() => {
                console.log('[MoviEase] Auth state timeout, proceeding anyway');
                this.authInitialized = true;
                unsubscribe();
                resolve();
            }, 5000);
        });
    }

    async checkNeedsOnboarding(user) {
        try {
            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('./services/firebase-config.js');
            
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                console.log('[MoviEase] User doc does not exist, needs onboarding');
                return true;
            }
            
            const userData = userDoc.data();
            const needsOnboarding = !userData.onboardingCompleted;
            
            console.log('[MoviEase] Onboarding status:', userData.onboardingCompleted ? 'Complete' : 'Incomplete');
            return needsOnboarding;
            
        } catch (error) {
            console.error('[MoviEase] Error checking onboarding status:', error);
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
        console.log('[MoviEase] Initializing enhanced services...');
        
        try {
            const { doesTheDogDieService } = await import('./services/does-the-dog-die.js');
            const { ENV } = await import('./config/env.js');
            
            if (doesTheDogDieService && ENV && ENV.DTD_API_KEY) {
                this.services.triggerWarnings = doesTheDogDieService;
                console.log('[MoviEase] ✅ DoesTheDogDie service ready');
            }
        } catch (error) {
            console.warn('[MoviEase] ⚠️ DoesTheDogDie service not loaded:', error.message);
        }
        
        this.services.userProfile = userProfileService;
        console.log('[MoviEase] ✅ Loaded services');
        
        if (typeof window !== 'undefined') {
            window.moviEaseServices = this.services;
        }
    }

    setupDOM() {
        this.container = document.getElementById('app-container') || this.createAppContainer();
        this.bottomNav = document.getElementById('bottom-nav') || this.createBottomNav();
        
        this.container.style.display = 'none';
        this.bottomNav.style.display = 'none';
        
        this.setupNavigationListeners();
        window.addEventListener('navigate-to-tab', (e) => this.navigateToTab(e.detail));
    }

    createAppContainer() {
        const container = document.createElement('div');
        container.id = 'app-container';
        container.style.cssText = `
            width: 100%;
            min-height: 100vh;
            position: relative;
            padding-bottom: 5rem;
            display: none;
        `;
        document.body.appendChild(container);
        return container;
    }

    createBottomNav() {
        const nav = document.createElement('nav');
        nav.id = 'bottom-nav';
        nav.innerHTML = `
            <style>
                #bottom-nav {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 5rem;
                    background: linear-gradient(180deg, rgba(20, 24, 36, 0.98) 0%, rgba(26, 31, 46, 0.98) 100%);
                    border-top: 1px solid rgba(176, 212, 227, 0.15);
                    backdrop-filter: blur(20px);
                    z-index: 100;
                    display: none;
                }

                .nav-container {
                    display: flex;
                    justify-content: space-around;
                    align-items: center;
                    max-width: 600px;
                    margin: 0 auto;
                    height: 100%;
                    padding: 0 0.5rem;
                    position: relative;
                }

                .nav-btn {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 0.25rem;
                    padding: 0.5rem;
                    background: transparent;
                    border: none;
                    color: rgba(176, 212, 227, 0.5);
                    font-size: 0.75rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    border-radius: 0.75rem;
                }

                .nav-btn:hover {
                    color: rgba(176, 212, 227, 0.8);
                    background: rgba(176, 212, 227, 0.05);
                }

                .nav-btn.active {
                    color: #b0d4e3;
                }

                .nav-icon {
                    font-size: 1.5rem;
                    transition: transform 0.2s;
                }

                .nav-btn:hover .nav-icon {
                    transform: scale(1.1);
                }

                /* Special styling for center swipe button */
                #swipe-btn-wrapper {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 10;
                }

                #swipe-btn {
                    width: 4rem;
                    height: 4rem;
                    background: linear-gradient(135deg, #b0d4e3, #f4e8c1);
                    border: 3px solid #1a1f2e;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s;
                    box-shadow: 0 8px 24px rgba(176, 212, 227, 0.3);
                    color: #1a1f2e;
                    font-size: 2rem;
                }

                #swipe-btn:hover {
                    transform: scale(1.1);
                    box-shadow: 0 12px 32px rgba(176, 212, 227, 0.5);
                }

                #swipe-btn:active {
                    transform: scale(0.95);
                }

                #swipe-btn.active {
                    background: linear-gradient(135deg, #f4e8c1, #b0d4e3);
                    border-color: #b0d4e3;
                }

                /* Create space for center button */
                .nav-btn:nth-child(2) {
                    margin-right: 3rem;
                }

                .nav-btn:nth-child(3) {
                    margin-left: 3rem;
                }

                @media (max-width: 480px) {
                    .nav-btn {
                        font-size: 0.65rem;
                        padding: 0.25rem;
                    }
                    
                    .nav-icon {
                        font-size: 1.25rem;
                    }
                    
                    #swipe-btn {
                        width: 3.5rem;
                        height: 3.5rem;
                        font-size: 1.75rem;
                    }
                }
            </style>
            <div class="nav-container">
                <button class="nav-btn" data-tab="home">
                    <span class="nav-icon">🏠</span>
                    <span>Home</span>
                </button>
                
                <button class="nav-btn" data-tab="library">
                    <span class="nav-icon">📚</span>
                    <span>Library</span>
                </button>
                
                <!-- Center swipe button -->
                <div id="swipe-btn-wrapper">
                    <button id="swipe-btn" data-tab="swipe">
                        <span>👆</span>
                    </button>
                </div>
                
                <button class="nav-btn" data-tab="matches">
                    <span class="nav-icon">🤝</span>
                    <span>Matches</span>
                </button>
                
                <button class="nav-btn" data-tab="profile">
                    <span class="nav-icon">👤</span>
                    <span>Profile</span>
                </button>
            </div>
        `;
        document.body.appendChild(nav);
        return nav;
    }

    setupNavigationListeners() {
        this.bottomNav.addEventListener('click', (e) => {
            const btn = e.target.closest('.nav-btn, #swipe-btn');
            if (btn) {
                const tab = btn.dataset.tab;
                if (tab) this.navigateToTab(tab);
            }
        });
    }

    navigateToTab(tabName) {
        if (!tabName) return;
        console.log('[MoviEase] Navigating to:', tabName);
        this.currentTab = tabName;
        if (tabName === 'swipe') this.tabs.swipe = new SwipeTab();
        this.updateNavigation();
        this.renderCurrentTab();
    }

    updateNavigation() {
        this.bottomNav.querySelectorAll('.nav-btn').forEach(btn => {
            const isActive = btn.dataset.tab === this.currentTab;
            if (isActive) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Handle swipe button separately
        const swipeBtn = this.bottomNav.querySelector('#swipe-btn');
        if (swipeBtn) {
            if (this.currentTab === 'swipe') {
                swipeBtn.classList.add('active');
            } else {
                swipeBtn.classList.remove('active');
            }
        }
    }

    async renderCurrentTab() {
        if (!this.container) {
            console.error('[MoviEase] No container available for rendering');
            return;
        }
        
        // Show loading spinner with MoviEase colors
        this.container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: calc(100vh - 15rem);">
                <div style="text-align: center;">
                    <div style="width: 48px; height: 48px; border: 4px solid rgba(176, 212, 227, 0.2); border-top-color: #b0d4e3; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                    <p style="color: rgba(176, 212, 227, 0.7); font-size: 0.875rem;">Loading...</p>
                </div>
            </div>
            <style>@keyframes spin { to { transform: rotate(360deg); }}</style>
        `;
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const tab = this.tabs[this.currentTab];
        
        if (!tab) {
            console.error(`[MoviEase] Tab '${this.currentTab}' not found`);
            this.container.innerHTML = `
                <div style="padding: 2rem; text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <h3 style="color: white; margin-bottom: 1rem;">Tab Not Found</h3>
                    <p style="color: rgba(176, 212, 227, 0.7);">The '${this.currentTab}' tab could not be loaded.</p>
                </div>
            `;
            return;
        }
        
        // ✅ CRITICAL: Clear container and ensure it's visible
        this.container.innerHTML = '';
        this.container.style.display = 'block';
        
        // ✅ FIXED: Matches tab uses init() instead of render()
        if (this.currentTab === 'matches') {
            try {
                console.log(`[MoviEase] Initializing Matches tab`);
                await tab.init(this.container);
                console.log(`[MoviEase] ✅ Matches tab initialized`);
            } catch (error) {
                console.error(`[MoviEase] Error initializing Matches tab:`, error);
                this.container.innerHTML = `
                    <div style="padding: 2rem; text-align: center;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                        <h3 style="color: white; margin-bottom: 1rem;">Oops! Something went wrong</h3>
                        <p style="color: rgba(176, 212, 227, 0.7); margin-bottom: 0.5rem;">Error: ${error.message}</p>
                        <p style="color: rgba(176, 212, 227, 0.5); font-size: 0.875rem; margin-bottom: 1.5rem;">Tab: matches</p>
                        <button onclick="location.reload()" style="margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #b0d4e3, #f4e8c1); border: none; border-radius: 0.75rem; color: #1a1f2e; font-weight: 600; cursor: pointer;">
                            Reload App
                        </button>
                    </div>
                `;
            }
        } else if (typeof tab.render === 'function') {
            try {
                console.log(`[MoviEase] Rendering tab: ${this.currentTab}`);
                await tab.render(this.container);
                console.log(`[MoviEase] ✅ Tab rendered: ${this.currentTab}`);
            } catch (error) {
                console.error(`[MoviEase] Error rendering ${this.currentTab}:`, error);
                this.container.innerHTML = `
                    <div style="padding: 2rem; text-align: center;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                        <h3 style="color: white; margin-bottom: 1rem;">Oops! Something went wrong</h3>
                        <p style="color: rgba(176, 212, 227, 0.7); margin-bottom: 0.5rem;">Error: ${error.message}</p>
                        <p style="color: rgba(176, 212, 227, 0.5); font-size: 0.875rem; margin-bottom: 1.5rem;">Tab: ${this.currentTab}</p>
                        <button onclick="location.reload()" style="margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #b0d4e3, #f4e8c1); border: none; border-radius: 0.75rem; color: #1a1f2e; font-weight: 600; cursor: pointer;">
                            Reload App
                        </button>
                    </div>
                `;
            }
        } else if (typeof tab.init === 'function') {
            try {
                console.log(`[MoviEase] Initializing tab: ${this.currentTab}`);
                await tab.init(this.container);
                console.log(`[MoviEase] ✅ Tab initialized: ${this.currentTab}`);
            } catch (error) {
                console.error(`[MoviEase] Error initializing ${this.currentTab}:`, error);
                this.container.innerHTML = `
                    <div style="padding: 2rem; text-align: center;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                        <h3 style="color: white; margin-bottom: 1rem;">Oops! Something went wrong</h3>
                        <p style="color: rgba(176, 212, 227, 0.7); margin-bottom: 0.5rem;">Error: ${error.message}</p>
                        <p style="color: rgba(176, 212, 227, 0.5); font-size: 0.875rem; margin-bottom: 1.5rem;">Tab: ${this.currentTab}</p>
                        <button onclick="location.reload()" style="margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #b0d4e3, #f4e8c1); border: none; border-radius: 0.75rem; color: #1a1f2e; font-weight: 600; cursor: pointer;">
                            Reload App
                        </button>
                    </div>
                `;
            }
        }
    }

    showApp() {
        console.log('[MoviEase] Showing main app interface');
        
        const loginContainers = [
            document.getElementById('login-container'),
            document.querySelector('.login-container'),
            document.querySelector('[data-login]')
        ].filter(Boolean);
        
        loginContainers.forEach(container => {
            container.style.display = 'none';
        });
        
        // ✅ Add body class to prevent double scrolling
        document.body.classList.add('app-active');
        
        if (this.container) {
            this.container.style.display = 'block';
        }
        if (this.bottomNav) this.bottomNav.style.display = 'block';
        
        const header = document.getElementById('app-header');
        if (header) header.style.display = 'block';
        
        this.renderCurrentTab();
        this.setupPreferencesSync();
    }

    setupPreferencesSync() {
        store.subscribe((state) => {
            try {
                if (state.swipeHistory) {
                    localStorage.setItem('moviEaseSwipeHistory', JSON.stringify(state.swipeHistory));
                }
            } catch (error) {
                console.error('[MoviEase] Failed to sync swipe history:', error);
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new MoviEaseApp();
        app.init();
    });
} else {
    const app = new MoviEaseApp();
    app.init();
}

export { MoviEaseApp };
