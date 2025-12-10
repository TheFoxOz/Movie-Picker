import { store } from '../state/store.js';
import { tmdbService } from '../services/tmdb.js';
import { movieModal } from '../components/movie-modal.js';
import { ENV } from '../config/env.js';

const GENRE_IDS = {
    ACTION: 28,
    ADVENTURE: 12,
    ANIMATION: 16,
    COMEDY: 35,
    CRIME: 80,
    DOCUMENTARY: 99,
    DRAMA: 18,
    FAMILY: 10751,
    FANTASY: 14,
    HISTORY: 36,
    HORROR: 27,
    MUSIC: 10402,
    MYSTERY: 9648,
    ROMANCE: 10749,
    SCIFI: 878,
    THRILLER: 53,
    WAR: 10752,
    WESTERN: 37
};

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
        if (this.isLoading || !this.hasMorePages) return;
        this.isLoading = true;

        try {
            if (!tmdbService) {
                this.hasMorePages = false;
                return;
            }

            let newMovies = [];

            if (page === 1) {
                console.log('[Library] Loading initial collection...');
                const sources = await Promise.all([
                    tmdbService.getPopularMovies(1).catch(() => []),
                    tmdbService.getTrendingMovies('week').catch(() => []),
                    tmdbService.discoverMovies({ sortBy: 'vote_average.desc', minVotes: 1000, page: 1 }).catch(() => ({ movies: [] }))
                ]);

                const popularMovies = sources[0] || [];
                const trendingMovies = sources[1] || [];
                const topRatedResult = sources[2];
                const topRatedMovies = topRatedResult.movies || topRatedResult || [];

                const map = new Map();
                [...popularMovies, ...trendingMovies, ...topRatedMovies].forEach(m => {
                    if (m && m.id) map.set(m.id, m);
                });
                this.allMovies = Array.from(map.values());
            }

            console.log(`[Library] Loading Discover page ${page}...`);
            const response = await fetch(
                `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbService.apiKey}&language=en-US&sort_by=popularity.desc&page=${page}&include_adult=false`
            );

            if (!response.ok) {
                console.warn('[Library] TMDB API error');
                this.hasMorePages = false;
                return;
            }

            const data = await response.json();
            newMovies = data.results.map(m => tmdbService.processMovie(m));

            if (newMovies.length === 0 || page >= data.total_pages || page >= 500) {
                console.log(`[Library] Reached end. Total pages: ${data.total_pages}, Current page: ${page}`);
                this.hasMorePages = false;
            }

            const existingIds = new Set(this.allMovies.map(m => m.id));
            const filtered = newMovies.filter(m => !existingIds.has(m.id));
            this.allMovies.push(...filtered);

            this.filteredMovies = this.filterMoviesByPreferences(this.allMovies);
            this.currentPage = page;

            console.log(`[Library] Total movies: ${this.allMovies.length.toLocaleString()}, Page ${page}/${data.total_pages || '?'}`);

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
            const scrolledToBottom = scrollHeight - scrollTop - clientHeight;
            
            if (scrolledToBottom < 1500 && !this.isLoading && this.hasMorePages) {
                console.log(`[Scroll] Triggering load for page ${this.currentPage + 1}`);
                this.loadMovies(this.currentPage + 1).then(() => this.updateMoviesGrid());
            }
        };
        
        window.addEventListener('scroll', this.scrollListener);
        
        setTimeout(() => {
            const { scrollHeight, clientHeight } = document.documentElement;
            if (scrollHeight <= clientHeight && this.hasMorePages && !this.isLoading) {
                console.log('[Scroll] Content too short, loading more...');
                this.loadMovies(this.currentPage + 1).then(() => this.updateMoviesGrid());
            }
        }, 500);
    }

    renderLoading() {
        return `
            <div style="display:flex;align-items:center;justify-content:center;height:calc(100vh-10rem);flex-direction:column;gap:1rem;">
                <div style="width:48px;height:48px;border:4px solid rgba(255,46,99,0.3);border-top-color:#ff2e63;border-radius:50%;animation:spin 1s linear infinite;"></div>
                <p style="color:rgba(255,255,255,0.7);">Loading infinite library...</p>
            </div>
        `;
    }

    getButtonStyle(isActive, activeGradient, defaultBg = 'rgba(255,255,255,0.05)') {
        const bg = isActive ? activeGradient : defaultBg;
        const borderColor = isActive 
            ? activeGradient.split(',')[0].replace('linear-gradient(135deg, ', '').trim() 
            : 'rgba(255,255,255,0.1)';
        
        return `
            padding: 0.75rem 1.5rem;
            background: ${bg};
            border: 1px solid ${borderColor};
            border-radius: 0.75rem;
            color: white;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `.replace(/\s+/g, ' ').trim();
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
                <div style="margin-bottom:1.5rem;">
                    <h1 style="font-size:1.75rem;font-weight:800;color:white;margin:0 0 0.5rem 0;">Movie Library</h1>
                    <p style="color:rgba(255,255,255,0.6);font-size:0.875rem;margin:0;">
                        ${this.allMovies.length.toLocaleString()}+ movies • Keep scrolling!
                    </p>
                </div>

                <div style="margin-bottom:1rem;">
                    <input type="text" id="search-input" placeholder="Search movies..." value="${this.searchQuery}" 
                           style="width:100%;padding:1rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:white;font-size:1rem;">
                </div>

                <div style="margin-bottom:1rem;">
                    <h3 style="font-size:0.875rem;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;margin:0 0 0.5rem 0;">Your Swipes</h3>
                    <div style="display:flex;gap:0.5rem;overflow-x:auto;padding-bottom:0.5rem;">
                        <button class="filter-btn" data-filter="all" style="${this.getButtonStyle(this.currentFilter==='all','linear-gradient(135deg,#ff2e63,#d90062)')}">All</button>
                        <button class="filter-btn" data-filter="loved" style="${this.getButtonStyle(this.currentFilter==='loved','linear-gradient(135deg,#ff006e,#d90062)')}">Loved (${swipeCounts.loved})</button>
                        <button class="filter-btn" data-filter="liked" style="${this.getButtonStyle(this.currentFilter==='liked','linear-gradient(135deg,#10b981,#059669)')}">Liked (${swipeCounts.liked})</button>
                        <button class="filter-btn" data-filter="maybe" style="${this.getButtonStyle(this.currentFilter==='maybe','linear-gradient(135deg,#fbbf24,#f59e0b)')}">Maybe (${swipeCounts.maybe})</button>
                        <button class="filter-btn" data-filter="passed" style="${this.getButtonStyle(this.currentFilter==='passed','linear-gradient(135deg,#ef4444,#dc2626)')}">Passed (${swipeCounts.passed})</button>
                    </div>
                </div>

                <div style="margin-bottom:1rem;">
                    <h3 style="font-size:0.875rem;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;margin:0 0 0.5rem 0;">Genre</h3>
                    <div style="display:flex;gap:0.5rem;overflow-x:auto;padding-bottom:0.5rem;">
                        <button class="genre-btn" data-genre="all" style="${this.getButtonStyle(this.currentGenre==='all','linear-gradient(135deg,#8b5cf6,#7c3aed)')}">All Genres</button>
                        <button class="genre-btn" data-genre="${GENRE_IDS.ACTION}" style="${this.getButtonStyle(this.currentGenre==GENRE_IDS.ACTION,'linear-gradient(135deg,#8b5cf6,#7c3aed)')}">Action</button>
                        <button class="genre-btn" data-genre="${GENRE_IDS.COMEDY}" style="${this.getButtonStyle(this.currentGenre==GENRE_IDS.COMEDY,'linear-gradient(135deg,#8b5cf6,#7c3aed)')}">Comedy</button>
                        <button class="genre-btn" data-genre="${GENRE_IDS.DRAMA}" style="${this.getButtonStyle(this.currentGenre==GENRE_IDS.DRAMA,'linear-gradient(135deg,#8b5cf6,#7c3aed)')}">Drama</button>
                        <button class="genre-btn" data-genre="${GENRE_IDS.HORROR}" style="${this.getButtonStyle(this.currentGenre==GENRE_IDS.HORROR,'linear-gradient(135deg,#8b5cf6,#7c3aed)')}">Horror</button>
                        <button class="genre-btn" data-genre="${GENRE_IDS.SCIFI}" style="${this.getButtonStyle(this.currentGenre==GENRE_IDS.SCIFI,'linear-gradient(135deg,#8b5cf6,#7c3aed)')}">Sci-Fi</button>
                        <button class="genre-btn" data-genre="${GENRE_IDS.ROMANCE}" style="${this.getButtonStyle(this.currentGenre==GENRE_IDS.ROMANCE,'linear-gradient(135deg,#8b5cf6,#7c3aed)')}">Romance</button>
                    </div>
                </div>

                <div style="margin-bottom:1.5rem;">
                    <h3 style="font-size:0.875rem;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;margin:0 0 0.5rem 0;">Platform</h3>
                    <div style="display:flex;gap:0.5rem;overflow-x:auto;padding-bottom:0.5rem;">
                        <button class="platform-btn" data-platform="all" style="${this.getButtonStyle(this.currentPlatform==='all','linear-gradient(135deg,#ec4899,#db2777)')}">All Platforms</button>
                        <button class="platform-btn" data-platform="Netflix" style="${this.getButtonStyle(this.currentPlatform==='Netflix','rgba(229,9,20,0.8)')}">Netflix</button>
                        <button class="platform-btn" data-platform="Hulu" style="${this.getButtonStyle(this.currentPlatform==='Hulu','rgba(28,231,131,0.8)')}">Hulu</button>
                        <button class="platform-btn" data-platform="Prime Video" style="${this.getButtonStyle(this.currentPlatform==='Prime Video','rgba(0,168,225,0.8)')}">Prime Video</button>
                        <button class="platform-btn" data-platform="Disney+" style="${this.getButtonStyle(this.currentPlatform==='Disney+','rgba(17,60,207,0.8)')}">Disney+</button>
                        <button class="platform-btn" data-platform="HBO Max" style="${this.getButtonStyle(this.currentPlatform==='HBO Max','rgba(178,0,255,0.8)')}">HBO Max</button>
                    </div>
                </div>

                <div style="margin-bottom:1rem;padding:0.75rem 1rem;background:rgba(255,255,255,0.05);border-radius:0.75rem;">
                    <p style="color:rgba(255,255,255,0.7);font-size:0.875rem;margin:0;">
                        Showing ${this.filteredMovies.length.toLocaleString()} movies
                    </p>
                </div>

                <div id="movies-grid">${this.renderMoviesGrid()}</div>

                ${this.hasMorePages ? `
                    <div style="text-align:center;padding:2rem;">
                        ${this.isLoading ? `
                            <div style="width:40px;height:40px;border:3px solid rgba(255,46,99,0.3);border-top-color:#ff2e63;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto;"></div>
                            <p style="color:rgba(255,255,255,0.6);margin-top:1rem;">Loading more... (Page ${this.currentPage})</p>
                        ` : `
                            <button id="load-more-btn" style="padding:1rem 2rem;background:linear-gradient(135deg,#ff2e63,#d90062);border:none;border-radius:0.75rem;color:white;font-size:1rem;font-weight:700;cursor:pointer;transition:transform 0.2s;">
                                Load More Movies
                            </button>
                            <p style="color:rgba(255,255,255,0.6);margin-top:0.5rem;font-size:0.875rem;">
                                Currently showing ${this.allMovies.length.toLocaleString()} movies
                            </p>
                        `}
                    </div>
                ` : `
                    <div style="text-align:center;padding:2rem;">
                        <p style="color:rgba(255,255,255,0.5);">You've reached the end! All ${this.allMovies.length.toLocaleString()} movies loaded.</p>
                    </div>
                `}
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
            moviesToShow = moviesToShow.filter(m => (m.genre_ids || m.genreIds)?.includes(genreId));
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
        const posterUrl = movie.posterURL || movie.poster_path || `https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}`;

        return `
            <div class="library-movie-card" data-movie-id="${movie.id}">
                <div style="position:relative;width:100%;aspect-ratio:2/3;border-radius:0.75rem;overflow:hidden;background:rgba(255,255,255,0.05);box-shadow:0 4px 16px rgba(0,0,0,0.3);transition:transform 0.3s;cursor:pointer;">
                    <img src="${posterUrl}" alt="${movie.title}" style="width:100%;height:100%;object-fit:cover;"
                         onerror="this.src='https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}'">
                    ${movie.vote_average || movie.rating ? `
                        <div style="position:absolute;top:0.5rem;right:0.5rem;padding:0.25rem 0.5rem;background:rgba(251,191,36,0.9);border-radius:0.5rem;">
                            <span style="color:white;font-size:0.75rem;font-weight:700;">${(movie.vote_average || movie.rating).toFixed(1)}</span>
                        </div>
                    ` : ''}
                    <div style="position:absolute;bottom:0;left:0;right:0;padding:0.75rem 0.5rem;background:linear-gradient(0deg,rgba(0,0,0,0.9),transparent);">
                        <h3 style="font-size:0.8125rem;font-weight:700;color:white;margin:0;line-height:1.2;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
                            ${movie.title}
                        </h3>
                        <p style="font-size:0.6875rem;color:rgba(255,255,255,0.7);margin:0.25rem 0 0 0;">
                            ${movie.year || movie.releaseDate?.split('-')[0] || ''}${movie.runtime ? ` • ${movie.runtime}` : ''}
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    attachListeners() {
        const search = this.container.querySelector('#search-input');
        if (search) {
            let searchTimeout;
            search.addEventListener('input', e => {
                this.searchQuery = e.target.value.trim();
                
                if (searchTimeout) clearTimeout(searchTimeout);
                
                if (this.searchQuery.length >= 2) {
                    searchTimeout = setTimeout(() => {
                        this.searchTMDB(this.searchQuery);
                    }, 500);
                } else {
                    this.updateMoviesGrid();
                }
            });
        }

        const loadMoreBtn = this.container.querySelector('#load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                console.log('[LoadMore] Button clicked');
                this.loadMovies(this.currentPage + 1).then(() => this.renderContent());
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
            card.addEventListener('mouseover', () => card.style.transform = 'scale(1.05)');
            card.addEventListener('mouseout', () => card.style.transform = 'scale(1)');
            card.addEventListener('click', () => {
                const movie = this.allMovies.find(m => String(m.id) === card.dataset.movieId);
                if (movie) movieModal.show(movie);
            });
        });
    }

    async searchTMDB(query) {
        console.log(`[Search] Searching TMDB for: "${query}"`);
        
        try {
            if (!tmdbService) return;

            const response = await fetch(
                `https://api.themoviedb.org/3/search/movie?api_key=${tmdbService.apiKey}&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`
            );

            if (!response.ok) {
                console.error('[Search] TMDB search failed');
                return;
            }

            const data = await response.json();
            const searchResults = data.results.map(m => tmdbService.processMovie(m));
            
            console.log(`[Search] Found ${searchResults.length} results`);
            
            const existingIds = new Set(this.allMovies.map(m => m.id));
            const newMovies = searchResults.filter(m => !existingIds.has(m.id));
            if (newMovies.length > 0) {
                this.allMovies.push(...newMovies);
            }
            
            this.updateMoviesGrid();

        } catch (error) {
            console.error('[Search] Error:', error);
        }
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
