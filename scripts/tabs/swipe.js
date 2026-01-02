/**
 * SwipeCard Component – ENHANCED WITH SWIPE DIRECTION FEEDBACK + TRIGGER WARNINGS
 * Shows clear visual indicators when swiping in any direction
 * Displays trigger warning badge from DoesTheDogDie.com
 * FIXED: Proper event dispatching for card advancing
 * ✅ FIX: Corrected confetti and notification imports
 * ✅ FIX: Changed getTMDBService to tmdbService
 * ✅ CRITICAL FIX: Proper poster URL construction with fallbacks
 * ✅ FIX: Added event listener for async trigger warnings
 * ✅ UNIVERSAL TRIGGER WARNINGS: Category-based badges with tooltips
 * ✅ NEW: Platform update method for background enrichment
 * ✅ FIX: Platform badge uses class for easy DOM targeting
 */

import { store } from '../state/store.js';
import { authService } from '../services/auth-service.js';
import { celebrate } from '../utils/confetti.js';
import { notify } from '../utils/notifications.js';
import { renderTriggerBadge } from '../utils/trigger-warnings.js';

export class SwipeCard {
    constructor(container, movie) {
        this.container = container;
        this.movie = movie;
        this.element = null;
        this.isDragging = false;
        this.startX = 0;
        this.currentX = 0;
        this.startY = 0;
        this.currentY = 0;
        this.actionInProgress = false;
        this.warningsListener = null;

        this.render();
        this.attachEvents();
        this.fetchTriggerWarnings();
        
        // ✅ Listen for trigger warnings loaded event
        this.setupWarningsListener();
    }

    setupWarningsListener() {
        this.warningsListener = (e) => {
            if (e.detail.movieId === this.movie.id) {
                console.log('[SwipeCard] Warnings loaded for current card, updating badge');
                this.movie.triggerWarnings = e.detail.warnings;
                this.movie.warningsLoaded = true;
                this.updateWarningBadge();
            }
        };
        document.addEventListener('trigger-warnings-loaded', this.warningsListener);
    }

    /**
     * ✅ ENHANCED: Deduplicate platform names (Netflix = Netflix Standard with Ads)
     * Shows only unique platforms, removing subscription tier duplicates
     */
    deduplicatePlatforms(platforms) {
        if (!platforms || platforms.length === 0) return [];
        
        // Mapping of similar platforms to base name
        const platformMap = {
            'netflix': 'Netflix',
            'netflix standard with ads': 'Netflix',
            'netflix basic with ads': 'Netflix',
            'amazon prime video': 'Prime Video',
            'prime video': 'Prime Video',
            'amazon video': 'Prime Video',
            'disney+': 'Disney+',
            'disney plus': 'Disney+',
            'hbo max': 'Max',
            'max': 'Max',
            'apple tv+': 'Apple TV+',
            'apple tv plus': 'Apple TV+',
            'paramount+': 'Paramount+',
            'paramount plus': 'Paramount+',
            'peacock': 'Peacock',
            'peacock premium': 'Peacock',
            'hulu': 'Hulu',
            'hulu (no ads)': 'Hulu',
        };
        
        const seen = new Set();
        const deduplicated = [];
        
        for (const platform of platforms) {
            const normalized = platform.toLowerCase().trim();
            const baseName = platformMap[normalized] || platform;
            
            if (!seen.has(baseName)) {
                seen.add(baseName);
                deduplicated.push(baseName);
            }
        }
        
        return deduplicated;
    }
    
