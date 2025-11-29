/**
 * SwipeCard Component
 * Interactive swipeable movie card
 */

import { store } from '../state/store.js';
// REMOVED: import { firebaseService } from '../state/firebase.js';
import { SWIPE_SCORES, getPlatformStyle } from '../utils/scoring.js';
import { showSwipeToast, hapticFeedback, announce } from '../utils/notifications.js';

export class SwipeCard {
    constructor(movie, onSwipe, onShowDetails) {
        this.movie = movie;
        this.onSwipe = onSwipe;
        this.onShowDetails = onShowDetails;
        this.element = null;
        
        // Gesture state
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        
        // Thresholds
        this.SWIPE_THRESHOLD = 100;
        this.LOVE_THRESHOLD = 150;
    }
    
    /**
     * Render the component
     * @returns {HTMLElement} Card element
     */
    render() {
        const card = document.createElement('div');
        card.className = 'swipe-card entering';
        card.id = `movie-card-${this.movie.id}`;
        card.innerHTML = this.getTemplate();
        
        this.element = card;
        this.attachListeners();
        
        return card;
    }
    
    /**
     * Get HTML template
     * @returns {String} HTML template
     */
    getTemplate() {
        const { icon, color } = getPlatformStyle(this.movie.platform);
        
        return `
            <!-- Overlays -->
            <div class="swipe-overlay overlay-love">LOVE</div>
            <div class="swipe-overlay overlay-like">LIKE</div>
            <div class="swipe-overlay overlay-maybe">MAYBE</div>
            <div class="swipe-overlay overlay-nope">NOPE</div>
            
            <!-- Poster Section -->
            <div class="swipe-card-poster">
                <img 
                    src="https://placehold.co/400x300/${color.replace('#', '')}/${this.movie.id}" 
                    alt="${this.movie.title} poster"
                    loading="lazy"
                    onerror="this.src='https://placehold.co/400x300/6b7280/ffffff?text=${encodeURIComponent(this.movie.title)}'"
                >
                
                <!-- Badges -->
                <div class="swipe-card-badges">
                    <span class="badge badge-imdb">IMDb ${this.movie.imdb}</span>
                    ${this.movie.rt ? `<span class="badge badge-rt">RT ${this.movie.rt}%</span>` : ''}
                </div>
                
                <!-- Platform -->
                <div class="swipe-card-platform">
                    <span class="platform-icon" style="background-color: ${color};">${icon}</span>
                    <span class="text-white font-bold">Available on ${this.movie.platform}</span>
                </div>
            </div>
            
            <!-- Details Section -->
            <div class="swipe-card-details">
                <div class="swipe-card-title">
                    <h2>${this.movie.title} (${this.movie.year})</h2>
                    <button 
                        class="btn btn-ghost btn-icon" 
                        data-action="show-details"
                        aria-label="More info about ${this.movie.title}">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                        </svg>
                    </button>
                </div>
                
                <div class="swipe-card-meta">
                    ${this.movie.genre} • ${this.movie.runtime} • ${this.movie.type}
                </div>
                
                <div class="swipe-card-synopsis">
                    <p class="line-clamp-3">${this.movie.synopsis}</p>
                </div>
                
                ${this.movie.trigger && this.movie.trigger.length > 0 ? `
                    <div style="background-color: rgba(239, 68, 68, 0.2); padding: 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(239, 68, 68, 0.5); margin-bottom: 0.75rem;">
                        <p style="font-size: 0.75rem; font-weight: 600; color: #fca5a5; margin-bottom: 0.25rem;">
                            ⚠️ Trigger Warnings:
                        </p>
                        <p style="font-size: 0.75rem; color: #fecaca;">
                            ${this.movie.trigger.join(', ')}
                        </p>
                    </div>
                ` : ''}
                
                ${this.movie.mood ? `
                    <div style="background-color: rgba(255, 46, 99, 0.15); padding: 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(255, 46, 99, 0.3);">
                        <p style="font-size: 0.75rem; font-weight: 600; color: var(--color-primary); margin-bottom: 0.25rem;">
                            ✨ Mood:
                        </p>
                        <p style="font-size: 0.75rem; color: var(--color-text-secondary);">
                            ${this.movie.mood}
                        </p>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * Attach event listeners
     */
    attachListeners() {
        if (!this.element) return;
        
        // Touch/mouse events for swiping
        this.element.addEventListener('mousedown', this.handleStart.bind(this));
        this.element.addEventListener('touchstart', this.handleStart.bind(this), { passive: true });
        
        document.addEventListener('mousemove', this.handleMove.bind(this));
        document.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });
        
        document.addEventListener('mouseup', this.handleEnd.bind(this));
        document.addEventListener('touchend', this.handleEnd.bind(this));
        document.addEventListener('touchcancel', this.handleEnd.bind(this));
        
