/**
 * Library Tab
 * Browse full movie library with search, filters, and sorting
 */

import { store } from '../state/store.js';
import { movieModal } from '../components/movie-modal.js';
import { getPlatformStyle } from '../utils/scoring.js';

export class LibraryTab {
    constructor(container) {
        this.container = container;
        this.searchQuery = '';
        this.selectedGenre = 'all';
        this.selectedPlatform = 'all';
        this.sortBy = 'title';
        this.viewMode = 'grid';
    }
    
    render() {
        const movies = store.get('movies');
        const swipeHistory = store.get('swipeHistory');
        
        const genres = this.extractUniqueGenres(movies);
        const platforms = this.extractUniquePlatforms(movies);
        
        const filteredMovies = this.filterAndSortMovies(movies);
        
        this.container.innerHTML = `
            <div class="container" style="padding: 1.5rem;">
                <div style="margin-bottom: 1.5rem;">
                    <h1 style="margin-bottom: 0.5rem;">Movie Library</h1>
                    <p style="color: var(--color-text-secondary);">
                        ${filteredMovies.length} of ${movies.length} movies
                    </p>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <div style="position: relative;">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; color: var(--color-text-secondary);">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                        <input 
                            type="text" 
                            id="library-search"
                            placeholder="Search by title, actor, or genre..." 
                            value="${this.searchQuery}"
                            style="width: 100%; padding: 0.75rem 1rem 0.75rem 3rem; border-radius: 0.75rem; background: var(--color-bg-elevated); border: 1px solid var(--color-border); color: var(--color-text-primary); font-size: 0.875rem;"
                        >
                    </div>
                </div>
                
                <div style="display: flex; gap: 0.75rem; margin-bottom: 1.5rem; overflow-x: auto; padding-bottom: 0.5rem;">
                    <select id="genre-filter" style="padding: 0.5rem 1rem; border-radius: 0.5rem; background: var(--color-bg-card); border: 1px solid var(--color-border); color: var(--color-text-primary); font-size: 0.875rem; min-width: 120px;">
                        <option value="all">All Genres</option>
                        ${genres.map(genre => `
                            <option value="${genre}" ${this.selectedGenre === genre ? 'selected' : ''}>${genre}</option>
                        `).join('')}
                    </select>
                    
                    <select id="platform-filter" style="padding: 0.5rem 1rem; border-radius: 0.5rem; background: var(--color-bg-card); border: 1px solid var(--color-border); color: var(--color-text-primary); font-size: 0.875rem; min-width: 140px;">
                        <option value="all">All Platforms</option>
                        ${platforms.map(platform => `
                            <option value="${platform}" ${this.selectedPlatform === platform ? 'selected' : ''}>${platform}</option>
                        `).join('')}
                    </select>
                    
                    <select id="sort-by" style="padding: 0.5rem 1rem; border-radius: 0.5rem; background: var(--color-bg-card); border: 1px solid var(--color-border); color: var(--color-text-primary); font-size: 0.875rem; min-width: 140px;">
                        <option value="title" ${this.sortBy === 'title' ? 'selected' : ''}>Title (A-Z)</option>
                        <option value="year" ${this.sortBy === 'year' ? 'selected' : ''}>Year (Newest)</option>
                        <option value="rating" ${this.sortBy === 'rating' ? 'selected' : ''}>Rating (Highest)</option>
                        <option value="platform" ${this.sortBy === 'platform' ? 'selected' : ''}>Platform</option>
                    </select>
                    
                    <div style="display: flex; gap: 0.25rem; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 0.25rem;">
                        <button 
                            class="view-toggle ${this.viewMode === 'grid' ? 'active' : ''}" 
                            data-view="grid"
                            style="padding: 0.5rem; border-radius: 0.375rem; ${this.viewMode === 'grid' ? 'background: var(--color-primary); color: white;' : 'background: transparent; color: var(--color-text-secondary);'} transition: all 0.2s;"
                            aria-label="Grid view">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                            </svg>
                        </button>
                        <button 
                            class="view-toggle ${this.viewMode === 'list' ? 'active' : ''}" 
                            data-view="list"
                            style="padding: 0.5rem; border-radius: 0.375rem; ${this.viewMode === 'list' ? 'background: var(--color-primary); color: white;' : 'background: transparent; color: var(--color-text-secondary);'} transition: all 0.2s;"
                            aria-label="List view">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                            </svg>
                        </button>
                    </div>
                    
                    ${this.hasActiveFilters() ? `
                        <button 
                            id="clear-filters"
                            class="btn btn-ghost" 
                            style="padding: 0.5rem 1rem; font-size: 0.875rem; white-space: nowrap;">
                            Clear Filters
                        </button>
                    ` : ''}
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem;">
                    ${this.getQuickStats(movies, swipeHistory)}
                </div>
                
                <div id="movie-container">
                    ${this.renderMovies(filteredMovies)}
                </div>
            </div>
        `;
        
        this.attachListeners();
    }
    
