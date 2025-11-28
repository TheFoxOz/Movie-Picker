/**
 * Main Application Entry Point
 * Initializes and coordinates all app modules
 */

import { store } from './state/store.js';
import { firebaseService } from './state/firebase.js';
import { initNotifications, showError } from './utils/notifications.js';
import { SwipeTab } from './tabs/swipe.js';
import { HomeTab } from './tabs/home.js';
import { MatchesTab } from './tabs/matches.js';
import { ProfileTab } from './tabs/profile.js';

// Mock movie data
const MOCK_MOVIES = [
    {
        id: "void-walker-2024",
        title: "The Void Walker",
        year: 2024,
        genre: "Sci-Fi / Mystery",
        type: "Movie",
        runtime: "128 min",
        imdb: 8.4,
        rt: 94,
        platform: "Netflix",
        actors: ["Anya Taylor-Joy", "Cillian Murphy"],
        trigger: ["Flashing Lights", "Isolation"],
        synopsis: "A lone astronaut wakes up millions of miles from Earth with no memory of his mission, but a growing sense of dread about what he left behind.",
        mood: "Mind-blowing, Thrilling",
    },
    {
        id: "echoes-2023",
        title: "Echoes of Tomorrow",
        year: 2023,
        genre: "Drama / Romance",
        type: "Series (Limited)",
        runtime: "6 Episodes",
        imdb: 7.9,
        rt: 88,
        platform: "Prime Video",
        actors: ["Tom Hanks", "Zendaya"],
        trigger: ["Emotional Loss", "Smoking"],
        synopsis: "A poignant limited series exploring two people's lives across parallel dimensions, searching for a moment they missed in time.",
        mood: "Cozy, Feel-good",
    },
    {
        id: "crystal-king-2022",
        title: "Crystal King",
        year: 2022,
        genre: "Fantasy / Adventure",
        type: "Movie",
        runtime: "145 min",
        imdb: 8.1,
        rt: 90,
        platform: "Hulu",
        actors: ["Chris Hemsworth", "Cate Blanchett"],
        trigger: ["High Violence", "Large Spiders"],
        synopsis: "The legend of the Crystal King resurfaces when a young peasant discovers a shard of the magical crystal, leading him on an epic quest.",
        mood: "Epic, Visual Spectacle",
    },
    {
        id: "rogue-protocol-2021",
        title: "Rogue Protocol",
        year: 2021,
        genre: "Action / Thriller",
        type: "Movie",
        runtime: "98 min",
        imdb: 7.5,
        rt: 82,
        platform: "Max (HBO)",
        actors: ["Idris Elba", "Gal Gadot"],
        trigger: ["Needles / Injections"],
        synopsis: "A rogue agent must race against time to expose a global conspiracy before a biological weapon is unleashed on a major city.",
        mood: "Fast-paced, Intense",
    }
];

class App {
    constructor() {
        this.tabs = new Map();
        this.currentTab = null;
        this.contentArea = null;
        this.navBar = null;
        this.loadingScreen = null;
    }
    
    /**
     * Initialize the application
     */
    async init() {
        try {
            // Get DOM elements
            this.contentArea = document.getElementById('content-area');
            this.navBar = document.getElementById('nav-bar');
            this.loadingScreen = document.getElementById('app-loading');
            
            // Initialize notification system
            initNotifications();
            
            // Initialize Firebase
            await this.initFirebase();
            
            // Load mock data
            store.setMovies(MOCK_MOVIES);
            
            // Initialize tabs
            this.initTabs();
            
            // Setup navigation
            this.setupNavigation();
            
            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();
            
            // Subscribe to store changes
            store.subscribe(this.handleStateChange.bind(this));
            
            // Hide loading screen and show app
            this.loadingScreen.style.display = 'none';
            this.contentArea.style.display = 'block';
            this.navBar.style.display = 'flex';
            
            // Navigate to initial tab
            this.navigateToTab('swipe');
            
            // Mark as initialized
            store.setState({ isInitialized: true });
            
            console.log('[App] Initialization complete');
            
        } catch (error) {
            console.error('[App] Initialization failed:', error);
            this.showErrorScreen(error);
        }
    }
    
    /**
     * Initialize Firebase
     */
    async initFirebase() {
        try {
            // Get Firebase config from global variables
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'movie-picker-app';
            const firebaseConfig = typeof __firebase_config !== 'undefined' 
                ? JSON.parse(__firebase_config) 
                : {};
            const authToken = typeof __initial_auth_token !== 'undefined' 
                ? __initial_auth_token 
                : null;
            
            // Only initialize if config exists
            if (Object.keys(firebaseConfig).length > 0) {
                await firebaseService.initialize(firebaseConfig, appId, authToken);
                
                // Update store with user info
                store.setState({
                    userId: firebaseService.getUserId(),
                    appId: appId,
                    isAuthenticated: true
                });
                
                console.log('[App] Firebase initialized');
            } else {
                // No Firebase config - use guest mode
                const guestId = 'guest-' + crypto.randomUUID().substring(0, 8);
                store.setState({
                    userId: guestId,
                    appId: appId,
                    isAuthenticated: false
                });
                
                console.log('[App] Running in guest mode');
            }
        } catch (error) {
            console.error('[App] Firebase initialization failed:', error);
            // Continue with guest mode
            const guestId = 'guest-' + crypto.randomUUID().substring(0, 8);
            store.setState({
                userId: guestId,
                isAuthenticated: false
            });
        }
    }
    
