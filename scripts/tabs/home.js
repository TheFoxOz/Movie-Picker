import { store } from '../state/store.js';
import { tmdbService } from '../services/tmdb.js';
import { movieModal } from '../components/movie-modal.js';
import { ENV } from '../config/env.js';

const GENRE_IDS = {
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
        
        window.addEventListener('preferences-updated', () => {
            console.log('[Home] Preferences updated, refreshing...');
            this.render(this.container);
        });

        this.container.innerHTML = this.renderLoading();
        await this.loadContent();
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
            if (!tmdbService) {
                console.error('[Home] TMDB service not available');
                return;
            }

            console.log('[Home] Loading content...');

            // ✅ FIX: Load different content for each section
            const trending = await tmdbService.getTrendingMovies('week');
            this.trendingMovies = this.filterMovies(trending);

            // Get recommendations (uses swipe history)
            this.recommendedMovies = await this.getRecommendations();

            // ✅ FIX: Load DIFFERENT popular movies for platforms section
            const popularMovies = await tmdbService.getPopularMovies(1);
            const topRatedResult = await tmdbService.discoverMovies({ 
                sortBy: 'vote_average.desc', 
                minVotes: 1000, 
                page: 1 
            });
            const topRatedMovies = topRatedResult.movies || topRatedResult;
            
            // Combine and dedupe
            const allMovies = [...popularMovies, ...topRatedMovies];
            const uniqueMovies = [];
            const seen = new Set();
            
            allMovies.forEach(movie => {
                if (movie && movie.id && !seen.has(movie.id)) {
                    seen.add(movie.id);
                    uniqueMovies.push(movie);
                }
            });

            this.platformMovies = {
                'Popular': this.filterMovies(uniqueMovies.slice(0, 20))
            };

            console.log('[Home] Content loaded successfully');
            console.log('[Home] Trending:', this.trendingMovies.length);
            console.log('[Home] Recommended:', this.recommendedMovies.length);
            console.log('[Home] Popular:', this.platformMovies['Popular']?.length || 0);

        } catch (error) {
            console.error('[Home] Error loading content:', error);
        } finally {
            this.isLoading = false;
        }
    }

    filterMovies(movies) {
        // ✅ FIX: TMDB movies don't have platform property, so don't filter by it
        // Just return movies as-is (platform filtering would need additional API calls)
        let filtered = [...movies];

        if (this.preferences.triggerWarnings.enabled) {
            filtered = filtered.filter(movie => {
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
        
        // ✅ FIX: Filter out invalid swipes before mapping
        const lovedMovies = swipeHistory
            .filter(s => s && s.action === 'love' && s.movie && s.movie.id)
            .map(s => s.movie);
        
        const likedMovies = swipeHistory
            .filter(s => s && s.action === 'like' && s.movie && s.movie.id)
            .map(s => s.movie);

        if (lovedMovies.length === 0 && likedMovies.length === 0) {
            const popular = await tmdbService.getPopularMovies(1);
            return this.filterMovies(popular);
        }

        const favoriteMovies = [...lovedMovies, ...likedMovies];
        const genreCounts = {};
        
        // ✅ FIX: Add null check before accessing properties
        favoriteMovies.forEach(movie => {
            // Make sure movie exists and has genre data
            if (!movie) {
                console.warn('[Home] Invalid movie in favorites');
                return;
            }
            
            if (movie.genre_ids || movie.genreIds) {
                const ids = movie.genre_ids || movie.genreIds;
                ids.forEach(genreId => {
                    genreCounts[genreId] = (genreCounts[genreId] || 0) + 1;
                });
            }
        });

        const topGenres = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([genreId]) => parseInt(genreId));

        console.log('[Home] Top genres from history:', topGenres);

        const recommendations = [];
        for (const genreId of topGenres) {
            try {
                const movies = await tmdbService.discoverMovies({ 
                    withGenres: genreId, 
                    page: 1 
                });
                recommendations.push(...(movies.movies || movies));
            } catch (err) {
                console.warn('[Home] Failed to fetch genre:', genreId);
            }
        }

        // ✅ FIX: Safely create swipedIds Set with null checks
        const swipedIds = new Set(
            swipeHistory
                .filter(s => s && s.movie && s.movie.id)
                .map(s => s.movie.id)
        );
        
        // ✅ FIX: Add null checks when filtering unique movies
        const unique = recommendations.filter((movie, index, self) => 
            movie && movie.id &&
            self.findIndex(m => m && m.id === movie.id) === index &&
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
                
                <div style="margin-bottom: 2rem;">
                    <h1 style="font-size: 1.75rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0;">
                        ${this.getGreeting()}
                    </h1>
                    <p style="color: rgba(255,255,255,0.6); font-size: 0.875rem; margin: 0;">
                        ${hasHistory ? 'Personalized recommendations based on your taste' : 'Discover trending movies across your platforms'}
                    </p>
                </div>

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

                ${this.preferences.triggerWarnings.enabled ? `
                    <div style="padding: 1rem; background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.3); border-radius: 1rem; margin-bottom: 2rem; display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-size: 1.25rem;">⚠️</span>
                        <div style="font-size: 0.875rem; color: rgba(255,255,255,0.8);">
                            Trigger warning filter is active. Movies with warnings are hidden.
                        </div>
                    </div>
                ` : ''}

                ${enabledPlatforms.length > 0 ? `
                    ${this.renderSection('🔥 Trending This Week', this.trendingMovies, 'trending')}
                    ${hasHistory ? this.renderSection('✨ Recommended For You', this.recommendedMovies, 'recommended') : ''}
                    ${this.renderSection('🍿 Popular Movies', this.platformMovies['Popular'] || [], 'popular')}

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
            <div style="margin-bottom: 3rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; padding: 0 1rem;">
                    <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0;">
                        ${title}
                    </h2>
                    ${movies.length > 6 ? `
                        <button class="view-all-btn" data-section="${sectionId}" style="padding: 0.5rem 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; color: rgba(255,255,255,0.7); font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.3s;">
                            View All →
                        </button>
                    ` : ''}
                </div>
                
                <!-- Netflix-style horizontal scrolling container -->
                <div class="movie-row" data-section="${sectionId}" style="
                    overflow-x: auto;
                    overflow-y: hidden;
                    scroll-behavior: smooth;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                    padding: 0 1rem;
                ">
                    <div style="
                        display: flex;
                        gap: 0.75rem;
                        padding-bottom: 1rem;
                    ">
                        ${movies.map(movie => this.renderMovieCard(movie)).join('')}
                    </div>
                </div>
                
                <style>
                    .movie-row::-webkit-scrollbar {
                        display: none;
                    }
                    .home-movie-card {
                        min-width: 140px;
                        flex-shrink: 0;
                    }
                </style>
            </div>
        `;
    }

    renderMovieCard(movie) {
        const posterUrl = movie.posterURL || movie.poster_path || `https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}`;
        const hasWarnings = movie.triggerWarnings && movie.triggerWarnings.length > 0;

        return `
            <div class="home-movie-card" data-movie-id="${movie.id}" style="position: relative;">
                <div style="position: relative; width: 100%; aspect-ratio: 2/3; border-radius: 0.75rem; overflow: hidden; background: rgba(255,255,255,0.05); box-shadow: 0 4px 16px rgba(0,0,0,0.3); transition: transform 0.3s; cursor: pointer;">
                    <img src="${posterUrl}" alt="${movie.title}" style="width: 100%; height: 100%; object-fit: cover;"
                         onerror="this.src='https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}'">
                    
                    ${movie.vote_average || movie.rating ? `
                        <div style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem 0.5rem; background: rgba(251,191,36,0.9); border-radius: 0.5rem;">
                            <span style="color: white; font-size: 0.75rem; font-weight: 700;">⭐ ${(movie.vote_average || movie.rating).toFixed(1)}</span>
                        </div>
                    ` : ''}

                    ${hasWarnings ? `
                        <div style="position: absolute; top: 0.5rem; left: 0.5rem; padding: 0.25rem 0.5rem; background: rgba(239,68,68,0.9); border-radius: 0.5rem;">
                            <span style="color: white; font-size: 0.75rem; font-weight: 700;">⚠️ ${movie.triggerWarnings.length}</span>
                        </div>
                    ` : ''}

                    <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 0.75rem 0.5rem; background: linear-gradient(0deg, rgba(0,0,0,0.9), transparent);">
                        <h3 style="font-size: 0.8125rem; font-weight: 700; color: white; margin: 0; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                            ${movie.title}
                        </h3>
                        <p style="font-size: 0.6875rem; color: rgba(255,255,255,0.7); margin: 0.25rem 0 0 0;">
                            ${movie.releaseDate?.split('-')[0] || ''}
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
                alert(`View All for ${section} - Coming soon! This will show all movies in this category.`);
            });
        });
    }

    findMovieById(movieId) {
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
        window.removeEventListener('preferences-updated', this.render);
    }
}
