/**
 * Watched Button Component
 * Reusable button to mark movies as watched/unwatched
 */

import { authService } from '../services/auth-service.js';

/**
 * Render watched button HTML
 * @param {Object} movie - Movie object
 * @param {Object} options - Button options (size, position)
 * @returns {string} HTML string for the button
 */
export function renderWatchedButton(movie, options = {}) {
    const { size = 'medium', position = 'top-right' } = options;
    
    if (!movie || !movie.id) return '';
    
    const isWatched = authService.isMovieWatched(movie.id);
    
    const sizeStyles = {
        small: 'width: 28px; height: 28px; font-size: 0.75rem;',
        medium: 'width: 36px; height: 36px; font-size: 0.875rem;',
        large: 'width: 44px; height: 44px; font-size: 1rem;'
    };
    
    const positionStyles = {
        'top-left': 'top: 0.5rem; left: 0.5rem;',
        'top-right': 'top: 0.5rem; right: 0.5rem;',
        'bottom-left': 'bottom: 0.5rem; left: 0.5rem;',
        'bottom-right': 'bottom: 0.5rem; right: 0.5rem;'
    };
    
    const bgColor = isWatched 
        ? 'rgba(16, 185, 129, 0.95)' // Green when watched
        : 'rgba(26, 31, 46, 0.8)';   // Dark when not watched
    
    const icon = isWatched ? '👁️✓' : '👁️';
    const title = isWatched ? 'Mark as unwatched' : 'Mark as watched';
    
    return `
        <button 
            class="watched-btn"
            data-movie-id="${movie.id}"
            onclick="window.toggleWatched(${movie.id}, event)"
            style="
                position: absolute;
                ${positionStyles[position]}
                ${sizeStyles[size]}
                background: ${bgColor};
                border: 2px solid ${isWatched ? '#10b981' : 'rgba(176, 212, 227, 0.3)'};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s;
                z-index: 10;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            "
            onmouseover="this.style.transform='scale(1.15)'; this.style.background='${isWatched ? 'rgba(16, 185, 129, 1)' : 'rgba(26, 31, 46, 0.95)'}'"
            onmouseout="this.style.transform='scale(1)'; this.style.background='${bgColor}'"
            title="${title}"
        >
            <span style="
                display: flex;
                align-items: center;
                justify-content: center;
            ">${icon}</span>
        </button>
    `;
}

/**
 * Initialize watched button handlers
 * Call this after rendering watched buttons
 */
export function initWatchedButtons() {
    // Global function for toggling watched status
    window.toggleWatched = async (movieId, event) => {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        
        console.log('[WatchedButton] Toggling watched status for movie:', movieId);
        
        try {
            const isWatched = authService.isMovieWatched(movieId);
            
            if (isWatched) {
                await authService.markAsUnwatched(movieId);
                console.log('[WatchedButton] ✅ Marked as unwatched:', movieId);
            } else {
                // Need movie data to mark as watched
                const button = event?.target?.closest('.watched-btn');
                const movieCard = button?.closest('[data-movie-id]');
                
                if (!movieCard) {
                    console.error('[WatchedButton] ❌ Could not find movie card');
                    return;
                }
                
                // Get movie data from card or global state
                const movie = window.currentMovieData?.[movieId];
                
                if (!movie) {
                    console.error('[WatchedButton] ❌ Movie data not found for ID:', movieId);
                    return;
                }
                
                await authService.markAsWatched(movie);
                console.log('[WatchedButton] ✅ Marked as watched:', movieId);
            }
            
            // Update button appearance
            updateWatchedButtonUI(movieId, !isWatched);
            
            // Dispatch event for other components to react
            window.dispatchEvent(new CustomEvent('watchedStatusChanged', { 
                detail: { movieId, isWatched: !isWatched }
            }));
            
        } catch (error) {
            console.error('[WatchedButton] ❌ Error toggling watched status:', error);
        }
    };
    
    console.log('[WatchedButton] ✅ Watched button handlers initialized');
}

/**
 * Update watched button UI without full re-render
 */
function updateWatchedButtonUI(movieId, isWatched) {
    const buttons = document.querySelectorAll(`.watched-btn[data-movie-id="${movieId}"]`);
    
    buttons.forEach(button => {
        const bgColor = isWatched 
            ? 'rgba(16, 185, 129, 0.95)'
            : 'rgba(26, 31, 46, 0.8)';
        
        const borderColor = isWatched ? '#10b981' : 'rgba(176, 212, 227, 0.3)';
        const icon = isWatched ? '👁️✓' : '👁️';
        const title = isWatched ? 'Mark as unwatched' : 'Mark as watched';
        
        button.style.background = bgColor;
        button.style.borderColor = borderColor;
        button.title = title;
        button.querySelector('span').textContent = icon;
    });
}

/**
 * Store movie data globally for watched button access
 */
export function storeMovieData(movies) {
    if (!window.currentMovieData) {
        window.currentMovieData = {};
    }
    
    movies.forEach(movie => {
        if (movie && movie.id) {
            window.currentMovieData[movie.id] = movie;
        }
    });
}
