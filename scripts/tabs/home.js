/**
 * MoviEase - Home Tab
 * Personalized movie feed with horizontal scrolling rows
 * ✅ MoviEase branding and colors
 * ✅ Proper scrolling functionality
 * ✅ Visible section headers
 */

import { tmdbService } from '../services/tmdb.js';
import { store } from '../state/store.js';

export class HomeTab {
    constructor() {
        this.container = null;
    }

    async render(container) {
        console.log('[Home] Rendering home tab...');
        this.container = container;

        // Show loading state
        this.container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: calc(100vh - 10rem); flex-direction: column; gap: 1rem;">
                <div style="width: 48px; height: 48px; border: 4px solid rgba(176, 212, 227, 0.2); border-top-color: #b0d4e3; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="color: rgba(176, 212, 227, 0.7); font-size: 0.875rem;">Loading your personalized feed...</p>
            </div>
            <style>@keyframes spin { to { transform: rotate(360deg); }}</style>
        `;

        try {
            // Load movie data
            const [trending, popular, topRated] = await Promise.all([
                tmdbService.getTrendingMovies('week'),
                tmdbService.getPopularMovies(1),
                tmdbService.discoverMovies({ sortBy: 'vote_average.desc', minVotes: 1000, page: 1 })
            ]);

            // Get user's genre preferences from swipe history
            const state = store.getState();
            const swipeHistory = state.swipeHistory || [];
            const favoriteGenres = this.getFavoriteGenres(swipeHistory);

            // Render the feed
            this.renderFeed(trending, popular, topRated.movies, favoriteGenres);

        } catch (error) {
            console.error('[Home] Failed to load content:', error);
            this.container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: calc(100vh - 10rem); flex-direction: column; gap: 1rem; padding: 2rem; text-align: center;">
                    <div style="font-size: 3rem;">⚠️</div>
                    <h3 style="color: white; font-size: 1.25rem; font-weight: 700;">Failed to Load Content</h3>
                    <p style="color: rgba(176, 212, 227, 0.6); font-size: 0.875rem;">Please try refreshing the page</p>
                    <button onclick="location.reload()" style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #1e3a5f, #2d5a8f); border: none; border-radius: 0.75rem; color: white; font-weight: 600; cursor: pointer; margin-top: 1rem;">
                        Refresh
                    </button>
                </div>
            `;
        }
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
            <div style="padding: 1.5rem 0 6rem; overflow-y: auto; height: calc(100vh - 5rem); -webkit-overflow-scrolling: touch;">
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
        const posterURL = movie.posterURL || `https://via.placeholder.com/300x450/1e3a5f/b0d4e3?text=${encodeURIComponent(movie.title)}`;
        const rating = movie.rating ? movie.rating.toFixed(1) : 'N/A';
        const year = movie.releaseDate ? movie.releaseDate.split('-')[0] : '';

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
                    background: linear-gradient(135deg, rgba(30, 58, 95, 0.3), rgba(26, 31, 46, 0.3));
                ">
                    <img 
                        src="${posterURL}" 
                        alt="${movie.title}"
                        style="
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                        "
                        onerror="this.src='https://via.placeholder.com/300x450/1e3a5f/b0d4e3?text=No+Poster'"
                    />
                    
                    <!-- Rating Badge -->
                    ${rating !== 'N/A' ? `
                        <div style="
                            position: absolute;
                            top: 0.5rem;
                            right: 0.5rem;
                            background: linear-gradient(135deg, rgba(30, 58, 95, 0.95), rgba(26, 31, 46, 0.95));
                            backdrop-filter: blur(8px);
                            border: 1px solid rgba(176, 212, 227, 0.3);
                            border-radius: 0.5rem;
                            padding: 0.25rem 0.5rem;
                            display: flex;
                            align-items: center;
                            gap: 0.25rem;
                            font-size: 0.75rem;
                            font-weight: 700;
                            color: ${parseFloat(rating) >= 7 ? '#4ade80' : parseFloat(rating) >= 5 ? '#fbbf24' : '#ef4444'};
                        ">
                            ⭐ ${rating}
                        </div>
                    ` : ''}
                </div>

