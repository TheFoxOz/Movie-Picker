/**
 * TMDB Service - Movie Database API Integration
 * ✅ FIXED: Removed duplicate platform logic
 * ✅ FIXED: Proper platform detection from multiple sources
 * ✅ FIXED: Updated color references to new palette
 */

import { doesTheDogDieService } from './does-the-dog-die.js';
import { userProfileService } from './user-profile-revised.js';
import { store } from '../state/store.js';

class TMDBService {
    constructor() {
        this.apiKey = null;
        this.baseURL = 'https://api.themoviedb.org/3';
        this.imageBaseURL = 'https://image.tmdb.org/t/p';
        this.cache = {
            movies: new Map(),
            genres: new Map(),
            triggerWarnings: new Map(),
            watchProviders: new Map()
        };
        this.genreList = [];
        this.isInitialized = false;
    }

    async initialize(apiKey) {
        if (!apiKey) {
            console.error('[TMDB] ❌ No API key provided');
            return false;
        }

        this.apiKey = apiKey;
        
        try {
            await this.loadGenres();
            this.isInitialized = true;
            console.log('[TMDB] ✅ Service initialized');
            return true;
        } catch (error) {
            console.error('[TMDB] ❌ Initialization failed:', error);
            return false;
        }
    }

    async loadGenres() {
        try {
            const response = await fetch(
                `${this.baseURL}/genre/movie/list?api_key=${this.apiKey}`
            );
            const data = await response.json();
            
            this.genreList = data.genres || [];
            this.genreList.forEach(genre => {
                this.cache.genres.set(genre.id, genre.name);
            });
            
            console.log('[TMDB] ✅ Loaded genres:', this.genreList.length);
        } catch (error) {
            console.error('[TMDB] ❌ Failed to load genres:', error);
            throw error;
        }
    }

    getGenreNames(genreIds) {
        if (!genreIds || !Array.isArray(genreIds)) return [];
        return genreIds
            .map(id => this.cache.genres.get(id))
            .filter(Boolean);
    }

    getImageURL(path, size = 'w500') {
        if (!path) return null;
        return `${this.imageBaseURL}/${size}${path}`;
    }

    // ✅ FIX: Fetch watch providers (streaming platforms) for a movie
    async getWatchProviders(movieId) {
        if (!movieId) {
            console.warn('[TMDB] No movie ID provided for watch providers');
            return [];
        }

        // Check cache first
        if (this.cache.watchProviders.has(movieId)) {
            return this.cache.watchProviders.get(movieId);
        }

        try {
            const userProfile = userProfileService?.getProfile();
            const region = userProfile?.region || 'US';

            const response = await fetch(
                `${this.baseURL}/movie/${movieId}/watch/providers?api_key=${this.apiKey}`
            );
            
            if (!response.ok) {
                console.warn(`[TMDB] Watch providers API error: ${response.status}`);
                this.cache.watchProviders.set(movieId, []);
                return [];
            }

            const data = await response.json();
            const providers = data.results?.[region];
            
            if (!providers) {
                this.cache.watchProviders.set(movieId, []);
                return [];
            }

            // Combine all provider types (streaming, rent, buy)
            const allProviders = [
                ...(providers.flatrate || []),
                ...(providers.rent || []),
                ...(providers.buy || [])
            ];

            // Map TMDB provider IDs to our platform names
            const providerMap = {
                8: 'Netflix',
                15: 'Hulu',
                9: 'Prime Video',
                337: 'Disney+',
                384: 'HBO Max',
                350: 'Apple TV+',
                387: 'Peacock',
                386: 'Paramount+',
                2: 'Apple TV',
                3: 'Google Play Movies',
                10: 'Amazon Video'
            };

            const platformNames = allProviders
                .map(p => providerMap[p.provider_id])
                .filter(Boolean);

            // Remove duplicates
            const uniquePlatforms = [...new Set(platformNames)];
            
            if (uniquePlatforms.length > 0) {
                console.log(`[TMDB] ✅ Found ${uniquePlatforms.length} platforms for movie ${movieId}`);
            }
            
            // Cache the result
            this.cache.watchProviders.set(movieId, uniquePlatforms);
            
            return uniquePlatforms;

        } catch (error) {
            console.error('[TMDB] ❌ Failed to fetch watch providers:', error);
            this.cache.watchProviders.set(movieId, []);
            return [];
        }
    }

