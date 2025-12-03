/**
 * Home Tab Component
 * Shows trending movies, all-time best, and categories
 */

import { getTMDBService } from '../services/tmdb.js';
import { movieModal } from '../components/movie-modal.js';
import { GENRE_IDS } from '../services/tmdb.js';
import { ENV } from '../config/env.js';

export class HomeTab {
    constructor() {
        this.container = null;
        this.trendingMovies = [];
        this.allTimeBest = [];
        this.categoryMovies = {
            action: [],
            scifi: [],
            comedy: [],
            horror: []
        };
    }
    
    async render(container) {
        this.container = container;
        
        // Show loading state
        container.innerHTML = `
            <div style="padding: 1.5rem 1rem 6rem;">
                <h1 style="font-size: 1.75rem; font-weight: 800; color: white; margin: 0 0 1.5rem 0;">
                    🎬 Discover Movies
                </h1>
                <div style="display: flex; align-items: center; justify-content: center; padding: 3rem;">
                    <div style="width: 48px; height: 48px; border: 4px solid rgba(255, 46, 99, 0.3); border-top-color: #ff2e63; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                </div>
            </div>
        `;
        
        // Fetch data
        await this.fetchTMDBData();
        
        // Render content
        this.renderContent();
    }
    
    async fetchTMDBData() {
        try {
            const tmdbService = getTMDBService();
            
            // ✅ FIXED: Changed fetchTrendingWeek to fetchTrendingMovies
            const trending = await tmdbService.fetchTrendingMovies();
            const topRated = await tmdbService.fetchTopRatedMovies();
            
            this.trendingMovies = trending.slice(0, 10);
            this.allTimeBest = topRated.slice(0, 10);
            
            // Fetch by genre
            this.categoryMovies.action = await tmdbService.fetchMoviesByGenre(GENRE_IDS.ACTION);
            this.categoryMovies.scifi = await tmdbService.fetchMoviesByGenre(GENRE_IDS.SCIFI);
            this.categoryMovies.comedy = await tmdbService.fetchMoviesByGenre(GENRE_IDS.COMEDY);
            this.categoryMovies.horror = await tmdbService.fetchMoviesByGenre(GENRE_IDS.HORROR);
            
            if (ENV.APP.debug) {
                console.log('[HomeTab] Fetched all TMDB data successfully');
            }
            
        } catch (error) {
            console.error('[HomeTab] Error fetching TMDB data:', error);
            
            // Set empty arrays as fallback
            this.trendingMovies = [];
            this.allTimeBest = [];
            this.categoryMovies = { action: [], scifi: [], comedy: [], horror: [] };
        }
    }
    
