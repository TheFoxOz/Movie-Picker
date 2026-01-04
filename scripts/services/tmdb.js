/**
 * TMDB Service - Movie Database API Integration
 * ✅ WEEK 2 OPTIMIZED: Integrated with global cache manager
 * ✅ FIXED: Removed duplicate platform logic
 * ✅ FIXED: Proper platform detection from multiple sources
 * ✅ FIXED: Updated color references to new palette
 * ✅ FIXED: Syntax error in filterByUserPlatforms
 * ✅ NEW: Platform name normalization for fuzzy matching
 * ✅ OPTIMIZED: Using global cache manager for better memory management
 */

import { doesTheDogDieService } from './does-the-dog-die.js';
import { userProfileService } from './user-profile-revised.js';
import { authService } from './auth-service.js';
import { store } from '../state/store.js';
import { cacheManager } from '../utils/cache-manager.js';  // ✅ NEW: Global cache

class TMDBService {
    constructor() {
        this.apiKey = null;
        this.baseURL = 'https://api.themoviedb.org/3';
        this.imageBaseURL = 'https://image.tmdb.org/t/p';
        
        // ✅ REMOVED: Local cache maps (now using global cache manager)
        // this.cache = { movies: new Map(), genres: new Map(), ... }
        
        this.genreList = [];
        this.dynamicProviderMap = null;
        this.availableRegions = [];
        this.cacheTTL = 24 * 60 * 60 * 1000;  // 24h
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
            await this.loadAvailableRegions();
            
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
            // ✅ NEW: Check global cache first
            const cached = cacheManager.get('tmdb', 'genres');
            if (cached) {
                this.genreList = cached;
                console.log('[TMDB] ✅ Loaded genres from cache:', this.genreList.length);
                return;
            }

            const response = await fetch(
                `${this.baseURL}/genre/movie/list?api_key=${this.apiKey}`
            );
            const data = await response.json();
            
            this.genreList = data.genres || [];
            
            // ✅ NEW: Cache in global cache manager
            cacheManager.set('tmdb', 'genres', this.genreList, this.cacheTTL);
            
            console.log('[TMDB] ✅ Loaded genres:', this.genreList.length);
        } catch (error) {
            console.error('[TMDB] ❌ Failed to load genres:', error);
            throw error;
        }
    }

    async loadWatchProviders(region = 'US') {
        // ✅ NEW: Check global cache
        const cacheKey = `providers_${region}`;
        const cached = cacheManager.get('tmdb', cacheKey);
        
        if (cached) {
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

            this.dynamicProviderMap = new Map();
            
            data.results.forEach(provider => {
                let name = provider.provider_name
                    .replace('HBO Max', 'Max')
                    .replace('Amazon Prime Video', 'Prime Video')
                    .replace(' Plus', '+');
                
                this.dynamicProviderMap.set(provider.provider_id, name);
            });
            
            // ✅ NEW: Cache in global cache manager
            cacheManager.set('tmdb', cacheKey, Array.from(this.dynamicProviderMap.entries()), this.cacheTTL);
            
            console.log(`[TMDB] ✅ Loaded ${this.dynamicProviderMap.size} watch providers for ${region}`);
        } catch (error) {
            console.warn('[TMDB] Could not load dynamic providers:', error);
        }
    }

    async loadAvailableRegions() {
        // ✅ NEW: Check global cache
        const cached = cacheManager.get('tmdb', 'regions');
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
            
            if (!data.results || !Array.isArray(data.results)) {
                console.warn('[TMDB] Invalid regions response');
                return this.getFallbackRegions();
            }

            this.availableRegions = data.results
                .map(r => ({
                    code: r.iso_3166_1,
                    name: r.english_name || r.native_name,
                    flag: this.getFlagEmoji(r.iso_3166_1)
                }))
                .sort((a, b) => a.name.localeCompare(b.name));
            
            // ✅ NEW: Cache in global cache manager
            cacheManager.set('tmdb', 'regions', this.availableRegions, this.cacheTTL);
            
            console.log(`[TMDB] ✅ Loaded ${this.availableRegions.length} supported regions`);
            return this.availableRegions;
        } catch (error) {
            console.error('[TMDB] Failed to load available regions:', error);
            return this.getFallbackRegions();
        }
    }

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

    getFlagEmoji(countryCode) {
        if (!countryCode || countryCode.length !== 2) return '🏳️';
        
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt());
        
        return String.fromCodePoint(...codePoints);
    }

    async handleRegionChange(newRegion) {
        console.log(`[TMDB] Region changed to: ${newRegion}`);
        
        try {
            // ✅ NEW: Clear only watch provider cache for this region
            cacheManager.clearNamespace('platform');
            
            await this.loadWatchProviders(newRegion);
            
            console.log(`[TMDB] ✅ Region changed successfully to ${newRegion}`);
            
            document.dispatchEvent(new CustomEvent('tmdb:region-changed', { 
                detail: { region: newRegion } 
            }));
        } catch (error) {
            console.error('[TMDB] Failed to handle region change:', error);
        }
    }

    getGenreNames(genreIds) {
        if (!genreIds || !Array.isArray(genreIds)) return [];
        
        // ✅ NEW: Use cached genre list
        const genreMap = new Map(this.genreList.map(g => [g.id, g.name]));
        return genreIds
            .map(id => genreMap.get(id))
            .filter(Boolean);
    }

    getImageURL(path, size = 'w500') {
        if (!path) return null;
        return `${this.imageBaseURL}/${size}${path}`;
    }

    async getWatchProviders(movieId, streamingOnly = true) {
        if (!movieId) {
            console.warn('[TMDB] No movie ID provided for watch providers');
            return [];
        }

        // ✅ NEW: Check global cache
        const cacheKey = streamingOnly ? `${movieId}_streaming` : `${movieId}_all`;
        const cached = cacheManager.get('platform', cacheKey);
        
        if (cached) {
            return cached;
        }

        try {
            const userProfile = userProfileService?.getProfile();
            const region = userProfile?.region || 'US';

            const response = await fetch(
                `${this.baseURL}/movie/${movieId}/watch/providers?api_key=${this.apiKey}`
            );
            
            if (!response.ok) {
                console.warn(`[TMDB] Watch providers API error: ${response.status}`);
                cacheManager.set('platform', cacheKey, [], 3600000); // Cache empty result for 1h
                return [];
            }

            const data = await response.json();
            const providers = data.results?.[region];
            
            if (!providers) {
                cacheManager.set('platform', cacheKey, [], 3600000);
                return [];
            }

            const allProviders = streamingOnly 
                ? [...(providers.flatrate || [])]
                : [
                    ...(providers.flatrate || []),
                    ...(providers.rent || []),
                    ...(providers.buy || [])
                  ];

            const sortedProviders = allProviders.sort((a, b) => 
                (a.display_priority ?? 999) - (b.display_priority ?? 999)
            );

            const providerMap = {
                8: 'Netflix',
                15: 'Hulu',
                9: 'Prime Video',
                119: 'Prime Video',
                337: 'Disney+',
                350: 'Apple TV+',
                387: 'Peacock',
                386: 'Paramount+',
                384: 'Max',
                2: 'Apple TV',
                3: 'Google Play Movies',
                10: 'Amazon Video',
                68: 'Microsoft Store',
                283: 'Crunchyroll',
                73: 'Pluto TV',
                97: 'Tubi',
                207: 'Mubi',
                192: 'YouTube'
            };

            const platformNames = sortedProviders
                .map(p => {
                    if (this.dynamicProviderMap && this.dynamicProviderMap.has(p.provider_id)) {
                        return this.dynamicProviderMap.get(p.provider_id);
                    }
                    return providerMap[p.provider_id];
                })
                .filter(Boolean);

            const uniquePlatforms = [...new Set(platformNames)];
            
            if (uniquePlatforms.length > 0) {
                console.log(`[TMDB] ✅ Found ${uniquePlatforms.length} streaming platforms for movie ${movieId}`);
            }
            
            // ✅ NEW: Cache in global cache manager (1 hour TTL for platform data)
            cacheManager.set('platform', cacheKey, uniquePlatforms, 3600000);
            
            return uniquePlatforms;

        } catch (error) {
            console.error('[TMDB] ❌ Failed to fetch watch providers:', error);
            cacheManager.set('platform', cacheKey, [], 3600000);
            return [];
        }
    }

    filterByUserPlatforms(movies) {
        if (!movies?.length) return [];

        let selectedPlatforms = [];

        const profile = userProfileService?.getProfile?.();
        if (profile?.selectedPlatforms?.length) {
            selectedPlatforms = profile.selectedPlatforms;
        }
        else if (store.getState().preferences?.platforms?.length) {
            selectedPlatforms = store.getState().preferences.platforms;
        }
        else {
            try {
                const prefs = JSON.parse(localStorage.getItem('moviePickerPreferences') || '{}');
                selectedPlatforms = Array.isArray(prefs.platforms) ? prefs.platforms : [];
            } catch {}
        }
        
        if (!selectedPlatforms.length) {
            try {
                const user = authService?.getCurrentUser?.();
                if (user?.uid) {
                    const userPrefs = localStorage.getItem(`userPreferences_${user.uid}`);
                    if (userPrefs) {
                        const prefs = JSON.parse(userPrefs);
                        selectedPlatforms = Array.isArray(prefs.platforms) ? prefs.platforms : [];
                    }
                }
            } catch (err) {
                console.warn('[TMDB] Could not read user-specific preferences:', err);
            }
        }

        if (!selectedPlatforms.length) {
            console.warn('[TMDB] No platforms selected → showing all movies');
            return movies;
        }

        console.log('[TMDB] Filtering by user platforms:', selectedPlatforms);

        const normalize = str => (str || '')
            .toLowerCase()
            .replace(/hbo\s*max/gi, 'max')
            .replace(/\bmax\b/gi, 'max')
            .replace(/amazon\s*video/gi, 'primevideo')
            .replace(/amazon\s*prime\s*video/gi, 'primevideo')
            .replace(/prime\s*video/gi, 'primevideo')
            .replace(/\+/g, 'plus')
            .replace(/[^a-z0-9]/g, '')
            .trim();

        const userNormalized = new Set(selectedPlatforms.map(normalize));
        console.log('[TMDB] Normalized user platforms:', Array.from(userNormalized));

        let debugCount = 0;
        const filtered = movies.filter(movie => {
            if (movie.platform === 'In Cinemas') {
                const hasInCinemasEnabled = userNormalized.has(normalize('In Cinemas'));
                if (!hasInCinemasEnabled) {
                    console.log(`[TMDB] 🎬 Filtering out cinema movie: "${movie.title}"`);
                }
                return hasInCinemasEnabled;
            }
            
            if (!movie.availableOn?.length && !movie.platform) return true;

            const platformsToCheck = [
                ...(movie.availableOn || []),
                movie.platform
            ].filter(Boolean);

            if (debugCount < 3 && platformsToCheck.length > 0) {
                console.log(`[TMDB] 🔍 DEBUG Movie "${movie.title}":`);
                console.log(`[TMDB] 🔍   Raw platforms:`, platformsToCheck.join(', '));
                console.log(`[TMDB] 🔍   Normalized:`, platformsToCheck.map(normalize).join(', '));
                console.log(`[TMDB] 🔍   User wants:`, Array.from(userNormalized).join(', '));
                debugCount++;
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

    async fetchTriggerWarnings(movie, timeout = 5000) {
        if (!movie || !movie.id || movie.warningsLoaded) return;

        // ✅ NEW: Check global cache
        const cached = cacheManager.get('warnings', movie.id);
        if (cached !== null && cached !== undefined) {
            movie.triggerWarnings = cached;
            movie.warningsLoaded = true;
            movie.hasTriggerWarnings = cached.length > 0;
            movie.triggerWarningCount = cached.length;
            
            if (cached.length > 0) {
                document.dispatchEvent(new CustomEvent('trigger-warnings-loaded', {
                    detail: { movieId: movie.id, warnings: cached }
                }));
            }
            
            console.log(`[TMDB] ⚡ Cache HIT for warnings: ${movie.title}`);
            return;
        }

        try {
            const warningsPromise = doesTheDogDieService.getWarningsForMovie(
                movie.title,
                movie.imdb_id || null
            );
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), timeout)
            );

            const warnings = await Promise.race([warningsPromise, timeoutPromise]);

            movie.triggerWarnings = warnings || [];
            movie.warningsLoaded = true;
            movie.hasTriggerWarnings = warnings.length > 0;
            movie.triggerWarningCount = warnings.length;

            // ✅ NEW: Cache in global cache manager (7 days)
            cacheManager.set('warnings', movie.id, movie.triggerWarnings, 7 * 24 * 60 * 60 * 1000);

            if (warnings.length > 0) {
                console.log(`[TMDB] ✅ ${warnings.length} warnings loaded for: ${movie.title}`);
                
                document.dispatchEvent(new CustomEvent('trigger-warnings-loaded', {
                    detail: { movieId: movie.id, warnings }
                }));
            }
            
        } catch (error) {
            if (error.message === 'Timeout') {
                console.warn(`[TMDB] ⏱️ Trigger warnings timeout for: ${movie.title}`);
            } else {
                console.error('[TMDB] Trigger warning fetch failed:', error);
            }
            
            movie.triggerWarnings = [];
            movie.warningsLoaded = true;
            movie.hasTriggerWarnings = false;
            movie.triggerWarningCount = 0;
            movie.warningsFailed = true;
            
            // ✅ NEW: Cache empty result (1 hour TTL)
            cacheManager.set('warnings', movie.id, [], 3600000);
            
            document.dispatchEvent(new CustomEvent('trigger-warnings-loaded', {
                detail: { movieId: movie.id, warnings: [], failed: true }
            }));
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

        const currentUser = authService?.getCurrentUser?.();
        if (currentUser) {
            let selectedPlatforms = [];
            
            if (userProfile?.selectedPlatforms?.length) {
                selectedPlatforms = userProfile.selectedPlatforms;
            }
            else if (currentUser.uid) {
                try {
                    const userPrefs = localStorage.getItem(`userPreferences_${currentUser.uid}`);
                    if (userPrefs) {
                        const prefs = JSON.parse(userPrefs);
                        selectedPlatforms = Array.isArray(prefs.platforms) ? prefs.platforms : [];
                    }
                } catch (err) {
                    console.warn('[TMDB] Could not read user preferences:', err);
                }
            }
            
            if (selectedPlatforms.length > 0) {
                const providerIds = this.getPlatformProviderIds(selectedPlatforms, userProfile?.region || 'US');
                
                if (providerIds.length > 0) {
                    params.append('with_watch_providers', providerIds.join('|'));
                    console.log('[TMDB] 🎯 Discovering movies on platforms:', selectedPlatforms.join(', '));
                }
            }
        }

        if (options.withGenres) params.append('with_genres', options.withGenres);
        if (options.year) params.append('primary_release_year', options.year);
        if (options.minRating) params.append('vote_average.gte', options.minRating);
        if (options.minVotes) params.append('vote_count.gte', options.minVotes || 100);
        if (options.primaryReleaseDateGte) params.append('primary_release_date.gte', options.primaryReleaseDateGte);

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

    getPlatformProviderIds(platformNames, region = 'US') {
        const providerMapGB = {
            'Netflix': 8,
            'Prime Video': 119,
            'Disney+': 337,
            'Apple TV+': 350,
            'Sky Go': 29,
            'Now TV': 39,
            'Now TV Cinema': 39,
            'Paramount+': 531,
            'ITVX': 982,
            'Channel 4': 103,
            'BBC iPlayer': 38,
            'All 4': 103
        };

        const providerMapUS = {
            'Netflix': 8,
            'Prime Video': 9,
            'Disney+': 337,
            'Apple TV+': 350,
            'Hulu': 15,
            'HBO Max': 384,
            'Max': 384,
            'Paramount+': 531,
            'Peacock': 387
        };

        const providerMap = region === 'GB' ? providerMapGB : providerMapUS;
        const ids = [];
        
        platformNames.forEach(name => {
            if (name === 'In Cinemas') return;
            
            if (providerMap[name]) {
                ids.push(providerMap[name]);
                return;
            }
            
            const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            
            for (const [key, value] of Object.entries(providerMap)) {
                const keyNormalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (keyNormalized.includes(normalized) || normalized.includes(keyNormalized)) {
                    ids.push(value);
                    break;
                }
            }
        });

        return [...new Set(ids)];
    }

    async getSimilarMovies(movieId) {
        // ✅ NEW: Check cache
        const cached = cacheManager.get('tmdb', `similar_${movieId}`);
        if (cached) return cached;

        try {
            const response = await fetch(
                `${this.baseURL}/movie/${movieId}/similar?api_key=${this.apiKey}`
            );
            const data = await response.json();
            const movies = this.processMovies(data.results || []);
            
            // ✅ NEW: Cache result
            cacheManager.set('tmdb', `similar_${movieId}`, movies, this.cacheTTL);
            
            return movies;
        } catch (error) {
            console.error('[TMDB] Failed to get similar movies:', error);
            return [];
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
        // ✅ NEW: Check global cache
        const cached = cacheManager.get('tmdb', `movie_${movieId}`);
        if (cached) return cached;

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
            
            // ✅ NEW: Cache in global cache manager
            cacheManager.set('tmdb', `movie_${movieId}`, processed, this.cacheTTL);
            
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
            trailerKey: movie.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube')?.key,
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
        // ✅ NEW: Clear all TMDB-related cache namespaces
        cacheManager.clearNamespace('tmdb');
        cacheManager.clearNamespace('platform');
        cacheManager.clearNamespace('warnings');
        console.log('[TMDB] Cache cleared');
    }
}

const tmdbService = new TMDBService();

export { tmdbService, TMDBService };
