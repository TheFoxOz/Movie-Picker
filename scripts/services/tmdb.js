/**
 * TMDB Service - Movie Database API Integration
 * ✅ FIXED: Removed duplicate platform logic
 * ✅ FIXED: Proper platform detection from multiple sources
 * ✅ FIXED: Updated color references to new palette
 * ✅ FIXED: Syntax error in filterByUserPlatforms
 * ✅ NEW: Platform name normalization for fuzzy matching
 */

import { doesTheDogDieService } from './does-the-dog-die.js';
import { userProfileService } from './user-profile-revised.js';
import { authService } from './auth-service.js';
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
        this.dynamicProviderMap = null;  // ✅ NEW: Dynamically loaded providers
        this.availableRegions = [];       // ✅ NEW: Dynamically loaded regions
        this.cacheTTL = 24 * 60 * 60 * 1000;  // ✅ GROK MICRO-POLISH: 24h cache TTL
        this.isInitialized = false;
    }

    async initialize(apiKey) {
        if (!apiKey) {
            console.error('[TMDB] ❌ No API key provided');
            return false;
        }

        this.apiKey = apiKey;
        
        try {
            // Load genres (required)
            await this.loadGenres();
            
            // ✅ GROK RECOMMENDATION: Auto-load available regions
            await this.loadAvailableRegions();
            
            // ✅ GROK RECOMMENDATION: Load providers for default/user region
            const defaultRegion = userProfileService?.getProfile?.()?.region || 'US';
            await this.loadWatchProviders(defaultRegion);
            
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

    /**
     * ✅ NEW 2025: Dynamically load watch providers from TMDB API
     * Future-proofs against service rebrands and new platforms
     * @param {string} region - ISO 3166-1 country code (e.g., 'US', 'GB')
     */
    async loadWatchProviders(region = 'US') {
        // ✅ GROK MICRO-POLISH: Check cache first (24h TTL)
        const cacheKey = `providers_${region}`;
        const cached = this.getCachedData(cacheKey);
        if (cached && cached instanceof Map) {
            this.dynamicProviderMap = new Map(cached);
            console.log(`[TMDB] ✅ Using cached providers for ${region} (${this.dynamicProviderMap.size} providers)`);
            return;
        }

        try {
            const response = await fetch(
                `${this.baseURL}/watch/providers/movie?api_key=${this.apiKey}&language=en-US&region=${region}`
            );
            const data = await response.json();
            
            if (!data.results || data.results.length === 0) {
                console.warn('[TMDB] No watch providers found for region:', region);
                return;
            }

            // Build dynamic provider map
            this.dynamicProviderMap = new Map();
            
            data.results.forEach(provider => {
                // Clean up provider names for consistency
                let name = provider.provider_name
                    .replace('HBO Max', 'Max')
                    .replace('Amazon Prime Video', 'Prime Video')
                    .replace(' Plus', '+');
                
                this.dynamicProviderMap.set(provider.provider_id, name);
            });
            
            // ✅ GROK MICRO-POLISH: Cache for 24h
            this.setCachedData(cacheKey, Array.from(this.dynamicProviderMap.entries()));
            
            console.log(`[TMDB] ✅ Loaded ${this.dynamicProviderMap.size} watch providers for ${region}`);
        } catch (error) {
            console.warn('[TMDB] Could not load dynamic providers, using fallback map:', error);
            // Falls back to static map in getWatchProviders
        }
    }

    /**
     * ✅ NEW 2025: Dynamically load available regions from TMDB API
     * Ensures only regions with watch provider data are shown
     * @returns {Promise<Array>} Array of region objects with code, name, flag
     */
    async loadAvailableRegions() {
        // ✅ GROK MICRO-POLISH: Check cache first (24h TTL)
        const cached = this.getCachedData('regions');
        if (cached && Array.isArray(cached)) {
            this.availableRegions = cached;
            console.log(`[TMDB] ✅ Using cached regions (${cached.length} regions)`);
            return this.availableRegions;
        }

        try {
            const response = await fetch(
                `${this.baseURL}/watch/providers/regions?api_key=${this.apiKey}`
            );
            const data = await response.json();
            
            // ✅ GROK FIX: Validate response
            if (!data.results || !Array.isArray(data.results)) {
                console.warn('[TMDB] Invalid regions response');
                return this.getFallbackRegions();
            }

            // ✅ GROK RECOMMENDATION: Sort alphabetically by name for better UX
            this.availableRegions = data.results
                .map(r => ({
                    code: r.iso_3166_1,
                    name: r.english_name || r.native_name,
                    flag: this.getFlagEmoji(r.iso_3166_1)
                }))
                .sort((a, b) => a.name.localeCompare(b.name));
            
            // ✅ GROK MICRO-POLISH: Cache for 24h
            this.setCachedData('regions', this.availableRegions);
            
            // ✅ GROK MICRO-POLISH: Indicate if using fallback or dynamic data
            const isFallback = this.availableRegions.length < 20;
            console.log(`[TMDB] ✅ Loaded ${this.availableRegions.length} supported regions (sorted alphabetically)${isFallback ? ' (using fallback)' : ''}`);
            return this.availableRegions;
        } catch (error) {
            console.error('[TMDB] Failed to load available regions:', error);
            return this.getFallbackRegions();
        }
    }

    /**
     * ✅ GROK POLISH: Fallback region list when API fails
     * Returns minimal set of most important regions
     * @returns {Array} Array of fallback region objects
     */
    getFallbackRegions() {
        console.log('[TMDB] Using fallback region list');
        this.availableRegions = [
            { code: 'US', name: 'United States', flag: '🇺🇸' },
            { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
            { code: 'CA', name: 'Canada', flag: '🇨🇦' },
            { code: 'AU', name: 'Australia', flag: '🇦🇺' },
            { code: 'DE', name: 'Germany', flag: '🇩🇪' },
            { code: 'FR', name: 'France', flag: '🇫🇷' },
            { code: 'ES', name: 'Spain', flag: '🇪🇸' },
            { code: 'IT', name: 'Italy', flag: '🇮🇹' },
            { code: 'JP', name: 'Japan', flag: '🇯🇵' },
            { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
            { code: 'IN', name: 'India', flag: '🇮🇳' },
            { code: 'MX', name: 'Mexico', flag: '🇲🇽' }
        ];
        return this.availableRegions;
    }

    /**
     * Helper: Convert ISO 3166-1 country code to flag emoji
     * @param {string} countryCode - Two-letter country code (e.g., 'US', 'GB')
     * @returns {string} Flag emoji
     */
    getFlagEmoji(countryCode) {
        if (!countryCode || countryCode.length !== 2) return '🏳️';
        
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt());
        
        return String.fromCodePoint(...codePoints);
    }

    /**
     * ✅ NEW: Handle region change - reload providers and clear relevant caches
     * Call this when user changes their region setting
     * @param {string} newRegion - ISO 3166-1 country code
     */
    async handleRegionChange(newRegion) {
        console.log(`[TMDB] Region changed to: ${newRegion}`);
        
        try {
            // Clear watch provider cache (region-specific data)
            this.cache.watchProviders.clear();
            
            // Reload providers for new region
            await this.loadWatchProviders(newRegion);
            
            console.log(`[TMDB] ✅ Region changed successfully to ${newRegion}`);
            
            // ✅ GROK POLISH: Dispatch event for UI components to react
            document.dispatchEvent(new CustomEvent('tmdb:region-changed', { 
                detail: { region: newRegion } 
            }));
        } catch (error) {
            console.error('[TMDB] Failed to handle region change:', error);
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

            // ✅ GROK POLISH: Sort by display_priority (lower = higher priority)
            // This shows most promoted services first (usually Netflix, etc.)
            // Using nullish coalescing (??) for stricter null/undefined handling
            const sortedProviders = allProviders.sort((a, b) => 
                (a.display_priority ?? 999) - (b.display_priority ?? 999)
            );

            // ✅ UPDATED 2025: Map TMDB provider IDs to platform names
            // Major updates: HBO Max → Max, added popular free services
            const providerMap = {
                // Major streaming platforms
                8: 'Netflix',
                15: 'Hulu',
                9: 'Prime Video',           // Primary Amazon Prime ID
                119: 'Prime Video',         // Regional variant
                337: 'Disney+',
                350: 'Apple TV+',
                387: 'Peacock',
                386: 'Paramount+',
                
                // CRITICAL 2025 FIX: Max rebrand (was HBO Max)
                384: 'Max',                 // ✅ Updated from 'HBO Max'
                
                // Purchase/Rental platforms
                2: 'Apple TV',
                3: 'Google Play Movies',
                10: 'Amazon Video',
                68: 'Microsoft Store',
                
                // Popular free/ad-supported (2025)
                283: 'Crunchyroll',         // Anime streaming
                73: 'Pluto TV',             // Free streaming
                97: 'Tubi',                 // Free ad-supported
                207: 'Mubi',                // Curated film streaming
                192: 'YouTube'              // YouTube rentals/purchases
            };

            const platformNames = sortedProviders
                .map(p => {
                    // ✅ Try dynamic map first (if loaded), then fall back to static
                    if (this.dynamicProviderMap && this.dynamicProviderMap.has(p.provider_id)) {
                        return this.dynamicProviderMap.get(p.provider_id);
                    }
                    return providerMap[p.provider_id];
                })
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

    filterByUserPlatforms(movies) {
        if (!movies?.length) return [];

        // 1. Try to read preferences from multiple possible locations
        let selectedPlatforms = [];

        // Most recent location (onboarding + profile)
        const profile = userProfileService?.getProfile?.();
        if (profile?.selectedPlatforms?.length) {
            selectedPlatforms = profile.selectedPlatforms;
        }
        // Fallback 1 - store
        else if (store.getState().preferences?.platforms?.length) {
            selectedPlatforms = store.getState().preferences.platforms;
        }
        // Fallback 2 - localStorage (last resort)
        else {
            try {
                const prefs = JSON.parse(localStorage.getItem('moviePickerPreferences') || '{}');
                selectedPlatforms = Array.isArray(prefs.platforms) ? prefs.platforms : [];
            } catch {}
        }
        
        // ✅ GROK FIX: Fallback 3 - User-specific localStorage (new format from profile.js)
        if (!selectedPlatforms.length) {
            try {
                const user = authService?.getCurrentUser?.();
                if (user?.uid) {
                    const userPrefs = localStorage.getItem(`userPreferences_${user.uid}`);
                    if (userPrefs) {
                        const prefs = JSON.parse(userPrefs);
                        selectedPlatforms = Array.isArray(prefs.platforms) ? prefs.platforms : [];
                        console.log('[TMDB] ✅ Loaded platforms from user-specific localStorage');
                    }
                }
            } catch (err) {
                console.warn('[TMDB] Could not read user-specific preferences:', err);
            }
        }

        // If user has no platforms selected → show everything (don't filter)
        if (!selectedPlatforms.length) {
            console.warn('[TMDB] No platforms selected → showing all movies (no filtering)');
            return movies;
        }

        console.log('[TMDB] Filtering by user platforms:', selectedPlatforms);

        // ✅ GROK'S RECOMMENDATION: Enhanced normalization with 2025 rebrands
        const normalize = str => (str || '')
            .toLowerCase()
            .replace(/hbo\s*max/gi, 'max')      // HBO Max → Max (2023+ rebrand)
            .replace(/\bmax\b/gi, 'max')         // Normalize Max
            .replace(/amazon\s*prime\s*video/gi, 'prime video')
            .replace(/prime\s*video/gi, 'primevideo')
            .replace(/\+/g, 'plus')              // Disney+ → disneyplus
            .replace(/[^a-z0-9]/g, '')           // Remove special chars
            .trim();

        const userNormalized = new Set(selectedPlatforms.map(normalize));
        console.log('[TMDB] Normalized user platforms:', Array.from(userNormalized));

        const filtered = movies.filter(movie => {
            // No platform data yet? → keep it (will be filtered later when enriched)
            if (!movie.availableOn?.length && !movie.platform) return true;

            const platformsToCheck = [
                ...(movie.availableOn || []),
                movie.platform
            ].filter(Boolean);

            // ✅ DEBUG: Log first 3 movies to see what's happening
            if (filtered.length < 3 && platformsToCheck.length > 0) {
                console.log(`[TMDB] 🔍 DEBUG Movie "${movie.title}":`);
                console.log(`[TMDB] 🔍   Raw platforms:`, platformsToCheck);
                console.log(`[TMDB] 🔍   Normalized:`, platformsToCheck.map(normalize));
                console.log(`[TMDB] 🔍   User wants:`, Array.from(userNormalized));
            }

            const hasMatch = platformsToCheck.some(p => {
                const normalized = normalize(p);
                const matches = userNormalized.has(normalized);
                
                if (matches) {
                    console.log(`[TMDB] ✅ "${movie.title}" matches: "${p}" (normalized: "${normalized}")`);
                }
                
                return matches;
            });

            return hasMatch;
        });

        console.log(`[TMDB] Platform filtering: ${movies.length} → ${filtered.length} movies`);
        return filtered;
    }

    isMovieBlocked(movie) {
        if (!movie || !movie.triggerWarnings) {
            return false;
        }

        const userProfile = userProfileService?.getProfile();
        const enabledCategories = userProfile?.triggerWarnings?.enabledCategories || [];
        
        if (enabledCategories.length === 0) {
            return false;
        }

        const hasBlockedWarning = movie.triggerWarnings.some(warning => {
            const category = typeof warning === 'string' ? warning : warning.category;
            return enabledCategories.includes(category);
        });

        if (hasBlockedWarning) {
            console.log(`[TMDB] ⚠️ Movie "${movie.title}" blocked due to trigger warnings`);
        }

        return hasBlockedWarning;
    }

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

    applyUserFilters(movies) {
        if (!movies || movies.length === 0) {
            return [];
        }

        console.log(`[TMDB] Applying filters to ${movies.length} movies...`);
        
        let filtered = this.filterByUserPlatforms(movies);
        filtered = this.filterBlockedMovies(filtered);
        
        console.log(`[TMDB] ✅ After filtering: ${filtered.length} movies remain`);
        
        return filtered;
    }

    async fetchTriggerWarnings(movie) {
        if (!movie || !movie.id || movie.warningsLoaded) return;

        try {
            const warnings = await doesTheDogDieService.getWarningsForMovie(
                movie.title,
                movie.imdb_id || null
            );

            movie.triggerWarnings = warnings || [];
            movie.warningsLoaded = true;
            movie.hasTriggerWarnings = warnings.length > 0;

            if (warnings.length > 0) {
                console.log(`[TMDB] ✅ ${warnings.length} warnings loaded for: ${movie.title}`);
                
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
            runtime: movie.runtime,
            budget: movie.budget,
            revenue: movie.revenue,
            status: movie.status,
            tagline: movie.tagline,
            homepage: movie.homepage,
            certification: certification,
            cast: movie.credits?.cast?.slice(0, 10),
            crew: movie.credits?.crew,
            director: movie.credits?.crew?.find(p => p.job === 'Director'),
            trailer: movie.videos?.results?.find(v => 
                v.type === 'Trailer' && v.site === 'YouTube'
            ),
            similar: movie.similar?.results,
            recommendations: movie.recommendations?.results,
            availableOn: [],
            platform: null,
            triggerWarnings: [],
            hasTriggerWarnings: false,
            triggerWarningCount: 0,
            warningsLoaded: false
        };
    }

    async loadTriggerWarningsForMovies(movies, options = {}) {
        const { maxConcurrent = 3, delay = 100 } = options;
        
        console.log(`[TMDB] Loading trigger warnings for ${movies.length} movies...`);
        
        const results = [];
        
        for (let i = 0; i < movies.length; i += maxConcurrent) {
            const batch = movies.slice(i, i + maxConcurrent);
            const promises = batch.map(movie => this.fetchTriggerWarnings(movie));
            
            await Promise.all(promises);
            results.push(...batch);
            
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

    async loadWatchProvidersForMovies(movies, options = {}) {
        const { maxConcurrent = 5, delay = 50 } = options;
        
        console.log(`[TMDB] Loading watch providers for ${movies.length} movies...`);
        
        for (let i = 0; i < movies.length; i += maxConcurrent) {
            const batch = movies.slice(i, i + maxConcurrent);
            
            await Promise.all(
                batch.map(async (movie) => {
                    movie.availableOn = await this.getWatchProviders(movie.id);
                    
                    if (movie.availableOn && movie.availableOn.length > 0) {
                        movie.platform = movie.availableOn[0];
                    } else {
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
            
            if (i + maxConcurrent < movies.length) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        console.log(`[TMDB] ✅ Loaded watch providers for ${movies.length} movies`);
        return movies;
    }

    clearCache() {
        this.cache.movies.clear();
        this.cache.triggerWarnings.clear();
        this.cache.watchProviders.clear();
        console.log('[TMDB] Cache cleared');
    }

    /**
     * ✅ GROK MICRO-POLISH: Get cached data from localStorage with TTL check
     * @param {string} key - Cache key
     * @returns {any|null} Cached data or null if expired/missing
     */
    getCachedData(key) {
        try {
            const cached = localStorage.getItem(`tmdb_${key}`);
            if (!cached) return null;
            
            const parsed = JSON.parse(cached);
            
            // ✅ GROK FINAL POLISH: Validate cache structure (prevent corrupted entries)
            if (!parsed || !parsed.timestamp || !parsed.data) {
                console.warn(`[TMDB] Corrupted cache entry for ${key}, removing`);
                localStorage.removeItem(`tmdb_${key}`);
                return null;
            }
            
            const age = Date.now() - parsed.timestamp;
            
            if (age > this.cacheTTL) {
                localStorage.removeItem(`tmdb_${key}`);
                return null;
            }
            
            return parsed.data;
        } catch (e) {
            console.warn(`[TMDB] Failed to parse cache entry for ${key}:`, e);
            localStorage.removeItem(`tmdb_${key}`);
            return null;
        }
    }

    /**
     * ✅ GROK MICRO-POLISH: Save data to localStorage with timestamp
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     */
    setCachedData(key, data) {
        try {
            localStorage.setItem(`tmdb_${key}`, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.warn('[TMDB] Failed to cache data:', error);
        }
    }
}

const tmdbService = new TMDBService();

export { tmdbService, TMDBService };
