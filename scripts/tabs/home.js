/**
 * Home Tab – shows movies filtered to user platforms and blocked triggers
 */

import { store } from "../state/store.js";
import { getTMDBService } from "../services/tmdb.js";
import { showToast } from "../utils/notifications.js";

export class HomeTab {
    constructor() {
        this.container = null;
        this.movieList = [];
        this.page = 1;
        this.loadedAll = false;
    }

    async render(container) {
        this.container = container;
        container.innerHTML = `
            <div style="padding:1rem;">
                <h2 style="color:white;">For you</h2>
                <div id="home-movies" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:12px;"></div>
                <div style="text-align:center;margin-top:16px;">
                    <button id="home-load-more" style="padding:10px 16px;border-radius:8px;border:none;background:#222;color:white;cursor:pointer;">
                        Load more
                    </button>
                </div>
            </div>
        `;

        this.container.querySelector("#home-load-more").addEventListener("click", async () => {
            await this.loadMore();
        });

        await this.loadInitial();
    }

    async loadInitial() {
        this.page = 1;
        this.movieList = [];
        this.loadedAll = false;
        await this.fetchAndRender();
    }

    async loadMore() {
        if (this.loadedAll) return;
        this.page += 1;
        await this.fetchAndRender();
    }

    async fetchAndRender() {
        try {
            const tmdb = getTMDBService();
            if (!tmdb) throw new Error("TMDB service not ready");

            // Get user preferences from store
            const state = store.getState();
            const user = state.user || {};
            const selectedPlatforms = Array.isArray(user.selectedPlatforms) ? user.selectedPlatforms.map(p => p.toString().toLowerCase()) : [];
            const blockedTriggers = Array.isArray(user.blockedTriggers) ? user.blockedTriggers : [];

            // Discover movies (page-based). tmdb.discoverMovies should accept an options object with page and providers.
            // TODO: if your tmdb service uses a different method, adapt this call.
            const res = await tmdb.discoverMovies({ page: this.page, providers: selectedPlatforms });

            const movies = Array.isArray(res.results) ? res.results : res;

            // Map & filter by triggers and (if needed) by platform property in the movie object
            const filtered = movies.filter(movie => {
                // platform check: if discover already limits providers then this will be redundant
                if (selectedPlatforms.length > 0) {
                    const moviePlatforms = movie.platforms || (movie.platform ? [movie.platform] : []);
                    if (moviePlatforms && moviePlatforms.length > 0) {
                        const ok = moviePlatforms.some(p => selectedPlatforms.includes(String(p).toLowerCase()) || selectedPlatforms.includes(p));
                        if (!ok) return false;
                    }
                }

                // trigger warnings check (movie.triggerWarnings is expected to be an array)
                const warnings = movie.triggerWarnings || movie.warnings || [];
                if (blockedTriggers && blockedTriggers.length > 0) {
                    if (warnings.some(w => blockedTriggers.includes(w))) return false;
                }

                return true;
            });

            // Append to local list & render grid
            this.movieList = this.movieList.concat(filtered);
            this.renderGrid();

            // If fewer than 20 results returned => likely last page
            if (!res.total_pages || (res.page && res.page >= res.total_pages) || (movies.length === 0)) {
                this.loadedAll = true;
                this.container.querySelector("#home-load-more").style.display = "none";
            } else {
                this.container.querySelector("#home-load-more").style.display = "inline-block";
            }
        } catch (err) {
            console.error("[HomeTab] fetch error", err);
            showToast("Failed to load Home movies", "error");
        }
    }

    renderGrid() {
        const grid = this.container.querySelector("#home-movies");
        if (!grid) return;
        grid.innerHTML = "";

        this.movieList.forEach(m => {
            const poster = m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : '';
            const node = document.createElement("div");
            node.style = "background: #0f0f12; padding:8px; border-radius:8px; text-align:center; cursor:pointer;";
            node.innerHTML = `
                <div style="height:200px; overflow:hidden; border-radius:6px; margin-bottom:8px;">
                    <img src="${poster}" alt="${(m.title||m.name)||''}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div style="color:white; font-weight:700; font-size:0.9rem;">${m.title || m.name}</div>
                <div style="color:rgba(255,255,255,0.6); font-size:0.8rem;">${(m.release_date||m.first_air_date||'').slice(0,4)}</div>
            `;
            node.addEventListener("click", () => {
                // navigate to details or swipe library
                document.dispatchEvent(new CustomEvent("movie-selected", { detail: { movie: m } }));
            });
            grid.appendChild(node);
        });
    }

    destroy() {
        // no-op for now
    }
}
