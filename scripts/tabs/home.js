/**
 * Home Tab Component
 * Personalized recommendations based on user preferences, swipe history, and enabled platforms
 */

import { store } from '../state/store.js';
import { tmdbService, GENRE_IDS } from '../services/tmdb.js';
import { movieModal } from '../components/movie-modal.js';
import { ENV } from '../config/env.js';

export class HomeTab {
    constructor() {
        this.container = null;
        this.preferences = null;
        this.trendingMovies = [];
        this.recommendedMovies = [];
        this.platformMovies = {};
        this.isLoading = false;
    }

    async render(container) {
        this.container = container;
        this.preferences = store.getState().preferences || this.getDefaultPreferences();
        
        // Listen for preference updates
        window.addEventListener('preferences-updated', () => {
            console.log('[Home] Preferences updated, refreshing...');
            this.render(this.container);
        });

        // Show loading state
        this.container.innerHTML = this.renderLoading();

        // Load all content
        await this.loadContent();

        // Render full content
        this.renderContent();
    }

    getDefaultPreferences() {
        return {
            platforms: {
                'Netflix': true,
                'Hulu': true,
                'Prime Video': true,
                'Disney+': true,
                'HBO Max': true,
                'Apple TV+': true
            },
            triggerWarnings: { enabled: false },
            theme: 'dark',
            language: 'en',
            location: 'US'
        };
    }

