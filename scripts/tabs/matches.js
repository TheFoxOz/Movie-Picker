/**
 * Matches Tab - Enhanced with Watched Tracking & UI Improvements
 * ✅ WATCHED TRACKING: Mark movies as watched with friends
 * ✅ UI IMPROVEMENTS: Glass morphism, animations, hover effects
 * ✅ MOVIE WHEEL: Random movie picker integration
 * ✅ RANKING SYSTEM: Score-based sorting with visual badges
 * ✅ FILTERS: All / Unwatched / Watched tabs
 */

import { tmdbService } from '../services/tmdb.js';
import { authService } from '../services/auth-service.js';
import { movieModal } from '../components/movie-modal.js';
import { renderTriggerBadge } from '../utils/trigger-warnings.js';
import { movieWheel } from '../components/movie-wheel.js';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase-config.js';

class MatchesTab {
    constructor() {
        this.container = null;
        this.friends = [];
        this.matches = [];
        this.selectedFriend = null;
        this.isLoading = false;
        this.friendListeners = new Map();
        this.watchedMovies = new Set();
        this.currentFilter = 'all';
    }

    async init(container) {
        if (!container) {
            console.error('[Matches] No container provided to init()');
            return;
        }
        
        this.container = container;
        this.injectStyles();
        await this.render();
        await this.loadFriends();
        this.attachEventListeners();
    }

    injectStyles() {
        if (document.getElementById('matches-enhanced-styles')) return;

        const style = document.createElement('style');
        style.id = 'matches-enhanced-styles';
        style.textContent = `
            /* Glass Morphism */
            .glass-card {
                background: rgba(166, 192, 221, 0.1);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(166, 192, 221, 0.2);
            }

            /* Animations */
            @keyframes bounce-in {
                0% { transform: scale(0); }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); }
            }

            .bounce-in {
                animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            }

            @keyframes slide-up {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .slide-up {
                animation: slide-up 0.4s ease-out forwards;
            }

            @keyframes glow-pulse {
                0%, 100% { box-shadow: 0 0 20px rgba(166, 192, 221, 0.4); }
                50% { box-shadow: 0 0 40px rgba(166, 192, 221, 0.6); }
            }

            .glow-pulse {
                animation: glow-pulse 2s ease-in-out infinite;
            }

            /* Movie Card Enhancements */
            .movie-card {
                position: relative;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .movie-card:hover {
                transform: translateY(-8px) scale(1.02);
                box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
            }

            .movie-card.watched {
                opacity: 0.75;
            }

            .movie-card.watched::after {
                content: '✓ WATCHED';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(16, 185, 129, 0.95);
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 0.5rem;
                font-weight: 700;
                font-size: 0.875rem;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s;
            }

            .movie-card.watched:hover::after {
                opacity: 1;
            }

            /* Watched Checkbox */
            .watched-checkbox {
                position: absolute;
                top: 0.5rem;
                left: 0.5rem;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 20;
                transition: all 0.2s;
                border: 2px solid;
            }

            .watched-checkbox:hover {
                transform: scale(1.1);
            }

            .watched-checkbox input {
                display: none;
            }

            .watched-checkbox .checkmark {
                color: white;
                font-size: 16px;
                font-weight: 700;
                transition: opacity 0.2s;
            }

            /* Filter Tabs */
            .filter-tab {
                flex: 1;
                padding: 0.75rem;
                border: none;
                border-radius: 0.5rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                background: transparent;
                color: #A6C0DD;
            }

            .filter-tab.active {
                background: linear-gradient(135deg, #A6C0DD, #8ba3b8);
                color: #18183A;
            }

            .filter-tab:hover:not(.active) {
                background: rgba(166, 192, 221, 0.2);
            }

            /* Action Button */
            .action-btn {
                transition: all 0.3s;
            }

            .action-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(255, 46, 99, 0.5);
            }

            .action-btn:active {
                transform: translateY(0);
            }

            /* Toast Notification */
            .toast {
                position: fixed;
                bottom: 6rem;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(24, 24, 58, 0.95);
                color: #FDFAB0;
                padding: 1rem 1.5rem;
                border-radius: 0.75rem;
                border: 2px solid #A6C0DD;
                font-weight: 600;
                z-index: 3000;
                animation: toast-in 0.3s ease-out;
                backdrop-filter: blur(10px);
            }

            @keyframes toast-in {
                from {
                    opacity: 0;
                    transform: translate(-50%, 20px);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, 0);
                }
            }
        `;
        document.head.appendChild(style);
    }

