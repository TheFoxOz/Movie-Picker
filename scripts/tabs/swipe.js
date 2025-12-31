/**
 * MoviEase - Swipe Tab Component
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
        this.hideWatched = this.loadHideWatchedSetting();  // ✅ NEW: Watched feature
    }

    async render(container) {
        console.log('[SwipeTab] Rendering...');
        this.container = container;
        
        // ✅ NEW: Expose instance globally for toggle button
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
                    <div style="color: rgba(176, 212, 227, 0.6); text-align: center;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">🎬</div>
                        <p>Loading your movies...</p>
                    </div>
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
     * ✅ OPTIMIZED: Hybrid loading strategy combining:
     * 1. Recent releases (2023-2025) - highest priority
     * 2. Genre rotation for variety
     * 3. Personalized recommendations (after 80 swipes)
     * 4. Multiple sorting methods
     * 5. Deep pagination (20+ pages)
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
            
            // ═══════════════════════════════════════════════════════
            // STRATEGY 1: Recent Releases (2023+) - HIGHEST PRIORITY
            // ═══════════════════════════════════════════════════════
            if (this.currentPage <= 5) {
                console.log('[SwipeTab] 🎬 Loading recent releases (2023+)...');
                try {
                    const recentResponse = await tmdb.discoverMovies({
                        sortBy: 'primary_release_date.desc',
                        page: this.currentPage,
                        minVotes: 20,  // Lower threshold for newer movies
                        primaryReleaseDateGte: '2023-01-01'
                    });
                    if (recentResponse?.movies) {
                        allMovies.push(...recentResponse.movies);
                        console.log(`[SwipeTab] ✅ Added ${recentResponse.movies.length} recent movies`);
                    }
                } catch (err) {
                    console.warn('[SwipeTab] ⚠️ Recent releases failed:', err.message);
                }
            }
            
            // ═══════════════════════════════════════════════════════
            // STRATEGY 2: Genre Rotation for Variety
            // ═══════════════════════════════════════════════════════
            const genres = [27, 28, 878, 35, 53, 12, 14, 16]; // Horror, Action, Sci-Fi, Comedy, Thriller, Adventure, Fantasy, Animation
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
            }
            
            // ═══════════════════════════════════════════════════════
            // STRATEGY 3: Personalized Recommendations (after 80 swipes)
            // ═══════════════════════════════════════════════════════
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
                    }
                }
            }
            
            // ═══════════════════════════════════════════════════════
            // STRATEGY 4: Popular with Sorting Rotation (fallback)
            // ═══════════════════════════════════════════════════════
            const sortMethods = ['popularity.desc', 'vote_count.desc', 'vote_average.desc'];
            const sortBy = sortMethods[this.currentPage % sortMethods.length];
            
            console.log(`[SwipeTab] 📊 Loading popular (${sortBy}, page ${Math.ceil(this.currentPage / 2)})...`);
            try {
                const popularResponse = await tmdb.discoverMovies({
                    sortBy: sortBy,
                    page: Math.ceil(this.currentPage / 2),
                    minVotes: 50  // Lower for more variety
                });
                if (popularResponse?.movies) {
                    allMovies.push(...popularResponse.movies);
                    console.log(`[SwipeTab] ✅ Added ${popularResponse.movies.length} popular movies`);
                }
            } catch (err) {
                console.warn('[SwipeTab] ⚠️ Popular movies failed:', err.message);
            }
            
            // ═══════════════════════════════════════════════════════
            // Deduplicate Movies
            // ═══════════════════════════════════════════════════════
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

            // ✅ Store movie data for watched button
            storeMovieData(movies);
            
            // ✅ Filter watched movies if enabled
            if (this.hideWatched && movies.length > 0) {
                const beforeWatchedFilter = movies.length;
                movies = this.filterWatchedMovies(movies);
                console.log(`[SwipeTab] Watched filter: ${beforeWatchedFilter} → ${movies.length} movies`);
            }

            // Add to queue with placeholder data
            const newMovies = movies.map(m => ({
                ...m,
                availableOn: [],
                platform: 'Loading...',
                triggerWarnings: [],
                warningsLoaded: false
            }));

            this.movieQueue.push(...newMovies);
            this.currentPage++;

            // ✅ Enrich platform data before showing cards
            await this.enrichAndFilterMovies(newMovies);

            // Show first card if none shown yet (AFTER enrichment)
            if (this.currentPage === 2 && !this.currentCard && this.movieQueue.length > 0) {
                this.showNextCard();
            }

            console.log(`[SwipeTab] ✅ Queue now has ${this.movieQueue.length} movies`);
            
            // If we got 0 unseen movies, try next page
            if (movies.length === 0 && this.currentPage <= 20) {
                console.log('[SwipeTab] No unseen movies, loading next page...');
                this.isLoading = false;
                return this.loadMoviesWithRetry(1);
            }

        } catch (err) {
            console.error("[SwipeTab] Load failed:", err);
            
            if (attempt <= 3) {
                notify.info(`Loading movies... (attempt ${attempt}/3)`);
                this.isLoading = false;
                setTimeout(() => this.loadMoviesWithRetry(attempt + 1), 1500);
            } else {
                notify.error("Failed to load movies. Please refresh the page.");
                
                const container = this.container?.querySelector("#swipe-container");
                if (container) {
                    container.innerHTML = `
                        <div style="color: rgba(176, 212, 227, 0.8); text-align: center; padding: 2rem;">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                            <h3 style="color: white; margin-bottom: 1rem;">Unable to Load Movies</h3>
                            <p style="color: rgba(176, 212, 227, 0.6); margin-bottom: 1.5rem;">
                                ${err.message || 'Unknown error'}
                            </p>
                            <button onclick="location.reload()" style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #b0d4e3, #f4e8c1); border: none; border-radius: 0.75rem; color: #1a1f2e; font-weight: 700; cursor: pointer;">
                                Reload App
                            </button>
                        </div>
                    `;
                }
            }
        } finally {
            this.isLoading = false;
        }
    }

    async enrichAndFilterMovies(movies) {
        if (this.isEnriching || !movies || movies.length === 0) {
            return;
        }

        this.isEnriching = true;

        try {
            console.log(`[SwipeTab] Enriching ${movies.length} movies with platform data...`);
            
            // Enrich platform data
            await this.enrichWithPlatformData(movies);
            
            // ✅ NEW: Notify current card to update platform display
            if (this.currentCard && this.currentCard.movie) {
                const currentMovieId = this.currentCard.movie.id;
                const enrichedMovie = movies.find(m => m.id === currentMovieId);
                if (enrichedMovie && enrichedMovie.platform !== 'Loading...') {
                    this.currentCard.updatePlatform(enrichedMovie.platform, enrichedMovie.availableOn);
                    
                    // ✅ UPDATED: Check if current card should be filtered (but keep "In Cinemas")
                    const platform = enrichedMovie.platform;
                    const shouldFilterCurrent = (platform === 'Coming Soon' || platform === 'Not Available');
                    
                    if (shouldFilterCurrent) {
                        console.log(`[SwipeTab] ⚠️ Current card "${enrichedMovie.title}" is ${platform}, will be filtered`);
                        // Just destroy the card - filtering will handle removal from queue
                        if (this.currentCard) {
                            this.currentCard.destroy();
                            this.currentCard = null;
                        }
                        // Don't call showNextCard() yet - let filtering complete first
                    } else if (tmdbService.filterByUserPlatforms) {
                        // ✅ UPDATED: "In Cinemas" now checked in filterByUserPlatforms
                        // Check if current movie matches user platforms
                        const testArray = [enrichedMovie];
                        const filtered = tmdbService.filterByUserPlatforms(testArray);
                        
                        if (filtered.length === 0) {
                            console.log(`[SwipeTab] ⚠️ Current card "${enrichedMovie.title}" not on user platforms, will be filtered`);
                            // Just destroy the card - filtering will handle removal from queue
                            if (this.currentCard) {
                                this.currentCard.destroy();
                                this.currentCard = null;
                            }
                            // Don't call showNextCard() yet - let filtering complete first
                        }
                    }
                }
            }
            
            // ✅ UPDATED: Allow "In Cinemas" movies - only filter Coming Soon/Not Available
            const beforeFilter = this.movieQueue.length;
            
            // Create a set of movie IDs that should be removed (Coming Soon/Not Available ONLY)
            const moviesToRemove = new Set();
            movies.forEach(movie => {
                const platform = movie.platform;
                // ✅ CHANGED: Keep "In Cinemas", only remove "Coming Soon" and "Not Available"
                if (platform === 'Coming Soon' || platform === 'Not Available') {
                    moviesToRemove.add(movie.id);
                    console.log(`[SwipeTab] Filtering out: "${movie.title}" (${platform})`);
                }
            });
            
            // Remove only the movies that are Coming Soon or Not Available
            this.movieQueue = this.movieQueue.filter(movie => !moviesToRemove.has(movie.id));
            console.log(`[SwipeTab] Cinema filter: ${beforeFilter} → ${this.movieQueue.length} movies (kept "In Cinemas")`);
            
            // Apply user platform filter
            if (tmdbService.filterByUserPlatforms) {
                const beforePlatformFilter = this.movieQueue.length;
                const moviesBeforeFilter = [...this.movieQueue];  // ✅ FIX: Store reference
                this.movieQueue = tmdbService.filterByUserPlatforms(this.movieQueue);
                console.log(`[SwipeTab] Platform filter: ${beforePlatformFilter} → ${this.movieQueue.length} movies`);
                
                // ✅ UPDATED: Only use fallback if we've tried multiple pages and found NOTHING
                // Track consecutive empty results
                if (this.movieQueue.length === 0) {
                    this.consecutiveEmptyResults = (this.consecutiveEmptyResults || 0) + 1;
                } else {
                    this.consecutiveEmptyResults = 0;
                }
                
                // ✅ FALLBACK: Only after 5+ pages with zero matches
                // This prevents showing wrong platforms while still helping users in rare edge cases
                if (this.movieQueue.length === 0 && beforePlatformFilter > 0 && this.consecutiveEmptyResults >= 5) {
                    console.warn('[SwipeTab] ⚠️ Platform filter removed all movies across 5+ pages - TMDB region data may be incomplete');
                    console.warn('[SwipeTab] Showing movies anyway (they have platforms, just not your selected ones)');
                    
                    // ✅ Restore movies with streaming platforms ONLY (respect user's In Cinemas choice)
                    this.movieQueue = moviesBeforeFilter.filter(movie => {
                        const platform = movie.platform;
                        
                        // Keep movies with streaming platforms
                        if (movie.availableOn && movie.availableOn.length > 0) {
                            return true;
                        }
                        
                        // Exclude Coming Soon/Not Available/Loading/In Cinemas (unless user enabled it)
                        if (platform === 'Coming Soon' || platform === 'Not Available' || platform === 'Loading...' || platform === 'In Cinemas') {
                            return false;
                        }
                        
                        return true;
                    });
                    
                    console.log(`[SwipeTab] ✅ Fallback: Showing ${this.movieQueue.length} movies with streaming platforms`);
                }
            }

            // Apply trigger warnings filter
            if (tmdbService.filterBlockedMovies) {
                const beforeTriggerFilter = this.movieQueue.length;
                this.movieQueue = tmdbService.filterBlockedMovies(this.movieQueue);
                console.log(`[SwipeTab] Trigger filter: ${beforeTriggerFilter} → ${this.movieQueue.length} movies`);
            }
            
            // ✅ NEW: If current card was removed during filtering, show next card
            if (!this.currentCard && this.movieQueue.length > 0) {
                console.log(`[SwipeTab] Current card was filtered out, showing next card`);
                setTimeout(() => this.showNextCard(), 100);
            } else if (!this.currentCard && this.movieQueue.length === 0) {
                console.log(`[SwipeTab] Queue empty after filtering, loading more movies...`);
                // Queue is empty, trigger loading more movies
                setTimeout(() => this.loadMoviesWithRetry(), 100);
            }
            
            // Fetch trigger warnings in background
            this.movieQueue.forEach(movie => {
                if (tmdbService.fetchTriggerWarnings) {
                    tmdbService.fetchTriggerWarnings(movie).catch(() => {});
                }
            });

        } finally {
            this.isEnriching = false;
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
                        
                        if (movie.availableOn && movie.availableOn.length > 0) {
                            movie.platform = movie.availableOn[0];
                        } else {
                            const year = movie.releaseDate?.split('-')[0] || movie.year;
                            const currentYear = new Date().getFullYear();
                            
                            if (year && parseInt(year) > currentYear) {
                                movie.platform = 'Coming Soon';
                            } else {
                                movie.platform = 'In Cinemas';
                            }
                        }
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
        
        console.log(`[SwipeTab] ✅ Platform data fetched for ${movies.length} movies`);
        return movies;
    }

    showCompletedState() {
        const container = this.container?.querySelector("#swipe-container");
        const completed = this.container?.querySelector("#swipe-completed");
        
        if (!container || !completed) {
            console.warn('[SwipeTab] Completed state elements not found');
            return;
        }
        
        console.log('[SwipeTab] Showing completed state');
        container.innerHTML = "";
        completed.style.display = "flex";
        celebrate.center();
    }

    showNextCard() {
        const container = this.container?.querySelector("#swipe-container");
        const completed = this.container?.querySelector("#swipe-completed");

        if (!container) {
            console.warn('[SwipeTab] Container not found');
            return;
        }

        // ✅ NEW: Load more movies when queue is running low
        if (this.movieQueue.length < 10 && this.hasMorePages && !this.isLoading) {
            console.log('[SwipeTab] Queue running low, loading more movies...');
            this.loadMoviesWithRetry();
        }

        if (this.movieQueue.length === 0) {
            console.log('[SwipeTab] No more movies - showing completed state');
            container.innerHTML = "";
            if (completed) {
                completed.style.display = "flex";
            }
            celebrate.center();
            return;
        }

        if (completed) {
            completed.style.display = "none";
        }

        const movie = this.movieQueue.shift();
        console.log('[SwipeTab] Showing movie:', movie.title);
        
        container.innerHTML = "";
        this.currentCard = new SwipeCard(container, movie);
        
        // ✅ NEW: Initialize watched buttons after card is created
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
            if (btn) {
                btn.addEventListener("click", () => this.handleButtonAction(action));
            }
        });

        this.swipeHandler = () => {
            console.log('[SwipeTab] Swipe action detected, syncing to Firestore...');
            
            // ✅ CRITICAL FIX: Sync to Firestore after every swipe
            this.syncSwipeHistory();
            
            setTimeout(() => this.showNextCard(), 400);
        };
        document.addEventListener("swipe-action", this.swipeHandler);

        const gotoLibrary = this.container?.querySelector("#goto-library");
        if (gotoLibrary) {
            gotoLibrary.addEventListener("click", () => {
                console.log('[SwipeTab] Navigating to library');
                document.dispatchEvent(new CustomEvent("navigate-tab", { 
                    detail: { tab: "library" } 
                }));
            });
        }
    }

    // ✅ UPDATED: Sync swipe history AND track badge progress
    async syncSwipeHistory() {
        try {
            const state = store.getState();
            const swipeHistory = state.swipeHistory || [];
            
            if (swipeHistory.length === 0) {
                console.log('[SwipeTab] No swipe history to sync');
                return;
            }

            console.log(`[SwipeTab] Syncing ${swipeHistory.length} swipes to Firestore...`);
            await authService.syncSwipeHistory(swipeHistory);
            console.log('[SwipeTab] ✅ Swipe history synced to Firestore');
            
            // ✅ NEW: Track badge progress
            await this.trackBadgeProgress();
        } catch (error) {
            console.error('[SwipeTab] Failed to sync swipe history:', error);
        }
    }

    // ✅ NEW METHOD: Track badge progress after swipe
    async trackBadgeProgress() {
        try {
            const user = authService.getCurrentUser();
            if (!user) return;
            
            const state = store.getState();
            const swipeHistory = state.swipeHistory || [];
            const lastSwipe = swipeHistory[swipeHistory.length - 1];
            
            if (!lastSwipe) return;
            
            // Get movie object
            const movie = lastSwipe.movie || {};
            const genres = movie.genres || movie.genre_ids || [];
            
            // Track swipe for badges
            const newBadges = await badgeService.checkBadges(user.uid, {
                type: 'swipe',
                action: lastSwipe.action,
                genres: genres
            });
            
            if (newBadges.length > 0) {
                console.log('[SwipeTab] 🏆 Unlocked badges:', newBadges.map(b => b.name));
            }
        } catch (error) {
            console.error('[SwipeTab] Error tracking badge progress:', error);
        }
    }

    // ========================================================================
    // ✅ NEW: WATCHED MOVIES FEATURE METHODS
    // ========================================================================

    /**
     * Filter out watched movies from queue
     */
    filterWatchedMovies(movies) {
        if (!this.hideWatched || !authService || !authService.getWatchedMovies) {
            return movies;
        }
        
        const watchedIds = new Set(
            authService.getWatchedMovies().map(w => w.movieId)
        );
        
        const filtered = movies.filter(m => !watchedIds.has(m.id));
        console.log(`[SwipeTab] Watched filter: ${movies.length} → ${filtered.length} movies`);
        
        return filtered;
    }

    /**
     * Load hide watched setting from localStorage
     */
    loadHideWatchedSetting() {
        try {
            const saved = localStorage.getItem('hideWatchedMovies');
            return saved === 'true';
        } catch (error) {
            return false;
        }
    }

    /**
     * Save hide watched setting to localStorage
     */
    saveHideWatchedSetting(value) {
        try {
            localStorage.setItem('hideWatchedMovies', value.toString());
        } catch (error) {
            console.error('[SwipeTab] Error saving hideWatched setting:', error);
        }
    }

    /**
     * Toggle hide watched setting
     */
    toggleHideWatched() {
        this.hideWatched = !this.hideWatched;
        this.saveHideWatchedSetting(this.hideWatched);
        console.log('[SwipeTab] Hide watched:', this.hideWatched);
        
        // Reload movies with new filter
        this.movieQueue = [];
        this.currentIndex = 0;
        this.currentPage = 1;
        this.loadMoviesWithRetry();
    }

    // ========================================================================
    // END: WATCHED MOVIES FEATURE
    // ========================================================================


    handleButtonAction(action) {
        console.log('[SwipeTab] Button action:', action);
        if (this.currentCard) {
            this.currentCard.handleAction(action);
        }
    }

    destroy() {
        console.log('[SwipeTab] Destroying...');
        
        // ✅ Sync one final time before destroying
        this.syncSwipeHistory();
        
        if (this.currentCard) {
            this.currentCard.destroy();
            this.currentCard = null;
        }
        
        if (this.swipeHandler) {
            document.removeEventListener("swipe-action", this.swipeHandler);
            this.swipeHandler = null;
        }
        
        console.log('[SwipeTab] Destroyed');
    }
}
