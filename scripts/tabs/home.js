/**
 * Home Tab
 * Dashboard with recommendations and stats
 */

import { store } from '../state/store.js';
import { movieModal } from '../components/movie-modal.js';
import { getPlatformStyle } from '../utils/scoring.js';

export class HomeTab {
    constructor(container) {
        this.container = container;
    }
    
    render() {
        const movies = store.get('movies');
        const swipeHistory = store.get('swipeHistory');
        
        const stats = this.calculateStats(swipeHistory);
        
        this.container.innerHTML = `
            <div class="container" style="padding: 1.5rem;">
                <h1 style="margin-bottom: 0.5rem;">Welcome Back!</h1>
                <p style="color: var(--color-text-secondary); margin-bottom: 2rem;">
                    Find your next perfect movie match
                </p>
                
                <div class="stagger-children" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 2rem;">
                    <div class="card" style="text-align: center; padding: 1rem;">
                        <div style="font-size: 2rem; font-weight: 800; color: var(--color-primary); margin-bottom: 0.25rem;">
                            ${stats.todayCount}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">
                            Swiped Today
                        </div>
                    </div>
                    
                    <div class="card" style="text-align: center; padding: 1rem;">
                        <div style="font-size: 2rem; font-weight: 800; color: var(--love-glow); margin-bottom: 0.25rem;">
                            ${stats.loveCount}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">
                            Loved
                        </div>
                    </div>
                    
                    <div class="card" style="text-align: center; padding: 1rem;">
                        <div style="font-size: 2rem; font-weight: 800; color: var(--like-glow); margin-bottom: 0.25rem;">
                            ${stats.matchCount}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">
                            Matches Found
                        </div>
                    </div>
                    
                    <div class="card" style="text-align: center; padding: 1rem;">
                        <div style="font-size: 2rem; font-weight: 800; color: var(--color-reel); margin-bottom: 0.25rem;">
                            ${movies.length}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">
                            In Library
                        </div>
                    </div>
                </div>
                
                ${this.getContinueSwipingSection()}
                
                <h2 style="font-size: 1.25rem; margin-bottom: 1rem;">Trending This Week</h2>
                <div style="margin-bottom: 2rem;">
                    ${this.getTrendingSection(movies)}
                </div>
                
                <h2 style="font-size: 1.25rem; margin-bottom: 1rem;">Recommended For You</h2>
                <div class="stagger-children">
                    ${this.getRecommendationsSection(movies, swipeHistory)}
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-top: 2rem;">
                    <button class="btn btn-primary" style="width: 100%; padding: 1rem;" data-nav="swipe">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.054-4.312 2.655-.715-1.601-2.377-2.655-4.313-2.655C4.099 3.75 2 5.765 2 8.25c0 7.22 9 12 10 12s10-4.78 10-12z" />
                        </svg>
                        <span>Start Swiping</span>
                    </button>
                    
                    <button class="btn btn-secondary" style="width: 100%; padding: 1rem;" data-nav="matches">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>View Matches</span>
                    </button>
                </div>
            </div>
        `;
        
        this.attachListeners();
    }
    
    calculateStats(swipeHistory) {
        const today = new Date().toDateString();
        
        return {
            todayCount: swipeHistory.filter(s => {
                return new Date(s.timestamp || Date.now()).toDateString() === today;
            }).length,
            loveCount: swipeHistory.filter(s => s.action === 'love').length,
            likeCount: swipeHistory.filter(s => s.action === 'like').length,
            matchCount: 0,
            totalCount: swipeHistory.length
        };
    }
    
