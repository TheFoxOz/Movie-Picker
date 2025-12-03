/**
 * Library Tab – infinite scroll + TMDb global search
 */

import { store } from "../state/store.js";
import { getTMDBService } from "../services/tmdb.js";
import { showToast } from "../utils/notifications.js";

export class LibraryTab {
    constructor() {
        this.container = null;
        this.movies = [];
        this.page = 1;
        this.fetching = false;
    }

    async render(container) {
        this.container = container;
        container.innerHTML = `
            <div style="padding:1rem;">
                <div style="display:flex; gap:8px; align-items:center;">
                    <input id="lib-search" placeholder="Search all TMDb movies..." style="flex:1;padding:10px;border-radius:8px;border:none;background:#111;color:white;" />
                    <button id="lib-search-btn" style="padding:10px 12px;border-radius:8px;border:none;background:#ff2e63;color:white;cursor:pointer;">Search</button>
                </div>
                <div id="lib-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:12px;"></div>
                <div id="lib-loading" style="text-align:center;padding:12px;color:rgba(255,255,255,0.6);">Scroll to load more</div>
            </div>
        `;

        this.container.querySelector("#lib-search-btn").addEventListener("click", async () => {
            const q = this.container.querySelector("#lib-search").value.trim();
            await this.searchAll(q);
        });

        // initial load
        await this.loadInitial();

        // infinite scroll (window)
        window.addEventListener("scroll", this.onScrollBound = this.onScroll.bind(this));
    }

    async loadInitial() {
        this.page = 1;
        this.movies = [];
        await this.fetchNextChunk();
    }

    async onScroll() {
        const nearBottom = (window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 800);
        if (nearBottom && !this.fetching) {
            await this.fetchNextChunk();
        }
    }

    // fetch chunk = ~100 movies (TMDb pages are typically 20 items)
    async fetchNextChunk() {
        try {
            this.fetching = true;
            const tmdb = getTMDBService();
            if (!tmdb) throw new Error("TMDB not ready");

            // get user prefs to filter platforms/triggers
            const state = store.getState();
            const user = state.user || {};
            const selectedPlatforms = Array.isArray(user.selectedPlatforms) ? user.selectedPlatforms.map(x => x.toString().toLowerCase()) : [];
            const blockedTriggers = Array.isArray(user.blockedTriggers) ? user.blockedTriggers : [];

            // We'll fetch 5 TMDb pages in each chunk (assuming 20 per page => ~100)
            const pagesToFetch = 5;
            const promises = [];
            for (let i = 0; i < pagesToFetch; i++) {
                promises.push(tmdb.discoverMovies({ page: this.page + i, providers: selectedPlatforms }));
            }

            const results = await Promise.all(promises);

            // flatten results to a single array
            const flat = results.flatMap(r => (r && r.results) ? r.results : (Array.isArray(r) ? r : []));

            // apply blocked triggers filter and dedupe
            const filtered = flat.filter(m => {
                const warnings = m.triggerWarnings || m.warnings || [];
                if (blockedTriggers && blockedTriggers.length > 0) {
                    if (warnings.some(w => blockedTriggers.includes(w))) return false;
                }
                return true;
            });

            // dedupe by id
            const map = new Map(this.movies.map(m => [m.id, m]));
            filtered.forEach(m => map.set(m.id, m));
            this.movies = Array.from(map.values());

            // render grid
            this.renderGrid();

            // advance page
            this.page += pagesToFetch;
            this.fetching = false;
        } catch (err) {
            console.error("[LibraryTab] fetch error", err);
            showToast("Failed to load library", "error");
            this.fetching = false;
        }
    }

    renderGrid() {
        const grid = this.container.querySelector("#lib-grid");
        if (!grid) return;
        grid.innerHTML = "";

        this.movies.forEach(m => {
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
                document.dispatchEvent(new CustomEvent("movie-selected", { detail: { movie: m } }));
            });
            grid.appendChild(node);
        });
    }

    // TMDb search uses the full TMDb DB
    async searchAll(query) {
        if (!query || query.length < 1) {
            await this.loadInitial();
            return;
        }
        try {
            const tmdb = getTMDBService();
            if (!tmdb) throw new Error("TMDB not ready");
            const res = await tmdb.searchMovies(query, { page: 1 });
            const movies = res.results || res;
            this.movies = movies;
            this.renderGrid();
        } catch (err) {
            console.error("[LibraryTab] search error", err);
            showToast("Search failed", "error");
        }
    }

    destroy() {
        window.removeEventListener("scroll", this.onScrollBound);
    }
}
