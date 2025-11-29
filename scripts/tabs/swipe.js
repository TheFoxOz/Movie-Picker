/**
 * Swipe Card Component
 * Interactive movie card with gesture controls
 * DEBUG VERSION - Shows poster URL loading
 */

import { store } from '../state/store.js';

export class SwipeCard {
    constructor(container, movie) {
        console.log('[SwipeCard] Constructor - Movie:', movie.title);
        console.log('[SwipeCard] poster_path:', movie.poster_path);
        console.log('[SwipeCard] backdrop_path:', movie.backdrop_path);
        
        this.container = container;
        this.movie = movie;
        this.card = null;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.isDragging = false;
        
        this.render();
        this.attachListeners();
    }
    
    render() {
        const { icon, color } = this.getPlatformStyle(this.movie.platform);
        
        // FIXED: Use real TMDB poster URL
        const posterUrl = this.movie.poster_path 
            || this.movie.backdrop_path 
            || `https://placehold.co/400x600/${color.replace('#', '')}/ffffff?text=${encodeURIComponent(this.movie.title)}`;
        
        console.log('[SwipeCard] Final poster URL:', posterUrl);
        console.log('[SwipeCard] Platform:', this.movie.platform, 'Color:', color);
        
        this.card = document.createElement('div');
        this.card.className = 'swipe-card';
        this.card.style.cssText = `
            position: absolute;
            width: calc(100% - 3rem);
            max-width: 450px;
            aspect-ratio: 2/3;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            cursor: grab;
            user-select: none;
            touch-action: none;
            z-index: 1;
        `;
        
        this.card.innerHTML = `
            <div style="position: relative; width: 100%; height: 100%; border-radius: 2rem; overflow: hidden; background: ${color}; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);">
                
                <!-- DEBUG: Show poster URL -->
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 100; background: rgba(0, 0, 0, 0.8); padding: 1rem; border-radius: 0.5rem; max-width: 80%; word-break: break-all; display: none;" class="debug-url">
                    <div style="color: white; font-size: 0.75rem; margin-bottom: 0.5rem;">Poster URL:</div>
                    <div style="color: #10b981; font-size: 0.625rem; font-family: monospace;">${posterUrl}</div>
                </div>
                
                <!-- Poster Image -->
                <img 
                    src="${posterUrl}" 
                    alt="${this.movie.title}"
                    style="width: 100%; height: 100%; object-fit: cover; display: block;"
                    onerror="console.error('[SwipeCard] Image failed to load:', this.src); this.style.display='none'; this.parentElement.querySelector('.poster-fallback').style.display='flex'; this.parentElement.querySelector('.debug-url').style.display='block';"
                    onload="console.log('[SwipeCard] Image loaded successfully:', this.src);"
                    draggable="false"
                >
                
                <!-- Fallback if poster fails to load -->
                <div class="poster-fallback" style="display: none; position: absolute; inset: 0; align-items: center; justify-content: center; font-size: 8rem; opacity: 0.3; background: linear-gradient(135deg, ${color}, ${color}dd); flex-direction: column;">
                    <div>🎬</div>
                    <div style="font-size: 1rem; margin-top: 1rem; opacity: 0.8; color: white;">Poster failed to load</div>
                </div>
                
                <!-- Gradient Overlay -->
                <div style="position: absolute; inset: 0; background: linear-gradient(0deg, rgba(0, 0, 0, 0.9) 0%, transparent 40%, rgba(0, 0, 0, 0.7) 100%); pointer-events: none;"></div>
                
                <!-- Top Info -->
                <div style="position: absolute; top: 1.5rem; left: 1.5rem; right: 1.5rem; display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; pointer-events: none;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: inline-block; padding: 0.375rem 0.875rem; background: rgba(251, 191, 36, 0.3); backdrop-filter: blur(10px); border: 1px solid rgba(251, 191, 36, 0.5); border-radius: 0.75rem; font-size: 0.875rem; font-weight: 700; color: #fbbf24; margin-bottom: 0.5rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
                            IMDb ${this.movie.imdb || 'N/A'}
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: rgba(10, 10, 15, 0.6); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 0.75rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
                        <span style="width: 28px; height: 28px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; font-size: 0.875rem; color: white; font-weight: 800; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);">${icon}</span>
                        <span style="font-size: 0.875rem; font-weight: 600; color: white;">${this.movie.platform}</span>
                    </div>
                </div>
                
                <!-- Bottom Info -->
                <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 2rem 1.5rem; pointer-events: none;">
                    <h2 style="font-size: 1.75rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0; line-height: 1.2; text-shadow: 0 4px 12px rgba(0, 0, 0, 0.8);">
                        ${this.movie.title}
                    </h2>
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap;">
                        <span style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.9); font-weight: 600;">${this.movie.year || 'N/A'}</span>
                        <span style="width: 4px; height: 4px; border-radius: 50%; background: rgba(255, 255, 255, 0.5);"></span>
                        <span style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.9); font-weight: 600;">${this.movie.genre || 'Unknown'}</span>
                        ${this.movie.runtime ? `
                            <span style="width: 4px; height: 4px; border-radius: 50%; background: rgba(255, 255, 255, 0.5);"></span>
                            <span style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.9); font-weight: 600;">${this.movie.runtime}</span>
                        ` : ''}
                    </div>
                    <p style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.85); line-height: 1.6; margin: 0; max-height: 4.8em; overflow: hidden; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);" class="line-clamp-3">
                        ${this.movie.synopsis || 'No description available.'}
                    </p>
                    
                    ${this.movie.triggerWarnings?.length ? `
                        <div style="margin-top: 1rem; padding: 0.75rem 1rem; background: rgba(220, 38, 38, 0.2); backdrop-filter: blur(10px); border: 1px solid rgba(220, 38, 38, 0.4); border-radius: 0.75rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                                <span style="font-size: 1rem;">⚠️</span>
                                <span style="font-size: 0.75rem; font-weight: 700; color: #fca5a5; text-transform: uppercase; letter-spacing: 0.05em;">Trigger Warnings:</span>
                            </div>
                            <p style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.8); margin: 0;">
                                ${this.movie.triggerWarnings.join(', ')}
                            </p>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Swipe Overlays -->
                <div class="swipe-overlay swipe-overlay-love" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(255, 0, 110, 0.9), rgba(217, 0, 98, 0.9)); opacity: 0; pointer-events: none; transition: opacity 0.2s;">
                    <div style="font-size: 4rem; font-weight: 800; color: white; text-transform: uppercase; transform: rotate(-15deg); text-shadow: 0 8px 24px rgba(0, 0, 0, 0.5); letter-spacing: 0.1em;">
                        LOVE
                    </div>
                </div>
                
                <div class="swipe-overlay swipe-overlay-like" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.9)); opacity: 0; pointer-events: none; transition: opacity 0.2s;">
                    <div style="font-size: 4rem; font-weight: 800; color: white; text-transform: uppercase; transform: rotate(-15deg); text-shadow: 0 8px 24px rgba(0, 0, 0, 0.5); letter-spacing: 0.1em;">
                        LIKE
                    </div>
                </div>
                
                <div class="swipe-overlay swipe-overlay-maybe" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(251, 191, 36, 0.9), rgba(245, 158, 11, 0.9)); opacity: 0; pointer-events: none; transition: opacity 0.2s;">
                    <div style="font-size: 4rem; font-weight: 800; color: white; text-transform: uppercase; transform: rotate(-15deg); text-shadow: 0 8px 24px rgba(0, 0, 0, 0.5); letter-spacing: 0.1em;">
                        MAYBE
                    </div>
                </div>
                
                <div class="swipe-overlay swipe-overlay-nope" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.9)); opacity: 0; pointer-events: none; transition: opacity 0.2s;">
                    <div style="font-size: 4rem; font-weight: 800; color: white; text-transform: uppercase; transform: rotate(-15deg); text-shadow: 0 8px 24px rgba(0, 0, 0, 0.5); letter-spacing: 0.1em;">
                        NOPE
                    </div>
                </div>
            </div>
        `;
        
        this.container.appendChild(this.card);
        console.log('[SwipeCard] Card element appended to container');
    }
    
    attachListeners() {
        // Mouse events
        this.card.addEventListener('mousedown', this.handleStart.bind(this));
        document.addEventListener('mousemove', this.handleMove.bind(this));
        document.addEventListener('mouseup', this.handleEnd.bind(this));
        
        // Touch events
        this.card.addEventListener('touchstart', this.handleStart.bind(this));
        document.addEventListener('touchmove', this.handleMove.bind(this));
        document.addEventListener('touchend', this.handleEnd.bind(this));
        
        // Keyboard events
        document.addEventListener('keydown', this.handleKeyboard.bind(this));
    }
    
    handleStart(e) {
        this.isDragging = true;
        this.card.style.cursor = 'grabbing';
        
        const touch = e.type === 'touchstart' ? e.touches[0] : e;
        this.startX = touch.clientX;
        this.startY = touch.clientY;
    }
    
    handleMove(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        
        const touch = e.type === 'touchmove' ? e.touches[0] : e;
        this.currentX = touch.clientX - this.startX;
        this.currentY = touch.clientY - this.startY;
        
        const rotation = this.currentX / 20;
        
        this.card.style.transform = `
            translate(calc(-50% + ${this.currentX}px), calc(-50% + ${this.currentY}px))
            rotate(${rotation}deg)
        `;
        
        this.updateOverlay();
    }
    
    handleEnd(e) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.card.style.cursor = 'grab';
        
        const threshold = 100;
        const action = this.getSwipeAction(this.currentX, this.currentY, threshold);
        
        if (action) {
            this.animateSwipe(action);
        } else {
            this.resetPosition();
        }
    }
    
    handleKeyboard(e) {
        const keyActions = {
            'ArrowLeft': 'pass',
            'ArrowDown': 'maybe',
            'ArrowUp': 'like',
            'ArrowRight': 'love'
        };
        
        if (keyActions[e.key]) {
            e.preventDefault();
            this.handleAction(keyActions[e.key]);
        }
    }
    
    getSwipeAction(x, y, threshold) {
        if (Math.abs(x) < threshold && Math.abs(y) < threshold) {
            return null;
        }
        
        if (Math.abs(x) > Math.abs(y)) {
            return x > 0 ? 'love' : 'pass';
        } else {
            return y < 0 ? 'like' : 'maybe';
        }
    }
    
    updateOverlay() {
        const overlays = {
            love: this.card.querySelector('.swipe-overlay-love'),
            like: this.card.querySelector('.swipe-overlay-like'),
            maybe: this.card.querySelector('.swipe-overlay-maybe'),
            nope: this.card.querySelector('.swipe-overlay-nope')
        };
        
        Object.values(overlays).forEach(overlay => {
            if (overlay) overlay.style.opacity = '0';
        });
        
        const threshold = 50;
        let activeOverlay = null;
        
        if (this.currentX > threshold) {
            activeOverlay = overlays.love;
        } else if (this.currentX < -threshold) {
            activeOverlay = overlays.nope;
        } else if (this.currentY < -threshold) {
            activeOverlay = overlays.like;
        } else if (this.currentY > threshold) {
            activeOverlay = overlays.maybe;
        }
        
        if (activeOverlay) {
            const distance = Math.max(Math.abs(this.currentX), Math.abs(this.currentY));
            const opacity = Math.min(distance / 200, 1);
            activeOverlay.style.opacity = opacity.toString();
        }
    }
    
    resetPosition() {
        this.card.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        this.card.style.transform = 'translate(-50%, -50%) rotate(0deg)';
        
        const overlays = this.card.querySelectorAll('.swipe-overlay');
        overlays.forEach(overlay => {
            overlay.style.opacity = '0';
        });
        
        setTimeout(() => {
            this.card.style.transition = '';
            this.currentX = 0;
            this.currentY = 0;
        }, 300);
    }
    
    animateSwipe(action) {
        const directions = {
            love: { x: 1000, y: 0 },
            like: { x: 0, y: -1000 },
            maybe: { x: 0, y: 1000 },
            pass: { x: -1000, y: 0 }
        };
        
        const direction = directions[action];
        const rotation = action === 'love' ? 30 : action === 'pass' ? -30 : 0;
        
        this.card.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        this.card.style.transform = `
            translate(calc(-50% + ${direction.x}px), calc(-50% + ${direction.y}px))
            rotate(${rotation}deg)
        `;
        this.card.style.opacity = '0';
        
        setTimeout(() => {
            this.handleAction(action);
        }, 400);
    }
    
    handleAction(action) {
        console.log(`[SwipeCard] Action: ${action} for movie: ${this.movie.title}`);
        
        // Store swipe in history (LOCAL ONLY - no Firebase)
        store.addSwipeToHistory({
            movie: this.movie,
            action: action,
            timestamp: Date.now()
        });
        
        document.dispatchEvent(new CustomEvent('swipe-action', {
            detail: { movie: this.movie, action }
        }));
    }
    
    getPlatformStyle(platform) {
        const styles = {
            'Netflix': { icon: 'N', color: '#E50914' },
            'Hulu': { icon: 'H', color: '#1CE783' },
            'Prime Video': { icon: 'P', color: '#00A8E1' },
            'Disney+': { icon: 'D', color: '#113CCF' },
            'HBO Max': { icon: 'M', color: '#B200FF' },
            'Apple TV+': { icon: 'A', color: '#000000' }
        };
        
        return styles[platform] || { icon: '▶', color: '#6366f1' };
    }
    
    destroy() {
        if (this.card && this.card.parentNode) {
            this.card.remove();
        }
        
        document.removeEventListener('mousemove', this.handleMove.bind(this));
        document.removeEventListener('mouseup', this.handleEnd.bind(this));
        document.removeEventListener('touchmove', this.handleMove.bind(this));
        document.removeEventListener('touchend', this.handleEnd.bind(this));
        document.removeEventListener('keydown', this.handleKeyboard.bind(this));
    }
}
