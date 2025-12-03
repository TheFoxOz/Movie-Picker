/**
 * Library Tab Component
 * Shows all movies with search, filters, and sorting
 */

import { store } from '../state/store.js';
import { movieModal } from '../components/movie-modal.js';
import { ENV } from '../config/env.js';

export class LibraryTab {
    constructor() {
        this.container = null;
        this.movies = [];
        this.filteredMovies = [];
        this.searchTerm = '';
        this.currentSort = 'intelligent'; // intelligent, recent, alphabetical, rating
        this.currentFilter = 'all'; // all, loved, liked, maybe
    }
    
    render(container) {
        this.container = container;
        this.loadMovies();
        
        container.innerHTML = `
            <div style="padding: 1.5rem 1rem 6rem;">
                <h1 style="font-size: 1.75rem; font-weight: 800; color: white; margin: 0 0 1.5rem 0;">
                    🎬 My Library
                </h1>
                
                <!-- Search Bar -->
                <div style="margin-bottom: 1.5rem;">
                    <input 
                        type="text" 
                        id="library-search"
                        placeholder="Search movies..."
                        style="width: 100%; padding: 1rem 1.25rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 1rem; color: white; font-size: 0.9375rem; transition: all 0.3s;"
                    >
                </div>
                
                <!-- Filter Buttons -->
                <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; overflow-x: auto; padding-bottom: 0.5rem;">
                    <button class="filter-btn" data-filter="all" style="padding: 0.5rem 1rem; background: rgba(255, 46, 99, 0.2); border: 1px solid rgba(255, 46, 99, 0.4); border-radius: 0.75rem; color: #ff2e63; font-size: 0.875rem; font-weight: 600; white-space: nowrap; cursor: pointer; transition: all 0.3s;">
                        All Movies
                    </button>
                    <button class="filter-btn" data-filter="loved" style="padding: 0.5rem 1rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 0.75rem; color: rgba(255, 255, 255, 0.7); font-size: 0.875rem; font-weight: 600; white-space: nowrap; cursor: pointer; transition: all 0.3s;">
                        ❤️ Loved
                    </button>
                    <button class="filter-btn" data-filter="liked" style="padding: 0.5rem 1rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 0.75rem; color: rgba(255, 255, 255, 0.7); font-size: 0.875rem; font-weight: 600; white-space: nowrap; cursor: pointer; transition: all 0.3s;">
                        👍 Liked
                    </button>
                    <button class="filter-btn" data-filter="maybe" style="padding: 0.5rem 1rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 0.75rem; color: rgba(255, 255, 255, 0.7); font-size: 0.875rem; font-weight: 600; white-space: nowrap; cursor: pointer; transition: all 0.3s;">
                        🤔 Maybe
                    </button>
                </div>
                
                <!-- Sort Dropdown -->
                <div style="margin-bottom: 1.5rem;">
                    <select id="library-sort" style="width: 100%; padding: 0.875rem 1rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 0.75rem; color: white; font-size: 0.875rem; cursor: pointer;">
                        <option value="intelligent">✨ Smart Sort</option>
                        <option value="recent">🕐 Recently Added</option>
                        <option value="alphabetical">🔤 A-Z</option>
                        <option value="rating">⭐ Highest Rated</option>
                    </select>
                </div>
                
                <!-- Movies Grid -->
                <div id="library-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem;">
                    <!-- Movies will be inserted here -->
                </div>
                
                <!-- Empty State -->
                <div id="library-empty" style="display: none; text-align: center; padding: 3rem 1rem; color: rgba(255, 255, 255, 0.5);">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🎬</div>
                    <p style="font-size: 1.125rem; font-weight: 600; margin: 0 0 0.5rem 0;">No movies found</p>
                    <p style="font-size: 0.875rem; margin: 0;">Try adjusting your filters or search</p>
                </div>
            </div>
        `;
        
        this.attachListeners();
        this.renderMovies();
    }
    
    loadMovies() {
        const state = store.getState();
        const swipeHistory = state.swipeHistory || [];
        
        // Get all swiped movies (loved, liked, maybe)
        this.movies = swipeHistory
            .filter(entry => ['love', 'like', 'maybe'].includes(entry.action))
            .map(entry => ({
                ...entry.movie,
                action: entry.action,
                timestamp: entry.timestamp
            }));
        
        if (ENV.APP.debug) {
            console.log('[LibraryTab] Loaded movies:', this.movies.length);
        }
        
        this.filteredMovies = [...this.movies];
    }
    
