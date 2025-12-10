/**
 * SwipeTab component
 * Handles displaying movie cards and the swipe interaction logic.
 *
 * FIXES INCLUDED:
 * 1. CRITICAL BUILD FIX (Path): Corrected import to '../services/tmdb.js'.
 * 2. CRITICAL BUILD FIX (Export): Using the confirmed named export 'tmdbService' 
 * and aliasing it to 'movieService'.
 * 3. Runtime Fix: Added data validation (.filter()) inside loadMoviesWithRetry.
 */

import { store } from '../state/store.js';
// ---------------------------------------------------------------------
// CRITICAL BUILD FIX: Using the correct, confirmed export name: tmdbService
// ---------------------------------------------------------------------
import { tmdbService as movieService } from '../services/tmdb.js'; 
// ---------------------------------------------------------------------
import { authService } from '../services/auth-service.js';
import { notify } from '../utils/notifications.js';

class SwipeTab {
    constructor() {
        this.container = null;
        this.movieQueue = [];
        this.currentCardIndex = 0;
        this.isLoading = false;
        this.currentPage = 1;
        this.totalPages = 1;
        this.pageSize = 20; // Number of movies to fetch per page
        this.loadAttempt = 0;
        this.maxLoadAttempts = 4; // Maximum retries
        this.isComplete = false;
        this.currentSubscription = null;
    }

    // --- Life Cycle Methods ---

    async render(parentContainer) {
        console.log('[SwipeTab] Rendering...');
        this.container = parentContainer;
        this.container.innerHTML = this.getHTML();
        
        this.setupEventListeners();
        
        // Ensure state is synced and queue is loaded
        if (this.movieQueue.length === 0 && !this.isComplete) {
            console.log('[SwipeTab] Movie queue empty, loading movies...');
            await this.loadInitialQueue();
        } else if (this.isComplete) {
            this.showCompletedState();
        } else {
            this.updateCurrentCard();
        }

        console.log('[SwipeTab] ✅ Render complete');
    }

    getHTML() {
        // Main structure for the swipe tab
        return `
            <style>
                #swipe-area {
                    position: relative;
                    width: 100%;
                    max-width: 400px;
                    height: 500px;
                    margin: 20px auto;
                    touch-action: none;
                }
                .movie-card {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border-radius: 12px;
                    background-color: #1a1a2e;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                    overflow: hidden;
                    transform: scale(1);
                    transition: transform 0.3s ease-out, box-shadow 0.3s ease-out;
                    backface-visibility: hidden;
                }
                .card-hidden {
                    display: none !important;
                }
                .card-content {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-end;
                    background-size: cover;
                    background-position: center;
                    color: white;
                    padding: 20px;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
                }
                .card-info {
                    z-index: 10;
                }
                .card-title {
                    font-size: 1.8rem;
                    margin-bottom: 5px;
                }
                .card-subtitle {
                    font-size: 1rem;
                    opacity: 0.8;
                }
                .swipe-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                    transition: opacity 0.2s ease-in-out;
                    z-index: 15;
                    pointer-events: none;
                }
                .like-overlay {
                    border: 5px solid #00ff80;
                    color: #00ff80;
                    transform: rotate(-20deg);
                }
                .dislike-overlay {
                    border: 5px solid #ff2e63;
                    color: #ff2e63;
                    transform: rotate(20deg);
                }
                .overlay-text {
                    font-size: 3rem;
                    font-weight: bold;
                    padding: 10px;
                    border-radius: 5px;
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                }
                #controls {
                    display: flex;
                    justify-content: center;
                    gap: 30px;
                    margin-top: 50px;
                }
                .control-button {
                    background: #ff2e63;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 60px;
                    height: 60px;
                    font-size: 1.5rem;
                    cursor: pointer;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
                    transition: background 0.3s, transform 0.1s;
                }
                .control-button:hover {
                    transform: scale(1.05);
                }
                .control-button:active {
                    transform: scale(0.95);
                }
                #dislike-btn { background: #555; }
                #like-btn { background: #00ff80; }

                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }

                .loading-container, .complete-container {
                    text-align: center;
                    padding: 50px 20px;
                    color: white;
                }
                .loading-spinner {
                    border: 4px solid rgba(255, 255, 255, 0.1);
                    border-top-color: #ff2e63;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin: 20px auto;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
            
            <div id="swipe-area">
                <div class="loading-container" id="swipe-loading">
                    <div class="loading-spinner"></div>
                    <p>Fetching amazing movies...</p>
                </div>
            </div>
            
            <div id="controls">
                <button id="dislike-btn" class="control-button" data-action="dislike">👎</button>
                <button id="like-btn" class="control-button" data-action="like">👍</button>
            </div>
        `;
    }
    
    // --- Data Management ---

