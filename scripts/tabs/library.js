/**
 * Library Tab Component
 * Browse all TMDB movies + Filter to show your swipes
 */

import { store } from '../state/store.js';
import { getTMDBService } from '../services/tmdb.js';
import { movieModal } from '../components/movie-modal.js';
import { ENV } from '../config/env.js';

export class LibraryTab {
    constructor() {
        this.container = null;
        this.allMovies = [];
        this.filteredMovies = [];
        this.currentFilter = 'all'; // 'all', 'loved', 'liked', 'maybe', 'passed'
        this.searchQuery = '';
        this.isLoading = false;
    }
    
    async render(container) {
        this.container = container;
        
        // Show loading state
        this.container.innerHTML = this.renderLoading();
        
        // Load all TMDB movies
        await this.loadAllMovies();
        
        // Render full UI
        this.renderContent();
    }
    
    async loadAllMovies() {
        if (this.isLoading) return;
        this.isLoading = true;
        
        try {
            const tmdbService = getTMDBService();
            
            if (tmdbService) {
                // Load popular, trending, and top-rated movies
                const [popular, trending, topRated] = await Promise.all([
                    tmdbService.fetchPopularMovies(3),    // 60 movies
                    tmdbService.fetchTrendingMovies(),     // 20 movies
                    tmdbService.fetchTopRatedMovies(2)     // 40 movies
                ]);
                
                // Combine and deduplicate
                const allMoviesMap = new Map();
                [...popular, ...trending, ...topRated].forEach(movie => {
                    allMoviesMap.set(movie.id, movie);
                });
                
                this.allMovies = Array.from(allMoviesMap.values());
                
                if (ENV.APP.debug) {
                    console.log('[LibraryTab] Loaded movies:', this.allMovies.length);
                }
            } else {
                // Fallback to demo movies
                const app = window.app;
                if (app && typeof app.getFallbackMovies === 'function') {
                    this.allMovies = app.getFallbackMovies();
                }
            }
            
            this.filteredMovies = [...this.allMovies];
            
        } catch (error) {
            console.error('[LibraryTab] Error loading movies:', error);
            this.allMovies = [];
            this.filteredMovies = [];
        } finally {
            this.isLoading = false;
        }
    }
    
    renderLoading() {
        return `
            <div style="display: flex; align-items: center; justify-content: center; height: calc(100vh - 10rem); flex-direction: column; gap: 1rem;">
                <div style="width: 48px; height: 48px; border: 4px solid rgba(255, 46, 99, 0.3); border-top-color: #ff2e63; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="color: rgba(255, 255, 255, 0.7); font-size: 0.9375rem;">Loading movies...</p>
            </div>
        `;
    }
    