    async render() {
        if (!this.container) {
            console.error('[Matches] No container available for render()');
            return;
        }
        
        this.container.innerHTML = `
            <div class="matches-content" style="
                width: 100%;
                padding: 1rem;
                padding-bottom: 6rem;
            ">
                <!-- Header with gradient -->
                <div class="matches-header glass-card" style="
                    margin-bottom: 2rem;
                    padding: 1.5rem;
                    border-radius: 1rem;
                    background: linear-gradient(135deg, rgba(166, 192, 221, 0.15), rgba(253, 250, 176, 0.1));
                ">
                    <h1 style="
                        font-size: 1.75rem;
                        font-weight: 700;
                        color: #FDFAB0;
                        margin-bottom: 0.5rem;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    ">
                        <span class="bounce-in">🤝</span>
                        <span>Movie Matches</span>
                    </h1>
                    <p style="color: #A6C0DD; font-size: 0.95rem;">
                        Find movies you and your friends both liked
                    </p>
                </div>

                <!-- Friends List -->
                <div id="friends-list" class="friends-list" style="margin-bottom: 2rem;">
                    ${this.renderLoadingState()}
                </div>

                <!-- Filter Tabs -->
                <div id="filter-tabs" style="display: none; margin-bottom: 1.5rem;">
                    <div style="
                        display: flex;
                        gap: 0.5rem;
                        background: rgba(166, 192, 221, 0.1);
                        padding: 0.5rem;
                        border-radius: 0.75rem;
                        border: 1px solid rgba(166, 192, 221, 0.2);
                    ">
                        <button class="filter-tab active" data-filter="all">All Matches</button>
                        <button class="filter-tab" data-filter="unwatched">Unwatched</button>
                        <button class="filter-tab" data-filter="watched">Watched</button>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div id="action-buttons" style="display: none; margin-bottom: 1.5rem;">
                    <button id="movie-wheel-btn" class="action-btn" style="
                        width: 100%;
                        padding: 1rem;
                        background: linear-gradient(135deg, #ff2e63, #ff6b9d);
                        border: none;
                        border-radius: 0.75rem;
                        color: white;
                        font-weight: 700;
                        font-size: 1rem;
                        cursor: pointer;
                        box-shadow: 0 4px 15px rgba(255, 46, 99, 0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.5rem;
                    ">
                        <span style="font-size: 1.5rem;">🎡</span>
                        <span>Random Pick</span>
                    </button>
                </div>

                <!-- Matches Display -->
                <div id="matches-display" class="matches-display" style="display: none;">
                    <h2 class="section-title" style="
                        font-size: 1.25rem;
                        font-weight: 600;
                        color: #FDFAB0;
                        margin-bottom: 1rem;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    ">
                        <span id="match-title"></span>
                        <span id="match-count" style="
                            font-size: 0.875rem;
                            color: #A6C0DD;
                            font-weight: 500;
                        "></span>
                    </h2>
                    <div id="matches-grid" class="movie-grid" style="
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                        gap: 1rem;
                    "></div>
                </div>

                <!-- Empty State -->
                <div id="empty-state" style="
                    display: none;
                    text-align: center;
                    padding: 3rem 1rem;
                    color: #A6C0DD;
                ">
                    <p style="font-size: 3rem; margin-bottom: 1rem;" class="bounce-in">👥</p>
                    <h3 style="color: #FDFAB0; margin-bottom: 0.5rem;">No Friends Yet</h3>
                    <p>Add friends to find movie matches!</p>
                </div>
            </div>
        `;
    }