    extractUniqueGenres(movies) {
        const genreSet = new Set();
        movies.forEach(movie => {
            if (movie.genre) {
                movie.genre.split(/[,/]/).forEach(g => {
                    genreSet.add(g.trim());
                });
            }
        });
        return Array.from(genreSet).sort();
    }
    
    extractUniquePlatforms(movies) {
        const platformSet = new Set();
        movies.forEach(movie => {
            if (movie.platform) {
                platformSet.add(movie.platform);
            }
        });
        return Array.from(platformSet).sort();
    }
    
    filterAndSortMovies(movies) {
        let filtered = [...movies];
        
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(movie => {
                const titleMatch = movie.title?.toLowerCase().includes(query);
                const genreMatch = movie.genre?.toLowerCase().includes(query);
                const actorMatch = movie.actors?.some(a => a.toLowerCase().includes(query));
                const synopsisMatch = movie.synopsis?.toLowerCase().includes(query);
                return titleMatch || genreMatch || actorMatch || synopsisMatch;
            });
        }
        
        if (this.selectedGenre !== 'all') {
            filtered = filtered.filter(movie => 
                movie.genre?.includes(this.selectedGenre)
            );
        }
        
        if (this.selectedPlatform !== 'all') {
            filtered = filtered.filter(movie => 
                movie.platform === this.selectedPlatform
            );
        }
        
        filtered.sort((a, b) => {
            switch (this.sortBy) {
                case 'title':
                    return (a.title || '').localeCompare(b.title || '');
                case 'year':
                    return (b.year || 0) - (a.year || 0);
                case 'rating':
                    return (b.imdb || 0) - (a.imdb || 0);
                case 'platform':
                    return (a.platform || '').localeCompare(b.platform || '');
                default:
                    return 0;
            }
        });
        
