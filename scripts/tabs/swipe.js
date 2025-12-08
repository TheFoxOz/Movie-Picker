/**
 * Swipe Tab Component – COMPLETE FIXED VERSION
 * ✅ Fix #3: Always renders HTML structure, never blank
 * ✅ Removed hasLoaded flag that caused issues
 * ✅ Proper movie loading and card management
 */

import { store } from "../state/store.js";
import { SwipeCard } from "../components/swipe-card.js";
import { getTMDBService } from "../services/tmdb.js";
import { showToast } from "../utils/notifications.js";
import { showConfetti } from "../utils/confetti.js";

export class SwipeTab {
    constructor() {
        this.container = null;
        this.currentCard = null;
        this.movieQueue = [];
        this.isLoading = false;
        this.swipeHandler = null;
    }

    async render(container) {
        console.log('[SwipeTab] Rendering...');
        this.container = container;

        // ✅ FIX #3: ALWAYS render HTML structure (no early return, no hasLoaded check)
        container.innerHTML = `
            <div style="position: relative; width: 100%; height: calc(100vh - 5rem); display: flex; flex-direction: column; padding-bottom: 7rem;">
                
                <!-- Header -->
                <div style="padding: 1.5rem 1rem; text-align: center;">
                    <h1 style="font-size: 1.5rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0;">
                        Discover Movies
                    </h1>
                    <p style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.6); margin: 0;">
                        Swipe to find your next favorite film
                    </p>
                </div>
                
                <!-- Card Container -->
                <div id="swipe-container" style="flex: 1; position: relative; display: flex; align-items: center; justify-content: center; padding: 0 1rem;">
                    <div style="color: rgba(255,255,255,0.6); text-align: center;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">🎬</div>
                        <p>Loading your movies...</p>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div style="position: fixed; bottom: 7rem; left: 0; right: 0; z-index: 90; padding: 0 1.5rem; pointer-events: none;">
                    <div style="max-width: 420px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 1rem; pointer-events: auto;">
                        <button id="swipe-pass" class="swipe-action-btn pass-btn" title="Pass">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" style="width:28px;height:28px;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        
                        <button id="swipe-maybe" class="swipe-action-btn maybe-btn" title="Maybe Later">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:26px;height:26px;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                            </svg>
                        </button>
                        
                        <button id="swipe-like" class="swipe-action-btn like-btn" title="Like">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:28px;height:28px;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" />
                            </svg>
                        </button>
                        
                        <button id="swipe-love" class="swipe-action-btn love-btn" title="Love">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" style="width:30px;height:30px;">
                                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Completed State -->
                <div id="swipe-completed" style="display: none; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; padding: 2rem; text-align: center; background: rgba(10, 10, 15, 0.95); z-index: 10;">
                    <div style="font-size: 5rem; margin-bottom: 1.5rem;">🎉</div>
                    <h2 style="font-size: 2rem; font-weight: 800; color: white; margin: 0 0 1rem 0;">
                        You Did It!
                    </h2>
                    <p style="font-size: 1.125rem; color: rgba(255, 255, 255, 0.8); margin: 0 0 2rem 0; max-width: 400px;">
                        You've swiped through all available movies. Check your Library to see your picks!
                    </p>
                    <button id="goto-library" style="padding: 1rem 2rem; background: linear-gradient(135deg, #ff2e63, #d90062); border: none; border-radius: 1rem; color: white; font-size: 1rem; font-weight: 700; cursor: pointer; transition: transform 0.2s;">
                        View My Library
                    </button>
                </div>
            </div>
        `;

        console.log('[SwipeTab] HTML structure rendered');
        this.injectButtonStyles();
        
        // Load movies separately (always runs, no hasLoaded check)
        if (this.movieQueue.length === 0) {
            console.log('[SwipeTab] Movie queue empty, loading movies...');
            await this.loadMoviesWithRetry();
        } else {
            console.log('[SwipeTab] Using existing movie queue:', this.movieQueue.length, 'movies');
        }
        
        this.attachListeners();
        this.showNextCard();
        console.log('[SwipeTab] ✅ Render complete');
    }

