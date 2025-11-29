/**
 * TMDB Service - WITH TRAILER SUPPORT
 * Handles all TMDB API interactions including trailers
 */

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const CACHE_EXPIRY = 1000 * 60 * 30; // 30 minutes

class TMDBService {
    constructor() {
        this.apiKey = window.__tmdb_api_key || null;
        this.cache = new Map();
        console.log('[TMDB] Service initialized with API key:', this.apiKey ? 'Present' : 'Missing');
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
            console.log('[TMDB] Trailer from cache:', cached);
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
            
            console.log('[TMDB] Trailer key:', trailerKey);
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
                console.log(`[TMDB] Loaded page ${page}/${totalPages}`);
                const movies = await this.fetchPage(page);
                allMovies.push(...movies);
            }
            
            console.log(`[TMDB] Successfully loaded ${allMovies.length} movies`);
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
            cast: [], // Not available without extra API call
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
        console.log('[TMDB] Using fallback movies');
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
            },
            {
                id: '27205',
                title: 'Inception',
                year: 2010,
                imdb: '8.8',
                synopsis: 'A thief who steals corporate secrets through dream-sharing technology.',
                genre: 'Action, Sci-Fi, Thriller',
                poster_path: null,
                platform: 'Netflix',
                runtime: '148 min',
                cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt'],
                mood: 'Mind-Bending',
                triggerWarnings: []
            },
            {
                id: '278',
                title: 'The Shawshank Redemption',
                year: 1994,
                imdb: '9.3',
                synopsis: 'Two imprisoned men bond over years, finding redemption.',
                genre: 'Drama',
                poster_path: null,
                platform: 'Prime Video',
                runtime: '142 min',
                cast: ['Tim Robbins', 'Morgan Freeman'],
                mood: 'Emotional',
                triggerWarnings: []
            },
            {
                id: '680',
                title: 'Pulp Fiction',
                year: 1994,
                imdb: '8.9',
                synopsis: 'The lives of two mob hitmen, a boxer, and a gangster intertwine.',
                genre: 'Crime, Drama',
                poster_path: null,
                platform: 'Netflix',
                runtime: '154 min',
                cast: ['John Travolta', 'Uma Thurman'],
                mood: 'Intense',
                triggerWarnings: ['Crime Violence']
            },
            {
                id: '155',
                title: 'The Dark Knight',
                year: 2008,
                imdb: '9.0',
                synopsis: 'Batman faces the Joker, a criminal mastermind.',
                genre: 'Action, Crime, Drama',
                poster_path: null,
                platform: 'HBO Max',
                runtime: '152 min',
                cast: ['Christian Bale', 'Heath Ledger'],
                mood: 'Dark',
                triggerWarnings: ['High Violence']
            },
            {
                id: '13',
                title: 'Forrest Gump',
                year: 1994,
                imdb: '8.8',
                synopsis: 'The presidencies of Kennedy and Johnson unfold through a slow-witted man.',
                genre: 'Drama, Romance',
                poster_path: null,
                platform: 'Prime Video',
                runtime: '142 min',
                cast: ['Tom Hanks', 'Robin Wright'],
                mood: 'Heartwarming',
                triggerWarnings: []
            },
            {
                id: '157336',
                title: 'Interstellar',
                year: 2014,
                imdb: '8.6',
                synopsis: 'A team of explorers travel through a wormhole in space.',
                genre: 'Adventure, Drama, Sci-Fi',
                poster_path: null,
                platform: 'Hulu',
                runtime: '169 min',
                cast: ['Matthew McConaughey', 'Anne Hathaway'],
                mood: 'Epic',
                triggerWarnings: []
            },
            {
                id: '238',
                title: 'The Godfather',
                year: 1972,
                imdb: '9.2',
                synopsis: 'The aging patriarch of an organized crime dynasty transfers control.',
                genre: 'Crime, Drama',
                poster_path: null,
                platform: 'Prime Video',
                runtime: '175 min',
                cast: ['Marlon Brando', 'Al Pacino'],
                mood: 'Intense',
                triggerWarnings: ['Crime Violence']
            },
            {
                id: '550',
                title: 'Fight Club',
                year: 1999,
                imdb: '8.8',
                synopsis: 'An insomniac office worker forms an underground fight club.',
                genre: 'Drama',
                poster_path: null,
                platform: 'Netflix',
                runtime: '139 min',
                cast: ['Brad Pitt', 'Edward Norton'],
                mood: 'Mind-Bending',
                triggerWarnings: ['High Violence']
            },
            {
                id: '1124',
                title: 'The Prestige',
                year: 2006,
                imdb: '8.5',
                synopsis: 'Two stage magicians engage in competitive one-upmanship.',
                genre: 'Drama, Mystery, Thriller',
                poster_path: null,
                platform: 'HBO Max',
                runtime: '130 min',
                cast: ['Christian Bale', 'Hugh Jackman'],
                mood: 'Mysterious',
                triggerWarnings: []
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
