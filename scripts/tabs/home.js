/**
 * MoviEase - Home Tab - IMPROVED VERSION
 * ✅ FIXED: Better recommendations using genre_ids from swipes
 * ✅ FIXED: Load more pages for Horror (4 pages = 80 movies)
 * ✅ FIXED: Load more pages for Blockbusters
 * ✅ FIXED: Smarter genre matching with fallbacks
 */

import { tmdbService } from '../services/tmdb.js';
import { store } from '../state/store.js';
import { movieModal } from '../components/movie-modal.js';
import { renderTriggerBadge } from '../utils/trigger-warnings.js';

const GENRE_IDS = {
    ACTION: 28,
    COMEDY: 35,
    DRAMA: 18,
    HORROR: 27,
    SCIFI: 878,
    THRILLER: 53,
    ROMANCE: 10749,
    ANIMATION: 16,
    DOCUMENTARY: 99,
    FANTASY: 14
};

// ✅ CRITICAL: Map genre names to IDs (for swipe history compatibility)
const GENRE_NAME_TO_ID = {
    'Action': 28,
    'Adventure': 12,
    'Animation': 16,
    'Comedy': 35,
    'Crime': 80,
    'Documentary': 99,
    'Drama': 18,
    'Family': 10751,
    'Fantasy': 14,
    'History': 36,
    'Horror': 27,
    'Music': 10402,
    'Mystery': 9648,
    'Romance': 10749,
    'Science Fiction': 878,
    'TV Movie': 10770,
    'Thriller': 53,
    'War': 10752,
    'Western': 37
};

export class HomeTab {
    constructor() {
        this.container = null;
        this.allMovies = [];
    }

