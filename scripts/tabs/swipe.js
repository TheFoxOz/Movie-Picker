/**
 * Swipe Tab Component
 * PERFECT UI — Swipe button aligned with other tabs, action buttons fixed & beautiful
 */

import { store } from '../state/store.js';
import { SwipeCard } from '../components/swipe-card.js';
import { getTMDBService } from '../services/tmdb.js';
import { showToast } from '../utils/notifications.js';
import { showConfetti } from '../utils/confetti.js';
import { ENV } from '../config/env.js';

export class SwipeTab {
    constructor() {
        this.container = null;
        this.currentCard = null;
        this.movieQueue = [];
        this.isLoading = false;
        this.swipeHandler = null;
        this.hasLoaded = false;
    }
    
    async render(container) {
        this.container = container;
        
        if (this.hasLoaded) {
            this.showNextCard();
            return;
        }
        this.hasLoaded = true;

        container.innerHTML = `
            <div style="position: relative; width: 100%; height: calc(100vh - 5rem); display: flex; flex-direction: column; padding-bottom: 8rem;">
                
                <!-- Header -->
                <div style="padding: 1.5rem 1rem; text-align: center;">
                    <h1 style="font-size: 1.5rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0;">
                        Discover Movies
                    </h1>
                    <p style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.6); margin: 0;">
                        Swipe to find your next favorite film
                    </p>
                </div>
                
                <!-- Card Container -->
                <div id="swipe-container" style="flex: 1; position: relative; display: flex; align-items: center; justify-content: center; padding: 0 1rem;">
                    <div style="color: rgba(255,255,255,0.6); text-align: center;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">Film</div>
                        <p>Loading your movies...</p>
                    </div>
                </div>

                <!-- FIXED & BEAUTIFUL ACTION BUTTONS — FLOATING ABOVE NAV -->
                <div style="position: fixed; bottom: 6.5rem; left: 0; right: 0; z-index: 90; padding: 0 1.5rem; pointer-events: none;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 1.8rem; pointer-events: auto;">
                        <button id="swipe-pass" class="swipe-action-btn" data-action="pass">
                            No
                        </button>
                        <button id="swipe-maybe" class="swipe-action-btn" data-action="maybe">
                            Question
                        </button>
                        <button id="swipe-like" class="swipe-action-btn" data-action="like">
                            Thumbs Up
                        </button>
                        <button id="swipe-love" class="swipe-action-btn" data-action="love">
                            Heart
                        </button>
                    </div>
                </div>

                <!-- Completed State -->
                <div id="swipe-completed" style="display: none; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; padding: 2rem; text-align: center; background: rgba(10, 10, 15, 0.95); z-index: 10;">
                    <div style="font-size: 5rem; margin-bottom: 1.5rem;">Party Popper</div>
                    <h2 style="font-size: 2rem; font-weight: 800; color: white; margin: 0 0 1rem 0;">
                        You Did It!
                    </h2>
                    <p style="font-size: 1.125rem; color: rgba(255, 255, 255, 0.8); margin: 0 0 2rem 0; max-width: 400px;">
                        You've swiped through all available movies. Check your Library to see your picks!
                    </p>
                    <button id="goto-library" style="padding: 1rem 2rem; background: linear-gradient(135deg, #ff2e63, #d90062); border: none; border-radius: 1rem; color: white; font-size: 1rem; font-weight: 700; cursor: pointer; transition: transform 0.3s; box-shadow: 0 8px 24px rgba(255, 46, 99, 0.4);">
                        View My Library
                    </button>
                </div>
            </div>
        `;

        // PERFECT ACTION BUTTON STYLES
        const style = document.createElement('style');
        style.textContent = `
            .swipe-action-btn {
                width: 72px;
                height: 72px;
                border-radius: 50%;
                border: none;
                font-size: 2.2rem;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(12px);
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            }
            #swipe-pass { background: rgba(239, 68, 68, 0.25); border: 4px solid rgba(239, 68, 68, 0.6); color: #ef4444; }
            #swipe-maybe { background: rgba(251, 191, 36, 0.25); border: 4px solid rgba(251, 191, 36, 0.6); color: #fbbf24; }
            #swipe-like { background: rgba(16, 185, 129, 0.25); border: 4px solid rgba(16, 185, 129, 0.6); color: #10b981; }
            #swipe-love { background: rgba(255, 46, 99, 0.25); border: 4px solid rgba(255, 46, 99, 0.6); color: #ff2e63; }

            .swipe-action-btn:hover {
                transform: scale(1.18) !important;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
            }
            .swipe-action-btn:active {
                transform: scale(0.95) !important;
            }
        `;
        document.head.appendChild(style);

        await this.loadMoviesWithRetry();
        this.attachListeners();
        this.showNextCard();
    }

    async loadMoviesWithRetry(attempt = 1) {
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            const tmdbService = getTMDBService();
            if (!tmdbService) throw new Error('TMDB service not ready');

            const sources = await Promise.all([
                tmdbService.fetchPopularMovies(5),
                tmdbService.fetchTrendingMovies(),
                tmdbService.fetchTopRatedMovies(5)
            ]);

            const map = new Map();
            sources.flat().forEach(m => map.set(m.id, m));
            let movies = Array.from(map.values());

            const state = store.getState();
            const swipedIds = new Set((state.swipeHistory || []).map(s => String(s.movie.id)));
            this.movieQueue = movies.filter(m => !swipedIds.has(String(m.id)));

            if (this.movieQueue.length < 10 && attempt <= 3) {
                setTimeout(() => this.loadMoviesWithRetry(attempt + 1), 1000);
                return;
            }

        } catch (error) {
            console.error('[SwipeTab] Failed to load movies:', error);
            showToast('Failed to load movies. Retrying...', 'error');
            if (attempt <= 3) {
                setTimeout(() => this.loadMoviesWithRetry(attempt + 1), 2000);
            }
        } finally {
            this.isLoading = false;
        }
    }
    
    showNextCard() {
        const container = this.container.querySelector('#swipe-container');
        const completed = this.container.querySelector('#swipe-completed');
        
        if (!container) return;

        if (this.movieQueue.length === 0) {
            container.innerHTML = '';
            if (completed) completed.style.display = 'flex';
            showConfetti();
            return;
        }

        if (completed) completed.style.display = 'none';

        const movie = this.movieQueue.shift();
        container.innerHTML = '';
        this.currentCard = new SwipeCard(container, movie);
    }
    
    attachListeners() {
        const actions = {
            'swipe-pass': 'pass',
            'swipe-maybe': 'maybe',
            'swipe-like': 'like',
            'swipe-love': 'love'
        };

        Object.entries(actions).forEach(([id, action]) => {
            const btn = this.container.querySelector(`#${id}`);
            if (btn) {
                btn.addEventListener('click', () => this.handleButtonAction(action));
            }
        });

        this.swipeHandler = () => setTimeout(() => this.showNextCard(), 400);
        document.addEventListener('swipe-action', this.swipeHandler);

        const gotoLibrary = this.container.querySelector('#goto-library');
        if (gotoLibrary) {
            gotoLibrary.addEventListener('click', () => {
                document.dispatchEvent(new CustomEvent('navigate-tab', {
                    detail: { tab: 'library' }
                }));
            });
        }
    }
    
    handleButtonAction(action) {
        if (this.currentCard) {
            this.currentCard.handleAction(action);
        }
    }
    
    destroy() {
        if (this.currentCard) this.currentCard.destroy();
        if (this.swipeHandler) {
            document.removeEventListener('swipe-action', this.swipeHandler);
            this.swipeHandler = null;
        }
        this.hasLoaded = false;
    }
}
