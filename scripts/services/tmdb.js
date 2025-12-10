/**
 * TMDB Service - Movie Database API Integration
 * ✅ INTEGRATED: trigger-warning-service.js for categorized warnings
 * ✅ INTEGRATED: user-profile-revised.js for region/preference filtering
 */

import { doesTheDogDieService } from './does-the-dog-die.js';
import { triggerWarningService } from './trigger-warning-service.js';
import { userProfileService } from './user-profile-revised.js';

class TMDBService {
    constructor() {
        this.apiKey = null;
        this.baseURL = 'https://api.themoviedb.org/3';
        this.imageBaseURL = 'https://image.tmdb.org/t/p';
        this.cache = {
            movies: new Map(),
            genres: new Map(),
            triggerWarnings: new Map()
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

    // ✅ UPDATED: Fetch trigger warnings with categorization and user filtering
    async fetchTriggerWarnings(movie) {
        if (!movie || !movie.id) {
            console.warn('[TMDB] No movie ID provided for trigger warnings');
            return [];
        }

        // Check cache first
        if (this.cache.triggerWarnings.has(movie.id)) {
            return this.cache.triggerWarnings.get(movie.id);
        }

        try {
            console.log(`[TMDB] Fetching trigger warnings for: ${movie.title}`);
            
            // Get raw warnings from DoesTheDogDie service
            const rawWarnings = await doesTheDogDieService.getContentWarnings(movie.id);
            
            if (!rawWarnings || rawWarnings.length === 0) {
                console.log('[TMDB] No trigger warnings found');
                this.cache.triggerWarnings.set(movie.id, []);
                return [];
            }

            // ✅ NEW: Use trigger warning service to categorize
            const categorizedWarnings = await triggerWarningService.getWarnings(movie.id);
            
            if (!categorizedWarnings || !categorizedWarnings.categories) {
                // Fallback to raw warnings if service fails
                console.warn('[TMDB] Trigger warning service failed, using raw warnings');
                this.cache.triggerWarnings.set(movie.id, rawWarnings);
                return rawWarnings;
            }

            // ✅ NEW: Filter by user preferences
            const userProfile = userProfileService.getProfile();
            const enabledCategories = userProfile.triggerWarnings.enabledCategories;
            const showAllWarnings = userProfile.triggerWarnings.showAllWarnings;

            const filteredWarnings = triggerWarningService.filterByUserPreferences(
                categorizedWarnings,
                enabledCategories,
                showAllWarnings
            );

            console.log(`[TMDB] ✅ Processed ${filteredWarnings.categories.length} categorized warnings`);
            console.log(`[TMDB] Total items: ${filteredWarnings.totalWarnings}`);

            // Cache the filtered warnings
            this.cache.triggerWarnings.set(movie.id, filteredWarnings.categories);
            
            // Add to movie object
            movie.triggerWarnings = filteredWarnings.categories;
            movie.triggerWarningCount = filteredWarnings.totalWarnings;
            movie.hasTriggerWarnings = filteredWarnings.totalWarnings > 0;

            return filteredWarnings.categories;

        } catch (error) {
            console.error('[TMDB] ❌ Failed to fetch trigger warnings:', error);
            this.cache.triggerWarnings.set(movie.id, []);
            return [];
        }
    }

    // ✅ UPDATED: Discover movies with region filtering
    async discoverMovies(options = {}) {
        const userProfile = userProfileService.getProfile();
        
        const params = new URLSearchParams({
            api_key: this.apiKey,
            language: 'en-US',
            sort_by: options.sortBy || 'popularity.desc',
            page: options.page || 1,
            include_adult: false,
            include_video: false,
            // ✅ NEW: Use user's region for proper localization
            region: userProfile.region || 'US',
            watch_region: userProfile.region || 'US'
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
        const userProfile = userProfileService.getProfile();
        
        const params = new URLSearchParams({
            api_key: this.apiKey,
            language: 'en-US',
            page: page,
            // ✅ NEW: Use user's region
            region: userProfile.region || 'US'
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
    async getTrendingMovies(timeWindow = 'week') {
        const userProfile = userProfileService.getProfile();
        
        const params = new URLSearchParams({
            api_key: this.apiKey,
            language: 'en-US',
            // ✅ NEW: Use user's region
            region: userProfile.region || 'US'
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
            append_to_response: 'credits,videos,similar,recommendations'
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
        const userProfile = userProfileService.getProfile();
        
        const params = new URLSearchParams({
            api_key: this.apiKey,
            language: 'en-US',
            query: query,
            page: page,
            include_adult: false,
            // ✅ NEW: Use user's region
            region: userProfile.region || 'US'
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
            // Trigger warnings (will be populated separately)
            triggerWarnings: [],
            hasTriggerWarnings: false,
            triggerWarningCount: 0
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
        
        console.log(`[TMDB] ✅ Loaded trigger warnings for ${results.length} movies`);
        return results;
    }

    // Clear cache
    clearCache() {
        this.cache.movies.clear();
        this.cache.triggerWarnings.clear();
        console.log('[TMDB] Cache cleared');
    }
}

// Create singleton instance
const tmdbService = new TMDBService();

export { tmdbService, TMDBService };