    /**
     * Initialize tab instances
     */
    initTabs() {
        this.tabs.set('home', new HomeTab(this.contentArea));
        this.tabs.set('swipe', new SwipeTab(this.contentArea));
        this.tabs.set('matches', new MatchesTab(this.contentArea));
        this.tabs.set('profile', new ProfileTab(this.contentArea));
        this.tabs.set('library', { render: () => this.renderLibrary() }); // Simple tab
    }
    
    /**
     * Setup navigation listeners
     */
    setupNavigation() {
        const navButtons = this.navBar.querySelectorAll('.nav-item');
        
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                this.navigateToTab(tabName);
            });
        });
    }
    
    /**
     * Navigate to a tab
     * @param {String} tabName - Tab identifier
     */
    navigateToTab(tabName) {
        if (this.currentTab === tabName) return;
        
        // Destroy previous tab if needed
        const prevTab = this.tabs.get(this.currentTab);
        if (prevTab && typeof prevTab.destroy === 'function') {
            prevTab.destroy();
        }
        
        // Update active state in nav
        const navButtons = this.navBar.querySelectorAll('.nav-item');
        navButtons.forEach(button => {
            const isActive = button.dataset.tab === tabName;
            button.classList.toggle('active', isActive);
        });
        
        // Render new tab
        const tab = this.tabs.get(tabName);
        if (tab && typeof tab.render === 'function') {
            this.contentArea.classList.add('page-entering');
            tab.render();
            
            setTimeout(() => {
                this.contentArea.classList.remove('page-entering');
            }, 500);
        }
        
        this.currentTab = tabName;
        store.setActiveTab(tabName);
    }
    
    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't intercept if user is typing
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
            
            const shortcuts = {
                '1': () => this.navigateToTab('home'),
                '2': () => this.navigateToTab('library'),
                '3': () => this.navigateToTab('swipe'),
                '4': () => this.navigateToTab('matches'),
                '5': () => this.navigateToTab('profile'),
                'ArrowLeft': () => this.triggerSwipeAction('pass'),
                'ArrowRight': () => this.triggerSwipeAction('like'),
                'ArrowUp': () => this.triggerSwipeAction('love'),
                'ArrowDown': () => this.triggerSwipeAction('maybe'),
            };
            
            const handler = shortcuts[e.key];
            if (handler) {
                e.preventDefault();
                handler();
            }
        });
    }
    
    /**
     * Trigger swipe action from keyboard
     * @param {String} action - Swipe action
     */
    triggerSwipeAction(action) {
        if (this.currentTab !== 'swipe') return;
        
        const swipeTab = this.tabs.get('swipe');
        if (swipeTab && swipeTab.currentCard) {
            swipeTab.currentCard.swipe(action);
        }
    }
    
    /**
     * Handle state changes
     * @param {Object} state - New state
     * @param {Object} prevState - Previous state
     */
    handleStateChange(state, prevState) {
        // Handle errors
        if (state.error && state.error !== prevState.error) {
            showError(state.error);
        }
        
        // Re-render current tab if movies changed
        if (state.movies !== prevState.movies) {
            const currentTab = this.tabs.get(this.currentTab);
            if (currentTab && typeof currentTab.render === 'function') {
                currentTab.render();
            }
        }
    }
    
    /**
     * Render library tab (simple implementation)
     */
    renderLibrary() {
        const movies = store.get('movies');
        
        this.contentArea.innerHTML = `
            <div class="container" style="padding: 1.5rem;">
                <h1>Movie Library</h1>
                <p style="color: var(--color-text-secondary); margin-bottom: 1.5rem;">
                    ${movies.length} movies available
                </p>
                <div class="stagger-children">
                    ${movies.map(movie => `
                        <div class="card" style="margin-bottom: 1rem;">
                            <div style="display: flex; gap: 1rem;">
                                <div style="width: 80px; height: 120px; background: var(--color-border); border-radius: 0.5rem; flex-shrink: 0;"></div>
                                <div style="flex: 1;">
                                    <h3>${movie.title}</h3>
                                    <p style="font-size: 0.875rem; color: var(--color-text-secondary);">
                                        ${movie.year} • ${movie.genre}
                                    </p>
                                    <p style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.5rem;" class="line-clamp-2">
                                        ${movie.synopsis}
                                    </p>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Show error screen
     * @param {Error} error - Error object
     */
    showErrorScreen(error) {
        if (this.loadingScreen) {
            this.loadingScreen.innerHTML = `
                <div class="error-state">
                    <svg class="error-state-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.446-.866 3.376 0 4.822 1.065 1.76 2.983 2.377 4.779 2.377h11.048c1.796 0 3.713-.617 4.778-2.377.866-1.446.866-3.376 0-4.822-1.065-1.76-2.982-2.377-4.778-2.377H6.476c-1.796 0-3.714.617-4.779 2.377z" />
                    </svg>
                    <h2>Oops! Something went wrong</h2>
                    <p>${error.message || 'An unexpected error occurred'}</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        Reload App
                    </button>
                </div>
            `;
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new App();
        app.init();
    });
} else {
    const app = new App();
    app.init();
}
