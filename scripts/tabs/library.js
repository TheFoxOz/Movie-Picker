/**
 * Library Tab – Infinite Scroll + Filters
 */

import { store } from '../state/store.js';
import { getTMDBService, GENRE_IDS } from '../services/tmdb.js';
import { movieModal } from '../components/movie-modal.js';
import { ENV } from '../config/env.js';

export class LibraryTab {
    constructor() {
        this.container = null;
        this.allMovies = [];
        this.filtered = [];
        this.page = 1;
        this.loading = false;
        this.hasMore = true;
    }

    async render(container) {
        this.container = container;
        container.innerHTML = this.loadingHTML();

        await this.loadPage(1);
        this.renderGrid();
        this.setupScroll();
    }

    async loadPage(page) {
        if (this.loading || !this.hasMore) return;
        this.loading = true;

        try {
            const tmdb = getTMDBService();
            const res = await fetch(
                `https://api.themoviedb.org/3/discover/movie?api_key=${tmdb.apiKey}&language=en-US&sort_by=popularity.desc&page=${page}`
            );
            const data = await res.json();

            const newMovies = data.results.map(m => tmdb.transformMovie(m));
            const existing = new Set(this.allMovies.map(m => m.id));
            const filtered = newMovies.filter(m => !existing.has(m.id));

            this.allMovies.push(...filtered);
            this.filtered = this.allMovies;
            this.page = page;

            if (data.page >= data.total_pages) this.hasMore = false;
        } catch (err) {
            console.error(err);
            this.hasMore = false;
        } finally {
            this.loading = false;
        }
    }

    renderGrid() {
        const movies = this.filtered.slice(0, this.page * 20);

        this.container.innerHTML = `
            <div style="padding: 1.5rem 1rem 6rem;">
                <h1 style="font-size: 1.75rem; font-weight: 800; color: white; margin-bottom: 1rem;">
                    Movie Library
                </h1>
                <p style="color: rgba(255,255,255,0.6); margin-bottom: 1.5rem;">
                    ${this.allMovies.length.toLocaleString()}+ movies • Scroll to load more
                </p>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem;">
                    ${movies.map(m => this.card(m)).join('')}
                </div>
                ${this.loading ? '<div style="text-align:center;padding:2rem;"><div class="spinner"></div></div>' : ''}
            </div>
        `;

        this.attachListeners();
    }

    card(movie) {
        const poster = movie.poster_path || 'https://placehold.co/300x450/111/fff?text=Poster';
        return `
            <div class="lib-card" data-id="${movie.id}">
                <img src="${poster}" alt="${movie.title}" style="width:100%;border-radius:1rem;">
                <div style="padding:0.5rem 0;">
                    <h3 style="font-size:0.875rem;color:white;font-weight:600;margin:0;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
                        ${movie.title}
                    </h3>
                    <p style="font-size:0.75rem;color:#aaa;margin:0.25rem 0 0;">
                        ${movie.year} • ${movie.runtime || '—'}
                    </p>
                </div>
            </div>
        `;
    }

    attachListeners() {
        this.container.querySelectorAll('.lib-card').forEach(card => {
            card.onclick = () => {
                const movie = this.allMovies.find(m => m.id == card.dataset.id);
                if (movie) movieModal.show(movie);
            }
        });
    }

    setupScroll() {
        window.onscroll = () => {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000 && this.hasMore && !this.loading) {
                this.loadPage(this.page + 1).then(() => this.renderGrid());
            }
        };
    }

    loadingHTML() {
        return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:80vh;gap:1rem;color:white;">
            <div class="spinner"></div>
            <p>Loading library...</p>
        </div>`;
    }

    destroy() {
        window.onscroll = null;
    }
}
