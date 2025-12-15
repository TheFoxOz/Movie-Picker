/**
 * MoviEase - App Initialization
 * Discover your next favorite film with ease
 * 
 * ✅ IMPROVED AUTH WAIT: 5 seconds for Google redirect
 * ✅ Handles onboarding flow for new users
 * ✅ Manages tab navigation and rendering
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
            matches: new MatchesTab(),
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
        container.style.cssText = 'min-height: 100vh; padding-bottom: 5rem; display: none;';
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
                    padding: 0.5rem 0;
                    display: none;
                }

                .nav-container {
                    display: flex;
                    justify-content: space-around;
                    align-items: center;
                    max-width: 600px;
                    margin: 0 auto;
                    height: 100%;
                    padding: 0 1rem;
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
                    border-radius: 0.75rem;
                    color: rgba(176, 212, 227, 0.6);
                    font-size: 0.75rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                }

                .nav-btn:hover {
                    color: rgba(176, 212, 227, 0.9);
                    transform: translateY(-2px);
                }

                .nav-btn.active {
                    color: #b0d4e3;
                    font-weight: 700;
                }

                .nav-btn.active::after {
                    content: '';
                    position: absolute;
                    bottom: -0.5rem;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 4px;
                    height: 4px;
                    background: #b0d4e3;
                    border-radius: 50%;
                    box-shadow: 0 0 8px rgba(176, 212, 227, 0.6);
                }

                .nav-icon {
                    font-size: 1.5rem;
                    transition: transform 0.3s;
                }

                .nav-btn:hover .nav-icon {
                    transform: scale(1.1);
                }

                .nav-btn.active .nav-icon {
                    filter: drop-shadow(0 0 8px rgba(176, 212, 227, 0.4));
                }

                #swipe-btn {
                    width: 4rem;
                    height: 4rem;
                    background: linear-gradient(135deg, #1e3a5f, #2d5a8f);
                    border: 3px solid #b0d4e3;
                    border-radius: 50%;
                    margin: 0 0.5rem;
                    box-shadow: 0 8px 24px rgba(176, 212, 227, 0.3);
                }

                #swipe-btn:hover {
                    transform: scale(1.1);
                    box-shadow: 0 12px 32px rgba(176, 212, 227, 0.4);
                }

                #swipe-btn .nav-icon {
                    font-size: 2rem;
                }

                @media (max-width: 480px) {
                    .nav-btn {
                        font-size: 0.65rem;
                    }
                    
                    .nav-icon {
                        font-size: 1.25rem;
                    }
                    
                    #swipe-btn {
                        width: 3.5rem;
                        height: 3.5rem;
                    }
                }
            </style>
            <div class="nav-container">
                ${this.renderNavButton('home', '🏠', 'Home')}
                ${this.renderNavButton('swipe', '👆', 'Swipe', true)}
                ${this.renderNavButton('library', '📚', 'Library')}
                ${this.renderNavButton('matches', '🤝', 'Matches')}
                ${this.renderNavButton('profile', '👤', 'Profile')}
            </div>
        `;
        document.body.appendChild(nav);
        return nav;
    }

    renderNavButton(tabName, icon, label, isSwipeBtn = false) {
        const isActive = this.currentTab === tabName;
        const btnId = isSwipeBtn ? 'id="swipe-btn"' : '';
        const activeClass = isActive ? 'active' : '';
        
        return `
            <button class="nav-btn ${activeClass}" ${btnId} data-tab="${tabName}">
                <span class="nav-icon">${icon}</span>
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
    }

    async renderCurrentTab() {
        if (!this.container) return;
        
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
        this.container.innerHTML = '';
        
        const tab = this.tabs[this.currentTab];
        if (tab && typeof tab.render === 'function') {
            try {
                await tab.render(this.container);
            } catch (error) {
                console.error(`[MoviEase] Error rendering ${this.currentTab}:`, error);
                this.container.innerHTML = `
                    <div style="padding: 2rem; text-align: center;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                        <h3 style="color: white; margin-bottom: 1rem;">Oops! Something went wrong</h3>
                        <p style="color: rgba(176, 212, 227, 0.7);">We couldn't load this tab. Please try again.</p>
                        <button onclick="location.reload()" style="margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #1e3a5f, #2d5a8f); border: none; border-radius: 0.75rem; color: white; font-weight: 600; cursor: pointer;">
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
        
        if (this.container) this.container.style.display = 'block';
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