        // Details button
        const detailsBtn = this.element.querySelector('[data-action="show-details"]');
        if (detailsBtn) {
            detailsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.onShowDetails(this.movie);
            });
        }
    }
    
    /**
     * Handle gesture start
     * @param {Event} e - Event object
     */
    handleStart(e) {
        if (e.target.closest('button')) return; // Don't start drag on buttons
        
        this.isDragging = true;
        this.startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        this.startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        
        this.element.style.transition = 'none';
        this.element.classList.remove('entering');
    }
    
    /**
     * Handle gesture move
     * @param {Event} e - Event object
     */
    handleMove(e) {
        if (!this.isDragging) return;
        
        this.currentX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        this.currentY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        
        const deltaX = this.currentX - this.startX;
        const deltaY = this.currentY - this.startY;
        
        // Prevent default on touch move to prevent scrolling
        if (Math.abs(deltaX) > 10) {
            e.preventDefault();
        }
        
        // Apply transform
        const rotation = (deltaX / 300) * 15;
        this.element.style.transform = `translateX(${deltaX}px) translateY(${deltaY * 0.3}px) rotate(${rotation}deg)`;
        
        // Update overlays
        this.updateOverlays(deltaX);
    }
    
    /**
     * Handle gesture end
     * @param {Event} e - Event object
     */
    handleEnd(e) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.element.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
        
        const deltaX = this.currentX - this.startX;
        
        // Hide all overlays
        this.hideAllOverlays();
        
        // Determine action based on swipe distance
        if (deltaX > this.LOVE_THRESHOLD) {
            this.executeSwipe('love');
        } else if (deltaX > this.SWIPE_THRESHOLD) {
            this.executeSwipe('like');
        } else if (deltaX < -this.LOVE_THRESHOLD) {
            this.executeSwipe('pass');
        } else if (deltaX < -this.SWIPE_THRESHOLD) {
            this.executeSwipe('maybe');
        } else {
            // Reset position
            this.element.style.transform = 'translateX(0) translateY(0) rotate(0)';
        }
    }
    
    /**
     * Update overlay visibility based on drag distance
     * @param {Number} deltaX - Horizontal distance
     */
    updateOverlays(deltaX) {
        const overlays = {
            love: this.element.querySelector('.overlay-love'),
            like: this.element.querySelector('.overlay-like'),
            maybe: this.element.querySelector('.overlay-maybe'),
            nope: this.element.querySelector('.overlay-nope')
        };
        
        // Hide all first
        Object.values(overlays).forEach(o => {
            o.style.opacity = '0';
            o.style.transform = '';
        });
        
        const opacity = Math.min(Math.abs(deltaX) / this.SWIPE_THRESHOLD * 2, 1);
        
        if (deltaX > 20) {
            if (deltaX > this.LOVE_THRESHOLD) {
                overlays.love.style.opacity = opacity;
                overlays.love.style.transform = `rotate(-25deg) scale(${0.8 + 0.2 * opacity})`;
            } else {
                overlays.like.style.opacity = opacity;
                overlays.like.style.transform = `rotate(-25deg) scale(${0.8 + 0.2 * opacity})`;
            }
        } else if (deltaX < -20) {
            if (deltaX < -this.LOVE_THRESHOLD) {
                overlays.nope.style.opacity = opacity;
                overlays.nope.style.transform = `rotate(25deg) scale(${0.8 + 0.2 * opacity})`;
            } else {
                overlays.maybe.style.opacity = opacity;
                overlays.maybe.style.transform = `rotate(25deg) scale(${0.8 + 0.2 * opacity})`;
            }
        }
    }
    
    /**
     * Hide all overlays
     */
    hideAllOverlays() {
        const overlays = this.element.querySelectorAll('.swipe-overlay');
        overlays.forEach(overlay => {
            overlay.style.opacity = '0';
            overlay.style.transform = '';
        });
    }
    
    /**
     * Execute swipe action
     * @param {String} action - Swipe action (love, like, maybe, pass)
     */
    async executeSwipe(action) {
        // Haptic feedback
        hapticFeedback(action === 'love' ? 'heavy' : 'medium');
        
        // Announce to screen readers
        announce(`${action.toUpperCase()}: ${this.movie.title}`, 'polite');
        
        // Animate card exit
        const exitDirection = (action === 'pass' || action === 'maybe') ? '-200vw' : '200vw';
        const exitRotation = (action === 'pass' || action === 'maybe') ? '-25deg' : '25deg';
        
        this.element.style.transform = `translateX(${exitDirection}) rotate(${exitRotation})`;
        this.element.style.opacity = '0';
        
        // Save to history
        store.addSwipeToHistory({
            index: store.get('currentMovieIndex'),
            movie: this.movie,
            action,
            timestamp: Date.now()
        });
        
        // FIREBASE REMOVED - Just save to local store
        console.log('[SwipeCard] Swipe saved to local store:', action);
        
        // Trigger callback
        setTimeout(() => {
            this.onSwipe(action, this.movie);
        }, 400);
    }
    
    /**
     * Programmatically trigger swipe
     * @param {String} action - Swipe action
     */
    swipe(action) {
        this.executeSwipe(action);
    }
    
    /**
     * Destroy component and cleanup
     */
    destroy() {
        // Remove event listeners
        // (In a production app, you'd store references and remove them)
        if (this.element) {
            this.element.remove();
        }
    }
}