    injectButtonStyles() {
        if (document.getElementById("swipe-btn-style")) return;

        const style = document.createElement("style");
        style.id = "swipe-btn-style";
        style.textContent = `
            .swipe-action-btn {
                width: 64px;
                height: 64px;
                border-radius: 50%;
                border: none;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
                backdrop-filter: blur(12px);
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            }
            
            .pass-btn {
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2));
                border: 3px solid rgba(239, 68, 68, 0.6);
                color: #ef4444;
            }
            
            .maybe-btn {
                background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.2));
                border: 3px solid rgba(251, 191, 36, 0.6);
                color: #fbbf24;
            }
            
            .like-btn {
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2));
                border: 3px solid rgba(16, 185, 129, 0.6);
                color: #10b981;
            }
            
            .love-btn {
                background: linear-gradient(135deg, rgba(255, 46, 99, 0.3), rgba(217, 0, 98, 0.3));
                border: 3px solid rgba(255, 46, 99, 0.6);
                color: #ff2e63;
            }

            .swipe-action-btn:hover {
                transform: scale(1.15);
                box-shadow: 0 12px 32px rgba(0,0,0,0.6);
            }
            
            .pass-btn:hover {
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.3));
                border-color: rgba(239, 68, 68, 0.8);
                box-shadow: 0 12px 32px rgba(239, 68, 68, 0.4);
            }
            
            .maybe-btn:hover {
                background: linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(245, 158, 11, 0.3));
                border-color: rgba(251, 191, 36, 0.8);
                box-shadow: 0 12px 32px rgba(251, 191, 36, 0.4);
            }
            
            .like-btn:hover {
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(5, 150, 105, 0.3));
                border-color: rgba(16, 185, 129, 0.8);
                box-shadow: 0 12px 32px rgba(16, 185, 129, 0.4);
            }
            
            .love-btn:hover {
                background: linear-gradient(135deg, rgba(255, 46, 99, 0.4), rgba(217, 0, 98, 0.4));
                border-color: rgba(255, 46, 99, 0.8);
                box-shadow: 0 12px 32px rgba(255, 46, 99, 0.5);
            }
            
            .swipe-action-btn:active {
                transform: scale(0.95);
            }
        `;
        document.head.appendChild(style);
    }

    async loadMoviesWithRetry(attempt = 1) {
        if (this.isLoading) {
            console.log('[SwipeTab] Already loading movies, skipping...');
            return;
        }
        
        this.isLoading = true;

        try {
            console.log(`[SwipeTab] Loading movies (attempt ${attempt})...`);
            
            // Safe TMDB service retrieval
            let tmdb;
            try {
                tmdb = getTMDBService();
            } catch (error) {
                console.error("[SwipeTab] Failed to get TMDB service:", error);
                throw new Error("TMDB service unavailable");
            }
            
            if (!tmdb) {
                throw new Error("TMDB service not initialized");
            }

            // Fetch movies with error handling
            const lists = await Promise.all([
                tmdb.fetchPopularMovies(5).catch(err => {
                    console.warn("[SwipeTab] Popular movies failed:", err.message);
                    return [];
                }),
                tmdb.fetchTrendingMovies().catch(err => {
                    console.warn("[SwipeTab] Trending movies failed:", err.message);
                    return [];
                }),
                tmdb.fetchTopRatedMovies(5).catch(err => {
                    console.warn("[SwipeTab] Top rated movies failed:", err.message);
                    return [];
                })
            ]);

            // Deduplicate movies
            const map = new Map();
            lists.flat().forEach(m => map.set(m.id, m));

            const movies = Array.from(map.values());
            console.log(`[SwipeTab] Loaded ${movies.length} unique movies`);

            // Filter out already swiped movies
            const state = store.getState();
            const swiped = new Set((state.swipeHistory || []).map(s => String(s.movie.id)));

            this.movieQueue = movies.filter(m => !swiped.has(String(m.id)));
            console.log(`[SwipeTab] ${this.movieQueue.length} movies after filtering swiped`);

            // Retry if not enough movies
            if (this.movieQueue.length < 10 && attempt <= 3) {
                console.log(`[SwipeTab] Need more movies, retrying (${this.movieQueue.length} < 10)...`);
                this.isLoading = false;
                setTimeout(() => this.loadMoviesWithRetry(attempt + 1), 1000);
                return;
            }
            
            console.log(`[SwipeTab] ✅ Movie queue ready with ${this.movieQueue.length} movies`);

        } catch (err) {
            console.error("[SwipeTab] Load failed:", err);
            
            if (attempt <= 3) {
                showToast(`Loading movies... (attempt ${attempt}/3)`, "info");
                this.isLoading = false;
                setTimeout(() => this.loadMoviesWithRetry(attempt + 1), 1500);
            } else {
                showToast("Failed to load movies. Please refresh the page.", "error");
                
                // Show error state in UI
                const container = this.container?.querySelector("#swipe-container");
                if (container) {
                    container.innerHTML = `
                        <div style="color: rgba(255,255,255,0.8); text-align: center; padding: 2rem;">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                            <h3 style="color: white; margin-bottom: 1rem;">Unable to Load Movies</h3>
                            <p style="color: rgba(255,255,255,0.6); margin-bottom: 1.5rem;">
                                ${err.message || 'Unknown error'}
                            </p>
                            <button onclick="location.reload()" style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #ff2e63, #d90062); border: none; border-radius: 0.75rem; color: white; font-weight: 700; cursor: pointer;">
                                Reload App
                            </button>
                        </div>
                    `;
                }
            }
        } finally {
            this.isLoading = false;
        }
    }

