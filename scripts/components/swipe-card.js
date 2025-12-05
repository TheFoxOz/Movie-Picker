/**
 * SwipeCard component
 * - Renders a single movie card
 * - Pointer/mouse/touch drag support
 * - Visual overlays for PASS / MAYBE / LIKE / LOVE
 * - handleAction(action) programmatic swipe
 * - dispatches 'card-swiped' custom event with detail { action, movie }
 */

export class SwipeCard {
    constructor(container, movie) {
        this.container = container;
        this.movie = movie;
        this.root = null;
        this.pointerId = null;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.dragging = false;
        this.threshold = 120; // px to trigger swipe
        this._onPointerDown = this.onPointerDown.bind(this);
        this._onPointerMove = this.onPointerMove.bind(this);
        this._onPointerUp = this.onPointerUp.bind(this);

        this.render();
        // attach pointer listeners on the card element
        this.root.addEventListener("pointerdown", this._onPointerDown, { passive: true });
        // support mouse events fallback if pointer not available
        // (pointer events are widely supported; this is safety)
    }

    render() {
        const movie = this.movie || {};
        const title = movie.title || movie.name || "Untitled";
        const year = (movie.release_date || movie.first_air_date || "").slice(0, 4) || "";
        const poster = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : (movie.poster || "");
        const overview = movie.overview || movie.synopsis || "";

        const root = document.createElement("div");
        root.className = "sw-card";
        root.style.cssText = `
            width: min(420px, 92%);
            max-width: 92%;
            height: min(78vh, 720px);
            background: linear-gradient(180deg, rgba(10,10,12,0.95), rgba(6,6,8,0.98));
            border-radius: 16px;
            box-shadow: 0 30px 80px rgba(0,0,0,0.6);
            overflow: hidden;
            position: relative;
            touch-action: pan-y;
            user-select: none;
            -webkit-user-select: none;
            will-change: transform;
        `;

        // poster container
        const posterWrap = document.createElement("div");
        posterWrap.style.cssText = "height:65%; width:100%; background:#0b0b0d; display:flex; align-items:center; justify-content:center; overflow:hidden;";
        const img = document.createElement("img");
        img.src = poster;
        img.alt = title;
        img.style.cssText = "width:100%; height:100%; object-fit:cover; display:block;";
        posterWrap.appendChild(img);

        // meta area
        const meta = document.createElement("div");
        meta.style.cssText = "padding:12px 14px; color:white; height:35%; display:flex; flex-direction:column; justify-content:space-between;";
        meta.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:start;gap:12px;">
                <div style="font-weight:800;font-size:1.05rem;">${this._escapeHtml(title)}</div>
                <div style="color:rgba(255,255,255,0.6);font-weight:700;">${year}</div>
            </div>
            <div style="margin-top:8px;color:rgba(255,255,255,0.8);font-size:0.9rem;line-height:1.25;max-height:4.2rem;overflow:hidden;">${this._escapeHtml(overview)}</div>
        `;

        // overlay badges for feedback
        const overlay = document.createElement("div");
        overlay.className = "sw-overlays";
        overlay.style.cssText = "position:absolute;inset:0;pointer-events:none;";

        const badge = (text, color, pos) => {
            const el = document.createElement("div");
            el.className = "sw-badge";
            el.dataset.type = text;
            el.style.cssText = `
                position:absolute;
                top:18px;
                ${pos}:18px;
                padding:8px 12px;
                border-radius:12px;
                font-weight:800;
                font-size:1.05rem;
                color:${color.text};
                background:${color.bg};
                transform: translateY(-8px) scale(0.98);
                opacity:0;
                transition: all 160ms ease;
                box-shadow: 0 8px 30px rgba(0,0,0,0.35);
            `;
            el.innerHTML = text;
            return el;
        };

        this._badgeLeft = badge("❌", { text: "#fff", bg: "rgba(239,68,68,0.12)" }, "left");
        this._badgeRightLike = badge("👍", { text: "#fff", bg: "rgba(16,185,129,0.12)" }, "right");
        this._badgeRightLove = badge("❤️", { text: "#fff", bg: "rgba(255,46,99,0.12)" }, "right");
        this._badgeMaybe = badge("❓", { text: "#fff", bg: "rgba(249,115,22,0.12)" }, "left");
        // adjust positions so left/right don't overlap visually
        this._badgeRightLike.style.right = "18px";
        this._badgeRightLove.style.right = "78px";
        this._badgeMaybe.style.left = "18px";

        overlay.appendChild(this._badgeLeft);
        overlay.appendChild(this._badgeMaybe);
        overlay.appendChild(this._badgeRightLike);
        overlay.appendChild(this._badgeRightLove);

        root.appendChild(posterWrap);
        root.appendChild(meta);
        root.appendChild(overlay);

        // add to container
        this.root = root;
        this.container.appendChild(this.root);

        // small entrance animation
        requestAnimationFrame(() => {
            this.root.style.transition = "transform 360ms cubic-bezier(0.2,0.8,0.2,1), opacity 260ms ease";
            this.root.style.transform = "translateY(0) rotate(0deg) scale(1)";
        });
    }

    // simple HTML escape for inserted strings
    _escapeHtml(str) {
        if (!str) return "";
        return String(str).replace(/[&<>"']/g, (s) => {
            const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
            return map[s];
        });
    }

    onPointerDown(e) {
        // ignore right-clicks
        if (e.button && e.button !== 0) return;
        this.pointerId = e.pointerId || "mouse";
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.currentX = 0;
        this.currentY = 0;
        this.dragging = true;
        this.root.setPointerCapture && this.root.setPointerCapture(this.pointerId);
        this.root.style.transition = "none";
        window.addEventListener("pointermove", this._onPointerMove, { passive: false });
        window.addEventListener("pointerup", this._onPointerUp, { passive: true });
        window.addEventListener("pointercancel", this._onPointerUp, { passive: true });
    }

    onPointerMove(e) {
        if (!this.dragging) return;
        const dx = e.clientX - this.startX;
        const dy = e.clientY - this.startY;
        this.currentX = dx;
        this.currentY = dy;
        // translate + small rotation
        const rot = Math.max(-18, Math.min(18, dx / 12));
        this.root.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
        this._updateOverlays(dx, dy);
        e.preventDefault && e.preventDefault();
    }

    onPointerUp(e) {
        if (!this.dragging) return;
        this.dragging = false;
        const dx = this.currentX;
        const absX = Math.abs(dx);

        // remove listeners
        window.removeEventListener("pointermove", this._onPointerMove);
        window.removeEventListener("pointerup", this._onPointerUp);
        window.removeEventListener("pointercancel", this._onPointerUp);

        // decide action
        if (absX >= this.threshold) {
            const action = dx > 0 ? (Math.abs(dx) > (this.threshold * 1.8) ? "love" : "like") : "pass";
            this._animateSwipeOut(dx, action);
        } else {
            // small vertical fling -> maybe
            const dy = this.currentY || 0;
            if (Math.abs(dy) > this.threshold && dy < 0) {
                // upward flick => maybe
                this._animateSwipeOut(0, "maybe");
            } else {
                // reset
                this.root.style.transition = "transform 260ms cubic-bezier(0.2,0.8,0.2,1)";
                this.root.style.transform = "translate(0px,0px) rotate(0deg)";
                this._setOverlayOpacity(0);
            }
        }
    }

    _updateOverlays(dx) {
        const absX = Math.abs(dx);
        // left = pass, small left shows maybe
        if (dx < 0) {
            const progress = Math.min(1, absX / this.threshold);
            this._badgeLeft.style.opacity = String(progress);
            this._badgeLeft.style.transform = `translateY(${(1 - progress) * -8}px) scale(${0.95 + progress * 0.12})`;
            // hide right overlays
            this._badgeRightLike.style.opacity = "0";
            this._badgeRightLove.style.opacity = "0";
            this._badgeMaybe.style.opacity = "0";
        } else if (dx > 0) {
            const progress = Math.min(1, absX / this.threshold);
            // small right -> like, bigger -> love
            if (absX < this.threshold * 1.4) {
                this._badgeRightLike.style.opacity = String(progress);
                this._badgeRightLove.style.opacity = "0";
            } else {
                const p2 = Math.min(1, (absX - this.threshold * 1.4) / (this.threshold));
                this._badgeRightLove.style.opacity = String(Math.min(1, progress + p2));
            }
            this._badgeLeft.style.opacity = "0";
            this._badgeMaybe.style.opacity = "0";
        }
    }

    _setOverlayOpacity(v = 0) {
        [this._badgeLeft, this._badgeMaybe, this._badgeRightLike, this._badgeRightLove].forEach(b => {
            if (b) b.style.opacity = String(v);
        });
    }

    _animateSwipeOut(dx, action) {
        const sign = dx >= 0 ? 1 : -1;
        const offX = (sign * Math.max(800, Math.abs(dx) + 600));
        const rotate = sign * 25;
        this.root.style.transition = "transform 420ms cubic-bezier(0.2,0.8,0.2,1), opacity 420ms ease";
        this.root.style.transform = `translate(${offX}px, ${this.currentY}px) rotate(${rotate}deg)`;
        this._setOverlayOpacity(1);

        // small delay to allow animation
        setTimeout(() => {
            // dispatch global event to tell SwipeTab to proceed
            document.dispatchEvent(new CustomEvent("card-swiped", { detail: { action, movie: this.movie } }));
            // remove element from DOM
            this.destroy(true);
        }, 360);
    }

    /**
     * Programmatic swipe via buttons
     * action = 'pass' | 'maybe' | 'like' | 'love'
     */
    handleAction(action) {
        if (!this.root) return;
        if (action === "pass") {
            // swipe left
            this._animateSwipeOut(-250, "pass");
        } else if (action === "maybe") {
            // upward small animation then dispatch
            this.root.style.transition = "transform 260ms cubic-bezier(0.2,0.8,0.2,1)";
            this.root.style.transform = `translate(0px, -220px) rotate(0deg)`;
            // show maybe badge
            this._badgeMaybe.style.opacity = "1";
            setTimeout(() => {
                document.dispatchEvent(new CustomEvent("card-swiped", { detail: { action: "maybe", movie: this.movie } }));
                this.destroy(true);
            }, 380);
        } else if (action === "like") {
            this._animateSwipeOut(240, "like");
        } else if (action === "love") {
            this._animateSwipeOut(520, "love");
        } else {
            // unknown action => reset
            this.root.style.transition = "transform 260ms cubic-bezier(0.2,0.8,0.2,1)";
            this.root.style.transform = "translate(0px,0px) rotate(0deg)";
            this._setOverlayOpacity(0);
        }
    }

    destroy(removeOnly = false) {
        // remove listeners
        try {
            this.root && this.root.removeEventListener("pointerdown", this._onPointerDown);
            window.removeEventListener("pointermove", this._onPointerMove);
            window.removeEventListener("pointerup", this._onPointerUp);
            window.removeEventListener("pointercancel", this._onPointerUp);
        } catch (e) { /* ignore */ }

        // remove element from DOM
        if (this.root && this.root.parentNode) {
            this.root.parentNode.removeChild(this.root);
        }
        this.root = null;
    }
}
