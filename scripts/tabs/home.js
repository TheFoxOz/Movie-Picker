/**
 * Home Tab - ULTRA PREMIUM WITH TMDB TRENDING
 * Trending this week (UK), all-time best, category rankings
 */

import { store } from '../state/store.js';
import { movieModal } from '../components/movie-modal.js';
import { getTMDBService } from '../services/tmdb.js';
import { ENV } from '../config/env.js';

export class HomeTab {
    constructor(container) {
        this.container = container;
        this.currentHeroIndex = 0;
        this.heroInterval = null;
        this.trendingMovies = [];
        this.allTimeBest = [];
        this.categoryMovies = {};
    }
    
    async render() {
        const movies = store.get('movies');
        const swipeHistory = store.get('swipeHistory');
        const currentMovie = store.get('currentMovie');
        
        // Get loved movies for "Your Favorites" section
        const lovedMovies = swipeHistory
            .filter(s => s.action === 'love')
            .map(s => s.movie)
            .filter(Boolean)
            .slice(0, 5);
        
        // Fetch trending and best movies from TMDB
        await this.fetchTMDBData();
        
        // Get top picks (high rated, matching genres)
        const topPicks = movies
            .filter(m => m.imdb >= 7.5)
            .sort((a, b) => b.imdb - a.imdb)
            .slice(0, 6);
        
        // Hero movies (use trending if available, otherwise top rated)
        const heroMovies = this.trendingMovies.length > 0 
            ? this.trendingMovies.slice(0, 4)
            : movies.sort((a, b) => b.imdb - a.imdb).slice(0, 4);
        
        this.container.innerHTML = `
            <div style="background: linear-gradient(180deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%); min-height: 100vh; overflow-x: hidden; padding-bottom: 100px;">
                
                <!-- Gradient Greeting -->
                <div style="padding: 2rem 1.5rem 1rem; background: linear-gradient(135deg, rgba(255, 46, 99, 0.15), rgba(255, 153, 0, 0.1)); border-bottom: 1px solid rgba(255, 46, 99, 0.2);">
                    <h1 style="font-size: 2rem; font-weight: 800; margin: 0; background: linear-gradient(135deg, #fff, #ff2e63); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                        Welcome back!
                    </h1>
                    <p style="color: rgba(255, 255, 255, 0.6); margin-top: 0.5rem; font-size: 0.875rem;">
                        Trending movies and personalized picks
                    </p>
                </div>
                
                <!-- Hero Carousel -->
                <div style="position: relative; height: 70vh; overflow: hidden; margin-bottom: 2rem;">
                    ${heroMovies.map((movie, index) => this.renderHeroSlide(movie, index)).join('')}
                    
                    <!-- Carousel Indicators -->
                    <div style="position: absolute; bottom: 2rem; left: 50%; transform: translateX(-50%); display: flex; gap: 0.5rem; z-index: 10;">
                        ${heroMovies.map((_, index) => `
                            <button 
                                class="hero-indicator" 
                                data-index="${index}"
                                style="width: ${index === 0 ? '32px' : '12px'}; height: 12px; border-radius: 6px; background: ${index === 0 ? 'linear-gradient(90deg, #ff2e63, #ff9900)' : 'rgba(255, 255, 255, 0.3)'}; border: none; cursor: pointer; transition: all 0.3s; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);"
                            ></button>
                        `).join('')}
                    </div>
                </div>
                
                <!-- TRENDING THIS WEEK IN UK -->
                ${this.trendingMovies.length > 0 ? `
                    <div style="padding: 0 1.5rem; margin-bottom: 3rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                            <div style="width: 4px; height: 24px; background: linear-gradient(180deg, #ff2e63, #ff9900); border-radius: 2px;"></div>
                            <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0;">
                                🔥 Trending This Week in UK
                            </h2>
                            <span style="padding: 0.25rem 0.75rem; background: rgba(255, 46, 99, 0.2); border: 1px solid rgba(255, 46, 99, 0.4); border-radius: 0.5rem; font-size: 0.75rem; font-weight: 700; color: #ff2e63; margin-left: auto; text-transform: uppercase;">
                                HOT
                            </span>
                        </div>
                        <div style="display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 1rem; -webkit-overflow-scrolling: touch; scrollbar-width: none;">
                            ${this.trendingMovies.slice(0, 10).map((movie, index) => this.renderTrendingCard(movie, index + 1)).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- YOUR FAVORITES -->
                ${lovedMovies.length > 0 ? `
                    <div style="padding: 0 1.5rem; margin-bottom: 3rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <div style="width: 4px; height: 24px; background: linear-gradient(180deg, #ff006e, #d90062); border-radius: 2px;"></div>
                                <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0;">
                                    💜 Your Favorites
                                </h2>
                            </div>
                            <span style="font-size: 0.75rem; color: rgba(255, 0, 110, 0.8); font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">
                                ${lovedMovies.length} movies
                            </span>
                        </div>
                        <div style="display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 1rem; -webkit-overflow-scrolling: touch; scrollbar-width: none;">
                            ${lovedMovies.map(movie => this.renderLovedCard(movie)).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- ALL-TIME BEST MOVIES -->
                ${this.allTimeBest.length > 0 ? `
                    <div style="padding: 0 1.5rem; margin-bottom: 3rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                            <div style="width: 4px; height: 24px; background: linear-gradient(180deg, #fbbf24, #f59e0b); border-radius: 2px;"></div>
                            <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0;">
                                👑 All-Time Best Movies
                            </h2>
                            <span style="padding: 0.25rem 0.75rem; background: rgba(251, 191, 36, 0.2); border: 1px solid rgba(251, 191, 36, 0.4); border-radius: 0.5rem; font-size: 0.75rem; font-weight: 700; color: #fbbf24; margin-left: auto; text-transform: uppercase;">
                                IMDb Top Rated
                            </span>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                            ${this.allTimeBest.slice(0, 6).map((movie, index) => this.renderBestMovieCard(movie, index + 1)).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- BEST ACTION MOVIES -->
                ${this.categoryMovies.action?.length > 0 ? `
                    <div style="padding: 0 1.5rem; margin-bottom: 3rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                            <div style="width: 4px; height: 24px; background: linear-gradient(180deg, #ef4444, #dc2626); border-radius: 2px;"></div>
                            <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0;">
                                💥 Best Action Movies
                            </h2>
                        </div>
                        <div style="display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 1rem; -webkit-overflow-scrolling: touch; scrollbar-width: none;">
                            ${this.categoryMovies.action.slice(0, 8).map(movie => this.renderCategoryCard(movie)).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- BEST SCI-FI MOVIES -->
                ${this.categoryMovies.scifi?.length > 0 ? `
                    <div style="padding: 0 1.5rem; margin-bottom: 3rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                            <div style="width: 4px; height: 24px; background: linear-gradient(180deg, #8b5cf6, #7c3aed); border-radius: 2px;"></div>
                            <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0;">
                                🚀 Best Sci-Fi Movies
                            </h2>
                        </div>
                        <div style="display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 1rem; -webkit-overflow-scrolling: touch; scrollbar-width: none;">
                            ${this.categoryMovies.scifi.slice(0, 8).map(movie => this.renderCategoryCard(movie)).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- BEST COMEDY MOVIES -->
                ${this.categoryMovies.comedy?.length > 0 ? `
                    <div style="padding: 0 1.5rem; margin-bottom: 3rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                            <div style="width: 4px; height: 24px; background: linear-gradient(180deg, #10b981, #059669); border-radius: 2px;"></div>
                            <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0;">
                                😂 Best Comedy Movies
                            </h2>
                        </div>
                        <div style="display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 1rem; -webkit-overflow-scrolling: touch; scrollbar-width: none;">
                            ${this.categoryMovies.comedy.slice(0, 8).map(movie => this.renderCategoryCard(movie)).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- BEST HORROR MOVIES -->
                ${this.categoryMovies.horror?.length > 0 ? `
                    <div style="padding: 0 1.5rem; margin-bottom: 3rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                            <div style="width: 4px; height: 24px; background: linear-gradient(180deg, #7c3aed, #6d28d9); border-radius: 2px;"></div>
                            <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0;">
                                👻 Best Horror Movies
                            </h2>
                        </div>
                        <div style="display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 1rem; -webkit-overflow-scrolling: touch; scrollbar-width: none;">
                            ${this.categoryMovies.horror.slice(0, 8).map(movie => this.renderCategoryCard(movie)).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- CONTINUE SWIPING -->
                ${currentMovie ? `
                    <div style="padding: 0 1.5rem; margin-bottom: 3rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                            <div style="width: 4px; height: 24px; background: linear-gradient(180deg, #ec4899, #db2777); border-radius: 2px;"></div>
                            <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0;">
                                Continue Swiping
                            </h2>
                        </div>
                        ${this.renderContinueSwiping(currentMovie, swipeHistory, movies)}
                    </div>
                ` : ''}
            </div>
        `;
        
        this.attachListeners();
        this.startHeroCarousel();
    }
    
    async fetchTMDBData() {
        try {
            const tmdbService = getTMDBService();
            
            if (ENV.APP.debug) {
                console.log('[HomeTab] Fetching trending movies...');
            }
            this.trendingMovies = await tmdbService.fetchTrendingWeek('GB');
            if (ENV.APP.debug) {
                console.log('[HomeTab] Trending movies:', this.trendingMovies.length);
            }
            
            if (ENV.APP.debug) {
                console.log('[HomeTab] Fetching all-time best...');
            }
            this.allTimeBest = await tmdbService.fetchTopRated();
            if (ENV.APP.debug) {
                console.log('[HomeTab] All-time best:', this.allTimeBest.length);
            }
            
            if (ENV.APP.debug) {
                console.log('[HomeTab] Fetching category movies...');
            }
            this.categoryMovies = {
                action: await tmdbService.fetchByGenre(28, 'Action'),
                scifi: await tmdbService.fetchByGenre(878, 'Sci-Fi'),
                comedy: await tmdbService.fetchByGenre(35, 'Comedy'),
                horror: await tmdbService.fetchByGenre(27, 'Horror')
            };
            if (ENV.APP.debug) {
                console.log('[HomeTab] Categories fetched');
            }
            
        } catch (error) {
            console.error('[HomeTab] Error fetching TMDB data:', error);
            // Set empty arrays so UI doesn't break
            this.trendingMovies = [];
            this.allTimeBest = [];
            this.categoryMovies = {
                action: [],
                scifi: [],
                comedy: [],
                horror: []
            };
        }
    }
    
    renderHeroSlide(movie, index) {
        const posterUrl = movie.backdrop_path || movie.poster_path || 'https://placehold.co/1280x720/1a1a2e/ffffff?text=' + encodeURIComponent(movie.title);
        
        return `
            <div class="hero-slide" data-index="${index}" style="position: absolute; inset: 0; opacity: ${index === 0 ? 1 : 0}; transition: opacity 0.6s ease-in-out; pointer-events: ${index === 0 ? 'auto' : 'none'};">
                <!-- Background Image -->
                <div style="position: absolute; inset: 0; overflow: hidden;">
                    <img 
                        src="${posterUrl}" 
                        alt="${movie.title}"
                        style="width: 100%; height: 100%; object-fit: cover; filter: brightness(0.4);"
                    >
                    <div style="position: absolute; inset: 0; background: linear-gradient(180deg, transparent 0%, rgba(10, 10, 15, 0.8) 70%, #0a0a0f 100%);"></div>
                </div>
                
                <!-- Content -->
                <div style="position: absolute; bottom: 4rem; left: 1.5rem; right: 1.5rem; z-index: 1;">
                    <h2 style="font-size: 2rem; font-weight: 800; color: white; margin: 0 0 1rem 0; line-height: 1.2; text-shadow: 0 4px 12px rgba(0, 0, 0, 0.8);">
                        ${movie.title}
                    </h2>
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
                        <span style="padding: 0.5rem 1rem; background: rgba(251, 191, 36, 0.3); backdrop-filter: blur(10px); border: 1px solid rgba(251, 191, 36, 0.5); border-radius: 0.75rem; font-size: 0.875rem; font-weight: 700; color: #fbbf24; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
                            ⭐ ${movie.imdb || movie.vote_average?.toFixed(1) || 'N/A'}
                        </span>
                        <span style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.9); font-weight: 600;">${movie.year || 'N/A'}</span>
                        <span style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.9); font-weight: 600;">${movie.genre || 'N/A'}</span>
                    </div>
                    <p style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.85); line-height: 1.6; margin: 0 0 1.5rem 0; max-height: 4.8em; overflow: hidden; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);">
                        ${(movie.synopsis || movie.overview || 'No description available.').slice(0, 150)}...
                    </p>
                    <button 
                        class="hero-cta" 
                        data-movie-id="${movie.id}"
                        style="padding: 1rem 2rem; background: linear-gradient(135deg, #ff2e63, #ff9900); border: none; border-radius: 0.75rem; color: white; font-size: 1rem; font-weight: 700; cursor: pointer; box-shadow: 0 8px 24px rgba(255, 46, 99, 0.4); transition: all 0.3s;"
                        onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 12px 32px rgba(255, 46, 99, 0.6)'"
                        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 8px 24px rgba(255, 46, 99, 0.4)'"
                    >
                        ▶ Watch Trailer
                    </button>
                </div>
            </div>
        `;
    }
    
    renderTrendingCard(movie, rank) {
        const posterUrl = movie.poster_path || `https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}`;
        
        const rankColors = {
            1: 'linear-gradient(135deg, #fbbf24, #f59e0b)', // Gold
            2: 'linear-gradient(135deg, #d1d5db, #9ca3af)', // Silver
            3: 'linear-gradient(135deg, #f97316, #ea580c)'  // Bronze
        };
        const rankColor = rankColors[rank] || 'linear-gradient(135deg, #6366f1, #4f46e5)';
        
        return `
            <div data-movie-id="${movie.id}" style="position: relative; flex-shrink: 0; width: 160px; cursor: pointer; transition: transform 0.3s; border-radius: 1rem; overflow: hidden; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                <img 
                    src="${posterUrl}" 
                    alt="${movie.title}"
                    style="width: 100%; height: 240px; object-fit: cover;"
                >
                <!-- Rank Badge -->
                <div style="position: absolute; top: 0.5rem; left: 0.5rem; width: 40px; height: 40px; border-radius: 50%; background: ${rankColor}; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 800; color: white; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5); border: 2px solid rgba(255, 255, 255, 0.3);">
                    ${rank}
                </div>
                <!-- Trending Badge -->
                <div style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem 0.75rem; background: linear-gradient(135deg, #ff2e63, #ff9900); border-radius: 0.5rem; font-size: 0.625rem; font-weight: 700; color: white; text-transform: uppercase; box-shadow: 0 4px 12px rgba(255, 46, 99, 0.5);">
                    🔥 HOT
                </div>
                <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 1rem 0.75rem; background: linear-gradient(0deg, rgba(0, 0, 0, 0.95), transparent);">
                    <h4 style="font-size: 0.875rem; font-weight: 700; color: white; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${movie.title}
                    </h4>
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;">
                        <span style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.7);">${movie.year || 'N/A'}</span>
                        <span style="padding: 0.125rem 0.5rem; background: rgba(251, 191, 36, 0.3); border-radius: 0.375rem; font-size: 0.625rem; font-weight: 700; color: #fbbf24;">
                            ⭐ ${movie.imdb || movie.vote_average?.toFixed(1) || 'N/A'}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderBestMovieCard(movie, rank) {
        const posterUrl = movie.poster_path || `https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}`;
        
        return `
            <div data-movie-id="${movie.id}" style="position: relative; cursor: pointer; transition: transform 0.3s; border-radius: 1rem; overflow: hidden; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); border: 2px solid ${rank <= 3 ? 'rgba(251, 191, 36, 0.5)' : 'rgba(255, 255, 255, 0.1)'};" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                <img 
                    src="${posterUrl}" 
                    alt="${movie.title}"
                    style="width: 100%; height: 260px; object-fit: cover;"
                >
                <!-- Rank Badge -->
                <div style="position: absolute; top: 0.75rem; left: 0.75rem; width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #fbbf24, #f59e0b); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; color: white; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5); border: 3px solid rgba(255, 255, 255, 0.3);">
                    ${rank}
                </div>
                <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 1.25rem; background: linear-gradient(0deg, rgba(0, 0, 0, 0.95), transparent);">
                    <h4 style="font-size: 1rem; font-weight: 700; color: white; margin: 0 0 0.5rem 0; line-height: 1.3;">
                        ${movie.title}
                    </h4>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="padding: 0.375rem 0.75rem; background: rgba(251, 191, 36, 0.3); border-radius: 0.5rem; font-size: 0.875rem; font-weight: 700; color: #fbbf24;">
                            ⭐ ${movie.imdb || movie.vote_average?.toFixed(1) || 'N/A'}
                        </span>
                        <span style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.7);">${movie.year || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderCategoryCard(movie) {
        const posterUrl = movie.poster_path || `https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}`;
        
        return `
            <div data-movie-id="${movie.id}" style="position: relative; flex-shrink: 0; width: 160px; cursor: pointer; transition: transform 0.3s; border-radius: 1rem; overflow: hidden; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                <img 
                    src="${posterUrl}" 
                    alt="${movie.title}"
                    style="width: 100%; height: 240px; object-fit: cover;"
                >
                <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 1rem 0.75rem; background: linear-gradient(0deg, rgba(0, 0, 0, 0.95), transparent);">
                    <h4 style="font-size: 0.875rem; font-weight: 700; color: white; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${movie.title}
                    </h4>
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;">
                        <span style="padding: 0.125rem 0.5rem; background: rgba(251, 191, 36, 0.3); border-radius: 0.375rem; font-size: 0.625rem; font-weight: 700; color: #fbbf24;">
                            ⭐ ${movie.imdb || movie.vote_average?.toFixed(1) || 'N/A'}
                        </span>
                        <span style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.7);">${movie.year || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderLovedCard(movie) {
        const posterUrl = movie.poster_path || `https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}`;
        
        return `
            <div data-movie-id="${movie.id}" style="position: relative; flex-shrink: 0; width: 160px; cursor: pointer; transition: transform 0.3s; border-radius: 1rem; overflow: hidden; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                <img 
                    src="${posterUrl}" 
                    alt="${movie.title}"
                    style="width: 100%; height: 240px; object-fit: cover;"
                >
                <div style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem 0.5rem; background: linear-gradient(135deg, #ff006e, #d90062); border-radius: 0.5rem; font-size: 0.625rem; font-weight: 700; color: white; text-transform: uppercase; box-shadow: 0 4px 12px rgba(255, 0, 110, 0.5);">
                    LOVE
                </div>
                <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 1rem 0.75rem; background: linear-gradient(0deg, rgba(0, 0, 0, 0.95), transparent);">
                    <h4 style="font-size: 0.875rem; font-weight: 700; color: white; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${movie.title}
                    </h4>
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;">
                        <span style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.7);">${movie.year}</span>
                        <span style="padding: 0.125rem 0.5rem; background: rgba(251, 191, 36, 0.3); border-radius: 0.375rem; font-size: 0.625rem; font-weight: 700; color: #fbbf24;">
                            ⭐ ${movie.imdb}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderContinueSwiping(currentMovie, swipeHistory, allMovies) {
        const remaining = allMovies.length - swipeHistory.length;
        const progress = ((swipeHistory.length / allMovies.length) * 100).toFixed(0);
        const posterUrl = currentMovie.poster_path || `https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(currentMovie.title)}`;
        
        return `
            <div style="backdrop-filter: blur(10px); background: linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(219, 39, 119, 0.15)); border: 1px solid rgba(236, 72, 153, 0.3); border-radius: 1.5rem; padding: 1.5rem; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);">
                <div style="display: flex; gap: 1.5rem; align-items: center;">
                    <!-- Poster -->
                    <div style="width: 100px; height: 150px; border-radius: 0.75rem; overflow: hidden; flex-shrink: 0; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);">
                        <img 
                            src="${posterUrl}" 
                            alt="${currentMovie.title}"
                            style="width: 100%; height: 100%; object-fit: cover;"
                        >
                    </div>
                    
                    <!-- Info -->
                    <div style="flex: 1; min-width: 0;">
                        <h3 style="font-size: 1.125rem; font-weight: 700; color: white; margin: 0 0 0.5rem 0;">
                            ${currentMovie.title}
                        </h3>
                        <p style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.7); margin: 0 0 1rem 0;">
                            ${remaining} movies remaining
                        </p>
                        
                        <!-- Progress Circle -->
                        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                            <svg width="60" height="60" style="transform: rotate(-90deg);">
                                <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255, 255, 255, 0.1)" stroke-width="4"></circle>
                                <circle cx="30" cy="30" r="26" fill="none" stroke="url(#gradient)" stroke-width="4" stroke-dasharray="${163.36 * progress / 100} 163.36" stroke-linecap="round"></circle>
                                <defs>
                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" style="stop-color:#ec4899" />
                                        <stop offset="100%" style="stop-color:#db2777" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div>
                                <div style="font-size: 1.5rem; font-weight: 800; color: white; line-height: 1;">
                                    ${progress}%
                                </div>
                                <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.6); margin-top: 0.25rem;">
                                    Complete
                                </div>
                            </div>
                        </div>
                        
                        <!-- CTA Button -->
                        <button 
                            data-nav="swipe"
                            style="width: 100%; padding: 1rem; background: linear-gradient(135deg, #ec4899, #db2777); border: none; border-radius: 0.75rem; color: white; font-size: 1rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 16px rgba(236, 72, 153, 0.4); transition: all 0.3s;"
                            onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 6px 20px rgba(236, 72, 153, 0.6)'"
                            onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 16px rgba(236, 72, 153, 0.4)'"
                        >
                            Continue Swiping →
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    attachListeners() {
        if (ENV.APP.debug) {
            console.log('[HomeTab] Attaching listeners...');
        }
        
        // Hero CTAs
        const heroCtas = this.container.querySelectorAll('.hero-cta');
        heroCtas.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const movieId = button.dataset.movieId;
                const allMovies = [...this.trendingMovies, ...this.allTimeBest, ...Object.values(this.categoryMovies).flat()];
                const movie = allMovies.find(m => String(m.id) === String(movieId));
                if (movie) {
                    if (ENV.APP.debug) {
                        console.log('[HomeTab] Opening hero movie modal:', movie.title);
                    }
                    movieModal.show(movie);
                }
            });
        });
        
        // Hero indicators
        const indicators = this.container.querySelectorAll('.hero-indicator');
        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                this.currentHeroIndex = index;
                this.updateHeroSlides();
            });
        });
        
        // Navigation buttons
        const navButtons = this.container.querySelectorAll('[data-nav]');
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tab = button.dataset.nav;
                document.dispatchEvent(new CustomEvent('navigate-tab', { detail: { tab } }));
            });
        });
        
        // Movie cards
        const movieCards = this.container.querySelectorAll('[data-movie-id]');
        if (ENV.APP.debug) {
            console.log('[HomeTab] Found movie cards:', movieCards.length);
        }
        
        movieCards.forEach((card, index) => {
            card.addEventListener('click', () => {
                const movieId = card.dataset.movieId;
                
                // Search in all movie sources
                const allMovies = [
                    ...store.get('movies'),
                    ...this.trendingMovies,
                    ...this.allTimeBest,
                    ...Object.values(this.categoryMovies).flat()
                ];
                
                const movie = allMovies.find(m => String(m.id) === String(movieId));
                
                if (movie) {
                    if (ENV.APP.debug) {
                        console.log('[HomeTab] Opening modal for:', movie.title);
                    }
                    movieModal.show(movie);
                } else {
                    console.error('[HomeTab] Movie not found for ID:', movieId);
                }
            });
        });
        
        if (ENV.APP.debug) {
            console.log('[HomeTab] All listeners attached');
        }
    }
    
    startHeroCarousel() {
        if (this.heroInterval) {
            clearInterval(this.heroInterval);
        }
        
        this.heroInterval = setInterval(() => {
            const slides = this.container.querySelectorAll('.hero-slide');
            if (slides.length === 0) return;
            
            this.currentHeroIndex = (this.currentHeroIndex + 1) % slides.length;
            this.updateHeroSlides();
        }, 5000);
    }
    
    updateHeroSlides() {
        const slides = this.container.querySelectorAll('.hero-slide');
        const indicators = this.container.querySelectorAll('.hero-indicator');
        
        slides.forEach((slide, index) => {
            slide.style.opacity = index === this.currentHeroIndex ? '1' : '0';
            slide.style.pointerEvents = index === this.currentHeroIndex ? 'auto' : 'none';
        });
        
        indicators.forEach((indicator, index) => {
            indicator.style.width = index === this.currentHeroIndex ? '32px' : '12px';
            indicator.style.background = index === this.currentHeroIndex 
                ? 'linear-gradient(90deg, #ff2e63, #ff9900)'
                : 'rgba(255, 255, 255, 0.3)';
        });
    }
    
    destroy() {
        if (this.heroInterval) {
            clearInterval(this.heroInterval);
            this.heroInterval = null;
        }
    }
}
