import { store } from '../state/store.js';
import { tmdbService } from '../services/tmdb.js';
import { movieModal } from '../components/movie-modal.js';
import { ENV } from '../config/env.js';
import { renderTriggerBadge } from '../utils/trigger-warnings.js';

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
        this.currentRating = 'all';
        this.currentRuntime = 'all';
        this.hideTriggerWarnings = false;
        this.searchQuery = '';
        this.isLoading = false;
        this.currentPage = 1;
        this.hasMorePages = true;
        this.scrollListener = null;
        this.filterModalOpen = false;
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
                console.log('[Library] Loading initial collection with genre diversity...');
                
                const baseCollections = await Promise.all([
                    tmdbService.getPopularMovies(1).catch(() => []),
                    tmdbService.getPopularMovies(2).catch(() => []),
                    tmdbService.getPopularMovies(3).catch(() => []),
                    tmdbService.getTrendingMovies('week').catch(() => []),
                    tmdbService.discoverMovies({ sortBy: 'vote_average.desc', minVotes: 1000, page: 1 }).catch(() => ({ movies: [] }))
                ]);

                const genreIds = [28, 35, 18, 27, 878, 10749, 53, 16];
                const genreCollections = await Promise.all(
                    genreIds.map(async (genreId) => {
                        try {
                            const response = await fetch(
                                `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbService.apiKey}&language=en-US&sort_by=popularity.desc&with_genres=${genreId}&page=1&include_adult=false`
                            );
                            if (!response.ok) return [];
                            const data = await response.json();
                            return data.results.map(m => tmdbService.processMovie(m));
                        } catch (error) {
                            console.warn(`[Library] Failed to load genre ${genreId}`);
                            return [];
                        }
                    })
                );

                const allSources = [...baseCollections, ...genreCollections];

                const map = new Map();
                allSources.forEach(result => {
                    const movies = Array.isArray(result) ? result : (result.movies || []);
                    movies.forEach(m => {
                        if (m && m.id) map.set(m.id, m);
                    });
                });
                
                this.allMovies = Array.from(map.values());
                console.log('[Library] ✅ Loaded initial collection:', this.allMovies.length, 'unique movies');
                
                console.log('[Library] Enriching initial movies with platform data...');
                await this.enrichWithPlatformData(this.allMovies);
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
            
            if (filtered.length > 0) {
                console.log(`[Library] Enriching ${filtered.length} new movies with platform data...`);
                await this.enrichWithPlatformData(filtered);
            }
            
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

    async enrichWithPlatformData(movies, options = { maxConcurrent: 5, delay: 50 }) {
        if (!movies || movies.length === 0) {
            return movies;
        }

        const { maxConcurrent, delay } = options;
        
        for (let i = 0; i < movies.length; i += maxConcurrent) {
            const batch = movies.slice(i, i + maxConcurrent);
            
            await Promise.all(
                batch.map(async (movie) => {
                    if (tmdbService.getWatchProviders) {
                        movie.availableOn = await tmdbService.getWatchProviders(movie.id);
                        
                        if (!movie.availableOn || movie.availableOn.length === 0) {
                            const releaseDate = new Date(movie.releaseDate || movie.release_date);
                            const sixMonthsAgo = new Date();
                            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                            
                            if (releaseDate > sixMonthsAgo) {
                                movie.platform = 'In Cinemas';
                            } else {
                                movie.platform = 'Not Available';
                            }
                        } else {
                            movie.platform = movie.availableOn[0];
                        }
                    }
                })
            );
            
            if (i + maxConcurrent < movies.length) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        return movies;
    }

    setupInfiniteScroll() {
        if (this.scrollListener) {
            const scrollContainer = this.container.querySelector('.library-scroll-container');
            if (scrollContainer) {
                scrollContainer.removeEventListener('scroll', this.scrollListener);
            }
        }
        
        this.scrollListener = () => {
            const scrollContainer = this.container.querySelector('.library-scroll-container');
            if (!scrollContainer) return;
            
            const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
            const scrolledToBottom = scrollHeight - scrollTop - clientHeight;
            
            if (scrolledToBottom < 1500 && !this.isLoading && this.hasMorePages) {
                console.log(`[Scroll] Triggering load for page ${this.currentPage + 1}`);
                this.loadMovies(this.currentPage + 1).then(() => this.updateMoviesGrid());
            }
        };
        
        const scrollContainer = this.container.querySelector('.library-scroll-container');
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', this.scrollListener);
        }
        
        setTimeout(() => {
            if (scrollContainer) {
                const { scrollHeight, clientHeight } = scrollContainer;
                if (scrollHeight <= clientHeight && this.hasMorePages && !this.isLoading) {
                    console.log('[Scroll] Content too short, loading more...');
                    this.loadMovies(this.currentPage + 1).then(() => this.updateMoviesGrid());
                }
            }
        }, 500);
    }

    renderLoading() {
        return `
            <div style="
                height: 100%;
                overflow-y: auto;
                overflow-x: hidden;
                -webkit-overflow-scrolling: touch;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                gap: 1rem;
            ">
                <div style="width:48px;height:48px;border:4px solid rgba(166,192,221,0.3);border-top-color:#A6C0DD;border-radius:50%;animation:spin 1s linear infinite;"></div>
                <p style="color:#A6C0DD;">Loading movie library...</p>
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

    hasActiveFilters() {
        return this.currentFilter !== 'all' ||
               this.currentGenre !== 'all' ||
               this.currentPlatform !== 'all' ||
               this.currentRating !== 'all' ||
               this.currentRuntime !== 'all' ||
               this.hideTriggerWarnings ||
               this.searchQuery !== '';
    }

    resetAllFilters() {
        this.currentFilter = 'all';
        this.currentGenre = 'all';
        this.currentPlatform = 'all';
        this.currentRating = 'all';
        this.currentRuntime = 'all';
        this.hideTriggerWarnings = false;
        this.searchQuery = '';
        
        const searchInput = this.container.querySelector('#search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        
        this.renderContent();
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

        const hasFilters = this.hasActiveFilters();

        this.container.innerHTML = `
            <div class="library-scroll-container" style="
                height: 100%;
                overflow-y: auto;
                overflow-x: hidden;
                -webkit-overflow-scrolling: touch;
                padding: 1.5rem 1rem 6rem;
            ">
                <!-- Search and Filter Controls -->
                <div style="margin-bottom:1.5rem;display:flex;align-items:center;gap:1rem;">
                    <!-- Search Bar -->
                    <input type="text" id="search-input" placeholder="Search movies..." value="${this.searchQuery}" 
                           style="flex:1;padding:1rem;background:rgba(166,192,221,0.1);border:1px solid rgba(166,192,221,0.2);border-radius:1rem;color:#FDFAB0;font-size:1rem;">
                    
                    <!-- Filter Button -->
                    <button id="toggle-filters-btn" style="
                        padding: 0.875rem 1.5rem;
                        background: linear-gradient(135deg, #A6C0DD, #8ba3b8);
                        border: none;
                        border-radius: 0.75rem;
                        color: #18183A;
                        font-size: 0.9375rem;
                        font-weight: 700;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        transition: transform 0.2s, box-shadow 0.2s;
                        box-shadow: 0 4px 12px rgba(166, 192, 221, 0.3);
                        white-space: nowrap;
                    " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 6px 16px rgba(166, 192, 221, 0.4)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 12px rgba(166, 192, 221, 0.3)'">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:20px;height:20px;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                        </svg>
                        Filters ${hasFilters ? `(${this.getActiveFilterCount()})` : ''}
                    </button>
                </div>

                <!-- Movies Grid -->
                <div id="movies-grid">${this.renderMoviesGrid()}</div>

                ${this.hasMorePages ? `
                    <div style="text-align:center;padding:2rem;">
                        ${this.isLoading ? `
                            <div style="width:40px;height:40px;border:3px solid rgba(166,192,221,0.3);border-top-color:#A6C0DD;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto;"></div>
                            <p style="color:#A6C0DD;margin-top:1rem;">Loading more...</p>
                        ` : `
                            <button id="load-more-btn" style="padding:1rem 2rem;background:linear-gradient(135deg,#A6C0DD,#8ba3b8);border:none;border-radius:0.75rem;color:#18183A;font-size:1rem;font-weight:700;cursor:pointer;transition:transform 0.2s;">
                                Load More Movies
                            </button>
                        `}
                    </div>
                ` : `
                    <div style="text-align:center;padding:2rem;">
                        <p style="color:#A6C0DD;">All ${this.allMovies.length.toLocaleString()} movies loaded!</p>
                    </div>
                `}
            </div>

            <!-- Filter Modal/Sidebar -->
            <div id="filter-modal" style="
                position: fixed;
                top: 0;
                right: 0;
                bottom: 0;
                width: 100%;
                max-width: 400px;
                background: linear-gradient(180deg, #18183A 0%, #0f0f26 100%);
                transform: translateX(100%);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 1000;
                overflow-y: auto;
                box-shadow: -4px 0 24px rgba(0, 0, 0, 0.5);
                border-left: 1px solid rgba(166, 192, 221, 0.2);
            ">
                <div style="padding: 1.5rem;">
                    <!-- Header -->
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
                        <h2 style="font-size: 1.5rem; font-weight: 800; color: #FDFAB0; margin: 0;">
                            Filters
                        </h2>
                        <button id="close-filters-btn" style="
                            width: 40px;
                            height: 40px;
                            border-radius: 50%;
                            background: rgba(166, 192, 221, 0.1);
                            border: none;
                            color: #FDFAB0;
                            font-size: 1.5rem;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            transition: background 0.2s;
                        " onmouseover="this.style.background='rgba(166, 192, 221, 0.2)'" onmouseout="this.style.background='rgba(166, 192, 221, 0.1)'">
                            ✕
                        </button>
                    </div>

                    <!-- Reset Button -->
                    ${hasFilters ? `
                        <button id="reset-filters-btn" style="
                            width: 100%;
                            padding: 0.875rem;
                            background: rgba(239, 68, 68, 0.2);
                            border: 1px solid rgba(239, 68, 68, 0.4);
                            border-radius: 0.75rem;
                            color: #ef4444;
                            font-size: 0.875rem;
                            font-weight: 700;
                            cursor: pointer;
                            margin-bottom: 1.5rem;
                            transition: all 0.2s;
                        " onmouseover="this.style.background='rgba(239, 68, 68, 0.3)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.2)'">
                            🔄 Reset All Filters
                        </button>
                    ` : ''}

                    <!-- Your Swipes -->
                    <div style="margin-bottom: 1.5rem;">
                        <h3 style="font-size: 0.875rem; font-weight: 700; color: #A6C0DD; text-transform: uppercase; margin: 0 0 0.75rem 0;">
                            Your Swipes
                        </h3>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                            <button class="filter-btn" data-filter="all" style="${this.getButtonStyle(this.currentFilter==='all','linear-gradient(135deg,#A6C0DD,#8ba3b8)')}">All</button>
                            <button class="filter-btn" data-filter="love" style="${this.getButtonStyle(this.currentFilter==='love','linear-gradient(135deg,#ff006e,#d90062)')}">❤️ Loved (${swipeCounts.loved})</button>
                            <button class="filter-btn" data-filter="like" style="${this.getButtonStyle(this.currentFilter==='like','linear-gradient(135deg,#10b981,#059669)')}">👍 Liked (${swipeCounts.liked})</button>
                            <button class="filter-btn" data-filter="maybe" style="${this.getButtonStyle(this.currentFilter==='maybe','linear-gradient(135deg,#fbbf24,#f59e0b)')}">🤔 Maybe (${swipeCounts.maybe})</button>
                            <button class="filter-btn" data-filter="pass" style="${this.getButtonStyle(this.currentFilter==='pass','linear-gradient(135deg,#ef4444,#dc2626)')}">👎 Passed (${swipeCounts.passed})</button>
                        </div>
                    </div>

                    <!-- Genre -->
                    <div style="margin-bottom: 1.5rem;">
                        <h3 style="font-size: 0.875rem; font-weight: 700; color: #A6C0DD; text-transform: uppercase; margin: 0 0 0.75rem 0;">
                            Genre
                        </h3>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
                            <button class="genre-btn" data-genre="all" style="${this.getButtonStyle(this.currentGenre==='all','linear-gradient(135deg,#A6C0DD,#8ba3b8)')}">All</button>
                            <button class="genre-btn" data-genre="${GENRE_IDS.ACTION}" style="${this.getButtonStyle(this.currentGenre==GENRE_IDS.ACTION,'linear-gradient(135deg,#A6C0DD,#8ba3b8)')}">Action</button>
                            <button class="genre-btn" data-genre="${GENRE_IDS.COMEDY}" style="${this.getButtonStyle(this.currentGenre==GENRE_IDS.COMEDY,'linear-gradient(135deg,#A6C0DD,#8ba3b8)')}">Comedy</button>
                            <button class="genre-btn" data-genre="${GENRE_IDS.DRAMA}" style="${this.getButtonStyle(this.currentGenre==GENRE_IDS.DRAMA,'linear-gradient(135deg,#A6C0DD,#8ba3b8)')}">Drama</button>
                            <button class="genre-btn" data-genre="${GENRE_IDS.HORROR}" style="${this.getButtonStyle(this.currentGenre==GENRE_IDS.HORROR,'linear-gradient(135deg,#A6C0DD,#8ba3b8)')}">Horror</button>
                            <button class="genre-btn" data-genre="${GENRE_IDS.SCIFI}" style="${this.getButtonStyle(this.currentGenre==GENRE_IDS.SCIFI,'linear-gradient(135deg,#A6C0DD,#8ba3b8)')}">Sci-Fi</button>
                            <button class="genre-btn" data-genre="${GENRE_IDS.ROMANCE}" style="${this.getButtonStyle(this.currentGenre==GENRE_IDS.ROMANCE,'linear-gradient(135deg,#A6C0DD,#8ba3b8)')}">Romance</button>
                            <button class="genre-btn" data-genre="${GENRE_IDS.THRILLER}" style="${this.getButtonStyle(this.currentGenre==GENRE_IDS.THRILLER,'linear-gradient(135deg,#A6C0DD,#8ba3b8)')}">Thriller</button>
                        </div>
                    </div>

                    <!-- Platform -->
                    <div style="margin-bottom: 1.5rem;">
                        <h3 style="font-size: 0.875rem; font-weight: 700; color: #A6C0DD; text-transform: uppercase; margin: 0 0 0.75rem 0;">
                            Platform
                        </h3>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
                            <button class="platform-btn" data-platform="all" style="${this.getButtonStyle(this.currentPlatform==='all','linear-gradient(135deg,#FDFAB0,#e8d89a)')}">All</button>
                            <button class="platform-btn" data-platform="Netflix" style="${this.getButtonStyle(this.currentPlatform==='Netflix','linear-gradient(135deg,#FDFAB0,#e8d89a)')}">Netflix</button>
                            <button class="platform-btn" data-platform="Hulu" style="${this.getButtonStyle(this.currentPlatform==='Hulu','linear-gradient(135deg,#FDFAB0,#e8d89a)')}">Hulu</button>
                            <button class="platform-btn" data-platform="Prime Video" style="${this.getButtonStyle(this.currentPlatform==='Prime Video','linear-gradient(135deg,#FDFAB0,#e8d89a)')}">Prime</button>
                            <button class="platform-btn" data-platform="Disney+" style="${this.getButtonStyle(this.currentPlatform==='Disney+','linear-gradient(135deg,#FDFAB0,#e8d89a)')}">Disney+</button>
                            <button class="platform-btn" data-platform="HBO Max" style="${this.getButtonStyle(this.currentPlatform==='HBO Max','linear-gradient(135deg,#FDFAB0,#e8d89a)')}">HBO Max</button>
                        </div>
                    </div>

                    <!-- Runtime -->
                    <div style="margin-bottom: 1.5rem;">
                        <h3 style="font-size: 0.875rem; font-weight: 700; color: #A6C0DD; text-transform: uppercase; margin: 0 0 0.75rem 0;">
                            Runtime
                        </h3>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
                            <button class="runtime-btn" data-runtime="all" style="${this.getButtonStyle(this.currentRuntime==='all','linear-gradient(135deg,#A6C0DD,#8ba3b8)')}">Any</button>
                            <button class="runtime-btn" data-runtime="short" style="${this.getButtonStyle(this.currentRuntime==='short','linear-gradient(135deg,#A6C0DD,#8ba3b8)')}">< 90m</button>
                            <button class="runtime-btn" data-runtime="medium" style="${this.getButtonStyle(this.currentRuntime==='medium','linear-gradient(135deg,#A6C0DD,#8ba3b8)')}">90-120m</button>
                            <button class="runtime-btn" data-runtime="long" style="${this.getButtonStyle(this.currentRuntime==='long','linear-gradient(135deg,#A6C0DD,#8ba3b8)')}">120-150m</button>
                            <button class="runtime-btn" data-runtime="epic" style="${this.getButtonStyle(this.currentRuntime==='epic','linear-gradient(135deg,#A6C0DD,#8ba3b8)')}">150m+</button>
                        </div>
                    </div>

                    <!-- Trigger Warnings Toggle -->
                    <div style="margin-bottom: 1.5rem;">
                        <h3 style="font-size: 0.875rem; font-weight: 700; color: #A6C0DD; text-transform: uppercase; margin: 0 0 0.75rem 0;">
                            Content
                        </h3>
                        <button id="toggle-trigger-filter" style="${this.getButtonStyle(this.hideTriggerWarnings, 'linear-gradient(135deg,#ef4444,#dc2626)')}; width: 100%;">
                            ${this.hideTriggerWarnings ? '⚠️ Hiding Trigger Warnings' : 'Show All Movies'}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Modal Backdrop -->
            <div id="filter-backdrop" style="
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.7);
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s;
                z-index: 999;
            "></div>
        `;

        this.attachListeners();
    }

    getActiveFilterCount() {
        let count = 0;
        if (this.currentFilter !== 'all') count++;
        if (this.currentGenre !== 'all') count++;
        if (this.currentPlatform !== 'all') count++;
        if (this.currentRating !== 'all') count++;
        if (this.currentRuntime !== 'all') count++;
        if (this.hideTriggerWarnings) count++;
        if (this.searchQuery) count++;
        return count;
    }

    toggleFilterModal(open) {
        const modal = this.container.querySelector('#filter-modal');
        const backdrop = this.container.querySelector('#filter-backdrop');
        
        if (!modal || !backdrop) return;
        
        if (open) {
            modal.style.transform = 'translateX(0)';
            backdrop.style.opacity = '1';
            backdrop.style.pointerEvents = 'auto';
            document.body.style.overflow = 'hidden';
            this.filterModalOpen = true;
        } else {
            modal.style.transform = 'translateX(100%)';
            backdrop.style.opacity = '0';
            backdrop.style.pointerEvents = 'none';
            document.body.style.overflow = '';
            this.filterModalOpen = false;
        }
    }

    renderMoviesGrid() {
        let moviesToShow = [...this.allMovies];

        if (this.currentFilter !== 'all') {
            const swiped = store.getState().swipeHistory || [];
            const ids = swiped
                .filter(s => s.action === this.currentFilter)
                .map(s => String(s.movieId || s.movie?.id));
            
            console.log(`[Library] Filtering by swipe action "${this.currentFilter}":`, ids.length, 'movies');
            moviesToShow = moviesToShow.filter(m => ids.includes(String(m.id)));
        }
        
        if (this.currentGenre !== 'all') {
            const genreId = parseInt(this.currentGenre);
            moviesToShow = moviesToShow.filter(m => (m.genre_ids || m.genreIds)?.includes(genreId));
        }
        
        if (this.currentPlatform !== 'all') {
            moviesToShow = moviesToShow.filter(m => {
                if (m.platform === this.currentPlatform) return true;
                if (m.availableOn && m.availableOn.includes(this.currentPlatform)) return true;
                return false;
            });
        }
        
        if (this.currentRating !== 'all') {
            moviesToShow = moviesToShow.filter(m => m.certification === this.currentRating);
        }
        
        if (this.currentRuntime !== 'all') {
            moviesToShow = moviesToShow.filter(m => {
                const runtime = m.runtime || 0;
                switch(this.currentRuntime) {
                    case 'short': return runtime > 0 && runtime < 90;
                    case 'medium': return runtime >= 90 && runtime < 120;
                    case 'long': return runtime >= 120 && runtime < 150;
                    case 'epic': return runtime >= 150;
                    default: return true;
                }
            });
        }
        
        if (this.hideTriggerWarnings) {
            if (tmdbService.filterBlockedMovies) {
                const beforeFilter = moviesToShow.length;
                moviesToShow = tmdbService.filterBlockedMovies(moviesToShow);
                console.log(`[Library] Trigger filter: ${beforeFilter} → ${moviesToShow.length} movies`);
            }
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
                        <p style="color:#A6C0DD;font-size:1rem;">No movies match your filters</p>
                    </div>`;
        }

        return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:0.875rem;">
            ${this.filteredMovies.map(movie => this.renderMovieCard(movie)).join('')}
        </div>`;
    }

    renderMovieCard(movie) {
        const posterUrl = movie.posterURL || movie.poster_path || `https://placehold.co/300x450/18183A/FDFAB0?text=${encodeURIComponent(movie.title)}`;
        const rating = movie.rating || movie.vote_average;
        const year = movie.year || movie.releaseDate?.split('-')[0] || '';
        
        const hasTrailer = movie.trailerKey && movie.trailerKey.trim() !== '';
        const trailerUrl = hasTrailer ? `https://www.youtube.com/watch?v=${movie.trailerKey}` : null;
        
        const triggerBadgeHTML = renderTriggerBadge(movie, { size: 'small', position: 'top-left' });
        
        const platform = (() => {
            if (movie.platform && movie.platform !== 'Not Available') return movie.platform;
            if (movie.availableOn && movie.availableOn.length > 0) return movie.availableOn[0];
            
            const releaseDate = new Date(movie.releaseDate || movie.release_date);
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            
            return releaseDate > sixMonthsAgo ? 'In Cinemas' : 'Not Available';
        })();

        return `
            <div class="library-movie-card" data-movie-id="${movie.id}">
                <div style="
                    position:relative;
                    width:100%;
                    aspect-ratio:2/3;
                    border-radius:0.75rem;
                    overflow:hidden;
                    background:rgba(166,192,221,0.1);
                    box-shadow:0 4px 16px rgba(0,0,0,0.3);
                    transition:transform 0.3s;
                    cursor:pointer;
                ">
                    <img src="${posterUrl}" alt="${movie.title}" style="width:100%;height:100%;object-fit:cover;"
                         onerror="this.src='https://placehold.co/300x450/18183A/FDFAB0?text=${encodeURIComponent(movie.title)}'">
                    
                    ${hasTrailer ? `
                        <button 
                            onclick="event.stopPropagation(); window.open('${trailerUrl}', '_blank')"
                            style="
                                position: absolute;
                                top: 0.5rem;
                                right: 0.5rem;
                                width: 28px;
                                height: 28px;
                                background: rgba(166, 192, 221, 0.95);
                                border: 2px solid #FDFAB0;
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                cursor: pointer;
                                z-index: 10;
                                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                            "
                            title="Watch Trailer"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#18183A">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </button>
                    ` : ''}
                    
                    ${triggerBadgeHTML}
                    
                    ${rating ? `
                        <div style="
                            position:absolute;
                            top:${triggerBadgeHTML ? '2.5rem' : '0.5rem'};
                            right:0.5rem;
                            padding:0.25rem 0.5rem;
                            background:rgba(253,250,176,0.95);
                            border-radius:0.5rem;
                        ">
                            <span style="color:#18183A;font-size:0.7rem;font-weight:700;">${parseFloat(rating).toFixed(1)}</span>
                        </div>
                    ` : ''}
                    
                    <div style="position:absolute;bottom:0;left:0;right:0;padding:0.75rem 0.5rem;background:linear-gradient(0deg,rgba(24,24,58,0.95),transparent);">
                        <h3 style="font-size:0.75rem;font-weight:700;color:#FDFAB0;margin:0;line-height:1.2;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
                            ${movie.title}
                        </h3>
                        <p style="font-size:0.625rem;color:#A6C0DD;margin:0.25rem 0 0 0;">
                            ${year}${movie.runtime ? ` • ${movie.runtime}min` : ''}
                        </p>
                        
                        <div style="
                            display: inline-block;
                            background: rgba(166, 192, 221, 0.2);
                            border: 1px solid rgba(166, 192, 221, 0.3);
                            padding: 2px 5px;
                            border-radius: 3px;
                            font-size: 0.55rem;
                            color: #A6C0DD;
                            font-weight: 600;
                            margin-top: 0.25rem;
                        ">
                            ${platform}
                        </div>
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

        const toggleFiltersBtn = this.container.querySelector('#toggle-filters-btn');
        if (toggleFiltersBtn) {
            toggleFiltersBtn.addEventListener('click', () => this.toggleFilterModal(true));
        }

        const closeFiltersBtn = this.container.querySelector('#close-filters-btn');
        if (closeFiltersBtn) {
            closeFiltersBtn.addEventListener('click', () => this.toggleFilterModal(false));
        }

        const backdrop = this.container.querySelector('#filter-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => this.toggleFilterModal(false));
        }

        const resetFiltersBtn = this.container.querySelector('#reset-filters-btn');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                this.resetAllFilters();
                this.toggleFilterModal(false);
            });
        }

        const loadMoreBtn = this.container.querySelector('#load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', async () => {
                console.log('[Library] Loading 5 pages...');
                const originalText = loadMoreBtn.textContent;
                loadMoreBtn.disabled = true;
                loadMoreBtn.textContent = 'Loading...';
                
                for (let i = 0; i < 5; i++) {
                    await this.loadMovies(this.currentPage + 1);
                }
                
                this.updateMoviesGrid();
                loadMoreBtn.disabled = false;
                loadMoreBtn.textContent = originalText;
            });
        }

        this.container.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentFilter = btn.dataset.filter;
                this.updateMoviesGrid();
                this.toggleFilterModal(false);
            });
        });

        this.container.querySelectorAll('.genre-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentGenre = btn.dataset.genre;
                this.updateMoviesGrid();
                this.toggleFilterModal(false);
            });
        });

        this.container.querySelectorAll('.platform-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentPlatform = btn.dataset.platform;
                this.updateMoviesGrid();
                this.toggleFilterModal(false);
            });
        });

        this.container.querySelectorAll('.runtime-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentRuntime = btn.dataset.runtime;
                this.updateMoviesGrid();
                this.toggleFilterModal(false);
            });
        });

        const triggerToggle = this.container.querySelector('#toggle-trigger-filter');
        if (triggerToggle) {
            triggerToggle.addEventListener('click', () => {
                this.hideTriggerWarnings = !this.hideTriggerWarnings;
                this.updateMoviesGrid();
            });
        }

        this.container.querySelectorAll('.library-movie-card').forEach(card => {
            card.addEventListener('mouseover', () => card.style.transform = 'scale(1.05)');
            card.addEventListener('mouseout', () => card.style.transform = 'scale(1)');
            card.addEventListener('click', () => {
                const movie = this.allMovies.find(m => String(m.id) === card.dataset.movieId);
                if (movie && movieModal) movieModal.show(movie);
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
                await this.enrichWithPlatformData(newMovies);
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
            
            this.container.querySelectorAll('.library-movie-card').forEach(card => {
                card.addEventListener('mouseover', () => card.style.transform = 'scale(1.05)');
                card.addEventListener('mouseout', () => card.style.transform = 'scale(1)');
                card.addEventListener('click', () => {
                    const movie = this.allMovies.find(m => String(m.id) === card.dataset.movieId);
                    if (movie && movieModal) movieModal.show(movie);
                });
            });
        }
        
        const filterBtn = this.container.querySelector('#toggle-filters-btn');
        const hasFilters = this.hasActiveFilters();
        if (filterBtn) {
            const count = this.getActiveFilterCount();
            filterBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:20px;height:20px;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
                Filters ${hasFilters ? `(${count})` : ''}
            `;
        }
    }

    destroy() {
        const scrollContainer = this.container.querySelector('.library-scroll-container');
        if (scrollContainer && this.scrollListener) {
            scrollContainer.removeEventListener('scroll', this.scrollListener);
            this.scrollListener = null;
        }
        
        document.body.style.overflow = '';
    }
}