    async loadContent() {
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            const tmdbService = tmdbService();
            if (!tmdbService) {
                console.error('[Home] TMDB service not available');
                return;
            }

            // Get enabled platforms
            const enabledPlatforms = Object.keys(this.preferences.platforms)
                .filter(p => this.preferences.platforms[p]);

            console.log('[Home] Loading content for platforms:', enabledPlatforms);

            // Load trending movies
            const trending = await tmdbService.fetchTrendingMovies();
            this.trendingMovies = this.filterMovies(trending);

            // Load recommendations based on swipe history
            this.recommendedMovies = await this.getRecommendations();

            // Load movies for each enabled platform
            this.platformMovies = {};
            const popularMovies = await tmdbService.fetchPopularMovies(10);
            const allMovies = this.filterMovies(popularMovies);

            // Group by platform
            enabledPlatforms.forEach(platform => {
                this.platformMovies[platform] = allMovies
                    .filter(m => m.platform === platform)
                    .slice(0, 10);
            });

            console.log('[Home] Content loaded successfully');

        } catch (error) {
            console.error('[Home] Error loading content:', error);
        } finally {
            this.isLoading = false;
        }
    }

    filterMovies(movies) {
        const enabledPlatforms = Object.keys(this.preferences.platforms)
            .filter(p => this.preferences.platforms[p]);

        let filtered = movies.filter(movie => 
            enabledPlatforms.includes(movie.platform)
        );

        // Apply trigger warning filter
        if (this.preferences.triggerWarnings.enabled) {
            filtered = filtered.filter(movie => {
                // Block if movie has any warnings (from DDD)
                if (movie.triggerWarnings && movie.triggerWarnings.length > 0) {
                    console.log(`[Home] Blocking ${movie.title} (has ${movie.triggerWarnings.length} warnings)`);
                    return false;
                }
                return true;
            });
        }

        return filtered;
    }

    async getRecommendations() {
        const swipeHistory = store.getState().swipeHistory || [];
        const lovedMovies = swipeHistory.filter(s => s.action === 'love').map(s => s.movie);
        const likedMovies = swipeHistory.filter(s => s.action === 'like').map(s => s.movie);

        if (lovedMovies.length === 0 && likedMovies.length === 0) {
            // No history - return popular movies
            const tmdbService = tmdbService();
            const popular = await tmdbService.fetchPopularMovies(5);
            return this.filterMovies(popular);
        }

        // Get genres from loved/liked movies
        const favoriteMovies = [...lovedMovies, ...likedMovies];
        const genreCounts = {};
        
        favoriteMovies.forEach(movie => {
            if (movie.genre_ids) {
                movie.genre_ids.forEach(genreId => {
                    genreCounts[genreId] = (genreCounts[genreId] || 0) + 1;
                });
            }
        });

        // Get top 3 genres
        const topGenres = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([genreId]) => parseInt(genreId));

        console.log('[Home] Top genres from history:', topGenres);

        // Fetch movies from these genres
        const tmdbService = tmdbService();
        const recommendations = [];

        for (const genreId of topGenres) {
            const movies = await tmdbService.fetchMoviesByGenre(genreId, 2);
            recommendations.push(...movies);
        }

        // Remove duplicates and movies already swiped
        const swipedIds = new Set(swipeHistory.map(s => s.movie.id));
        const unique = recommendations.filter((movie, index, self) => 
            self.findIndex(m => m.id === movie.id) === index &&
            !swipedIds.has(movie.id)
        );

        return this.filterMovies(unique).slice(0, 12);
    }

    renderLoading() {
        return `
            <div style="display:flex;align-items:center;justify-content:center;height:calc(100vh - 10rem);flex-direction:column;gap:1rem;">
                <div style="width:48px;height:48px;border:4px solid rgba(255,46,99,0.3);border-top-color:#ff2e63;border-radius:50%;animation:spin 1s linear infinite;"></div>
                <p style="color:rgba(255,255,255,0.7);">Loading your personalized feed...</p>
            </div>
            <style>
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
        `;
    }

    renderContent() {
        const enabledPlatforms = Object.keys(this.preferences.platforms)
            .filter(p => this.preferences.platforms[p]);

        const swipeHistory = store.getState().swipeHistory || [];
        const hasHistory = swipeHistory.length > 0;

        this.container.innerHTML = `
            <div style="padding: 1.5rem 1rem 6rem;">
                
                <!-- Header -->
                <div style="margin-bottom: 2rem;">
                    <h1 style="font-size: 1.75rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0;">
                        ${this.getGreeting()}
                    </h1>
                    <p style="color: rgba(255,255,255,0.6); font-size: 0.875rem; margin: 0;">
                        ${hasHistory ? 'Personalized recommendations based on your taste' : 'Discover trending movies across your platforms'}
                    </p>
                </div>

                <!-- Alert if no platforms enabled -->
                ${enabledPlatforms.length === 0 ? `
                    <div style="padding: 1.5rem; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 1rem; margin-bottom: 2rem;">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <span style="font-size: 1.5rem;">⚠️</span>
                            <div>
                                <div style="font-weight: 700; color: #ef4444; margin-bottom: 0.25rem;">No Platforms Enabled</div>
                                <div style="font-size: 0.875rem; color: rgba(255,255,255,0.7);">
                                    Go to Profile → Streaming Platforms to enable at least one platform
                                </div>
                            </div>
                        </div>
                    </div>
                ` : ''}

                <!-- Alert if trigger warnings enabled -->
                ${this.preferences.triggerWarnings.enabled ? `
                    <div style="padding: 1rem; background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.3); border-radius: 1rem; margin-bottom: 2rem; display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-size: 1.25rem;">⚠️</span>
                        <div style="font-size: 0.875rem; color: rgba(255,255,255,0.8);">
                            Trigger warning filter is active. Movies with warnings are hidden.
                        </div>
                    </div>
                ` : ''}

                ${enabledPlatforms.length > 0 ? `
                    <!-- Trending This Week -->
                    ${this.renderSection('🔥 Trending This Week', this.trendingMovies, 'trending')}

                    <!-- Recommendations -->
                    ${hasHistory ? this.renderSection('✨ Recommended For You', this.recommendedMovies, 'recommended') : ''}

                    <!-- Platform Sections -->
                    ${enabledPlatforms.map(platform => 
                        this.renderSection(this.getPlatformEmoji(platform) + ' On ' + platform, this.platformMovies[platform] || [], platform.toLowerCase().replace(/\s+/g, '-'))
                    ).join('')}

                    <!-- More Content Placeholder -->
                    <div style="text-align: center; padding: 3rem 1rem;">
                        <div style="font-size: 3rem; margin-bottom: 0.5rem;">🎬</div>
                        <p style="color: rgba(255,255,255,0.5); margin: 0;">
                            More content coming soon!
                        </p>
                    </div>
                ` : ''}
            </div>
        `;

        this.attachListeners();
    }

    renderSection(title, movies, sectionId) {
        if (!movies || movies.length === 0) {
            return '';
        }

        return `
            <div style="margin-bottom: 2.5rem;">
                <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0 0 1rem 0;">
                    ${title}
                </h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem;">
                    ${movies.slice(0, 6).map(movie => this.renderMovieCard(movie)).join('')}
                </div>
                ${movies.length > 6 ? `
                    <div style="text-align: center; margin-top: 1rem;">
                        <button class="view-all-btn" data-section="${sectionId}" style="padding: 0.75rem 1.5rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; color: rgba(255,255,255,0.8); font-weight: 600; cursor: pointer; transition: all 0.3s;">
                            View All (${movies.length})
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderMovieCard(movie) {
        const posterUrl = movie.poster_path || `https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}`;
        const hasWarnings = movie.triggerWarnings && movie.triggerWarnings.length > 0;

        return `
            <div class="home-movie-card" data-movie-id="${movie.id}" style="position: relative;">
                <div style="position: relative; width: 100%; aspect-ratio: 2/3; border-radius: 0.75rem; overflow: hidden; background: rgba(255,255,255,0.05); box-shadow: 0 4px 16px rgba(0,0,0,0.3); transition: transform 0.3s; cursor: pointer;">
                    <img src="${posterUrl}" alt="${movie.title}" style="width: 100%; height: 100%; object-fit: cover;"
                         onerror="this.src='https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}'">
                    
                    <!-- Rating Badge -->
                    ${movie.vote_average ? `
                        <div style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem 0.5rem; background: rgba(251,191,36,0.9); border-radius: 0.5rem;">
                            <span style="color: white; font-size: 0.75rem; font-weight: 700;">⭐ ${movie.vote_average.toFixed(1)}</span>
                        </div>
                    ` : ''}

                    <!-- Warning Badge -->
                    ${hasWarnings ? `
                        <div style="position: absolute; top: 0.5rem; left: 0.5rem; padding: 0.25rem 0.5rem; background: rgba(239,68,68,0.9); border-radius: 0.5rem;">
                            <span style="color: white; font-size: 0.75rem; font-weight: 700;">⚠️ ${movie.triggerWarnings.length}</span>
                        </div>
                    ` : ''}

                    <!-- Gradient Overlay -->
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 0.75rem 0.5rem; background: linear-gradient(0deg, rgba(0,0,0,0.9), transparent);">
                        <h3 style="font-size: 0.8125rem; font-weight: 700; color: white; margin: 0; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                            ${movie.title}
                        </h3>
                        <p style="font-size: 0.6875rem; color: rgba(255,255,255,0.7); margin: 0.25rem 0 0 0;">
                            ${movie.year || ''}${movie.platform ? ` • ${movie.platform}` : ''}
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    getPlatformEmoji(platform) {
        const emojis = {
            'Netflix': '🔴',
            'Hulu': '🟢',
            'Prime Video': '🔵',
            'Disney+': '⭐',
            'HBO Max': '🟣',
            'Apple TV+': '🍎'
        };
        return emojis[platform] || '▶️';
    }

    getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    }

    attachListeners() {
        // Movie card clicks
        this.container.querySelectorAll('.home-movie-card').forEach(card => {
            card.addEventListener('mouseover', () => {
                card.querySelector('div[style*="cursor: pointer"]').style.transform = 'scale(1.05)';
            });
            card.addEventListener('mouseout', () => {
                card.querySelector('div[style*="cursor: pointer"]').style.transform = 'scale(1)';
            });
            card.addEventListener('click', () => {
                const movieId = card.dataset.movieId;
                const movie = this.findMovieById(parseInt(movieId));
                if (movie) {
                    movieModal.show(movie);
                }
            });
        });

        // View All buttons
        this.container.querySelectorAll('.view-all-btn').forEach(btn => {
            btn.addEventListener('mouseover', () => {
                btn.style.background = 'rgba(255,255,255,0.1)';
                btn.style.transform = 'scale(1.05)';
            });
            btn.addEventListener('mouseout', () => {
                btn.style.background = 'rgba(255,255,255,0.05)';
                btn.style.transform = 'scale(1)';
            });
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                console.log(`[Home] View all clicked for section: ${section}`);
                // TODO: Could open a modal or navigate to library with filters
                alert(`View All for ${section} - Coming soon! This will show all movies in this category.`);
            });
        });
    }

    findMovieById(movieId) {
        // Search in all movie arrays
        let movie = this.trendingMovies.find(m => m.id === movieId);
        if (movie) return movie;

        movie = this.recommendedMovies.find(m => m.id === movieId);
        if (movie) return movie;

        for (const platform in this.platformMovies) {
            movie = this.platformMovies[platform].find(m => m.id === movieId);
            if (movie) return movie;
        }

        return null;
    }

    destroy() {
        // Cleanup
        window.removeEventListener('preferences-updated', this.render);
    }
}
