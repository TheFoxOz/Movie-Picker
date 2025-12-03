/**
 * Library Tab Component
 * TRUE UNLIMITED TMDB movies — no CSP issues, no eval(), infinite scroll
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

    filterMoviesByPreferences(movies) {
        const prefs = store.getState().preferences || {};
        const enabledPlatforms = prefs.platforms || [];
        const showWarnings = prefs.showTriggerWarnings !== false;

        return movies.filter(movie => {
            if (enabledPlatforms.length > 0 && !enabledPlatforms.includes(movie.platform)) return false;
            if (!showWarnings && movie.triggerWarnings?.length > 0) return false;
            return true;
        });
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
            if (!tmdbService) {
                this.hasMorePages = false;
                return;
            }

            let newMovies = [];

            if (page === 1) {
                console.log('[Library] Loading initial collection...');
                const sources = await Promise.all([
                    tmdbService.fetchPopularMovies(8),
                    tmdbService.fetchTrendingMovies(),
                    tmdbService.fetchTopRatedMovies(8),
                    tmdbService.fetchUpcomingMovies(4),
                    tmdbService.fetchNowPlayingMovies(4)
                ]);

                const map = new Map();
                sources.flat().forEach(m => map.set(m.id, m));
                this.allMovies = Array.from(map.values());
            } else {
                console.log(`[Library] Loading page ${page} from TMDB Discover...`);

                const response = await fetch(
                    `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbService.apiKey}&language=en-US&sort_by=popularity.desc&page=${page}&include_adult=false`
                );

                if (!response.ok) throw new Error('TMDB failed');

                const data = await response.json();
                newMovies = data.results.map(m => tmdbService.transformMovie(m));

                if (newMovies.length === 0) {
                    this.hasMorePages = false;
                    return;
                }

                const existingIds = new Set(this.allMovies.map(m => m.id));
                const filtered = newMovies.filter(m => !existingIds.has(m.id));
                this.allMovies.push(...filtered);
            }

            this.filteredMovies = this.filterMoviesByPreferences(this.allMovies);
            this.currentPage = page;

            if (ENV.APP.debug) {
                console.log(`[Library] Total movies: ${this.allMovies.length.toLocaleString()}`);
            }

        } catch (error) {
            console.error('[Library] Load error:', error);
            this.hasMorePages = false;
        } finally {
            this.isLoading = false;
        }
    }

    setupInfiniteScroll() {
        if (this.scrollListener) window.removeEventListener('scroll', this.scrollListener);

        this.scrollListener = () => {
            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
            if (scrollHeight - scrollTop - clientHeight < 800 && !this.isLoading && this.hasMorePages) {
                this.loadMovies(this.currentPage + 1).then(() => this.updateMoviesGrid());
            }
        };

        window.addEventListener('scroll', this.scrollListener);
    }

    renderLoading() {
        return `
            <div style="display:flex;align-items:center;justify-content:center;height:calc(100vh-10rem);flex-direction:column;gap:1rem;">
                <div style="width:48px;height:48px;border:4px solid rgba(255,46,99,0.3);border-top-color:#ff2e63;border-radius:50%;animation:spin 1s linear infinite;"></div>
                <p style="color:rgba(255,255,255,0.7);">Loading infinite library...</p>
            </div>
        `;
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
            <div style="padding:1.5rem 1rem 6rem;">
                <h1 style="font-size:1.75rem;font-weight:800;color:white;margin:0 0 0.5rem 0;">Movie Library</h1>
                <p style="color:rgba(255,255,255,0.6);font-size:0.875rem;margin-bottom:1.5rem;">
                    ${this.allMovies.length.toLocaleString()}+ movies • Keep scrolling!
                </p>

                <input type="text" id="search-input" placeholder="Search movies..." value="${this.searchQuery}" 
                       style="width:100%;padding:1rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:white;margin-bottom:1rem;">

                <div style="margin-bottom:1rem;">
                    <h3 style="font-size:0.875rem;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;margin:0 0 0.5rem 0;">Your Swipes</h3>
                    <div style="display:flex;gap:0.5rem;overflow-x:auto;padding-bottom:0.5rem;">
                        <button class="filter-btn" data-filter="all">All</button>
                        <button class="filter-btn" data-filter="loved">Loved (${swipeCounts.loved})</button>
                        <button class="filter-btn" data-filter="liked">Liked (${swipeCounts.liked})</button>
                        <button class="filter-btn" data-filter="maybe">Maybe (${swipeCounts.maybe})</button>
                        <button class="filter-btn" data-filter="passed">Passed (${swipeCounts.passed})</button>
                    </div>
                </div>

                <div style="margin-bottom:1.5rem;">
                    <h3 style="font-size:0.875rem;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;margin:0 0 0.5rem 0;">Genre</h3>
                    <div style="display:flex;gap:0.5rem;overflow-x:auto;padding-bottom:0.5rem;">
                        <button class="genre-btn" data-genre="all">All</button>
                        <button class="genre-btn" data-genre="${GENRE_IDS.ACTION}">Action</button>
                        <button class="genre-btn" data-genre="${GENRE_IDS.COMEDY}">Comedy</button>
                        <button class="genre-btn" data-genre="${GENRE_IDS.DRAMA}">Drama</button>
                        <button class="genre-btn" data-genre="${GENRE_IDS.HORROR}">Horror</button>
                        <button class="genre-btn" data-genre="${GENRE_IDS.SCIFI}">Sci-Fi</button>
                        <button class="genre-btn" data-genre="${GENRE_IDS.ROMANCE}">Romance</button>
                    </div>
                </div>

                <div style="margin-bottom:1rem;padding:0.75rem 1rem;background:rgba(255,255,255,0.05);border-radius:0.75rem;">
                    <p style="color:rgba(255,255,255,0.7);font-size:0.875rem;margin:0;">
                        Showing ${this.filteredMovies.length.toLocaleString()} movies
                    </p>
                </div>

                <div id="movies-grid">${this.renderMoviesGrid()}</div>

                ${this.isLoading ? `
                    <div style="text-align:center;padding:2rem;">
                        <div style="width:40px;height:40px;border:3px solid rgba(255,46,99,0.3);border-top-color:#ff2e63;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto;"></div>
                        <p style="color:rgba(255,255,255,0.6);margin-top:1rem;">Loading more...</p>
                    </div>
                ` : ''}
            </div>
        `;

        this.attachListeners();
    }

    renderMoviesGrid() {
        let moviesToShow = [...this.allMovies];

        if (this.currentFilter !== 'all') {
            const swiped = store.getState().swipeHistory || [];
            const ids = swiped.filter(s => s.action === this.currentFilter).map(s => String(s.movie.id));
            moviesToShow = moviesToShow.filter(m => ids.includes(String(m.id)));
        }
        if (this.currentGenre !== 'all') {
            const genreId = parseInt(this.currentGenre);
            moviesToShow = moviesToShow.filter(m => m.genre_ids?.includes(genreId));
        }
        if (this.currentPlatform !== 'all') {
            moviesToShow = moviesToShow.filter(m => m.platform === this.currentPlatform);
        }
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            moviesToShow = moviesToShow.filter(m =>
                m.title.toLowerCase().includes(q) ||
                m.overview?.toLowerCase().includes(q)
            );
        }

        this.filteredMovies = this.filterMoviesByPreferences(moviesToShow);

        if (this.filteredMovies.length === 0) {
            return `<div style="grid-column:1/-1;text-align:center;padding:4rem;">
                        <p style="color:rgba(255,255,255,0.5);font-size:1rem;">No movies match your filters</p>
                    </div>`;
        }

        return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:1rem;">
            ${this.filteredMovies.map(movie => this.renderMovieCard(movie)).join('')}
        </div>`;
    }

    renderMovieCard(movie) {
        const posterUrl = movie.poster_path || `https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}`;

        return `
            <div class="library-movie-card" data-movie-id="${movie.id}">
                <div style="position:relative;width:100%;aspect-ratio:2/3;border-radius:0.75rem;overflow:hidden;background:rgba(255,255,255,0.05);box-shadow:0 4px 16px rgba(0,0,0,0.3);transition:transform 0.3s;">
                    <img src="${posterUrl}" alt="${movie.title}" style="width:100%;height:100%;object-fit:cover;"
                         onerror="this.src='https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}'">
                    ${movie.vote_average ? `
                        <div style="position:absolute;top:0.5rem;right:0.5rem;padding:0.25rem 0.5rem;background:rgba(251,191,36,0.9);border-radius:0.5rem;">
                            <span style="color:white;font-size:0.75rem;font-weight:700;">${movie.vote_average.toFixed(1)}</span>
                        </div>
                    ` : ''}
                    <div style="position:absolute;bottom:0;left:0;right:0;padding:0.75rem 0.5rem;background:linear-gradient(0deg,rgba(0,0,0,0.9),transparent);">
                        <h3 style="font-size:0.8125rem;font-weight:700;color:white;margin:0;line-height:1.2;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
                            ${movie.title}
                        </h3>
                        <p style="font-size:0.6875rem;color:rgba(255,255,255,0.7);margin:0.25rem 0 0 0;">
                            ${movie.year || ''}${movie.runtime ? ` • ${movie.runtime}` : ''}
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    attachListeners() {
        const search = this.container.querySelector('#search-input');
        if (search) search.addEventListener('input', e => {
            this.searchQuery = e.target.value;
            this.updateMoviesGrid();
        });

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
            card.addEventListener('mouseover', () => card.style.transform = 'scale(1.05)');
            card.addEventListener('mouseout', () => card.style.transform = 'scale(1)');
            card.addEventListener('click', () => {
                const movie = this.allMovies.find(m => String(m.id) === card.dataset.movieId);
                if (movie) movieModal.show(movie);
            });
        });
    }

    updateMoviesGrid() {
        const grid = this.container.querySelector('#movies-grid');
        if (grid) {
            grid.innerHTML = this.renderMoviesGrid();
            this.attachListeners();
        }
    }

    destroy() {
        if (this.scrollListener) {
            window.removeEventListener('scroll', this.scrollListener);
            this.scrollListener = null;
        }
    }
}
