/**
 * Movie Modal – FINAL VERSION (Dec 2025)
 * • Beautiful categorized trigger warnings
 * • Collapsible categories with icons
 * • Works perfectly with trigger-warning-manager.js
 */

import { triggerWarningManager } from '../services/trigger-warning-manager.js';

class MovieModal {
    constructor() {
        this.modal = null;
        this.currentMovie = null;
        this.trailerKey = null;
    }

    async show(movie) {
        this.currentMovie = movie;
        this.trailerKey = null;

        // Try to get trailer (if available in movie object)
        if (movie.trailer?.key) {
            this.trailerKey = movie.trailer.key;
        }

        // Ensure warnings are loaded
        if (!movie.warningsLoaded) {
            await triggerWarningManager.getCategorizedWarnings(movie);
        }

        this.createModal();
        this.attachListeners();

        // Animate in
        setTimeout(() => {
            this.modal.style.opacity = '1';
            const content = this.modal.querySelector('.modal-content');
            if (content) content.style.transform = 'translateY(0)';
        }, 10);
    }

    hide() {
        if (!this.modal) return;

        const iframe = this.modal.querySelector('iframe');
        if (iframe) {
            iframe.src = '';
            setTimeout(() => iframe.remove(), 100);
        }

        this.modal.style.opacity = '0';
        const content = this.modal.querySelector('.modal-content');
        if (content) content.style.transform = 'translateY(20px)';

        setTimeout(() => {
            this.modal?.remove();
            this.modal = null;
            this.currentMovie = null;
        }, 300);
    }

