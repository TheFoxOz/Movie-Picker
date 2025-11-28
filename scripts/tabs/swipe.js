cat > /home/claude/movie-picker-refactored/scripts/tabs/swipe.js << 'EOF'
/**
 * Swipe Tab
 * Main swipe interface
 */

import { store } from '../state/store.js';
import { SwipeCard } from '../components/swipe-card.js';
import { movieModal } from '../components/movie-modal.js';
import { showSwipeToast } from '../utils/notifications.js';

export class SwipeTab {
    constructor(container) {
        this.container = container;
        this.currentCard = null;
    }
    
    render() {
        const movie = store.get('currentMovie');
        
        if (!movie) {
            this.container.innerHTML = this.getEmptyState();
            return;
        }
        
        this.container.innerHTML = `
            <div class="container" style="padding-top: 1.5rem; padding-bottom: 1.5rem;">
                <h1 style="text-align: center; margin-bottom: 1.5rem;">Find Your Next Movie</h1>
                
                <div id="card-container" style="margin-bottom: 1.5rem;"></div>
                
                <!-- Action Buttons -->
                <div style="display: flex; gap: 0.5rem; max-width: 400px; margin: 0 auto;">
                    <button class="action-button action-button-nope" data-action="pass" aria-label="Pass on this movie">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Nope</span>
                    </button>
                    
                    <button class="action-button action-button-maybe" data-action="maybe" aria-label="Maybe watch later">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                        </svg>
                        <span>Maybe</span>
                    </button>
                    
                    <button class="action-button action-button-like" data-action="like" aria-label="Like this movie">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904" />
                        </svg>
                        <span>Like</span>
                    </button>
                    
                    <button class="action-button action-button-love" data-action="love" aria-label="Love this movie">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                        </svg>
                        <span>Love</span>
                    </button>
                </div>
                
                <p style="text-align: center; color: var(--color-text-muted); font-size: 0.75rem; margin-top: 1rem;">
                    Drag the card or use buttons • Keyboard: ← → ↑ ↓
                </p>
            </div>
        `;
        
        this.renderCard();
        this.attachListeners();
    }
    
    renderCard() {
        const cardContainer = document.getElementById('card-container');
        const movie = store.get('currentMovie');
        
        if (!movie || !cardContainer) return;
        
        this.currentCard = new SwipeCard(
            movie,
            this.handleSwipe.bind(this),
            this.handleShowDetails.bind(this)
        );
        
        cardContainer.innerHTML = '';
        cardContainer.appendChild(this.currentCard.render());
    }
    
    handleSwipe(action, movie) {
        showSwipeToast(movie.title, action, () => this.handleUndo());
        store.nextMovie();
        this.render();
    }
    
    handleShowDetails(movie) {
        movieModal.show(movie);
    }
    
    handleUndo() {
        const lastSwipe = store.undoLastSwipe();
        if (lastSwipe) {
            this.render();
        }
    }
    
    attachListeners() {
        const buttons = this.container.querySelectorAll('.action-button');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                if (this.currentCard) {
                    this.currentCard.swipe(action);
                }
            });
        });
    }
    
    getEmptyState() {
        return `
            <div class="empty-state">
                <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                </svg>
                <h2>Queue Empty!</h2>
                <p>You've seen everything! Check back later for new releases or adjust your preferences.</p>
            </div>
        `;
    }
    
    destroy() {
        if (this.currentCard) {
            this.currentCard.destroy();
        }
    }
}
