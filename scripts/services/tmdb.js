/**
 * TMDB Service
 * Handles all TMDB API interactions
 */

import { ENV } from '../config/env.js';

class TMDBService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.themoviedb.org/3';
        this.imageBaseUrl = 'https://image.tmdb.org/t/p/w500';
        this.cache = new Map();
        this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
    }
    
    /**
     * Generic API request method with caching
     */
    async request(endpoint, params = {}) {
        const queryParams = new URLSearchParams({
            api_key: this.apiKey,
            ...params
        });
        
        const url = `${this.baseUrl}${endpoint}?${queryParams}`;
        const cacheKey = url;
        
        // Check cache
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            if (ENV.APP.debug) {
                console.log('[TMDB] Cache hit:', endpoint);
            }
            return cached.data;
        }
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`TMDB API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Cache the response
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            
            if (ENV.APP.debug) {
                console.log('[TMDB] API call success:', endpoint);
            }
            
            return data;
        } catch (error) {
            console.error('[TMDB] API error:', error);
            throw error;
        }
    }
    
    /**
     * Fetch popular movies (multiple pages)
     */
    async fetchPopularMovies(pages = 3) {
        const allMovies = [];
        
        for (let page = 1; page <= pages; page++) {
            try {
                const data = await this.request('/movie/popular', { page });
                const movies = data.results.map(movie => this.transformMovieBasic(movie));
                allMovies.push(...movies);
            } catch (error) {
                console.error(`[TMDB] Error fetching page ${page}:`, error);
            }
        }
        
        if (ENV.APP.debug) {
            console.log('[TMDB] Fetched', allMovies.length, 'popular movies');
        }
        
        return allMovies;
    }
    
    /**
     * Fetch trending movies
     */
    async fetchTrendingMovies() {
        try {
            const data = await this.request('/trending/movie/week');
            const movies = data.results.map(movie => this.transformMovieBasic(movie));
            
            if (ENV.APP.debug) {
                console.log('[TMDB] Fetched', movies.length, 'trending movies');
            }
            
            return movies;
        } catch (error) {
            console.error('[TMDB] Error fetching trending:', error);
            return [];
        }
    }
    
    /**
     * Fetch top rated movies (all-time best)
     */
    async fetchTopRatedMovies() {
        try {
            const data = await this.request('/movie/top_rated');
            const movies = data.results.map(movie => this.transformMovieBasic(movie));
            
            if (ENV.APP.debug) {
                console.log('[TMDB] Fetched', movies.length, 'top rated movies');
            }
            
            return movies;
        } catch (error) {
            console.error('[TMDB] Error fetching top rated:', error);
            return [];
        }
    }
    
    /**
     * Fetch movies by genre
     */
    async fetchMoviesByGenre(genreId, page = 1) {
        try {
            const data = await this.request('/discover/movie', {
                with_genres: genreId,
                sort_by: 'popularity.desc',
                page
            });
            const movies = data.results.map(movie => this.transformMovieBasic(movie));
            
            if (ENV.APP.debug) {
                console.log('[TMDB] Fetched', movies.length, 'movies for genre', genreId);
            }
            
            return movies;
        } catch (error) {
            console.error('[TMDB] Error fetching genre movies:', error);
            return [];
        }
    }
    
    /**
     * Search movies
     */
    async searchMovies(query) {
        try {
            const data = await this.request('/search/movie', { query });
            const movies = data.results.map(movie => this.transformMovieBasic(movie));
            
            if (ENV.APP.debug) {
                console.log('[TMDB] Search results:', movies.length, 'movies');
            }
            
            return movies;
        } catch (error) {
            console.error('[TMDB] Error searching:', error);
            return [];
        }
    }
    
    /**
     * Get movie trailer
     */
    async getMovieTrailer(movieId) {
        try {
            const data = await this.request(`/movie/${movieId}/videos`);
            const trailer = data.results.find(video => 
                video.type === 'Trailer' && video.site === 'YouTube'
            );
            
            if (trailer) {
                if (ENV.APP.debug) {
                    console.log('[TMDB] Found trailer for movie', movieId);
                }
                return trailer.key;
            }
            
            return null;
        } catch (error) {
            console.error('[TMDB] Error fetching trailer:', error);
            return null;
        }
    }
    
    /**
     * Get movie credits (cast)
     */
    async getMovieCredits(movieId) {
        try {
            const data = await this.request(`/movie/${movieId}/credits`);
            const cast = data.cast.slice(0, 6).map(person => person.name);
            
            if (ENV.APP.debug) {
                console.log('[TMDB] Found', cast.length, 'cast members for movie', movieId);
            }
            
            return cast;
        } catch (error) {
            console.error('[TMDB] Error fetching credits:', error);
            return [];
        }
    }
    
    /**
     * Transform TMDB movie object to our format
     */
    transformMovieBasic(movie) {
        return {
            id: movie.id,
            title: movie.title,
            synopsis: movie.overview || 'No description available.',
            year: movie.release_date?.substring(0, 4) || 'N/A',
            genre: this.getGenreName(movie.genre_ids?.[0]),
            imdb: movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A',
            runtime: movie.runtime ? `${movie.runtime} min` : null,
            platform: this.inferPlatform(movie), // FIXED!
            poster_path: movie.poster_path ? `${this.imageBaseUrl}${movie.poster_path}` : null,
            backdrop_path: movie.backdrop_path ? `${this.imageBaseUrl}${movie.backdrop_path}` : null,
            cast: [], // FIXED: Changed from 'actors' to 'cast'
            triggerWarnings: this.inferTriggerWarnings(movie),
            vote_count: movie.vote_count || 0,
            vote_average: movie.vote_average || 0,
            release_date: movie.release_date || null
        };
    }
    
    /**
     * FIXED: Infer platform using deterministic hash instead of random modulo
     * This ensures the same movie always gets the same platform
     */
    inferPlatform(movie) {
        const platforms = ['Netflix', 'Hulu', 'Prime Video', 'Disney+', 'HBO Max', 'Apple TV+'];
        
        // Use a hash of the movie's release year + title for deterministic assignment
        const seed = (movie.release_date || '2000') + (movie.title || '');
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        
        // Get absolute value and map to platform index
        const index = Math.abs(hash) % platforms.length;
        
        return platforms[index];
    }
    
    /**
     * Get genre name from ID
     */
    getGenreName(genreId) {
        const genres = {
            28: 'Action',
            12: 'Adventure',
            16: 'Animation',
            35: 'Comedy',
            80: 'Crime',
            99: 'Documentary',
            18: 'Drama',
            10751: 'Family',
            14: 'Fantasy',
            36: 'History',
            27: 'Horror',
            10402: 'Music',
            9648: 'Mystery',
            10749: 'Romance',
            878: 'Sci-Fi',
            10770: 'TV Movie',
            53: 'Thriller',
            10752: 'War',
            37: 'Western'
        };
        
        return genres[genreId] || 'Unknown';
    }
    
    /**
     * Infer trigger warnings based on genre and rating
     */
    inferTriggerWarnings(movie) {
        const warnings = [];
        const genreId = movie.genre_ids?.[0];
        
        // Horror movies
        if (genreId === 27) {
            warnings.push('Violence', 'Gore', 'Jump Scares');
        }
        
        // Action/Thriller
        if ([28, 53].includes(genreId)) {
            warnings.push('Violence', 'Intense Scenes');
        }
        
        // War movies
        if (genreId === 10752) {
            warnings.push('War Violence', 'Death');
        }
        
        return warnings;
    }
    
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        if (ENV.APP.debug) {
            console.log('[TMDB] Cache cleared');
        }
    }
}

let tmdbServiceInstance = null;

/**
 * Initialize TMDB service
 */
export function initTMDBService(apiKey) {
    if (!apiKey) {
        throw new Error('TMDB API key is required');
    }
    
    tmdbServiceInstance = new TMDBService(apiKey);
    
    if (ENV.APP.debug) {
        console.log('[TMDB] Service initialized');
    }
    
    return tmdbServiceInstance;
}

/**
 * Get TMDB service instance
 */
export function getTMDBService() {
    if (!tmdbServiceInstance) {
        throw new Error('TMDB service not initialized. Call initTMDBService first.');
    }
    return tmdbServiceInstance;
}

/**
 * Genre IDs for easy reference
 */
export const GENRE_IDS = {
    ACTION: 28,
    SCIFI: 878,
    COMEDY: 35,
    HORROR: 27,
    DRAMA: 18,
    ROMANCE: 10749,
    THRILLER: 53,
    ANIMATION: 16
};
