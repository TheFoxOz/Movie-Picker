/**
 * Library Tab Component
 * Browse UNLIMITED TMDB movies with infinite scroll
 */

import { store } from '../state/store.js';
import { getTMDBService, GENRE_IDS } from '../services/tmdb.js';
import { movieModal } from '../components/movie-modal.js';
import { ENV } from '../config/env.js';

export class LibraryTab {
    constructor() {
        this.container = null;
        this.allMovies = [];
        this.filteredMovies = [];
        this.currentFilter = 'all'; // 'all', 'loved', 'liked', 'maybe', 'passed'
        this.currentGenre = 'all'; // 'all' or genre ID
        this.currentPlatform = 'all'; // 'all', 'Netflix', 'Hulu', etc.
        this.searchQuery = '';
        this.isLoading = false;
        this.currentPage = 1;
        this.hasMorePages = true;
        this.scrollListener = null;
    }
    
    async render(container) {
        this.container = container;
        
        // Show loading state
        this.container.innerHTML = this.renderLoading();
        
        // Load initial movies
        await this.loadMovies(1);
        
        // Render full UI
        this.renderContent();
        
        // Setup infinite scroll
        this.setupInfiniteScroll();
    }
    
    async loadMovies(page) {
        if (this.isLoading) return;
        this.isLoading = true;
        
        try {
            const tmdbService = getTMDBService();
            
            if (tmdbService) {
                if (page === 1) {
                    // Initial load - get LOTS of movies from different sources
                    if (ENV.APP.debug) {
                        console.log('[LibraryTab] 🎬 Loading initial movie collection...');
                    }
                    
                    const [popular, trending, topRated, upcoming, nowPlaying] = await Promise.all([
                        tmdbService.fetchPopularMovies(10, 1),      // 200 movies
                        tmdbService.fetchTrendingMovies(),          // 20 movies
                        tmdbService.fetchTopRatedMovies(10),        // 200 movies
                        tmdbService.fetchUpcomingMovies(5),         // 100 movies
                        tmdbService.fetchNowPlayingMovies(5)        // 100 movies
                    ]);
                    
                    // Combine and deduplicate
                    const allMoviesMap = new Map();
                    [...popular, ...trending, ...topRated, ...upcoming, ...nowPlaying].forEach(movie => {
                        allMoviesMap.set(movie.id, movie);
                    });
                    
                    this.allMovies = Array.from(allMoviesMap.values());
                    this.currentPage = 1;
                    
                    if (ENV.APP.debug) {
                        console.log('[LibraryTab] ✅ Initial load complete - Total movies:', this.allMovies.length);
                    }
                    
                } else {
                    // Load more pages for infinite scroll
                    if (ENV.APP.debug) {
                        console.log('[LibraryTab] 📜 Loading more movies... Page:', page);
                    }
                    
                    const movies = await tmdbService.fetchPopularMovies(5, (page - 1) * 5 + 1);
                    
                    if (movies.length === 0) {
                        this.hasMorePages = false;
                        if (ENV.APP.debug) {
                            console.log('[LibraryTab] 🏁 No more pages to load');
                        }
                    } else {
                        // Add new movies (deduplicate by ID)
                        const existingIds = new Set(this.allMovies.map(m => m.id));
                        const newMovies = movies.filter(m => !existingIds.has(m.id));
                        this.allMovies.push(...newMovies);
                        this.currentPage = page;
                        
                        if (ENV.APP.debug) {
                            console.log('[LibraryTab] ✅ Loaded page', page, '- New movies:', newMovies.length, '- Total:', this.allMovies.length);
                        }
                    }
                }
            } else {
                // Fallback to demo movies
                const app = window.app;
                if (app && typeof app.getFallbackMovies === 'function') {
                    this.allMovies = app.getFallbackMovies();
                }
                this.hasMorePages = false;
                
                if (ENV.APP.debug) {
                    console.log('[LibraryTab] ⚠️ Using fallback movies:', this.allMovies.length);
                }
            }
            
            this.filteredMovies = [...this.allMovies];
            
        } catch (error) {
            console.error('[LibraryTab] ❌ Error loading movies:', error);
            this.hasMorePages = false;
        } finally {
            this.isLoading = false;
        }
    }
    