                <!-- Movie Info -->
                <div style="margin-top: 0.5rem;">
                    <h3 style="
                        color: white;
                        font-size: 0.875rem;
                        font-weight: 600;
                        margin: 0 0 0.25rem;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        line-height: 1.3;
                    ">
                        ${movie.title}
                    </h3>
                    ${year ? `
                        <p style="
                            color: rgba(176, 212, 227, 0.6);
                            font-size: 0.75rem;
                            margin: 0;
                        ">
                            ${year}
                        </p>
                    ` : ''}
                </div>
            </div>
        `;
    }

    attachMovieClickHandlers() {
        const movieCards = this.container.querySelectorAll('.home-movie-card');
        movieCards.forEach(card => {
            card.addEventListener('click', async () => {
                const movieId = parseInt(card.dataset.movieId);
                if (movieId) {
                    await this.showMovieModal(movieId);
                }
            });
        });
    }

    async showMovieModal(movieId) {
        try {
            console.log('[Home] Loading movie details:', movieId);
            
            // Show loading modal
            const modal = document.createElement('div');
            modal.id = 'movie-modal';
            modal.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(10, 14, 26, 0.95);
                backdrop-filter: blur(8px);
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1rem;
                animation: fadeIn 0.2s;
            `;
            
            modal.innerHTML = `
                <div style="width: 48px; height: 48px; border: 4px solid rgba(176, 212, 227, 0.2); border-top-color: #b0d4e3; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            `;
            
            document.body.appendChild(modal);

            // Load movie details
            const movie = await tmdbService.getMovieDetails(movieId);
            
            if (!movie) {
                modal.remove();
                return;
            }