    renderContent() {
        this.container.innerHTML = `
            <div style="padding: 1.5rem 1rem 6rem;">
                <h1 style="font-size: 1.75rem; font-weight: 800; color: white; margin: 0 0 1.5rem 0;">
                    🎬 Discover Movies
                </h1>
                
                <!-- Trending This Week -->
                ${this.trendingMovies.length > 0 ? `
                    <section style="margin-bottom: 2rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                            <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0;">
                                🔥 Trending This Week
                            </h2>
                        </div>
                        <div style="display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 0.5rem; -webkit-overflow-scrolling: touch;">
                            ${this.trendingMovies.map(movie => this.renderMovieCard(movie)).join('')}
                        </div>
                    </section>
                ` : ''}
                
                <!-- All-Time Best -->
                ${this.allTimeBest.length > 0 ? `
                    <section style="margin-bottom: 2rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                            <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0;">
                                ⭐ All-Time Best
                            </h2>
                        </div>
                        <div style="display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 0.5rem; -webkit-overflow-scrolling: touch;">
                            ${this.allTimeBest.map(movie => this.renderMovieCard(movie)).join('')}
                        </div>
                    </section>
                ` : ''}
                
                <!-- Action Movies -->
                ${this.categoryMovies.action.length > 0 ? `
                    <section style="margin-bottom: 2rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                            <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0;">
                                💥 Action
                            </h2>
                        </div>
                        <div style="display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 0.5rem; -webkit-overflow-scrolling: touch;">
                            ${this.categoryMovies.action.slice(0, 10).map(movie => this.renderMovieCard(movie)).join('')}
                        </div>
                    </section>
                ` : ''}
                
                <!-- Sci-Fi Movies -->
                ${this.categoryMovies.scifi.length > 0 ? `
                    <section style="margin-bottom: 2rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                            <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0;">
                                🚀 Sci-Fi
                            </h2>
                        </div>
                        <div style="display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 0.5rem; -webkit-overflow-scrolling: touch;">
                            ${this.categoryMovies.scifi.slice(0, 10).map(movie => this.renderMovieCard(movie)).join('')}
                        </div>
                    </section>
                ` : ''}
                
                <!-- Comedy Movies -->
                ${this.categoryMovies.comedy.length > 0 ? `
                    <section style="margin-bottom: 2rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                            <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0;">
                                😂 Comedy
                            </h2>
                        </div>
                        <div style="display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 0.5rem; -webkit-overflow-scrolling: touch;">
                            ${this.categoryMovies.comedy.slice(0, 10).map(movie => this.renderMovieCard(movie)).join('')}
                        </div>
                    </section>
                ` : ''}
                
                <!-- Horror Movies -->
                ${this.categoryMovies.horror.length > 0 ? `
                    <section style="margin-bottom: 2rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                            <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0;">
                                👻 Horror
                            </h2>
                        </div>
                        <div style="display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 0.5rem; -webkit-overflow-scrolling: touch;">
                            ${this.categoryMovies.horror.slice(0, 10).map(movie => this.renderMovieCard(movie)).join('')}
                        </div>
                    </section>
                ` : ''}
                
                <!-- Call to Action -->
                <div style="margin-top: 3rem; padding: 2rem; background: linear-gradient(135deg, rgba(255, 46, 99, 0.1), rgba(217, 0, 98, 0.1)); border: 1px solid rgba(255, 46, 99, 0.2); border-radius: 1.5rem; text-align: center;">
                    <h3 style="font-size: 1.5rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0;">
                        Ready to find your next favorite?
                    </h3>
                    <p style="color: rgba(255, 255, 255, 0.7); margin: 0 0 1.5rem 0;">
                        Start swiping through movies now!
                    </p>
                    <button id="cta-swipe" style="padding: 1rem 2rem; background: linear-gradient(135deg, #ff2e63, #d90062); border: none; border-radius: 1rem; color: white; font-size: 1rem; font-weight: 700; cursor: pointer; transition: transform 0.3s; box-shadow: 0 8px 24px rgba(255, 46, 99, 0.4);" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        Start Swiping 🎬
                    </button>
                </div>
            </div>
        `;
        
        // Attach click listeners to movie cards
        const movieCards = this.container.querySelectorAll('.home-movie-card');
        movieCards.forEach(card => {
            card.addEventListener('click', () => {
                const movieId = card.dataset.movieId;
                const allMovies = [
                    ...this.trendingMovies,
                    ...this.allTimeBest,
                    ...this.categoryMovies.action,
                    ...this.categoryMovies.scifi,
                    ...this.categoryMovies.comedy,
                    ...this.categoryMovies.horror
                ];
                
                const movie = allMovies.find(m => String(m.id) === String(movieId));
                if (movie) {
                    movieModal.show(movie);
                }
            });
        });
        
        // CTA button
        const ctaBtn = this.container.querySelector('#cta-swipe');
        if (ctaBtn) {
            ctaBtn.addEventListener('click', () => {
                document.dispatchEvent(new CustomEvent('navigate-tab', {
                    detail: { tab: 'swipe' }
                }));
            });
        }
    }
    
    renderMovieCard(movie) {
        const posterUrl = movie.poster_path || movie.backdrop_path || 'https://placehold.co/300x450/1a1a2e/ffffff?text=' + encodeURIComponent(movie.title);
        
        return `
            <div class="home-movie-card" data-movie-id="${movie.id}" style="flex: 0 0 140px; cursor: pointer; transition: transform 0.3s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                <div style="position: relative; width: 140px; aspect-ratio: 2/3; border-radius: 0.75rem; overflow: hidden; background: rgba(255, 255, 255, 0.05); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);">
                    <img 
                        src="${posterUrl}" 
                        alt="${movie.title}"
                        style="width: 100%; height: 100%; object-fit: cover;"
                        onerror="this.src='https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}'"
                    >
                    
                    <!-- Rating Badge -->
                    ${movie.imdb || movie.vote_average ? `
                        <div style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem 0.5rem; background: rgba(251, 191, 36, 0.9); backdrop-filter: blur(10px); border-radius: 0.5rem; display: flex; align-items: center; gap: 0.25rem;">
                            <span style="color: white; font-size: 0.75rem; font-weight: 700;">⭐</span>
                            <span style="color: white; font-size: 0.75rem; font-weight: 700;">${movie.imdb || movie.vote_average.toFixed(1)}</span>
                        </div>
                    ` : ''}
                    
                    <!-- Title Overlay -->
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 0.75rem 0.5rem; background: linear-gradient(0deg, rgba(0, 0, 0, 0.9), transparent);">
                        <h3 style="font-size: 0.8125rem; font-weight: 700; color: white; margin: 0; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                            ${movie.title}
                        </h3>
                        ${movie.year ? `
                            <p style="font-size: 0.6875rem; color: rgba(255, 255, 255, 0.7); margin: 0.25rem 0 0 0;">
                                ${movie.year}
                            </p>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    destroy() {
        // Cleanup if needed
    }
}
