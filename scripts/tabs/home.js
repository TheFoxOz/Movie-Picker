/**
 * Home Tab – Clean & Beautiful
 */

import { getTMDBService } from '../services/tmdb.js';
import { movieModal } from '../components/movie-modal.js';
import { GENRE_IDS } from '../services/tmdb.js';
import { ENV } from '../config/env.js';
import { store } from '../state/store.js';

export class HomeTab {
    constructor() {
        this.container = null;
        this.movies = {
            trending: [],
            topRated: [],
            action: [],
            scifi: [],
            comedy: [],
            horror: []
        };
    }

    async render(container) {
        this.container = container;

        container.innerHTML = `
            <div style="padding: 1.5rem 1rem 6rem;">
                <h1 style="font-size: 1.75rem; font-weight: 800; color: white; margin: 0 0 1.5rem;">
                    Discover Movies
                </h1>
                <div style="text-align: center; padding: 3rem;">
                    <div style="width: 48px; height: 48px; border: 4px solid rgba(255,46,99,0.3); border-top-color: #ff2e63; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                </div>
            </div>
        `;

        await this.loadData();
        this.renderContent();
    }

    async loadData() {
        try {
            const tmdb = getTMDBService();
            if (!tmdb) return;

            const [trending, topRated, action, scifi, comedy, horror] = await Promise.all([
                tmdb.fetchTrendingMovies(),
                tmdb.fetchTopRatedMovies(),
                tmdb.fetchMoviesByGenre(GENRE_IDS.ACTION),
                tmdb.fetchMoviesByGenre(GENRE_IDS.SCIFI),
                tmdb.fetchMoviesByGenre(GENRE_IDS.COMEDY),
                tmdb.fetchMoviesByGenre(GENRE_IDS.HORROR)
            ]);

            this.movies = {
                trending: trending.slice(0, 10),
                topRated: topRated.slice(0, 10),
                action: action.slice(0, 10),
                scifi: scifi.slice(0, 10),
                comedy: comedy.slice(0, 10),
                horror: horror.slice(0, 10)
            };
        } catch (err) {
            console.error('[HomeTab] Load error:', err);
        }
    }

    renderContent() {
        this.container.innerHTML = `
            <div style="padding: 1.5rem 1rem 6rem;">
                <h1 style="font-size: 1.75rem; font-weight: 800; color: white; margin: 0 0 1.5rem;">
                    Discover Movies
                </h1>

                ${this.section('Trending Now', this.movies.trending)}
                ${this.section('All-Time Best', this.movies.topRated)}
                ${this.section('Action', this.movies.action)}
                ${this.section('Sci-Fi', this.movies.scifi)}
                ${this.section('Comedy', this.movies.comedy)}
                ${this.section('Horror', this.movies.horror)}
            </div>
        `;

        this.attachCardListeners();
    }

    section(title, movies) {
        if (!movies.length) return '';
        return `
            <section style="margin-bottom: 2.5rem;">
                <h2 style="font-size: 1.3rem; font-weight: 700; color: white; margin: 0 0 1rem;">
                    ${title}
                </h2>
                <div style="display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 0.5rem;">
                    ${movies.map(m => this.card(m)).join('')}
                </div>
            </section>
        `;
    }

    card(movie) {
        const poster = movie.poster_path || 'https://placehold.co/300x450/111/fff?text=Poster';
        return `
            <div class="home-card" data-id="${movie.id}" style="flex: 0 0 140px; cursor: pointer;">
                <div style="position: relative; border-radius: 1rem; overflow: hidden; background: #111; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
                    <img src="${poster}" alt="${movie.title}" style="width: 100%; height: 210px; object-fit: cover;">
                    <div style="position: absolute; top: 0.5rem; right: 0.5rem; background: rgba(251,191,36,0.9); color: white; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 700;">
                        ${movie.vote_average?.toFixed(1) || 'N/A'}
                    </div>
                    <div style="padding: 0.75rem;">
                        <h3 style="font-size: 0.875rem; font-weight: 700; color: white; margin: 0; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                            ${movie.title}
                        </h3>
                        <p style="font-size: 0.75rem; color: rgba(255,255,255,0.7); margin: 0.25rem 0 0;">
                            ${movie.year || '—'}
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    attachCardListeners() {
        this.container.querySelectorAll('.home-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                const movie = Object.values(this.movies).flat().find(m => String(m.id) === id);
                if (movie) movieModal.show(movie);
            });
        });
    }

    destroy() {}
}
