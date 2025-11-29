/**
 * Home Tab - ULTRA PREMIUM NETFLIX REDESIGN
 * Hero carousel, personalized sections, cinematic atmosphere
 */

import { store } from '../state/store.js';
import { movieModal } from '../components/movie-modal.js';
import { getPlatformStyle } from '../utils/scoring.js';

export class HomeTab {
    constructor(container) {
        this.container = container;
        this.currentHeroIndex = 0;
        this.heroInterval = null;
    }
    
    render() {
        const movies = store.get('movies');
        const swipeHistory = store.get('swipeHistory');
        const currentMovie = store.get('currentMovie');
        
        // Get loved movies for "Because You Loved" section
        const lovedMovies = swipeHistory
            .filter(s => s.action === 'love')
            .map(s => s.movie)
            .filter(Boolean)
            .slice(0, 5);
        
        // Get top picks (high rated, matching genres)
        const topPicks = movies
            .filter(m => m.imdb >= 7.5)
            .sort((a, b) => b.imdb - a.imdb)
            .slice(0, 6);
        
        // Hero movies (top 4 highest rated)
        const heroMovies = movies
            .sort((a, b) => b.imdb - a.imdb)
            .slice(0, 4);
        
        this.container.innerHTML = `
            <div style="background: linear-gradient(180deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%); min-height: 100vh; overflow-x: hidden;">
                
                <!-- Gradient Greeting -->
                <div style="padding: 2rem 1.5rem 1rem; background: linear-gradient(135deg, rgba(255, 46, 99, 0.15), rgba(255, 153, 0, 0.1)); border-bottom: 1px solid rgba(255, 46, 99, 0.2);">
                    <h1 style="font-size: 2rem; font-weight: 800; margin: 0; background: linear-gradient(135deg, #fff, #ff2e63); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                        Welcome back!
                    </h1>
                    <p style="color: rgba(255, 255, 255, 0.6); margin-top: 0.5rem; font-size: 0.875rem;">
                        Your personalized movie feed awaits
                    </p>
                </div>

                <!-- HERO CAROUSEL -->
                <div style="position: relative; height: 70vh; margin-bottom: 2rem; overflow: hidden;">
                    <div id="hero-carousel" style="position: relative; width: 100%; height: 100%; transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);">
                        ${heroMovies.map((movie, index) => this.renderHeroSlide(movie, index)).join('')}
                    </div>
                    
                    <!-- Carousel Indicators -->
                    <div style="position: absolute; bottom: 2rem; left: 50%; transform: translateX(-50%); display: flex; gap: 0.5rem; z-index: 10;">
                        ${heroMovies.map((_, index) => `
                            <div class="hero-indicator" data-index="${index}" style="width: ${index === 0 ? '32px' : '8px'}; height: 8px; border-radius: 4px; background: ${index === 0 ? 'rgba(255, 46, 99, 1)' : 'rgba(255, 255, 255, 0.3)'}; cursor: pointer; transition: all 0.3s;"></div>
                        `).join('')}
                    </div>
                </div>

                <!-- BECAUSE YOU LOVED -->
                ${lovedMovies.length > 0 ? `
                    <div style="padding: 0 1.5rem; margin-bottom: 3rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                            <div style="width: 4px; height: 24px; background: linear-gradient(180deg, #ff2e63, #ff9900); border-radius: 2px;"></div>
                            <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0;">
                                Because You Loved ${lovedMovies[0]?.title?.split(':')[0] || 'These'}
                            </h2>
                        </div>
                        <div style="display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 1rem; -webkit-overflow-scrolling: touch; scrollbar-width: none;">
                            ${lovedMovies.map(movie => this.renderLovedCard(movie)).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- TOP PICKS FOR YOU -->
                <div style="padding: 0 1.5rem; margin-bottom: 3rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <div style="width: 4px; height: 24px; background: linear-gradient(180deg, #8b5cf6, #ec4899); border-radius: 2px;"></div>
                            <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0;">
                                Top Picks For You
                            </h2>
                        </div>
                        <span style="font-size: 0.75rem; color: rgba(255, 46, 99, 0.8); font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">
                            Sci-Fi · Thriller
                        </span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                        ${topPicks.map(movie => this.renderTopPickCard(movie)).join('')}
                    </div>
                </div>

                <!-- TRENDING NOW -->
                <div style="padding: 0 1.5rem; margin-bottom: 3rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                        <div style="width: 4px; height: 24px; background: linear-gradient(180deg, #ff9900, #ff2e63); border-radius: 2px;"></div>
                        <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0;">
                            Trending Now in the UK
                        </h2>
                    </div>
                    ${movies.slice(0, 10).map((movie, index) => this.renderTrendingRow(movie, index)).join('')}
                </div>

                <!-- CONTINUE SWIPING -->
                ${currentMovie ? `
                    <div style="padding: 0 1.5rem; margin-bottom: 2rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                            <div style="width: 4px; height: 24px; background: linear-gradient(180deg, #ff2e63, #8b5cf6); border-radius: 2px;"></div>
                            <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0;">
                                Continue Swiping
                            </h2>
                        </div>
                        ${this.renderContinueCard(currentMovie, swipeHistory)}
                    </div>
                ` : ''}

                <div style="height: 100px;"></div>
            </div>
        `;
        
        this.attachListeners();
        this.startHeroCarousel(heroMovies.length);
    }
    
    renderHeroSlide(movie, index) {
        const posterUrl = movie.poster_path || movie.backdrop_path || `https://placehold.co/800x1200/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}`;
        const matchScore = Math.floor(85 + Math.random() * 15);
        
        return `
            <div class="hero-slide" data-index="${index}" style="position: absolute; width: 100%; height: 100%; opacity: ${index === 0 ? '1' : '0'}; transition: opacity 0.6s; ${index !== 0 ? 'pointer-events: none;' : ''}">
                <!-- Background Image -->
                <div style="position: absolute; inset: 0; overflow: hidden;">
                    <img 
                        src="${posterUrl}" 
                        alt="${movie.title}"
                        style="width: 100%; height: 100%; object-fit: cover; filter: brightness(0.4);"
                    >
                    <div style="position: absolute; inset: 0; background: linear-gradient(0deg, #0a0a0f 0%, transparent 50%, #0a0a0f 100%);"></div>
                </div>
                
                <!-- Glassmorphism Card -->
                <div style="position: absolute; bottom: 3rem; left: 1.5rem; right: 1.5rem; backdrop-filter: blur(20px); background: rgba(10, 10, 15, 0.75); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 1.5rem; padding: 1.5rem; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);">
                    <h2 style="font-size: 2rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0; line-height: 1.2;">
                        ${movie.title}
                    </h2>
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap;">
                        <span style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.7);">${movie.year}</span>
                        <span style="padding: 0.25rem 0.75rem; background: linear-gradient(135deg, #10b981, #059669); border-radius: 1rem; font-size: 0.75rem; font-weight: 700; color: white; box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);">
                            ${matchScore}% Match
                        </span>
                        <span style="padding: 0.25rem 0.75rem; background: rgba(251, 191, 36, 0.2); border: 1px solid rgba(251, 191, 36, 0.4); border-radius: 1rem; font-size: 0.75rem; font-weight: 700; color: #fbbf24;">
                            ⭐ ${movie.imdb}
                        </span>
                    </div>
                    <p style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.8); line-height: 1.6; margin: 0;" class="line-clamp-3">
                        ${movie.synopsis}
                    </p>
                    <button class="btn btn-primary" data-movie-id="${movie.id}" style="width: 100%; margin-top: 1rem; padding: 1rem; font-size: 1rem; background: linear-gradient(135deg, #ff2e63, #ff9900); box-shadow: 0 8px 24px rgba(255, 46, 99, 0.4);">
                        ▶ Play Now
                    </button>
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
                </div>
            </div>
        `;
    }
    
    renderTopPickCard(movie) {
        const posterUrl = movie.poster_path || `https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}`;
        
        return `
            <div data-movie-id="${movie.id}" style="position: relative; cursor: pointer; border-radius: 1rem; overflow: hidden; aspect-ratio: 2/3; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); transition: transform 0.3s;" onmouseover="this.style.transform='translateY(-8px)'" onmouseout="this.style.transform='translateY(0)'">
                <img 
                    src="${posterUrl}" 
                    alt="${movie.title}"
                    style="width: 100%; height: 100%; object-fit: cover;"
                >
                <div style="position: absolute; inset: 0; background: linear-gradient(0deg, rgba(0, 0, 0, 0.9) 0%, transparent 50%);"></div>
                <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 1rem 0.75rem;">
                    <div style="display: inline-block; padding: 0.125rem 0.5rem; background: rgba(139, 92, 246, 0.3); border: 1px solid rgba(139, 92, 246, 0.6); border-radius: 0.5rem; font-size: 0.625rem; font-weight: 700; color: #a78bfa; margin-bottom: 0.5rem;">
                        ⭐ ${movie.imdb}
                    </div>
                    <h4 style="font-size: 0.75rem; font-weight: 700; color: white; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${movie.title}
                    </h4>
                </div>
            </div>
        `;
    }
    
    renderTrendingRow(movie, index) {
        const posterUrl = movie.poster_path || `https://placehold.co/100x150/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}`;
        const { icon, color } = getPlatformStyle(movie.platform);
        
        const rankColors = [
            'linear-gradient(135deg, #fbbf24, #f59e0b)', // Gold
            'linear-gradient(135deg, #d1d5db, #9ca3af)', // Silver
            'linear-gradient(135deg, #f97316, #ea580c)', // Bronze
            'linear-gradient(135deg, #8b5cf6, #7c3aed)'  // Purple for rest
        ];
        
        const rankColor = index < 3 ? rankColors[index] : rankColors[3];
        
        return `
            <div data-movie-id="${movie.id}" style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; margin-bottom: 0.75rem; background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 1rem; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.background='rgba(255, 46, 99, 0.1)'; this.style.borderColor='rgba(255, 46, 99, 0.3)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.02)'; this.style.borderColor='rgba(255, 255, 255, 0.05)'">
                <div style="width: 48px; height: 48px; border-radius: 50%; background: ${rankColor}; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 800; color: white; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
                    ${index + 1}
                </div>
                <img 
                    src="${posterUrl}" 
                    alt="${movie.title}"
                    style="width: 60px; height: 90px; object-fit: cover; border-radius: 0.5rem; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);"
                >
                <div style="flex: 1; min-width: 0;">
                    <h4 style="font-size: 0.875rem; font-weight: 700; color: white; margin: 0 0 0.25rem 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${movie.title}
                    </h4>
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                        <span style="padding: 0.125rem 0.5rem; background: rgba(251, 191, 36, 0.2); border: 1px solid rgba(251, 191, 36, 0.4); border-radius: 0.5rem; font-size: 0.625rem; font-weight: 700; color: #fbbf24;">
                            ⭐ ${movie.imdb}
                        </span>
                        <div style="display: flex; align-items: center; gap: 0.25rem;">
                            <span style="width: 20px; height: 20px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; font-size: 0.625rem; color: white; font-weight: 800;">${icon}</span>
                            <span style="font-size: 0.625rem; color: rgba(255, 255, 255, 0.5);">${movie.platform}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderContinueCard(movie, swipeHistory) {
        const posterUrl = movie.poster_path || `https://placehold.co/400x600/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}`;
        const totalMovies = store.get('movies').length;
        const swipedCount = swipeHistory.length;
        const progress = Math.round((swipedCount / totalMovies) * 100);
        
        return `
            <div data-nav="swipe" style="position: relative; background: linear-gradient(135deg, rgba(255, 46, 99, 0.1), rgba(139, 92, 246, 0.1)); backdrop-filter: blur(20px); border: 1px solid rgba(255, 46, 99, 0.3); border-radius: 1.5rem; padding: 1.5rem; cursor: pointer; overflow: hidden; box-shadow: 0 12px 40px rgba(255, 46, 99, 0.2);">
                <div style="display: flex; gap: 1.5rem; align-items: center;">
                    <div style="position: relative; flex-shrink: 0;">
                        <img 
                            src="${posterUrl}" 
                            alt="${movie.title}"
                            style="width: 100px; height: 150px; object-fit: cover; border-radius: 1rem; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);"
                        >
                        <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
                            <svg width="60" height="60" style="transform: rotate(-90deg);">
                                <circle cx="30" cy="30" r="25" fill="none" stroke="rgba(255, 255, 255, 0.2)" stroke-width="4"/>
                                <circle cx="30" cy="30" r="25" fill="none" stroke="url(#progressGradient)" stroke-width="4" stroke-dasharray="${157 * progress / 100} 157" stroke-linecap="round"/>
                                <defs>
                                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" style="stop-color:#ff2e63;stop-opacity:1" />
                                        <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <span style="position: absolute; font-size: 0.75rem; font-weight: 700; color: white;">${progress}%</span>
                        </div>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 0.75rem; color: rgba(255, 46, 99, 0.8); font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem;">
                            Currently Swiping
                        </div>
                        <h3 style="font-size: 1.25rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0;">
                            ${movie.title}
                        </h3>
                        <p style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.6); margin-bottom: 1rem;">
                            ${swipedCount} of ${totalMovies} movies rated
                        </p>
                        <button class="btn" style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #ff2e63, #8b5cf6); color: white; font-weight: 700; border-radius: 0.75rem; box-shadow: 0 4px 16px rgba(255, 46, 99, 0.4);">
                            Continue Swiping →
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    startHeroCarousel(totalSlides) {
        if (this.heroInterval) clearInterval(this.heroInterval);
        
        this.heroInterval = setInterval(() => {
            this.currentHeroIndex = (this.currentHeroIndex + 1) % totalSlides;
            this.updateHeroSlides();
        }, 5000);
    }
    
    updateHeroSlides() {
        const slides = this.container.querySelectorAll('.hero-slide');
        const indicators = this.container.querySelectorAll('.hero-indicator');
        
        slides.forEach((slide, index) => {
            if (index === this.currentHeroIndex) {
                slide.style.opacity = '1';
                slide.style.pointerEvents = 'auto';
            } else {
                slide.style.opacity = '0';
                slide.style.pointerEvents = 'none';
            }
        });
        
        indicators.forEach((indicator, index) => {
            if (index === this.currentHeroIndex) {
                indicator.style.width = '32px';
                indicator.style.background = 'rgba(255, 46, 99, 1)';
            } else {
                indicator.style.width = '8px';
                indicator.style.background = 'rgba(255, 255, 255, 0.3)';
            }
        });
    }
    
    attachListeners() {
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
        movieCards.forEach(card => {
            card.addEventListener('click', () => {
                const movieId = card.dataset.movieId;
                const movies = store.get('movies');
                const movie = movies.find(m => m.id === movieId);
                if (movie) {
                    movieModal.show(movie);
                }
            });
        });
    }
    
    destroy() {
        if (this.heroInterval) {
            clearInterval(this.heroInterval);
            this.heroInterval = null;
        }
    }
}