    // ✅ FIX: Robust platform filtering with multiple source checks
    filterByUserPlatforms(movies) {
        if (!movies || movies.length === 0) {
            return [];
        }

        let selectedPlatforms = [];
        
        // Strategy 1: Try userProfileService
        try {
            const userProfile = userProfileService?.getProfile();
            if (userProfile) {
                selectedPlatforms = userProfile.streamingPlatforms || 
                                   userProfile.selectedPlatforms || 
                                   [];
            }
        } catch (error) {
            console.warn('[TMDB] UserProfileService not available:', error);
        }
        
        // Strategy 2: Try store.getState()
        if (!selectedPlatforms || selected

Platforms.length === 0) {
            try {
                const state = store.getState();
                const prefs = state.preferences || {};
                
                selectedPlatforms = prefs.streamingPlatforms || 
                                   prefs.selectedPlatforms || 
                                   [];
                
                // Strategy 3: Check if platforms is an object {Netflix: true, Hulu: false}
                if (!Array.isArray(selectedPlatforms) && typeof prefs.platforms === 'object') {
                    selectedPlatforms = Object.keys(prefs.platforms).filter(p => prefs.platforms[p]);
                }
            } catch (error) {
                console.warn('[TMDB] Store not available:', error);
            }
        }
        
        // Strategy 4: Try localStorage directly
        if (!selectedPlatforms || selectedPlatforms.length === 0) {
            try {
                const prefs = JSON.parse(localStorage.getItem('moviePickerPreferences') || '{}');
                
                selectedPlatforms = prefs.streamingPlatforms || 
                                   prefs.selectedPlatforms || 
                                   [];
                
                // Check object format
                if (!Array.isArray(selectedPlatforms) && typeof prefs.platforms === 'object') {
                    selectedPlatforms = Object.keys(prefs.platforms).filter(p => prefs.platforms[p]);
                }
            } catch (error) {
                console.warn('[TMDB] LocalStorage not available:', error);
            }
        }
        
        // If no platforms selected, show ALL movies (don't filter)
        if (!selectedPlatforms || selectedPlatforms.length === 0) {
            console.log('[TMDB] No platform filtering (no platforms selected) - showing all movies');
            return movies;
        }

        console.log('[TMDB] Filtering by platforms:', selectedPlatforms);

        const filtered = movies.filter(movie => {
            // If movie doesn't have platform data yet, include it (will be filtered later)
            if (!movie.availableOn || movie.availableOn.length === 0) {
                return true;
            }
            
            // Check if movie is available on at least one user platform
            const isAvailable = movie.availableOn.some(platform => 
                selectedPlatforms.includes(platform)
            );
            
            return isAvailable;
        });

        console.log(`[TMDB] Platform filtering: ${movies.length} → ${filtered.length} movies`);
        return filtered;
    }

    // ✅ FIX: Check if movie should be blocked based on trigger warnings
    isMovieBlocked(movie) {
        if (!movie || !movie.triggerWarnings) {
            return false; // No warnings, not blocked
        }

        const userProfile = userProfileService?.getProfile();
        const enabledCategories = userProfile?.triggerWarnings?.enabledCategories || [];
        
        // If no categories enabled, don't block anything
        if (enabledCategories.length === 0) {
            return false;
        }

        // Check if movie has any warnings in enabled (blocked) categories
        const hasBlockedWarning = movie.triggerWarnings.some(warning => {
            // Warning might be a string (category name) or object with category property
            const category = typeof warning === 'string' ? warning : warning.category;
            return enabledCategories.includes(category);
        });

        if (hasBlockedWarning) {
            console.log(`[TMDB] ⚠️ Movie "${movie.title}" blocked due to trigger warnings`);
        }

        return hasBlockedWarning;
    }

