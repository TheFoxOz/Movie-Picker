/**
 * SwipeCard Component – ENHANCED WITH SWIPE DIRECTION FEEDBACK + TRIGGER WARNINGS
 * Shows clear visual indicators when swiping in any direction
 * Displays trigger warning badge from DoesTheDogDie.com
 * FIXED: Proper event dispatching for card advancing
 * ✅ FIX: Corrected confetti and notification imports
 * ✅ FIX: Changed getTMDBService to tmdbService
 */

import { store } from '../state/store.js';
import { authService } from '../services/auth-service.js';
// ✅ FIX: Changed to correct imports
import { celebrate } from '../utils/confetti.js';
import { notify } from '../utils/notifications.js';

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
        this.actionInProgress = false;

        this.render();
        this.attachEvents();
        this.fetchTriggerWarnings();
    }

    async fetchTriggerWarnings() {
        if (this.movie.warningsLoaded) return;

        try {
            const { tmdbService } = await import('../services/tmdb.js');
            
            if (tmdbService) {
                await tmdbService.fetchTriggerWarnings(this.movie);
                
                if (this.movie.triggerWarnings && this.movie.triggerWarnings.length > 0) {
                    this.updateWarningBadge();
                }
            }
        } catch (error) {
            console.error('[SwipeCard] Failed to fetch trigger warnings:', error);
        }
    }

    updateWarningBadge() {
        const posterDiv = this.element.querySelector('div[style*="height: 520px"]');
        if (!posterDiv) return;

        let badge = posterDiv.querySelector('.trigger-warning-badge');
        
        if (this.movie.triggerWarnings && this.movie.triggerWarnings.length > 0 && !badge) {
            badge = document.createElement('div');
            badge.className = 'trigger-warning-badge';
            badge.style.cssText = 'position: absolute; top: 1rem; left: 1rem; padding: 0.5rem 0.75rem; background: rgba(239,68,68,0.95); backdrop-filter: blur(10px); border-radius: 1rem; border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; gap: 0.375rem; z-index: 5;';
            badge.innerHTML = `
                <span style="font-size: 0.875rem;">⚠️</span>
                <span style="color: white; font-weight: 700; font-size: 0.875rem;">${this.movie.triggerWarnings.length}</span>
            `;
            posterDiv.appendChild(badge);
        }
    }

    render() {
        const poster = this.movie.poster_path || 'https://placehold.co/300x450/111/fff?text=No+Image';

        this.element = document.createElement('div');
        this.element.className = 'swipe-card';
        this.element.innerHTML = `
            <div style="position: relative; width: 100%; max-width: 380px; border-radius: 1.5rem; box-shadow: 0 20px 60px rgba(0,0,0,0.6); background: #111; transform: rotate(0deg); transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1); user-select: none;">
                
                <!-- SWIPE DIRECTION OVERLAYS - ALL CENTERED ON POSTER -->
                
                <!-- PASS (Left) - Red X -->
                <div id="badge-pass" class="swipe-badge" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 1.5rem 2.5rem; background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95)); color: white; font-size: 3rem; font-weight: 800; border-radius: 1.5rem; opacity: 0; z-index: 10; box-shadow: 0 8px 32px rgba(239, 68, 68, 0.6); backdrop-filter: blur(10px); border: 3px solid rgba(255, 255, 255, 0.3); display: flex; flex-direction: column; align-items: center; gap: 0.5rem; pointer-events: none;">
                    <div style="font-size: 5rem; line-height: 1;">✕</div>
                    <div style="font-size: 2rem; font-weight: 800; letter-spacing: 0.15em;">NOPE</div>
                </div>
                
                <!-- MAYBE (Up) - Yellow Question -->
                <div id="badge-maybe" class="swipe-badge" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 1.5rem 2.5rem; background: linear-gradient(135deg, rgba(251, 191, 36, 0.95), rgba(245, 158, 11, 0.95)); color: white; font-size: 3rem; font-weight: 800; border-radius: 1.5rem; opacity: 0; z-index: 10; box-shadow: 0 8px 32px rgba(251, 191, 36, 0.6); backdrop-filter: blur(10px); border: 3px solid rgba(255, 255, 255, 0.3); display: flex; flex-direction: column; align-items: center; gap: 0.5rem; pointer-events: none;">
                    <div style="font-size: 5rem; line-height: 1;">❓</div>
                    <div style="font-size: 2rem; font-weight: 800; letter-spacing: 0.15em;">MAYBE</div>
                </div>
                
                <!-- LIKE (Right) - Green Thumbs Up -->
                <div id="badge-like" class="swipe-badge" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 1.5rem 2.5rem; background: linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95)); color: white; font-size: 3rem; font-weight: 800; border-radius: 1.5rem; opacity: 0; z-index: 10; box-shadow: 0 8px 32px rgba(16, 185, 129, 0.6); backdrop-filter: blur(10px); border: 3px solid rgba(255, 255, 255, 0.3); display: flex; flex-direction: column; align-items: center; gap: 0.5rem; pointer-events: none;">
                    <div style="font-size: 5rem; line-height: 1;">👍</div>
                    <div style="font-size: 2rem; font-weight: 800; letter-spacing: 0.15em;">LIKE</div>
                </div>
                
                <!-- LOVE (Down) - Pink Heart -->
                <div id="badge-love" class="swipe-badge" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 1.5rem 2.5rem; background: linear-gradient(135deg, rgba(255, 46, 99, 0.95), rgba(217, 0, 98, 0.95)); color: white; font-size: 3rem; font-weight: 800; border-radius: 1.5rem; opacity: 0; z-index: 10; box-shadow: 0 8px 32px rgba(255, 46, 99, 0.6); backdrop-filter: blur(10px); border: 3px solid rgba(255, 255, 255, 0.3); display: flex; flex-direction: column; align-items: center; gap: 0.5rem; pointer-events: none;">
                    <div style="font-size: 5rem; line-height: 1;">❤️</div>
                    <div style="font-size: 2rem; font-weight: 800; letter-spacing: 0.15em;">LOVE</div>
                </div>

                <!-- Poster (with overflow hidden for clean edges) -->
                <div style="position: relative; height: 520px; background: #000; border-radius: 1.5rem; overflow: hidden;">
                    <img src="${poster}" alt="${this.movie.title}" style="width: 100%; height: 100%; object-fit: cover;">
                    
                    <!-- Gradient overlay -->
                    <div style="position: absolute; inset: 0; background: linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 40%);"></div>
                    
                    <!-- Platform badge -->
                    <div style="position: absolute; top: 1rem; right: 1rem; padding: 0.5rem 1rem; background: rgba(0,0,0,0.7); backdrop-filter: blur(10px); border-radius: 1rem; border: 1px solid rgba(255,255,255,0.1);">
                        <span style="color: white; font-weight: 700; font-size: 0.875rem;">${this.movie.platform || 'Cinema'}</span>
                    </div>

                    <!-- Trigger Warning Badge (will be added dynamically if warnings exist) -->
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

            const rotate = diffX / 10;
            card.style.transform = `translateX(${diffX}px) translateY(${diffY}px) rotate(${rotate}deg)`;

            const passBadge = card.querySelector('#badge-pass');
            const maybeBadge = card.querySelector('#badge-maybe');
            const likeBadge = card.querySelector('#badge-like');
            const loveBadge = card.querySelector('#badge-love');

            passBadge.style.opacity = 0;
            maybeBadge.style.opacity = 0;
            likeBadge.style.opacity = 0;
            loveBadge.style.opacity = 0;

            if (absDiffX > absDiffY) {
                if (diffX < -80) {
                    passBadge.style.opacity = Math.min(absDiffX / 150, 1);
                    passBadge.style.transform = `translate(-50%, -50%) scale(${1 + absDiffX / 300})`;
                } else if (diffX > 80) {
                    likeBadge.style.opacity = Math.min(absDiffX / 150, 1);
                    likeBadge.style.transform = `translate(-50%, -50%) scale(${1 + absDiffX / 300})`;
                }
            } else {
                if (diffY < -80) {
                    maybeBadge.style.opacity = Math.min(absDiffY / 150, 1);
                    maybeBadge.style.transform = `translate(-50%, -50%) scale(${1 + absDiffY / 300})`;
                } else if (diffY > 80) {
                    loveBadge.style.opacity = Math.min(absDiffY / 150, 1);
                    loveBadge.style.transform = `translate(-50%, -50%) scale(${1 + absDiffY / 300})`;
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

            const threshold = 120;

            if (absDiffX > absDiffY) {
                if (absDiffX > threshold) {
                    if (diffX < 0) {
                        this.swipeOff('pass');
                    } else {
                        this.swipeOff('like');
                    }
                    return;
                }
            } else {
                if (absDiffY > threshold) {
                    if (diffY < 0) {
                        this.swipeOff('maybe');
                    } else {
                        this.swipeOff('love');
                    }
                    return;
                }
            }

            card.style.transform = 'translateX(0) translateY(0) rotate(0deg)';
            
            const badges = card.querySelectorAll('.swipe-badge');
            badges.forEach(badge => {
                badge.style.opacity = 0;
                badge.style.transform = 'translate(-50%, -50%)';
            });
        };

        card.addEventListener('mousedown', onGrab);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onRelease);

        card.addEventListener('touchstart', onGrab, { passive: true });
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onRelease);

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
        if (this.actionInProgress) {
            console.log('[SwipeCard] Action already in progress, ignoring');
            return;
        }
        this.actionInProgress = true;

        console.log(`[SwipeCard] Swiping off: ${action} for movie: ${this.movie.title}`);
        
        const card = this.element;
        
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

        const swipeData = {
            movie: this.movie,
            action,
            timestamp: Date.now()
        };

        const history = [...(store.getState().swipeHistory || []), swipeData];
        store.setState({ swipeHistory: history });

        if (authService.isAuthenticated()) {
            authService.syncSwipeHistory(history);
        }

        // ✅ FIX: Updated to use correct confetti and notification functions
        const rect = card.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        if (action === 'love') {
            celebrate.love(centerX, centerY);
            this.showSwipeToast(this.movie.title, 'love');
        } else if (action === 'like') {
            celebrate.custom(centerX, centerY, {
                particleCount: 50,
                colors: ['#10b981', '#059669', '#34d399']
            });
            this.showSwipeToast(this.movie.title, 'like');
        } else if (action === 'pass') {
            this.showSwipeToast(this.movie.title, 'pass');
        } else if (action === 'maybe') {
            this.showSwipeToast(this.movie.title, 'maybe');
        }

        setTimeout(() => {
            console.log('[SwipeCard] Animation complete, dispatching swipe-action event');
            
            const event = new CustomEvent('swipe-action', {
                bubbles: true,
                detail: { 
                    action: action,
                    movieId: this.movie.id,
                    movieTitle: this.movie.title
                }
            });
            
            document.dispatchEvent(event);
            console.log('[SwipeCard] Event dispatched successfully');
            
            if (card && card.parentNode) {
                card.remove();
                console.log('[SwipeCard] Card removed from DOM');
            }
            
            this.actionInProgress = false;
        }, 400);
    }

    // ✅ FIX: Added helper method for toast notifications
    showSwipeToast(movieTitle, action) {
        const messages = {
            love: `❤️ Loved "${movieTitle}"!`,
            like: `👍 Liked "${movieTitle}"`,
            maybe: `❓ Maybe watch "${movieTitle}"`,
            pass: `✕ Passed on "${movieTitle}"`
        };

        const types = {
            love: 'success',
            like: 'success',
            maybe: 'warning',
            pass: 'error'
        };

        const message = messages[action] || `Swiped on "${movieTitle}"`;
        const type = types[action] || 'info';

        notify[type](message, 3000);
    }

    destroy() {
        if (this.cleanup) this.cleanup();
        if (this.element && this.element.parentNode) {
            this.element.remove();
        }
    }
}