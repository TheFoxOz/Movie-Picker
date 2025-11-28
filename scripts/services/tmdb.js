/**
 * TMDB Service
 * Handles all TMDB API interactions and data transformation
 */

// TMDB Configuration
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Genre ID to Name Mapping (from TMDB)
const GENRE_MAP = {
    28: "Action",
    12: "Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    99: "Documentary",
    18: "Drama",
    10751: "Family",
    14: "Fantasy",
    36: "History",
    27: "Horror",
    10402: "Music",
    9648: "Mystery",
    10749: "Romance",
    878: "Sci-Fi",
    10770: "TV Movie",
    53: "Thriller",
    10752: "War",
    37: "Western"
};

// Streaming Platform Mapping (simplified)
const PLATFORM_PROVIDERS = {
    8: "Netflix",
    15: "Hulu",
    9: "Prime Video",
    384: "Max (HBO)",
    337: "Disney+",
    350: "Apple TV+"
};

export class TMDBService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.cache = new Map();
        this.cacheExpiry = 1000 * 60 * 30; // 30 minutes
    }
    
    /**
     * Fetch popular movies from TMDB
     * @param {Number} pages - Number of pages to fetch (20 movies per page)
     * @returns {Array} Array of transformed movies
     */
    async fetchPopularMovies(pages = 5) {
        try {
            console.log('[TMDB] Fetching popular movies...');
            
            const allMovies = [];
            
            for (let page = 1; page <= pages; page++) {
                const url = `${TMDB_BASE_URL}/movie/popular?api_key=${this.apiKey}&language=en-US&page=${page}`;
                
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
                }
                
                const data = await response.json();
                
                // Transform each movie
                for (const movie of data.results) {
                    const transformedMovie = await this.transformMovie(movie);
                    allMovies.push(transformedMovie);
                }
                
                console.log(`[TMDB] Loaded page ${page}/${pages}`);
            }
            
            console.log(`[TMDB] Successfully loaded ${allMovies.length} movies`);
            return allMovies;
            
        } catch (error) {
            console.error('[TMDB] Error fetching movies:', error);
            throw error;
        }
    }
    
    /**
     * Fetch trending movies
     * @param {String} timeWindow - 'day' or 'week'
     * @returns {Array} Array of trending movies
     */
    async fetchTrendingMovies(timeWindow = 'week') {
        try {
            const url = `${TMDB_BASE_URL}/trending/movie/${timeWindow}?api_key=${this.apiKey}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`TMDB API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            const movies = await Promise.all(
                data.results.slice(0, 20).map(movie => this.transformMovie(movie))
            );
            
            return movies;
            
        } catch (error) {
            console.error('[TMDB] Error fetching trending:', error);
            return [];
        }
    }
    
    /**
     * Search movies by query
     * @param {String} query - Search query
     * @returns {Array} Array of matching movies
     */
    async searchMovies(query) {
        try {
            const url = `${TMDB_BASE_URL}/search/movie?api_key=${this.apiKey}&query=${encodeURIComponent(query)}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`TMDB API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            const movies = await Promise.all(
                data.results.slice(0, 20).map(movie => this.transformMovie(movie))
            );
            
            return movies;
            
        } catch (error) {
            console.error('[TMDB] Error searching movies:', error);
            return [];
        }
    }
    
    /**
     * Transform TMDB movie data to app format
     * @param {Object} tmdbMovie - Raw TMDB movie object
     * @returns {Object} Transformed movie object
     */
    async transformMovie(tmdbMovie) {
        // Check cache first
        const cacheKey = `movie-${tmdbMovie.id}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        // Get additional details
        const details = await this.getMovieDetails(tmdbMovie.id);
        const credits = await this.getMovieCredits(tmdbMovie.id);
        const providers = await this.getStreamingProviders(tmdbMovie.id);
        
        const transformed = {
            id: `tmdb-${tmdbMovie.id}`,
            tmdbId: tmdbMovie.id,
            title: tmdbMovie.title,
            year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : null,
            genre: this.getGenreNames(tmdbMovie.genre_ids || details.genres?.map(g => g.id) || []),
            type: "Movie",
            runtime: details.runtime ? `${details.runtime} min` : 'N/A',
            imdb: tmdbMovie.vote_average ? parseFloat(tmdbMovie.vote_average.toFixed(1)) : null,
            rt: null, // TMDB doesn't have RT scores
            platform: providers[0] || this.assignRandomPlatform(),
            actors: credits.cast?.slice(0, 3).map(actor => actor.name) || [],
            director: credits.crew?.find(person => person.job === 'Director')?.name,
            trigger: this.inferTriggerWarnings(tmdbMovie.genre_ids || [], details),
            synopsis: tmdbMovie.overview || 'No description available.',
            mood: this.inferMood(tmdbMovie.genre_ids || []),
            poster_path: tmdbMovie.poster_path ? `${TMDB_IMAGE_BASE}/w500${tmdbMovie.poster_path}` : null,
            backdrop_path: tmdbMovie.backdrop_path ? `${TMDB_IMAGE_BASE}/w1280${tmdbMovie.backdrop_path}` : null,
            popularity: tmdbMovie.popularity,
            vote_count: tmdbMovie.vote_count
        };
        
        // Cache the result
        this.setCache(cacheKey, transformed);
        
        return transformed;
    }
    
    /**
     * Get detailed movie information
     * @param {Number} movieId - TMDB movie ID
     * @returns {Object} Movie details
     */
    async getMovieDetails(movieId) {
        const cacheKey = `details-${movieId}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${this.apiKey}`;
            const response = await fetch(url);
            
            if (!response.ok) return {};
            
            const data = await response.json();
            this.setCache(cacheKey, data);
            return data;
            
        } catch (error) {
            console.error(`[TMDB] Error fetching details for ${movieId}:`, error);
            return {};
        }
    }
    
    /**
     * Get movie credits (cast and crew)
     * @param {Number} movieId - TMDB movie ID
     * @returns {Object} Credits data
     */
    async getMovieCredits(movieId) {
        const cacheKey = `credits-${movieId}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const url = `${TMDB_BASE_URL}/movie/${movieId}/credits?api_key=${this.apiKey}`;
            const response = await fetch(url);
            
            if (!response.ok) return { cast: [], crew: [] };
            
            const data = await response.json();
            this.setCache(cacheKey, data);
            return data;
            
        } catch (error) {
            console.error(`[TMDB] Error fetching credits for ${movieId}:`, error);
            return { cast: [], crew: [] };
        }
    }
    
    /**
     * Get streaming providers for a movie
     * @param {Number} movieId - TMDB movie ID
     * @returns {Array} Array of platform names
     */
    async getStreamingProviders(movieId) {
        const cacheKey = `providers-${movieId}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const url = `${TMDB_BASE_URL}/movie/${movieId}/watch/providers?api_key=${this.apiKey}`;
            const response = await fetch(url);
            
            if (!response.ok) return [];
            
            const data = await response.json();
            
            // Get US providers (flatrate = subscription streaming)
            const usProviders = data.results?.US?.flatrate || [];
            
            const platforms = usProviders
                .map(provider => PLATFORM_PROVIDERS[provider.provider_id])
                .filter(Boolean);
            
            this.setCache(cacheKey, platforms);
            return platforms;
            
        } catch (error) {
            console.error(`[TMDB] Error fetching providers for ${movieId}:`, error);
            return [];
        }
    }
    
    /**
     * Convert genre IDs to genre names
     * @param {Array} genreIds - Array of genre IDs
     * @returns {String} Formatted genre string
     */
    getGenreNames(genreIds) {
        if (!genreIds || genreIds.length === 0) return 'Unknown';
        
        const genres = genreIds
            .map(id => GENRE_MAP[id])
            .filter(Boolean)
            .slice(0, 3); // Max 3 genres
        
        return genres.join(' / ') || 'Unknown';
    }
    
    /**
     * Assign a random streaming platform (fallback)
     * @returns {String} Platform name
     */
    assignRandomPlatform() {
        const platforms = Object.values(PLATFORM_PROVIDERS);
        return platforms[Math.floor(Math.random() * platforms.length)];
    }
    
    /**
     * Infer trigger warnings from genres and content
     * @param {Array} genreIds - Genre IDs
     * @param {Object} details - Movie details
     * @returns {Array} Array of trigger warnings
     */
    inferTriggerWarnings(genreIds, details) {
        const warnings = [];
        
        // Horror movies
        if (genreIds.includes(27)) {
            warnings.push('Jump Scares', 'Gore');
        }
        
        // Action movies
        if (genreIds.includes(28)) {
            warnings.push('High Violence');
        }
        
        // War movies
        if (genreIds.includes(10752)) {
            warnings.push('War Violence', 'Emotional Loss');
        }
        
        // Check adult rating
        if (details.adult) {
            warnings.push('Adult Content');
        }
        
        return warnings;
    }
    
    /**
     * Infer mood from genres
     * @param {Array} genreIds - Genre IDs
     * @returns {String} Mood description
     */
    inferMood(genreIds) {
        const moodMap = {
            28: "Action-packed, Adrenaline-fueled",
            35: "Funny, Light-hearted",
            18: "Emotional, Thought-provoking",
            27: "Scary, Suspenseful",
            878: "Mind-bending, Futuristic",
            10749: "Romantic, Feel-good",
            16: "Whimsical, Animated",
            80: "Intense, Gripping",
            9648: "Mysterious, Intriguing",
            53: "Thrilling, Edge-of-your-seat",
            12: "Adventurous, Epic",
            14: "Magical, Fantastical"
        };
        
        // Get the first matching mood
        for (const genreId of genreIds) {
            if (moodMap[genreId]) {
                return moodMap[genreId];
            }
        }
        
        return "Entertaining, Engaging";
    }
    
    /**
     * Cache management
     */
    setCache(key, value) {
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }
    
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        // Check if expired
        if (Date.now() - cached.timestamp > this.cacheExpiry) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.value;
    }
    
    clearCache() {
        this.cache.clear();
    }
}

// Singleton instance (will be initialized with API key)
let tmdbServiceInstance = null;

export function initTMDBService(apiKey) {
    tmdbServiceInstance = new TMDBService(apiKey);
    return tmdbServiceInstance;
}

export function getTMDBService() {
    if (!tmdbServiceInstance) {
        throw new Error('TMDB Service not initialized. Call initTMDBService(apiKey) first.');
    }
    return tmdbServiceInstance;
}
