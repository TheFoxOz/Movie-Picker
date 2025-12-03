/**
 * Swipe Tab Component
 * Main swiping interface
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
    }
    
    async render(container) {
        this.container = container;
        
        container.innerHTML = `
            <div style="position: relative; width: 100%; height: calc(100vh - 5rem); display: flex; flex-direction: column;">
                
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
                    <!-- Cards will be inserted here -->
                </div>
                
                <!-- Action Buttons -->
                <div style="padding: 1.5rem 1rem 2rem; display: flex; align-items: center; justify-content: center; gap: 1rem;">
                    <button id="swipe-pass" style="width: 64px; height: 64px; border-radius: 50%; background: rgba(239, 68, 68, 0.2); border: 2px solid rgba(239, 68, 68, 0.4); color: #ef4444; font-size: 1.75rem; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                        ✕
                    </button>
                    <button id="swipe-maybe" style="width: 56px; height: 56px; border-radius: 50%; background: rgba(251, 191, 36, 0.2); border: 2px solid rgba(251, 191, 36, 0.4); color: #fbbf24; font-size: 1.5rem; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                        🤔
                    </button>
                    <button id="swipe-like" style="width: 56px; height: 56px; border-radius: 50%; background: rgba(16, 185, 129, 0.2); border: 2px solid rgba(16, 185, 129, 0.4); color: #10b981; font-size: 1.5rem; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                        👍
                    </button>
                    <button id="swipe-love" style="width: 64px; height: 64px; border-radius: 50%; background: rgba(255, 46, 99, 0.2); border: 2px solid rgba(255, 46, 99, 0.4); color: #ff2e63; font-size: 1.75rem; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                        ❤️
                    </button>
                </div>
                
                <!-- Keyboard Hints -->
                <div style="padding: 0 1rem 1rem; text-align: center;">
                    <p style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.4); margin: 0;">
                        ← Pass • ↓ Maybe • ↑ Like • → Love
                    </p>
                </div>
                
                <!-- Loading State -->
                <div id="swipe-loading" style="display: none; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(10, 10, 15, 0.9); z-index: 10;">
                    <div style="text-align: center;">
                        <div style="width: 48px; height: 48px; border: 4px solid rgba(255, 46, 99, 0.3); border-top-color: #ff2e63; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                        <p style="color: rgba(255, 255, 255, 0.7); font-size: 0.9375rem;">Loading movies...</p>
                    </div>
                </div>
                
                <!-- Completed State -->
                <div id="swipe-completed" style="display: none; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; padding: 2rem; text-align: center; background: rgba(10, 10, 15, 0.95); z-index: 10;">
                    <div style="font-size: 5rem; margin-bottom: 1.5rem;">🎉</div>
                    <h2 style="font-size: 2rem; font-weight: 800; color: white; margin: 0 0 1rem 0;">
                        You Did It!
                    </h2>
                    <p style="font-size: 1.125rem; color: rgba(255, 255, 255, 0.8); margin: 0 0 2rem 0; max-width: 400px;">
                        You've swiped through all available movies. Check your Library to see your picks!
                    </p>
                    <button id="goto-library" style="padding: 1rem 2rem; background: linear-gradient(135deg, #ff2e63, #d90062); border: none; border-radius: 1rem; color: white; font-size: 1rem; font-weight: 700; cursor: pointer; transition: transform 0.3s; box-shadow: 0 8px 24px rgba(255, 46, 99, 0.4);" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        View My Library →
                    </button>
                </div>
            </div>
        `;
        
        await this.loadMovies();
        this.attachListeners();
        this.showNextCard();
    }
    
    async loadMovies() {
        this.isLoading = true;
        const loadingEl = this.container.querySelector('#swipe-loading');
        if (loadingEl) loadingEl.style.display = 'flex';
        
        try {
            const tmdbService = getTMDBService();
            let movies = [];
            
            if (tmdbService) {
                movies = await tmdbService.fetchPopularMovies(3); // 3 pages = ~60 movies
                if (ENV.APP.debug) {
                    console.log('[SwipeTab] Loaded movies from TMDB:', movies.length);
                }
            } else {
                // Fallback movies from app.js
                const app = window.app;
                if (app && typeof app.getFallbackMovies === 'function') {
                    movies = app.getFallbackMovies();
                    if (ENV.APP.debug) {
                        console.log('[SwipeTab] Using fallback movies:', movies.length);
                    }
                }
            }
            
            // Filter out already swiped movies
            const state = store.getState();
            const swipedIds = new Set((state.swipeHistory || []).map(entry => String(entry.movie.id)));
            
            this.movieQueue = movies.filter(movie => !swipedIds.has(String(movie.id)));
            
            if (ENV.APP.debug) {
                console.log('[SwipeTab] Movies in queue after filtering:', this.movieQueue.length);
            }
            
        } catch (error) {
            console.error('[SwipeTab] Error loading movies:', error);
            showToast('Failed to load movies. Please try again.', 'error');
        } finally {
            this.isLoading = false;
            if (loadingEl) loadingEl.style.display = 'none';
        }
    }
    
    showNextCard() {
        // Check if we've run out of movies
        if (this.movieQueue.length === 0) {
            this.showCompletedState();
            return;
        }
        
        const movie = this.movieQueue.shift();
        const cardContainer = this.container.querySelector('#swipe-container');
        
        if (!cardContainer) return;
        
        // Clear previous card
        cardContainer.innerHTML = '';
        
        // Create new card
        this.currentCard = new SwipeCard(cardContainer, movie);
    }
    
    showCompletedState() {
        const completedEl = this.container.querySelector('#swipe-completed');
        const cardContainer = this.container.querySelector('#swipe-container');
        
        if (completedEl && cardContainer) {
            cardContainer.innerHTML = '';
            completedEl.style.display = 'flex';
            
            // Show confetti celebration!
            const state = store.getState();
            const swipeCount = (state.swipeHistory || []).length;
            
            if (swipeCount >= 10) { // Only if user actually swiped some movies
                setTimeout(() => showConfetti(), 300);
            }
            
            if (ENV.APP.debug) {
                console.log('[SwipeTab] All movies swiped! Total swipes:', swipeCount);
            }
        }
    }
    
    attachListeners() {
        // Action buttons
        const passBtn = this.container.querySelector('#swipe-pass');
        const maybeBtn = this.container.querySelector('#swipe-maybe');
        const likeBtn = this.container.querySelector('#swipe-like');
        const loveBtn = this.container.querySelector('#swipe-love');
        
        if (passBtn) passBtn.addEventListener('click', () => this.handleButtonAction('pass'));
        if (maybeBtn) maybeBtn.addEventListener('click', () => this.handleButtonAction('maybe'));
        if (likeBtn) likeBtn.addEventListener('click', () => this.handleButtonAction('like'));
        if (loveBtn) loveBtn.addEventListener('click', () => this.handleButtonAction('love'));
        
        // Listen for swipe actions
        document.addEventListener('swipe-action', (e) => {
            const { action } = e.detail;
            
            // Show toast with action
            const actionEmoji = {
                love: '❤️',
                like: '👍',
                maybe: '🤔',
                pass: '✕'
            };
            
            const actionText = {
                love: 'Loved',
                like: 'Liked',
                maybe: 'Maybe later',
                pass: 'Passed'
            };
            
            showToast(`${actionEmoji[action]} ${actionText[action]}`, 'success');
            
            // Show next card
            setTimeout(() => {
                this.showNextCard();
            }, 400);
        });
        
        // "Go to Library" button in completed state
        const gotoLibraryBtn = this.container.querySelector('#goto-library');
        if (gotoLibraryBtn) {
            gotoLibraryBtn.addEventListener('click', () => {
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
        if (this.currentCard) {
            this.currentCard.destroy();
        }
    }
}