    renderLoadingState() {
        return `
            <div style="text-align: center; padding: 2rem;">
                <div class="spinner glow-pulse" style="
                    width: 40px;
                    height: 40px;
                    border: 4px solid rgba(166, 192, 221, 0.2);
                    border-top-color: #A6C0DD;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 1rem;
                "></div>
                <p style="color: #A6C0DD;">Loading friends...</p>
            </div>
            <style>@keyframes spin { to { transform: rotate(360deg); }}</style>
        `;
    }

    async loadFriends() {
        this.isLoading = true;
        
        try {
            const currentUser = authService.getCurrentUser();
            if (!currentUser) {
                this.showEmptyState();
                return;
            }

            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (!userDoc.exists()) {
                this.showEmptyState();
                return;
            }

            const userData = userDoc.data();
            const friendIds = userData.friends || [];

            if (friendIds.length === 0) {
                this.showEmptyState();
                return;
            }

            this.friends = await Promise.all(
                friendIds.map(friendId => this.loadFriendData(friendId))
            );

            this.renderFriendsList();
        } catch (error) {
            console.error('[Matches] Error loading friends:', error);
            this.showError('Failed to load friends');
        } finally {
            this.isLoading = false;
        }
    }

    async loadFriendData(friendId) {
        try {
            const friendDoc = await getDoc(doc(db, 'users', friendId));
            
            if (!friendDoc.exists()) {
                console.warn(`[Matches] Friend ${friendId} not found`);
                return null;
            }

            const friendData = friendDoc.data();
            const friend = {
                id: friendId,
                displayName: friendData.displayName || friendData.userName || friendData.email?.split('@')[0] || 'MoviEase User',
                photoURL: friendData.photoURL || null,
                swipeHistory: friendData.swipeHistory || []
            };

            this.setupFriendListener(friendId, friend);

            return friend;
        } catch (error) {
            console.error(`[Matches] Error loading friend ${friendId}:`, error);
            return null;
        }
    }