    attachListeners() {
        // Search
        const searchInput = this.container.querySelector('#library-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.applyFilters();
            });
        }
        
        // Filter buttons
        const filterBtns = this.container.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active state
                filterBtns.forEach(b => {
                    b.style.background = 'rgba(255, 255, 255, 0.05)';
                    b.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    b.style.color = 'rgba(255, 255, 255, 0.7)';
                });
                btn.style.background = 'rgba(255, 46, 99, 0.2)';
                btn.style.borderColor = 'rgba(255, 46, 99, 0.4)';
                btn.style.color = '#ff2e63';
                
                this.currentFilter = btn.dataset.filter;
                this.applyFilters();
            });
        });
        
        // Sort dropdown
        const sortSelect = this.container.querySelector('#library-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.applyFilters();
            });
        }
    }
    
    applyFilters() {
        let filtered = [...this.movies];
        
        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(movie => 
                movie.title.toLowerCase().includes(this.searchTerm) ||
                (movie.synopsis || '').toLowerCase().includes(this.searchTerm) ||
                (movie.genre || '').toLowerCase().includes(this.searchTerm)
            );
        }
        
        // Apply action filter
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(movie => movie.action === this.currentFilter);
        }
        
        // Apply sorting
        filtered = this.sortMovies(filtered);
        
        this.filteredMovies = filtered;
        this.renderMovies();
        
        if (ENV.APP.debug) {
            console.log('[LibraryTab] Filtered movies:', this.filteredMovies.length);
        }
    }
    
    sortMovies(movies) {
        switch (this.currentSort) {
            case 'intelligent':
                return movies.sort((a, b) => {
                    // Smart sort: loved > liked > maybe, then by rating, then by recent
                    const actionWeight = { love: 3, like: 2, maybe: 1 };
                    const weightDiff = (actionWeight[b.action] || 0) - (actionWeight[a.action] || 0);
                    if (weightDiff !== 0) return weightDiff;
                    
                    const ratingDiff = (parseFloat(b.imdb) || 0) - (parseFloat(a.imdb) || 0);
                    if (ratingDiff !== 0) return ratingDiff;
                    
                    return b.timestamp - a.timestamp;
                });
            
            case 'recent':
                return movies.sort((a, b) => b.timestamp - a.timestamp);
            
            case 'alphabetical':
                return movies.sort((a, b) => a.title.localeCompare(b.title));
            
            case 'rating':
                return movies.sort((a, b) => {
                    const ratingA = parseFloat(a.imdb) || 0;
                    const ratingB = parseFloat(b.imdb) || 0;
                    return ratingB - ratingA;
                });
            
            default:
                return movies;
        }
    }
    
    renderMovies() {
        const grid = this.container.querySelector('#library-grid');
        const empty = this.container.querySelector('#library-empty');
        
        if (!grid || !empty) return;
        
        if (this.filteredMovies.length === 0) {
            grid.style.display = 'none';
            empty.style.display = 'block';
            return;
        }
        
        grid.style.display = 'grid';
        empty.style.display = 'none';
        
        grid.innerHTML = this.filteredMovies.map(movie => {
            const posterUrl = movie.poster_path || movie.backdrop_path || 'https://placehold.co/300x450/1a1a2e/ffffff?text=' + encodeURIComponent(movie.title);
            
            const actionEmoji = {
                love: '❤️',
                like: '👍',
                maybe: '🤔'
            };
            
            const actionColor = {
                love: '#ff2e63',
                like: '#10b981',
                maybe: '#fbbf24'
            };
            
            return `
                <div 
                    class="library-movie-card" 
                    data-movie-id="${movie.id}"
                    style="position: relative; cursor: pointer; border-radius: 0.75rem; overflow: hidden; background: rgba(255, 255, 255, 0.05); transition: transform 0.3s, box-shadow 0.3s;"
                    onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 12px 40px rgba(0, 0, 0, 0.6)'"
                    onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'"
                >
                    <div style="position: relative; width: 100%; aspect-ratio: 2/3;">
                        <img 
                            src="${posterUrl}" 
                            alt="${movie.title}"
                            style="width: 100%; height: 100%; object-fit: cover;"
                            onerror="this.src='https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}'"
                        >
                        
                        <!-- Action Badge -->
                        <div style="position: absolute; top: 0.5rem; right: 0.5rem; width: 32px; height: 32px; background: ${actionColor[movie.action]}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);">
                            ${actionEmoji[movie.action]}
                        </div>
                        
                        <!-- Gradient Overlay -->
                        <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 0.75rem 0.5rem; background: linear-gradient(0deg, rgba(0, 0, 0, 0.9), transparent); pointer-events: none;">
                            <h3 style="font-size: 0.8125rem; font-weight: 700; color: white; margin: 0; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                                ${movie.title}
                            </h3>
                            <div style="display: flex; align-items: center; gap: 0.375rem; margin-top: 0.25rem;">
                                <span style="font-size: 0.6875rem; color: rgba(255, 255, 255, 0.8); font-weight: 600;">
                                    ${movie.year || 'N/A'}
                                </span>
                                ${movie.imdb ? `
                                    <span style="width: 3px; height: 3px; border-radius: 50%; background: rgba(255, 255, 255, 0.5);"></span>
                                    <span style="font-size: 0.6875rem; color: #fbbf24; font-weight: 700;">
                                        ⭐ ${movie.imdb}
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Attach click listeners to movie cards
        const movieCards = grid.querySelectorAll('.library-movie-card');
        movieCards.forEach(card => {
            card.addEventListener('click', () => {
                const movieId = card.dataset.movieId;
                // FIXED: Enhanced debug logging for ID matching
                if (ENV.APP.debug) {
                    console.log('[LibraryTab] Card clicked, movieId:', movieId, typeof movieId);
                }
                
                const movie = this.filteredMovies.find(m => {
                    const match = String(m.id) === String(movieId);
                    if (ENV.APP.debug) {
                        console.log('[LibraryTab] Comparing:', m.id, typeof m.id, 'vs', movieId, typeof movieId, '=', match);
                    }
                    return match;
                });
                
                if (movie) {
                    if (ENV.APP.debug) {
                        console.log('[LibraryTab] Opening modal for:', movie.title);
                    }
                    movieModal.show(movie);
                } else {
                    console.error('[LibraryTab] Movie not found for ID:', movieId);
                    console.error('[LibraryTab] Available IDs:', this.filteredMovies.map(m => ({ id: m.id, type: typeof m.id })));
                }
            });
        });
    }
    
    destroy() {
        // Cleanup if needed
    }
}
