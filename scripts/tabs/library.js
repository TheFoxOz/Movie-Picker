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
        this.currentFilter = 'all';
        this.currentGenre = 'all';
        this.currentPlatform = 'all';
        this.searchQuery = '';
        this.isLoading = false;
        this.currentPage = 1;
        this.hasMorePages = true;
        this.scrollListener = null;
    }
    
    async render(container) {
        this.container = container;
        this.container.innerHTML = this.renderLoading();
        await this.loadMovies(1);
        this.renderContent();
        this.setupInfiniteScroll();
    }
    
    async loadMovies(page) {
        if (this.isLoading) return;
        this.isLoading = true;
        
        try {
            const tmdbService = getTMDBService();
            
            if (tmdbService) {
                if (page === 1) {
                    console.log('[LibraryTab] Loading initial collection...');
                    
                    const [popular, trending, topRated, upcoming, nowPlaying] = await Promise.all([
                        tmdbService.fetchPopularMovies(10, 1),
                        tmdbService.fetchTrendingMovies(),
                        tmdbService.fetchTopRatedMovies(10),
                        tmdbService.fetchUpcomingMovies(5),
                        tmdbService.fetchNowPlayingMovies(5)
                    ]);
                    
                    const allMoviesMap = new Map();
                    [...popular, ...trending, ...topRated, ...upcoming, ...nowPlaying].forEach(movie => {
                        allMoviesMap.set(movie.id, movie);
                    });
                    
                    this.allMovies = Array.from(allMoviesMap.values());
                    this.currentPage = 1;
                    
                    console.log('[LibraryTab] Loaded', this.allMovies.length, 'movies');
                    
                } else {
                    console.log('[LibraryTab] Loading page', page);
                    
                    const movies = await tmdbService.fetchPopularMovies(5, (page - 1) * 5 + 1);
                    
                    if (movies.length === 0) {
                        this.hasMorePages = false;
                    } else {
                        const existingIds = new Set(this.allMovies.map(m => m.id));
                        const newMovies = movies.filter(m => !existingIds.has(m.id));
                        this.allMovies.push(...newMovies);
                        this.currentPage = page;
                        console.log('[LibraryTab] Total movies:', this.allMovies.length);
                    }
                }
            } else {
                const app = window.app;
                if (app && typeof app.getFallbackMovies === 'function') {
                    this.allMovies = app.getFallbackMovies();
                }
                this.hasMorePages = false;
            }
            
            this.filteredMovies = [...this.allMovies];
            
        } catch (error) {
            console.error('[LibraryTab] Error:', error);
            this.hasMorePages = false;
        } finally {
            this.isLoading = false;
        }
    }
    
    setupInfiniteScroll() {
        if (this.scrollListener) {
            window.removeEventListener('scroll', this.scrollListener);
        }
        
        this.scrollListener = async () => {
            const scrollHeight = document.documentElement.scrollHeight;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const clientHeight = window.innerHeight;
            
            if (scrollHeight - scrollTop - clientHeight < 500 && !this.isLoading && this.hasMorePages && this.currentFilter === 'all') {
                await this.loadMovies(this.currentPage + 1);
                this.updateMoviesGrid();
            }
        };
        
        window.addEventListener('scroll', this.scrollListener);
    }
    
    renderLoading() {
        return `
            <div style="display: flex; align-items: center; justify-content: center; height: calc(100vh - 10rem); flex-direction: column; gap: 1rem;">
                <div style="width: 48px; height: 48px; border: 4px solid rgba(255, 46, 99, 0.3); border-top-color: #ff2e63; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="color: rgba(255, 255, 255, 0.7); font-size: 0.9375rem;">Loading movies from TMDB...</p>
            </div>
        `;
    }
    
    getButtonStyle(isActive, activeGradient, defaultBg = 'rgba(255, 255, 255, 0.05)') {
        const bg = isActive ? activeGradient : defaultBg;
        const border = isActive ? activeGradient.split(',')[0].replace('linear-gradient(135deg, ', '') : 'rgba(255, 255, 255, 0.1)';
        return `padding: 0.75rem 1.5rem; background: ${bg}; border: 1px solid ${border}; border-radius: 0.75rem; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.3s;`;
    }
    
    renderContent() {
        const state = store.getState();
        const swipeHistory = state.swipeHistory || [];
        
        const swipeCounts = {
            loved: swipeHistory.filter(s => s.action === 'love').length,
            liked: swipeHistory.filter(s => s.action === 'like').length,
            maybe: swipeHistory.filter(s => s.action === 'maybe').length,
            passed: swipeHistory.filter(s => s.action === 'pass').length
        };
        
        this.container.innerHTML = `
            <div style="padding: 1.5rem 1rem 6rem;">
                <div style="margin-bottom: 1.5rem;">
                    <h1 style="font-size: 1.75rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0;">📚 Movie Library</h1>
                    <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.875rem; margin: 0;">${this.allMovies.length}+ movies • Scroll for more!</p>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <input type="text" id="search-input" placeholder="🔍 Search movies..." value="${this.searchQuery}" style="width: 100%; padding: 1rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 1rem; color: white; font-size: 1rem;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <h3 style="font-size: 0.875rem; font-weight: 700; color: rgba(255, 255, 255, 0.7); text-transform: uppercase; margin: 0 0 0.5rem 0;">Your Swipes</h3>
                    <div style="display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.5rem;">
                        <button class="filter-btn" data-filter="all" style="${this.getButtonStyle(this.currentFilter === 'all', 'linear-gradient(135deg, #ff2e63, #d90062)')}">🎬 All</button>
                        <button class="filter-btn" data-filter="loved" style="${this.getButtonStyle(this.currentFilter === 'loved', 'linear-gradient(135deg, #ff006e, #d90062)')}">❤️ Loved (${swipeCounts.loved})</button>
                        <button class="filter-btn" data-filter="liked" style="${this.getButtonStyle(this.currentFilter === 'liked', 'linear-gradient(135deg, #10b981, #059669)')}">👍 Liked (${swipeCounts.liked})</button>
                        <button class="filter-btn" data-filter="maybe" style="${this.getButtonStyle(this.currentFilter === 'maybe', 'linear-gradient(135deg, #fbbf24, #f59e0b)')}">🤔 Maybe (${swipeCounts.maybe})</button>
                        <button class="filter-btn" data-filter="passed" style="${this.getButtonStyle(this.currentFilter === 'passed', 'linear-gradient(135deg, #ef4444, #dc2626)')}">✕ Passed (${swipeCounts.passed})</button>
                    </div>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <h3 style="font-size: 0.875rem; font-weight: 700; color: rgba(255, 255, 255, 0.7); text-transform: uppercase; margin: 0 0 0.5rem 0;">Genre</h3>
                    <div style="display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.5rem;">
                        <button class="genre-btn" data-genre="all" style="${this.getButtonStyle(this.currentGenre === 'all', 'linear-gradient(135deg, #8b5cf6, #7c3aed)')}">All Genres</button>
                        <button class="genre-btn" data-genre="${GENRE_IDS.ACTION}" style="${this.getButtonStyle(this.currentGenre == GENRE_IDS.ACTION, 'linear-gradient(135deg, #8b5cf6, #7c3aed)')}">💥 Action</button>
                        <button class="genre-btn" data-genre="${GENRE_IDS.COMEDY}" style="${this.getButtonStyle(this.currentGenre == GENRE_IDS.COMEDY, 'linear-gradient(135deg, #8b5cf6, #7c3aed)')}">😂 Comedy</button>
                        <button class="genre-btn" data-genre="${GENRE_IDS.DRAMA}" style="${this.getButtonStyle(this.currentGenre == GENRE_IDS.DRAMA, 'linear-gradient(135deg, #8b5cf6, #7c3aed)')}">🎭 Drama</button>
                        <button class="genre-btn" data-genre="${GENRE_IDS.HORROR}" style="${this.getButtonStyle(this.currentGenre == GENRE_IDS.HORROR, 'linear-gradient(135deg, #8b5cf6, #7c3aed)')}">👻 Horror</button>
                        <button class="genre-btn" data-genre="${GENRE_IDS.SCIFI}" style="${this.getButtonStyle(this.currentGenre == GENRE_IDS.SCIFI, 'linear-gradient(135deg, #8b5cf6, #7c3aed)')}">🚀 Sci-Fi</button>
                        <button class="genre-btn" data-genre="${GENRE_IDS.ROMANCE}" style="${this.getButtonStyle(this.currentGenre == GENRE_IDS.ROMANCE, 'linear-gradient(135deg, #8b5cf6, #7c3aed)')}">💕 Romance</button>
                    </div>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <h3 style="font-size: 0.875rem; font-weight: 700; color: rgba(255, 255, 255, 0.7); text-transform: uppercase; margin: 0 0 0.5rem 0;">Platform</h3>
                    <div style="display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.5rem;">
                        <button class="platform-btn" data-platform="all" style="${this.getButtonStyle(this.currentPlatform === 'all', 'linear-gradient(135deg, #ec4899, #db2777)')}">All Platforms</button>
                        <button class="platform-btn" data-platform="Netflix" style="${this.getButtonStyle(this.currentPlatform === 'Netflix', 'rgba(229, 9, 20, 0.8)')}">Netflix</button>
                        <button class="platform-btn" data-platform="Hulu" style="${this.getButtonStyle(this.currentPlatform === 'Hulu', 'rgba(28, 231, 131, 0.8)')}">Hulu</button>
                        <button class="platform-btn" data-platform="Prime Video" style="${this.getButtonStyle(this.currentPlatform === 'Prime Video', 'rgba(0, 168, 225, 0.8)')}">Prime Video</button>
                        <button class="platform-btn" data-platform="Disney+" style="${this.getButtonStyle(this.currentPlatform === 'Disney+', 'rgba(17, 60, 207, 0.8)')}">Disney+</button>
                        <button class="platform-btn" data-platform="HBO Max" style="${this.getButtonStyle(this.currentPlatform === 'HBO Max', 'rgba(178, 0, 255, 0.8)')}">HBO Max</button>
                    </div>
                </div>
                
                <div style="margin-bottom: 1rem; padding: 0.75rem 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 0.75rem;">
                    <p style="color: rgba(255, 255, 255, 0.7); font-size: 0.875rem; margin: 0;">Showing ${this.filteredMovies.length} movies</p>
                </div>
                
                <div id="movies-grid">${this.renderMoviesGrid()}</div>
                
                ${this.isLoading ? '<div style="text-align: center; padding: 2rem;"><div style="width: 40px; height: 40px; border: 3px solid rgba(255, 46, 99, 0.3); border-top-color: #ff2e63; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div><p style="color: rgba(255, 255, 255, 0.6); font-size: 0.875rem; margin-top: 1rem;">Loading more...</p></div>' : ''}
                
                ${!this.hasMorePages && this.currentFilter === 'all' && !this.isLoading ? `<div style="text-align: center; padding: 2rem;"><p style="color: rgba(255, 255, 255, 0.5); font-size: 0.875rem;">🎬 End of library • ${this.allMovies.length} movies loaded</p></div>` : ''}
            </div>
        `;
        
        this.attachListeners();
    }
    
    renderMoviesGrid() {
        const state = store.getState();
        const swipeHistory = state.swipeHistory || [];
        let moviesToShow = [...this.allMovies];
        
        if (this.currentFilter !== 'all') {
            const swipedMovieIds = swipeHistory.filter(s => s.action === this.currentFilter).map(s => String(s.movie.id));
            moviesToShow = moviesToShow.filter(m => swipedMovieIds.includes(String(m.id)));
        }
        
        if (this.currentGenre !== 'all') {
            const genreId = parseInt(this.currentGenre);
            moviesToShow = moviesToShow.filter(m => m.genre_ids && m.genre_ids.includes(genreId));
        }
        
        if (this.currentPlatform !== 'all') {
            moviesToShow = moviesToShow.filter(m => m.platform === this.currentPlatform);
        }
        
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            moviesToShow = moviesToShow.filter(m => m.title.toLowerCase().includes(query) || (m.overview && m.overview.toLowerCase().includes(query)));
        }
        
        this.filteredMovies = moviesToShow;
        
        if (moviesToShow.length === 0) {
            return '<div style="text-align: center; padding: 4rem 2rem;"><div style="font-size: 4rem; margin-bottom: 1rem;">🎬</div><h3 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0 0 0.5rem 0;">No movies found</h3><p style="color: rgba(255, 255, 255, 0.6); font-size: 0.875rem; margin: 0;">Try adjusting your filters</p></div>';
        }
        
        return '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem;">' + moviesToShow.map(movie => this.renderMovieCard(movie, swipeHistory)).join('') + '</div>';
    }
    
    renderMovieCard(movie, swipeHistory) {
        const posterUrl = movie.poster_path || `https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}`;
        const swipe = swipeHistory.find(s => String(s.movie.id) === String(movie.id));
        const swipeIndicator = swipe ? this.getSwipeIndicator(swipe.action) : '';
        
        return `
            <div class="library-movie-card" data-movie-id="${movie.id}" style="cursor: pointer; transition: transform 0.3s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                <div style="position: relative; width: 100%; aspect-ratio: 2/3; border-radius: 0.75rem; overflow: hidden; background: rgba(255, 255, 255, 0.05); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);">
                    <img src="${posterUrl}" alt="${movie.title}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}'">
                    ${swipeIndicator}
                    ${movie.vote_average ? `<div style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem 0.5rem; background: rgba(251, 191, 36, 0.9); border-radius: 0.5rem;"><span style="color: white; font-size: 0.75rem; font-weight: 700;">⭐ ${movie.vote_average.toFixed(1)}</span></div>` : ''}
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 0.75rem 0.5rem; background: linear-gradient(0deg, rgba(0, 0, 0, 0.9), transparent);">
                        <h3 style="font-size: 0.8125rem; font-weight: 700; color: white; margin: 0; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${movie.title}</h3>
                        ${movie.release_date ? `<p style="font-size: 0.6875rem; color: rgba(255, 255, 255, 0.7); margin: 0.25rem 0 0 0;">${new Date(movie.release_date).getFullYear()}</p>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    getSwipeIndicator(action) {
        const indicators = {
            love: { emoji: '❤️', color: '#ff006e' },
            like: { emoji: '👍', color: '#10b981' },
            maybe: { emoji: '🤔', color: '#fbbf24' },
            pass: { emoji: '✕', color: '#ef4444' }
        };
        const indicator = indicators[action];
        if (!indicator) return '';
        return `<div style="position: absolute; top: 0.5rem; left: 0.5rem; padding: 0.375rem 0.625rem; background: ${indicator.color}; border-radius: 0.5rem;"><span style="font-size: 0.875rem;">${indicator.emoji}</span></div>`;
    }
    
    attachListeners() {
        const searchInput = this.container.querySelector('#search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.updateMoviesGrid();
            });
        }
        
        this.container.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentFilter = btn.dataset.filter;
                this.renderContent();
            });
        });
        
        this.container.querySelectorAll('.genre-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentGenre = btn.dataset.genre;
                this.renderContent();
            });
        });
        
        this.container.querySelectorAll('.platform-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentPlatform = btn.dataset.platform;
                this.renderContent();
            });
        });
        
        this.container.querySelectorAll('.library-movie-card').forEach(card => {
            card.addEventListener('click', () => {
                const movieId = card.dataset.movieId;
                const movie = this.allMovies.find(m => String(m.id) === String(movieId));
                if (movie) movieModal.show(movie);
            });
        });
    }
    
    updateMoviesGrid() {
        const moviesGrid = this.container.querySelector('#movies-grid');
        if (moviesGrid) {
            moviesGrid.innerHTML = this.renderMoviesGrid();
            moviesGrid.querySelectorAll('.library-movie-card').forEach(card => {
                card.addEventListener('click', () => {
                    const movieId = card.dataset.movieId;
                    const movie = this.allMovies.find(m => String(m.id) === String(movieId));
                    if (movie) movieModal.show(movie);
                });
            });
        }
    }
    
    destroy() {
        if (this.scrollListener) {
            window.removeEventListener('scroll', this.scrollListener);
            this.scrollListener = null;
        }
    }
}
