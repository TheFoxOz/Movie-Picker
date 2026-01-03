/**
 * MoviEase - Swipe Tab Component
 * ✅ WEEK 2 OPTIMIZED: Memory cleanup, enhanced loading, better error handling
 * ✅ FIXED: Removed duplicate scrolling wrapper
 * ✅ FIXED: Syncs swipe history to Firestore after each swipe
 * ✅ FIXED: Properly filters out already-swiped movies with Number comparison
 * ✅ Shows first card immediately with placeholder data
 * ✅ Enriches platform data in background
 * ✅ Filters out cinema-only movies
 * ✅ COLOR FIX: Powder Blue + Vanilla Custard gradients
 * ✅ MoviEase branding and colors
 * ✅ INFINITE LOADING: Continuously loads movies from Discover API
 * ✅ BADGE TRACKING: Tracks swipes for achievement badges
 * ✅ NEW: Platform update notification for live card updates
 * ✅ OPTIMIZED: Memory cleanup, predictive loading, platform caching
 */

import { store } from "../state/store.js";
import { SwipeCard } from "../components/swipe-card.js";
import { tmdbService } from "../services/tmdb.js";
import { authService } from "../services/auth-service.js";
import { badgeService } from "../services/badge-service.js";
import { notify } from "../utils/notifications.js";
import { celebrate } from "../utils/confetti.js";
import { renderWatchedButton, initWatchedButtons, storeMovieData } from '../utils/watched-button.js';

export class SwipeTab {
    constructor() {
        this.container = null;
        this.currentCard = null;
        this.movieQueue = [];
        this.isLoading = false;
        this.swipeHandler = null;
        this.currentPage = 1;
        this.hasMorePages = true;
        this.isEnriching = false;
        this.hideWatched = this.loadHideWatchedSetting();
        
        // ✅ NEW: Performance tracking
        this.enrichedCount = 0;
        this.platformCache = new Map(); // ✅ Cache platform data
        this.consecutiveErrors = 0;
        this.lastErrorType = null;
    }

    async render(container) {
        console.log('[SwipeTab] Rendering...');
        this.container = container;
        
        window.swipeTab = this;

        container.innerHTML = `
            <div style="width: 100%; padding: 0; position: relative; min-height: calc(100vh - 5rem);">
                
                <!-- Card Container -->
                <div id="swipe-container" style="
                    flex: 1; 
                    position: relative; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    padding: 1rem; 
                    min-height: 500px;
                    max-width: 420px;
                    margin: 0 auto;
                    width: 100%;
                ">
                    ${this.renderSkeletonCard()}
                </div>

                <!-- Action Buttons -->
                <div style="position: fixed; bottom: 7rem; left: 0; right: 0; z-index: 90; padding: 0 1.5rem; pointer-events: none;">
                    <div style="max-width: 420px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 1rem; pointer-events: auto;">
                        <button id="swipe-pass" class="swipe-action-btn pass-btn" title="Pass">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" style="width:28px;height:28px;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        
                        <button id="swipe-maybe" class="swipe-action-btn maybe-btn" title="Maybe Later">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:26px;height:26px;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                            </svg>
                        </button>
                        
                        <button id="swipe-like" class="swipe-action-btn like-btn" title="Like">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:28px;height:28px;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" />
                            </svg>
                        </button>
                        
                        <button id="swipe-love" class="swipe-action-btn love-btn" title="Love">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" style="width:30px;height:30px;">
                                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Completed State -->
                <div id="swipe-completed" style="display: none; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; padding: 2rem; text-align: center; background: rgba(10, 10, 15, 0.95); z-index: 10;">
                    <div style="font-size: 5rem; margin-bottom: 1.5rem;">🎉</div>
                    <h2 style="font-size: 2rem; font-weight: 800; background: linear-gradient(135deg, #b0d4e3, #f4e8c1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0 0 1rem 0;">
                        You Did It!
                    </h2>
                    <p style="font-size: 1.125rem; color: rgba(176, 212, 227, 0.8); margin: 0 0 2rem 0; max-width: 400px;">
                        You've swiped through all available movies. Check your Library to see your picks!
                    </p>
                    <button id="goto-library" style="padding: 1rem 2rem; background: linear-gradient(135deg, #b0d4e3, #f4e8c1); border: none; border-radius: 1rem; color: #1a1f2e; font-size: 1rem; font-weight: 700; cursor: pointer; transition: transform 0.2s; box-shadow: 0 4px 12px rgba(176, 212, 227, 0.3);">
                        View My Library
                    </button>
                </div>
            </div>
        `;

        console.log('[SwipeTab] HTML structure rendered');
        this.injectButtonStyles();
        
        if (this.movieQueue.length === 0) {
            console.log('[SwipeTab] Movie queue empty, loading movies...');
            await this.loadMoviesWithRetry();
        } else {
            console.log('[SwipeTab] Using existing movie queue:', this.movieQueue.length, 'movies');
        }
        
        this.attachListeners();
        this.showNextCard();
        console.log('[SwipeTab] ✅ Render complete');
    }

