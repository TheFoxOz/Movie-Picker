/**
 * SwipeCard Component – ENHANCED WITH SWIPE DIRECTION FEEDBACK
 * Shows clear visual indicators when swiping in any direction
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
                
                <!-- SWIPE DIRECTION OVERLAYS - ALL FOUR DIRECTIONS -->
                
                <!-- PASS (Left) - Red X -->
                <div id="badge-pass" class="swipe-badge" style="position: absolute; top: 50%; left: 20px; transform: translateY(-50%); padding: 1rem 2rem; background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95)); color: white; font-size: 3rem; font-weight: 800; border-radius: 1.5rem; opacity: 0; z-index: 10; box-shadow: 0 8px 32px rgba(239, 68, 68, 0.6); backdrop-filter: blur(10px); border: 3px solid rgba(255, 255, 255, 0.3); display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                    <div style="font-size: 4rem;">✕</div>
                    <div style="font-size: 1.5rem; font-weight: 700; letter-spacing: 0.1em;">NOPE</div>
                </div>
                
                <!-- MAYBE (Up) - Yellow Question -->
                <div id="badge-maybe" class="swipe-badge" style="position: absolute; top: 20px; left: 50%; transform: translateX(-50%); padding: 1rem 2rem; background: linear-gradient(135deg, rgba(251, 191, 36, 0.95), rgba(245, 158, 11, 0.95)); color: white; font-size: 3rem; font-weight: 800; border-radius: 1.5rem; opacity: 0; z-index: 10; box-shadow: 0 8px 32px rgba(251, 191, 36, 0.6); backdrop-filter: blur(10px); border: 3px solid rgba(255, 255, 255, 0.3); display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                    <div style="font-size: 4rem;">❓</div>
                    <div style="font-size: 1.5rem; font-weight: 700; letter-spacing: 0.1em;">MAYBE</div>
                </div>
                
                <!-- LIKE (Right) - Green Thumbs Up -->
                <div id="badge-like" class="swipe-badge" style="position: absolute; top: 50%; right: 20px; transform: translateY(-50%); padding: 1rem 2rem; background: linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95)); color: white; font-size: 3rem; font-weight: 800; border-radius: 1.5rem; opacity: 0; z-index: 10; box-shadow: 0 8px 32px rgba(16, 185, 129, 0.6); backdrop-filter: blur(10px); border: 3px solid rgba(255, 255, 255, 0.3); display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                    <div style="font-size: 4rem;">👍</div>
                    <div style="font-size: 1.5rem; font-weight: 700; letter-spacing: 0.1em;">LIKE</div>
                </div>
                
                <!-- LOVE (Right Far) - Pink Heart -->
                <div id="badge-love" class="swipe-badge" style="position: absolute; top: 50%; right: 20px; transform: translateY(-50%); padding: 1rem 2rem; background: linear-gradient(135deg, rgba(255, 46, 99, 0.95), rgba(217, 0, 98, 0.95)); color: white; font-size: 3rem; font-weight: 800; border-radius: 1.5rem; opacity: 0; z-index: 10; box-shadow: 0 8px 32px rgba(255, 46, 99, 0.6); backdrop-filter: blur(10px); border: 3px solid rgba(255, 255, 255, 0.3); display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                    <div style="font-size: 4rem;">❤️</div>
                    <div style="font-size: 1.5rem; font-weight: 700; letter-spacing: 0.1em;">LOVE</div>
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
            const absDiffY = Math.abs(diffY);

            // Rotate card based on horizontal drag
            const rotate = diffX / 10;
            card.style.transform = `translateX(${diffX}px) translateY(${diffY}px) rotate(${rotate}deg)`;

            // Get badge elements
            const passBadge = card.querySelector('#badge-pass');
            const maybeBadge = card.querySelector('#badge-maybe');
            const likeBadge = card.querySelector('#badge-like');
            const loveBadge = card.querySelector('#badge-love');

            // Reset all badges
            passBadge.style.opacity = 0;
            maybeBadge.style.opacity = 0;
            likeBadge.style.opacity = 0;
            loveBadge.style.opacity = 0;

            // Determine primary direction (horizontal vs vertical)
            if (absDiffX > absDiffY) {
                // HORIZONTAL SWIPE (Left or Right)
                if (diffX < -80) {
                    // SWIPE LEFT → PASS (Nope)
                    passBadge.style.opacity = Math.min(absDiffX / 150, 1);
                    passBadge.style.transform = `translateY(-50%) scale(${1 + absDiffX / 300})`;
                } else if (diffX > 80) {
                    // SWIPE RIGHT → Check distance for LIKE vs LOVE
                    if (diffX > 200) {
                        // Far right → LOVE
                        loveBadge.style.opacity = Math.min(absDiffX / 150, 1);
                        loveBadge.style.transform = `translateY(-50%) scale(${1 + absDiffX / 300})`;
                    } else {
                        // Normal right → LIKE
                        likeBadge.style.opacity = Math.min(absDiffX / 150, 1);
                        likeBadge.style.transform = `translateY(-50%) scale(${1 + absDiffX / 300})`;
                    }
                }
            } else {
                // VERTICAL SWIPE (Up or Down)
                if (diffY < -80) {
                    // SWIPE UP → MAYBE
                    maybeBadge.style.opacity = Math.min(absDiffY / 150, 1);
                    maybeBadge.style.transform = `translateX(-50%) scale(${1 + absDiffY / 300})`;
                }
            }
        };

        const onRelease = () => {
            if (!this.isDragging) return;
            this.isDragging = false;

            const diffX = this.currentX - this.startX;
            const diffY = this.currentY - this.startY;
            const absDiffX = Math.abs(diffX);
            const absDiffY = Math.abs(diffY);

            card.style.transition = 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';

            // Determine if swipe was strong enough
            const threshold = 120;

            if (absDiffX > absDiffY) {
                // HORIZONTAL SWIPE
                if (absDiffX > threshold) {
                    if (diffX < 0) {
                        // LEFT → PASS
                        this.swipeOff('pass');
                    } else {
                        // RIGHT → LIKE or LOVE
                        if (diffX > 200) {
                            this.swipeOff('love');
                        } else {
                            this.swipeOff('like');
                        }
                    }
                    return;
                }
            } else {
                // VERTICAL SWIPE
                if (absDiffY > threshold && diffY < 0) {
                    // UP → MAYBE
                    this.swipeOff('maybe');
                    return;
                }
            }

            // SNAP BACK - Not strong enough
            card.style.transform = 'translateX(0) translateY(0) rotate(0deg)';
            
            // Hide all badges
            const badges = card.querySelectorAll('.swipe-badge');
            badges.forEach(badge => {
                badge.style.opacity = 0;
                badge.style.transform = badge.id.includes('maybe') 
                    ? 'translateX(-50%)' 
                    : 'translateY(-50%)';
            });
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
        
        // Determine swipe direction based on action
        let translateX = 0;
        let translateY = 0;
        let rotate = 0;

        switch(action) {
            case 'pass':
                translateX = -500;
                rotate = -25;
                break;
            case 'maybe':
                translateY = -500;
                rotate = 0;
                break;
            case 'like':
                translateX = 400;
                rotate = 20;
                break;
            case 'love':
                translateX = 600;
                rotate = 30;
                break;
        }

        card.style.transform = `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotate}deg)`;
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
        } else if (action === 'maybe') {
            showSwipeToast(this.movie.title, 'maybe');
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
