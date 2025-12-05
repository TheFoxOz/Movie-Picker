/**
 * SwipeCard Component – The actual swipeable movie card
 * FIXED: Now properly exports the class
 */

import { store } from '../state/store.js';
import { authService } from '../services/auth-service.js';
import { showConfetti, showHeartConfetti } from '../utils/confetti.js';
import { showSwipeToast } from '../utils/notifications.js';

export class SwipeCard {
    constructor(container, movie) {
        this.container = container;
        this.movie = movie;
        this.element = null;
        this.isDragging = false;
        this.startX = 0;
        this.currentX = 0;
        this.startY = 0;
        this.currentY = 0;

        this.render();
        this.attachEvents();
    }

    render() {
        const poster = this.movie.poster_path || 'https://placehold.co/300x450/111/fff?text=No+Image';

        this.element = document.createElement('div');
        this.element.className = 'swipe-card';
        this.element.innerHTML = `
            <div style="position: relative; width: 100%; max-width: 380px; border-radius: 1.5rem; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.6); background: #111; transform: rotate(0deg); transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1); user-select: none;">
                
                <!-- Overlay badges -->
                <div id="badge-nope" style="position: absolute; top: 20px; left: 20px; padding: 0.5rem 1.5rem; background: rgba(239,68,68,0.9); color: white; font-size: 2rem; font-weight: 800; border-radius: 1rem; transform: rotate(-25deg); opacity: 0; z-index: 10; box-shadow: 0 4px 20px rgba(239,68,68,0.5);">
                    NOPE
                </div>
                <div id="badge-love" style="position: absolute; top: 20px; right: 20px; padding: 0.5rem 1.5rem; background: rgba(255,0,110,0.9); color: white; font-size: 2rem; font-weight: 800; border-radius: 1rem; transform: rotate(25deg); opacity: 0; z-index: 10; box-shadow: 0 4px 20px rgba(255,0,110,0.5);">
                    LOVE
                </div>
                <div id="badge-like" style="position: absolute; top: 20px; right: 20px; padding: 0.5rem 1.5rem; background: rgba(16,185,129,0.9); color: white; font-size: 2rem; font-weight: 800; border-radius: 1rem; transform: rotate(25deg); opacity: 0; z-index: 10; box-shadow: 0 4px 20px rgba(16,185,129,0.5);">
                    LIKE
                </div>

                <!-- Poster -->
                <div style="position: relative; height: 520px; background: #000;">
                    <img src="${poster}" alt="${this.movie.title}" style="width: 100%; height: 100%; object-fit: cover;">
                    
                    <!-- Gradient overlay -->
                    <div style="position: absolute; inset: 0; background: linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 40%);"></div>
                    
                    <!-- Platform badge -->
                    <div style="position: absolute; top: 1rem; right: 1rem; padding: 0.5rem 1rem; background: rgba(0,0,0,0.7); backdrop-filter: blur(10px); border-radius: 1rem; border: 1px solid rgba(255,255,255,0.1);">
                        <span style="color: white; font-weight: 700; font-size: 0.875rem;">${this.movie.platform || 'Cinema'}</span>
                    </div>
                </div>

                <!-- Movie Info -->
                <div style="padding: 1.5rem;">
                    <h2 style="font-size: 1.75rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0;">
                        ${this.movie.title}
                    </h2>
                    <p style="color: rgba(255,255,255,0.7); font-size: 1rem; margin: 0 0 1rem 0;">
                        ${this.movie.year} • ${this.movie.genre || 'Movie'}
                    </p>
                    <p style="color: rgba(255,255,255,0.9); line-height: 1.6; margin: 0;">
                        ${this.movie.synopsis || 'No description available.'}
                    </p>
                </div>
            </div>
        `;

        this.container.appendChild(this.element);
    }