            // Render full modal
            this.renderMovieModal(modal, movie);

        } catch (error) {
            console.error('[Home] Failed to load movie details:', error);
            const modal = document.getElementById('movie-modal');
            if (modal) modal.remove();
        }
    }

    renderMovieModal(modal, movie) {
        const backdropURL = movie.backdropURL || movie.posterURL || '';
        const posterURL = movie.posterURL || '';
        const rating = movie.rating ? movie.rating.toFixed(1) : 'N/A';
        const year = movie.releaseDate ? movie.releaseDate.split('-')[0] : '';
        const runtime = movie.runtime ? `${movie.runtime}min` : '';
        const director = movie.director ? movie.director.name : '';
        
        modal.innerHTML = `
            <div style="
                width: 100%;
                max-width: 600px;
                max-height: 90vh;
                background: linear-gradient(180deg, rgba(20, 24, 36, 0.98), rgba(26, 31, 46, 0.98));
                border: 1px solid rgba(176, 212, 227, 0.2);
                border-radius: 1.5rem;
                overflow-y: auto;
                position: relative;
                animation: slideUp 0.3s;
            ">
                <!-- Close Button -->
                <button 
                    id="close-modal" 
                    style="
                        position: sticky;
                        top: 1rem;
                        right: 1rem;
                        float: right;
                        width: 40px;
                        height: 40px;
                        background: rgba(30, 58, 95, 0.8);
                        backdrop-filter: blur(8px);
                        border: 1px solid rgba(176, 212, 227, 0.3);
                        border-radius: 50%;
                        color: white;
                        font-size: 1.25rem;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 10;
                        margin: 1rem 1rem 0 0;
                    "
                >
                    ✕
                </button>

                <!-- Backdrop -->
                ${backdropURL ? `
                    <div style="
                        width: 100%;
                        height: 250px;
                        background: url('${backdropURL}') center/cover;
                        position: relative;
                    ">
                        <div style="
                            position: absolute;
                            inset: 0;
                            background: linear-gradient(to bottom, transparent 0%, rgba(20, 24, 36, 0.98) 100%);
                        "></div>
                    </div>
                ` : ''}

                <!-- Content -->
                <div style="padding: 1.5rem;">
                    <!-- Title & Info -->
                    <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                        ${posterURL ? `
                            <img 
                                src="${posterURL}" 
                                alt="${movie.title}"
                                style="
                                    width: 100px;
                                    height: 150px;
                                    object-fit: cover;
                                    border-radius: 0.75rem;
                                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                                "
                            />
                        ` : ''}
                        <div style="flex: 1;">
                            <h2 style="
                                color: white;
                                font-size: 1.5rem;
                                font-weight: 700;
                                margin: 0 0 0.5rem;
                            ">
                                ${movie.title}
                            </h2>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; color: rgba(176, 212, 227, 0.7); font-size: 0.875rem;">
                                ${year ? `<span>${year}</span>` : ''}
                                ${runtime ? `<span>• ${runtime}</span>` : ''}
                                ${rating !== 'N/A' ? `<span>• ⭐ ${rating}</span>` : ''}
                            </div>
                            ${movie.genres && movie.genres.length > 0 ? `
                                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem;">
                                    ${movie.genres.map(genre => `
                                        <span style="
                                            padding: 0.25rem 0.75rem;
                                            background: rgba(176, 212, 227, 0.1);
                                            border: 1px solid rgba(176, 212, 227, 0.2);
                                            border-radius: 1rem;
                                            font-size: 0.75rem;
                                            color: #b0d4e3;
                                        ">
                                            ${genre}
                                        </span>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Overview -->
                    ${movie.overview ? `
                        <div style="margin-bottom: 1.5rem;">
                            <h3 style="
                                color: white;
                                font-size: 1rem;
                                font-weight: 700;
                                margin: 0 0 0.75rem;
                            ">
                                Overview
                            </h3>
                            <p style="
                                color: rgba(176, 212, 227, 0.8);
                                font-size: 0.9375rem;
                                line-height: 1.6;
                                margin: 0;
                            ">
                                ${movie.overview}
                            </p>
                        </div>
                    ` : ''}

                    <!-- Director -->
                    ${director ? `
                        <div style="margin-bottom: 1.5rem;">
                            <span style="color: rgba(176, 212, 227, 0.6); font-size: 0.875rem;">Directed by</span>
                            <span style="color: white; font-size: 0.875rem; font-weight: 600; margin-left: 0.5rem;">${director}</span>
                        </div>
                    ` : ''}

                    <!-- Cast -->
                    ${movie.cast && movie.cast.length > 0 ? `
                        <div style="margin-bottom: 1.5rem;">
                            <h3 style="
                                color: white;
                                font-size: 1rem;
                                font-weight: 700;
                                margin: 0 0 0.75rem;
                            ">
                                Cast
                            </h3>
                            <div style="display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.5rem;">
                                ${movie.cast.slice(0, 10).map(actor => `
                                    <div style="
                                        flex: 0 0 80px;
                                        text-align: center;
                                    ">
                                        ${actor.profile_path ? `
                                            <div style="
                                                width: 80px;
                                                height: 80px;
                                                border-radius: 50%;
                                                background: url('https://image.tmdb.org/t/p/w185${actor.profile_path}') center/cover;
                                                margin-bottom: 0.5rem;
                                                border: 2px solid rgba(176, 212, 227, 0.2);
                                            "></div>
                                        ` : `
                                            <div style="
                                                width: 80px;
                                                height: 80px;
                                                border-radius: 50%;
                                                background: linear-gradient(135deg, #1e3a5f, #2d5a8f);
                                                margin-bottom: 0.5rem;
                                                display: flex;
                                                align-items: center;
                                                justify-content: center;
                                                color: white;
                                                font-size: 1.5rem;
                                            ">
                                                👤
                                            </div>
                                        `}
                                        <p style="
                                            color: white;
                                            font-size: 0.75rem;
                                            font-weight: 600;
                                            margin: 0;
                                            overflow: hidden;
                                            text-overflow: ellipsis;
                                            white-space: nowrap;
                                        ">
                                            ${actor.name}
                                        </p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>

            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            </style>
        `;

        // Close button handler
        const closeBtn = modal.querySelector('#close-modal');
        closeBtn.addEventListener('click', () => modal.remove());
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
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
