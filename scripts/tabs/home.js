import { store } from '../state/store.js';
import { tmdbService } from '../services/tmdb.js';
import { movieModal } from '../components/movie-modal.js';
import { ENV } from '../config/env.js';
import { notify } from '../utils/notifications.js';

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

        const rawPrefs = store.getState().preferences || {};
        this.preferences = this.normalizePreferences(rawPrefs);

        window.addEventListener('preferences-updated', () => {
            console.log('[Home] Preferences updated, refreshing...');
            this.render(this.container);
        });

        this.container.innerHTML = this.renderLoading();
        await this.renderContent();
        await this.loadContent(); // Load after render so UI appears instantly
    }

    normalizePreferences(prefs) {
        const defaults = {
            platforms: ['Netflix', 'Prime Video', 'Disney+'],
            region: 'US',
            triggerWarnings: { enabledCategories: [], showAllWarnings: false }
        };

        if (prefs.platforms && typeof prefs.platforms === 'object' && !Array.isArray(prefs.platforms)) {
            const enabled = Object.keys(prefs.platforms).filter(p => prefs.platforms[p]);
            return {
                platforms: enabled.length > 0 ? enabled : defaults.platforms,
                region: prefs.region || defaults.region,
                triggerWarnings: prefs.triggerWarnings || defaults.triggerWarnings
            };
        }

        return {
            platforms: Array.isArray(prefs.platforms) && prefs.platforms.length > 0 ? prefs.platforms : defaults.platforms,
            region: prefs.region || defaults.region,
            triggerWarnings: prefs.triggerWarnings || defaults.triggerWarnings
        };
    }

    async loadContent() {
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            if (!tmdbService?.getTrendingMovies) {
                console.error('[Home] TMDB service not available');
                return;
            }

            const enabledPlatforms = this.preferences.platforms || [];

            const [trending, popular] = await Promise.all([
                tmdbService.getTrendingMovies('week').catch(() => []),
                tmdbService.getPopularMovies(1).catch(() => [])
            ]);

            this.trendingMovies = this.filterMovies(trending);
            this.recommendedMovies = await this.getRecommendations();
            
            this.platformMovies = {};
            const allMovies = this.filterMovies(popular);

            enabledPlatforms.forEach(platform => {
                this.platformMovies[platform] = allMovies
                    .filter(m => m.platform === platform)
                    .slice(0, 10);
            });

            this.renderContent(); // Re-render with data

        } catch (error) {
            console.error('[Home] Load failed:', error);
            notify.error('Failed to load movies');
        } finally {
            this.isLoading = false;
        }
    }

    filterMovies(movies) {
        if (!Array.isArray(movies)) return [];

        const enabledPlatforms = this.preferences.platforms || [];
        const hasActiveWarnings = this.preferences.triggerWarnings?.enabledCategories?.length > 0;

        return movies.filter(movie => {
            const matchesPlatform = enabledPlatforms.includes(movie.platform);
            const hasWarnings = movie.triggerWarnings && movie.triggerWarnings.length > 0;

            return matchesPlatform && (!hasActiveWarnings || !hasWarnings);
        });
    }

    async getRecommendations() {
        const swipeHistory = store.getState().swipeHistory || [];
        const loved = swipeHistory.filter(s => s.action === 'love').map(s => s.movie);
        const liked = swipeHistory.filter(s => s.action === 'like').map(s => s.movie);

        if (loved.length === 0 && liked.length === 0) {
            const popular = await tmdbService.getPopularMovies(1).catch(() => []);
            return this.filterMovies(popular);
        }

        const favoriteMovies = [...loved, ...liked];
        const genreCounts = {};

        favoriteMovies.forEach(movie => {
            (movie.genre_ids || movie.genreIds || []).forEach(id => {
                genreCounts[id] = (genreCounts[id] || 0) + 1;
            });
        });

        const topGenres = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([id]) => parseInt(id));

        const recommendations = [];
        for (const genreId of topGenres) {
            try {
                const res = await tmdbService.discoverMovies({ withGenres: genreId, page: 1 });
                recommendations.push(...(res.movies || res || []));
            } catch {}
        }

        const swiped = new Set(swipeHistory.map(s => s.movie.id));
        return this.filterMovies(recommendations)
            .filter(m => !swiped.has(m.id))
            .slice(0, 12);
    }

    renderLoading() {
        return `
            <div style="display:flex;align-items:center;justify-content:center;height:calc(100vh-10rem);flex-direction:column;gap:1rem;">
                <div style="width:48px;height:48px;border:4px solid rgba(255,46,99,0.3);border-top-color:#ff2e63;border-radius:50%;animation:spin 1s linear infinite;"></div>
                <p style="color:rgba(255,255,255,0.7);">Loading your movies...</p>
            </div>
            <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
        `;
    }

    renderContent() {
        const platforms = this.preferences.platforms || [];
        const hasHistory = (store.getState().swipeHistory || []).length > 0;
        const hasWarnings = this.preferences.triggerWarnings?.enabledCategories?.length > 0;

        this.container.innerHTML = `
            <div style="padding:1.5rem 1rem 6rem;">
                <div style="margin-bottom:2rem;">
                    <h1 style="font-size:1.75rem;font-weight:800;color:white;margin:0 0 0.5rem;">${this.getGreeting()}</h1>
                    <p style="color:rgba(255,255,255,0.6);font-size:0.875rem;margin:0;">
                        ${hasHistory ? 'Personalized for you' : 'Trending across your platforms'}
                    </p>
                </div>

                ${platforms.length === 0 ? `
                    <div style="padding:1.5rem;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:1rem;margin-bottom:2rem;">
                        <div style="display:flex;align-items:center;gap:0.75rem;">
                            <span style="font-size:1.5rem;">Warning</span>
                            <div>
                                <div style="color:#ef4444;font-weight:700;">No Platforms Selected</div>
                                <div style="color:rgba(255,255,255,0.7);font-size:0.875rem;">Go to Profile → Streaming Platforms</div>
                            </div>
                        </div>
                    </div>
                ` : ''}

                ${hasWarnings ? `
                    <div style="padding:1rem;background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:1rem;margin-bottom:2rem;display:flex;align-items:center;gap:0.75rem;">
                        <span style="font-size:1.25rem;">Warning</span>
                        <div style="color:rgba(255,255,255,0.8);font-size:0.875rem;">Trigger warnings active — some movies hidden</div>
                    </div>
                ` : ''}

                ${platforms.length > 0 ? `
                    ${this.renderSection('Trending This Week', this.trendingMovies, 'trending')}
                    ${hasHistory ? this.renderSection('Recommended For You', this.recommendedMovies, 'recommended') : ''}
                    ${platforms.map(p => this.renderSection(this.getPlatformEmoji(p) + ' On ' + p, this.platformMovies[p] || [], p.toLowerCase().replace(/\s+/g,'-'))).join('')}
                    
                    <div style="text-align:center;padding:3rem 1rem;">
                        <div style="font-size:3rem;margin-bottom:0.5rem;">Movie Reel</div>
                        <p style="color:rgba(255,255,255,0.5);">More coming soon!</p>
                    </div>
                ` : ''}
            </div>
        `;

        this.attachListeners();
    }

    renderSection(title, movies, id) {
        if (!movies?.length) return '';
        return `
            <div style="margin-bottom:2.5rem;">
                <h2 style="font-size:1.25rem;font-weight:700;color:white;margin:0 0 1rem;">${title}</h2>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:1rem;">
                    ${movies.slice(0,6).map(m => this.renderMovieCard(m)).join('')}
                </div>
                ${movies.length > 6 ? `
                    <div style="text-align:center;margin-top:1rem;">
                        <button class="view-all-btn" data-section="${id}" style="padding:0.75rem 1.5rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.75rem;color:rgba(255,255,255,0.8);font-weight:600;cursor:pointer;">
                            View All (${movies.length})
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderMovieCard(movie) {
        const poster = movie.posterURL || movie.poster_path || `https://placehold.co/300x450/1a1a2e/fff?text=${encodeURIComponent(movie.title)}`;
        const hasWarning = movie.triggerWarnings?.length > 0;

        return `
            <div class="home-movie-card" data-movie-id="${movie.id}" style="cursor:pointer;">
                <div style="position:relative;width:100%;aspect-ratio:2/3;border-radius:0.75rem;overflow:hidden;background:rgba(255,255,255,0.05);box-shadow:0 4px 16px rgba(0,0,0,0.3);transition:transform 0.3s;">
                    <img src="${poster}" alt="${movie.title}" style="width:100%;height:100%;object-fit:cover;"
                         onerror="this.src='https://placehold.co/300x450/1a1a2e/fff?text=${encodeURIComponent(movie.title)}'">
                    ${movie.vote_average ? `
                        <div style="position:absolute;top:0.5rem;right:0.5rem;padding:0.25rem 0.5rem;background:rgba(251,191,36,0.9);border-radius:0.5rem;">
                            <span style="color:white;font-size:0.75rem;font-weight:700;">Star ${movie.vote_average.toFixed(1)}</span>
                        </div>
                    ` : ''}
                    ${hasWarning ? `
                        <div style="position:absolute;top:0.5rem;left:0.5rem;padding:0.25rem 0.5rem;background:rgba(239,68,68,0.9);border-radius:0.5rem;">
                            <span style="color:white;font-size:0.75rem;font-weight:700;">Warning ${movie.triggerWarnings.length}</span>
                        </div>
                    ` : ''}
                    <div style="position:absolute;bottom:0;left:0;right:0;padding:0.75rem 0.5rem;background:linear-gradient(0deg,rgba(0,0,0,0.9),transparent);">
                        <h3 style="font-size:0.8125rem;font-weight:700;color:white;margin:0;line-height:1.2;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
                            ${movie.title}
                        </h3>
                        <p style="font-size:0.6875rem;color:rgba(255,255,0.7);margin:0.25rem 0 0;">
                            ${movie.year || movie.releaseDate?.split('-')[0] || ''}${movie.platform ? ' • ' + movie.platform : ''}
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    getPlatformEmoji(p) {
        const map = {'Netflix':'Red Circle','Prime Video':'Blue Circle','Disney+':'Star','HBO Max':'Purple Circle','Apple TV+':'Apple','Hulu':'Green Circle'};
        return map[p] || 'Play Button';
    }

    getGreeting() {
        const h = new Date().getHours();
        return h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
    }

    attachListeners() {
        this.container.querySelectorAll('.home-movie-card').forEach(card => {
            const inner = card.firstElementChild;

            card.addEventListener('mouseenter', () => inner.style.transform = 'scale(1.05)');
            card.addEventListener('mouseleave', () => inner.style.transform = 'scale(1)');
            card.addEventListener('click', () => {
                const id = parseInt(card.dataset.movieId);
                const movie = this.findMovieById(id);
                if (movie) movieModal.show(movie);
            });
        });

        this.container.querySelectorAll('.view-all-btn').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.background = 'rgba(255,255,0.1)';
                btn.style.transform = 'scale(1.05)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = 'rgba(255,255,255,0.05)';
                btn.style.transform = 'scale(1)';
            });
            btn.addEventListener('click', () => notify.info('View All coming soon!'));
        });
    }

    findMovieById(id) {
        return [...this.trendingMovies, ...this.recommendedMovies, ...Object.values(this.platformMovies).flat()]
            .find(m => m.id === id);
    }

    destroy() {
        window.removeEventListener('preferences-updated', this.render);
    }
}
