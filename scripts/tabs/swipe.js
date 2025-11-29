/**
 * Swipe Tab
 * Movie swiping interface
 */

import { store } from '../state/store.js';
import { SwipeCard } from '../components/swipe-card.js';

export class SwipeTab {
    constructor(container) {
        this.container = container;
        this.currentCard = null;
        this.boundHandleSwipeComplete = this.handleSwipeComplete.bind(this);
    }
    
    render() {
        const movies = store.get('movies');
        const swipeHistory = store.get('swipeHistory');
        
        // Get unswiped movies
        const swipedIds = new Set(swipeHistory.map(s => s.movie?.id).filter(Boolean));
        const unswipedMovies = movies.filter(m => !swipedIds.has(m.id));
        
        this.container.innerHTML = `
            <div style="position: relative; width: 100%; height: 100%; background: linear-gradient(135deg, #0a0a0f, #1a1a2e); overflow: hidden;">
                <!-- Header -->
                <div style="position: absolute; top: 0; left: 0; right: 0; padding: 1.5rem; text-align: center; z-index: 10; background: linear-gradient(180deg, rgba(10, 10, 15, 0.95), transparent); pointer-events: none;">
                    <h1 style="font-size: 1.5rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0;">
                        Find Your Next Movie
                    </h1>
                    <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.875rem; margin: 0;">
                        ${unswipedMovies.length} movies remaining
                    </p>
                </div>
                
                <!-- Card Container -->
                <div id="swipe-card-container" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 6rem 0;">
                </div>
                
                <!-- Action Buttons -->
                <div style="position: absolute; bottom: 2rem; left: 50%; transform: translateX(-50%); display: flex; gap: 1rem; z-index: 10;">
                    <button 
                        class="swipe-action-btn" 
                        data-action="pass"
                        style="width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, #ef4444, #dc2626); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4); transition: all 0.3s;"
                        onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 12px 32px rgba(239, 68, 68, 0.6)'"
                        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 8px 24px rgba(239, 68, 68, 0.4)'"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" style="width: 32px; height: 32px; color: white;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    
                    <button 
                        class="swipe-action-btn" 
                        data-action="maybe"
                        style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #fbbf24, #f59e0b); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(251, 191, 36, 0.4); transition: all 0.3s;"
                        onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 12px 32px rgba(251, 191, 36, 0.6)'"
                        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 8px 24px rgba(251, 191, 36, 0.4)'"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" style="width: 28px; height: 28px; color: white;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                        </svg>
                    </button>
                    
                    <button 
                        class="swipe-action-btn" 
                        data-action="like"
                        style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4); transition: all 0.3s;"
                        onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 12px 32px rgba(16, 185, 129, 0.6)'"
                        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 8px 24px rgba(16, 185, 129, 0.4)'"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" style="width: 28px; height: 28px; color: white;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" />
                        </svg>
                    </button>
                    
                    <button 
                        class="swipe-action-btn" 
                        data-action="love"
                        style="width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, #ff006e, #d90062); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(255, 0, 110, 0.4); transition: all 0.3s;"
                        onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 12px 32px rgba(255, 0, 110, 0.6)'"
                        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 8px 24px rgba(255, 0, 110, 0.4)'"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" stroke-width="0" stroke="currentColor" style="width: 32px; height: 32px; color: white;">
                            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                        </svg>
                    </button>
                </div>
                
                <!-- Instructions -->
                <div style="position: absolute; bottom: 5.5rem; left: 50%; transform: translateX(-50%); text-align: center; color: rgba(255, 255, 255, 0.5); font-size: 0.75rem; z-index: 10; pointer-events: none;">
                    <p style="margin: 0;">Swipe: Drag card left/right</p>
                    <p style="margin: 0.25rem 0 0 0;">Keyboard: ← Nope • ↓ Maybe • ↑ Like • → Love</p>
                </div>
                
                <!-- Empty State -->
                ${unswipedMovies.length === 0 ? `
                    <div class="empty-state" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; text-align: center;">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 80px; height: 80px; color: rgba(255, 46, 99, 0.5); margin-bottom: 1.5rem;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h2 style="font-size: 1.5rem; font-weight: 700; color: white; margin-bottom: 0.5rem;">All Done!</h2>
                        <p style="color: rgba(255, 255, 255, 0.6); margin-bottom: 2rem; max-width: 300px;">
                            You've rated all available movies. Check your matches or library!
                        </p>
                        <div style="display: flex; gap: 1rem;">
                            <button class="btn btn-primary" data-nav="matches" style="padding: 1rem 2rem;">
                                View Matches
                            </button>
                            <button class="btn btn-secondary" data-nav="library" style="padding: 1rem 2rem;">
                                Browse Library
                            </button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        // Load first card if movies available
        if (unswipedMovies.length > 0) {
            this.loadNextCard();
        }
        
        this.attachListeners();
    }
    
    loadNextCard() {
        const movies = store.get('movies');
        const swipeHistory = store.get('swipeHistory');
        const currentMovie = store.get('currentMovie');
        
        // Get unswiped movies
        const swipedIds = new Set(swipeHistory.map(s => s.movie?.id).filter(Boolean));
        const unswipedMovies = movies.filter(m => !swipedIds.has(m.id));
        
        if (unswipedMovies.length === 0) {
            console.log('[SwipeTab] No more movies to swipe');
            return;
        }
        
        // Load next movie
        const nextMovie = currentMovie && !swipedIds.has(currentMovie.id) 
            ? currentMovie 
            : unswipedMovies[0];
        
        store.set('currentMovie', nextMovie);
        
        // Create new card
        const container = this.container.querySelector('#swipe-card-container');
        if (container) {
            // Clear previous card
            if (this.currentCard) {
                this.currentCard.destroy();
            }
            
            // Clear container
            container.innerHTML = '';
            
            // Create new card
            this.currentCard = new SwipeCard(container, nextMovie);
        }
    }
    
    attachListeners() {
        // Action buttons
        const actionButtons = this.container.querySelectorAll('.swipe-action-btn');
        actionButtons.forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                if (this.currentCard) {
                    this.currentCard.handleAction(action);
                }
            });
        });
        
        // Navigation buttons (empty state)
        const navButtons = this.container.querySelectorAll('[data-nav]');
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tab = button.dataset.nav;
                document.dispatchEvent(new CustomEvent('navigate-tab', { detail: { tab } }));
            });
        });
        
        // Listen for swipe completion
        document.addEventListener('swipe-action', this.boundHandleSwipeComplete);
    }
    
    handleSwipeComplete(e) {
        console.log('[SwipeTab] Swipe complete:', e.detail);
        
        // Small delay before loading next card
        setTimeout(() => {
            const movies = store.get('movies');
            const swipeHistory = store.get('swipeHistory');
            const swipedIds = new Set(swipeHistory.map(s => s.movie?.id).filter(Boolean));
            const remaining = movies.filter(m => !swipedIds.has(m.id)).length;
            
            if (remaining === 0) {
                // Show empty state
                this.render();
            } else {
                // Load next card
                this.loadNextCard();
                
                // Update counter
                const header = this.container.querySelector('h1 + p');
                if (header) {
                    header.textContent = `${remaining} movies remaining`;
                }
            }
        }, 100);
    }
    
    destroy() {
        if (this.currentCard) {
            this.currentCard.destroy();
            this.currentCard = null;
        }
        
        document.removeEventListener('swipe-action', this.boundHandleSwipeComplete);
    }
}
