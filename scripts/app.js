/**
 * Main Application Entry Point
 */

import { store } from './state/store.js';
import { HomeTab } from './tabs/home.js';
import { SwipeTab } from './tabs/swipe.js';
import { LibraryTab } from './tabs/library.js';
import { MatchesTab } from './tabs/matches.js';
import { ProfileTab } from './tabs/profile.js';
import { getTMDBService } from './services/tmdb.js';
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
        console.log('[App] Initializing Movie Picker...');
        
        // Check TMDB API key
        this.checkTMDBAPI();
        
        // Initialize UI
        this.initUI();
        
        // Load initial tab
        this.switchTab('home');
        
        console.log('[App] App initialized successfully');
    }
    
    checkTMDBAPI() {
        const apiKey = window.__tmdb_api_key;
        
        if (!apiKey || apiKey === 'YOUR_TMDB_API_KEY_HERE') {
            console.error('[App] TMDB API key not found!');
            console.error('[App] Add to index.html: window.__tmdb_api_key = "your_key"');
        } else {
            console.log('[App] TMDB API key found');
            
            const tmdbService = getTMDBService();
            if (tmdbService) {
                console.log('[App] TMDB service ready');
            } else {
                console.error('[App] TMDB service failed to initialize');
            }
        }
    }
    
    initUI() {
        this.container = document.getElementById('app-container');
        
        if (!this.container) {
            console.error('[App] app-container not found');
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
        
        console.log('[App] UI initialized');
    }
    
    // FIXED: Now dispatches event so header can update
    switchTab(tabName) {
        if (!this.tabs[tabName]) {
            console.error(`[App] Tab "${tabName}" not found`);
            return;
        }
        
        if (!this.container) {
            console.error('[App] Container not found');
            return;
        }
        
        // Destroy current tab
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
            console.log(`[App] Switched to: ${tabName}`);
        } catch (error) {
            console.error('[App] Error rendering tab:', error);
            this.container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; padding: 2rem; text-align: center;">
                    <div>
                        <div style="font-size: 4rem; margin-bottom: 1rem;">Warning</div>
                        <h2 style="color: white; font-size: 1.5rem; margin-bottom: 0.5rem;">Error Loading Tab</h2>
                        <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.875rem; margin: 0 0 1rem 0;">
                            ${error.message}
                        </p>
                        <button onclick="location.reload()" style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #ff2e63, #d90062); border: none; border-radius: 0.75rem; color: white; font-weight: 600; cursor: pointer;">
                            Refresh Page
                        </button>
                    </div>
                </div>
            `;
        }

        // THIS LINE FIXES THE HEADER TITLE
        document.dispatchEvent(new CustomEvent('navigate-tab-changed', { 
            detail: { tab: tabName } 
        }));
    }
    
    /**
     * Fallback movies (used when TMDB fails)
     */
    getFallbackMovies() {
        return [
            {
                id: 550,
                title: 'Fight Club',
                synopsis: 'A depressed man suffering from insomnia meets a strange soap salesman.',
                year: '1999',
                genre: 'Drama',
                imdb: '8.8',
                platform: 'Netflix',
                poster_path: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
                backdrop_path: 'https://image.tmdb.org/t/p/w1280/fCayJrkfRaCRCTh8GqN30f8oyQF.jpg',
                cast: ['Brad Pitt', 'Edward Norton', 'Helena Bonham Carter'],
                director: 'David Fincher',
                genre_ids: [18],
                vote_average: 8.8,
                release_date: '1999-10-15',
                overview: 'A depressed man suffering from insomnia meets a strange soap salesman.'
            },
            {
                id: 13,
                title: 'Forrest Gump',
                synopsis: 'The presidencies of Kennedy and Johnson unfold from the perspective of an Alabama man.',
                year: '1994',
                genre: 'Drama',
                imdb: '8.8',
                platform: 'Prime Video',
                poster_path: 'https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
                backdrop_path: 'https://image.tmdb.org/t/p/w1280/7c9UVPPiTPltouxRVY6N9uAXMjD.jpg',
                cast: ['Tom Hanks', 'Robin Wright', 'Gary Sinise'],
                director: 'Robert Zemeckis',
                genre_ids: [35, 18],
                vote_average: 8.8,
                release_date: '1994-06-23',
                overview: 'The presidencies of Kennedy and Johnson unfold from the perspective of an Alabama man.'
            },
            {
                id: 680,
                title: 'Pulp Fiction',
                synopsis: 'The lives of two mob hitmen intertwine in tales of violence and redemption.',
                year: '1994',
                genre: 'Crime',
                imdb: '8.9',
                platform: 'Netflix',
                poster_path: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
                backdrop_path: 'https://image.tmdb.org/t/p/w1280/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg',
                cast: ['John Travolta', 'Uma Thurman', 'Samuel L. Jackson'],
                director: 'Quentin Tarantino',
                genre_ids: [80, 53],
                vote_average: 8.9,
                release_date: '1994-09-10',
                overview: 'The lives of two mob hitmen intertwine in tales of violence and redemption.'
            },
            {
                id: 155,
                title: 'The Dark Knight',
                synopsis: 'Batman must accept one of the greatest psychological tests.',
                year: '2008',
                genre: 'Action',
                imdb: '9.0',
                platform: 'HBO Max',
                poster_path: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
                backdrop_path: 'https://image.tmdb.org/t/p/w1280/hkBaDkMWbLaf8B1lsWsKX7Ew3Xq.jpg',
                cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart'],
                director: 'Christopher Nolan',
                genre_ids: [28, 80, 18],
                vote_average: 9.0,
                release_date: '2008-07-16',
                overview: 'Batman must accept one of the greatest psychological tests.'
            },
            {
                id: 27205,
                title: 'Inception',
                synopsis: 'A thief who steals secrets through dream technology.',
                year: '2010',
                genre: 'Sci-Fi',
                imdb: '8.8',
                platform: 'HBO Max',
                poster_path: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
                backdrop_path: 'https://image.tmdb.org/t/p/w1280/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
                cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Ellen Page'],
                director: 'Christopher Nolan',
                genre_ids: [28, 878, 53],
                vote_average: 8.8,
                release_date: '2010-07-08',
                overview: 'A thief who steals secrets through dream technology.'
            },
            {
                id: 278,
                title: 'The Shawshank Redemption',
                synopsis: 'Two imprisoned men bond over years finding redemption.',
                year: '1994',
                genre: 'Drama',
                imdb: '9.3',
                platform: 'Netflix',
                poster_path: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
                backdrop_path: 'https://image.tmdb.org/t/p/w1280/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg',
                cast: ['Tim Robbins', 'Morgan Freeman', 'Bob Gunton'],
                director: 'Frank Darabont',
                genre_ids: [18, 80],
                vote_average: 9.3,
                release_date: '1994-09-23',
                overview: 'Two imprisoned men bond over years finding redemption.'
            },
            {
                id: 238,
                title: 'The Godfather',
                synopsis: 'The patriarch of a crime dynasty transfers control to his son.',
                year: '1972',
                genre: 'Crime',
                imdb: '9.2',
                platform: 'Prime Video',
                poster_path: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
                backdrop_path: 'https://image.tmdb.org/t/p/w1280/tmU7GeKVybMWFButWEGl2M4GeiP.jpg',
                cast: ['Marlon Brando', 'Al Pacino', 'James Caan'],
                director: 'Francis Ford Coppola',
                genre_ids: [18, 80],
                vote_average: 9.2,
                release_date: '1972-03-14',
                overview: 'The patriarch of a crime dynasty transfers control to his son.'
            },
            {
                id: 424,
                title: "Schindler's List",
                synopsis: 'Industrialist Oskar Schindler saves Jews from the Holocaust.',
                year: '1993',
                genre: 'Drama',
                imdb: '9.0',
                platform: 'Netflix',
                poster_path: 'https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg',
                backdrop_path: 'https://image.tmdb.org/t/p/w1280/loRmRzQXZeqG78TqZuyvSlEQfZb.jpg',
                cast: ['Liam Neeson', 'Ben Kingsley', 'Ralph Fiennes'],
                director: 'Steven Spielberg',
                genre_ids: [18, 36, 10752],
                vote_average: 9.0,
                release_date: '1993-12-15',
                overview: 'Industrialist Oskar Schindler saves Jews from the Holocaust.'
            },
            {
                id: 389,
                title: '12 Angry Men',
                synopsis: 'A jury holdout prevents a miscarriage of justice.',
                year: '1957',
                genre: 'Drama',
                imdb: '9.0',
                platform: 'Hulu',
                poster_path: 'https://image.tmdb.org/t/p/w500/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg',
                backdrop_path: 'https://image.tmdb.org/t/p/w1280/qqHQsStV6exghCM7zbObuYBiYxw.jpg',
                cast: ['Henry Fonda', 'Lee J. Cobb', 'Martin Balsam'],
                director: 'Sidney Lumet',
                genre_ids: [18],
                vote_average: 9.0,
                release_date: '1957-04-10',
                overview: 'A jury holdout prevents a miscarriage of justice.'
            },
            {
                id: 129,
                title: 'Spirited Away',
                synopsis: 'A girl wanders into a world ruled by gods and witches.',
                year: '2001',
                genre: 'Animation',
                imdb: '8.6',
                platform: 'HBO Max',
                poster_path: 'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
                backdrop_path: 'https://image.tmdb.org/t/p/w1280/djgM2d3e42p9GFQObg6lNHTbDw8.jpg',
                cast: ['Rumi Hiiragi', 'Miyu Irino', 'Mari Natsuki'],
                director: 'Hayao Miyazaki',
                genre_ids: [16, 10751, 14],
                vote_average: 8.6,
                release_date: '2001-07-20',
                overview: 'A girl wanders into a world ruled by gods and witches.'
            }
        ];
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
});
