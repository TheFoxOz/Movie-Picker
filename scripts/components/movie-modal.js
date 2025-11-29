/**
 * MovieModal Component
 * Detailed movie information modal
 */

import { getPlatformStyle } from '../utils/scoring.js';

export class MovieModal {
    constructor() {
        this.container = document.getElementById('modal-root');
        this.currentMovie = null;
    }
    
    show(movie) {
        this.currentMovie = movie;
        const modal = this.createModal();
        this.container.innerHTML = '';
        this.container.appendChild(modal);
        
        requestAnimationFrame(() => {
            modal.classList.add('entering');
        });
    }
    
    createModal() {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.innerHTML = this.getTemplate();
        
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                this.hide();
            }
        });
        
        const closeBtn = backdrop.querySelector('[data-close]');
        closeBtn.addEventListener('click', () => this.hide());
        
        return backdrop;
    }
    
    getTemplate() {
        const { icon, color } = getPlatformStyle(this.currentMovie.platform);
        
        return `
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">${this.currentMovie.title}</h2>
                    <button data-close class="modal-close" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <img src="https://placehold.co/400x200/${color.replace('#', '')}/${this.currentMovie.id}" 
                         alt="${this.currentMovie.title}" 
                         style="width: 100%; height: 200px; object-fit: cover; border-radius: 0.75rem; margin-bottom: 1rem;">
                    
                    <p style="color: var(--color-text-secondary); margin-bottom: 1rem; line-height: 1.6;">
                        ${this.currentMovie.synopsis}
                    </p>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div>
                            <p style="font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 0.25rem;">Platform</p>
                            <p style="font-weight: 600;">${this.currentMovie.platform}</p>
                        </div>
                        <div>
                            <p style="font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 0.25rem;">Year</p>
                            <p style="font-weight: 600;">${this.currentMovie.year}</p>
                        </div>
                        <div>
                            <p style="font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 0.25rem;">Genre</p>
                            <p style="font-weight: 600;">${this.currentMovie.genre}</p>
                        </div>
                        <div>
                            <p style="font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 0.25rem;">Runtime</p>
                            <p style="font-weight: 600;">${this.currentMovie.runtime}</p>
                        </div>
                    </div>
                    
                    ${this.currentMovie.actors ? `
                        <div style="margin-bottom: 1rem;">
                            <p style="font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 0.5rem;">Cast</p>
                            <p style="font-weight: 600;">${this.currentMovie.actors.join(', ')}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    hide() {
        const backdrop = this.container.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.classList.remove('entering');
            backdrop.classList.add('exiting');
            setTimeout(() => {
                this.container.innerHTML = '';
            }, 300);
        }
    }
}

// Create singleton instance
export const movieModal = new MovieModal();
