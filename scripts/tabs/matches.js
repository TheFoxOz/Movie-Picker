/**
 * Matches Tab - Friend Movie Matches
 * ✅ FIXED: Proper scrolling
 * ✅ FIXED: Real-time Firestore listener for friend swipe history
 */

import { tmdbService } from '../services/tmdb.js';
import { authService } from '../services/auth-service.js';
import { userProfileService } from '../services/user-profile-revised.js';
import { showMovieModal } from '../components/movie-modal.js';
import { doc, getDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../services/firebase-config.js';

class MatchesTab {
    constructor() {
        this.container = null;
        this.friends = [];
        this.matches = [];
        this.selectedFriend = null;
        this.isLoading = false;
        this.friendListeners = new Map();
    }

    async init(container) {
        this.container = container;
        await this.render();
        await this.loadFriends();
        this.attachEventListeners();
    }

    async render() {
        this.container.innerHTML = `
            <div class="matches-content" style="
                height: 100%;
                overflow-y: auto;
                overflow-x: hidden;
                -webkit-overflow-scrolling: touch;
                padding: 1rem;
                padding-bottom: 6rem;
            ">
                <div class="matches-header" style="margin-bottom: 2rem;">
                    <h1 style="
                        font-size: 1.75rem;
                        font-weight: 700;
                        color: white;
                        margin-bottom: 0.5rem;
                    ">🤝 Movie Matches</h1>
                    <p style="color: rgba(176, 212, 227, 0.7); font-size: 0.95rem;">
                        Find movies you and your friends both liked
                    </p>
                </div>

                <div id="friends-list" class="friends-list" style="margin-bottom: 2rem;">
                    ${this.renderLoadingState()}
                </div>

                <div id="matches-display" class="matches-display" style="display: none;">
                    <h2 class="section-title" style="
                        font-size: 1.25rem;
                        font-weight: 600;
                        color: white;
                        margin-bottom: 1rem;
                    "></h2>
                    <div id="matches-grid" class="movie-grid" style="
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                        gap: 1rem;
                    "></div>
                </div>

                <div id="empty-state" style="
                    display: none;
                    text-align: center;
                    padding: 3rem 1rem;
                    color: rgba(176, 212, 227, 0.7);
                ">
                    <p style="font-size: 3rem; margin-bottom: 1rem;">👥</p>
                    <h3 style="color: white; margin-bottom: 0.5rem;">No Friends Yet</h3>
                    <p>Add friends to find movie matches!</p>
                </div>
            </div>
        `;
    }

    renderLoadingState() {
        return `
            <div style="text-align: center; padding: 2rem;">
                <div class="spinner" style="
                    width: 40px;
                    height: 40px;
                    border: 4px solid rgba(176, 212, 227, 0.2);
                    border-top-color: #b0d4e3;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 1rem;
                "></div>
                <p style="color: rgba(176, 212, 227, 0.7);">Loading friends...</p>
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

            // Load friend data and set up real-time listeners
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
                displayName: friendData.displayName || 'Anonymous',
                photoURL: friendData.photoURL || null,
                swipeHistory: friendData.swipeHistory || []
            };

            // Set up real-time listener for this friend's swipe history
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
                ${validFriends.map(friend => this.renderFriendCard(friend)).join('')}
            </div>
        `;
    }

    renderFriendCard(friend) {
        const photoUrl = friend.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.displayName)}&background=b0d4e3&color=1e3a5f`;
        const swipeCount = friend.swipeHistory?.length || 0;

        return `
            <div class="friend-card" data-friend-id="${friend.id}" style="
                background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 100%);
                border-radius: 12px;
                padding: 1rem;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s ease;
                border: 2px solid transparent;
            " onmouseover="this.style.borderColor='#b0d4e3'; this.style.transform='translateY(-4px)';" 
               onmouseout="this.style.borderColor='transparent'; this.style.transform='translateY(0)';">
                <img 
                    src="${photoUrl}" 
                    alt="${friend.displayName}"
                    style="
                        width: 60px;
                        height: 60px;
                        border-radius: 50%;
                        object-fit: cover;
                        margin: 0 auto 0.75rem;
                        border: 3px solid #b0d4e3;
                        display: block;
                    "
                >
                <h3 style="
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: white;
                    margin: 0 0 0.25rem 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                ">${friend.displayName}</h3>
                <p style="
                    font-size: 0.8rem;
                    color: rgba(176, 212, 227, 0.8);
                    margin: 0;
                ">${swipeCount} swipes</p>
            </div>
        `;
    }

    async showMatchesForFriend(friend) {
        this.selectedFriend = friend;
        
        const matchesDisplay = document.getElementById('matches-display');
        const sectionTitle = matchesDisplay.querySelector('.section-title');
        const matchesGrid = document.getElementById('matches-grid');

        matchesDisplay.style.display = 'block';
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
                        color: rgba(176, 212, 227, 0.7);
                    ">
                        <p style="font-size: 2rem; margin-bottom: 0.5rem;">🎬</p>
                        <p>No matches yet. Keep swiping!</p>
                    </div>
                `;
                return;
            }

            const moviesWithDetails = await Promise.all(
                matches.map(async (matchedMovie) => {
                    const movie = await tmdbService.getMovieDetails(matchedMovie.id);
                    if (movie) {
                        await tmdbService.loadWatchProvidersForMovies([movie]);
                    }
                    return movie;
                })
            );

            const validMovies = moviesWithDetails.filter(m => m !== null);
            this.matches = validMovies;
            this.renderMatchesGrid(validMovies);

        } catch (error) {
            console.error('[Matches] Error calculating matches:', error);
            matchesGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: rgba(176, 212, 227, 0.7);">
                    Failed to load matches
                </div>
            `;
        }
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

        const userLikes = new Set(
            userSwipes
                .filter(swipe => swipe.liked)
                .map(swipe => swipe.movieId)
        );

        const matches = friendSwipes
            .filter(swipe => swipe.liked && userLikes.has(swipe.movieId))
            .map(swipe => ({
                id: swipe.movieId,
                timestamp: swipe.timestamp
            }));

        console.log(`[Matches] Found ${matches.length} mutual likes`);

        matches.sort((a, b) => b.timestamp - a.timestamp);

        return matches;
    }

    renderLoadingCards(count) {
        return Array(count).fill(0).map(() => `
            <div class="movie-card loading" style="
                aspect-ratio: 2/3;
                background: linear-gradient(90deg, #1e3a5f 0%, #2d5a8f 50%, #1e3a5f 100%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 8px;
            "></div>
        `).join('');
    }

    renderMatchesGrid(movies) {
        const grid = document.getElementById('matches-grid');
        if (!grid) return;

        grid.innerHTML = movies.map(movie => this.renderMovieCard(movie)).join('');
    }

    renderMovieCard(movie) {
        const posterUrl = movie.posterURL || 'https://via.placeholder.com/300x450?text=No+Poster';
        const rating = movie.rating ? movie.rating.toFixed(1) : 'N/A';
        const platform = movie.platform || 'Not Available';

        return `
            <div class="movie-card" data-movie-id="${movie.id}" style="
                position: relative;
                cursor: pointer;
                border-radius: 8px;
                overflow: hidden;
                transition: transform 0.2s ease;
                background: #1e3a5f;
            " onmouseover="this.style.transform='scale(1.05)';" 
               onmouseout="this.style.transform='scale(1)';">
                <img 
                    src="${posterUrl}" 
                    alt="${movie.title}"
                    style="width: 100%; aspect-ratio: 2/3; object-fit: cover;"
                    onerror="this.src='https://via.placeholder.com/300x450?text=No+Poster'"
                >
                <div style="
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: rgba(30, 58, 95, 0.9);
                    color: #f4e8c1;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 0.8rem;
                    font-weight: 700;
                ">
                    ⭐ ${rating}
                </div>
                <div style="
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(to top, rgba(30, 58, 95, 0.95), transparent);
                    padding: 0.75rem;
                ">
                    <h3 style="
                        font-size: 0.9rem;
                        font-weight: 600;
                        color: white;
                        margin: 0 0 4px 0;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    ">${movie.title}</h3>
                    <p style="font-size: 0.75rem; color: rgba(176, 212, 227, 0.8); margin: 0;">${platform}</p>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
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

            const movieCard = e.target.closest('.movie-card');
            if (movieCard && !movieCard.classList.contains('loading')) {
                const movieId = parseInt(movieCard.dataset.movieId);
                const movie = this.matches.find(m => m.id === movieId);
                if (movie && showMovieModal) {
                    await showMovieModal(movie);
                }
            }
        });
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
                <div style="text-align: center; padding: 2rem; color: rgba(176, 212, 227, 0.7);">
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
    }
}

const matchesTab = new MatchesTab();
export { matchesTab, MatchesTab };
