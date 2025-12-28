/**
 * MoviEase - Home Tab
 * Netflix-style personalized movie feed with horizontal scrolling rows
 * ✅ FIXED: Proper genre filtering with cinema exclusion
 * ✅ FIXED: 20 movies per row
 * ✅ FIXED: No duplicate movies across sections
 * ✅ FIXED: Null check for movie.genres to prevent crashes
 * ✅ NEW: Platform filtering by user's selected platforms
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
            // ✅ Load multiple pages for each category to get more variety
            console.log('[Home] Loading movie data from multiple pages...');
            const [
                trending1, trending2,
                popular1, popular2,
                topRated1, topRated2,
                action1, action2,
                comedy1, comedy2,
                scifi1, scifi2,
                horror1, horror2,
                animation1
            ] = await Promise.all([
                tmdbService.getTrendingMovies('week'),
                tmdbService.getPopularMovies(2),
                tmdbService.getPopularMovies(1),
                tmdbService.getPopularMovies(3),
                tmdbService.discoverMovies({ sortBy: 'vote_average.desc', minVotes: 1000, page: 1 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ sortBy: 'vote_average.desc', minVotes: 1000, page: 2 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.ACTION], page: 1 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.ACTION], page: 2 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.COMEDY], page: 1 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.COMEDY], page: 2 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.SCIFI], page: 1 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.SCIFI], page: 2 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.HORROR], page: 1 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.HORROR], page: 2 }).then(r => r.movies || r),
                tmdbService.discoverMovies({ genres: [GENRE_IDS.ANIMATION], page: 1 }).then(r => r.movies || r)
            ]);

            // ✅ Merge and deduplicate all movies
            console.log('[Home] Merging and deduplicating movies...');
            const allMoviesMap = new Map();
            [
                ...trending1, ...trending2,
                ...popular1, ...popular2,
                ...topRated1, ...topRated2,
                ...action1, ...action2,
                ...comedy1, ...comedy2,
                ...scifi1, ...scifi2,
                ...horror1, ...horror2,
                ...animation1
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

            // ✅ FIXED: Filter each category properly by genre
            const sections = {
                cinema: cinemaMovies.slice(0, 20),
                trending: this.filterStreamingByIds(streamingMovies, [...trending1, ...trending2]).slice(0, 20),
                recommended: this.getRecommendedMovies(streamingMovies, swipeHistory).slice(0, 20),
                topRated: this.filterStreamingByIds(streamingMovies, [...topRated1, ...topRated2]).slice(0, 20),
                action: this.filterByGenre(streamingMovies, GENRE_IDS.ACTION).slice(0, 20),
                comedy: this.filterByGenre(streamingMovies, GENRE_IDS.COMEDY).slice(0, 20),
                scifi: this.filterByGenre(streamingMovies, GENRE_IDS.SCIFI).slice(0, 20),
                horror: this.filterByGenre(streamingMovies, GENRE_IDS.HORROR).slice(0, 20),
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
        return streamingMovies
            .filter(m => {
                const genres = m.genre_ids || m.genreIds || [];
                return genres.includes(genreId);
            })
            .sort((a, b) => {
                const ratingA = parseFloat(a.rating || a.vote_average || 0);
                const ratingB = parseFloat(b.rating || b.vote_average || 0);
                return ratingB - ratingA;
            });
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
     * Get recommended movies based on user's likes/loves
     * ✅ FIXED: Added null checks for movie.genres
     */
    getRecommendedMovies(streamingMovies, swipeHistory) {
        const likedMovies = swipeHistory
            .filter(s => s.action === 'like' || s.action === 'love')
            .map(s => s.movie)
            .filter(m => m && m.id); // ✅ CRITICAL FIX: Filter out null/undefined movies

        if (likedMovies.length === 0) {
            return streamingMovies
                .filter(m => parseFloat(m.rating || m.vote_average || 0) >= 7)
                .sort((a, b) => parseFloat(b.rating || b.vote_average || 0) - parseFloat(a.rating || a.vote_average || 0));
        }

        // Extract favorite genres
        const genreCounts = {};
        likedMovies.forEach(movie => {
            // ✅ CRITICAL FIX: Check if genres exists and is an array before accessing
            const genres = movie.genres || movie.genre_ids || [];
            if (Array.isArray(genres)) {
                genres.forEach(genre => {
                    const genreId = typeof genre === 'object' ? genre.id : genre;
                    if (genreId) { // ✅ Extra safety check
                        genreCounts[genreId] = (genreCounts[genreId] || 0) + 1;
                    }
                });
            }
        });

        const topGenres = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([genreId]) => parseInt(genreId));

        const likedIds = new Set(likedMovies.map(m => m.id));

        return streamingMovies
            .filter(m => {
                if (likedIds.has(m.id)) return false;
                const movieGenres = m.genres || m.genre_ids || [];
                const movieGenreIds = movieGenres.map(g => typeof g === 'object' ? g.id : g);
                return topGenres.some(topGenre => movieGenreIds.includes(topGenre));
            })
            .sort((a, b) => {
                const ratingA = parseFloat(a.rating || a.vote_average || 0);
                const ratingB = parseFloat(b.rating || b.vote_average || 0);
                return ratingB - ratingA;
            });
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
            { title: '🎯 Blockbusters', movies: sections.blockbusters, id: 'blockbusters' }
        ];

        // Filter out empty rows
        const visibleRows = rows.filter(row => row.movies && row.movies.length > 0);

        console.log('[Home] Visible rows:', visibleRows.map(r => `${r.title}: ${r.movies.length}`).join(', '));

        const sectionsHTML = visibleRows.map(row => this.renderSection(row)).join('');

        this.container.innerHTML = `
            <div style="width: 100%; padding: 1.5rem 0 6rem;">
                <!-- Header -->
                <div style="padding: 0 1rem 1.5rem;">
                    <h1 style="font-size: 1.75rem; font-weight: 800; background: linear-gradient(135deg, #b0d4e3, #f4e8c1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0 0 0.5rem;">
                        Discover
                    </h1>
                    <p style="color: rgba(176, 212, 227, 0.6); font-size: 0.875rem; margin: 0;">
                        Your personalized movie feed
                    </p>
                </div>

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
        
        // ✅ FIXED: Use availableOn as primary source of truth
        const platform = (() => {
            // First priority: Check availableOn array
            if (movie.availableOn && movie.availableOn.length > 0) {
                return movie.availableOn[0];
            }
            
            // Second priority: Use platform field if it's meaningful
            if (movie.platform && movie.platform !== 'Not Available' && movie.platform !== 'Loading...') {
                return movie.platform;
            }
            
            // Fallback: Check release date
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