    async loadInitialQueue() {
        this.currentCardIndex = 0;
        this.movieQueue = [];
        this.currentPage = 1;
        this.isComplete = false;
        this.loadAttempt = 0;

        await this.loadMoviesWithRetry();
        this.updateCurrentCard();
    }

    async loadMoviesWithRetry() {
        if (this.isLoading || this.isComplete) {
            console.log('[SwipeTab] Already loading movies, skipping...');
            return;
        }

        this.isLoading = true;
        this.loadAttempt++;
        console.log(`[SwipeTab] Loading movies (attempt ${this.loadAttempt})...`);

        try {
            const { movies, totalPages } = await movieService.discoverMovies({ page: this.currentPage }); // Updated to use discoverMovies to be consistent with service structure
            this.totalPages = totalPages;

            // --- CRITICAL DATA VALIDATION FIX: Filter out any invalid/null entries ---
            const cleanMovies = movies.filter(movie => movie && movie.id);

            if (cleanMovies.length > 0) {
                console.log(`[SwipeTab] Loaded ${cleanMovies.length} unique movies`);
                
                // Map the cleaned array of movies into the card structure
                const newCards = cleanMovies.map(movie => ({
                    id: movie.id, 
                    title: movie.title || movie.name,
                    posterURL: movie.posterURL,
                    releaseYear: movie.year, // Updated property name to 'year' from 'releaseYear'
                    overview: movie.overview,
                    movie: movie // Full movie data
                }));

                this.movieQueue.push(...newCards);
                this.currentPage++;
                this.loadAttempt = 0; // Reset attempts on success
            } else if (this.currentPage >= this.totalPages) {
                this.isComplete = true;
            }

            this.updateLoadingState(false);

        } catch (error) {
            console.error(`[SwipeTab] Load failed:`, error);
            if (this.loadAttempt < this.maxLoadAttempts) {
                // The outer loop or user interaction might trigger another attempt
            } else {
                this.isComplete = true;
            }
            this.updateLoadingState(false);
        } finally {
            this.isLoading = false;
            if (this.isComplete && this.movieQueue.length === 0) {
                this.showCompletedState();
            }
        }
    }

    // --- UI Methods ---

    updateLoadingState(loading) {
        const loadingEl = this.container.querySelector('#swipe-loading');
        if (loadingEl) {
            loadingEl.style.display = loading ? 'block' : 'none';
        }
    }

    showCompletedState() {
        console.log('[SwipeTab] No more movies - showing completed state');
        const swipeArea = this.container.querySelector('#swipe-area');
        if (swipeArea) {
            swipeArea.innerHTML = `
                <div class="complete-container">
                    <h2 style="color: #ff2e63;">🎉 All Caught Up!</h2>
                    <p>You've seen all the movies we could find based on your preferences.</p>
                    <p>Try adjusting your filters in the <a href="#" data-tab="profile" style="color: #00ff80;">Profile Tab</a> to discover more!</p>
                </div>
            `;
        }
        this.isComplete = true;
    }

    updateCurrentCard() {
        if (!this.container) return;

        const swipeArea = this.container.querySelector('#swipe-area');
        if (!swipeArea) return;

        // Clear existing cards
        swipeArea.innerHTML = '';

        if (this.isComplete) {
            this.showCompletedState();
            return;
        }

        if (this.movieQueue.length === 0) {
            this.updateLoadingState(true);
            return;
        }

        // Render cards: The top one and the one immediately behind it
        for (let i = 0; i < Math.min(2, this.movieQueue.length - this.currentCardIndex); i++) {
            const cardData = this.movieQueue[this.currentCardIndex + i];
            const isTopCard = (i === 0);
            
            const cardEl = document.createElement('div');
            cardEl.className = 'movie-card';
            cardEl.dataset.id = cardData.id;
            cardEl.style.zIndex = 10 - i;
            if (!isTopCard) {
                cardEl.style.transform = 'scale(0.95)';
                cardEl.style.opacity = '0.9';
            }

            cardEl.innerHTML = `
                <div class="card-content" style="background-image: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%), url('${cardData.posterURL}');">
                    <div class="swipe-overlay like-overlay" id="like-overlay-${cardData.id}">
                        <div class="overlay-text">LIKE</div>
                    </div>
                    <div class="swipe-overlay dislike-overlay" id="dislike-overlay-${cardData.id}">
                        <div class="overlay-text">NOPE</div>
                    </div>
                    <div class="card-info">
                        <h3 class="card-title">${cardData.title}</h3>
                        <p class="card-subtitle">${cardData.releaseYear}</p>
                        <p>${cardData.overview.substring(0, 150)}...</p>
                    </div>
                </div>
            `;
            swipeArea.appendChild(cardEl);

            if (isTopCard) {
                this.makeCardDraggable(cardEl, cardData);
            }
        }
        
        // Load the next page if we are running low on cards
        if (this.movieQueue.length - this.currentCardIndex < 5 && this.currentPage <= this.totalPages) {
            this.loadMoviesWithRetry();
        }
    }

