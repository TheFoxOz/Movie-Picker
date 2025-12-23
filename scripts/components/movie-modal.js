/**
 * Movie Modal Component with Trigger Warnings
 * Shows detailed movie information with TRAILER and DDD warnings
 * ✅ FIXED: Fetches full movie details including trailer
 * ✅ UNIVERSAL TRIGGER WARNINGS: Conditional display based on user preferences
 */

import { tmdbService } from '../services/tmdb.js';
import { ENV } from '../config/env.js';
import { shouldShowAllWarnings, categorizeWarnings } from '../utils/trigger-warnings.js';

class MovieModal {
    constructor() {
        this.modal = null;
        this.currentMovie = null;
        this.trailerKey = null;
        this.attachGlobalListeners();
    }

    attachGlobalListeners() {
        // Listen for trigger warnings being loaded
        window.addEventListener('trigger-warnings-loaded', (e) => {
            if (this.currentMovie && e.detail.movieId === this.currentMovie.id) {
                console.log('[Modal] Trigger warnings loaded, updating display');
                this.updateWarningsSection(e.detail.warnings);
            }
        });
    }
    
    async show(movie) {
        console.log('[MovieModal] Showing movie:', movie.title);
        
        // ✅ FIX: Fetch FULL movie details including trailer, runtime, cast
        try {
            const fullDetails = await tmdbService.getMovieDetails(movie.id);
            
            if (fullDetails) {
                console.log('[MovieModal] ✅ Got full details');
                this.currentMovie = fullDetails;
                
                // ✅ Extract trailer key from videos
                if (fullDetails.trailer && fullDetails.trailer.key) {
                    this.trailerKey = fullDetails.trailer.key;
                    console.log('[MovieModal] ✅ Found trailer:', this.trailerKey);
                } else {
                    console.log('[MovieModal] No trailer available');
                    this.trailerKey = null;
                }
                
                // ✅ Fetch platform data if not already present
                if (!fullDetails.availableOn || fullDetails.availableOn.length === 0) {
                    fullDetails.availableOn = await tmdbService.getWatchProviders(movie.id);
                    fullDetails.platform = fullDetails.availableOn && fullDetails.availableOn.length > 0
                        ? fullDetails.availableOn[0]
                        : 'Not Available';
                }
            } else {
                console.warn('[MovieModal] Using basic movie data (no full details)');
                this.currentMovie = movie;
                this.trailerKey = null;
            }
        } catch (error) {
            console.error('[MovieModal] Failed to get details:', error);
            this.currentMovie = movie;
            this.trailerKey = null;
        }

        // Fetch trigger warnings if not loaded
        if (!this.currentMovie.warningsLoaded && !this.currentMovie.triggerWarnings) {
            if (tmdbService && tmdbService.fetchTriggerWarnings) {
                tmdbService.fetchTriggerWarnings(this.currentMovie);
            }
        }
        
        this.createModal();
        this.attachListeners();
        
        // Animate in
        setTimeout(() => {
            this.modal.style.opacity = '1';
            const content = this.modal.querySelector('.modal-content');
            if (content) {
                content.style.transform = 'translateY(0)';
            }
        }, 10);
    }
    
    hide() {
        if (!this.modal) return;
        
        // FIXED: Properly stop trailer by clearing src AND removing iframe
        const iframe = this.modal.querySelector('iframe');
        if (iframe) {
            // Stop video by clearing src
            iframe.src = '';
            // Remove iframe entirely to ensure no background audio
            setTimeout(() => {
                if (iframe && iframe.parentNode) {
                    iframe.remove();
                }
            }, 100);
        }
        
        // Animate out
        this.modal.style.opacity = '0';
        const content = this.modal.querySelector('.modal-content');
        if (content) {
            content.style.transform = 'translateY(20px)';
        }
        
        setTimeout(() => {
            if (this.modal && this.modal.parentNode) {
                this.modal.remove();
            }
            this.modal = null;
            this.currentMovie = null;
            this.trailerKey = null;
        }, 300);
    }