    setupFriendListener(friendId, friendObject) {
        if (this.friendListeners.has(friendId)) {
            this.friendListeners.get(friendId)();
        }

        const friendRef = doc(db, 'users', friendId);
        const unsubscribe = onSnapshot(friendRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                friendObject.swipeHistory = data.swipeHistory || [];
                
                console.log(`[Matches] Updated swipe history for ${friendObject.displayName}: ${friendObject.swipeHistory.length} swipes`);
                
                if (this.selectedFriend && this.selectedFriend.id === friendId) {
                    this.showMatchesForFriend(friendObject);
                }
            }
        }, (error) => {
            console.error(`[Matches] Listener error for friend ${friendId}:`, error);
        });

        this.friendListeners.set(friendId, unsubscribe);
    }

    renderFriendsList() {
        const friendsList = document.getElementById('friends-list');
        if (!friendsList) return;

        const validFriends = this.friends.filter(f => f !== null);

        if (validFriends.length === 0) {
            this.showEmptyState();
            return;
        }

        friendsList.innerHTML = `
            <div style="
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                gap: 1rem;
            ">
                ${validFriends.map((friend, index) => this.renderFriendCard(friend, index)).join('')}
            </div>
        `;
    }

    renderFriendCard(friend, index) {
        const photoUrl = friend.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.displayName)}&background=A6C0DD&color=18183A`;
        const swipeCount = friend.swipeHistory?.length || 0;

        return `
            <div class="friend-card slide-up glass-card" data-friend-id="${friend.id}" style="
                background: linear-gradient(135deg, rgba(166, 192, 221, 0.2), rgba(253, 250, 176, 0.15));
                border-radius: 12px;
                padding: 1rem;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border: 2px solid transparent;
                animation-delay: ${index * 0.1}s;
            " onmouseover="this.style.borderColor='#FDFAB0'; this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 20px rgba(166, 192, 221, 0.3)';" 
               onmouseout="this.style.borderColor='transparent'; this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                <img 
                    src="${photoUrl}" 
                    alt="${friend.displayName}"
                    style="
                        width: 60px;
                        height: 60px;
                        border-radius: 50%;
                        object-fit: cover;
                        margin: 0 auto 0.75rem;
                        border: 3px solid #18183A;
                        display: block;
                        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
                    "
                >
                <h3 style="
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: #FDFAB0;
                    margin: 0 0 0.25rem 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                ">${friend.displayName}</h3>
                <p style="
                    font-size: 0.8rem;
                    color: #A6C0DD;
                    margin: 0;
                ">${swipeCount} swipes</p>
            </div>
        `;
    }

    async showMatchesForFriend(friend) {
        this.selectedFriend = friend;
        
        // Load watched movies for this friend
        await this.loadWatchedMovies(friend.id);
        
        const matchesDisplay = document.getElementById('matches-display');
        const filterTabs = document.getElementById('filter-tabs');
        const actionButtons = document.getElementById('action-buttons');
        const sectionTitle = document.getElementById('match-title');
        const matchCount = document.getElementById('match-count');
        const matchesGrid = document.getElementById('matches-grid');

        matchesDisplay.style.display = 'block';
        filterTabs.style.display = 'block';
        actionButtons.style.display = 'block';
        sectionTitle.textContent = `Matches with ${friend.displayName}`;
        matchesGrid.innerHTML = this.renderLoadingCards(6);

        try {
            const matches = await this.calculateMatches(friend);
            
            if (matches.length === 0) {
                matchesGrid.innerHTML = `
                    <div style="
                        grid-column: 1 / -1;
                        text-align: center;
                        padding: 2rem;
                        color: #A6C0DD;
                    " class="slide-up">
                        <p style="font-size: 2rem; margin-bottom: 0.5rem;">🎬</p>
                        <p>No matches yet. Keep swiping!</p>
                    </div>
                `;
                return;
            }

            const moviesWithDetails = await Promise.all(
                matches.map(async (matchData) => {
                    const movie = await tmdbService.getMovieDetails(matchData.id);
                    if (movie) {
                        await tmdbService.loadWatchProvidersForMovies([movie]);
                        movie.matchData = matchData;
                    }
                    return movie;
                })
            );

            const validMovies = moviesWithDetails.filter(m => m !== null);
            this.matches = validMovies;
            this.currentFilter = 'all';
            
            matchCount.textContent = `${validMovies.length} matches`;
            this.renderMatchesGrid(validMovies);

        } catch (error) {
            console.error('[Matches] Error calculating matches:', error);
            matchesGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #A6C0DD;">
                    Failed to load matches
                </div>
            `;
        }
    }

    async loadWatchedMovies(friendId) {
        try {
            const currentUser = authService.getCurrentUser();
            if (!currentUser) return;

            const watchedRef = doc(db, 'users', currentUser.uid, 'watchHistory', friendId);
            const watchedDoc = await getDoc(watchedRef);
            
            this.watchedMovies.clear();
            
            if (watchedDoc.exists()) {
                const data = watchedDoc.data();
                Object.keys(data).forEach(movieId => {
                    this.watchedMovies.add(parseInt(movieId));
                });
                console.log('[Matches] Loaded watched movies:', this.watchedMovies.size);
            }
        } catch (error) {
            console.error('[Matches] Error loading watched movies:', error);
        }
    }

    async toggleWatched(movieId, friendId) {
        try {
            const currentUser = authService.getCurrentUser();
            if (!currentUser) return;

            const watchedRef = doc(db, 'users', currentUser.uid, 'watchHistory', friendId);
            const isWatched = this.watchedMovies.has(movieId);
            
            if (isWatched) {
                // Remove from watched
                this.watchedMovies.delete(movieId);
                const watchedDoc = await getDoc(watchedRef);
                if (watchedDoc.exists()) {
                    const data = watchedDoc.data();
                    delete data[movieId.toString()];
                    await setDoc(watchedRef, data);
                }
                this.showToast('Removed from watched 📝');
            } else {
                // Add to watched
                this.watchedMovies.add(movieId);
                await setDoc(watchedRef, {
                    [movieId.toString()]: {
                        watchedAt: Date.now(),
                        timestamp: new Date().toISOString()
                    }
                }, { merge: true });
                this.showToast('Marked as watched ✅');
            }
            
            // Re-render with current filter
            this.applyFilter(this.currentFilter);
            
        } catch (error) {
            console.error('[Matches] Error toggling watched:', error);
            this.showToast('Failed to update ❌');
        }
    }

    applyFilter(filter) {
        this.currentFilter = filter;
        
        // Update active tab
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.filter === filter) {
                tab.classList.add('active');
            }
        });
        
        let filteredMovies = this.matches;
        
        if (filter === 'watched') {
            filteredMovies = this.matches.filter(m => this.watchedMovies.has(m.id));
        } else if (filter === 'unwatched') {
            filteredMovies = this.matches.filter(m => !this.watchedMovies.has(m.id));
        }
        
        const matchCount = document.getElementById('match-count');
        matchCount.textContent = `${filteredMovies.length} matches`;
        
        this.renderMatchesGrid(filteredMovies);
    }

    async calculateMatches(friend) {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) return [];

        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (!userDoc.exists()) return [];

        const userData = userDoc.data();
        const userSwipes = userData.swipeHistory || [];
        const friendSwipes = friend.swipeHistory || [];

        console.log(`[Matches] User swipes: ${userSwipes.length}, Friend swipes: ${friendSwipes.length}`);

        const getActionScore = (action) => {
            const scores = {
                'love': 5,
                'like': 3,
                'maybe': 1,
                'nope': -3,
                'pass': -3
            };
            return scores[action] || 0;
        };

        const userLikes = new Map();
        userSwipes.forEach(swipe => {
            const movieId = swipe.movieId || swipe.movie?.id;
            if (movieId) {
                const score = getActionScore(swipe.action);
                if (score > 0) {
                    userLikes.set(movieId.toString(), score);
                }
            }
        });

        const matches = [];
        
        friendSwipes.forEach(swipe => {
            const movieId = swipe.movieId || swipe.movie?.id;
            if (movieId) {
                const movieIdStr = movieId.toString();
                const friendScore = getActionScore(swipe.action);
                
                if (friendScore > 0 && userLikes.has(movieIdStr)) {
                    const userScore = userLikes.get(movieIdStr);
                    const combinedScore = userScore + friendScore;
                    
                    matches.push({
                        id: parseInt(movieId),
                        timestamp: swipe.timestamp || Date.now(),
                        userScore: userScore,
                        friendScore: friendScore,
                        combinedScore: combinedScore,
                        userAction: this.getActionName(userScore),
                        friendAction: this.getActionName(friendScore)
                    });
                }
            }
        });

        matches.sort((a, b) => {
            if (b.combinedScore !== a.combinedScore) {
                return b.combinedScore - a.combinedScore;
            }
            return b.timestamp - a.timestamp;
        });

        console.log(`[Matches] Found ${matches.length} mutual likes`);

        return matches;
    }

    getActionName(score) {
        if (score === 5) return 'love';
        if (score === 3) return 'like';
        if (score === 1) return 'maybe';
        return 'unknown';
    }

    renderLoadingCards(count) {
        return Array(count).fill(0).map(() => `
            <div class="movie-card loading" style="
                aspect-ratio: 2/3;
                background: linear-gradient(90deg, rgba(166, 192, 221, 0.2) 0%, rgba(253, 250, 176, 0.2) 50%, rgba(166, 192, 221, 0.2) 100%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 8px;
            "></div>
            <style>
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            </style>
        `).join('');
    }

    renderMatchesGrid(movies) {
        const grid = document.getElementById('matches-grid');
        if (!grid) return;

        grid.innerHTML = movies.map((movie, index) => this.renderMovieCard(movie, index)).join('');
    }

    renderMovieCard(movie, index) {
        const posterUrl = movie.posterURL || 'https://via.placeholder.com/300x450?text=No+Poster';
        const rating = movie.rating ? movie.rating.toFixed(1) : 'N/A';
        const platform = movie.platform || movie.availableOn?.[0] || 'Not Available';
        const isWatched = this.watchedMovies.has(movie.id);
        
        const hasTrailer = movie.trailerKey && movie.trailerKey.trim() !== '';
        const trailerUrl = hasTrailer ? `https://www.youtube.com/watch?v=${movie.trailerKey}` : null;
        
        const triggerBadgeHTML = renderTriggerBadge(movie, { size: 'small', position: 'top-left' });
        
        let ratingColor = '#10b981';
        if (parseFloat(rating) < 5) ratingColor = '#ef4444';
        else if (parseFloat(rating) < 7) ratingColor = '#fbbf24';

        const matchData = movie.matchData;
        let rankingBadge = '';
        if (matchData) {
            const { combinedScore, userAction, friendAction } = matchData;
            
            const actionEmoji = {
                'love': '❤️',
                'like': '👍',
                'maybe': '🤔'
            };
            
            let rankColor = '#10b981';
            if (combinedScore >= 10) rankColor = '#ff2e63';
            else if (combinedScore >= 8) rankColor = '#ec4899';
            else if (combinedScore >= 6) rankColor = '#8b5cf6';
            else if (combinedScore >= 4) rankColor = '#3b82f6';
            
            rankingBadge = `
                <div style="
                    position: absolute;
                    bottom: 4.5rem;
                    left: 0.5rem;
                    background: linear-gradient(135deg, ${rankColor}, ${rankColor}dd);
                    border: 2px solid white;
                    padding: 4px 8px;
                    border-radius: 8px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: white;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                    z-index: 10;
                " title="Combined Score: ${combinedScore} (You: ${userAction}, Friend: ${friendAction})">
                    <span style="font-size: 0.9rem;">${actionEmoji[userAction] || '👤'}</span>
                    <span style="font-size: 1rem; margin: 0 2px;">+</span>
                    <span style="font-size: 0.9rem;">${actionEmoji[friendAction] || '👥'}</span>
                    <span style="margin-left: 2px;">= ${combinedScore}</span>
                </div>
            `;
        }

        return `
            <div class="movie-card slide-up ${isWatched ? 'watched' : ''}" data-movie-id="${movie.id}" style="
                position: relative;
                cursor: pointer;
                border-radius: 8px;
                overflow: hidden;
                background: #18183A;
                animation-delay: ${index * 0.05}s;
            ">
                <img 
                    src="${posterUrl}" 
                    alt="${movie.title}"
                    style="width: 100%; aspect-ratio: 2/3; object-fit: cover;"
                    onerror="this.src='https://via.placeholder.com/300x450?text=No+Poster'"
                >
                
                <!-- Watched Checkbox -->
                <label class="watched-checkbox" 
                       onclick="event.stopPropagation();"
                       style="
                           background: ${isWatched ? '#10b981' : 'rgba(24, 24, 58, 0.9)'};
                           border-color: ${isWatched ? 'white' : '#A6C0DD'};
                       ">
                    <input type="checkbox" 
                           ${isWatched ? 'checked' : ''}
                           onchange="window.matchesTab.toggleWatched(${movie.id}, '${this.selectedFriend.id}')">
                    <span class="checkmark" style="opacity: ${isWatched ? 1 : 0};">✓</span>
                </label>
                
                <!-- Trailer Button -->
                ${hasTrailer ? `
                    <button 
                        onclick="event.stopPropagation(); window.open('${trailerUrl}', '_blank')"
                        style="
                            position: absolute;
                            top: 0.5rem;
                            right: 0.5rem;
                            width: 28px;
                            height: 28px;
                            background: rgba(255, 46, 99, 0.95);
                            border: 2px solid white;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            cursor: pointer;
                            z-index: 10;
                            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                        "
                        title="Watch Trailer"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </button>
                ` : ''}
                
                ${triggerBadgeHTML}
                
                <!-- Rating Badge -->
                <div style="
                    position: absolute;
                    top: ${triggerBadgeHTML ? '2.5rem' : '0.5rem'};
                    right: 0.5rem;
                    background: rgba(24, 24, 58, 0.9);
                    color: ${ratingColor};
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 0.8rem;
                    font-weight: 700;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                ">
                    ⭐ ${rating}
                </div>
                
                ${rankingBadge}
                
                <div style="
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(to top, rgba(24, 24, 58, 0.95), transparent);
                    padding: 0.75rem;
                ">
                    <h3 style="
                        font-size: 0.9rem;
                        font-weight: 600;
                        color: #FDFAB0;
                        margin: 0 0 4px 0;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    ">${movie.title}</h3>
                    
                    <div style="
                        display: inline-block;
                        background: rgba(166, 192, 221, 0.2);
                        border: 1px solid rgba(166, 192, 221, 0.3);
                        padding: 2px 6px;
                        border-radius: 3px;
                        font-size: 0.7rem;
                        color: #A6C0DD;
                        font-weight: 600;
                    ">
                        ${platform}
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        if (!this.container) return;
        
        // Friend card clicks
        this.container.addEventListener('click', async (e) => {
            const friendCard = e.target.closest('.friend-card');
            if (friendCard) {
                const friendId = friendCard.dataset.friendId;
                const friend = this.friends.find(f => f && f.id === friendId);
                if (friend) {
                    await this.showMatchesForFriend(friend);
                }
                return;
            }

            // Movie card clicks
            const movieCard = e.target.closest('.movie-card');
            if (movieCard && !movieCard.classList.contains('loading')) {
                const movieId = parseInt(movieCard.dataset.movieId);
                const movie = this.matches.find(m => m.id === movieId);
                if (movie && movieModal) {
                    movieModal.show(movie);
                }
            }
        });

        // Filter tabs
        this.container.addEventListener('click', (e) => {
            const filterTab = e.target.closest('.filter-tab');
            if (filterTab) {
                const filter = filterTab.dataset.filter;
                this.applyFilter(filter);
            }
        });

        // Movie wheel button
        this.container.addEventListener('click', (e) => {
            if (e.target.closest('#movie-wheel-btn')) {
                this.openMovieWheel();
            }
        });
    }

    openMovieWheel() {
        if (!this.selectedFriend) return;
        
        // Get unwatched movies
        const unwatchedMovies = this.matches.filter(m => !this.watchedMovies.has(m.id));
        
        if (unwatchedMovies.length < 3) {
            this.showToast('Need at least 3 unwatched movies for the wheel! 🎡');
            return;
        }
        
        // Open movie wheel with current matches
        movieWheel.open(unwatchedMovies, this.selectedFriend.displayName, (selectedMovie) => {
            console.log('[Matches] Movie selected from wheel:', selectedMovie.title);
            // Optionally open modal or mark as watched
            if (movieModal) {
                movieModal.show(selectedMovie);
            }
        });
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'toast-in 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    showEmptyState() {
        const friendsList = document.getElementById('friends-list');
        const emptyState = document.getElementById('empty-state');
        
        if (friendsList) friendsList.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
    }

    showError(message) {
        const friendsList = document.getElementById('friends-list');
        if (friendsList) {
            friendsList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #A6C0DD;">
                    <p>❌ ${message}</p>
                </div>
            `;
        }
    }

    cleanup() {
        this.friendListeners.forEach(unsubscribe => unsubscribe());
        this.friendListeners.clear();
        
        this.friends = [];
        this.matches = [];
        this.selectedFriend = null;
        this.watchedMovies.clear();
    }
}

const matchesTab = new MatchesTab();
window.matchesTab = matchesTab; // Expose globally for watched checkbox
export { matchesTab, MatchesTab };