    attachEvents() {
        const card = this.element;

        const onGrab = (e) => {
            this.isDragging = true;
            this.startX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
            this.startY = e.type.includes('mouse') ? e.pageY : e.touches[0].pageY;
            card.style.transition = 'none';
        };

        const onMove = (e) => {
            if (!this.isDragging) return;

            this.currentX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
            this.currentY = e.type.includes('mouse') ? e.pageY : e.touches[0].pageY;

            const diffX = this.currentX - this.startX;
            const diffY = this.currentY - this.startY;
            const absDiffX = Math.abs(diffX);

            // Rotate card based on drag
            const rotate = diffX / 10;
            card.style.transform = `translateX(${diffX}px) translateY(${diffY}px) rotate(${rotate}deg)`;

            // Show badges
            const nopeBadge = card.querySelector('#badge-nope');
            const loveBadge = card.querySelector('#badge-love');
            const likeBadge = card.querySelector('#badge-like');

            if (absDiffX > 80) {
                if (diffX < 0) {
                    nopeBadge.style.opacity = Math.min(absDiffX / 150, 1);
                    loveBadge.style.opacity = 0;
                    likeBadge.style.opacity = 0;
                } else if (diffX > 0) {
                    loveBadge.style.opacity = Math.min(absDiffX / 150, 1);
                    nopeBadge.style.opacity = 0;
                    likeBadge.style.opacity = 0;
                }
            } else {
                nopeBadge.style.opacity = 0;
                loveBadge.style.opacity = 0;
                likeBadge.style.opacity = 0;
            }
        };

        const onRelease = () => {
            if (!this.isDragging) return;
            this.isDragging = false;

            const diffX = this.currentX - this.startX;
            const absDiffX = Math.abs(diffX);

            card.style.transition = 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';

            if (absDiffX > 120) {
                // SWIPED OFF SCREEN
                const action = diffX > 0 ? 'love' : 'pass';
                this.swipeOff(action);
            } else {
                // SNAP BACK
                card.style.transform = 'translateX(0) translateY(0) rotate(0deg)';
                card.querySelector('#badge-nope').style.opacity = 0;
                card.querySelector('#badge-love').style.opacity = 0;
            }
        };

        // Mouse events
        card.addEventListener('mousedown', onGrab);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onRelease);

        // Touch events
        card.addEventListener('touchstart', onGrab, { passive: true });
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onRelease);

        // Store cleanup
        this.cleanup = () => {
            card.removeEventListener('mousedown', onGrab);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onRelease);
            card.removeEventListener('touchstart', onGrab);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onRelease);
        };
    }

    handleAction(action) {
        this.swipeOff(action);
    }

    swipeOff(action) {
        const card = this.element;
        const diffX = action === 'love' ? 500 : action === 'like' ? 300 : -500;

        card.style.transform = `translateX(${diffX}px) rotate(${diffX / 20}deg)`;
        card.style.opacity = '0';

        // Save to history
        const swipeData = {
            movie: this.movie,
            action,
            timestamp: Date.now()
        };

        const history = [...(store.getState().swipeHistory || []), swipeData];
        store.setState({ swipeHistory: history });

        // Sync if logged in
        if (authService.isAuthenticated()) {
            authService.syncSwipeHistory(history);
        }

        // Feedback
        if (action === 'love') {
            showHeartConfetti();
            showSwipeToast(this.movie.title, 'love');
        } else if (action === 'like') {
            showConfetti();
            showSwipeToast(this.movie.title, 'like');
        } else if (action === 'pass') {
            showSwipeToast(this.movie.title, 'pass');
        }

        // Dispatch event
        document.dispatchEvent(new CustomEvent('swipe-action'));

        // Remove after animation
        setTimeout(() => {
            if (card && card.parentNode) {
                card.remove();
            }
        }, 400);
    }

    destroy() {
        if (this.cleanup) this.cleanup();
        if (this.element && this.element.parentNode) {
            this.element.remove();
        }
    }
}