    showNextCard() {
        const container = this.container?.querySelector("#swipe-container");
        const completed = this.container?.querySelector("#swipe-completed");

        if (!container) {
            console.warn('[SwipeTab] Container not found');
            return;
        }

        // Check if all movies are swiped
        if (this.movieQueue.length === 0) {
            console.log('[SwipeTab] No more movies - showing completed state');
            container.innerHTML = "";
            if (completed) {
                completed.style.display = "flex";
            }
            showConfetti();
            return;
        }

        // Hide completed state
        if (completed) {
            completed.style.display = "none";
        }

        // Show next movie
        const movie = this.movieQueue.shift();
        console.log('[SwipeTab] Showing movie:', movie.title);
        
        container.innerHTML = "";
        this.currentCard = new SwipeCard(container, movie);
    }

    attachListeners() {
        const ACTION_MAP = {
            "swipe-pass": "pass",
            "swipe-maybe": "maybe",
            "swipe-like": "like",
            "swipe-love": "love"
        };

        // Attach button listeners
        Object.entries(ACTION_MAP).forEach(([id, action]) => {
            const btn = this.container?.querySelector(`#${id}`);
            if (btn) {
                btn.addEventListener("click", () => this.handleButtonAction(action));
            }
        });

        // Listen for swipe-action events (dispatched by SwipeCard)
        this.swipeHandler = () => {
            console.log('[SwipeTab] Swipe action detected, showing next card after delay');
            setTimeout(() => this.showNextCard(), 400);
        };
        document.addEventListener("swipe-action", this.swipeHandler);

        // Go to library button
        const gotoLibrary = this.container?.querySelector("#goto-library");
        if (gotoLibrary) {
            gotoLibrary.addEventListener("click", () => {
                console.log('[SwipeTab] Navigating to library');
                document.dispatchEvent(new CustomEvent("navigate-tab", { 
                    detail: { tab: "library" } 
                }));
            });
        }
    }

    handleButtonAction(action) {
        console.log('[SwipeTab] Button action:', action);
        if (this.currentCard) {
            this.currentCard.handleAction(action);
        }
    }

    destroy() {
        console.log('[SwipeTab] Destroying...');
        
        // Clean up current card
        if (this.currentCard) {
            this.currentCard.destroy();
            this.currentCard = null;
        }
        
        // Remove event listeners
        if (this.swipeHandler) {
            document.removeEventListener("swipe-action", this.swipeHandler);
            this.swipeHandler = null;
        }
        
        // ✅ FIX #3: DON'T reset state - keep movieQueue so it doesn't reload
        // Movies will be reused when user comes back to this tab
        
        console.log('[SwipeTab] Destroyed');
    }
}