    /**
     * ✅ UPDATED: Render deduplicated platforms as badges
     */
    renderAllPlatformBadges() {
        const availableOn = this.movie.availableOn || [];
        const platform = this.movie.platform;
        
        // Deduplicate platforms first
        const uniquePlatforms = this.deduplicatePlatforms(availableOn);
        
        // If we have multiple platforms, show them all
        if (uniquePlatforms.length > 0) {
            // Get user's selected platforms for highlighting
            const prefs = JSON.parse(localStorage.getItem(`userPreferences_${authService.getCurrentUser()?.uid}`) || '{}');
            const selectedPlatforms = prefs.platforms || [];
            
            const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
            const userNormalized = new Set(selectedPlatforms.map(normalize));
            
            return uniquePlatforms.map(platformName => {
                const isUserPlatform = userNormalized.has(normalize(platformName));
                return `
                    <div class="platform-badge" style="
                        padding: 0.5rem 0.875rem; 
                        background: ${isUserPlatform ? 'rgba(16, 185, 129, 0.9)' : 'rgba(0,0,0,0.7)'}; 
                        backdrop-filter: blur(10px); 
                        border-radius: 1rem; 
                        border: 1px solid ${isUserPlatform ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255,255,255,0.1)'};
                        transition: all 0.2s;
                    ">
                        <span style="color: white; font-weight: ${isUserPlatform ? '800' : '600'}; font-size: 0.75rem;">
                            ${isUserPlatform ? '✓ ' : ''}${platformName}
                        </span>
                    </div>
                `;
            }).join('');
        } else {
            // Single platform or loading state
            const displayPlatform = platform || 'Loading...';
            const isInCinemas = displayPlatform === 'In Cinemas';
            
            return `
                <div class="platform-badge" style="
                    padding: 0.5rem 1rem; 
                    background: ${isInCinemas ? 'rgba(217, 119, 6, 0.9)' : 'rgba(0,0,0,0.7)'}; 
                    backdrop-filter: blur(10px); 
                    border-radius: 1rem; 
                    border: 1px solid ${isInCinemas ? 'rgba(217, 119, 6, 0.5)' : 'rgba(255,255,255,0.1)'};
                ">
                    <span style="color: white; font-weight: 700; font-size: 0.875rem;">
                        ${isInCinemas ? '🎬 ' : ''}${displayPlatform}
                    </span>
                </div>
            `;
        }
    }

    /**
     * ✅ NEW: Update platform display after background enrichment
     */
    updatePlatform(platform, availableOn) {
        if (!this.movie) return;
        
        // Update movie object
        this.movie.platform = platform;
        this.movie.availableOn = availableOn || [];
        
        // Find and update the platform badges container in the DOM
        const badgesContainer = this.element?.querySelector('.platform-badges-container');
        if (badgesContainer) {
            badgesContainer.innerHTML = this.renderAllPlatformBadges();
            console.log(`[SwipeCard] ✅ Updated platform display: ${availableOn?.length || 0} platform(s)`);
        }
    }
    
    /**
     * Get the user's preferred platform from the available platforms
     * (Rental platforms already filtered by tmdb.js)
     */
    getPreferredPlatform(availableOn) {
        if (!availableOn || availableOn.length === 0) return null;
        
        // Get user's selected platforms from localStorage
        const prefs = JSON.parse(localStorage.getItem('moviEasePreferences') || '{}');
        const selectedPlatforms = prefs.platforms || [];
        
        // Normalize function (same as tmdb.js)
        const normalize = str => (str || '')
            .toLowerCase()
            .replace(/amazon\s*video/gi, 'primevideo')
            .replace(/amazon\s*prime\s*video/gi, 'primevideo')
            .replace(/prime\s*video/gi, 'primevideo')
            .replace(/\+/g, 'plus')
            .replace(/[^a-z0-9]/g, '')
            .trim();
        
        const userNormalized = new Set(selectedPlatforms.map(normalize));
        
        // Find first platform that matches user's preferences
        for (const platform of availableOn) {
            if (userNormalized.has(normalize(platform))) {
                return platform; // Return the matching platform
            }
        }
        
        // If no match, return first platform
        return availableOn.length > 0 ? availableOn[0] : null;
    }

    async fetchTriggerWarnings() {
        if (this.movie.warningsLoaded) return;

        try {
            const { tmdbService } = await import('../services/tmdb.js');
            
            if (tmdbService) {
                await tmdbService.fetchTriggerWarnings(this.movie);
                
                if (this.movie.triggerWarnings && this.movie.triggerWarnings.length > 0) {
                    this.updateWarningBadge();
                }
            }
        } catch (error) {
            console.error('[SwipeCard] Failed to fetch trigger warnings:', error);
        }
    }

