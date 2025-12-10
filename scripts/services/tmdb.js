/**
 * TMDB Service – Final Clean Version (Dec 2025)
 * • Uses trigger-warning-manager.js (no dead code)
 * • API key from ENV (works on Vercel)
 * • Region from localStorage
 * • Smart caching + double-fetch protection
 */

import { doesTheDogDieService } from './does-the-dog-die.js';
import { triggerWarningManager } from './trigger-warning-manager.js';
import { ENV } from '../config/env.js';

class TMDBService {
    constructor() {
        this.apiKey = ENV.TMDB_API_KEY;
        this.baseURL = 'https://api.themoviedb.org/3';
        this.imageBaseURL = 'https://image.tmdb.org/t/p';
        this.cache = {
            movies: new Map(),
            genres: new Map()
        };
        this.genreList = [];
        this.isInitialized = false;
    }

    async initialize() {
        if (!this.apiKey) {
            console.error('[TMDB] No API key! Check .env.local or Vercel env vars');
            return false;
        }

        try {
            await this.loadGenres();
            this.isInitialized = true;
            console.log('[TMDB] Initialized with key:', this.apiKey.slice(0, 8) + '...');
            return true;
        } catch (error) {
            console.error('[TMDB] Init failed:', error);
            return false;
        }
    }

    async loadGenres() {
        const res = await fetch(`${this.baseURL}/genre/movie/list?api_key=${this.apiKey}`);
        const data = await res.json();
        this.genreList = data.genres || [];
        this.genreList.forEach(g => this.cache.genres.set(g.id, g.name));
        console.log('[TMDB] Loaded', this.genreList.length, 'genres');
    }

    getGenreNames(ids) {
        if (!Array.isArray(ids)) return [];
        return ids.map(id => this.cache.genres.get(id)).filter(Boolean);
    }

    getImageURL(path, size = 'w500') {
        return path ? `${this.imageBaseURL}/${size}${path}` : null;
    }

    // Get user's region from preferences (fallback to US)
    _getUserRegion() {
        try {
            const prefs = JSON.parse(localStorage.getItem('moviePickerPreferences') || '{}');
            return prefs.region || 'US';
        } catch {
            return 'US';
        }
    }

    // Beautiful categorized trigger warnings using new manager
    async fetchTriggerWarnings(movie) {
        if (!movie?.id || movie.warningsLoaded) return;

        try {
            const result = await triggerWarningManager.getCategorizedWarnings(movie);

            // Apply user filter preferences
            try {
                const prefs = JSON.parse(localStorage.getItem('moviePickerPreferences') || '{}');
                const filtered = triggerWarningManager.filterByPreferences(
                    result,
                    prefs.triggerWarnings || {}
                );

                movie.triggerWarnings = filtered.categories;
                movie.triggerWarningCount = filtered.total;
                movie.hasTriggerWarnings = filtered.hasWarnings;
            } catch {
                // Fallback: show all
                movie.triggerWarnings = result.categories;
                movie.triggerWarningCount = result.total;
                movie.hasTriggerWarnings = result.hasWarnings;
            }

            movie.warningsLoaded = true;
        } catch (error) {
            console.warn('[TMDB] Trigger warnings failed for', movie.title);
            movie.warningsLoaded = true;
            movie.triggerWarnings = [];
            movie.triggerWarningCount = 0;
            movie.hasTriggerWarnings = false;
        }
    }

    async discoverMovies(options = {}) {
        const params = new URLSearchParams({
            api_key: this.apiKey,
            language: 'en-US',
            sort_by: options.sortBy || 'popularity.desc',
            page: options.page || 1,
            include_adult: false,
            include_video: false,
            region: this._getUserRegion(),
            watch_region: this._getUserRegion()
        });

        if (options.withGenres) params.append('with_genres', options.withGenres);
        if (options.year) params.append('primary_release_year', options.year);
        if (options.minRating) params.append('vote_average.gte', options.minRating);
        if (options.minVotes) params.append('vote_count.gte', options.minVotes || 100);

        const res = await fetch(`${this.baseURL}/discover/movie?${params}`);
        const data = await res.json();

        return {
            movies: this.processMovies(data.results || []),
            totalPages: data.total_pages || 1,
            totalResults: data.total_results || 0,
            page: data.page || 1
        };
    }

    async getPopularMovies(page = 1) {
        const params = new URLSearchParams({
            api_key: this.apiKey,
            language: 'en-US',
            page,
            region: this._getUserRegion()
        });

        const res = await fetch(`${this.baseURL}/movie/popular?${params}`);
        const data = await res.json();
        return this.processMovies(data.results || []);
    }

    async getTrendingMovies(timeWindow = 'week') {
        const params = new URLSearchParams({
            api_key: this.apiKey,
            language: 'en-US',
            region: this._getUserRegion()
        });

        const res = await fetch(`${this.baseURL}/trending/movie/${timeWindow}?${params}`);
        const data = await res.json();
        return this.processMovies(data.results || []);
    }

    async getMovieDetails(id) {
        if (this.cache.movies.has(id)) return this.cache.movies.get(id);

        const params = new URLSearchParams({
            api_key: this.apiKey,
            language: 'en-US',
            append_to_response: 'credits,videos'
        });

        const res = await fetch(`${this.baseURL}/movie/${id}?${params}`);
        const movie = await res.json();
        const processed = this.processMovie(movie);
        this.cache.movies.set(id, processed);
        return processed;
    }

    async searchMovies(query, page = 1) {
        const params = new URLSearchParams({
            api_key: this.apiKey,
            language: 'en-US',
            query,
            page,
            include_adult: false,
            region: this._getUserRegion()
        });

        const res = await fetch(`${this.baseURL}/search/movie?${params}`);
        const data = await res.json();
        return {
            movies: this.processMovies(data.results || []),
            totalPages: data.total_pages || 1,
            totalResults: data.total_results || 0
        };
    }

    processMovies(movies) {
        return (movies || []).map(m => this.processMovie(m));
    }

    processMovie(movie) {
        return {
            id: movie.id,
            title: movie.title || movie.original_title,
            overview: movie.overview || 'No description available.',
            releaseDate: movie.release_date,
            year: movie.release_date?.split('-')[0],
            rating: movie.vote_average || 0,
            voteCount: movie.vote_count || 0,
            genres: this.getGenreNames(movie.genre_ids || movie.genres?.map(g => g.id)),
            genreIds: movie.genre_ids || movie.genres?.map(g => g.id) || [],
            posterPath: movie.poster_path,
            backdropPath: movie.backdrop_path,
            posterURL: this.getImageURL(movie.poster_path),
            backdropURL: this.getImageURL(movie.backdrop_path, 'w780'),
            adult: movie.adult,
            runtime: movie.runtime,
            trailer: movie.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube'),
            cast: movie.credits?.cast?.slice(0, 10).map(c => c.name),
            director: movie.credits?.crew?.find(c => c.job === 'Director')?.name,
            // Trigger warnings – will be filled async
            triggerWarnings: [],
            triggerWarningCount: 0,
            hasTriggerWarnings: false,
            warningsLoaded: false
        };
    }

    clearCache() {
        this.cache.movies.clear();
        console.log('[TMDB] Cache cleared');
    }
}

// Singleton
let instance = null;
export function getTMDBService() {
    if (!instance) instance = new TMDBService();
    return instance;
}

export const tmdbService = getTMDBService();
