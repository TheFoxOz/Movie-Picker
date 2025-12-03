/**
 * Main Application Entry Point
 */

import { store } from './state/store.js';
import { HomeTab } from './tabs/home.js';
import { SwipeTab } from './tabs/swipe.js';
import { LibraryTab } from './tabs/library.js';
import { MatchesTab } from './tabs/matches.js';
import { ProfileTab } from './tabs/profile.js';
import { getTMDBService } from './services/tmdb.js';  // FIXED - removed initTMDBService
import { authService } from './services/auth-service.js';
import { ENV } from './config/env.js';

class App {
    constructor() {
        this.currentTab = 'home';
        this.tabs = {
            home: new HomeTab(),
            library: new LibraryTab(),
            swipe: new SwipeTab(),
            matches: new MatchesTab(),
            profile: new ProfileTab()
        };
        
        this.container = null;
        this.navButtons = {};
    }
    
    async init() {
        if (ENV.APP.debug) {
            console.log('[App] Initializing Movie Picker...');
        }
        
        // Initialize TMDB service
        const tmdbInitialized = await this.initTMDB();
        
        // Initialize UI
        this.initUI();
        
        // Load initial tab
        this.switchTab('home');
        
        // Setup global navigation listener
        document.addEventListener('navigate-tab', (e) => {
            const { tab } = e.detail;
            this.switchTab(tab);
        });
        
        if (ENV.APP.debug) {
            console.log('[App] ✅ App initialized successfully');
        }
    }
    
    async initTMDB() {
        // Get API key from window (set in index.html)
        const tmdbApiKey = window.tmdbApiKey;
        
        // Validate API key
        if (!tmdbApiKey || tmdbApiKey === 'YOUR_TMDB_API_KEY_HERE') {
            console.error('[App] ⚠️  TMDB API key not configured!');
            console.error('[App] 📝 Get your free API key at: https://www.themoviedb.org/settings/api');
            console.error('[App] 💡 Add it to index.html: window.tmdbApiKey = "your_key_here"');
            showError('TMDB API key missing. Using demo movies. Get your free key at themoviedb.org');
            return false;
        }
        
        try {
            initTMDBService(tmdbApiKey);
            
            if (ENV.APP.debug) {
                console.log('[App] ✅ TMDB service initialized');
            }
            
            return true;
        } catch (error) {
            console.error('[App] Failed to initialize TMDB:', error);
            showError('Failed to connect to TMDB. Using demo movies.');
            return false;
        }
    }
    
    initUI() {
        // Get main container
        this.container = document.getElementById('app-container');
        
        if (!this.container) {
            console.error('[App] ❌ app-container not found in DOM');
            return;
        }
        
        // Get nav buttons
        this.navButtons = {
            home: document.querySelector('[data-tab="home"]'),
            library: document.querySelector('[data-tab="library"]'),
            swipe: document.querySelector('[data-tab="swipe"]'),
            matches: document.querySelector('[data-tab="matches"]'),
            profile: document.querySelector('[data-tab="profile"]')
        };
        
        // Attach nav listeners
        Object.entries(this.navButtons).forEach(([tab, button]) => {
            if (button) {
                button.addEventListener('click', () => this.switchTab(tab));
            }
        });
        
        if (ENV.APP.debug) {
            console.log('[App] UI initialized');
        }
    }
    