    renderContent() {
        const state = store.getState();
        const swipeHistory = state.swipeHistory || [];
        
        // Count swipes by action
        const swipeCounts = {
            loved: swipeHistory.filter(s => s.action === 'love').length,
            liked: swipeHistory.filter(s => s.action === 'like').length,
            maybe: swipeHistory.filter(s => s.action === 'maybe').length,
            passed: swipeHistory.filter(s => s.action === 'pass').length
        };
        
        this.container.innerHTML = `
            <div style="padding: 1.5rem 1rem 6rem;">
                
                <!-- Header -->
                <div style="margin-bottom: 1.5rem;">
                    <h1 style="font-size: 1.75rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0;">
                        📚 Movie Library
                    </h1>
                    <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.875rem; margin: 0;">
                        Browse ${this.allMovies.length} movies or filter your swipes
                    </p>
                </div>
                
                <!-- Search Bar -->
                <div style="margin-bottom: 1rem;">
                    <input 
                        type="text" 
                        id="search-input" 
                        placeholder="Search movies..." 
                        value="${this.searchQuery}"
                        style="width: 100%; padding: 1rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 1rem; color: white; font-size: 1rem;"
                    >
                </div>
                
                <!-- Filter Buttons -->
                <div style="display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.5rem; margin-bottom: 1.5rem; -webkit-overflow-scrolling: touch;">
                    <button class="filter-btn" data-filter="all" style="padding: 0.75rem 1.5rem; background: ${this.currentFilter === 'all' ? 'linear-gradient(135deg, #ff2e63, #d90062)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${this.currentFilter === 'all' ? '#ff2e63' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 0.75rem; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.3s;">
                        🎬 All Movies (${this.allMovies.length})
                    </button>
                    <button class="filter-btn" data-filter="loved" style="padding: 0.75rem 1.5rem; background: ${this.currentFilter === 'loved' ? 'linear-gradient(135deg, #ff006e, #d90062)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${this.currentFilter === 'loved' ? '#ff006e' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 0.75rem; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.3s;">
                        ❤️ Loved (${swipeCounts.loved})
                    </button>
                    <button class="filter-btn" data-filter="liked" style="padding: 0.75rem 1.5rem; background: ${this.currentFilter === 'liked' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${this.currentFilter === 'liked' ? '#10b981' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 0.75rem; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.3s;">
                        👍 Liked (${swipeCounts.liked})
                    </button>
                    <button class="filter-btn" data-filter="maybe" style="padding: 0.75rem 1.5rem; background: ${this.currentFilter === 'maybe' ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${this.currentFilter === 'maybe' ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 0.75rem; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.3s;">
                        🤔 Maybe (${swipeCounts.maybe})
                    </button>
                    <button class="filter-btn" data-filter="passed" style="padding: 0.75rem 1.5rem; background: ${this.currentFilter === 'passed' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${this.currentFilter === 'passed' ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 0.75rem; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.3s;">
                        ✕ Passed (${swipeCounts.passed})
                    </button>
                </div>
                
                <!-- Movies Grid -->
                <div id="movies-grid">
                    ${this.renderMoviesGrid()}
                </div>
            </div>
        `;
        
        this.attachListeners();
    }
    
    renderMoviesGrid() {
        const state = store.getState();
        const swipeHistory = state.swipeHistory || [];
        
        // Apply filters
        let moviesToShow = [...this.allMovies];
        
        // Filter by swipe action
        if (this.currentFilter !== 'all') {
            const swipedMovieIds = swipeHistory
                .filter(s => s.action === this.currentFilter)
                .map(s => String(s.movie.id));
            
            moviesToShow = moviesToShow.filter(m => swipedMovieIds.includes(String(m.id)));
        }
        
        // Filter by search query
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            moviesToShow = moviesToShow.filter(m => 
                m.title.toLowerCase().includes(query) ||
                (m.synopsis && m.synopsis.toLowerCase().includes(query)) ||
                (m.genre && m.genre.toLowerCase().includes(query))
            );
        }
        
        this.filteredMovies = moviesToShow;
        
