/**
 * Main Application Entry Point
 */

import { store } from './state/store.js';
import { HomeTab } from './tabs/home.js';
import { SwipeTab } from './tabs/swipe.js';
import { LibraryTab } from './tabs/library.js';
import { MatchesTab } from './tabs/matches.js';
import { ProfileTab } from './tabs/profile.js';
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
        
        // Initialize UI
        this.initUI();
        
        // Load initial tab
        this.switchTab('home');
        
        console.log('[App] ✅ App initialized');
    }
    
    initUI() {
        this.container = document.getElementById('app-container');
        
        if (!this.container) {
            console.error('[App] ❌ app-container not found');
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
    }
    
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
        } catch (error) {
            console.error('[App] Error rendering tab:', error);
            this.container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; padding: 2rem; text-align: center;">
                    <div>
                        <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
                        <h2 style="color: white; font-size: 1.5rem; margin-bottom: 0.5rem;">Error Loading Tab</h2>
                        <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.875rem;">Please refresh the page</p>
                    </div>
                </div>
            `;
        }
        
        console.log(`[App] Switched to: ${tabName}`);
    }
    
    getFallbackMovies() {
        return [
            {
                id: 550,
                title: 'Fight Club',
                synopsis: 'A depressed man suffering from insomnia meets a strange soap salesman and they form an underground fight club.',
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
                overview: 'A depressed man suffering from insomnia meets a strange soap salesman and they form an underground fight club.'
            },
            {
                id: 13,
                title: 'Forrest Gump',
                synopsis: 'The presidencies of Kennedy and Johnson, the Vietnam War, and other historical events unfold from the perspective of an Alabama man.',
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
                overview: 'The presidencies of Kennedy and Johnson, the Vietnam War, and other historical events unfold from the perspective of an Alabama man.'
            },
            {
                id: 680,
                title: 'Pulp Fiction',
                synopsis: 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.',
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
                overview: 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.'
            },
            {
                id: 155,
                title: 'The Dark Knight',
                synopsis: 'When the menace known as the Joker wreaks havoc on Gotham, Batman must accept one of the greatest psychological tests.',
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
                overview: 'When the menace known as the Joker wreaks havoc on Gotham, Batman must accept one of the greatest psychological tests.'
            },
            {
                id: 27205,
                title: 'Inception',
                synopsis: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.',
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
                overview: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.'
            }
        ];
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
});