    switchTab(tabName) {
        if (!this.tabs[tabName]) {
            console.error(`[App] Tab "${tabName}" does not exist`);
            return;
        }
        
        // Check if container exists
        if (!this.container) {
            console.error('[App] Container not found');
            return;
        }
        
        // Destroy current tab if it has cleanup
        if (this.tabs[this.currentTab]?.destroy) {
            try {
                this.tabs[this.currentTab].destroy();
            } catch (error) {
                console.warn('[App] Error destroying tab:', error);
            }
        }
        
        // Update current tab
        this.currentTab = tabName;
        
        // Update nav buttons
        Object.entries(this.navButtons).forEach(([tab, button]) => {
            if (button) {
                if (tab === tabName) {
                    button.classList.add('active');
                    button.style.color = '#ff2e63';
                } else {
                    button.classList.remove('active');
                    button.style.color = 'rgba(255, 255, 255, 0.6)';
                }
            }
        });
        
        // Clear container
        this.container.innerHTML = '';
        
        // Render new tab
        try {
            this.tabs[tabName].render(this.container);
        } catch (error) {
            console.error('[App] Error rendering tab:', error);
            this.container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; padding: 2rem; text-align: center;">
                    <div>
                        <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
                        <h2 style="color: white; font-size: 1.5rem; margin-bottom: 0.5rem;">Error Loading Tab</h2>
                        <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.875rem;">Please refresh the page or try another tab.</p>
                    </div>
                </div>
            `;
        }
        
        if (ENV.APP.debug) {
            console.log(`[App] Switched to tab: ${tabName}`);
        }
    }
    
    /**
     * Get fallback movies when TMDB is not available
     */
    getFallbackMovies() {
        return [
            {
                id: 'fallback-1',
                title: 'The Shawshank Redemption',
                synopsis: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
                year: '1994',
                genre: 'Drama',
                imdb: '9.3',
                runtime: '142 min',
                platform: 'Netflix',
                poster_path: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
                backdrop_path: 'https://image.tmdb.org/t/p/w500/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg',
                cast: ['Tim Robbins', 'Morgan Freeman', 'Bob Gunton', 'William Sadler'],
                triggerWarnings: ['Violence', 'Prison brutality']
            },
            {
                id: 'fallback-2',
                title: 'The Godfather',
                synopsis: 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.',
                year: '1972',
                genre: 'Crime',
                imdb: '9.2',
                runtime: '175 min',
                platform: 'Prime Video',
                poster_path: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
                backdrop_path: 'https://image.tmdb.org/t/p/w500/tmU7GeKVybMWFButWEGl2M4GeiP.jpg',
                cast: ['Marlon Brando', 'Al Pacino', 'James Caan', 'Diane Keaton'],
                triggerWarnings: ['Violence', 'Crime']
            },
            {
                id: 'fallback-3',
                title: 'The Dark Knight',
                synopsis: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological tests.',
                year: '2008',
                genre: 'Action',
                imdb: '9.0',
                runtime: '152 min',
                platform: 'HBO Max',
                poster_path: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
                backdrop_path: 'https://image.tmdb.org/t/p/w500/hkBaDkMWbLaf8B1lsWsKX7Ew3Xq.jpg',
                cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart', 'Michael Caine'],
                triggerWarnings: ['Violence', 'Intense action']
            },
            {
                id: 'fallback-4',
                title: 'Pulp Fiction',
                synopsis: 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.',
                year: '1994',
                genre: 'Crime',
                imdb: '8.9',
                runtime: '154 min',
                platform: 'Netflix',
                poster_path: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
                backdrop_path: 'https://image.tmdb.org/t/p/w500/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg',
                cast: ['John Travolta', 'Uma Thurman', 'Samuel L. Jackson', 'Bruce Willis'],
                triggerWarnings: ['Violence', 'Strong language', 'Drug use']
            },
            {
                id: 'fallback-5',
                title: 'Forrest Gump',
                synopsis: 'The presidencies of Kennedy and Johnson, the Vietnam War, and other historical events unfold from the perspective of an Alabama man.',
                year: '1994',
                genre: 'Drama',
                imdb: '8.8',
                runtime: '142 min',
                platform: 'Prime Video',
                poster_path: 'https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
                backdrop_path: 'https://image.tmdb.org/t/p/w500/7c9UVPPiTPltouxRVY6N9uAXMjD.jpg',
                cast: ['Tom Hanks', 'Robin Wright', 'Gary Sinise', 'Sally Field'],
                triggerWarnings: ['War violence']
            },
            {
                id: 'fallback-6',
                title: 'Inception',
                synopsis: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.',
                year: '2010',
                genre: 'Sci-Fi',
                imdb: '8.8',
                runtime: '148 min',
                platform: 'HBO Max',
                poster_path: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
                backdrop_path: 'https://image.tmdb.org/t/p/w500/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
                cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Ellen Page', 'Tom Hardy'],
                triggerWarnings: ['Violence', 'Intense sequences']
            },
            {
                id: 'fallback-7',
                title: 'The Matrix',
                synopsis: 'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.',
                year: '1999',
                genre: 'Sci-Fi',
                imdb: '8.7',
                runtime: '136 min',
                platform: 'HBO Max',
                poster_path: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
                backdrop_path: 'https://image.tmdb.org/t/p/w500/icmmSD4vTTDKOq2vvdulafOGw93.jpg',
                cast: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss', 'Hugo Weaving'],
                triggerWarnings: ['Violence', 'Intense action']
            },
            {
                id: 'fallback-8',
                title: 'Goodfellas',
                synopsis: 'The story of Henry Hill and his life in the mob, covering his relationship with his wife and his partners in crime.',
                year: '1990',
                genre: 'Crime',
                imdb: '8.7',
                runtime: '146 min',
                platform: 'Netflix',
                poster_path: 'https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg',
                backdrop_path: 'https://image.tmdb.org/t/p/w500/sw7mordbZxgITU877yTpZCud90M.jpg',
                cast: ['Robert De Niro', 'Ray Liotta', 'Joe Pesci', 'Lorraine Bracco'],
                triggerWarnings: ['Violence', 'Strong language', 'Drug use']
            },
            {
                id: 'fallback-9',
                title: 'Interstellar',
                synopsis: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
                year: '2014',
                genre: 'Sci-Fi',
                imdb: '8.6',
                runtime: '169 min',
                platform: 'Prime Video',
                poster_path: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
                backdrop_path: 'https://image.tmdb.org/t/p/w500/xu9zaAevzQ5nnrsXN6JcahLnG4i.jpg',
                cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain', 'Michael Caine'],
                triggerWarnings: ['Intense sequences']
            },
            {
                id: 'fallback-10',
                title: 'The Silence of the Lambs',
                synopsis: 'A young FBI cadet must receive the help of an incarcerated cannibal killer to catch another serial killer.',
                year: '1991',
                genre: 'Thriller',
                imdb: '8.6',
                runtime: '118 min',
                platform: 'Hulu',
                poster_path: 'https://image.tmdb.org/t/p/w500/uS9m8OBk1A8eM9I042bx8XXpqAq.jpg',
                backdrop_path: 'https://image.tmdb.org/t/p/w500/bMadFzhjy9T7R8J48QGq1ngWNAK.jpg',
                cast: ['Jodie Foster', 'Anthony Hopkins', 'Scott Glenn', 'Ted Levine'],
                triggerWarnings: ['Violence', 'Gore', 'Disturbing content']
            }
        ];
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
});