        if (moviesToShow.length === 0) {
            return this.renderEmptyState();
        }
        
        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem;">
                ${moviesToShow.map(movie => this.renderMovieCard(movie, swipeHistory)).join('')}
            </div>
        `;
    }
    
    renderMovieCard(movie, swipeHistory) {
        const posterUrl = movie.poster_path || movie.backdrop_path || 
            `https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}`;
        
        // Check if movie is in swipe history
        const swipe = swipeHistory.find(s => String(s.movie.id) === String(movie.id));
        const swipeIndicator = swipe ? this.getSwipeIndicator(swipe.action) : '';
        
        return `
            <div class="library-movie-card" data-movie-id="${movie.id}" style="cursor: pointer; transition: transform 0.3s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                <div style="position: relative; width: 100%; aspect-ratio: 2/3; border-radius: 0.75rem; overflow: hidden; background: rgba(255, 255, 255, 0.05); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);">
                    <img 
                        src="${posterUrl}" 
                        alt="${movie.title}"
                        style="width: 100%; height: 100%; object-fit: cover;"
                        onerror="this.src='https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}'"
                    >
                    
                    <!-- Swipe Indicator -->
                    ${swipeIndicator}
                    
                    <!-- Rating Badge -->
                    ${movie.imdb || movie.vote_average ? `
                        <div style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem 0.5rem; background: rgba(251, 191, 36, 0.9); backdrop-filter: blur(10px); border-radius: 0.5rem; display: flex; align-items: center; gap: 0.25rem;">
                            <span style="color: white; font-size: 0.75rem; font-weight: 700;">⭐</span>
                            <span style="color: white; font-size: 0.75rem; font-weight: 700;">${movie.imdb || movie.vote_average.toFixed(1)}</span>
                        </div>
                    ` : ''}
                    
                    <!-- Title Overlay -->
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 0.75rem 0.5rem; background: linear-gradient(0deg, rgba(0, 0, 0, 0.9), transparent);">
                        <h3 style="font-size: 0.8125rem; font-weight: 700; color: white; margin: 0; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                            ${movie.title}
                        </h3>
                        ${movie.year ? `
                            <p style="font-size: 0.6875rem; color: rgba(255, 255, 255, 0.7); margin: 0.25rem 0 0 0;">
                                ${movie.year}
                            </p>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    getSwipeIndicator(action) {
        const indicators = {
            love: { emoji: '❤️', color: '#ff006e', text: 'LOVED' },
            like: { emoji: '👍', color: '#10b981', text: 'LIKED' },
            maybe: { emoji: '🤔', color: '#fbbf24', text: 'MAYBE' },
            pass: { emoji: '✕', color: '#ef4444', text: 'PASSED' }
        };
        
        const indicator = indicators[action];
        if (!indicator) return '';
        
        return `
            <div style="position: absolute; top: 0.5rem; left: 0.5rem; padding: 0.375rem 0.625rem; background: ${indicator.color}; border-radius: 0.5rem; display: flex; align-items: center; gap: 0.25rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);">
                <span style="font-size: 0.875rem;">${indicator.emoji}</span>
                <span style="color: white; font-size: 0.625rem; font-weight: 700; text-transform: uppercase;">${indicator.text}</span>
            </div>
        `;
    }
    
    renderEmptyState() {
        let message = 'No movies found';
        let icon = '🎬';
        
        if (this.currentFilter !== 'all') {
            message = `You haven't ${this.currentFilter} any movies yet`;
            icon = '💔';
        } else if (this.searchQuery) {
            message = `No movies match "${this.searchQuery}"`;
            icon = '🔍';
        }
        
        return `
            <div style="text-align: center; padding: 4rem 2rem;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">${icon}</div>
                <h3 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0 0 0.5rem 0;">${message}</h3>
                <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.875rem; margin: 0;">
                    ${this.currentFilter !== 'all' ? 'Start swiping to build your library!' : 'Try a different search term'}
                </p>
            </div>
        `;
    }
    
    attachListeners() {
        // Search input
        const searchInput = this.container.querySelector('#search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.updateMoviesGrid();
            });
        }
        
        // Filter buttons
        const filterBtns = this.container.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentFilter = btn.dataset.filter;
                this.renderContent();
            });
        });
        
        // Movie cards
        const movieCards = this.container.querySelectorAll('.library-movie-card');
        movieCards.forEach(card => {
            card.addEventListener('click', () => {
                const movieId = card.dataset.movieId;
                const movie = this.allMovies.find(m => String(m.id) === String(movieId));
                
                if (movie) {
                    movieModal.show(movie);
                    
                    if (ENV.APP.debug) {
                        console.log('[LibraryTab] Opening modal for:', movie.title);
                    }
                }
            });
        });
    }
    
    updateMoviesGrid() {
        const moviesGrid = this.container.querySelector('#movies-grid');
        if (moviesGrid) {
            moviesGrid.innerHTML = this.renderMoviesGrid();
            
            // Re-attach movie card listeners
            const movieCards = moviesGrid.querySelectorAll('.library-movie-card');
            movieCards.forEach(card => {
                card.addEventListener('click', () => {
                    const movieId = card.dataset.movieId;
                    const movie = this.allMovies.find(m => String(m.id) === String(movieId));
                    if (movie) {
                        movieModal.show(movie);
                    }
                });
            });
        }
    }
    
    destroy() {
        // Cleanup if needed
    }
}