        return filtered;
    }
    
    hasActiveFilters() {
        return this.searchQuery || 
               this.selectedGenre !== 'all' || 
               this.selectedPlatform !== 'all' ||
               this.sortBy !== 'title';
    }
    
    getQuickStats(movies, swipeHistory) {
        const swipedIds = new Set(swipeHistory.map(s => s.movie?.id).filter(Boolean));
        const unseenCount = movies.filter(m => !swipedIds.has(m.id)).length;
        const lovedCount = swipeHistory.filter(s => s.action === 'love').length;
        const avgRating = movies.length > 0 
            ? (movies.reduce((sum, m) => sum + (m.imdb || 0), 0) / movies.length).toFixed(1)
            : '0.0';
        
        return `
            <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 0.75rem; text-align: center;">
                <div style="font-size: 1.25rem; font-weight: 800; color: var(--color-primary);">${unseenCount}</div>
                <div style="font-size: 0.625rem; color: var(--color-text-secondary); text-transform: uppercase;">Unseen</div>
            </div>
            <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 0.75rem; text-align: center;">
                <div style="font-size: 1.25rem; font-weight: 800; color: var(--love-glow);">${lovedCount}</div>
                <div style="font-size: 0.625rem; color: var(--color-text-secondary); text-transform: uppercase;">Loved</div>
            </div>
            <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 0.75rem; text-align: center;">
                <div style="font-size: 1.25rem; font-weight: 800; color: var(--color-reel);">${avgRating}</div>
                <div style="font-size: 0.625rem; color: var(--color-text-secondary); text-transform: uppercase;">Avg Rating</div>
            </div>
        `;
    }
    
    renderMovies(movies) {
        if (movies.length === 0) {
            return `
                <div class="empty-state">
                    <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <h2>No movies found</h2>
                    <p>Try adjusting your filters or search query</p>
                </div>
            `;
        }
        
        return this.viewMode === 'grid' 
            ? this.renderGridView(movies) 
            : this.renderListView(movies);
    }
    
    renderGridView(movies) {
        return `
            <div class="stagger-children" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem;">
                ${movies.map(movie => this.renderGridCard(movie)).join('')}
            </div>
        `;
    }
    
    renderGridCard(movie) {
        const { icon, color } = getPlatformStyle(movie.platform);
        const swipeHistory = store.get('swipeHistory');
        const userSwipe = swipeHistory.find(s => s.movie?.id === movie.id);
        
        return `
            <div class="card" style="padding: 0; overflow: hidden; cursor: pointer; position: relative;" data-movie-id="${movie.id}">
                ${userSwipe ? `
                    <div style="position: absolute; top: 0.5rem; right: 0.5rem; z-index: 2; padding: 0.25rem 0.5rem; background: ${this.getSwipeBadgeColor(userSwipe.action)}; border-radius: 0.375rem; font-size: 0.625rem; font-weight: 700; color: white; text-transform: uppercase;">
                        ${userSwipe.action}
                    </div>
                ` : ''}
                
                <div style="width: 100%; aspect-ratio: 2/3; background: linear-gradient(135deg, ${color}, ${color}dd); position: relative; overflow: hidden;">
                    <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 4rem; opacity: 0.3;">
                        🎬
                    </div>
                    <div style="position: absolute; bottom: 0.5rem; left: 0.5rem; width: 24px; height: 24px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; font-size: 0.625rem; color: white; font-weight: 800; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                        ${icon}
                    </div>
                </div>
                
                <div style="padding: 0.75rem;">
                    <h3 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${movie.title}">
                        ${movie.title}
                    </h3>
                    <p style="font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 0.5rem;">
                        ${movie.year || 'N/A'}
                    </p>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span class="badge badge-imdb" style="font-size: 0.625rem; padding: 0.125rem 0.375rem;">
                            ⭐ ${movie.imdb || 'N/A'}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderListView(movies) {
        return `
            <div class="stagger-children" style="display: flex; flex-direction: column; gap: 1rem;">
                ${movies.map(movie => this.renderListCard(movie)).join('')}
            </div>
        `;
    }
    
    renderListCard(movie) {
        const { icon, color } = getPlatformStyle(movie.platform);
        const swipeHistory = store.get('swipeHistory');
        const userSwipe = swipeHistory.find(s => s.movie?.id === movie.id);
        
        return `
            <div class="card" style="padding: 0; overflow: hidden; cursor: pointer;" data-movie-id="${movie.id}">
                <div style="display: flex; gap: 1rem;">
                    <div style="width: 80px; height: 120px; background: linear-gradient(135deg, ${color}, ${color}dd); flex-shrink: 0; position: relative;">
                        <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 2rem; opacity: 0.3;">
                            🎬
                        </div>
                        ${userSwipe ? `
                            <div style="position: absolute; top: 0.25rem; right: 0.25rem; padding: 0.125rem 0.25rem; background: ${this.getSwipeBadgeColor(userSwipe.action)}; border-radius: 0.25rem; font-size: 0.5rem; font-weight: 700; color: white; text-transform: uppercase;">
                                ${userSwipe.action}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div style="flex: 1; padding: 0.75rem 0.75rem 0.75rem 0; min-width: 0;">
                        <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.25rem;">
                            ${movie.title}
                        </h3>
                        <p style="font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 0.5rem;">
                            ${movie.year || 'N/A'} • ${movie.genre || 'Unknown Genre'}
                        </p>
                        <p style="font-size: 0.75rem; color: var(--color-text-secondary); line-height: 1.4; margin-bottom: 0.5rem;" class="line-clamp-2">
                            ${movie.synopsis || 'No description available.'}
                        </p>
                        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                            <span class="badge badge-imdb" style="font-size: 0.625rem;">IMDb ${movie.imdb || 'N/A'}</span>
                            ${movie.rt ? `<span class="badge badge-rt" style="font-size: 0.625rem;">RT ${movie.rt}%</span>` : ''}
                            <div style="display: flex; align-items: center; gap: 0.25rem;">
                                <span style="width: 16px; height: 16px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; font-size: 0.5rem; color: white; font-weight: 800;">
                                    ${icon}
                                </span>
                                <span style="font-size: 0.625rem; color: var(--color-text-secondary);">
                                    ${movie.platform}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    getSwipeBadgeColor(action) {
        const colors = {
            love: 'var(--love-glow)',
            like: 'var(--like-glow)',
            maybe: 'var(--maybe-glow)',
            pass: 'var(--nope-glow)'
        };
        return colors[action] || 'var(--color-text-secondary)';
    }
    
    attachListeners() {
        const searchInput = document.getElementById('library-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.render();
            });
        }
        
        const genreFilter = document.getElementById('genre-filter');
        if (genreFilter) {
            genreFilter.addEventListener('change', (e) => {
                this.selectedGenre = e.target.value;
                this.render();
            });
        }
        
        const platformFilter = document.getElementById('platform-filter');
        if (platformFilter) {
            platformFilter.addEventListener('change', (e) => {
                this.selectedPlatform = e.target.value;
                this.render();
            });
        }
        
        const sortBy = document.getElementById('sort-by');
        if (sortBy) {
            sortBy.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.render();
            });
        }
        
        const viewToggles = this.container.querySelectorAll('.view-toggle');
        viewToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                this.viewMode = toggle.dataset.view;
                this.render();
            });
        });
        
        const clearFilters = document.getElementById('clear-filters');
        if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                this.searchQuery = '';
                this.selectedGenre = 'all';
                this.selectedPlatform = 'all';
                this.sortBy = 'title';
                this.render();
            });
        }
        
        const movieCards = this.container.querySelectorAll('[data-movie-id]');
        movieCards.forEach(card => {
            card.addEventListener('click', () => {
                const movieId = card.dataset.movieId;
                const movies = store.get('movies');
                const movie = movies.find(m => m.id === movieId);
                if (movie) {
                    movieModal.show(movie);
                }
            });
        });
    }
    
    destroy() {
        this.searchQuery = '';
        this.selectedGenre = 'all';
        this.selectedPlatform = 'all';
    }
}