    // ✅ FIX: Filter out movies with blocked trigger warnings
    filterBlockedMovies(movies) {
        if (!movies || movies.length === 0) {
            return [];
        }

        const filtered = movies.filter(movie => !this.isMovieBlocked(movie));
        
        if (filtered.length < movies.length) {
            console.log(`[TMDB] Trigger filtering: ${movies.length} → ${filtered.length} movies`);
        }
        
        return filtered;
    }

    // ✅ FIX: Apply ALL filters (platform + triggers)
    applyUserFilters(movies) {
        if (!movies || movies.length === 0) {
            return [];
        }

        console.log(`[TMDB] Applying filters to ${movies.length} movies...`);
        
        // Apply platform filtering
        let filtered = this.filterByUserPlatforms(movies);
        
        // Apply trigger warning blocking
        filtered = this.filterBlockedMovies(filtered);
        
        console.log(`[TMDB] ✅ After filtering: ${filtered.length} movies remain`);
        
        return filtered;
    }

    // ✅ FIX: Use only doesTheDogDieService for trigger warnings
    async fetchTriggerWarnings(movie) {
        if (!movie || !movie.id || movie.warningsLoaded) return;

        try {
            // Silently fetch warnings (only log successes)
            const warnings = await doesTheDogDieService.getWarningsForMovie(
                movie.title,
                movie.imdb_id || null
            );

            movie.triggerWarnings = warnings || [];
            movie.warningsLoaded = true;
            movie.hasTriggerWarnings = warnings.length > 0;

            // Only log when warnings are found
            if (warnings.length > 0) {
                console.log(`[TMDB] ✅ ${warnings.length} warnings loaded for: ${movie.title}`);
                
                // Update card badge if exists
                document.dispatchEvent(new CustomEvent('trigger-warnings-loaded', {
                    detail: { movieId: movie.id, warnings }
                }));
            }
            
        } catch (error) {
            console.error('[TMDB] Trigger warning fetch failed:', error);
            movie.triggerWarnings = [];
            movie.warningsLoaded = true;
        }
    }

    // ✅ UPDATED: Discover movies with region filtering
    async discoverMovies(options = {}) {
        const userProfile = userProfileService?.getProfile();
        
        const params = new URLSearchParams({
            api_key: this.apiKey,
            language: 'en-US',
            sort_by: options.sortBy || 'popularity.desc',
            page: options.page || 1,
            include_adult: false,
            include_video: false,
            region: userProfile?.region || 'US',
            watch_region: userProfile?.region || 'US'
        });

        // Add optional filters
        if (options.withGenres) {
            params.append('with_genres', options.withGenres);
        }
        if (options.year) {
            params.append('primary_release_year', options.year);
        }
        if (options.minRating) {
            params.append('vote_average.gte', options.minRating);
        }
        if (options.minVotes) {
            params.append('vote_count.gte', options.minVotes || 100);
        }

        try {
            const response = await fetch(
                `${this.baseURL}/discover/movie?${params.toString()}`
            );
            const data = await response.json();
            
            console.log(`[TMDB] ✅ Discovered ${data.results?.length || 0} movies (page ${options.page})`);
            
            return {
                movies: this.processMovies(data.results || []),
                totalPages: data.total_pages,
                totalResults: data.total_results,
                page: data.page
            };
        } catch (error) {
            console.error('[TMDB] ❌ Discovery failed:', error);
            return { movies: [], totalPages: 0, totalResults: 0, page: 1 };
        }
    }