    // ✅ NEW: Skeleton card for better loading UX
    renderSkeletonCard() {
        return `
            <div class="skeleton-card" style="
                width: 100%;
                max-width: 380px;
                aspect-ratio: 2/3;
                border-radius: 1.5rem;
                background: linear-gradient(135deg, rgba(166, 192, 221, 0.1), rgba(253, 250, 176, 0.05));
                border: 2px solid rgba(166, 192, 221, 0.2);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 1rem;
                animation: skeleton-pulse 1.5s ease-in-out infinite;
            ">
                <div style="font-size: 3rem; opacity: 0.5;">🎬</div>
                <div style="color: rgba(176, 212, 227, 0.6); font-size: 0.875rem;">Loading your movies...</div>
                <div style="width: 120px; height: 4px; background: rgba(166, 192, 221, 0.2); border-radius: 2px; overflow: hidden;">
                    <div style="height: 100%; width: 40%; background: linear-gradient(90deg, #A6C0DD, #FDFAB0); animation: loading-bar 1.5s ease-in-out infinite;"></div>
                </div>
            </div>
            <style>
                @keyframes skeleton-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
                @keyframes loading-bar {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(300%); }
                }
            </style>
        `;
    }

    injectButtonStyles() {
        if (document.getElementById("swipe-btn-style")) return;

        const style = document.createElement("style");
        style.id = "swipe-btn-style";
        style.textContent = `
            .swipe-action-btn {
                width: 64px;
                height: 64px;
                border-radius: 50%;
                border: none;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
                backdrop-filter: blur(12px);
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            }
            
            .pass-btn {
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2));
                border: 3px solid rgba(239, 68, 68, 0.6);
                color: #ef4444;
            }
            
            .maybe-btn {
                background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.2));
                border: 3px solid rgba(251, 191, 36, 0.6);
                color: #fbbf24;
            }
            
            .like-btn {
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2));
                border: 3px solid rgba(16, 185, 129, 0.6);
                color: #10b981;
            }
            
            .love-btn {
                background: linear-gradient(135deg, rgba(255, 46, 99, 0.3), rgba(217, 0, 98, 0.3));
                border: 3px solid rgba(255, 46, 99, 0.6);
                color: #ff2e63;
            }

            .swipe-action-btn:hover {
                transform: scale(1.15);
                box-shadow: 0 12px 32px rgba(0,0,0,0.6);
            }
            
            .pass-btn:hover {
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.3));
                border-color: rgba(239, 68, 68, 0.8);
                box-shadow: 0 12px 32px rgba(239, 68, 68, 0.4);
            }
            
            .maybe-btn:hover {
                background: linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(245, 158, 11, 0.3));
                border-color: rgba(251, 191, 36, 0.8);
                box-shadow: 0 12px 32px rgba(251, 191, 36, 0.4);
            }
            
            .like-btn:hover {
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(5, 150, 105, 0.3));
                border-color: rgba(16, 185, 129, 0.8);
                box-shadow: 0 12px 32px rgba(16, 185, 129, 0.4);
            }
            
            .love-btn:hover {
                background: linear-gradient(135deg, rgba(255, 46, 99, 0.4), rgba(217, 0, 98, 0.4));
                border-color: rgba(255, 46, 99, 0.8);
                box-shadow: 0 12px 32px rgba(255, 46, 99, 0.5);
            }
            
            .swipe-action-btn:active {
                transform: scale(0.95);
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * ✅ OPTIMIZED: Enhanced error handling + retry logic
     */
    async loadMoviesWithRetry(attempt = 1) {
        if (this.isLoading) {
            console.log('[SwipeTab] Already loading movies, skipping...');
            return;
        }
        
        if (!this.hasMorePages && this.currentPage > 20) {
            console.log('[SwipeTab] Reached maximum page limit (20)');
            this.showCompletedState();
            return;
        }
        
        this.isLoading = true;

        try {
            console.log(`[SwipeTab] 🎬 Loading movies (attempt ${attempt}, page ${this.currentPage})...`);
            
            const tmdb = tmdbService;
            
            if (!tmdb) {
                throw new Error("TMDB service not initialized");
            }

            let allMovies = [];
            
            // STRATEGY 1: Recent Releases (2023+)
            if (this.currentPage <= 5) {
                console.log('[SwipeTab] 🎬 Loading recent releases (2023+)...');
                try {
                    const recentResponse = await tmdb.discoverMovies({
                        sortBy: 'primary_release_date.desc',
                        page: this.currentPage,
                        minVotes: 20,
                        primaryReleaseDateGte: '2023-01-01'
                    });
                    if (recentResponse?.movies) {
                        allMovies.push(...recentResponse.movies);
                        console.log(`[SwipeTab] ✅ Added ${recentResponse.movies.length} recent movies`);
                    }
                } catch (err) {
                    console.warn('[SwipeTab] ⚠️ Recent releases failed:', err.message);
                    this.trackError('recent_releases', err);
                }
            }
            
            // STRATEGY 2: Genre Rotation
            const genres = [27, 28, 878, 35, 53, 12, 14, 16];
            const genreId = genres[this.currentPage % genres.length];
            console.log(`[SwipeTab] 🎭 Loading genre ${genreId} movies...`);
            
            try {
                const genreResponse = await tmdb.discoverMovies({
                    sortBy: 'vote_average.desc',
                    page: Math.ceil(this.currentPage / 3),
                    withGenres: genreId.toString(),
                    minVotes: 100
                });
                if (genreResponse?.movies) {
                    allMovies.push(...genreResponse.movies);
                    console.log(`[SwipeTab] ✅ Added ${genreResponse.movies.length} genre movies`);
                }
            } catch (err) {
                console.warn('[SwipeTab] ⚠️ Genre movies failed:', err.message);
                this.trackError('genre', err);
            }
            
            // STRATEGY 3: Personalized Recommendations
            const state = store.getState();
            const swipeHistory = state.swipeHistory || [];
            const swipedMovieIds = new Set();
            swipeHistory.forEach(swipe => {
                if (swipe.movieId) swipedMovieIds.add(Number(swipe.movieId));
                if (swipe.movie?.id) swipedMovieIds.add(Number(swipe.movie.id));
            });
            
            if (swipedMovieIds.size > 80 && this.currentPage % 4 === 0) {
                console.log('[SwipeTab] 🎯 Loading personalized recommendations...');
                const lovedMovies = swipeHistory
                    .filter(s => ['love', 'like'].includes(s.action))
                    .slice(-5)
                    .map(s => s.movieId);
                
                if (lovedMovies.length > 0) {
                    try {
                        const seedId = lovedMovies[Math.floor(Math.random() * lovedMovies.length)];
                        const similar = await tmdb.getSimilarMovies(seedId);
                        if (similar && similar.length > 0) {
                            allMovies.push(...similar);
                            console.log(`[SwipeTab] ✅ Added ${similar.length} similar movies (seed: ${seedId})`);
                        }
                    } catch (err) {
                        console.warn('[SwipeTab] ⚠️ Similar movies failed:', err.message);
                        this.trackError('similar', err);
                    }
                }
            }
            
            // STRATEGY 4: Popular with Sorting Rotation
            const sortMethods = ['popularity.desc', 'vote_count.desc', 'vote_average.desc'];
            const sortBy = sortMethods[this.currentPage % sortMethods.length];
            
            console.log(`[SwipeTab] 📊 Loading popular (${sortBy}, page ${Math.ceil(this.currentPage / 2)})...`);
            try {
                const popularResponse = await tmdb.discoverMovies({
                    sortBy: sortBy,
                    page: Math.ceil(this.currentPage / 2),
                    minVotes: 50
                });
                if (popularResponse?.movies) {
                    allMovies.push(...popularResponse.movies);
                    console.log(`[SwipeTab] ✅ Added ${popularResponse.movies.length} popular movies`);
                }
            } catch (err) {
                console.warn('[SwipeTab] ⚠️ Popular movies failed:', err.message);
                this.trackError('popular', err);
            }
            
            // Deduplicate
            const movieMap = new Map();
            allMovies.forEach(m => {
                if (m?.id) movieMap.set(m.id, m);
            });
            let movies = Array.from(movieMap.values());
            
            console.log(`[SwipeTab] 🔄 Deduplicated: ${allMovies.length} → ${movies.length} unique movies`);
            
            if (movies.length === 0) {
                console.log('[SwipeTab] ⚠️ No movies returned from any source');
                this.currentPage++;
                
                if (this.currentPage > 20) {
                    console.log('[SwipeTab] Reached max page limit');
                    this.hasMorePages = false;
                    this.showCompletedState();
                } else {
                    this.isLoading = false;
                    return this.loadMoviesWithRetry(1);
                }
                this.isLoading = false;
                return;
            }

            console.log(`[SwipeTab] 🔍 Filtering out ${swipedMovieIds.size} already-swiped movies`);

            // Filter out swiped movies
            const moviesBeforeFilter = movies.length;
            movies = movies.filter(movie => {
                if (!movie || !movie.id) return false;
                const isAlreadySwiped = swipedMovieIds.has(Number(movie.id));
                if (isAlreadySwiped) {
                    console.log(`[SwipeTab] ✅ FILTERED OUT already-swiped: "${movie.title}" (${movie.id})`);
                }
                return !isAlreadySwiped;
            });

            console.log(`[SwipeTab] Filtered: ${moviesBeforeFilter} → ${movies.length} movies (removed ${moviesBeforeFilter - movies.length})`);

            storeMovieData(movies);
            
            if (this.hideWatched && movies.length > 0) {
                const beforeWatchedFilter = movies.length;
                movies = this.filterWatchedMovies(movies);
                console.log(`[SwipeTab] Watched filter: ${beforeWatchedFilter} → ${movies.length} movies`);
            }

            // Add to queue
            const newMovies = movies.map(m => ({
                ...m,
                availableOn: [],
                platform: 'Loading...',
                triggerWarnings: [],
                warningsLoaded: false
            }));

            this.movieQueue.push(...newMovies);
            this.currentPage++;

            // ✅ OPTIMIZED: Enrich with caching
            await this.enrichAndFilterMovies(newMovies);

            if (this.currentPage === 2 && !this.currentCard && this.movieQueue.length > 0) {
                this.showNextCard();
            }

            console.log(`[SwipeTab] ✅ Queue now has ${this.movieQueue.length} movies`);
            
            if (movies.length === 0 && this.currentPage <= 20) {
                console.log('[SwipeTab] No unseen movies, loading next page...');
                this.isLoading = false;
                return this.loadMoviesWithRetry(1);
            }

            // ✅ NEW: Reset error count on success
            this.consecutiveErrors = 0;
            this.lastErrorType = null;

        } catch (err) {
            console.error("[SwipeTab] Load failed:", err);
            this.consecutiveErrors++;
            
            // ✅ ENHANCED: Better error handling
            if (attempt <= 3) {
                notify.info(`Loading movies... (attempt ${attempt}/3)`);
                this.isLoading = false;
                setTimeout(() => this.loadMoviesWithRetry(attempt + 1), 1500);
            } else {
                this.showErrorState(err, attempt);
            }
        } finally {
            this.isLoading = false;
        }
    }

    // ✅ NEW: Enhanced error state with retry buttons
    showErrorState(error, attempt) {
        const container = this.container?.querySelector("#swipe-container");
        if (!container) return;

        let errorMessage = 'Unknown error';
        let suggestion = 'Please try again';
        let icon = '⚠️';

        if (error.message?.includes('network') || error.message?.includes('fetch')) {
            errorMessage = 'Network connection issue';
            suggestion = 'Check your internet connection';
            icon = '📡';
        } else if (error.message?.includes('rate limit')) {
            errorMessage = 'Too many requests';
            suggestion = 'Please wait a moment';
            icon = '⏱️';
        } else if (error.message?.includes('TMDB')) {
            errorMessage = 'Movie database unavailable';
            suggestion = 'Service temporarily down';
            icon = '🎬';
        }

        container.innerHTML = `
            <div style="color: rgba(176, 212, 227, 0.8); text-align: center; padding: 2rem; max-width: 380px;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">${icon}</div>
                <h3 style="color: #FDFAB0; margin-bottom: 0.5rem; font-size: 1.25rem;">${errorMessage}</h3>
                <p style="color: rgba(176, 212, 227, 0.6); margin-bottom: 1.5rem; font-size: 0.875rem;">${suggestion}</p>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <button id="retry-load" style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #A6C0DD, #8ba3b8); border: none; border-radius: 0.75rem; color: #18183A; font-weight: 700; cursor: pointer;">Try Again</button>
                    <button onclick="location.reload()" style="padding: 0.75rem 1.5rem; background: rgba(166, 192, 221, 0.2); border: 2px solid #A6C0DD; border-radius: 0.75rem; color: #FDFAB0; font-weight: 600; cursor: pointer;">Reload App</button>
                </div>
                ${this.consecutiveErrors > 2 ? `<p style="color: rgba(239, 68, 68, 0.8); margin-top: 1rem; font-size: 0.75rem;">Multiple errors detected</p>` : ''}
            </div>
        `;

        const retryBtn = container.querySelector('#retry-load');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                container.innerHTML = this.renderSkeletonCard();
                this.loadMoviesWithRetry(1);
            });
        }
    }

    // ✅ NEW: Track error patterns
    trackError(type, error) {
        this.lastErrorType = type;
        console.warn(`[SwipeTab] Error in ${type}:`, error.message);
    }

    async enrichAndFilterMovies(movies) {
        if (this.isEnriching || !movies || movies.length === 0) return;

        this.isEnriching = true;

        try {
            console.log(`[SwipeTab] Enriching ${movies.length} movies with platform data...`);
            
            await this.enrichWithPlatformData(movies);
            
            if (this.currentCard && this.currentCard.movie) {
                const currentMovieId = this.currentCard.movie.id;
                const enrichedMovie = movies.find(m => m.id === currentMovieId);
                if (enrichedMovie && enrichedMovie.platform !== 'Loading...') {
                    this.currentCard.updatePlatform(enrichedMovie.platform, enrichedMovie.availableOn);
                    
                    const platform = enrichedMovie.platform;
                    const shouldFilterCurrent = (platform === 'Coming Soon' || platform === 'Not Available');
                    
                    if (shouldFilterCurrent && this.currentCard) {
                        console.log(`[SwipeTab] ⚠️ Current card filtered: ${platform}`);
                        this.currentCard.destroy();
                        this.currentCard = null;
                    } else if (tmdbService.filterByUserPlatforms) {
                        const filtered = tmdbService.filterByUserPlatforms([enrichedMovie]);
                        if (filtered.length === 0 && this.currentCard) {
                            console.log(`[SwipeTab] ⚠️ Current card not on user platforms`);
                            this.currentCard.destroy();
                            this.currentCard = null;
                        }
                    }
                }
            }
            
            const beforeFilter = this.movieQueue.length;
            const moviesToRemove = new Set();
            movies.forEach(movie => {
                if (movie.platform === 'Coming Soon' || movie.platform === 'Not Available') {
                    moviesToRemove.add(movie.id);
                }
            });
            
            this.movieQueue = this.movieQueue.filter(movie => !moviesToRemove.has(movie.id));
            console.log(`[SwipeTab] Cinema filter: ${beforeFilter} → ${this.movieQueue.length} movies`);
            
            if (tmdbService.filterByUserPlatforms) {
                const beforePlatformFilter = this.movieQueue.length;
                const moviesBeforeFilter = [...this.movieQueue];
                this.movieQueue = tmdbService.filterByUserPlatforms(this.movieQueue);
                console.log(`[SwipeTab] Platform filter: ${beforePlatformFilter} → ${this.movieQueue.length} movies`);
                
                if (this.movieQueue.length === 0) {
                    this.consecutiveEmptyResults = (this.consecutiveEmptyResults || 0) + 1;
                } else {
                    this.consecutiveEmptyResults = 0;
                }
                
                if (this.movieQueue.length === 0 && beforePlatformFilter > 0 && this.consecutiveEmptyResults >= 5) {
                    console.warn('[SwipeTab] ⚠️ Platform filter removed all movies');
                    this.movieQueue = moviesBeforeFilter.filter(movie => {
                        return movie.availableOn && movie.availableOn.length > 0 && 
                               movie.platform !== 'Coming Soon' && movie.platform !== 'Not Available';
                    });
                    console.log(`[SwipeTab] ✅ Fallback: ${this.movieQueue.length} movies`);
                }
            }

            if (tmdbService.filterBlockedMovies) {
                const beforeTriggerFilter = this.movieQueue.length;
                this.movieQueue = tmdbService.filterBlockedMovies(this.movieQueue);
                console.log(`[SwipeTab] Trigger filter: ${beforeTriggerFilter} → ${this.movieQueue.length} movies`);
            }
            
            // ✅ OPTIMIZED: Memory cleanup
            this.cleanupEnrichedMovies();
            
            if (!this.currentCard && this.movieQueue.length > 0) {
                setTimeout(() => this.showNextCard(), 100);
            } else if (!this.currentCard && this.movieQueue.length === 0) {
                setTimeout(() => this.loadMoviesWithRetry(), 100);
            }
            
            this.movieQueue.forEach(movie => {
                if (tmdbService.fetchTriggerWarnings) {
                    tmdbService.fetchTriggerWarnings(movie).catch(() => {});
                }
            });

        } finally {
            this.isEnriching = false;
        }
    }

    // ✅ OPTIMIZED: Platform caching
    async enrichWithPlatformData(movies, options = { maxConcurrent: 5, delay: 50 }) {
        if (!movies || movies.length === 0) return movies;

        const { maxConcurrent, delay } = options;
        
        for (let i = 0; i < movies.length; i += maxConcurrent) {
            const batch = movies.slice(i, i + maxConcurrent);
            
            await Promise.all(
                batch.map(async (movie) => {
                    // ✅ NEW: Check cache
                    if (this.platformCache.has(movie.id)) {
                        const cached = this.platformCache.get(movie.id);
                        movie.availableOn = cached.availableOn;
                        movie.platform = cached.platform;
                        return;
                    }

                    if (tmdbService.getWatchProviders) {
                        movie.availableOn = await tmdbService.getWatchProviders(movie.id);
                        
                        if (movie.availableOn && movie.availableOn.length > 0) {
                            movie.platform = movie.availableOn[0];
                        } else {
                            const year = movie.releaseDate?.split('-')[0];
                            const currentYear = new Date().getFullYear();
                            movie.platform = (year && parseInt(year) > currentYear) ? 'Coming Soon' : 'In Cinemas';
                        }

                        // ✅ NEW: Cache result
                        this.platformCache.set(movie.id, {
                            availableOn: movie.availableOn,
                            platform: movie.platform
                        });
                        this.enrichedCount++;
                    } else {
                        movie.availableOn = [];
                        movie.platform = 'Not Available';
                    }
                })
            );
            
            if (i + maxConcurrent < movies.length) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        console.log(`[SwipeTab] ✅ Platform data: ${movies.length} movies`);
        console.log(`[SwipeTab] 📊 Cache: ${this.platformCache.size} entries, ${this.enrichedCount} enriched`);
        return movies;
    }

    // ✅ NEW: Memory cleanup
    cleanupEnrichedMovies() {
        if (this.platformCache.size > 100) {
            const excess = this.platformCache.size - 100;
            const keys = Array.from(this.platformCache.keys()).slice(0, excess);
            keys.forEach(key => this.platformCache.delete(key));
            console.log(`[SwipeTab] 🧹 Cleaned ${excess} cache entries`);
        }
    }

    showCompletedState() {
        const container = this.container?.querySelector("#swipe-container");
        const completed = this.container?.querySelector("#swipe-completed");
        
        if (!container || !completed) return;
        
        console.log('[SwipeTab] Showing completed state');
        container.innerHTML = "";
        completed.style.display = "flex";
        celebrate.center();
    }

    showNextCard() {
        const container = this.container?.querySelector("#swipe-container");
        const completed = this.container?.querySelector("#swipe-completed");

        if (!container) return;

        // ✅ OPTIMIZED: Load at 15 (not 10)
        if (this.movieQueue.length < 15 && this.hasMorePages && !this.isLoading) {
            console.log('[SwipeTab] Queue low (< 15), loading more...');
            this.loadMoviesWithRetry();
        }

        if (this.movieQueue.length === 0) {
            console.log('[SwipeTab] No more movies');
            container.innerHTML = "";
            if (completed) completed.style.display = "flex";
            celebrate.center();
            return;
        }

        if (completed) completed.style.display = "none";

        const movie = this.movieQueue.shift();
        console.log('[SwipeTab] Showing movie:', movie.title);
        
        container.innerHTML = "";
        this.currentCard = new SwipeCard(container, movie);
        setTimeout(() => initWatchedButtons(), 100);
    }

    attachListeners() {
        const ACTION_MAP = {
            "swipe-pass": "pass",
            "swipe-maybe": "maybe",
            "swipe-like": "like",
            "swipe-love": "love"
        };

        Object.entries(ACTION_MAP).forEach(([id, action]) => {
            const btn = this.container?.querySelector(`#${id}`);
            if (btn) btn.addEventListener("click", () => this.handleButtonAction(action));
        });

        this.swipeHandler = () => {
            this.syncSwipeHistory();
            setTimeout(() => this.showNextCard(), 400);
        };
        document.addEventListener("swipe-action", this.swipeHandler);

        const gotoLibrary = this.container?.querySelector("#goto-library");
        if (gotoLibrary) {
            gotoLibrary.addEventListener("click", () => {
                document.dispatchEvent(new CustomEvent("navigate-tab", { detail: { tab: "library" } }));
            });
        }
    }

    async syncSwipeHistory() {
        try {
            const state = store.getState();
            const swipeHistory = state.swipeHistory || [];
            if (swipeHistory.length === 0) return;

            await authService.syncSwipeHistory(swipeHistory);
            await this.trackBadgeProgress();
        } catch (error) {
            console.error('[SwipeTab] Sync failed:', error);
        }
    }

    async trackBadgeProgress() {
        try {
            const user = authService.getCurrentUser();
            if (!user) return;
            
            const state = store.getState();
            const lastSwipe = state.swipeHistory?.[state.swipeHistory.length - 1];
            if (!lastSwipe) return;
            
            const newBadges = await badgeService.checkBadges(user.uid, {
                type: 'swipe',
                action: lastSwipe.action,
                genres: lastSwipe.movie?.genres || []
            });
            
            if (newBadges.length > 0) {
                console.log('[SwipeTab] 🏆 Badges:', newBadges.map(b => b.name));
            }
        } catch (error) {
            console.error('[SwipeTab] Badge tracking failed:', error);
        }
    }

    filterWatchedMovies(movies) {
        if (!this.hideWatched || !authService?.getWatchedMovies) return movies;
        
        const watchedIds = new Set(authService.getWatchedMovies().map(w => w.movieId));
        return movies.filter(m => !watchedIds.has(m.id));
    }

    loadHideWatchedSetting() {
        try {
            return localStorage.getItem('hideWatchedMovies') === 'true';
        } catch {
            return false;
        }
    }

    saveHideWatchedSetting(value) {
        try {
            localStorage.setItem('hideWatchedMovies', value.toString());
        } catch (error) {
            console.error('[SwipeTab] Save setting failed:', error);
        }
    }

    toggleHideWatched() {
        this.hideWatched = !this.hideWatched;
        this.saveHideWatchedSetting(this.hideWatched);
        this.movieQueue = [];
        this.currentPage = 1;
        this.loadMoviesWithRetry();
    }

    handleButtonAction(action) {
        if (this.currentCard) this.currentCard.handleAction(action);
    }

    destroy() {
        console.log('[SwipeTab] Destroying...');
        
        this.syncSwipeHistory();
        
        if (this.currentCard) {
            this.currentCard.destroy();
            this.currentCard = null;
        }
        
        if (this.swipeHandler) {
            document.removeEventListener("swipe-action", this.swipeHandler);
            this.swipeHandler = null;
        }
        
        // ✅ NEW: Cleanup
        this.cleanupEnrichedMovies();
        console.log(`[SwipeTab] 📊 Cache ${this.platformCache.size} entries, ${this.enrichedCount} enriched`);
        console.log('[SwipeTab] Destroyed');
    }
}
