/**
 * App Initialization
 * Handles app startup, onboarding flow, and tab navigation
 */

import { onboardingFlow } from './components/onboarding-flow.js';
import { SwipeTab } from './tabs/swipe.js';
import { LibraryTab } from './tabs/library.js';
import { ProfileTab } from './tabs/profile.js';
import { HomeTab } from './tabs/home.js';
import { MatchesTab } from './tabs/matches.js';
import { store } from './state/store.js';
import { authService } from './services/auth-service.js';

class MoviePickerApp {
    constructor() {
        this.currentTab = 'swipe';
        this.tabs = {};
        this.container = null;
        this.bottomNav = null;
    }

    async init() {
        console.log('[App] Initializing Movie Picker App...');

        // Load preferences from localStorage
        this.loadPreferences();

        // Initialize tabs FIRST
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
            // User already onboarded, show app
            console.log('[App] User already onboarded, showing app');
            this.showApp();
        } else {
            // Onboarding will handle showing the app
            console.log('[App] Starting onboarding flow');
            
            // Listen for onboarding completion
            const handleNavigation = (e) => {
                console.log('[App] Onboarding complete, showing app');
                this.showApp();
                this.navigateToTab(e.detail);
                window.removeEventListener('navigate-to-tab', handleNavigation);
            };
            
            window.addEventListener('navigate-to-tab', handleNavigation);
        }
    }

    loadPreferences() {
        try {
            const saved = localStorage.getItem('moviePickerPreferences');
            if (saved) {
                const preferences = JSON.parse(saved);
                store.setState({ preferences });
                console.log('[App] Loaded preferences from localStorage');
            }
        } catch (error) {
            console.error('[App] Failed to load preferences:', error);
        }

        // Load swipe history
        try {
            const savedHistory = localStorage.getItem('moviePickerSwipeHistory');
            if (savedHistory) {
                const swipeHistory = JSON.parse(savedHistory);
                store.setState({ swipeHistory });
                console.log(`[App] Loaded ${swipeHistory.length} swipes from localStorage`);
            }
        } catch (error) {
            console.error('[App] Failed to load swipe history:', error);
        }
    }

    setupDOM() {
        // Main container
        this.container = document.getElementById('app-container') || this.createAppContainer();

        // Bottom navigation
        this.bottomNav = document.getElementById('bottom-nav') || this.createBottomNav();

        // Setup navigation listeners
        this.setupNavigationListeners();

        // Listen for navigation events
        window.addEventListener('navigate-to-tab', (e) => {
            this.navigateToTab(e.detail);
        });
    }

    createAppContainer() {
        const container = document.createElement('div');
        container.id = 'app-container';
        container.style.cssText = `
            min-height: 100vh;
            padding-bottom: 5rem;
        `;
        document.body.appendChild(container);
        return container;
    }

    createBottomNav() {
        const nav = document.createElement('nav');
        nav.id = 'bottom-nav';
        nav.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(17, 17, 27, 0.95);
            backdrop-filter: blur(10px);
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding: 0.5rem;
            z-index: 1000;
        `;

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
            <button class="nav-btn" data-tab="${tabName}" style="
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.25rem;
                padding: 0.75rem 0.5rem;
                background: ${isActive ? 'rgba(255, 46, 99, 0.1)' : 'transparent'};
                border: none;
                border-radius: 0.75rem;
                color: ${isActive ? '#ff2e63' : 'rgba(255, 255, 255, 0.6)'};
                font-size: 0.75rem;
                font-weight: ${isActive ? '700' : '600'};
                cursor: pointer;
                transition: all 0.3s;
            ">
                <span style="font-size: 1.5rem;">${icon}</span>
                <span>${label}</span>
            </button>
        `;
    }

    setupNavigationListeners() {
        this.bottomNav.addEventListener('click', (e) => {
            const btn = e.target.closest('.nav-btn');
            if (btn) {
                const tabName = btn.dataset.tab;
                this.navigateToTab(tabName);
            }
        });
    }

    navigateToTab(tabName) {
        if (!tabName) {
            console.warn('[App] No tab name provided to navigateToTab');
            return;
        }

        if (this.currentTab === tabName) {
            console.log(`[App] Already on ${tabName} tab, skipping navigation`);
            return;
        }

        console.log(`[App] Navigating from ${this.currentTab} to ${tabName} tab`);
        this.currentTab = tabName;

        // Update navigation UI
        this.updateNavigation();

        // Render tab
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

        // Clear container
        this.container.innerHTML = '';

        // Show loading state briefly for better UX
        this.container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:calc(100vh - 15rem);"><div style="color:rgba(255,255,255,0.6);">Loading...</div></div>';

        // Small delay to ensure smooth transition
        await new Promise(resolve => setTimeout(resolve, 50));

        // Clear again before rendering
        this.container.innerHTML = '';

        // Render selected tab
        const tab = this.tabs[this.currentTab];
        if (tab && typeof tab.render === 'function') {
            try {
                await tab.render(this.container);
                console.log(`[App] Rendered ${this.currentTab} tab successfully`);
            } catch (error) {
                console.error(`[App] Error rendering ${this.currentTab} tab:`, error);
                this.container.innerHTML = `
                    <div style="display:flex;align-items:center;justify-content:center;height:calc(100vh - 15rem);flex-direction:column;gap:1rem;padding:2rem;">
                        <div style="font-size:3rem;">⚠️</div>
                        <div style="color:white;font-weight:700;font-size:1.25rem;">Error Loading ${this.currentTab}</div>
                        <div style="color:rgba(255,255,255,0.6);font-size:0.875rem;">Check console for details</div>
                        <button onclick="location.reload()" style="padding:0.75rem 1.5rem;background:linear-gradient(135deg,#ff2e63,#d90062);border:none;border-radius:0.75rem;color:white;font-weight:700;cursor:pointer;">
                            Reload App
                        </button>
                    </div>
                `;
            }
        } else {
            console.error(`[App] Tab not found or invalid: ${this.currentTab}`);
            this.container.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;height:calc(100vh - 15rem);flex-direction:column;gap:1rem;">
                    <div style="font-size:3rem;">❌</div>
                    <div style="color:white;font-weight:700;">Tab Not Found</div>
                    <div style="color:rgba(255,255,255,0.6);">${this.currentTab}</div>
                </div>
            `;
        }
    }

    showApp() {
        // Ensure app container and nav are visible
        if (this.container) {
            this.container.style.display = 'block';
        }
        if (this.bottomNav) {
            this.bottomNav.style.display = 'flex'; // Changed from 'block' to 'flex'
        }
        
        // Show header
        const header = document.getElementById('app-header');
        if (header) {
            header.style.display = 'block';
        }

        // Render current tab
        this.renderCurrentTab();

        // Save preferences on changes
        this.setupPreferencesSync();
    }

    setupPreferencesSync() {
        // Listen for preference updates
        window.addEventListener('preferences-updated', (e) => {
            try {
                localStorage.setItem('moviePickerPreferences', JSON.stringify(e.detail));
                console.log('[App] Preferences synced to localStorage');
            } catch (error) {
                console.error('[App] Failed to sync preferences:', error);
            }
        });

        // Listen for swipe history updates
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

// Initialize app when DOM is ready
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
