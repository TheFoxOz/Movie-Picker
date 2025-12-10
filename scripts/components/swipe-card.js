/**
 * SwipeCard Component – FINAL VERSION (Dec 2025)
 * • Beautiful categorized trigger warnings
 * • Shows total warning count badge
 * • No dynamic imports, no dead code
 * • Works perfectly with trigger-warning-manager.js
 */

import { store } from '../state/store.js';
import { authService } from '../services/auth-service.js';
import { celebrate } from '../utils/confetti.js';
import { notify } from '../utils/notifications.js';
import { triggerWarningManager } from '../services/trigger-warning-manager.js';

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
        this.loadTriggerWarnings();
    }

    // Clean, direct loading using the new manager
    async loadTriggerWarnings() {
        if (this.movie.warningsLoaded) return;

        try {
            await triggerWarningManager.getCategorizedWarnings(this.movie);
            this.updateWarningBadge();
        } catch (error) {
            console.warn('[SwipeCard] Failed to load warnings:', error);
        }
    }

    updateWarningBadge() {
        if (this.movie.triggerWarningCount === 0) return;

        const posterDiv = this.element.querySelector('div[style*="height: 520px"]');
        if (!posterDiv) return;

        // Remove old badge if exists
        posterDiv.querySelector('.trigger-warning-badge')?.remove();

        const badge = document.createElement('div');
        badge.className = 'trigger-warning-badge';
        badge.style.cssText = `
            position: absolute; top: 1rem; left: 1rem; z-index: 10;
            background: linear-gradient(135deg, #dc2626, #b91c1c);
            color: white; font-weight: 800; font-size: 0.875rem;
            padding: 0.5rem 0.75rem; border-radius: 1rem;
            display: flex; align-items: center; gap: 0.375rem;
            backdrop-filter: blur(10px); border: 2px solid rgba(255,255,255,0.2);
            box-shadow: 0 4px 16px rgba(239,68,68,0.6);
            animation: pulse 2s infinite;
        `;
        badge.innerHTML = `
            Warning ${this.movie.triggerWarningCount}
        `;
        posterDiv.appendChild(badge);
    }

    render() {
        const poster = this.movie.posterURL || this.movie.poster_path || 'https://placehold.co/300x450/111/fff?text=No+Image';

        this.element = document.createElement('div');
        this.element.className = 'swipe-card';
        this.element.innerHTML = `
            <div style="position: relative; width: 100%; max-width: 380px; border-radius: 1.5rem; box-shadow: 0 20px 60px rgba(0,0,0,0.6); background: #111; transform: rotate(0deg); transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1); user-select: none;">
                
                <!-- SWIPE DIRECTION OVERLAYS -->
                <div id="badge-pass" class="swipe-badge" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 1.5rem 2.5rem; background: linear-gradient(135deg, rgba(239,68,68,0.95), rgba(220,38,38,0.95)); color: white; font-size: 3rem; font-weight: 800; border-radius: 1.5rem; opacity: 0; z-index: 10; box-shadow: 0 8px 32px rgba(239,68,68,0.6); backdrop-filter: blur(10px); border: 3px solid rgba(255,255,255,0.3); display: flex; flex-direction: column; align-items: center; gap: 0.5rem; pointer-events: none;">
                    <div style="font-size: 5rem; line-height: 1;">Cross</div>
                    <div style="font-size: 2rem; font-weight: 800; letter-spacing: 0.15em;">NOPE</div>
                </div>
                <div id="badge-maybe" class="swipe-badge" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 1.5rem 2.5rem; background: linear-gradient(135deg, rgba(251,191,36,0.95), rgba(245,158,11,0.95)); color: white; font-size: 3rem; font-weight: 800; border-radius: 1.5rem; opacity: 0; z-index: 10; box-shadow: 0 8px 32px rgba(251,191,36,0.6); backdrop-filter: blur(10px); border: 3px solid rgba(255,255,255,0.3); display: flex; flex-direction: column; align-items: center; gap: 0.5rem; pointer-events: none;">
                    <div style="font-size: 5rem; line-height: 1;">Question</div>
                    <div style="font-size: 2rem; font-weight: 800; letter-spacing: 0.15em;">MAYBE</div>
                </div>
                <div id="badge-like" class="swipe-badge" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 1.5rem 2.5rem; background: linear-gradient(135deg, rgba(16,185,129,0.95), rgba(5,150,105,0.95)); color: white; font-size: 3rem; font-weight: 800; border-radius: 1.5rem; opacity: 0; z-index: 10; box-shadow: 0 8px 32px rgba(16,185,129,0.6); backdrop-filter: blur(10px); border: 3px solid rgba(255,255,255,0.3); display: flex; flex-direction: column; align-items: center; gap: 0.5rem; pointer-events: none;">
                    <div style="font-size: 5rem; line-height: 1;">Thumbs Up</div>
                    <div style="font-size: 2rem; font-weight: 800; letter-spacing: 0.15em;">LIKE</div>
                </div>
                <div id="badge-love" class="swipe-badge" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 1.5rem 2.5rem; background: linear-gradient(135deg, rgba(255,46,99,0.95), rgba(217,0,98,0.95)); color: white; font-size: 3rem; font-weight: 800; border-radius: 1.5rem; opacity: 0; z-index: 10; box-shadow: 0 8px 32px rgba(255,46,99,0.6); backdrop-filter: blur(10px); border: 3px solid rgba(255,255,255,0.3); display: flex; flex-direction: column; align-items: center; gap: 0.5rem; pointer-events: none;">
                    <div style="font-size: 5rem; line-height: 1;">Heart</div>
                    <div style="font-size: 2rem; font-weight: 800; letter-spacing: 0.15em;">LOVE</div>
                </div>

                <!-- Poster -->
                <div style="position: relative; height: 520px; background: #000; border-radius: 1.5rem; overflow: hidden;">
                    <img src="${poster}" alt="${this.movie.title}" style="width: 100%; height: 100%; object-fit: cover;">
                    <div style="position: absolute; inset: 0; background: linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 40%);"></div>
                    
                    <!-- Platform badge -->
                    <div style="position: absolute; top: 1rem; right: 1rem; padding: 0.5rem 1rem; background: rgba(0,0,0,0.7); backdrop-filter: blur(10px); border-radius: 1rem; border: 1px solid rgba(255,255,255,0.1);">
                        <span style="color: white; font-weight: 700; font-size: 0.875rem;">
                            ${this.movie.platform || 'Cinema'}
                        </span>
                    </div>
                </div>

                <!-- Movie Info -->
                <div style="padding: 1.5rem;">
                    <h2 style="font-size: 1.75rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0;">
                        ${this.movie.title}
                    </h2>
                    <p style="color: rgba(255,255,255,0.7); font-size: 1rem; margin: 0 0 1rem 0;">
                        ${this.movie.year || ''} • ${this.movie.genres?.join(', ') || 'Movie'}
                    </p>
                    <p style="color: rgba(255,255,255,0.9); line-height: 1.6; margin: 0;">
                        ${this.movie.overview || 'No description available.'}
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

            card.style.transform = `translateX(${diffX}px) translateY(${diffY}px) rotate(${diffX / 10}deg)`;

            const badges = card.querySelectorAll('.swipe-badge');
            badges.forEach(b => b.style.opacity = 0);

            if (absDiffX > absDiffY) {
                if (diffX < -80) card.querySelector('#badge-pass').style.opacity = Math.min(absDiffX / 150, 1);
                else if (diffX > 80) card.querySelector('#badge-like').style.opacity = Math.min(absDiffX / 150, 1);
            } else {
                if (diffY < -80) card.querySelector('#badge-maybe').style.opacity = Math.min(absDiffY / 150, 1);
                else if (diffY > 80) card.querySelector('#badge-love').style.opacity = Math.min(absDiffY / 150, 1);
            }
        };

        const onRelease = () => {
            if (!this.isDragging) return;
            this.isDragging = false;

            const diffX = this.currentX - this.startX;
            const diffY = this.currentY - this.startY;
            const threshold = 120;

            card.style.transition = 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';

            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > threshold) {
                this.swipeOff(diffX < 0 ? 'pass' : 'like');
            } else if (Math.abs(diffY) > threshold) {
                this.swipeOff(diffY < 0 ? 'maybe' : 'love');
            } else {
                card.style.transform = 'translateX(0) translateY(0) rotate(0deg)';
                card.querySelectorAll('.swipe-badge').forEach(b => b.style.opacity = 0);
            }
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
        if (this.actionInProgress) return;
        this.actionInProgress = true;

        const card = this.element;
        const rect = card.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let tx = 0, ty = 0, rot = 0;
        switch (action) {
            case 'pass': tx = -600; rot = -30; break;
            case 'maybe': ty = -600; rot = 0; break;
            case 'like': tx = 600; rot = 25; break;
            case 'love': tx = 600; ty = 100; rot = 35; break;
        }

        card.style.transform = `translateX(${tx}px) translateY(${ty}px) rotate(${rot}deg)`;
        card.style.opacity = '0';

        // Save swipe
        const swipeData = { movie: this.movie, action, timestamp: Date.now() };
        const history = [...(store.getState().swipeHistory || []), swipeData];
        store.setState({ swipeHistory: history });
        if (authService.isAuthenticated()) authService.syncSwipeHistory(history);

        // Effects
        if (action === 'love') celebrate.love(centerX, centerY);
        else if (action === 'like') celebrate.custom(centerX, centerY, { particleCount: 50, colors: ['#10b981', '#34d399'] });

        this.showSwipeToast(this.movie.title, action);

        setTimeout(() => {
            document.dispatchEvent(new CustomEvent('swipe-action', {
                bubbles: true,
                detail: { action, movieId: this.movie.id, movieTitle: this.movie.title }
            }));
            card.remove();
            this.actionInProgress = false;
        }, 400);
    }

    showSwipeToast(title, action) {
        const msg = {
            love: `Loved "${title}"!`,
            like: `Liked "${title}"`,
            maybe: `Maybe "${title}"`,
            pass: `Passed on "${title}"`
        }[action];

        const type = action === 'pass' ? 'error' : action === 'maybe' ? 'warning' : 'success';
        notify[type](msg, 3000);
    }

    destroy() {
        if (this.cleanup) this.cleanup();
        if (this.element?.parentNode) this.element.remove();
    }
}