    // ✅ UPDATED: Get popular movies with region filtering
    async getPopularMovies(page = 1) {
        const userProfile = userProfileService?.getProfile();
        
        const params = new URLSearchParams({
            api_key: this.apiKey,
            language: 'en-US',
            page: page,
            region: userProfile?.region || 'US'
        });

        try {
            const response = await fetch(
                `${this.baseURL}/movie/popular?${params.toString()}`
            );
            const data = await response.json();
            
            console.log(`[TMDB] Loaded popular page ${page}, ${data.results?.length || 0} movies`);
            
            return this.processMovies(data.results || []);
        } catch (error) {
            console.error('[TMDB] ❌ Failed to load popular movies:', error);
            return [];
        }
    }

    // ✅ UPDATED: Get trending movies with region filtering
    async getTrendingMovies(timeWindow = 'week', page = 1) {
        const userProfile = userProfileService?.getProfile();
        
        const params = new URLSearchParams({
            api_key: this.apiKey,
            language: 'en-US',
            page: page,
            region: userProfile?.region || 'US'
        });

        try {
            const response = await fetch(
                `${this.baseURL}/trending/movie/${timeWindow}?${params.toString()}`
            );
            const data = await response.json();
            
            console.log(`[TMDB] ✅ Loaded ${data.results?.length || 0} trending movies`);
            
            return this.processMovies(data.results || []);
        } catch (error) {
            console.error('[TMDB] ❌ Failed to load trending movies:', error);
            return [];
        }
    }

    async getMovieDetails(movieId) {
        if (this.cache.movies.has(movieId)) {
            return this.cache.movies.get(movieId);
        }

        const params = new URLSearchParams({
            api_key: this.apiKey,
            language: 'en-US',
            append_to_response: 'credits,videos,similar,recommendations,release_dates'
        });

        try {
            const response = await fetch(
                `${this.baseURL}/movie/${movieId}?${params.toString()}`
            );
            const movie = await response.json();
            
            const processed = this.processMovie(movie);
            this.cache.movies.set(movieId, processed);
            
            return processed;
        } catch (error) {
            console.error('[TMDB] ❌ Failed to get movie details:', error);
            return null;
        }
    }

    async searchMovies(query, page = 1) {
        const userProfile = userProfileService?.getProfile();
        
        const params = new URLSearchParams({
            api_key: this.apiKey,
            language: 'en-US',
            query: query,
            page: page,
            include_adult: false,
            region: userProfile?.region || 'US'
        });

        try {
            const response = await fetch(
                `${this.baseURL}/search/movie?${params.toString()}`
            );
            const data = await response.json();
            
            return {
                movies: this.processMovies(data.results || []),
                totalPages: data.total_pages,
                totalResults: data.total_results
            };
        } catch (error) {
            console.error('[TMDB] ❌ Search failed:', error);
            return { movies: [], totalPages: 0, totalResults: 0 };
        }
    }

    processMovies(movies) {
        return movies.map(movie => this.processMovie(movie));
    }