    async render(container) {
        console.log('[Home] Rendering Netflix-style home tab...');
        this.container = container;

        // Show loading state
        this.container.innerHTML = `
            <div style="
                width: 100%;
                padding: 1.5rem 0 6rem;
            ">
                <div style="display: flex; align-items: center; justify-content: center; height: calc(100vh - 10rem); flex-direction: column; gap: 1rem;">
                    <div style="width: 48px; height: 48px; border: 4px solid rgba(176, 212, 227, 0.2); border-top-color: #b0d4e3; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <p style="color: rgba(176, 212, 227, 0.7); font-size: 0.875rem;">Loading your personalized feed...</p>
                </div>
                <style>@keyframes spin { to { transform: rotate(360deg); }}</style>
            </div>
        `;

        try {
            // ✅ IMPROVED: Load 4 pages for Horror, Thriller, Blockbusters to get 20 movies each
            console.log('[Home] Loading movie data from multiple pages...');
            const [
                trending1, trending2,
                popular1, popular2, popular3,
                topRated1, topRated2, topRated3,
                action1, action2, action3,
                comedy1, comedy2, comedy3,
                scifi1, scifi2, scifi3,
                horror1, horror2, horror3, horror4, // ✅ NEW: 4 pages for horror
                animation1, animation2,
                thriller1, thriller2, thriller3 // ✅ NEW: 3 pages for thriller
            ] = await Promise.all([
                tmdbService.getTrendingMovies('week'),
                tmdbService.getPopularMovies(2),
                tmdbService.getPopularMovies(1),
                tmdbService.getPopularMovies(3),
                tmdbService.getPopularMovies(4),
                tmdbService.discoverMovies({ sortBy: 'vote_average.desc', minVotes: 1000, page: 1 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ sortBy: 'vote_average.desc', minVotes: 1000, page: 2 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ sortBy: 'vote_average.desc', minVotes: 1000, page: 3 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.ACTION], page: 1 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.ACTION], page: 2 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.ACTION], page: 3 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.COMEDY], page: 1 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.COMEDY], page: 2 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.COMEDY], page: 3 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.SCIFI], page: 1 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.SCIFI], page: 2 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.SCIFI], page: 3 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.HORROR], page: 1 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.HORROR], page: 2 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.HORROR], page: 3 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.HORROR], page: 4 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.ANIMATION], page: 1 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.ANIMATION], page: 2 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.THRILLER], page: 1 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.THRILLER], page: 2 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.THRILLER], page: 3 }).then(r => r.movies || r)
            ]);

            // ✅ Merge and deduplicate all movies
            console.log('[Home] Merging and deduplicating movies...');
            const allMoviesMap = new Map();
            [
                ...trending1, ...trending2,
                ...popular1, ...popular2, ...popular3,
                ...topRated1, ...topRated2, ...topRated3,
                ...action1, ...action2, ...action3,
                ...comedy1, ...comedy2, ...comedy3,
                ...scifi1, ...scifi2, ...scifi3,
                ...horror1, ...horror2, ...horror3, ...horror4,
                ...animation1, ...animation2,
                ...thriller1, ...thriller2, ...thriller3
            ].forEach(m => {
                if (m && m.id) allMoviesMap.set(m.id, m);
            });
            
            this.allMovies = Array.from(allMoviesMap.values());
            
            // ✅ Enrich with platform data
            console.log(`[Home] Enriching ${this.allMovies.length} movies with platform data...`);
            await this.enrichWithPlatformData(this.allMovies);
            console.log('[Home] ✅ Platform data loaded');

            // ✅ CRITICAL: Filter by user's selected platforms
            const beforePlatformFilter = this.allMovies.length;
            this.allMovies = tmdbService.filterByUserPlatforms(this.allMovies);
            console.log(`[Home] Platform filter: ${beforePlatformFilter} → ${this.allMovies.length} movies`);

            // ✅ Separate movies by cinema status FIRST
            const cinemaMovies = this.filterCinemaMovies(this.allMovies);
            const streamingMovies = this.filterStreamingMovies(this.allMovies);

            console.log(`[Home] Cinema: ${cinemaMovies.length}, Streaming: ${streamingMovies.length}`);

            // Get user preferences for recommendations
            const state = store.getState();
            const swipeHistory = state.swipeHistory || [];

            // ✅ IMPROVED: Generate recommendations based on liked movies
            const recommendedMovies = this.getRecommendedMovies(streamingMovies, swipeHistory);
            const likedCount = swipeHistory.filter(s => s.action === 'like' || s.action === 'love').length;
            console.log(`[Home] Generated ${recommendedMovies.length} recommendations based on ${likedCount} liked/loved movies`);

            // ✅ Filter each category properly by genre
            const sections = {
                cinema: cinemaMovies.slice(0, 20),
                trending: this.filterStreamingByIds(streamingMovies, [...trending1, ...trending2]).slice(0, 20),
                recommended: recommendedMovies.slice(0, 20),
                topRated: this.filterStreamingByIds(streamingMovies, [...topRated1, ...topRated2, ...topRated3]).slice(0, 20),
                action: this.filterByGenre(streamingMovies, GENRE_IDS.ACTION).slice(0, 20),
                comedy: this.filterByGenre(streamingMovies, GENRE_IDS.COMEDY).slice(0, 20),
                scifi: this.filterByGenre(streamingMovies, GENRE_IDS.SCIFI).slice(0, 20),
                horror: this.filterByGenre(streamingMovies, GENRE_IDS.HORROR).slice(0, 20),
                thriller: this.filterByGenre(streamingMovies, GENRE_IDS.THRILLER).slice(0, 20),
                blockbusters: this.getBlockbusters(streamingMovies).slice(0, 20)
            };

            console.log('[Home] Section counts:', Object.entries(sections).map(([key, movies]) => `${key}: ${movies.length}`).join(', '));

            // Render the Netflix-style feed
            this.renderFeed(sections);

        } catch (error) {
            console.error('[Home] Failed to load content:', error);
            this.container.innerHTML = `
                <div style="width: 100%; padding: 1.5rem 0 6rem;">
                    <div style="display: flex; align-items: center; justify-content: center; height: calc(100vh - 10rem); flex-direction: column; gap: 1rem; padding: 2rem; text-align: center;">
                        <div style="font-size: 3rem;">⚠️</div>
                        <h3 style="color: white; font-size: 1.25rem; font-weight: 700;">Failed to Load Content</h3>
                        <p style="color: rgba(176, 212, 227, 0.6); font-size: 0.875rem;">Please try refreshing the page</p>
                        <button onclick="location.reload()" style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #b0d4e3, #f4e8c1); border: none; border-radius: 0.75rem; color: #1a1f2e; font-weight: 600; cursor: pointer; margin-top: 1rem;">
                            Refresh
                        </button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Enrich movies with platform data
     */
    async enrichWithPlatformData(movies, options = { maxConcurrent: 10, delay: 30 }) {
        if (!movies || movies.length === 0) return movies;

        const { maxConcurrent, delay } = options;
        
        for (let i = 0; i < movies.length; i += maxConcurrent) {
            const batch = movies.slice(i, i + maxConcurrent);
            
            await Promise.all(
                batch.map(async (movie) => {
                    if (tmdbService.getWatchProviders) {
                        movie.availableOn = await tmdbService.getWatchProviders(movie.id);
                        
                        if (!movie.availableOn || movie.availableOn.length === 0) {
                            const releaseDate = new Date(movie.releaseDate || movie.release_date);
                            const sixMonthsAgo = new Date();
                            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                            
                            if (releaseDate > sixMonthsAgo) {
                                movie.platform = 'In Cinemas';
                            } else {
                                movie.platform = 'Not Available';
                            }
                        } else {
                            movie.platform = movie.availableOn[0];
                        }
                    }
                })
            );
            
            if (i + maxConcurrent < movies.length) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        return movies;
    }

    /**
     * Filter movies that are in cinemas
     */
    filterCinemaMovies(movies) {
        return movies
            .filter(m => m.platform === 'In Cinemas')
            .sort((a, b) => {
                const dateA = new Date(a.releaseDate || a.release_date);
                const dateB = new Date(b.releaseDate || b.release_date);
                return dateB - dateA;
            });
    }

    /**
     * Filter movies that are on streaming (exclude cinema and not available)
     */
    filterStreamingMovies(movies) {
        return movies.filter(m => 
            m.platform !== 'In Cinemas' && 
            m.platform !== 'Not Available'
        );
    }

    /**
     * Filter streaming movies by matching IDs from source list
     */
    filterStreamingByIds(streamingMovies, sourceList) {
        const streamingIds = new Set(streamingMovies.map(m => m.id));
        return sourceList.filter(m => streamingIds.has(m.id));
    }

    /**
     * Filter movies by specific genre ID
     */
    filterByGenre(streamingMovies, genreId) {
        console.log(`[Home] 🔍 Filtering for genre ID ${genreId} from ${streamingMovies.length} movies`);
        
        const filtered = streamingMovies
            .filter(m => {
                // Get genres from movie (could be array of IDs or names)
                const genres = m.genres || m.genre_ids || m.genreIds || [];
                
                // ✅ DEBUG: Log first movie's genre format
                if (streamingMovies.indexOf(m) === 0) {
                    console.log(`[Home] 🔍 Sample movie "${m.title}" genres:`, genres);
                }
                
                // Map genre data to IDs (handle both formats)
                const movieGenreIds = genres.map(g => {
                    // Handle {id: 27, name: "Horror"}
                    if (typeof g === 'object' && g.id) {
                        return g.id;
                    }
                    // Handle plain number: 27
                    else if (typeof g === 'number') {
                        return g;
                    }
                    // Handle genre name string: "Horror" → 27
                    else if (typeof g === 'string') {
                        return GENRE_NAME_TO_ID[g];
                    }
                    return null;
                }).filter(id => id !== null && id !== undefined);
                
                return movieGenreIds.includes(genreId);
            })
            .sort((a, b) => {
                const ratingA = parseFloat(a.rating || a.vote_average || 0);
                const ratingB = parseFloat(b.rating || b.vote_average || 0);
                return ratingB - ratingA;
            });
        
        console.log(`[Home] ✅ Found ${filtered.length} movies for genre ${genreId}`);
        return filtered;
    }

    /**
     * Get blockbuster movies (high popularity + rating)
     */
    getBlockbusters(streamingMovies) {
        return streamingMovies
            .filter(m => {
                const rating = parseFloat(m.rating || m.vote_average || 0);
                const popularity = parseFloat(m.popularity || 0);
                return rating >= 6.5 && popularity >= 100;
            })
            .sort((a, b) => {
                const popA = parseFloat(a.popularity || 0);
                const popB = parseFloat(b.popularity || 0);
                return popB - popA;
            });
    }

    /**
     * ✅ IMPROVED: Get recommended movies based on user's likes/loves
     * Works with both old swipes (using genre_ids) and new swipes (using genres)
     */
    getRecommendedMovies(streamingMovies, swipeHistory) {
        // Get liked/loved movies
        const likedMovies = swipeHistory
            .filter(s => s.action === 'like' || s.action === 'love')
            .map(s => s.movie)
            .filter(m => m && m.id);

        console.log('[Home] Analyzing', likedMovies.length, 'liked movies for recommendations...');
        console.log('[Home] 🔍 Sample liked movie:', likedMovies[0]); // ✅ DEBUG

        // ✅ Fallback: If no liked movies, show high-rated movies
        if (likedMovies.length === 0) {
            console.log('[Home] No liked movies found, showing high-rated movies');
            return streamingMovies
                .filter(m => parseFloat(m.rating || m.vote_average || 0) >= 7)
                .sort((a, b) => parseFloat(b.rating || b.vote_average || 0) - parseFloat(a.rating || a.vote_average || 0));
        }

        // ✅ CRITICAL FIX: Extract genres from ALL possible locations
        const genreCounts = {};
        let moviesWithGenres = 0;
        
        likedMovies.forEach(movie => {
            // ✅ Check EVERY possible location for genre data
            const genreData = 
                movie.genres ||           // {id: 28, name: "Action"}[]
                movie.genre_ids ||        // [28, 35, 16]
                movie.genreIds ||         // [28, 35, 16]
                [];
            
            if (genreData && genreData.length > 0) {
                console.log(`[Home] 🎬 "${movie.title || 'Unknown'}" has genres:`, genreData); // ✅ DEBUG
                moviesWithGenres++;
                genreData.forEach(genre => {
                    let genreId;
                    
                    // Handle {id: 28, name: "Action"}
                    if (typeof genre === 'object' && genre.id) {
                        genreId = genre.id;
                    }
                    // Handle plain number: 28
                    else if (typeof genre === 'number') {
                        genreId = genre;
                    }
                    // ✅ CRITICAL FIX: Handle genre NAME strings: "Action" -> 28
                    else if (typeof genre === 'string') {
                        genreId = GENRE_NAME_TO_ID[genre];
                        if (genreId) {
                            console.log(`[Home] ✅ Mapped "${genre}" → ${genreId}`); // ✅ DEBUG
                        } else {
                            console.log(`[Home] ⚠️ Unknown genre name: "${genre}"`); // ✅ DEBUG
                        }
                    }
                    
                    if (genreId && typeof genreId === 'number') {
                        genreCounts[genreId] = (genreCounts[genreId] || 0) + 1;
                    } else {
                        console.log(`[Home] ❌ Could not extract genre from:`, genre); // ✅ DEBUG
                    }
                });
            } else {
                console.log(`[Home] ⚠️ "${movie.title || 'Unknown'}" has NO genre data`); // ✅ DEBUG
            }
        });

        console.log(`[Home] Found genre data in ${moviesWithGenres}/${likedMovies.length} liked movies`);
        console.log('[Home] Genre counts:', genreCounts);

        // ✅ Get top 3 genres OR fallback to popular genres
        let topGenres;
        if (Object.keys(genreCounts).length > 0) {
            // User has genre preferences
            topGenres = Object.entries(genreCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([genreId]) => parseInt(genreId));
            console.log('[Home] 🎯 Top genres from user:', topGenres, 'counts:', topGenres.map(id => genreCounts[id]));
        } else {
            // No genre data - use popular genres
            topGenres = [GENRE_IDS.ACTION, GENRE_IDS.COMEDY, GENRE_IDS.SCIFI];
            console.log('[Home] 🎯 No genre data - using popular genres:', topGenres);
        }

        // Filter out already-liked movies
        const likedIds = new Set(likedMovies.map(m => m.id));
        
        console.log(`[Home] 🔍 DEBUG: streamingMovies[0] genres:`, streamingMovies[0]?.genres || streamingMovies[0]?.genre_ids);
        console.log(`[Home] 🔍 DEBUG: Looking for genre IDs:`, topGenres);

        // ✅ Find movies matching top genres
        const recommended = streamingMovies
            .filter(m => {
                // Skip already liked
                if (likedIds.has(m.id)) return false;
                
                // ✅ CRITICAL FIX: Handle BOTH genre names AND genre IDs
                const movieGenres = m.genres || m.genre_ids || m.genreIds || [];
                
                // Extract genre IDs (handle objects, numbers, and NAME STRINGS)
                const movieGenreIds = movieGenres.map(g => {
                    if (typeof g === 'object' && g.id) {
                        return g.id; // {id: 28, name: "Action"}
                    } else if (typeof g === 'number') {
                        return g; // 28
                    } else if (typeof g === 'string') {
                        return GENRE_NAME_TO_ID[g]; // "Action" → 28
                    }
                    return null;
                }).filter(id => id !== null && id !== undefined);
                
                const matches = topGenres.some(topGenre => movieGenreIds.includes(topGenre));
                
                if (matches) {
                    console.log(`[Home] ✅ MATCH: "${m.title}" genres:`, movieGenres, '→ IDs:', movieGenreIds);
                }
                
                return matches;
            })
            .sort((a, b) => {
                const ratingA = parseFloat(a.rating || a.vote_average || 0);
                const ratingB = parseFloat(b.rating || b.vote_average || 0);
                return ratingB - ratingA;
            });

        console.log(`[Home] ✅ Found ${recommended.length} recommended movies matching genres:`, topGenres);
        return recommended;
    }

    renderFeed(sections) {
        const rows = [
            { title: '🎬 In Cinemas Now', movies: sections.cinema, id: 'cinema' },
            { title: '🔥 Trending This Week', movies: sections.trending, id: 'trending' },
            { title: '✨ Recommended for You', movies: sections.recommended, id: 'recommended' },
            { title: '🏆 Top Rated', movies: sections.topRated, id: 'topRated' },
            { title: '💥 Action & Adventure', movies: sections.action, id: 'action' },
            { title: '😂 Comedy', movies: sections.comedy, id: 'comedy' },
            { title: '🚀 Sci-Fi', movies: sections.scifi, id: 'scifi' },
            { title: '👻 Horror', movies: sections.horror, id: 'horror' },
            { title: '🎭 Thriller', movies: sections.thriller, id: 'thriller' },
            { title: '🎯 Blockbusters', movies: sections.blockbusters, id: 'blockbusters' }
        ];

        // Filter out empty rows
        const visibleRows = rows.filter(row => row.movies && row.movies.length > 0);

        console.log('[Home] Visible rows:', visibleRows.map(r => `${r.title}: ${r.movies.length}`).join(', '));

        const sectionsHTML = visibleRows.map(row => this.renderSection(row)).join('');

        this.container.innerHTML = `
            <div style="width: 100%; padding: 1.5rem 0 6rem;">
                <!-- Movie Rows -->
                ${sectionsHTML}
            </div>
        `;

        // Add click handlers to movie cards
        this.attachMovieClickHandlers();
    }

    renderSection(section) {
        if (!section.movies || section.movies.length === 0) return '';

        const moviesHTML = section.movies.map(movie => this.renderMovieCard(movie)).join('');

        return `
            <div style="margin-bottom: 2rem;">
                <!-- Section Title -->
                <h2 style="
                    color: white;
                    font-size: 1.125rem;
                    font-weight: 700;
                    padding: 0 1rem 1rem;
                    margin: 0;
                ">
                    ${section.title}
                </h2>

                <!-- Horizontal Scrolling Row -->
                <div style="
                    display: flex;
                    gap: 1rem;
                    overflow-x: auto;
                    padding: 0 1rem 1rem;
                    scroll-snap-type: x mandatory;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                ">
                    ${moviesHTML}
                </div>
            </div>
        `;
    }

    renderMovieCard(movie) {
        const posterURL = movie.posterURL || 
                         (movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null) ||
                         `https://via.placeholder.com/300x450/18183A/DFDFB0?text=${encodeURIComponent(movie.title)}`;
        const rating = movie.rating ? movie.rating.toFixed(1) : 'N/A';
        const year = movie.releaseDate ? movie.releaseDate.split('-')[0] : '';
        
        const hasTrailer = movie.trailerKey && movie.trailerKey.trim() !== '';
        const trailerUrl = hasTrailer ? `https://www.youtube.com/watch?v=${movie.trailerKey}` : null;
        
        const triggerBadgeHTML = renderTriggerBadge(movie, { size: 'small', position: 'top-left' });
        
        const platform = (() => {
            if (movie.availableOn && movie.availableOn.length > 0) {
                return movie.availableOn[0];
            }
            
            if (movie.platform && movie.platform !== 'Not Available' && movie.platform !== 'Loading...') {
                return movie.platform;
            }
            
            const releaseDate = new Date(movie.releaseDate || movie.release_date);
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            
            return releaseDate > sixMonthsAgo ? 'In Cinemas' : 'Not Available';
        })();
        
        let ratingColor = '#10b981';
        if (parseFloat(rating) < 5) ratingColor = '#ef4444';
        else if (parseFloat(rating) < 7) ratingColor = '#fbbf24';

        return `
            <div 
                class="home-movie-card" 
                data-movie-id="${movie.id}"
                style="
                    flex: 0 0 140px;
                    scroll-snap-align: start;
                    cursor: pointer;
                    transition: transform 0.2s;
                "
                onmouseover="this.style.transform='scale(1.05)'"
                onmouseout="this.style.transform='scale(1)'"
            >
                <div style="
                    position: relative;
                    width: 140px;
                    height: 210px;
                    border-radius: 0.75rem;
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    background: linear-gradient(135deg, rgba(176, 212, 227, 0.1), rgba(244, 232, 193, 0.1));
                ">
                    <img 
                        src="${posterURL}" 
                        alt="${movie.title}"
                        style="width: 100%; height: 100%; object-fit: cover;"
                        onerror="this.src='https://via.placeholder.com/300x450/18183A/DFDFB0?text=No+Poster'"
                    />
                    
                    ${hasTrailer ? `
                        <button 
                            class="trailer-btn"
                            data-trailer-url="${trailerUrl}"
                            onclick="event.stopPropagation(); window.open('${trailerUrl}', '_blank')"
                            style="
                                position: absolute;
                                top: 0.5rem;
                                right: 0.5rem;
                                width: 32px;
                                height: 32px;
                                background: rgba(255, 46, 99, 0.95);
                                border: 2px solid white;
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                cursor: pointer;
                                transition: all 0.2s;
                                z-index: 10;
                                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                            "
                            onmouseover="this.style.transform='scale(1.15)'; this.style.background='rgba(255, 46, 99, 1)'"
                            onmouseout="this.style.transform='scale(1)'; this.style.background='rgba(255, 46, 99, 0.95)'"
                            title="Watch Trailer"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </button>
                    ` : ''}
                    
                    ${triggerBadgeHTML}
                    
                    <div style="
                        position: absolute;
                        bottom: 3.5rem;
                        right: 0.5rem;
                        background: rgba(26, 31, 46, 0.95);
                        color: ${ratingColor};
                        padding: 3px 6px;
                        border-radius: 4px;
                        font-size: 0.7rem;
                        font-weight: 700;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                    ">
                        ⭐ ${rating}
                    </div>
                    
                    <div style="
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        background: linear-gradient(to top, rgba(26, 31, 46, 0.95), transparent);
                        padding: 0.75rem 0.5rem;
                        padding-top: 2rem;
                    ">
                        <h3 style="
                            font-size: 0.8rem;
                            font-weight: 600;
                            color: white;
                            margin: 0 0 0.25rem;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                        ">${movie.title}</h3>
                        
                        <p style="
                            font-size: 0.65rem;
                            color: rgba(176, 212, 227, 0.8);
                            margin: 0 0 0.25rem;
                        ">${year}</p>
                        
                        <div style="
                            display: inline-block;
                            background: rgba(176, 212, 227, 0.2);
                            border: 1px solid rgba(176, 212, 227, 0.3);
                            padding: 2px 6px;
                            border-radius: 3px;
                            font-size: 0.6rem;
                            color: #b0d4e3;
                            font-weight: 600;
                        ">
                            ${platform}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    attachMovieClickHandlers() {
        const movieCards = this.container.querySelectorAll('.home-movie-card');
        movieCards.forEach(card => {
            card.addEventListener('click', async () => {
                const movieId = parseInt(card.dataset.movieId);
                if (movieId && movieModal) {
                    const movie = await tmdbService.getMovieDetails(movieId);
                    if (movie) {
                        movieModal.show(movie);
                    }
                }
            });
        });
    }
}
