/**
 * MoviEase - App Initialization
 * Discover your next favorite film with ease
 * 
 * ✅ FIXED: Desktop scrolling enabled for all tabs
 * ✅ FIXED: MoviEase branding colors (Space Indigo, Powder Blue, Vanilla Custard)
 * ✅ FIXED: Proper scrolling at app-container level
 * ✅ FIXED: Better error handling and container checks
 * ✅ FIXED: Matches tab uses init() instead of render()
 * ✅ FIXED: Sign-up form handling added
 * ✅ FIXED: Duplicate event listener prevention
 * ✅ IMPROVED AUTH WAIT: 5 seconds for Google redirect
 * ✅ Handles onboarding flow for new users
 * ✅ Manages tab navigation and rendering
 * ✅ BADGE SYSTEM: Initializes badge tracking and notifications
 * ✅ UPDATED: Prussian Blue bottom navigation (#151529)
 * ✅ UPDATED: Modern arrow icons for Swipe tab
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
import { badgeService } from './services/badge-service.js';
import { badgeNotification } from './components/badge-notification.js';

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
        this.handlersSetup = false;
    }

    /**
     * Create consistent tab header for all tabs
     * Layout: [Logo] [App Name] on left, [Tab Title + Subtitle] centered
     */
    createTabHeader(tabName) {
        const headers = {
            home: {
                title: 'Home',
                subtitle: 'Discover your next favorite film'
            },
            swipe: {
                title: 'Swipe',
                subtitle: 'Find movies you\'ll love'
            },
            library: {
                title: 'Library',
                subtitle: 'Your collected movies'
            },
            matches: {
                title: 'Matches',
                subtitle: 'Movies you both want to watch'
            },
            profile: {
                title: 'Profile',
                subtitle: 'Manage your preferences'
            }
        };

        const headerData = headers[tabName.toLowerCase()] || headers.home;

        return `
            <style>
                .moviease-tab-header {
                    position: sticky;
                    top: 0;
                    left: 0;
                    right: 0;
                    background: #18183A;
                    border-bottom: 1px solid rgba(176, 212, 227, 0.1);
                    padding: 1rem 1.5rem;
                    z-index: 50;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }

                .moviease-header-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: grid;
                    grid-template-columns: 1fr auto 1fr;
                    align-items: center;
                }

                .moviease-header-left {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    justify-self: start;
                }

                .moviease-header-logo {
                    width: 40px;
                    height: 40px;
                    background: linear-gradient(135deg, #1e3a5f, #2d5a8f);
                    border-radius: 0.75rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    box-shadow: 0 4px 12px rgba(176, 212, 227, 0.2);
                }

                .moviease-header-app-name {
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: #ffffff;
                    letter-spacing: -0.02em;
                    margin: 0;
                }

                .moviease-header-center {
                    text-align: center;
                    justify-self: center;
                }

                .moviease-header-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #ffffff;
                    margin: 0 0 0.25rem 0;
                    letter-spacing: -0.01em;
                }

                .moviease-header-subtitle {
                    font-size: 0.875rem;
                    color: rgba(176, 212, 227, 0.7);
                    margin: 0;
                    font-weight: 400;
                }

                @media (max-width: 768px) {
                    .moviease-tab-header {
                        padding: 0.75rem 1rem;
                    }

                    .moviease-header-content {
                        grid-template-columns: auto 1fr;
                        gap: 1rem;
                    }

                    .moviease-header-center {
                        justify-self: end;
                        text-align: right;
                    }

                    .moviease-header-logo {
                        width: 32px;
                        height: 32px;
                        font-size: 1.25rem;
                    }

                    .moviease-header-app-name {
                        font-size: 1rem;
                    }

                    .moviease-header-title {
                        font-size: 1.25rem;
                    }

                    .moviease-header-subtitle {
                        font-size: 0.75rem;
                    }
                }

                @media (max-width: 480px) {
                    .moviease-header-app-name {
                        display: none;
                    }
                }
            </style>

            <div class="moviease-tab-header">
                <div class="moviease-header-content">
                    <div class="moviease-header-left">
                        <div class="moviease-header-logo">🎬</div>
                        <h1 class="moviease-header-app-name">MoviEase</h1>
                    </div>
                    
                    <div class="moviease-header-center">
                        <h2 class="moviease-header-title">${headerData.title}</h2>
                        <p class="moviease-header-subtitle">${headerData.subtitle}</p>
                    </div>

                    <div></div>
                </div>
            </div>
        `;
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

        // ✅ NEW: Initialize Badge System
        await this.initializeBadgeSystem(user);

        console.log('[MoviEase] Initializing tabs...');
        this.tabs = {
            home: new HomeTab(),
            swipe: new SwipeTab(),
            library: new LibraryTab(),
            matches: matchesTab,
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

    async initializeBadgeSystem(user) {
        try {
            console.log('[MoviEase] Initializing badge system...');
            
            // Initialize notification component
            badgeNotification.init();
            
            // Initialize user badges if authenticated
            if (user) {
                await badgeService.initializeUserBadges(user.uid);
                console.log('[MoviEase] ✅ Badge system initialized');
            }
        } catch (error) {
            console.error('[MoviEase] Badge system initialization failed:', error);
            // Non-critical - app can continue without badges
        }
    }

    setupLoginHandlers() {
        console.log('[MoviEase] Setting up login button handlers...');
        
        // ✅ Track if handlers are already set up
        if (this.handlersSetup) return;
        this.handlersSetup = true;
        
        const setupHandlers = () => {
            // ✅ FIX: Remove existing listeners by cloning elements
            const googleBtn = document.getElementById('google-signin-btn');
            const guestBtn = document.getElementById('guest-signin-btn');
            const showSignupBtn = document.getElementById('show-signup-btn');
            const showSigninBtn = document.getElementById('show-signin-btn');
            const signinForm = document.getElementById('email-signin-form');
            const signupForm = document.getElementById('email-signup-form');

            // Google Sign-In
            if (googleBtn) {
                const newGoogleBtn = googleBtn.cloneNode(true);
                googleBtn.parentNode.replaceChild(newGoogleBtn, googleBtn);
                
                newGoogleBtn.addEventListener('click', async () => {
                    try {
                        console.log('[MoviEase] Google sign-in clicked');
                        newGoogleBtn.textContent = 'Opening Google...';
                        newGoogleBtn.disabled = true;
                        
                        await authService.signInWithGoogle();
                    } catch (error) {
                        console.error('[MoviEase] Google sign-in failed:', error);
                        newGoogleBtn.textContent = 'Continue with Google';
                        newGoogleBtn.disabled = false;
                        
                        // Don't alert if user closed popup
                        if (error.code !== 'auth/popup-closed-by-user' && 
                            error.code !== 'auth/cancelled-popup-request') {
                            alert('Google sign-in failed. Please check if popups are blocked and try again.');
                        }
                    }
                });
                console.log('[MoviEase] ✅ Google button handler attached');
            }

            // Guest Sign-In
            if (guestBtn) {
                const newGuestBtn = guestBtn.cloneNode(true);
                guestBtn.parentNode.replaceChild(newGuestBtn, guestBtn);
                
                newGuestBtn.addEventListener('click', async () => {
                    try {
                        console.log('[MoviEase] Guest sign-in clicked');
                        newGuestBtn.textContent = 'Signing in as guest...';
                        newGuestBtn.disabled = true;
                        
                        await authService.signInAnonymously();
                    } catch (error) {
                        console.error('[MoviEase] Guest sign-in failed:', error);
                        newGuestBtn.textContent = 'Continue as Guest';
                        newGuestBtn.disabled = false;
                        alert('Guest sign-in failed. Please try again.');
                    }
                });
                console.log('[MoviEase] ✅ Guest button handler attached');
            }

            // Toggle between sign-in and sign-up forms
            if (showSignupBtn && signupForm && signinForm) {
                const newShowSignupBtn = showSignupBtn.cloneNode(true);
                showSignupBtn.parentNode.replaceChild(newShowSignupBtn, showSignupBtn);
                
                newShowSignupBtn.addEventListener('click', () => {
                    signinForm.style.display = 'none';
                    signupForm.style.display = 'block';
                });
                console.log('[MoviEase] ✅ Show signup button handler attached');
            }

            if (showSigninBtn && signupForm && signinForm) {
                const newShowSigninBtn = showSigninBtn.cloneNode(true);
                showSigninBtn.parentNode.replaceChild(newShowSigninBtn, showSigninBtn);
                
                newShowSigninBtn.addEventListener('click', () => {
                    signupForm.style.display = 'none';
                    signinForm.style.display = 'block';
                });
                console.log('[MoviEase] ✅ Show signin button handler attached');
            }

            // Email Sign-In Form
            if (signinForm) {
                const newSigninForm = signinForm.cloneNode(true);
                signinForm.parentNode.replaceChild(newSigninForm, signinForm);
                
                newSigninForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const email = newSigninForm.querySelector('#signin-email')?.value;
                    const password = newSigninForm.querySelector('#signin-password')?.value;
                    const submitBtn = newSigninForm.querySelector('button[type="submit"]');
                    
                    if (!email || !password) {
                        alert('Please enter email and password');
                        return;
                    }

                    try {
                        console.log('[MoviEase] Email sign-in clicked');
                        submitBtn.textContent = 'Signing in...';
                        submitBtn.disabled = true;
                        
                        await authService.signIn(email, password);
                    } catch (error) {
                        console.error('[MoviEase] Email sign-in failed:', error);
                        submitBtn.textContent = 'Sign In';
                        submitBtn.disabled = false;
                        alert('Sign in failed. Please check your credentials and try again.');
                    }
                });
                console.log('[MoviEase] ✅ Email signin form handler attached');
            }

            // Email Sign-Up Form
            if (signupForm) {
                const newSignupForm = signupForm.cloneNode(true);
                signupForm.parentNode.replaceChild(newSignupForm, signupForm);
                
                newSignupForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const name = newSignupForm.querySelector('#signup-name')?.value;
                    const email = newSignupForm.querySelector('#signup-email')?.value;
                    const password = newSignupForm.querySelector('#signup-password')?.value;
                    const submitBtn = newSignupForm.querySelector('button[type="submit"]');
                    
                    if (!name || !email || !password) {
                        alert('Please fill in all fields');
                        return;
                    }

                    if (password.length < 6) {
                        alert('Password must be at least 6 characters');
                        return;
                    }

                    try {
                        console.log('[MoviEase] Email sign-up clicked');
                        submitBtn.textContent = 'Creating account...';
                        submitBtn.disabled = true;
                        
                        await authService.signUp(email, password, name);
                    } catch (error) {
                        console.error('[MoviEase] Email sign-up failed:', error);
                        submitBtn.textContent = 'Create Account';
                        submitBtn.disabled = false;
                        
                        const errorMsg = error.code === 'auth/email-already-in-use' 
                            ? 'This email is already registered. Please sign in instead.'
                            : 'Sign up failed. Please try again.';
                        alert(errorMsg);
                    }
                });
                console.log('[MoviEase] ✅ Email signup form handler attached');
            }
        };

        // ✅ ONLY call once - remove the duplicate setTimeout
        setupHandlers();
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
        
        document.body.classList.remove('app-active');
        document.body.style.overflow = '';
        document.body.style.height = '';
        
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
            height: calc(100vh - 5rem);
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            overflow-y: auto;
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch;
            background: #18183A;
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
                    background: #151529;
                    border-top: 1px solid rgba(176, 212, 227, 0.1);
                    box-shadow: 0 -4px 20px rgba(21, 21, 41, 0.6);
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
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 1rem;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                }

                .nav-icon {
                    width: 28px;
                    height: 28px;
                    position: relative;
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .nav-icon svg {
                    width: 100%;
                    height: 100%;
                    color: rgba(176, 212, 227, 0.5);
                    transition: color 0.3s ease;
                }

                .nav-label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: rgba(176, 212, 227, 0.5);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    letter-spacing: 0.02em;
                }

                .nav-btn:hover .nav-icon {
                    transform: scale(1.1);
                }

                .nav-btn:hover .nav-icon svg {
                    color: rgba(176, 212, 227, 0.8);
                }

                .nav-btn:hover .nav-label {
                    color: rgba(176, 212, 227, 0.8);
                }

                .nav-btn.active .nav-icon svg {
                    color: #b0d4e3;
                }

                .nav-btn.active .nav-label {
                    color: #b0d4e3;
                    font-weight: 700;
                }

                /* Center Swipe Button */
                #swipe-btn-wrapper {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 10;
                }

                #swipe-btn {
                    width: 5.5rem;
                    height: 5.5rem;
                    background: linear-gradient(135deg, #DFDFB0, #F4E8C1);
                    border: 3px solid #151529;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s;
                    box-shadow: 0 8px 24px rgba(223, 223, 176, 0.4);
                    padding: 0;
                }

                #swipe-btn:hover {
                    transform: scale(1.1);
                    box-shadow: 0 12px 32px rgba(223, 223, 176, 0.6);
                }

                #swipe-btn:active {
                    transform: scale(0.95);
                }

                #swipe-btn.active {
                    background: linear-gradient(135deg, #F4E8C1, #DFDFB0);
                    border-color: #b0d4e3;
                }

                /* Swipe Icon - Modern Arrows (Stacked) */
                .swipe-arrows {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    align-items: center;
                    justify-content: center;
                }

                .swipe-arrow {
                    width: 50px;
                    height: 25px;
                    flex-shrink: 0;
                }

                .swipe-arrow svg {
                    color: #18183A !important;
                    width: 100%;
                    height: 100%;
                }

                #swipe-btn:hover .swipe-arrow.right {
                    animation: swipe-right 0.8s ease-in-out infinite;
                }

                #swipe-btn:hover .swipe-arrow.left {
                    animation: swipe-left 0.8s ease-in-out infinite;
                }

                @keyframes swipe-left {
                    0%, 100% { transform: translateX(0); }
                    50% { transform: translateX(-3px); }
                }

                @keyframes swipe-right {
                    0%, 100% { transform: translateX(0); }
                    50% { transform: translateX(3px); }
                }

                /* Space for center button */
                .nav-btn:nth-child(2) {
                    margin-right: 3rem;
                }

                .nav-btn:nth-child(3) {
                    margin-left: 3rem;
                }

                /* Other icon animations */
                .nav-btn:hover .library-icon {
                    animation: book-open 0.5s ease-in-out;
                }

                @keyframes book-open {
                    0%, 100% { transform: rotateY(0deg); }
                    50% { transform: rotateY(15deg); }
                }

                .nav-btn:hover .matches-icon {
                    animation: heart-beat 0.5s ease-in-out;
                }

                @keyframes heart-beat {
                    0%, 100% { transform: scale(1); }
                    25% { transform: scale(1.1); }
                    50% { transform: scale(1); }
                    75% { transform: scale(1.1); }
                }

                .nav-btn:hover .profile-icon {
                    animation: sparkle 0.5s ease-in-out;
                }

                @keyframes sparkle {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-10deg); }
                    75% { transform: rotate(10deg); }
                }

                @media (max-width: 480px) {
                    .nav-btn {
                        font-size: 0.65rem;
                        padding: 0.25rem;
                    }
                    
                    .nav-icon {
                        width: 24px;
                        height: 24px;
                    }
                    
                    .nav-label {
                        font-size: 0.7rem;
                    }

                    #swipe-btn {
                        width: 3.5rem;
                        height: 3.5rem;
                    }

                    .swipe-arrow {
                        width: 18px;
                        height: 9px;
                    }
                }
            </style>
            <div class="nav-container">
                <!-- Home Button -->
                <button class="nav-btn" data-tab="home">
                    <div class="nav-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                        </svg>
                    </div>
                    <span class="nav-label">Home</span>
                </button>

                <!-- Library Button -->
                <button class="nav-btn" data-tab="library">
                    <div class="nav-icon library-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                        </svg>
                    </div>
                    <span class="nav-label">Library</span>
                </button>

                <!-- Center Swipe Button - Modern Arrows -->
                <div id="swipe-btn-wrapper">
                    <button id="swipe-btn" data-tab="swipe">
                        <div class="swipe-arrows">
                            <!-- Right Arrow (top) -->
                            <svg class="swipe-arrow right" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="5" y1="8" x2="19" y2="8"/>
                                <polyline points="15,4 19,8 15,12"/>
                            </svg>
                            <!-- Left Arrow (bottom) -->
                            <svg class="swipe-arrow left" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="19" y1="16" x2="5" y2="16"/>
                                <polyline points="9,12 5,16 9,20"/>
                            </svg>
                        </div>
                    </button>
                </div>

                <!-- Matches Button -->
                <button class="nav-btn" data-tab="matches">
                    <div class="nav-icon matches-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                    </div>
                    <span class="nav-label">Matches</span>
                </button>

                <!-- Profile Button -->
                <button class="nav-btn" data-tab="profile">
                    <div class="nav-icon profile-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <span class="nav-label">Profile</span>
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
        
        this.container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: calc(100vh - 15rem);">
                <div style="text-align: center;">
                    <div style="width: 48px; height: 48px; border: 4px solid rgba(223, 223, 176, 0.2); border-top-color: #DFDFB0; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                    <p style="color: rgba(223, 223, 176, 0.7); font-size: 0.875rem;">Loading...</p>
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
                    <h3 style="color: #DFDFB0; margin-bottom: 1rem;">Tab Not Found</h3>
                    <p style="color: rgba(223, 223, 176, 0.7);">The '${this.currentTab}' tab could not be loaded.</p>
                </div>
            `;
            return;
        }
        
        // ✅ Clear container and add header first
        this.container.innerHTML = this.createTabHeader(this.currentTab);
        
        // ✅ Create content wrapper for tab content (no padding - let tabs control their own spacing)
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'tab-content-wrapper';
        contentWrapper.style.cssText = `
            overflow-y: auto;
            overflow-x: hidden;
            height: calc(100vh - 10rem);
            background: #18183A;
        `;
        this.container.appendChild(contentWrapper);
        
        this.container.style.display = 'block';
        
        if (this.currentTab === 'matches') {
            try {
                console.log(`[MoviEase] Initializing Matches tab`);
                await tab.init(contentWrapper);
                console.log(`[MoviEase] ✅ Matches tab initialized`);
            } catch (error) {
                console.error(`[MoviEase] Error initializing Matches tab:`, error);
                contentWrapper.innerHTML = `
                    <div style="padding: 2rem; text-align: center;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                        <h3 style="color: #DFDFB0; margin-bottom: 1rem;">Oops! Something went wrong</h3>
                        <p style="color: rgba(223, 223, 176, 0.7); margin-bottom: 0.5rem;">Error: ${error.message}</p>
                        <p style="color: rgba(223, 223, 176, 0.5); font-size: 0.875rem; margin-bottom: 1.5rem;">Tab: matches</p>
                        <button onclick="location.reload()" style="margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #DFDFB0, #F4E8C1); border: none; border-radius: 0.75rem; color: #18183A; font-weight: 600; cursor: pointer;">
                            Reload App
                        </button>
                    </div>
                `;
            }
        } else if (typeof tab.render === 'function') {
            try {
                console.log(`[MoviEase] Rendering tab: ${this.currentTab}`);
                await tab.render(contentWrapper);
                console.log(`[MoviEase] ✅ Tab rendered: ${this.currentTab}`);
            } catch (error) {
                console.error(`[MoviEase] Error rendering ${this.currentTab}:`, error);
                contentWrapper.innerHTML = `
                    <div style="padding: 2rem; text-align: center;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                        <h3 style="color: #DFDFB0; margin-bottom: 1rem;">Oops! Something went wrong</h3>
                        <p style="color: rgba(223, 223, 176, 0.7); margin-bottom: 0.5rem;">Error: ${error.message}</p>
                        <p style="color: rgba(223, 223, 176, 0.5); font-size: 0.875rem; margin-bottom: 1.5rem;">Tab: ${this.currentTab}</p>
                        <button onclick="location.reload()" style="margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #DFDFB0, #F4E8C1); border: none; border-radius: 0.75rem; color: #18183A; font-weight: 600; cursor: pointer;">
                            Reload App
                        </button>
                    </div>
                `;
            }
        } else if (typeof tab.init === 'function') {
            try {
                console.log(`[MoviEase] Initializing tab: ${this.currentTab}`);
                await tab.init(contentWrapper);
                console.log(`[MoviEase] ✅ Tab initialized: ${this.currentTab}`);
            } catch (error) {
                console.error(`[MoviEase] Error initializing ${this.currentTab}:`, error);
                contentWrapper.innerHTML = `
                    <div style="padding: 2rem; text-align: center;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                        <h3 style="color: #DFDFB0; margin-bottom: 1rem;">Oops! Something went wrong</h3>
                        <p style="color: rgba(223, 223, 176, 0.7); margin-bottom: 0.5rem;">Error: ${error.message}</p>
                        <p style="color: rgba(223, 223, 176, 0.5); font-size: 0.875rem; margin-bottom: 1.5rem;">Tab: ${this.currentTab}</p>
                        <button onclick="location.reload()" style="margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #DFDFB0, #F4E8C1); border: none; border-radius: 0.75rem; color: #18183A; font-weight: 600; cursor: pointer;">
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
        
        document.body.style.overflow = 'hidden';
        document.body.style.height = '100vh';
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

export { MoviEaseApp };