    setupInfiniteScroll() {
        // Remove old listener if exists
        if (this.scrollListener) {
            window.removeEventListener('scroll', this.scrollListener);
        }
        
        // Create new scroll listener
        this.scrollListener = async () => {
            // Check if near bottom of page
            const scrollHeight = document.documentElement.scrollHeight;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const clientHeight = window.innerHeight;
            
            if (scrollHeight - scrollTop - clientHeight < 500 && !this.isLoading && this.hasMorePages && this.currentFilter === 'all') {
                // Load next page
                await this.loadMovies(this.currentPage + 1);
                this.updateMoviesGrid();
            }
        };
        
        window.addEventListener('scroll', this.scrollListener);
        
        if (ENV.APP.debug) {
            console.log('[LibraryTab] 📜 Infinite scroll enabled');
        }
    }
    
    renderLoading() {
        return `
            <div style="display: flex; align-items: center; justify-content: center; height: calc(100vh - 10rem); flex-direction: column; gap: 1rem;">
                <div style="width: 48px; height: 48px; border: 4px solid rgba(255, 46, 99, 0.3); border-top-color: #ff2e63; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="color: rgba(255, 255, 255, 0.7); font-size: 0.9375rem;">Loading movies from TMDB...</p>
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
                        ${this.allMovies.length}+ movies • Scroll for more!
                    </p>
                </div>
                
                <!-- Search Bar -->
                <div style="margin-bottom: 1rem;">
                    <input 
                        type="text" 
                        id="search-input" 
                        placeholder="🔍 Search movies by title..." 
                        value="${this.searchQuery}"
                        style="width: 100%; padding: 1rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 1rem; color: white; font-size: 1rem;"
                    >
                </div>
                
                <!-- Filter: Swipe Actions -->
                <div style="margin-bottom: 1rem;">
                    <h3 style="font-size: 0.875rem; font-weight: 700; color: rgba(255, 255, 255, 0.7); text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.5rem 0;">
                        Your Swipes
                    </h3>
                    <div style="display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.5rem; -webkit-overflow-scrolling: touch;">
                        <button class="filter-btn" data-filter="all" style="padding: 0.75rem 1.5rem; background: ${this.currentFilter === 'all' ? 'linear-gradient(135deg, #ff2e63, #d90062)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${this.currentFilter === 'all' ? '#ff2e63' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 0.75rem; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.3s;">
                            🎬 All
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
                </div>
                
                <!-- Filter: Genres -->
                <div style="margin-bottom: 1rem;">
                    <h3 style="font-size: 0.875rem; font-weight: 700; color: rgba(255, 255, 255, 0.7); text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.5rem 0;">
                        Genre
                    </h3>
                    <div style="display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.5rem; -webkit-overflow-scrolling: touch;">
                        <button class="genre-btn" data-genre="all" style="padding: 0.75rem 1.5rem; background: ${this.currentGenre === 'all' ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${this.currentGenre === 'all' ? '#8b5cf6' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 0.75rem; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.3s;">
                            All Genres
                        </button>
                        <button class="genre-btn" data-genre="${GENRE_IDS.ACTION}" style="padding: 0.75rem 1.5rem; background: ${this.currentGenre == GENRE_IDS.ACTION ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${this.currentGenre == GENRE_IDS.ACTION ? '#8b5cf6' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 0.75rem; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.3s;">
                            💥 Action
                        </button>
                        <button class="genre-btn" data-genre="${GENRE_IDS.COMEDY}" style="padding: 0.75rem 1.5rem; background: ${this.currentGenre == GENRE_IDS.COMEDY ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${this.currentGenre == GENRE_IDS.COMEDY ? '#8b5cf6' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 0.75rem; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.3s;">
                            😂 Comedy
                        </button>
                        <button class="genre-btn" data-genre="${GENRE_IDS.DRAMA}" style="padding: 0.75rem 1.5rem; background: ${this.currentGenre == GENRE_IDS.DRAMA ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${this.currentGenre == GENRE_IDS.DRAMA ? '#8b5cf6' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 0.75rem; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.3s;">
                            🎭 Drama
                        </button>
                        <button class="genre-btn" data-genre="${GENRE_IDS.HORROR}" style="padding: 0.75rem 1.5rem; background: ${this.currentGenre == GENRE_IDS.HORROR ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${this.currentGenre == GENRE_IDS.HORROR ? '#8b5cf6' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 0.75rem; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.3s;">
                            👻 Horror
                        </button>
                        <button class="genre-btn" data-genre="${GENRE_IDS.SCIFI}" style="padding: 0.75rem 1.5rem; background: ${this.currentGenre == GENRE_IDS.SCIFI ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${this.currentGenre == GENRE_IDS.SCIFI ? '#8b5cf6' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 0.75rem; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.3s;">
                            🚀 Sci-Fi
                        </button>
                        <button class="genre-btn" data-genre="${GENRE_IDS.ROMANCE}" style="padding: 0.75rem 1.5rem; background: ${this.currentGenre == GENRE_IDS.ROMANCE ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${this.currentGenre == GENRE_IDS.ROMANCE ? '#8b5cf6' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 0.75rem; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.3s;">
                            💕 Romance
                        </button>
                    </div>
                </div>
                
                <!-- Filter: Platforms -->
                <div style="margin-bottom: 1.5rem;">
                    <h3 style="font-size: 0.875rem; font-weight: 700; color: rgba(255, 255, 255, 0.7); text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.5rem 0;">
                        Platform
                    </h3>
                    <div style="display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.5rem; -webkit-overflow-scrolling: touch;">
                        <button class="platform-btn" data-platform="all" style="padding: 0.75rem 1.5rem; background: ${this.currentPlatform === 'all' ? 'linear-gradient(135deg, #ec4899, #db2777)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${this.currentPlatform === 'all' ? '#ec4899' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 0.75rem; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.3s;">
                            All Platforms
                        </button>
                        <button class="platform-btn" data-platform="Netflix" style="padding: 0.75rem 1.5rem; background: ${this.currentPlatform === 'Netflix' ? 'rgba(229, 9, 20, 0.8)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${this.currentPlatform === 'Netflix' ? '#E50914' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 0.75rem; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.3s;">
                            Netflix
                        </button>
                        <button class="platform-btn" data-platform="Hulu" style="padding: 0.75rem 1.5rem; background: ${this.currentPlatform === 'Hulu' ? 'rgba(28, 231, 131, 0.8)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${this.currentPlatform === 'Hulu' ? '#1CE783' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 0.75rem; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.3s;">
                            Hulu
                        </button>
                        <button class="platform-btn" data-platform="Prime Video" style="padding: 0.75rem 1.5rem; background: ${this.currentPlatform === 'Prime Video' ? 'rgba(0, 168, 225, 0.8)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${this.currentPlatform === 'Prime Video' ? '#00A8E1' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 0.75rem; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.3s;">
                            Prime Video
                        </button>
                        <button class="platform-btn" data-platform="Disney+" style="padding: 0.75rem 1.5rem; background: ${this.currentPlatform === 'Disney+' ? 'rgba(17, 60, 207, 0.8)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${this.currentPlatform === 'Disney+' ? '#113CCF' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 0.75rem; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.3s;">
                            Disney+
                        </button>
                        <button class="platform-btn" data-platform="HBO Max" style="padding: 0.75rem 1.5rem; background: ${this.currentPlatform === 'HBO Max' ? 'rgba(178, 0, 255, 0.8)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${this.currentPlatform === 'HBO Max' ? '#B200FF' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 0.75rem; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.3s;">
                            HBO Max
                        </button>
                    </div>
                </div>
                
                <!-- Results Count -->
                <div style="margin-bottom: 1rem; padding: 0.75rem 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 0.75rem;">
                    <p style="color: rgba(255, 255, 255, 0.7); font-size: 0.875rem; margin: 0;">
                        Showing ${this.filteredMovies.length} movies
                    </p>
                </div>
                
                <!-- Movies Grid -->
                <div id="movies-grid">
                    ${this.renderMoviesGrid()}
                </div>
                
                <!-- Loading More Indicator -->
                ${this.isLoading ? `
                    <div style="text-align: center; padding: 2rem;">
                        <div style="width: 40px; height: 40px; border: 3px solid rgba(255, 46, 99, 0.3); border-top-color: #ff2e63; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                        <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.875rem; margin-top: 1rem;">Loading more movies...</p>
                    </div>
                ` : ''}
                
                ${!this.hasMorePages && this.currentFilter === 'all' && !this.isLoading ? `
                    <div style="text-align: center; padding: 2rem;">
                        <p style="color: rgba(255, 255, 255, 0.5); font-size: 0.875rem;">
                            🎬 You've reached the end! ${this.allMovies.length} movies loaded.
                        </p>
                    </div>
                ` : ''}
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
        
        // Filter by genre
        if (this.currentGenre !== 'all') {
            moviesToShow = moviesToShow.filter(m => {
                const genreId = parseInt(this.currentGenre);
                return m.genre_ids && m.genre_ids.includes(genreId);
            });
        }
        
        // Filter by platform
        if (this.currentPlatform !== 'all') {
            moviesToShow = moviesToShow.filter(m => m.platform === this.currentPlatform);
        }
        
        // Filter by search query
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            moviesToShow = moviesToShow.filter(m => 
                m.title.toLowerCase().includes(query) ||
                (m.overview && m.overview.toLowerCase().includes(query))
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
                        ${movie.year || movie.release_date ? `
                            <p style="font-size: 0.6875rem; color: rgba(255, 255, 255, 0.7); margin: 0.25rem 0 0 0;">
                                ${movie.year || new Date(movie.release_date).getFullYear()}
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
        } else if (this.currentGenre !== 'all' || this.currentPlatform !== 'all') {
            message = 'No movies match these filters';
            icon = '🎯';
        }
        
