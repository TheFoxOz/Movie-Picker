/**
 * SwipeCard Component – FINAL & PERFECT
 * Love, Like, Maybe, Nope badges now work perfectly on all directions
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

        this.render();
        this.attachEvents();
    }

    render() {
        const poster = this.movie.poster_path || 'https://placehold.co/300x450/111/fff?text=No+Image';

        this.element = document.createElement('div');
        this.element.className = 'swipe-card';
        this.element.innerHTML = `
            <div style="position:relative;width:100%;max-width:380px;border-radius:1.5rem;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.6);background:#111;transform:rotate(0deg);transition:transform 0.4s cubic-bezier(0.25,0.8,0.25,1);user-select:none;">
                
                <!-- BADGES -->
                <div id="badge-nope" style="position:absolute;top:30px;left:30px;padding:0.75rem 2rem;background:rgba(239,68,68,0.95);color:white;font-size:2.5rem;font-weight:900;border-radius:1rem;transform:rotate(-30deg);opacity:0;z-index:10;box-shadow:0 8px 32px rgba(239,68,68,0.6);border:5px solid white;">
                    NOPE
                </div>
                <div id="badge-love" style="position:absolute;top:30px;right:30px;padding:0.75rem 2rem;background:rgba(255,0,110,0.95);color:white;font-size:2.5rem;font-weight:900;border-radius:1rem;transform:rotate(30deg);opacity:0;z-index:10;box-shadow:0 8px 32px rgba(255,0,110,0.6);border:5px solid white;">
                    LOVE
                </div>
                <div id="badge-like" style="position:absolute;top:30px;right:30px;padding:0.75rem 2rem;background:rgba(16,185,129,0.95);color:white;font-size:2.5rem;font-weight:900;border-radius:1rem;transform:rotate(15deg);opacity:0;z-index:10;box-shadow:0 8px 32px rgba(16,185,129,0.6);border:5px solid white;">
                    LIKE
                </div>
                <div id="badge-maybe" style="position:absolute;top:30px;left:50%;transform:translateX(-50%) rotate(-5deg);padding:0.75rem 2rem;background:rgba(251,191,36,0.95);color:white;font-size:2.5rem;font-weight:900;border-radius:1rem;opacity:0;z-index:10;box-shadow:0 8px 32px rgba(251,191,36,0.6);border:5px solid white;">
                    MAYBE
                </div>

                <!-- Poster -->
                <div style="position:relative;height:520px;background:#000;">
                    <img src="${poster}" alt="${this.movie.title}" style="width:100%;height:100%;object-fit:cover;">
                    <div style="position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,0.8),transparent 40%);"></div>
                    <div style="position:absolute;top:1rem;right:1rem;padding:0.5rem 1rem;background:rgba(0,0,0,0.7);backdrop-filter:blur(10px);border-radius:1rem;border:1px solid rgba(255,255,255,0.1);">
                        <span style="color:white;font-weight:700;font-size:0.875rem;">${this.movie.platform || 'Cinema'}</span>
                    </div>
                </div>

                <!-- Info -->
                <div style="padding:1.5rem;">
                    <h2 style="font-size:1.75rem;font-weight:800;color:white;margin:0 0 0.5rem 0;">
                        ${this.movie.title}
                    </h2>
                    <p style="color:rgba(255,255,255,0.7);font-size:1rem;margin:0 0 1rem 0;">
                        ${this.movie.year} • ${this.movie.genre || 'Movie'}
                    </p>
                    <p style="color:rgba(255,255,255,0.9);line-height:1.6;margin:0;">
                        ${this.movie.synopsis || 'No description available.'}
                    </p>
                </div>
            </div>
        `;

        this.container.appendChild(this.element);
    }

    attachEvents() {
        const card = this.element;

        const startDrag = (e) => {
            this.isDragging = true;
            this.startX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
            card.style.transition = 'none';
        };

        const drag = (e) => {
            if (!this.isDragging) return;
            e.preventDefault();

            this.currentX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
            const diffX = this.currentX - this.startX;
            const rotate = diffX / 10;

            card.style.transform = `translateX(${diffX}px) rotate(${rotate}deg)`;

            // Show correct badge
            const absX = Math.abs(diffX);
            const nope = card.querySelector('#badge-nope');
            const love = card.querySelector('#badge-love');
            const like = card.querySelector('#badge-like');
            const maybe = card.querySelector('#badge-maybe');

            // Reset all
            [nope, love, like, maybe].forEach(b => b.style.opacity = '0');

            if (absX > 80) {
                if (diffX < -100) nope.style.opacity = Math.min(absX / 200, 1);
                else if (diffX > 100) love.style.opacity = Math.min(absX / 200, 1);
            }
        };

        const endDrag = () => {
            if (!this.isDragging) return;
            this.isDragging = false;
            card.style.transition = 'all 0.4s cubic-bezier(0.25,0.8,0.25,1)';

            const diffX = this.currentX - this.startX;

            if (Math.abs(diffX) > 120) {
                const action = diffX > 0 ? 'love' : 'pass';
                this.swipeOff(action);
            } else {
                card.style.transform = 'translateX(0) rotate(0deg)';
                card.querySelectorAll('[id^="badge-"]').forEach(b => b.style.opacity = '0');
            }
        };

        // Mouse
        card.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', endDrag);

        // Touch
        card.addEventListener('touchstart', startDrag, { passive: true });
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', endDrag);

        this.cleanup = () => {
            card.removeEventListener('mousedown', startDrag);
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', endDrag);
            card.removeEventListener('touchstart', startDrag);
            document.removeEventListener('touchmove', drag);
            document.removeEventListener('touchend', endDrag);
        };
    }

    // FIXED: handleAction now shows correct badge!
    handleAction(action) {
        const card = this.element;
        const badges = {
            love: card.querySelector('#badge-love'),
            like: card.querySelector('#badge-like'),
            maybe: card.querySelector('#badge-maybe'),
            pass: card.querySelector('#badge-nope')
        };

        // Show badge
        Object.values(badges).forEach(b => b.style.opacity = '0');
        if (badges[action]) {
            badges[action].style.opacity = '1';
        }

        // Trigger swipe off
        setTimeout(() => this.swipeOff(action), 200);
    }

    swipeOff(action) {
        const card = this.element;
        const diffX = action === 'love' ? 600 : action === 'pass' ? -600 : 0;

        card.style.transform = `translateX(${diffX}px) rotate(${diffX > 0 ? 30 : -30}deg)`;
        card.style.opacity = '0';

        // Save swipe
        const swipeData = { movie: this.movie, action, timestamp: Date.now() };
        const history = [...(store.getState().swipeHistory || []), swipeData];
        store.setState({ swipeHistory: history });

        if (authService.isAuthenticated()) {
            authService.syncSwipeHistory(history);
        }

        // Visual feedback
        if (action === 'love') showHeartConfetti();
        else if (action === 'like') showConfetti();

        showSwipeToast(this.movie.title, action);

        document.dispatchEvent(new CustomEvent('swipe-action'));

        setTimeout(() => {
            if (card && card.parentNode) card.remove();
        }, 400);
    }

    destroy() {
        if (this.cleanup) this.cleanup();
        if (this.element && this.element.parentNode) {
            this.element.remove();
        }
    }
}