    updateWarningBadge() {
        const posterDiv = this.element?.querySelector('div[style*="height: 520px"]');
        if (!posterDiv) {
            console.warn('[SwipeCard] Poster div not found for badge update');
            return;
        }

        // ✅ Remove old badge if exists
        let oldBadge = posterDiv.querySelector('.trigger-warning-badge');
        if (oldBadge) {
            oldBadge.remove();
        }

        // ✅ NEW: Use universal trigger warning badge system
        if (this.movie.triggerWarnings && this.movie.triggerWarnings.length > 0) {
            console.log(`[SwipeCard] Adding universal trigger warning badge: ${this.movie.triggerWarnings.length} warnings`);
            
            const badgeHTML = renderTriggerBadge(this.movie, { 
                size: 'medium', 
                position: 'top-left' 
            });
            
            if (badgeHTML) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = badgeHTML;
                const badge = tempDiv.firstElementChild;
                
                if (badge) {
                    posterDiv.appendChild(badge);
                    console.log('[SwipeCard] ✅ Universal trigger warning badge added to DOM');
                }
            }
        }
    }

    render() {
        // ✅ CRITICAL FIX: Construct full poster URL with multiple fallbacks
        const poster = this.movie.posterURL || 
                      (this.movie.poster_path ? `https://image.tmdb.org/t/p/w500${this.movie.poster_path}` : null) ||
                      this.movie.backdropURL ||
                      (this.movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${this.movie.backdrop_path}` : null) ||
                      'https://placehold.co/400x600/1a1a2e/ffffff?text=' + encodeURIComponent(this.movie.title || 'Movie');

        // ✅ FIX: Extract year from releaseDate with fallbacks
        const year = this.movie.releaseDate?.split('-')[0] || 
                    this.movie.release_date?.split('-')[0] || 
                    this.movie.year || 
                    'N/A';
        
        // ✅ FIX: Get first genre with fallback
        const genre = (Array.isArray(this.movie.genres) && this.movie.genres.length > 0)
            ? (typeof this.movie.genres[0] === 'string' ? this.movie.genres[0] : this.movie.genres[0]?.name)
            : 'Movie';
        
        // ✅ FIX: Use overview or synopsis
        const description = this.movie.overview || this.movie.synopsis || 'No description available.';
        
        // ✅ FIX: Show user's preferred platform that matched
        const platform = this.getPreferredPlatform(this.movie.availableOn) ||
                        (this.movie.availableOn && this.movie.availableOn.length > 0 ? this.movie.availableOn[0] : null) ||
                        (this.movie.platform || 'Loading...');

        this.element = document.createElement('div');
        this.element.className = 'swipe-card';
        this.element.innerHTML = `
            <div style="position: relative; width: 100%; max-width: 380px; border-radius: 1.5rem; box-shadow: 0 20px 60px rgba(0,0,0,0.6); background: #111; transform: rotate(0deg); transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1); user-select: none;">
                
                <!-- SWIPE DIRECTION OVERLAYS - ALL CENTERED ON POSTER -->
                
                <!-- PASS (Left) - Red X -->
                <div id="badge-pass" class="swipe-badge" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 1.5rem 2.5rem; background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95)); color: white; font-size: 3rem; font-weight: 800; border-radius: 1.5rem; opacity: 0; z-index: 10; box-shadow: 0 8px 32px rgba(239, 68, 68, 0.6); backdrop-filter: blur(10px); border: 3px solid rgba(255, 255, 255, 0.3); display: flex; flex-direction: column; align-items: center; gap: 0.5rem; pointer-events: none;">
                    <div style="font-size: 5rem; line-height: 1;">✕</div>
                    <div style="font-size: 2rem; font-weight: 800; letter-spacing: 0.15em;">NOPE</div>
                </div>
                
                <!-- MAYBE (Up) - Yellow Question -->
                <div id="badge-maybe" class="swipe-badge" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 1.5rem 2.5rem; background: linear-gradient(135deg, rgba(251, 191, 36, 0.95), rgba(245, 158, 11, 0.95)); color: white; font-size: 3rem; font-weight: 800; border-radius: 1.5rem; opacity: 0; z-index: 10; box-shadow: 0 8px 32px rgba(251, 191, 36, 0.6); backdrop-filter: blur(10px); border: 3px solid rgba(255, 255, 255, 0.3); display: flex; flex-direction: column; align-items: center; gap: 0.5rem; pointer-events: none;">
                    <div style="font-size: 5rem; line-height: 1;">❓</div>
                    <div style="font-size: 2rem; font-weight: 800; letter-spacing: 0.15em;">MAYBE</div>
                </div>
                
                <!-- LIKE (Right) - Green Thumbs Up -->
                <div id="badge-like" class="swipe-badge" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 1.5rem 2.5rem; background: linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95)); color: white; font-size: 3rem; font-weight: 800; border-radius: 1.5rem; opacity: 0; z-index: 10; box-shadow: 0 8px 32px rgba(16, 185, 129, 0.6); backdrop-filter: blur(10px); border: 3px solid rgba(255, 255, 255, 0.3); display: flex; flex-direction: column; align-items: center; gap: 0.5rem; pointer-events: none;">
                    <div style="font-size: 5rem; line-height: 1;">👍</div>
                    <div style="font-size: 2rem; font-weight: 800; letter-spacing: 0.15em;">LIKE</div>
                </div>
                
                <!-- LOVE (Down) - Pink Heart -->
                <div id="badge-love" class="swipe-badge" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 1.5rem 2.5rem; background: linear-gradient(135deg, rgba(255, 46, 99, 0.95), rgba(217, 0, 98, 0.95)); color: white; font-size: 3rem; font-weight: 800; border-radius: 1.5rem; opacity: 0; z-index: 10; box-shadow: 0 8px 32px rgba(255, 46, 99, 0.6); backdrop-filter: blur(10px); border: 3px solid rgba(255, 255, 255, 0.3); display: flex; flex-direction: column; align-items: center; gap: 0.5rem; pointer-events: none;">
                    <div style="font-size: 5rem; line-height: 1;">❤️</div>
                    <div style="font-size: 2rem; font-weight: 800; letter-spacing: 0.15em;">LOVE</div>
                </div>

                <!-- Poster (with overflow hidden for clean edges) -->
                <div style="position: relative; height: 520px; background: #000; border-radius: 1.5rem; overflow: hidden;">
                    <img src="${poster}" 
                         alt="${this.movie.title}" 
                         style="width: 100%; height: 100%; object-fit: cover;"
                         onerror="this.src='https://placehold.co/400x600/1a1a2e/ffffff?text=${encodeURIComponent(this.movie.title || 'Movie')}'">
                    
                    <!-- Gradient overlay -->
                    <div style="position: absolute; inset: 0; background: linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 40%);"></div>
                    
                    <!-- ✅ UPDATED: Platform badges showing ALL available platforms -->
                    <div class="platform-badges-container" style="
                        position: absolute; 
                        top: 1rem; 
                        right: 1rem; 
                        display: flex; 
                        flex-direction: column; 
                        gap: 0.5rem;
                        align-items: flex-end;
                    ">
                        ${this.renderAllPlatformBadges()}
                    </div>

                    <!-- ✅ Universal Trigger Warning Badge (will be added dynamically if warnings exist) -->
                </div>

                <!-- Movie Info -->
                <div style="padding: 1.5rem;">
                    <h2 style="font-size: 1.75rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0;">
                        ${this.movie.title}
                    </h2>
                    <p style="color: rgba(255,255,255,0.7); font-size: 1rem; margin: 0 0 1rem 0;">
                        ${year} • ${genre}
                    </p>
                    <p style="color: rgba(255,255,255,0.9); line-height: 1.6; margin: 0 0 1rem 0;">
                        ${description}
                    </p>
                    
                    <!-- ✅ NEW: Cast Section -->
                    ${this.renderCastSection()}
                </div>
            </div>
        `;

        this.container.appendChild(this.element);
        
        // ✅ Fetch cast data asynchronously
        this.fetchCastData();
        
        // ✅ If warnings already loaded, add badge immediately
        if (this.movie.triggerWarnings && this.movie.triggerWarnings.length > 0) {
            this.updateWarningBadge();
        }
    }
    
    /**
     * ✅ NEW: Render cast section (will be updated asynchronously)
     */
    renderCastSection() {
        const cast = this.movie.cast || [];
        
        if (cast.length === 0) {
            return `
                <div id="cast-section" style="
                    padding-top: 1rem;
                    border-top: 1px solid rgba(255,255,255,0.1);
                ">
                    <p style="
                        color: rgba(255,255,255,0.5);
                        font-size: 0.875rem;
                        margin: 0;
                    ">Loading cast...</p>
                </div>
            `;
        }
        
        const topCast = cast.slice(0, 5);
        const castNames = topCast.map(c => c.name).join(', ');
        
        return `
            <div id="cast-section" style="
                padding-top: 1rem;
                border-top: 1px solid rgba(255,255,255,0.1);
            ">
                <p style="
                    color: rgba(255,255,255,0.6);
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin: 0 0 0.5rem 0;
                ">Cast</p>
                <p style="
                    color: rgba(255,255,255,0.9);
                    font-size: 0.875rem;
                    line-height: 1.5;
                    margin: 0;
                ">${castNames}</p>
            </div>
        `;
    }
    
    /**
     * ✅ NEW: Fetch cast data from TMDB
     */
    async fetchCastData() {
        if (this.movie.cast && this.movie.cast.length > 0) {
            return; // Already have cast data
        }
        
        try {
            const response = await fetch(
                `https://api.themoviedb.org/3/movie/${this.movie.id}/credits?api_key=15d2ea6d0dc1d476efbca3eba2b9bbfb`
            );
            
            if (!response.ok) throw new Error('Failed to fetch cast');
            
            const data = await response.json();
            this.movie.cast = data.cast || [];
            
            // Update cast section in DOM
            const castSection = this.element?.querySelector('#cast-section');
            if (castSection && this.movie.cast.length > 0) {
                const topCast = this.movie.cast.slice(0, 5);
                const castNames = topCast.map(c => c.name).join(', ');
                
                castSection.innerHTML = `
                    <p style="
                        color: rgba(255,255,255,0.6);
                        font-size: 0.75rem;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        margin: 0 0 0.5rem 0;
                    ">Cast</p>
                    <p style="
                        color: rgba(255,255,255,0.9);
                        font-size: 0.875rem;
                        line-height: 1.5;
                        margin: 0;
                    ">${castNames}</p>
                `;
            }
        } catch (error) {
            console.warn('[SwipeCard] Failed to fetch cast:', error);
            // Remove loading message if fetch fails
            const castSection = this.element?.querySelector('#cast-section');
            if (castSection) {
                castSection.remove();
            }
        }
    }

    attachEvents() {
        const card = this.element;

        const onGrab = (e) => {
            this.isDragging = true;
            this.startX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
            this.startY = e.type.includes('mouse') ? e.pageY : e.touches[0].pageY;
            card.style.transition = 'none';
        };

        const onMove = (e) => {
            if (!this.isDragging) return;

            this.currentX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
            this.currentY = e.type.includes('mouse') ? e.pageY : e.touches[0].pageY;

            const diffX = this.currentX - this.startX;
            const diffY = this.currentY - this.startY;
            const absDiffX = Math.abs(diffX);
            const absDiffY = Math.abs(diffY);

            const rotate = diffX / 10;
            card.style.transform = `translateX(${diffX}px) translateY(${diffY}px) rotate(${rotate}deg)`;

            const passBadge = card.querySelector('#badge-pass');
            const maybeBadge = card.querySelector('#badge-maybe');
            const likeBadge = card.querySelector('#badge-like');
            const loveBadge = card.querySelector('#badge-love');

            passBadge.style.opacity = 0;
            maybeBadge.style.opacity = 0;
            likeBadge.style.opacity = 0;
            loveBadge.style.opacity = 0;

            if (absDiffX > absDiffY) {
                if (diffX < -80) {
                    passBadge.style.opacity = Math.min(absDiffX / 150, 1);
                    passBadge.style.transform = `translate(-50%, -50%) scale(${1 + absDiffX / 300})`;
                } else if (diffX > 80) {
                    likeBadge.style.opacity = Math.min(absDiffX / 150, 1);
                    likeBadge.style.transform = `translate(-50%, -50%) scale(${1 + absDiffX / 300})`;
                }
            } else {
                if (diffY < -80) {
                    maybeBadge.style.opacity = Math.min(absDiffY / 150, 1);
                    maybeBadge.style.transform = `translate(-50%, -50%) scale(${1 + absDiffY / 300})`;
                } else if (diffY > 80) {
                    loveBadge.style.opacity = Math.min(absDiffY / 150, 1);
                    loveBadge.style.transform = `translate(-50%, -50%) scale(${1 + absDiffY / 300})`;
                }
            }
        };

        const onRelease = () => {
            if (!this.isDragging) return;
            this.isDragging = false;

            const diffX = this.currentX - this.startX;
            const diffY = this.currentY - this.startY;
            const absDiffX = Math.abs(diffX);
            const absDiffY = Math.abs(diffY);

            card.style.transition = 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';

            const threshold = 120;

            if (absDiffX > absDiffY) {
                if (absDiffX > threshold) {
                    if (diffX < 0) {
                        this.swipeOff('pass');
                    } else {
                        this.swipeOff('like');
                    }
                    return;
                }
            } else {
                if (absDiffY > threshold) {
                    if (diffY < 0) {
                        this.swipeOff('maybe');
                    } else {
                        this.swipeOff('love');
                    }
                    return;
                }
            }

            card.style.transform = 'translateX(0) translateY(0) rotate(0deg)';
            
            const badges = card.querySelectorAll('.swipe-badge');
            badges.forEach(badge => {
                badge.style.opacity = 0;
                badge.style.transform = 'translate(-50%, -50%)';
            });
        };

        card.addEventListener('mousedown', onGrab);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onRelease);

        card.addEventListener('touchstart', onGrab, { passive: true });
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onRelease);

        this.cleanup = () => {
            card.removeEventListener('mousedown', onGrab);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onRelease);
            card.removeEventListener('touchstart', onGrab);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onRelease);
        };
    }

    handleAction(action) {
        this.swipeOff(action);
    }

    swipeOff(action) {
        if (this.actionInProgress) {
            console.log('[SwipeCard] Action already in progress, ignoring');
            return;
        }
        this.actionInProgress = true;

        console.log(`[SwipeCard] Swiping off: ${action} for movie: ${this.movie.title}`);
        
        const card = this.element;
        
        let translateX = 0;
        let translateY = 0;
        let rotate = 0;

        switch(action) {
            case 'pass':
                translateX = -500;
                rotate = -25;
                break;
            case 'maybe':
                translateY = -500;
                rotate = 0;
                break;
            case 'like':
                translateX = 400;
                rotate = 20;
                break;
            case 'love':
                translateX = 600;
                rotate = 30;
                break;
        }

        card.style.transform = `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotate}deg)`;
        card.style.opacity = '0';

        const swipeData = {
            movie: this.movie,
            action,
            timestamp: Date.now()
        };

        const history = [...(store.getState().swipeHistory || []), swipeData];
        store.setState({ swipeHistory: history });

        if (authService.isAuthenticated()) {
            authService.syncSwipeHistory(history);
        }

        const rect = card.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        if (action === 'love') {
            celebrate.love(centerX, centerY);
            this.showSwipeToast(this.movie.title, 'love');
        } else if (action === 'like') {
            celebrate.custom(centerX, centerY, {
                particleCount: 50,
                colors: ['#10b981', '#059669', '#34d399']
            });
            this.showSwipeToast(this.movie.title, 'like');
        } else if (action === 'pass') {
            this.showSwipeToast(this.movie.title, 'pass');
        } else if (action === 'maybe') {
            this.showSwipeToast(this.movie.title, 'maybe');
        }

        setTimeout(() => {
            console.log('[SwipeCard] Animation complete, dispatching swipe-action event');
            
            const event = new CustomEvent('swipe-action', {
                bubbles: true,
                detail: { 
                    action: action,
                    movieId: this.movie.id,
                    movieTitle: this.movie.title
                }
            });
            
            document.dispatchEvent(event);
            console.log('[SwipeCard] Event dispatched successfully');
            
            if (card && card.parentNode) {
                card.remove();
                console.log('[SwipeCard] Card removed from DOM');
            }
            
            this.actionInProgress = false;
        }, 400);
    }

    showSwipeToast(movieTitle, action) {
        const messages = {
            love: `❤️ Loved "${movieTitle}"!`,
            like: `👍 Liked "${movieTitle}"`,
            maybe: `❓ Maybe watch "${movieTitle}"`,
            pass: `✕ Passed on "${movieTitle}"`
        };

        const types = {
            love: 'success',
            like: 'success',
            maybe: 'warning',
            pass: 'error'
        };

        const message = messages[action] || `Swiped on "${movieTitle}"`;
        const type = types[action] || 'info';

        notify[type](message, 3000);
    }

    destroy() {
        if (this.cleanup) this.cleanup();
        
        // ✅ Remove trigger warnings event listener
        if (this.warningsListener) {
            document.removeEventListener('trigger-warnings-loaded', this.warningsListener);
            this.warningsListener = null;
        }
        
        if (this.element && this.element.parentNode) {
            this.element.remove();
        }
    }
}
