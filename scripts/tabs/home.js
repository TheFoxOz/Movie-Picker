/**
 * MoviEase - Home Tab
 * Personalized movie feed with horizontal scrolling rows
 * ✅ MoviEase branding and colors
 * ✅ FIXED: Proper scrolling functionality
 * ✅ Visible section headers
 * ✅ ADDED: Trailer buttons and trigger warnings
 * ✅ COLOR FIX: Powder Blue + Vanilla Custard gradients
 * ✅ PLATFORM BADGE: Added to movie cards
 * ✅ UNIVERSAL TRIGGER WARNINGS: Category-based badges with tooltips
 * ✅ FIXED: Platform data enrichment before display
 */

import { tmdbService } from '../services/tmdb.js';
import { store } from '../state/store.js';
import { movieModal } from '../components/movie-modal.js';
import { renderTriggerBadge } from '../utils/trigger-warnings.js';

export class HomeTab {
    constructor() {
        this.container = null;
    }

    async render(container) {
        console.log('[Home] Rendering home tab...');
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
            // Load movie data
            const [trending, popular, topRated] = await Promise.all([
                tmdbService.getTrendingMovies('week'),
                tmdbService.getPopularMovies(1),
                tmdbService.discoverMovies({ sortBy: 'vote_average.desc', minVotes: 1000, page: 1 })
            ]);

            // ✅ NEW: Enrich all movies with platform data
            console.log('[Home] Enriching movies with platform data...');
            const allMovies = [
                ...trending,
                ...popular,
                ...(topRated.movies || topRated || [])
            ];
            
            // Remove duplicates
            const uniqueMovies = Array.from(
                new Map(allMovies.map(m => [m.id, m])).values()
            );
            
            // Enrich with platform data (batch process)
            await this.enrichWithPlatformData(uniqueMovies);
            
            console.log('[Home] ✅ Platform data loaded');

            // Get user's genre preferences from swipe history
            const state = store.getState();
            const swipeHistory = state.swipeHistory || [];
            const favoriteGenres = this.getFavoriteGenres(swipeHistory);

            // Render the feed
            this.renderFeed(trending, popular, topRated.movies || topRated, favoriteGenres);

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
     * Batched to avoid rate limiting
     */
    async enrichWithPlatformData(movies, options = { maxConcurrent: 5, delay: 50 }) {
        if (!movies || movies.length === 0) return movies;

        const { maxConcurrent, delay } = options;
        
        console.log(`[Home] Enriching ${movies.length} movies with platforms...`);
        
        for (let i = 0; i < movies.length; i += maxConcurrent) {
            const batch = movies.slice(i, i + maxConcurrent);
            
            await Promise.all(
                batch.map(async (movie) => {
                    if (tmdbService.getWatchProviders) {
                        movie.availableOn = await tmdbService.getWatchProviders(movie.id);
                        
                        // ✅ FIXED: Smart platform assignment
                        if (!movie.availableOn || movie.availableOn.length === 0) {
                            // Check if movie is recent (released within last 6 months)
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
            
            // Rate limiting delay
            if (i + maxConcurrent < movies.length) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        console.log('[Home] ✅ Enrichment complete');
        return movies;
    }

    renderFeed(trending, popular, topRated, favoriteGenres) {
        const sections = [
            { title: '🔥 Trending This Week', movies: trending },
            { title: '⭐ Popular Now', movies: popular },
            { title: '🏆 Top Rated', movies: topRated }
        ];

        // Add genre-based sections if user has favorites
        if (favoriteGenres.length > 0) {
            favoriteGenres.slice(0, 2).forEach(genre => {
                const genreMovies = popular.filter(m => 
                    m.genres && m.genres.includes(genre)
                ).slice(0, 10);
                
                if (genreMovies.length > 0) {
                    sections.push({
                        title: `🎬 ${genre} Picks`,
                        movies: genreMovies
                    });
                }
            });
        }

        const sectionsHTML = sections.map(section => this.renderSection(section)).join('');

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

                <!-- Movie Sections -->
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
        const posterURL = movie.posterURL || `https://via.placeholder.com/300x450/18183A/DFDFB0?text=${encodeURIComponent(movie.title)}`;
        const rating = movie.rating ? movie.rating.toFixed(1) : 'N/A';
        const year = movie.releaseDate ? movie.releaseDate.split('-')[0] : '';
        
        // ✅ Trailer data
        const hasTrailer = movie.trailerKey && movie.trailerKey.trim() !== '';
        const trailerUrl = hasTrailer ? `https://www.youtube.com/watch?v=${movie.trailerKey}` : null;
        
        // ✅ NEW: Universal trigger warning badge
        const triggerBadgeHTML = renderTriggerBadge(movie, { size: 'small', position: 'top-left' });
        
        // ✅ FIXED: Smart platform display with "In Cinemas" support
        const platform = (() => {
            if (movie.platform && movie.platform !== 'Not Available') return movie.platform;
            if (movie.availableOn && movie.availableOn.length > 0) return movie.availableOn[0];
            
            // Check if recent release (in theaters)
            const releaseDate = new Date(movie.releaseDate || movie.release_date);
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            
            return releaseDate > sixMonthsAgo ? 'In Cinemas' : 'Not Available';
        })();
        
        // Rating color
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
                <!-- Poster -->
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
                        style="
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                        "
                        onerror="this.src='https://via.placeholder.com/300x450/18183A/DFDFB0?text=No+Poster'"
                    />
                    
                    <!-- ✅ Trailer Button (Top Right) -->
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
                    
                    <!-- ✅ NEW: Universal Trigger Warning Badge -->
                    ${triggerBadgeHTML}
                    
                    <!-- Rating Badge -->
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
                    
                    <!-- Movie Info (Bottom overlay) -->
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
                        
                        <!-- ✅ Platform Badge -->
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

    getFavoriteGenres(swipeHistory) {
        const genreCounts = {};
        
        swipeHistory.forEach(swipe => {
            if ((swipe.action === 'love' || swipe.action === 'like') && swipe.movie && swipe.movie.genres) {
                swipe.movie.genres.forEach(genre => {
                    genreCounts[genre] = (genreCounts[genre] || 0) + 1;
                });
            }
        });

        return Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([genre]) => genre);
    }
}
