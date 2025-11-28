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
import { LibraryTab } from './tabs/library.js';
import { initTMDBService, getTMDBService } from './services/tmdb.js';

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
            
            // Initialize TMDB Service
            await this.initTMDB();
            
            // Load movies from TMDB
            await this.loadMovies();
            
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
            this.navigateToTab('home');
            
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
     * Initialize TMDB Service
     */
    async initTMDB() {
        try {
            // Get TMDB API key from global variable or environment
            const tmdbApiKey = typeof __tmdb_api_key !== 'undefined' 
                ? __tmdb_api_key 
                : null;
            
            if (!tmdbApiKey) {
                console.warn('[App] TMDB API key not found. Using fallback data.');
                return;
            }
            
            initTMDBService(tmdbApiKey);
            console.log('[App] TMDB Service initialized');
            
        } catch (error) {
            console.error('[App] TMDB initialization failed:', error);
        }
    }
    
    /**
     * Load movies from TMDB API
     */
    async loadMovies() {
        try {
            store.setLoading(true);
            
            const tmdbService = getTMDBService();
            
            // Fetch popular movies (5 pages = 100 movies)
            console.log('[App] Loading movies from TMDB...');
            const movies = await tmdbService.fetchPopularMovies(5);
            
            if (movies && movies.length > 0) {
                store.setMovies(movies);
                console.log(`[App] Loaded ${movies.length} movies from TMDB`);
            } else {
                throw new Error('No movies returned from TMDB');
            }
            
            store.setLoading(false);
            
        } catch (error) {
            console.error('[App] Error loading movies:', error);
            store.setLoading(false);
            
            // Use fallback data if TMDB fails
            console.warn('[App] Using fallback movie data');
            store.setMovies(this.getFallbackMovies());
        }
    }
    
    /**
     * Get fallback movies (minimal set for development/testing)
     */
    getFallbackMovies() {
        return [
            {
                id: "fallback-1",
                title: "Sample Movie 1",
                year: 2024,
                genre: "Action / Thriller",
                type: "Movie",
                runtime: "120 min",
                imdb: 7.5,
                platform: "Netflix",
                actors: ["Actor One", "Actor Two"],
                trigger: [],
                synopsis: "This is a fallback movie. Connect to TMDB API to see real movies.",
                mood: "Action-packed"
            },
            {
                id: "fallback-2",
                title: "Sample Movie 2",
                year: 2024,
                genre: "Comedy / Drama",
                type: "Movie",
                runtime: "95 min",
                imdb: 8.0,
                platform: "Hulu",
                actors: ["Actor Three", "Actor Four"],
                trigger: [],
                synopsis: "This is a fallback movie. Add your TMDB API key to load real movies.",
                mood: "Light-hearted"
            }
        ];
    }
    
    /**
     * Initialize tab instances
     */
    initTabs() {
        this.tabs.set('home', new HomeTab(this.contentArea));
        this.tabs.set('library', new LibraryTab(this.contentArea));
        this.tabs.set('swipe', new SwipeTab(this.contentArea));
        this.tabs.set('matches', new MatchesTab(this.contentArea));
        this.tabs.set('profile', new ProfileTab(this.contentArea));
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