    // ✅ FIX: Removed duplicate platform assignment logic
    processMovie(movie) {
        // Extract certification if available
        let certification = null;
        if (movie.release_dates?.results) {
            const usRelease = movie.release_dates.results.find(r => r.iso_3166_1 === 'US');
            if (usRelease && usRelease.release_dates && usRelease.release_dates.length > 0) {
                certification = usRelease.release_dates[0].certification || null;
            }
        }

        return {
            id: movie.id,
            title: movie.title,
            originalTitle: movie.original_title,
            overview: movie.overview,
            releaseDate: movie.release_date,
            rating: movie.vote_average,
            voteCount: movie.vote_count,
            popularity: movie.popularity,
            genres: this.getGenreNames(movie.genre_ids || movie.genres?.map(g => g.id)),
            genreIds: movie.genre_ids || movie.genres?.map(g => g.id) || [],
            posterPath: movie.poster_path,
            backdropPath: movie.backdrop_path,
            posterURL: this.getImageURL(movie.poster_path),
            backdropURL: this.getImageURL(movie.backdrop_path, 'w780'),
            adult: movie.adult,
            originalLanguage: movie.original_language,
            // Additional details if available
            runtime: movie.runtime,
            budget: movie.budget,
            revenue: movie.revenue,
            status: movie.status,
            tagline: movie.tagline,
            homepage: movie.homepage,
            // ✅ FIX: Add certification
            certification: certification,
            // Credits
            cast: movie.credits?.cast?.slice(0, 10),
            crew: movie.credits?.crew,
            director: movie.credits?.crew?.find(p => p.job === 'Director'),
            // Videos
            trailer: movie.videos?.results?.find(v => 
                v.type === 'Trailer' && v.site === 'YouTube'
            ),
            // Similar/Recommended
            similar: movie.similar?.results,
            recommendations: movie.recommendations?.results,
            // ✅ FIX: Platform availability (single source of truth)
            availableOn: [], // Will be populated by getWatchProviders
            platform: null, // Will be set after watch providers fetched
            // Trigger warnings (will be populated separately)
            triggerWarnings: [],
            hasTriggerWarnings: false,
            triggerWarningCount: 0,
            warningsLoaded: false
        };
    }

    // Helper to batch load trigger warnings for multiple movies
    async loadTriggerWarningsForMovies(movies, options = {}) {
        const { maxConcurrent = 3, delay = 100 } = options;
        
        console.log(`[TMDB] Loading trigger warnings for ${movies.length} movies...`);
        
        const results = [];
        
        for (let i = 0; i < movies.length; i += maxConcurrent) {
            const batch = movies.slice(i, i + maxConcurrent);
            const promises = batch.map(movie => this.fetchTriggerWarnings(movie));
            
            await Promise.all(promises);
            results.push(...batch);
            
            // Rate limiting delay
            if (i + maxConcurrent < movies.length) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        const foundWarnings = results.filter(m => m.hasTriggerWarnings).length;
        if (foundWarnings > 0) {
            console.log(`[TMDB] ✅ Found warnings for ${foundWarnings}/${results.length} movies`);
        }
        
        return results;
    }

    // ✅ FIX: Batch load watch providers and SET platform field
    async loadWatchProvidersForMovies(movies, options = {}) {
        const { maxConcurrent = 5, delay = 50 } = options;
        
        console.log(`[TMDB] Loading watch providers for ${movies.length} movies...`);
        
        for (let i = 0; i < movies.length; i += maxConcurrent) {
            const batch = movies.slice(i, i + maxConcurrent);
            
            await Promise.all(
                batch.map(async (movie) => {
                    movie.availableOn = await this.getWatchProviders(movie.id);
                    
                    // ✅ FIX: Set platform field (single source of truth)
                    if (movie.availableOn && movie.availableOn.length > 0) {
                        movie.platform = movie.availableOn[0]; // First available platform
                    } else {
                        // Check if movie is unreleased
                        const year = movie.releaseDate?.split('-')[0] || movie.year;
                        const currentYear = new Date().getFullYear();
                        
                        if (year && parseInt(year) > currentYear) {
                            movie.platform = 'Coming Soon';
                        } else {
                            movie.platform = 'Not Available';
                        }
                    }
                })
            );
            
            // Rate limiting delay
            if (i + maxConcurrent < movies.length) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        console.log(`[TMDB] ✅ Loaded watch providers for ${movies.length} movies`);
        return movies;
    }

    // Clear cache
    clearCache() {
        this.cache.movies.clear();
        this.cache.triggerWarnings.clear();
        this.cache.watchProviders.clear();
        console.log('[TMDB] Cache cleared');
    }
}

// Create singleton instance
const tmdbService = new TMDBService();

export { tmdbService, TMDBService };
