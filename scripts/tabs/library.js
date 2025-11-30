/**
 * Library Tab - ULTRA PREMIUM NETFLIX REDESIGN
 * Intelligent blockbuster-first ranking, glassmorphism, cinematic feel
 */

import { store } from '../state/store.js';
import { movieModal } from '../components/movie-modal.js';
import { getPlatformStyle } from '../utils/scoring.js';
import { getTMDBService } from '../services/tmdb.js';

export class LibraryTab {
    constructor(container) {
        this.container = container;
        this.searchQuery = '';
        this.selectedGenre = 'all';
        this.selectedPlatform = 'all';
        this.sortBy = 'intelligent'; // NEW: Intelligent ranking
        this.viewMode = 'grid';
        this.isSearching = false;
        this.searchResults = null;
    }
    
    render() {
        const movies = this.searchResults || store.get('movies');
        const swipeHistory = store.get('swipeHistory');
        
        const genres = this.extractUniqueGenres(store.get('movies'));
        const platforms = this.extractUniquePlatforms(store.get('movies'));
        
        const filteredMovies = this.filterAndSortMovies(movies);
        
        this.container.innerHTML = `
            <div style="background: linear-gradient(180deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%); min-height: 100vh;">
                
                <!-- STICKY SEARCH BAR -->
                <div style="position: sticky; top: 0; z-index: 20; backdrop-filter: blur(20px); background: rgba(10, 10, 15, 0.95); border-bottom: 1px solid rgba(255, 46, 99, 0.2); padding: 1.5rem 1.5rem 1rem;">
                    <div style="position: relative; margin-bottom: 1rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="position: absolute; left: 1.25rem; top: 50%; transform: translateY(-50%); width: 24px; height: 24px; color: rgba(255, 46, 99, 0.8);">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                        <input 
                            type="text" 
                            id="library-search"
                            placeholder="Search TMDB for any movie..." 
                            value="${this.searchQuery}"
                            style="width: 100%; padding: 1rem 1.25rem 1rem 3.5rem; border-radius: 1rem; background: rgba(255, 255, 255, 0.05); border: 2px solid ${this.searchQuery ? 'rgba(255, 46, 99, 0.5)' : 'rgba(255, 255, 255, 0.1)'}; color: white; font-size: 1rem; font-weight: 600; transition: all 0.3s; box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);"
                        >
                        ${this.isSearching ? `
                            <div style="position: absolute; right: 1.25rem; top: 50%; transform: translateY(-50%);">
                                <div class="loading-spinner" style="width: 24px; height: 24px; border-width: 3px; border-color: rgba(255, 46, 99, 0.3); border-top-color: #ff2e63;"></div>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${this.searchQuery ? `
                        <div style="padding: 0.75rem 1rem; background: linear-gradient(135deg, rgba(255, 46, 99, 0.2), rgba(139, 92, 246, 0.2)); border: 1px solid rgba(255, 46, 99, 0.3); border-radius: 0.75rem; margin-bottom: 1rem;">
                            <p style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.9); margin: 0;">
                                ${this.searchResults ? `Showing <strong style="color: #ff2e63;">${filteredMovies.length}</strong> results for "<strong>${this.searchQuery}</strong>"` : 'Press Enter or wait to search TMDB...'}
                            </p>
                        </div>
                    ` : ''}
                    
                    <!-- QUICK STATS -->
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1rem;">
                        ${this.getQuickStats(store.get('movies'), swipeHistory)}
                    </div>
                </div>

                <!-- FILTERS BAR -->
                <div style="padding: 1rem 1.5rem; display: flex; gap: 0.75rem; overflow-x: auto; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                    <select id="genre-filter" style="padding: 0.75rem 1rem; border-radius: 0.75rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: white; font-size: 0.875rem; font-weight: 600; min-width: 120px; cursor: pointer;">
                        <option value="all">All Genres</option>
                        ${genres.map(genre => `
                            <option value="${genre}" ${this.selectedGenre === genre ? 'selected' : ''}>${genre}</option>
                        `).join('')}
                    </select>
                    
                    <select id="platform-filter" style="padding: 0.75rem 1rem; border-radius: 0.75rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: white; font-size: 0.875rem; font-weight: 600; min-width: 140px; cursor: pointer;">
                        <option value="all">All Platforms</option>
                        ${platforms.map(platform => `
                            <option value="${platform}" ${this.selectedPlatform === platform ? 'selected' : ''}>${platform}</option>
                        `).join('')}
                    </select>
                    
                    <select id="sort-by" style="padding: 0.75rem 1rem; border-radius: 0.75rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: white; font-size: 0.875rem; font-weight: 600; min-width: 160px; cursor: pointer;">
                        <option value="intelligent" ${this.sortBy === 'intelligent' ? 'selected' : ''}>Sort: Intelligent ↓</option>
                        <option value="popularity" ${this.sortBy === 'popularity' ? 'selected' : ''}>Sort: Popularity ↓</option>
                        <option value="rating" ${this.sortBy === 'rating' ? 'selected' : ''}>Sort: Rating ↓</option>
                        <option value="year" ${this.sortBy === 'year' ? 'selected' : ''}>Sort: Year ↓</option>
                        <option value="title" ${this.sortBy === 'title' ? 'selected' : ''}>Sort: Title (A-Z)</option>
                    </select>
                    
                    ${this.hasActiveFilters() ? `
                        <button 
                            id="clear-filters"
                            class="btn" 
                            style="padding: 0.75rem 1.25rem; font-size: 0.875rem; font-weight: 700; white-space: nowrap; background: rgba(255, 46, 99, 0.2); border: 1px solid rgba(255, 46, 99, 0.4); color: #ff2e63; border-radius: 0.75rem;">
                            Clear All
                        </button>
                    ` : ''}
                </div>

                <!-- MOVIE GRID/LIST -->
                <div id="movie-container" style="padding: 1.5rem;">
                    ${this.renderMovies(filteredMovies)}
                </div>

                <div style="height: 100px;"></div>
            </div>
        `;
        
        this.attachListeners();
    }
    
    async searchTMDB(query) {
        if (!query || query.length < 2) {
            this.searchResults = null;
            this.render();
            return;
        }
        
        this.isSearching = true;
        this.render();
        
        try {
            const tmdbService = getTMDBService();
            const results = await tmdbService.searchMovies(query);
            this.searchResults = results;
            console.log(`[Library] Found ${results.length} movies for "${query}"`);
        } catch (error) {
            console.error('[Library] Search error:', error);
            this.searchResults = [];
        }
        
        this.isSearching = false;
        this.render();
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
        
        // INTELLIGENT SORTING - Blockbusters first!
        filtered.sort((a, b) => {
            switch (this.sortBy) {
                case 'intelligent':
                    // Prioritize: High vote count + High rating + Recent year
                    const scoreA = (a.vote_count || 0) * 0.3 + (a.imdb || 0) * 10 + (a.year || 0) * 0.1;
                    const scoreB = (b.vote_count || 0) * 0.3 + (b.imdb || 0) * 10 + (b.year || 0) * 0.1;
                    return scoreB - scoreA;
                case 'popularity':
                    return (b.popularity || 0) - (a.popularity || 0);
                case 'title':
                    return (a.title || '').localeCompare(b.title || '');
                case 'year':
                    return (b.year || 0) - (a.year || 0);
                case 'rating':
                    return (b.imdb || 0) - (a.imdb || 0);
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
               this.sortBy !== 'intelligent';
    }
    
    getQuickStats(movies, swipeHistory) {
        const swipedIds = new Set(swipeHistory.map(s => s.movie?.id).filter(Boolean));
        const unseenCount = movies.filter(m => !swipedIds.has(m.id)).length;
        const lovedCount = swipeHistory.filter(s => s.action === 'love').length;
        const avgRating = movies.length > 0 
            ? (movies.reduce((sum, m) => sum + (m.imdb || 0), 0) / movies.length).toFixed(1)
            : '0.0';
        
        return `
            <div style="backdrop-filter: blur(10px); background: linear-gradient(135deg, rgba(255, 46, 99, 0.15), rgba(139, 92, 246, 0.15)); border: 1px solid rgba(255, 46, 99, 0.3); border-radius: 1rem; padding: 1rem; text-align: center; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);">
                <div style="font-size: 1.75rem; font-weight: 800; background: linear-gradient(135deg, #ff2e63, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">${unseenCount}</div>
                <div style="font-size: 0.625rem; color: rgba(255, 255, 255, 0.7); text-transform: uppercase; font-weight: 700; letter-spacing: 0.1em;">Unseen</div>
            </div>
            <div style="backdrop-filter: blur(10px); background: linear-gradient(135deg, rgba(255, 0, 110, 0.15), rgba(217, 0, 98, 0.15)); border: 1px solid rgba(255, 0, 110, 0.3); border-radius: 1rem; padding: 1rem; text-align: center; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);">
                <div style="font-size: 1.75rem; font-weight: 800; background: linear-gradient(135deg, #ff006e, #d90062); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">${lovedCount}</div>
                <div style="font-size: 0.625rem; color: rgba(255, 255, 255, 0.7); text-transform: uppercase; font-weight: 700; letter-spacing: 0.1em;">Loved</div>
            </div>
            <div style="backdrop-filter: blur(10px); background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.15)); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 1rem; padding: 1rem; text-align: center; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);">
                <div style="font-size: 1.75rem; font-weight: 800; background: linear-gradient(135deg, #fbbf24, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">${avgRating}</div>
                <div style="font-size: 0.625rem; color: rgba(255, 255, 255, 0.7); text-transform: uppercase; font-weight: 700; letter-spacing: 0.1em;">Avg Rating</div>
            </div>
        `;
    }
    
    renderMovies(movies) {
        if (movies.length === 0) {
            return `
                <div class="empty-state" style="padding: 4rem 2rem; text-align: center;">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 80px; height: 80px; margin: 0 auto 1.5rem; color: rgba(255, 46, 99, 0.5);">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <h2 style="font-size: 1.5rem; font-weight: 700; color: white; margin-bottom: 0.5rem;">No movies found</h2>
                    <p style="color: rgba(255, 255, 255, 0.6);">Try adjusting your filters or search query</p>
                </div>
            `;
        }
        
        return this.viewMode === 'grid' 
            ? this.renderGridView(movies) 
            : this.renderListView(movies);
    }
    
    renderGridView(movies) {
        return `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                ${movies.map((movie, index) => this.renderGridCard(movie, index)).join('')}
            </div>
        `;
    }
    
    renderGridCard(movie, index) {
        const { icon, color } = getPlatformStyle(movie.platform);
        const swipeHistory = store.get('swipeHistory');
        const userSwipe = swipeHistory.find(s => s.movie?.id === movie.id);
        
        const posterUrl = movie.poster_path || `https://placehold.co/400x600/${color.replace('#', '')}/ffffff?text=${encodeURIComponent(movie.title)}`;
        
        // TOP RESULT BADGE for first 3 results (if searching or intelligent sort)
        const isTopResult = index < 3 && (this.searchResults || this.sortBy === 'intelligent');
        const isNumberOne = index === 0 && isTopResult;
        
        return `
            <div class="card" style="padding: 0; overflow: hidden; cursor: pointer; position: relative; border-radius: 1rem; background: rgba(255, 255, 255, 0.02); border: ${isTopResult ? '2px solid rgba(251, 191, 36, 0.5)' : '1px solid rgba(255, 255, 255, 0.05)'}; box-shadow: ${isTopResult ? '0 12px 40px rgba(251, 191, 36, 0.3)' : '0 8px 24px rgba(0, 0, 0, 0.4)'}; transition: all 0.3s;" data-movie-id="${movie.id}" onmouseover="this.style.transform='translateY(-8px) scale(1.02)'" onmouseout="this.style.transform='translateY(0) scale(1)'">
                
                ${isTopResult ? `
                    <div style="position: absolute; top: 0.5rem; left: 0.5rem; z-index: 3; display: flex; align-items: center; gap: 0.5rem;">
                        <div style="display: flex; align-items: center; gap: 0.25rem; padding: 0.375rem 0.75rem; background: linear-gradient(135deg, #fbbf24, #f59e0b); border-radius: 0.5rem; font-size: 0.75rem; font-weight: 800; color: black; box-shadow: 0 4px 16px rgba(251, 191, 36, 0.5);">
                            <span style="font-size: 1rem;">👑</span>
                            ${isNumberOne ? '#1 TOP RESULT' : 'TOP RESULT'}
                        </div>
                    </div>
                ` : ''}
                
                ${userSwipe ? `
                    <div style="position: absolute; top: 0.5rem; right: 0.5rem; z-index: 3; padding: 0.25rem 0.5rem; background: ${this.getSwipeBadgeColor(userSwipe.action)}; border-radius: 0.375rem; font-size: 0.625rem; font-weight: 700; color: white; text-transform: uppercase; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);">
                        ${userSwipe.action}
                    </div>
                ` : ''}
                
                <div style="width: 100%; aspect-ratio: 2/3; background: ${color}; position: relative; overflow: hidden;">
                    <img 
                        src="${posterUrl}" 
                        alt="${movie.title}"
                        style="width: 100%; height: 100%; object-fit: cover;"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                    >
                    <div style="position: absolute; inset: 0; display: none; align-items: center; justify-content: center; font-size: 4rem; opacity: 0.3; background: linear-gradient(135deg, ${color}, ${color}dd);">
                        🎬
                    </div>
                    
                    ${isNumberOne ? `
                        <div style="position: absolute; inset: 0; background: linear-gradient(0deg, rgba(0, 0, 0, 0.9), transparent 60%); pointer-events: none;"></div>
                        <div style="position: absolute; bottom: 0.75rem; left: 0.75rem; right: 0.75rem;">
                            <div style="width: 64px; height: 64px; margin: 0 auto 0.5rem; border-radius: 50%; background: linear-gradient(135deg, #fbbf24, #f59e0b); display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 800; color: black; box-shadow: 0 8px 24px rgba(251, 191, 36, 0.6); border: 3px solid rgba(255, 255, 255, 0.3);">
                                1
                            </div>
                        </div>
                    ` : ''}
                    
                    <div style="position: absolute; bottom: 0.5rem; left: 0.5rem; width: 28px; height: 28px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; color: white; font-weight: 800; box-shadow: 0 4px 12px rgba(0,0,0,0.4); border: 2px solid rgba(255, 255, 255, 0.2);">
                        ${icon}
                    </div>
                </div>
                
                <div style="padding: 1rem;">
                    <h3 style="font-size: 0.875rem; font-weight: 700; color: white; margin-bottom: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${movie.title}">
                        ${movie.title}
                    </h3>
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <span style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.5);">${movie.year || 'N/A'}</span>
                        <span style="padding: 0.125rem 0.5rem; background: rgba(251, 191, 36, 0.2); border: 1px solid rgba(251, 191, 36, 0.4); border-radius: 0.5rem; font-size: 0.625rem; font-weight: 700; color: #fbbf24;">
                            ⭐ ${movie.imdb || 'N/A'}
                        </span>
                    </div>
                    ${movie.vote_count ? `
                        <div style="font-size: 0.625rem; color: rgba(255, 255, 255, 0.4);">
                            ${(movie.vote_count / 1000).toFixed(1)}k votes
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    renderListView(movies) {
        return `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${movies.map((movie, index) => this.renderListCard(movie, index)).join('')}
            </div>
        `;
    }
    
    renderListCard(movie, index) {
        const { icon, color } = getPlatformStyle(movie.platform);
        const swipeHistory = store.get('swipeHistory');
        const userSwipe = swipeHistory.find(s => s.movie?.id === movie.id);
        
        const posterUrl = movie.poster_path || `https://placehold.co/160x240/${color.replace('#', '')}/ffffff?text=${encodeURIComponent(movie.title)}`;
        
        const isTopResult = index < 3 && (this.searchResults || this.sortBy === 'intelligent');
        const isNumberOne = index === 0 && isTopResult;
        
        return `
            <div class="card" style="padding: 0; overflow: hidden; cursor: pointer; border-radius: 1rem; background: rgba(255, 255, 255, 0.02); border: ${isTopResult ? '2px solid rgba(251, 191, 36, 0.5)' : '1px solid rgba(255, 255, 255, 0.05)'}; box-shadow: ${isTopResult ? '0 8px 32px rgba(251, 191, 36, 0.3)' : '0 4px 16px rgba(0, 0, 0, 0.3)'};" data-movie-id="${movie.id}">
                <div style="display: flex; gap: 1rem; padding: 1rem;">
                    ${isNumberOne ? `
                        <div style="width: 48px; height: 48px; flex-shrink: 0; border-radius: 50%; background: linear-gradient(135deg, #fbbf24, #f59e0b); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; color: black; box-shadow: 0 8px 24px rgba(251, 191, 36, 0.6); border: 3px solid rgba(255, 255, 255, 0.3); align-self: center;">
                            1
                        </div>
                    ` : ''}
                    
                    <div style="width: 80px; height: 120px; background: ${color}; flex-shrink: 0; position: relative; overflow: hidden; border-radius: 0.75rem; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);">
                        <img 
                            src="${posterUrl}" 
                            alt="${movie.title}"
                            style="width: 100%; height: 100%; object-fit: cover;"
                            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                        >
                        <div style="position: absolute; inset: 0; display: none; align-items: center; justify-content: center; font-size: 2rem; opacity: 0.3; background: linear-gradient(135deg, ${color}, ${color}dd);">
                            🎬
                        </div>
                        
                        ${isTopResult && !isNumberOne ? `
                            <div style="position: absolute; top: 0.25rem; left: 0.25rem; padding: 0.125rem 0.375rem; background: linear-gradient(135deg, #fbbf24, #f59e0b); border-radius: 0.25rem; font-size: 0.5rem; font-weight: 800; color: black; box-shadow: 0 2px 8px rgba(251, 191, 36, 0.5);">
                                TOP
                            </div>
                        ` : ''}
                        
                        ${userSwipe ? `
                            <div style="position: absolute; top: 0.25rem; right: 0.25rem; padding: 0.125rem 0.25rem; background: ${this.getSwipeBadgeColor(userSwipe.action)}; border-radius: 0.25rem; font-size: 0.5rem; font-weight: 700; color: white; text-transform: uppercase;">
                                ${userSwipe.action}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div style="flex: 1; padding: 0.5rem 0; min-width: 0;">
                        ${isTopResult && !isNumberOne ? `
                            <div style="display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.5rem; background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.2)); border: 1px solid rgba(251, 191, 36, 0.4); border-radius: 0.5rem; font-size: 0.625rem; font-weight: 800; color: #fbbf24; margin-bottom: 0.5rem;">
                                <span>👑</span>
                                TOP RESULT
                            </div>
                        ` : ''}
                        
                        <h3 style="font-size: 1rem; font-weight: 700; color: white; margin-bottom: 0.5rem;">
                            ${movie.title}
                        </h3>
                        <p style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.6); margin-bottom: 0.75rem;">
                            ${movie.year || 'N/A'} • ${movie.genre || 'Unknown Genre'}
                        </p>
                        <p style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.5); line-height: 1.5; margin-bottom: 0.75rem;" class="line-clamp-2">
                            ${movie.synopsis || 'No description available.'}
                        </p>
                        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                            <span style="padding: 0.25rem 0.75rem; background: rgba(251, 191, 36, 0.2); border: 1px solid rgba(251, 191, 36, 0.4); border-radius: 0.5rem; font-size: 0.75rem; font-weight: 700; color: #fbbf24;">
                                ⭐ ${movie.imdb || 'N/A'}
                            </span>
                            ${movie.vote_count ? `
                                <span style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.4);">
                                    ${(movie.vote_count / 1000).toFixed(1)}k votes
                                </span>
                            ` : ''}
                            <div style="display: flex; align-items: center; gap: 0.25rem;">
                                <span style="width: 20px; height: 20px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; font-size: 0.625rem; color: white; font-weight: 800;">${icon}</span>
                                <span style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.5);">${movie.platform}</span>
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
        console.log('[LibraryTab] Attaching listeners...');
        
        const searchInput = document.getElementById('library-search');
        if (searchInput) {
            let searchTimeout;
            
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                
                clearTimeout(searchTimeout);
                if (this.searchQuery.length >= 2) {
                    searchTimeout = setTimeout(() => {
                        this.searchTMDB(this.searchQuery);
                    }, 500);
                } else if (this.searchQuery.length === 0) {
                    this.searchResults = null;
                    this.render();
                }
            });
            
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && this.searchQuery.length >= 2) {
                    this.searchTMDB(this.searchQuery);
                }
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
        
        const clearFilters = document.getElementById('clear-filters');
        if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                this.searchQuery = '';
                this.searchResults = null;
                this.selectedGenre = 'all';
                this.selectedPlatform = 'all';
                this.sortBy = 'intelligent';
                this.render();
            });
        }
        
        const movieCards = this.container.querySelectorAll('[data-movie-id]');
        console.log('[LibraryTab] Found movie cards:', movieCards.length);
        
        movieCards.forEach((card, index) => {
            card.addEventListener('click', () => {
                console.log('[LibraryTab] Card clicked, index:', index);
                
                const movieId = card.dataset.movieId;
                console.log('[LibraryTab] Movie ID from card:', movieId, typeof movieId);
                
                const movies = this.searchResults || store.get('movies');
                console.log('[LibraryTab] Total movies available:', movies?.length);
                console.log('[LibraryTab] Using search results:', !!this.searchResults);
                
                // Convert both to strings for comparison (handles string vs number mismatch)
                const movie = movies.find(m => String(m.id) === String(movieId));
                console.log('[LibraryTab] Found movie:', movie?.title || 'NOT FOUND');
                
                if (movie) {
                    console.log('[LibraryTab] Calling movieModal.show()...');
                    try {
                        movieModal.show(movie);
                        console.log('[LibraryTab] Modal opened successfully');
                    } catch (error) {
                        console.error('[LibraryTab] Error opening modal:', error);
                    }
                } else {
                    console.error('[LibraryTab] Movie not found for ID:', movieId);
                    console.log('[LibraryTab] Available IDs (first 5):', movies.slice(0, 5).map(m => ({ id: m.id, title: m.title })));
                }
            });
        });
        
        console.log('[LibraryTab] All listeners attached');
    }
    
    destroy() {
        this.searchQuery = '';
        this.searchResults = null;
        this.selectedGenre = 'all';
        this.selectedPlatform = 'all';
    }
}