        return `
            <div style="text-align: center; padding: 4rem 2rem;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">${icon}</div>
                <h3 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0 0 0.5rem 0;">${message}</h3>
                <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.875rem; margin: 0;">
                    ${this.currentFilter !== 'all' ? 'Start swiping to build your library!' : 'Try adjusting your filters'}
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
        
        // Filter buttons (swipe actions)
        const filterBtns = this.container.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentFilter = btn.dataset.filter;
                this.renderContent();
            });
        });
        
        // Genre buttons
        const genreBtns = this.container.querySelectorAll('.genre-btn');
        genreBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const oldGenre = this.currentGenre;
                this.currentGenre = btn.dataset.genre;
                
                // If filtering by specific genre and showing all movies, load genre-specific movies
                if (this.currentGenre !== 'all' && this.currentFilter === 'all' && oldGenre === 'all') {
                    const tmdbService = getTMDBService();
                    if (tmdbService) {
                        this.allMovies = [];
                        this.isLoading = true;
                        this.renderContent();
                        
                        if (ENV.APP.debug) {
                            console.log('[LibraryTab] Loading genre:', this.currentGenre);
                        }
                        
                        const movies = await tmdbService.fetchMoviesByGenre(parseInt(this.currentGenre), 10);
                        this.allMovies = movies;
                        this.isLoading = false;
                        
                        if (ENV.APP.debug) {
                            console.log('[LibraryTab] Genre movies loaded:', movies.length);
                        }
                    }
                }
                
                this.renderContent();
            });
        });
        
        // Platform buttons
        const platformBtns = this.container.querySelectorAll('.platform-btn');
        platformBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentPlatform = btn.dataset.platform;
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
        // Remove scroll listener
        if (this.scrollListener) {
            window.removeEventListener('scroll', this.scrollListener);
            this.scrollListener = null;
        }
        
        if (ENV.APP.debug) {
            console.log('[LibraryTab] 🧹 Cleanup complete');
        }
    }
}
```

---

## **🚀 SAVE AND TEST**

1. **Save both files**
2. **Hard refresh** (Ctrl+Shift+R)
3. **Go to Library tab**
4. **Wait 3-5 seconds** for initial load
5. **Open console** (F12) and look for:
```
[LibraryTab] ✅ Initial load complete - Total movies: 520
