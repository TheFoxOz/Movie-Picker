/**
 * TMDB Service - WITH TRAILER SUPPORT
 * Handles all TMDB API interactions including trailers
 */

import { ENV } from '../config/env.js';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const CACHE_EXPIRY = 1000 * 60 * 30; // 30 minutes

class TMDBService {
    constructor() {
        this.apiKey = window.__tmdb_api_key || null;
        this.cache = new Map();
        
        if (ENV.APP.debug) {
            console.log('[TMDB] Service initialized with API key:', this.apiKey ? 'Present' : 'Missing');
        }
    }
    
    /**
     * Fetch trending movies this week in specific region
     */
    async fetchTrendingWeek(region = 'GB') {
        if (!this.apiKey) {
            console.warn('[TMDB] No API key - cannot fetch trending');
            return [];
        }
        
        const cacheKey = `trending_week_${region}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            if (ENV.APP.debug) {
                console.log('[TMDB] Trending from cache');
            }
            return cached;
        }
        
        try {
            const url = `${TMDB_API_BASE}/trending/movie/week?api_key=${this.apiKey}&region=${region}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`TMDB API error: ${response.status}`);
            }
            
            const data = await response.json();
            const movies = data.results
                .filter(movie => movie.poster_path)
                .map(movie => this.transformMovieBasic(movie))
                .slice(0, 10); // Top 10 trending
            
            this.setToCache(cacheKey, movies);
            
            if (ENV.APP.debug) {
                console.log('[TMDB] Fetched trending:', movies.length);
            }
            
            return movies;
            
        } catch (error) {
            console.error('[TMDB] Error fetching trending:', error);
            return [];
        }
    }
    
    /**
     * Fetch top rated movies of all time
     */
    async fetchTopRated() {
        if (!this.apiKey) {
            console.warn('[TMDB] No API key - cannot fetch top rated');
            return [];
        }
        
        const cacheKey = 'top_rated_all_time';
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            if (ENV.APP.debug) {
                console.log('[TMDB] Top rated from cache');
            }
            return cached;
        }
        
        try {
            const url = `${TMDB_API_BASE}/movie/top_rated?api_key=${this.apiKey}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`TMDB API error: ${response.status}`);
            }
            
            const data = await response.json();
            const movies = data.results
                .filter(movie => movie.poster_path)
                .map(movie => this.transformMovieBasic(movie))
                .slice(0, 10); // Top 10 rated
            
            this.setToCache(cacheKey, movies);
            
            if (ENV.APP.debug) {
                console.log('[TMDB] Fetched top rated:', movies.length);
            }
            
            return movies;
            
        } catch (error) {
            console.error('[TMDB] Error fetching top rated:', error);
            return [];
        }
    }
    
    /**
     * Fetch best movies by genre
     */
    async fetchByGenre(genreId, genreName) {
        if (!this.apiKey) {
            console.warn('[TMDB] No API key - cannot fetch by genre');
            return [];
        }
        
        const cacheKey = `genre_${genreId}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            if (ENV.APP.debug) {
                console.log(`[TMDB] ${genreName} from cache`);
            }
            return cached;
        }
        
        try {
            const url = `${TMDB_API_BASE}/discover/movie?api_key=${this.apiKey}&with_genres=${genreId}&sort_by=vote_average.desc&vote_count.gte=1000`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`TMDB API error: ${response.status}`);
            }
            
            const data = await response.json();
            const movies = data.results
                .filter(movie => movie.poster_path)
                .map(movie => this.transformMovieBasic(movie))
                .slice(0, 8); // Top 8 per genre
            
            this.setToCache(cacheKey, movies);
            
            if (ENV.APP.debug) {
                console.log(`[TMDB] Fetched ${genreName}:`, movies.length);
            }
            
            return movies;
            
        } catch (error) {
            console.error(`[TMDB] Error fetching ${genreName}:`, error);
            return [];
        }
    }
    
    /**
     * Get movie trailer from TMDB
     */
    async getMovieTrailer(movieId) {
        if (!this.apiKey) {
            console.warn('[TMDB] No API key - cannot fetch trailer');
            return null;
        }
        
        const cacheKey = `trailer_${movieId}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            if (ENV.APP.debug) {
                console.log('[TMDB] Trailer from cache:', cached);
            }
            return cached;
        }
        
        try {
            const url = `${TMDB_API_BASE}/movie/${movieId}/videos?api_key=${this.apiKey}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`TMDB API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Find official YouTube trailer
            const trailer = data.results?.find(video => 
                video.type === 'Trailer' && 
                video.site === 'YouTube' && 
                video.official === true
            ) || data.results?.find(video => 
                video.type === 'Trailer' && 
                video.site === 'YouTube'
            );
            
            const trailerKey = trailer?.key || null;
            
            // Cache the result
            this.setToCache(cacheKey, trailerKey);
            
            if (ENV.APP.debug) {
                console.log('[TMDB] Trailer key:', trailerKey);
            }
            
            return trailerKey;
            
        } catch (error) {
            console.error('[TMDB] Error fetching trailer:', error);
            return null;
        }
    }
    
    /**
     * Fetch popular movies from TMDB (fast version - basic data only)
     */
    async fetchPopularMovies() {
        if (!this.apiKey) {
            console.warn('[TMDB] No API key provided');
            return this.getFallbackMovies();
        }
        
        try {
            const allMovies = [];
            const totalPages = 5; // Fetch 5 pages = 100 movies
            
            for (let page = 1; page <= totalPages; page++) {
                if (ENV.APP.debug) {
                    console.log(`[TMDB] Loading page ${page}/${totalPages}`);
                }
                const movies = await this.fetchPage(page);
                allMovies.push(...movies);
            }
            
            console.log(`[TMDB] ✅ Successfully loaded ${allMovies.length} movies`);
            return allMovies;
            
        } catch (error) {
            console.error('[TMDB] Error fetching movies:', error);
            return this.getFallbackMovies();
        }
    }
    
    async fetchPage(page) {
        const cacheKey = `popular_page_${page}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        const url = `${TMDB_API_BASE}/movie/popular?api_key=${this.apiKey}&page=${page}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }
        
        const data = await response.json();
        const movies = data.results
            .filter(movie => movie.poster_path) // Only movies with posters
            .map(movie => this.transformMovieBasic(movie));
        
        this.setToCache(cacheKey, movies);
        return movies;
    }
    
    /**
     * Search movies on TMDB
     */
    async searchMovies(query) {
        if (!this.apiKey) {
            console.warn('[TMDB] No API key - cannot search');
            return [];
        }
        
        const cacheKey = `search_${query}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const url = `${TMDB_API_BASE}/search/movie?api_key=${this.apiKey}&query=${encodeURIComponent(query)}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`TMDB API error: ${response.status}`);
            }
            
            const data = await response.json();
            const movies = data.results
                .filter(movie => movie.poster_path) // Only movies with posters
                .map(movie => this.transformMovieBasic(movie));
            
            this.setToCache(cacheKey, movies);
            return movies;
            
        } catch (error) {
            console.error('[TMDB] Search error:', error);
            return [];
        }
    }
    
    /**
     * Transform TMDB movie data (FAST - basic info only, no extra API calls)
     */
    transformMovieBasic(tmdbMovie) {
        return {
            id: tmdbMovie.id,
            title: tmdbMovie.title,
            year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : 'N/A',
            imdb: tmdbMovie.vote_average ? tmdbMovie.vote_average.toFixed(1) : 'N/A',
            vote_count: tmdbMovie.vote_count || 0,
            popularity: tmdbMovie.popularity || 0,
            synopsis: tmdbMovie.overview || 'No description available.',
            genre: this.getGenres(tmdbMovie.genre_ids),
            poster_path: tmdbMovie.poster_path 
                ? `${TMDB_IMAGE_BASE}/w500${tmdbMovie.poster_path}`
                : null,
            backdrop_path: tmdbMovie.backdrop_path
                ? `${TMDB_IMAGE_BASE}/w1280${tmdbMovie.backdrop_path}`
                : null,
            platform: this.inferPlatform(tmdbMovie),
            runtime: 'N/A', // Not available without extra API call
            cast: [], // Changed from 'actors' to 'cast' for consistency
            mood: this.inferMood(tmdbMovie.genre_ids),
            triggerWarnings: this.inferTriggerWarnings(tmdbMovie.genre_ids)
        };
    }
    
    /**
     * Transform TMDB movie data (DETAILED - with extra API calls for full data)
     */
    async transformMovie(tmdbMovie) {
        // Start with basic data
        const movie = this.transformMovieBasic(tmdbMovie);
        
        // Fetch additional details if API key available
        if (this.apiKey && tmdbMovie.id) {
            try {
                const details = await this.fetchMovieDetails(tmdbMovie.id);
                if (details) {
                    movie.runtime = details.runtime ? `${details.runtime} min` : 'N/A';
                    movie.cast = details.cast || [];
                }
            } catch (error) {
                console.error('[TMDB] Error fetching details:', error);
            }
        }
        
        return movie;
    }
    
    async fetchMovieDetails(movieId) {
        const cacheKey = `details_${movieId}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const url = `${TMDB_API_BASE}/movie/${movieId}?api_key=${this.apiKey}&append_to_response=credits`;
            const response = await fetch(url);
            
            if (!response.ok) return null;
            
            const data = await response.json();
            const details = {
                runtime: data.runtime,
                cast: data.credits?.cast?.slice(0, 6).map(c => c.name) || []
            };
            
            this.setToCache(cacheKey, details);
            return details;
            
        } catch (error) {
            console.error('[TMDB] Error fetching details:', error);
            return null;
        }
    }
    
    getGenres(genreIds) {
        const genreMap = {
            28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
            80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
            14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
            9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
            53: 'Thriller', 10752: 'War', 37: 'Western'
        };
        
        return genreIds?.map(id => genreMap[id]).filter(Boolean).join(', ') || 'Unknown';
    }
    
    inferPlatform(movie) {
        // Simple platform inference based on popularity/year
        const platforms = ['Netflix', 'Hulu', 'Prime Video', 'Disney+', 'HBO Max', 'Apple TV+'];
        const hash = (movie.id || 0) % platforms.length;
        return platforms[hash];
    }
    
    inferMood(genreIds) {
        if (!genreIds || genreIds.length === 0) return 'Entertaining';
        
        if (genreIds.includes(27)) return 'Scary';
        if (genreIds.includes(35)) return 'Funny';
        if (genreIds.includes(10749)) return 'Romantic';
        if (genreIds.includes(28)) return 'Action-Packed';
        if (genreIds.includes(878)) return 'Mind-Bending';
        if (genreIds.includes(18)) return 'Emotional';
        if (genreIds.includes(9648)) return 'Mysterious';
        if (genreIds.includes(16)) return 'Whimsical';
        if (genreIds.includes(12)) return 'Adventurous';
        if (genreIds.includes(53)) return 'Suspenseful';
        if (genreIds.includes(14)) return 'Magical';
        
        return 'Entertaining';
    }
    
    inferTriggerWarnings(genreIds) {
        const warnings = [];
        
        if (genreIds?.includes(27)) {
            warnings.push('Jump Scares', 'Gore', 'Supernatural Horror');
        }
        if (genreIds?.includes(28)) {
            warnings.push('High Violence', 'Intense Action');
        }
        if (genreIds?.includes(10752)) {
            warnings.push('War Violence', 'Emotional Loss');
        }
        if (genreIds?.includes(80)) {
            warnings.push('Crime Violence', 'Disturbing Themes');
        }
        
        return warnings;
    }
    
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > CACHE_EXPIRY) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }
    
    setToCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    getFallbackMovies() {
        if (ENV.APP.debug) {
            console.log('[TMDB] Using fallback movies');
        }
        return [
            {
                id: '603',
                title: 'The Matrix',
                year: 1999,
                imdb: '8.7',
                synopsis: 'A computer hacker learns about the true nature of reality.',
                genre: 'Action, Sci-Fi',
                poster_path: null,
                platform: 'HBO Max',
                runtime: '136 min',
                cast: ['Keanu Reeves', 'Laurence Fishburne'],
                mood: 'Mind-Bending',
                triggerWarnings: ['High Violence']
            }
        ];
    }
}

// Singleton instance
let tmdbServiceInstance = null;

export function getTMDBService() {
    if (!tmdbServiceInstance) {
        tmdbServiceInstance = new TMDBService();
    }
    return tmdbServiceInstance;
}

// Backwards compatibility - initTMDBService does the same as getTMDBService
export function initTMDBService() {
    return getTMDBService();
}