    // --- Interaction Logic ---

    setupEventListeners() {
        const controls = this.container.querySelector('#controls');
        if (controls) {
            controls.addEventListener('click', (e) => {
                const btn = e.target.closest('.control-button');
                if (btn) {
                    const action = btn.dataset.action;
                    if (action) {
                        const topCard = this.container.querySelector('.movie-card:nth-child(1)');
                        if (topCard) {
                            this.manualSwipe(topCard, action);
                        }
                    }
                }
            });
        }
    }

    manualSwipe(cardEl, action) {
        // Simulate a smooth swipe-off animation
        const direction = (action === 'like') ? 500 : -500;
        cardEl.style.transition = 'transform 0.5s ease-out';
        cardEl.style.transform = `translate(${direction}px, 0) rotate(${direction / 10}deg)`;
        
        // Trigger the completion handler after the animation
        setTimeout(() => {
            this.handleSwipeEnd(action);
        }, 300);
    }
    
    makeCardDraggable(cardEl, cardData) {
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let currentY = 0;
        let isDragging = false;
        
        const likeOverlay = this.container.querySelector(`#like-overlay-${cardData.id}`);
        const dislikeOverlay = this.container.querySelector(`#dislike-overlay-${cardData.id}`);

        const move = (x, y) => {
            currentX = x - startX;
            currentY = y - startY;
            const rotation = currentX / 10;
            
            cardEl.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotation}deg)`;
            
            // Update overlay opacity based on X movement
            const opacity = Math.min(Math.abs(currentX) / 100, 1);
            if (currentX > 0) {
                likeOverlay.style.opacity = opacity;
                dislikeOverlay.style.opacity = 0;
            } else if (currentX < 0) {
                dislikeOverlay.style.opacity = opacity;
                likeOverlay.style.opacity = 0;
            }
        };

        const start = (x, y) => {
            isDragging = true;
            startX = x;
            startY = y;
            cardEl.style.transition = 'none'; // Disable transition during drag
        };

        const end = () => {
            if (!isDragging) return;
            isDragging = false;

            const swipeThreshold = 150; // Distance to trigger a swipe
            const action = (currentX > swipeThreshold) ? 'like' : (currentX < -swipeThreshold) ? 'dislike' : null;

            if (action) {
                this.handleSwipeEnd(action);
                // Animate swipe off-screen
                const direction = (action === 'like') ? 500 : -500;
                cardEl.style.transition = 'transform 0.3s ease-out';
                cardEl.style.transform = `translate(${direction}px, ${currentY}px) rotate(${direction / 10}deg)`;
            } else {
                // Return to center
                cardEl.style.transition = 'transform 0.3s ease-out';
                cardEl.style.transform = 'translate(0, 0) rotate(0)';
                likeOverlay.style.opacity = 0;
                dislikeOverlay.style.opacity = 0;
            }
        };

        // --- Mouse Events ---
        cardEl.addEventListener('mousedown', (e) => start(e.clientX, e.clientY));
        document.addEventListener('mousemove', (e) => {
            if (isDragging) move(e.clientX, e.clientY);
        });
        document.addEventListener('mouseup', end);

        // --- Touch Events ---
        cardEl.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            start(touch.clientX, touch.clientY);
        });
        cardEl.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            if (isDragging) move(touch.clientX, touch.clientY);
        });
        cardEl.addEventListener('touchend', end);
    }
    
    // --- State and Cleanup ---

    handleSwipeEnd(action) {
        const swipedMovie = this.movieQueue[this.currentCardIndex];

        if (swipedMovie) {
            // Update history and sync to store/Firebase
            const newHistoryItem = {
                movie: swipedMovie.movie,
                action: action,
                timestamp: Date.now()
            };

            store.setState((state) => ({
                swipeHistory: [...state.swipeHistory, newHistoryItem]
            }));

            // Async call to sync with Firebase
            authService.syncSwipeHistory(store.getState().swipeHistory);
            
            if (action === 'like') {
                notify.success(`Liked: ${swipedMovie.title}`);
            }
        }

        // Move to next card
        this.currentCardIndex++;
        
        // Remove the swiped card from the DOM
        const swipedCardEl = this.container.querySelector('.movie-card:nth-child(1)');
        if (swipedCardEl) {
            swipedCardEl.remove();
        }

        this.updateCurrentCard();
    }
    
    cleanup() {
        if (this.currentSubscription) {
            this.currentSubscription();
        }
        // Remove listeners/cleanup DOM elements if necessary (e.g., when switching tabs)
    }
}

export { SwipeTab };
