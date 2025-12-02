/**
 * Main Application Entry Point (NO FIREBASE VERSION)
 * Initializes and coordinates all app modules
 */

import { store } from './state/store.js';
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
    }
    
    /**
     * Initialize the application
     */
    async init() {
        try {
            // Get DOM elements
            this.contentArea = document.getElementById('content-area');
            this.navBar = document.getElementById('nav-bar');
            
            // Initialize notification system
            initNotifications();
            
            // FIREBASE DISABLED - Use guest mode
            await this.initGuestMode();
            
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
            
            // Show app
            this.contentArea.style.display = 'block';
            this.navBar.style.display = 'flex';
            
            // Navigate to initial tab
            this.navigateToTab('home');
            
            // Mark as initialized
            store.setState({ isInitialized: true });
            
            console.log('[App] Initialization complete (Guest Mode)');
            
        } catch (error) {
            console.error('[App] Initialization failed:', error);
            showError('Failed to initialize app: ' + error.message);
        }
    }
    
    /**
     * Initialize Guest Mode (Firebase Disabled)
     */
    async initGuestMode() {
        // Create a guest user ID
        const guestId = 'guest-' + crypto.randomUUID().substring(0, 8);
        
        store.setState({
            userId: guestId,
            appId: 'movie-picker-app',
            isAuthenticated: false
        });
        
        console.log('[App] Running in guest mode (Firebase disabled)');
        console.log('[App] User ID:', guestId);
    }
    
    /**
     * Initialize TMDB Service
     */
    async initTMDB() {
        try {
            // Get TMDB API key from global variable
            const tmdbApiKey = window.__tmdb_api_key;
            
            if (!tmdbApiKey || tmdbApiKey === 'YOUR_TMDB_API_KEY_HERE') {
                console.warn('[App] TMDB API key not configured. Using fallback data.');
                console.warn('[App] Add your API key to index.html to load real movies.');
                return false;
            }
            
            initTMDBService(tmdbApiKey);
            console.log('[App] TMDB Service initialized');
            return true;
            
        } catch (error) {
            console.error('[App] TMDB initialization failed:', error);
            return false;
        }
    }
    
    /**
     * Load movies from TMDB API
     */
    async loadMovies() {
        try {
            store.setLoading(true);
            
            // Try to get TMDB service
            let tmdbService;
            try {
                tmdbService = getTMDBService();
            } catch (error) {
                // TMDB not initialized, use fallback
                console.warn('[App] TMDB not available, using fallback movies');
                store.setMovies(this.getFallbackMovies());
                store.setLoading(false);
                return;
            }
            
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
                title: "The Matrix",
                year: 1999,
                genre: "Action / Sci-Fi",
                type: "Movie",
                runtime: "136 min",
                imdb: 8.7,
                platform: "Netflix",
                actors: ["Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss"],
                trigger: ["Flashing Lights", "Violence"],
                synopsis: "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
                mood: "Mind-bending, Action-packed"
            },
            {
                id: "fallback-2",
                title: "Inception",
                year: 2010,
                genre: "Action / Sci-Fi / Thriller",
                type: "Movie",
                runtime: "148 min",
                imdb: 8.8,
                platform: "Hulu",
                actors: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Ellen Page"],
                trigger: [],
                synopsis: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
                mood: "Complex, Thrilling"
            },
            {
                id: "fallback-3",
                title: "The Shawshank Redemption",
                year: 1994,
                genre: "Drama",
                type: "Movie",
                runtime: "142 min",
                imdb: 9.3,
                platform: "Prime Video",
                actors: ["Tim Robbins", "Morgan Freeman"],
                trigger: ["Violence", "Prison Content"],
                synopsis: "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.",
                mood: "Hopeful, Emotional"
            },
            {
                id: "fallback-4",
                title: "Pulp Fiction",
                year: 1994,
                genre: "Crime / Drama",
                type: "Movie",
                runtime: "154 min",
                imdb: 8.9,
                platform: "Netflix",
                actors: ["John Travolta", "Uma Thurman", "Samuel L. Jackson"],
                trigger: ["Violence", "Drug Use", "Strong Language"],
                synopsis: "The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.",
                mood: "Stylish, Intense"
            },
            {
                id: "fallback-5",
                title: "The Dark Knight",
                year: 2008,
                genre: "Action / Crime / Drama",
                type: "Movie",
                runtime: "152 min",
                imdb: 9.0,
                platform: "Max (HBO)",
                actors: ["Christian Bale", "Heath Ledger", "Aaron Eckhart"],
                trigger: ["Violence", "Intense Scenes"],
                synopsis: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests.",
                mood: "Dark, Epic"
            },
            {
                id: "fallback-6",
                title: "Forrest Gump",
                year: 1994,
                genre: "Drama / Romance",
                type: "Movie",
                runtime: "142 min",
                imdb: 8.8,
                platform: "Hulu",
                actors: ["Tom Hanks", "Robin Wright", "Gary Sinise"],
                trigger: ["War Violence", "Emotional Loss"],
                synopsis: "The presidencies of Kennedy and Johnson, the Vietnam War, and other historical events unfold from the perspective of an Alabama man.",
                mood: "Heartwarming, Inspiring"
            },
            {
                id: "fallback-7",
                title: "Interstellar",
                year: 2014,
                genre: "Adventure / Drama / Sci-Fi",
                type: "Movie",
                runtime: "169 min",
                imdb: 8.6,
                platform: "Prime Video",
                actors: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain"],
                trigger: [],
                synopsis: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
                mood: "Epic, Emotional"
            },
            {
                id: "fallback-8",
                title: "The Godfather",
                year: 1972,
                genre: "Crime / Drama",
                type: "Movie",
                runtime: "175 min",
                imdb: 9.2,
                platform: "Netflix",
                actors: ["Marlon Brando", "Al Pacino", "James Caan"],
                trigger: ["Violence"],
                synopsis: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.",
                mood: "Classic, Intense"
            },
            {
                id: "fallback-9",
                title: "Fight Club",
                year: 1999,
                genre: "Drama",
                type: "Movie",
                runtime: "139 min",
                imdb: 8.8,
                platform: "Hulu",
                actors: ["Brad Pitt", "Edward Norton", "Helena Bonham Carter"],
                trigger: ["Violence", "Disturbing Content"],
                synopsis: "An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into much more.",
                mood: "Dark, Thought-provoking"
            },
            {
                id: "fallback-10",
                title: "The Prestige",
                year: 2006,
                genre: "Drama / Mystery / Sci-Fi",
                type: "Movie",
                runtime: "130 min",
                imdb: 8.5,
                platform: "Prime Video",
                actors: ["Christian Bale", "Hugh Jackman", "Scarlett Johansson"],
                trigger: [],
                synopsis: "After a tragic accident, two stage magicians engage in a battle to create the ultimate illusion while sacrificing everything they have to outwit each other.",
                mood: "Mysterious, Clever"
            }
        ];
    }
    
    /**
     * Initialize tabs
     */
    initTabs() {
        this.tabs.set('home', new HomeTab(this.contentArea));
        this.tabs.set('library', new LibraryTab(this.contentArea));
        this.tabs.set('swipe', new SwipeTab(this.contentArea));
        this.tabs.set('matches', new MatchesTab(this.contentArea));
        this.tabs.set('profile', new ProfileTab(this.contentArea));
        
        console.log('[App] Tabs initialized');
    }
    
    /**
     * Setup navigation handlers
     */
    setupNavigation() {
        const navButtons = this.navBar.querySelectorAll('.nav-item');
        
        navButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = button.getAttribute('data-tab');
                this.navigateToTab(tabName);
            });
        });
        
        // Global navigation event listener
        document.addEventListener('navigate-tab', (e) => {
            this.navigateToTab(e.detail.tab);
        });
    }
    
    /**
     * Navigate to a specific tab
     */
    navigateToTab(tabName) {
        // Hide current tab if exists
        if (this.currentTab) {
            const currentTabInstance = this.tabs.get(this.currentTab);
            if (currentTabInstance && currentTabInstance.destroy) {
                currentTabInstance.destroy();
            }
        }
        
        // Update active state in nav
        const navButtons = this.navBar.querySelectorAll('.nav-item');
        navButtons.forEach(button => {
            if (button.getAttribute('data-tab') === tabName) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        // Render new tab
        const tab = this.tabs.get(tabName);
        if (tab) {
            this.contentArea.innerHTML = '';
            tab.render();
            this.currentTab = tabName;
            
            // Update store
            store.setState({ currentTab: tabName });
        }
    }
    
    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only trigger if not in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // Tab shortcuts (1-5 keys)
            if (e.key === '1') this.navigateToTab('home');
            if (e.key === '2') this.navigateToTab('library');
            if (e.key === '3') this.navigateToTab('swipe');
            if (e.key === '4') this.navigateToTab('matches');
            if (e.key === '5') this.navigateToTab('profile');
        });
    }
    
    /**
     * Handle state changes
     */
    handleStateChange(state) {
        // Update UI based on state changes if needed
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

export default App;