    renderCategorizedWarnings() {
        const warnings = this.currentMovie.triggerWarnings || [];
        const count = this.currentMovie.triggerWarningCount || 0;

        if (count === 0) {
            return `
                <div style="padding:1.5rem;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:1rem;text-align:center;">
                    <p style="color:#86efac;margin:0;font-size:0.9375rem;font-weight:600;">
                        No trigger warnings found
                    </p>
                    <p style="color:rgba(255,255,255,0.5);font-size:0.8125rem;margin-top:0.5rem;">
                        This movie appears safe according to community reports
                    </p>
                </div>
            `;
        }

        return `
            <div style="background:rgba(239,68,68,0.1);border:2px solid rgba(239,68,68,0.4);border-radius:1.5rem;padding:1.5rem;">
                <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
                    <span style="font-size:1.5rem;">Warning</span>
                    <h3 style="margin:0;color:#fca5a5;font-weight:800;">
                        Content Warnings (${count})
                    </h3>
                </div>
                <div style="display:grid;gap:1rem;">
                    ${warnings.map(cat => `
                        <details style="background:rgba(255,255,255,0.05);border-radius:1rem;overflow:hidden;">
                            <summary style="
                                padding:1rem 1.25rem;
                                cursor:pointer;
                                list-style:none;
                                display:flex;
                                align-items:center;
                                gap:1rem;
                                font-weight:600;
                                color:white;
                                background:rgba(255,255,255,0.03);
                                border-bottom:1px solid rgba(255,255,255,0.05);
                            ">
                                <span style="font-size:1.75rem;">${cat.icon}</span>
                                <span>${cat.name}</span>
                                <span style="margin-left:auto;color:#fca5a5;font-weight:800;">${cat.count}</span>
                                <span style="color:rgba(255,255,255,0.5);font-size:0.875rem;">Click to expand</span>
                            </summary>
                            <div style="padding:1rem 1.25rem 1.25rem 4.5rem;">
                                ${cat.warnings.map(w => `
                                    <div style="
                                        padding:0.75rem;
                                        background:rgba(239,68,68,0.15);
                                        border-radius:0.75rem;
                                        margin-bottom:0.75rem;
                                        border-left:3px solid #ef4444;
                                    ">
                                        <div style="font-weight:600;color:white;margin-bottom:0.25rem;">
                                            ${w.name}
                                        </div>
                                        ${w.description ? `
                                            <div style="font-size:0.875rem;color:rgba(255,255,255,0.8);line-height:1.5;">
                                                ${w.description}
                                            </div>
                                        ` : ''}
                                        <div style="font-size:0.75rem;color:rgba(255,255,255,0.5);margin-top:0.5rem;">
                                            Confirmed by ${w.yesVotes} ${w.yesVotes === 1 ? 'person' : 'people'}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </details>
                    `).join('')}
                </div>
            </div>
        `;
    }

    createModal() {
        const existing = document.getElementById('movie-modal');
        if (existing) existing.remove();

        const movie = this.currentMovie;
        const poster = movie.posterURL || movie.backdropURL || `https://placehold.co/600x900/111/fff?text=${encodeURIComponent(movie.title)}`;

        this.modal = document.createElement('div');
        this.modal.id = 'movie-modal';
        this.modal.style.cssText = `
            position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;
            background:rgba(0,0,0,0.95);opacity:0;transition:opacity 0.3s;padding:1rem;overflow-y:auto;
        `;

        this.modal.innerHTML = `
            <div class="modal-content" style="
                background:linear-gradient(180deg,#1a1a2e,#0a0a0f);
                border-radius:1.5rem;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;
                box-shadow:0 20px 60px rgba(0,0,0,0.8);border:1px solid rgba(255,255,255,0.1);
                transform:translateY(20px);transition:transform 0.3s;
            ">
                <button id="modal-close" style="
                    position:absolute;top:1rem;right:1rem;width:44px;height:44px;border-radius:50%;
                    background:rgba(255,255,255,0.1);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.2);
                    color:white;font-size:1.5rem;cursor:pointer;z-index:10;
                ">×</button>

                ${this.trailerKey ? `
                    <div style="position:relative;padding-top:56.25%;background:#000;">
                        <iframe style="position:absolute;inset:0;width:100%;height:100%;border:none;"
                            src="https://www.youtube.com/embed/${this.trailerKey}?autoplay=1&rel=0&modestbranding=1"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen></iframe>
                    </div>
                ` : `
                    <div style="width:100%;aspect-ratio:2/3;background:#000;position:relative;overflow:hidden;">
                        <img src="${poster}" alt="${movie.title}" style="width:100%;height:100%;object-fit:cover;">
                        <div style="position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,0.8),transparent 40%);"></div>
                    </div>
                `}

                <div style="padding:2rem;">
                    <h2 style="font-size:2rem;font-weight:800;color:white;margin:0 0 1rem;line-height:1.2;">
                        ${movie.title}
                    </h2>
                    <p style="color:rgba(255,255,255,0.85);line-height:1.7;font-size:1rem;margin-bottom:2rem;">
                        ${movie.overview || 'No description available.'}
                    </p>

                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:1rem;margin-bottom:2rem;">
                        ${['year', 'rating', 'runtime', 'director'].map(key => {
                            const labels = { year: 'Year', rating: 'Rating', runtime: 'Runtime', director: 'Director' };
                            const values = {
                                year: movie.year || movie.releaseDate?.split('-')[0],
                                rating: movie.rating ? `${movie.rating.toFixed(1)} stars` : null,
                                runtime: movie.runtime ? `${movie.runtime} min` : null,
                                director: movie.director
                            };
                            const value = values[key];
                            if (!value) return '';
                            return `
                                <div>
                                    <div style="font-size:0.75rem;color:rgba(255,255,255,0.5);text-transform:uppercase;font-weight:600;margin-bottom:0.5rem;">
                                        ${labels[key]}
                                    </div>
                                    <div style="color:white;font-weight:700;">${value}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>

                    ${movie.cast?.length ? `
                        <div style="margin-bottom:2rem;">
                            <div style="font-size:0.875rem;color:rgba(255,255,255,0.6);font-weight:600;margin-bottom:0.75rem;">
                                Top Cast
                            </div>
                            <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
                                ${movie.cast.slice(0,8).map(name => `
                                    <span style="padding:0.5rem 1rem;background:rgba(255,255,255,0.05);border-radius:0.75rem;color:white;font-size:0.875rem;">
                                        ${name}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- CATEGORIZED WARNINGS -->
                    <div>
                        <h3 style="font-size:1.125rem;font-weight:700;color:white;margin:0 0 1.5rem;display:flex;align-items:center;gap:0.75rem;">
                            <span>Warning</span> Content Warnings
                        </h3>
                        ${this.renderCategorizedWarnings()}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
    }

    attachListeners() {
        this.modal.querySelector('#modal-close')?.addEventListener('click', () => this.hide());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hide();
        });
    }
}

export const movieModal = new MovieModal();
