/**
 * TMDB Service
 * Handles all interactions with The Movie Database API
 */

import { ENV } from '../config/env.js';

// Genre IDs from TMDB
export const GENRE_IDS = {
    ACTION: 28,
    ADVENTURE: 12,
    ANIMATION: 16,
    COMEDY: 35,
    CRIME: 80,
    DOCUMENTARY: 99,
    DRAMA: 18,
    FAMILY: 10751,
    FANTASY: 14,
    HISTORY: 36,
    HORROR: 27,
    MUSIC: 10402,
    MYSTERY: 9648,
    ROMANCE: 10749,
    SCIFI: 878,
    THRILLER: 53,
    WAR: 10752,
    WESTERN: 37
};

// Genre ID to name mapping
const GENRE_MAP = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
    99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
    27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
    53: 'Thriller', 10752: 'War', 37: 'Western'
};

class TMDBService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.themoviedb.org/3';
        this.imageBaseUrl = 'https://image.tmdb.org/t/p';
    }
    
    /**
     * Transform TMDB movie data to our app format
     */
    transformMovie(tmdbMovie) {
        const platforms = ['Netflix', 'Hulu', 'Prime Video', 'Disney+', 'HBO Max', 'Apple TV+'];
        
        // Deterministic platform assignment (same movie = same platform)
        const seed = (tmdbMovie.release_date || '2000') + (tmdbMovie.title || '');
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash = hash & hash;
        }
        const platform = platforms[Math.abs(hash) % platforms.length];
        
        const primaryGenre = tmdbMovie.genre_ids && tmdbMovie.genre_ids.length > 0
            ? GENRE_MAP[tmdbMovie.genre_ids[0]] || 'Drama'
            : 'Drama';
        
        return {
            id: tmdbMovie.id,
            title: tmdbMovie.title,
            year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : null,
            release_date: tmdbMovie.release_date,
            genre: primaryGenre,
            genre_ids: tmdbMovie.genre_ids || [],
            synopsis: tmdbMovie.overview || 'No synopsis available.',
            overview: tmdbMovie.overview,
            imdb: tmdbMovie.vote_average ? tmdbMovie.vote_average.toFixed(1) : 'N/A',
            vote_average: tmdbMovie.vote_average,
            vote_count: tmdbMovie.vote_count,
            poster_path: tmdbMovie.poster_path 
                ? `${this.imageBaseUrl}/w500${tmdbMovie.poster_path}` 
                : null,
            backdrop_path: tmdbMovie.backdrop_path
                ? `${this.imageBaseUrl}/w1280${tmdbMovie.backdrop_path}`
                : null,
            platform: platform,
            cast: tmdbMovie.credits?.cast?.slice(0, 6).map(p => p.name) || [],
            runtime: tmdbMovie.runtime ? `${tmdbMovie.runtime} min` : null, // FIXED: Runtime
            triggerWarnings: this.inferTriggerWarnings(tmdbMovie),
            popularity: tmdbMovie.popularity
        };
    }

    inferTriggerWarnings(movie) {
        const warnings = [];
        const genreId = movie.genre_ids?.[0];
        if (genreId === 27) warnings.push('Violence', 'Gore', 'Jump Scares');
        if ([28, 53].includes(genreId)) warnings.push('Violence', 'Intense Scenes');
        if (genreId === 10752) warnings.push('War Violence', 'Death');
        return warnings;
    }

    /**
     * Fetch popular movies
     */
    async fetchPopularMovies(pages = 5, startPage = 1) {
        const allMovies = [];
        
        try {
            for (let page = startPage; page < startPage + pages; page++) {
                const response = await fetch(
                    `${this.baseUrl}/movie/popular?api_key=${this.apiKey}&page=${page}&language=en-US`
                );
                
                if (!response.ok) {
                    console.error(`[TMDB] Failed to fetch popular movies page ${page}`);
                    break;
                }
                
                const data = await response.json();
                const movies = data.results.map(movie => this.transformMovie(movie));
                allMovies.push(...movies);
                
                if (ENV.APP.debug) {
                    console.log(`[TMDB] Loaded popular page ${page}, ${movies.length} movies`);
                }
            }
            
            return allMovies;
            
        } catch (error) {
            console.error('[TMDB] Error fetching popular movies:', error);
            return allMovies;
        }
    }
    
    /**
     * Fetch trending movies (this week)
     */
    async fetchTrendingMovies() {
        try {
            const response = await fetch(
                `${this.baseUrl}/trending/movie/week?api_key=${this.apiKey}`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch trending movies');
            }
            
            const data = await response.json();
            return data.results.map(movie => this.transformMovie(movie));
            
        } catch (error) {
            console.error('[TMDB] Error fetching trending movies:', error);
            return [];
        }
    }
    
    /**
     * Fetch top-rated movies
     */
    async fetchTopRatedMovies(pages = 5) {
        const allMovies = [];
        
        try {
            for (let page = 1; page <= pages; page++) {
                const response = await fetch(
                    `${this.baseUrl}/movie/top_rated?api_key=${this.apiKey}&page=${page}&language=en-US`
                );
                
                if (!response.ok) {
                    console.error(`[TMDB] Failed to fetch top-rated movies page ${page}`);
                    break;
                }
                
                const data = await response.json();
                const movies = data.results.map(movie => this.transformMovie(movie));
                allMovies.push(...movies);
                
                if (ENV.APP.debug) {
                    console.log(`[TMDB] Loaded top-rated page ${page}, ${movies.length} movies`);
                }
            }
            
            return allMovies;
            
        } catch (error) {
            console.error('[TMDB] Error fetching top-rated movies:', error);
            return allMovies;
        }
    }
    
    /**
     * Fetch upcoming movies
     */
    async fetchUpcomingMovies(pages = 5) {
        const allMovies = [];
        
        try {
            for (let page = 1; page <= pages; page++) {
                const response = await fetch(
                    `${this.baseUrl}/movie/upcoming?api_key=${this.apiKey}&page=${page}&language=en-US`
                );
                
                if (!response.ok) {
                    console.error(`[TMDB] Failed to fetch upcoming movies page ${page}`);
                    break;
                }
                
                const data = await response.json();
                const movies = data.results.map(movie => this.transformMovie(movie));
                allMovies.push(...movies);
                
                if (ENV.APP.debug) {
                    console.log(`[TMDB] Loaded upcoming page ${page}, ${movies.length} movies`);
                }
            }
            
            return allMovies;
            
        } catch (error) {
            console.error('[TMDB] Error fetching upcoming movies:', error);
            return allMovies;
        }
    }
    
    /**
     * Fetch now playing movies
     */
    async fetchNowPlayingMovies(pages = 5) {
        const allMovies = [];
        
        try {
            for (let page = 1; page <= pages; page++) {
                const response = await fetch(
                    `${this.baseUrl}/movie/now_playing?api_key=${this.apiKey}&page=${page}&language=en-US`
                );
                
                if (!response.ok) {
                    console.error(`[TMDB] Failed to fetch now playing movies page ${page}`);
                    break;
                }
                
                const data = await response.json();
                const movies = data.results.map(movie => this.transformMovie(movie));
                allMovies.push(...movies);
                
                if (ENV.APP.debug) {
                    console.log(`[TMDB] Loaded now playing page ${page}, ${movies.length} movies`);
                }
            }
            
            return allMovies;
            
        } catch (error) {
            console.error('[TMDB] Error fetching now playing movies:', error);
            return allMovies;
        }
    }
    
    /**
     * Fetch movies by genre
     */
    async fetchMoviesByGenre(genreId, pages = 5) {
        const allMovies = [];
        
        try {
            for (let page = 1; page <= pages; page++) {
                const response = await fetch(
                    `${this.baseUrl}/discover/movie?api_key=${this.apiKey}&with_genres=${genreId}&page=${page}&language=en-US&sort_by=popularity.desc`
                );
                
                if (!response.ok) {
                    console.error(`[TMDB] Failed to fetch movies by genre ${genreId} page ${page}`);
                    break;
                }
                
                const data = await response.json();
                const movies = data.results.map(movie => this.transformMovie(movie));
                allMovies.push(...movies);
                
                if (ENV.APP.debug) {
                    console.log(`[TMDB] Loaded genre ${genreId} page ${page}, ${movies.length} movies`);
                }
            }
            
            return allMovies;
            
        } catch (error) {
            console.error('[TMDB] Error fetching movies by genre:', error);
            return allMovies;
        }
    }
    
    /**
     * Search movies by query
     */
    async searchMovies(query, pages = 3) {
        const allMovies = [];
        
        try {
            for (let page = 1; page <= pages; page++) {
                const response = await fetch(
                    `${this.baseUrl}/search/movie?api_key=${this.apiKey}&query=${encodeURIComponent(query)}&page=${page}&language=en-US`
                );
                
                if (!response.ok) {
                    console.error(`[TMDB] Failed to search movies page ${page}`);
                    break;
                }
                
                const data = await response.json();
                const movies = data.results.map(movie => this.transformMovie(movie));
                allMovies.push(...movies);
                
                if (data.results.length === 0) break; // No more results
            }
            
            return allMovies;
            
        } catch (error) {
            console.error('[TMDB] Error searching movies:', error);
            return allMovies;
        }
    }
    
    /**
     * Get movie details by ID
     */
    async getMovieDetails(movieId) {
        try {
            const response = await fetch(
                `${this.baseUrl}/movie/${movieId}?api_key=${this.apiKey}&language=en-US&append_to_response=credits,videos`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch movie details');
            }
            
            const data = await response.json();
            const movie = this.transformMovie(data);
            
            // Add cast
            if (data.credits && data.credits.cast) {
                movie.cast = data.credits.cast.slice(0, 5).map(person => person.name);
            }
            
            // Add director
            if (data.credits && data.credits.crew) {
                const director = data.credits.crew.find(person => person.job === 'Director');
                if (director) {
                    movie.director = director.name;
                }
            }
            
            // Add trailer
            if (data.videos && data.videos.results) {
                const trailer = data.videos.results.find(video => 
                    video.type === 'Trailer' && video.site === 'YouTube'
                );
                if (trailer) {
                    movie.trailer = `https://www.youtube.com/watch?v=${trailer.key}`;
                }
            }
            
            return movie;
            
        } catch (error) {
            console.error('[TMDB] Error fetching movie details:', error);
            return null;
        }
    }

    async getMovieTrailer(movieId) {
        try {
            const data = await this.request(`/movie/${movieId}/videos`);
            const trailer = data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
            return trailer ? trailer.key : null;
        } catch (e) {
            console.error('[TMDB] Trailer fetch error:', e);
            return null;
        }
    }

    async request(endpoint, params = {}) {
        const url = `${this.baseUrl}${endpoint}?api_key=${this.apiKey}&${new URLSearchParams(params)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }
}

// FIXED: Lazy initialization — works even if key is set after import
let tmdbServiceInstance = null;

export function getTMDBService() {
    if (!tmdbServiceInstance && window.__tmdb_api_key) {
        tmdbServiceInstance = new TMDBService(window.__tmdb_api_key);
        if (ENV.APP.debug) console.log('[TMDB] Service initialized (lazy)');
    }
    return tmdbServiceInstance;
}

export { TMDBService };