    getContinueSwipingSection() {
        const currentMovie = store.get('currentMovie');
        
        if (!currentMovie) {
            return '';
        }
        
        const { icon, color } = getPlatformStyle(currentMovie.platform);
        
        // Use real poster if available
        const posterUrl = currentMovie.poster_path || `https://placehold.co/200x280/${color.replace('#', '')}/ffffff?text=${encodeURIComponent(currentMovie.title)}`;
        
        return `
            <div class="card" style="margin-bottom: 2rem; padding: 0; overflow: hidden; cursor: pointer;" data-nav="swipe">
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <div style="width: 100px; height: 140px; flex-shrink: 0; background: ${color}; position: relative; overflow: hidden;">
                        <img 
                            src="${posterUrl}" 
                            alt="${currentMovie.title}"
                            style="width: 100%; height: 100%; object-fit: cover;"
                            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                        >
                        <div style="position: absolute; inset: 0; display: none; align-items: center; justify-content: center; font-size: 3rem; background: linear-gradient(135deg, ${color}, ${color}dd);">
                            🎬
                        </div>
                    </div>
                    <div style="flex: 1; padding: 1rem 1rem 1rem 0;">
                        <div style="font-size: 0.75rem; color: var(--color-primary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">
                            Continue Swiping
                        </div>
                        <h3 style="font-size: 1.125rem; margin-bottom: 0.25rem;">${currentMovie.title}</h3>
                        <p style="font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 0.5rem;">
                            ${currentMovie.year} • ${currentMovie.genre}
                        </p>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span class="badge badge-imdb" style="font-size: 0.625rem;">IMDb ${currentMovie.imdb}</span>
                            <span style="font-size: 0.75rem; color: var(--color-text-secondary);">${currentMovie.platform}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    getTrendingSection(movies) {
        const trending = movies.slice(0, 3);
        
        return `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${trending.map((movie, index) => {
                    return `
                        <div class="card" style="padding: 1rem; cursor: pointer;" data-movie-id="${movie.id}">
                            <div style="display: flex; gap: 1rem; align-items: center;">
                                <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, var(--color-primary), var(--color-reel)); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; color: white; flex-shrink: 0;">
                                    ${index + 1}
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                    <h4 style="font-size: 1rem; margin-bottom: 0.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${movie.title}</h4>
                                    <p style="font-size: 0.75rem; color: var(--color-text-secondary);">
                                        ${movie.genre} • IMDb ${movie.imdb}
                                    </p>
                                </div>
                                <div style="font-size: 0.75rem; color: var(--color-text-secondary); display: flex; align-items: center; gap: 0.25rem;">
                                    <span style="color: var(--color-primary);">↑</span>
                                    ${Math.floor(Math.random() * 50) + 10}%
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    getRecommendationsSection(movies, swipeHistory) {
        const swipedIds = new Set(swipeHistory.map(s => s.movie?.id).filter(Boolean));
        const recommendations = movies.filter(m => !swipedIds.has(m.id)).slice(0, 4);
        
        if (recommendations.length === 0) {
            return `
                <div class="empty-state" style="min-height: 200px;">
                    <p style="color: var(--color-text-secondary);">You've seen all our recommendations! Check back later for more.</p>
                </div>
            `;
        }
        
        return recommendations.map(movie => {
            const { icon, color } = getPlatformStyle(movie.platform);
            const posterUrl = movie.poster_path || `https://placehold.co/160x240/${color.replace('#', '')}/ffffff?text=${encodeURIComponent(movie.title)}`;
            
            return `
                <div class="card" style="margin-bottom: 1rem; padding: 0; overflow: hidden; cursor: pointer;" data-movie-id="${movie.id}">
                    <div style="display: flex; gap: 1rem;">
                        <div style="width: 80px; height: 120px; background: ${color}; flex-shrink: 0; overflow: hidden; position: relative;">
                            <img 
                                src="${posterUrl}" 
                                alt="${movie.title}"
                                style="width: 100%; height: 100%; object-fit: cover;"
                                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                            >
                            <div style="position: absolute; inset: 0; display: none; align-items: center; justify-content: center; font-size: 2rem; background: linear-gradient(135deg, ${color}, ${color}dd);">
                                🎬
                            </div>
                        </div>
                        <div style="flex: 1; padding: 1rem 1rem 1rem 0;">
                            <h4 style="font-size: 1rem; margin-bottom: 0.25rem;">${movie.title}</h4>
                            <p style="font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 0.5rem;">
                                ${movie.year} • ${movie.genre}
                            </p>
                            <p style="font-size: 0.75rem; color: var(--color-text-secondary); line-height: 1.4;" class="line-clamp-2">
                                ${movie.synopsis}
                            </p>
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;">
                                <span class="badge badge-imdb" style="font-size: 0.625rem;">IMDb ${movie.imdb}</span>
                                <div style="display: flex; align-items: center; gap: 0.25rem;">
                                    <span style="width: 16px; height: 16px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; font-size: 0.5rem; color: white; font-weight: 800;">${icon}</span>
                                    <span style="font-size: 0.625rem; color: var(--color-text-secondary);">${movie.platform}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    attachListeners() {
        const navButtons = this.container.querySelectorAll('[data-nav]');
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tab = button.dataset.nav;
                document.dispatchEvent(new CustomEvent('navigate-tab', { detail: { tab } }));
            });
        });
        
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
        // Cleanup if needed
    }
}