    renderTriggerWarnings(warnings) {
        if (!warnings || warnings.length === 0) {
            return `
                <div style="padding:1rem;background:rgba(255,255,255,0.05);border-radius:0.75rem;text-align:center;">
                    <p style="color:rgba(255,255,255,0.5);margin:0;font-size:0.875rem;">
                        ${this.currentMovie?.warningsLoaded ? 'No trigger warnings found' : 'Loading trigger warnings...'}
                    </p>
                </div>
            `;
        }

        // ✅ NEW: Check user preference for showing all warnings
        const showAllWarnings = shouldShowAllWarnings();
        
        if (showAllWarnings) {
            // ✅ Show full detailed warnings list
            return `
                <div style="display:flex;flex-direction:column;gap:0.75rem;">
                    ${warnings.map(warning => `
                        <div style="padding:1rem;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:0.75rem;">
                            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
                                <span style="color:#ef4444;font-size:1.25rem;">⚠️</span>
                                <strong style="color:#ef4444;font-size:0.9375rem;">${warning.name || warning.category || 'Warning'}</strong>
                            </div>
                            ${warning.description ? `
                                <p style="color:rgba(255,255,255,0.7);font-size:0.875rem;margin:0 0 0.5rem 0;line-height:1.5;">
                                    ${warning.description}
                                </p>
                            ` : ''}
                            ${warning.yesVotes ? `
                                <p style="color:rgba(255,255,255,0.4);font-size:0.75rem;margin:0;">
                                    ${warning.yesVotes} people confirmed this content
                                </p>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            // ✅ NEW: Show only category names (simplified view)
            const { categoryNames, categoryCount } = categorizeWarnings(warnings);
            
            if (categoryCount === 0) {
                return `
                    <div style="padding:1rem;background:rgba(255,255,255,0.05);border-radius:0.75rem;text-align:center;">
                        <p style="color:rgba(255,255,255,0.5);margin:0;font-size:0.875rem;">
                            No trigger warnings match your preferences
                        </p>
                    </div>
                `;
            }
            
            return `
                <div style="display:flex;flex-direction:column;gap:0.75rem;">
                    <div style="padding:1rem;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:0.75rem;">
                        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">
                            <span style="color:#ef4444;font-size:1.25rem;">⚠️</span>
                            <strong style="color:#ef4444;font-size:0.9375rem;">Content Warning Categories (${categoryCount})</strong>
                        </div>
                        <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
                            ${categoryNames.map(categoryName => `
                                <span style="
                                    padding: 0.5rem 0.75rem;
                                    background: rgba(239, 68, 68, 0.2);
                                    border: 1px solid rgba(239, 68, 68, 0.4);
                                    border-radius: 0.5rem;
                                    color: #ef4444;
                                    font-size: 0.875rem;
                                    font-weight: 600;
                                ">
                                    ${categoryName}
                                </span>
                            `).join('')}
                        </div>
                        <p style="color:rgba(255,255,255,0.5);font-size:0.75rem;margin:0.75rem 0 0 0;">
                            Enable "Show All Warnings" in your profile to see detailed descriptions
                        </p>
                    </div>
                </div>
            `;
        }
    }

    updateWarningsSection(warnings) {
        const warningsContainer = this.modal?.querySelector('#trigger-warnings-container');
        if (warningsContainer) {
            warningsContainer.innerHTML = this.renderTriggerWarnings(warnings);
        }
    }
    
    createModal() {
        // Remove existing modal if any
        const existing = document.getElementById('movie-modal');
        if (existing) {
            existing.remove();
        }
        
        this.modal = document.createElement('div');
        this.modal.id = 'movie-modal';
        this.modal.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.95);
            opacity: 0;
            transition: opacity 0.3s;
            overflow-y: auto;
            padding: 1rem;
        `;
        
        this.modal.innerHTML = this.getTemplate();
        document.body.appendChild(this.modal);
    }
    
    getTemplate() {
        const movie = this.currentMovie;
        
        // ✅ FIX: Construct full poster URL with multiple fallbacks
        const posterUrl = movie.posterURL || 
                         (movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null) ||
                         movie.backdropURL ||
                         (movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null) ||
                         'https://placehold.co/400x600/1a1a2e/ffffff?text=' + encodeURIComponent(movie.title || 'Movie');
        
        // ✅ FIX: Extract year from releaseDate with fallbacks
        const year = movie.releaseDate?.split('-')[0] || 
                     movie.release_date?.split('-')[0] || 
                     movie.year || 
                     'N/A';
        
        // ✅ FIX: Get first genre from genres array with fallback
        const genre = (Array.isArray(movie.genres) && movie.genres.length > 0)
            ? (typeof movie.genres[0] === 'string' ? movie.genres[0] : movie.genres[0]?.name)
            : 'Movie';
        
        // ✅ FIX: Format runtime
        const runtime = movie.runtime ? `${movie.runtime} min` : 'N/A';
        
        // ✅ FIX: Use overview not synopsis
        const description = movie.overview || movie.synopsis || 'No description available.';
        
        // ✅ FIX: Format cast properly
        const cast = movie.cast && Array.isArray(movie.cast)
            ? movie.cast.slice(0, 6).map(actor => {
                if (typeof actor === 'string') return actor;
                return actor.name || actor.character || 'Unknown';
            })
            : [];
        
        // Platform icon and color
        const platformStyles = {
            'Netflix': { icon: 'N', color: '#E50914' },
            'Hulu': { icon: 'H', color: '#1CE783' },
            'Prime Video': { icon: 'P', color: '#00A8E1' },
            'Disney+': { icon: 'D', color: '#113CCF' },
            'HBO Max': { icon: 'M', color: '#B200FF' },
            'Apple TV+': { icon: 'A', color: '#000000' },
            'Peacock': { icon: 'P', color: '#0057B8' },
            'Paramount+': { icon: 'P', color: '#0064FF' }
        };
        const platformStyle = platformStyles[movie.platform] || { icon: '▶', color: '#6366f1' };
        
        return `
            <div class="modal-content" style="
                background: linear-gradient(180deg, #1a1a2e 0%, #0a0a0f 100%);
                border-radius: 1.5rem;
                max-width: 600px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                transform: translateY(20px);
                transition: transform 0.3s;
            ">
                <!-- Close Button -->
                <button id="modal-close" style="
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    font-size: 1.5rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s;
                    z-index: 10;
                " onmouseover="this.style.background='rgba(255, 46, 99, 0.3)'; this.style.transform='scale(1.1)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'; this.style.transform='scale(1)'">
                    ✕
                </button>
                
                <!-- Header -->
                <div style="padding: 2rem 2rem 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                    <h2 style="font-size: 1.75rem; font-weight: 800; color: white; margin: 0 3rem 0 0; line-height: 1.3;">
                        ${movie.title}
                    </h2>
                </div>
                
                <!-- Trailer or Poster -->
                ${this.trailerKey ? `
                    <div style="position: relative; width: 100%; padding-top: 56.25%; background: #000; overflow: hidden;">
                        <iframe
                            id="trailer-iframe"
                            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
                            src="https://www.youtube.com/embed/${this.trailerKey}?autoplay=0&rel=0&modestbranding=1"
                            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen
                        ></iframe>
                    </div>
                    <div style="padding: 1rem 2rem; background: rgba(255, 46, 99, 0.1); border-bottom: 1px solid rgba(255, 46, 99, 0.2);">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" style="width: 20px; height: 20px; color: #ff2e63;">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                            <span style="font-size: 0.875rem; font-weight: 600; color: #ff2e63;">Official Trailer</span>
                        </div>
                    </div>
                ` : `
                    <div style="width: 100%; aspect-ratio: 16/9; background: #000; position: relative; overflow: hidden;">
                        <img 
                            src="${posterUrl}" 
                            alt="${movie.title}"
                            style="width: 100%; height: 100%; object-fit: cover;"
                            onerror="this.parentElement.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.5);\\'>No image available</div>'"
                        >
                        <div style="position: absolute; inset: 0; background: linear-gradient(0deg, rgba(0, 0, 0, 0.8), transparent 50%); display: flex; align-items: center; justify-content: center;">
                            <div style="text-align: center; color: rgba(255, 255, 255, 0.6);">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 64px; height: 64px; margin: 0 auto 0.5rem; opacity: 0.5;">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5" />
                                </svg>
                                <div style="font-size: 0.875rem;">No trailer available</div>
                            </div>
                        </div>
                    </div>
                `}
                
                <!-- Synopsis -->
                <div style="padding: 1.5rem 2rem;">
                    <p style="color: rgba(255, 255, 255, 0.85); line-height: 1.7; margin: 0; font-size: 0.9375rem;">
                        ${description}
                    </p>
                </div>
                
                <!-- Details Grid -->
                <div style="padding: 0 2rem 1.5rem; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem;">
                    <div>
                        <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 0.5rem;">
                            Platform
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="width: 28px; height: 28px; border-radius: 50%; background: ${platformStyle.color}; display: flex; align-items: center; justify-content: center; font-size: 0.875rem; color: white; font-weight: 800; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);">
                                ${platformStyle.icon}
                            </span>
                            <span style="color: white; font-weight: 600;">
                                ${movie.platform || 'Not Available'}
                            </span>
                        </div>
                    </div>
                    
                    <div>
                        <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 0.5rem;">
                            Year
                        </div>
                        <div style="color: white; font-weight: 600;">
                            ${year}
                        </div>
                    </div>
                    
                    <div>
                        <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 0.5rem;">
                            Genre
                        </div>
                        <div style="color: white; font-weight: 600;">
                            ${genre}
                        </div>
                    </div>
                    
                    <div>
                        <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 0.5rem;">
                            Runtime
                        </div>
                        <div style="color: white; font-weight: 600;">
                            ${runtime}
                        </div>
                    </div>
                </div>
                
                <!-- Cast -->
                ${cast.length > 0 ? `
                    <div style="padding: 0 2rem 2rem;">
                        <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 1rem;">
                            Cast
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                            ${cast.map(actor => `
                                <span style="padding: 0.5rem 1rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 0.75rem; color: rgba(255, 255, 255, 0.9); font-size: 0.875rem;">
                                    ${actor}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Trigger Warnings from DDD -->
                <div style="padding: 0 2rem 2rem;">
                    <h3 style="font-size: 1rem; font-weight: 700; color: white; margin: 0 0 1rem 0; display: flex; align-items: center; gap: 0.5rem;">
                        <span>⚠️</span>
                        Content Warnings
                    </h3>
                    <div id="trigger-warnings-container">
                        ${this.renderTriggerWarnings(movie.triggerWarnings)}
                    </div>
                </div>
            </div>
        `;
    }
    
    attachListeners() {
        // Close button
        const closeBtn = this.modal.querySelector('#modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
        
        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
        
        // Escape key to close
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.hide();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }
}

// Export singleton instance
export const movieModal = new MovieModal();
```

---

## **📋 Key Changes to `movie-modal.js`:**

1. ✅ **Line 8:** Added `import { shouldShowAllWarnings, categorizeWarnings } from '../utils/trigger-warnings.js';`

2. ✅ **Lines 125-216:** Completely rewrote `renderTriggerWarnings()` method:
   - **Checks user preference** with `shouldShowAllWarnings()`
   - **If enabled:** Shows full detailed warnings with descriptions and vote counts (original behavior)
   - **If disabled:** Shows only category names as badges with a message to enable full warnings

3. ✅ **New simplified view** displays:
   - Category count (e.g., "Content Warning Categories (3)")
   - Category badges (e.g., "Animal Harm", "Violence", "Death")
   - Helpful message: "Enable 'Show All Warnings' in your profile to see detailed descriptions"

---

## **🎯 How It Works:**

### **User Has "Show All Warnings" ENABLED:**
```
⚠️ Content Warnings

⚠️ Animal Harm
A dog is harmed or dies in this movie.
1,234 people confirmed this content

⚠️ Violence
Graphic violence is depicted.
567 people confirmed this content
```

### **User Has "Show All Warnings" DISABLED:**
```
⚠️ Content Warnings

⚠️ Content Warning Categories (3)

[Animal Harm] [Violence] [Death]

Enable "Show All Warnings" in your profile to see detailed descriptions
