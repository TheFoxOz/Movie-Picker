/**
 * Matches Tab Component
 * Find movies that match with friends based on swipe history
 * Includes point system, filters, and spin wheel picker
 */

import { store } from '../state/store.js';
import { movieModal } from '../components/movie-modal.js';
import { ENV } from '../config/env.js';

export class MatchesTab {
    constructor() {
        this.container = null;
        this.friends = [];
        this.selectedFriend = null;
        this.selectedGroup = null;
        this.matchedMovies = [];
        this.currentFilter = 'all'; // all, loved, liked, maybe
        this.minScore = 0;
        this.showingWheel = false;
    }

    async render(container) {
        this.container = container;
        this.loadFriends();
        this.renderContent();
    }

    loadFriends() {
        // Load from store/localStorage
        const preferences = store.getState().preferences || {};
        this.friends = preferences.friends || [];
        
        // Mock friends for demo (remove this in production)
        if (this.friends.length === 0) {
            this.friends = this.getMockFriends();
        }
    }

    getMockFriends() {
        // Demo friends with swipe history
        return [
            {
                id: 'friend1',
                name: 'Sarah Mitchell',
                username: '@sarahm',
                avatar: '👩',
                swipeHistory: this.generateMockSwipes(50)
            },
            {
                id: 'friend2',
                name: 'Mike Chen',
                username: '@mikec',
                avatar: '👨',
                swipeHistory: this.generateMockSwipes(75)
            },
            {
                id: 'friend3',
                name: 'Emma Davis',
                username: '@emmad',
                avatar: '👧',
                swipeHistory: this.generateMockSwipes(40)
            }
        ];
    }

    generateMockSwipes(count) {
        // Generate random swipes for demo
        const actions = ['love', 'like', 'maybe', 'pass'];
        const swipes = [];
        const userSwipes = store.getState().swipeHistory || [];
        
        // Use some of the user's movies for overlap
        userSwipes.slice(0, Math.floor(count * 0.3)).forEach(userSwipe => {
            swipes.push({
                movie: userSwipe.movie,
                action: actions[Math.floor(Math.random() * actions.length)],
                timestamp: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
            });
        });
        
        return swipes;
    }

    calculateMatches(userSwipes, friendSwipes) {
        const matches = [];
        const userMovieMap = new Map(userSwipes.map(s => [s.movie.id, s]));
        
        friendSwipes.forEach(friendSwipe => {
            // ✅ FIX: Add null check for friendSwipe.movie
            if (!friendSwipe || !friendSwipe.movie || !friendSwipe.movie.id) {
                console.warn('[Matches] Invalid friend swipe data:', friendSwipe);
                return;
            }
            
            const userSwipe = userMovieMap.get(friendSwipe.movie.id);
            
            if (userSwipe) {
                // ✅ FIX: Add null check for userSwipe.movie
                if (!userSwipe.movie || !userSwipe.movie.id) {
                    console.warn('[Matches] Invalid user swipe data:', userSwipe);
                    return;
                }
                
                const userScore = this.getScore(userSwipe.action);
                const friendScore = this.getScore(friendSwipe.action);
                const totalScore = userScore + friendScore;
                
                // Only include if both didn't pass
                if (totalScore > 0) {
                    matches.push({
                        movie: userSwipe.movie,
                        userAction: userSwipe.action,
                        friendAction: friendSwipe.action,
                        userScore,
                        friendScore,
                        totalScore
                    });
                }
            }
        });
        
        // Sort by score (highest first)
        return matches.sort((a, b) => b.totalScore - a.totalScore);
    }

    getScore(action) {
        const scores = {
            'love': 5,
            'like': 3,
            'maybe': 1,
            'pass': 0
        };
        return scores[action] || 0;
    }

    getActionEmoji(action) {
        const emojis = {
            'love': '❤️',
            'like': '👍',
            'maybe': '❓',
            'pass': '✕'
        };
        return emojis[action] || '•';
    }

    filterMatches(matches) {
        let filtered = matches;
        
        // Filter by action type
        switch(this.currentFilter) {
            case 'loved':
                filtered = filtered.filter(m => 
                    m.userAction === 'love' && m.friendAction === 'love'
                );
                break;
            case 'liked':
                filtered = filtered.filter(m => 
                    (m.userAction === 'like' || m.userAction === 'love') &&
                    (m.friendAction === 'like' || m.friendAction === 'love')
                );
                break;
            case 'maybe':
                filtered = filtered.filter(m => 
                    m.totalScore >= 2 // At least some interest
                );
                break;
        }
        
        // Filter by minimum score
        filtered = filtered.filter(m => m.totalScore >= this.minScore);
        
        return filtered;
    }

    renderContent() {
        const userSwipes = store.getState().swipeHistory || [];
        
        if (userSwipes.length === 0) {
            this.renderEmptyState();
            return;
        }

        if (!this.selectedFriend) {
            this.renderFriendsList();
            return;
        }

        this.renderMatchesView();
    }

    renderEmptyState() {
        this.container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: calc(100vh - 10rem); padding: 2rem;">
                <div style="text-align: center; max-width: 400px;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🎬</div>
                    <h2 style="font-size: 1.5rem; font-weight: 800; color: white; margin: 0 0 1rem 0;">
                        Start Swiping First!
                    </h2>
                    <p style="color: rgba(255,255,255,0.7); line-height: 1.6; margin: 0 0 2rem 0;">
                        Swipe on some movies first, then add friends to see what you have in common!
                    </p>
                    <button onclick="window.dispatchEvent(new CustomEvent('navigate-to-tab', {detail: 'swipe'}))" 
                            style="padding: 1rem 2rem; background: linear-gradient(135deg,#ff2e63,#d90062); border: none; border-radius: 0.75rem; color: white; font-weight: 700; cursor: pointer; transition: transform 0.2s;">
                        Go to Swipe Tab
                    </button>
                </div>
            </div>
        `;
    }

    renderFriendsList() {
        this.container.innerHTML = `
            <div style="padding: 1.5rem 1rem 6rem;">
                
                <!-- Header -->
                <div style="margin-bottom: 2rem;">
                    <h1 style="font-size: 1.75rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0;">
                        Movie Matches
                    </h1>
                    <p style="color: rgba(255,255,255,0.6); font-size: 0.875rem; margin: 0;">
                        Find movies you and your friends both want to watch
                    </p>
                </div>

                <!-- Add Friend Button -->
                <button id="add-friend-btn" style="width: 100%; padding: 1.25rem; background: linear-gradient(135deg,#10b981,#059669); border: none; border-radius: 1rem; color: white; font-weight: 700; cursor: pointer; margin-bottom: 2rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: transform 0.2s;">
                    <span style="font-size: 1.5rem;">➕</span>
                    <span>Add Friend</span>
                </button>

                <!-- Friends List -->
                <div>
                    <h3 style="font-size: 1.125rem; font-weight: 700; color: white; margin: 0 0 1rem 0;">
                        Your Friends (${this.friends.length})
                    </h3>
                    ${this.friends.length === 0 ? `
                        <div style="text-align: center; padding: 3rem 1rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem;">
                            <div style="font-size: 3rem; margin-bottom: 0.5rem;">👥</div>
                            <p style="color: rgba(255,255,255,0.6); margin: 0;">
                                No friends added yet. Tap "Add Friend" to get started!
                            </p>
                        </div>
                    ` : `
                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                            ${this.friends.map(friend => this.renderFriendCard(friend)).join('')}
                        </div>
                    `}
                </div>

                <!-- Groups Section (Placeholder) -->
                <div style="margin-top: 2rem;">
                    <h3 style="font-size: 1.125rem; font-weight: 700; color: white; margin: 0 0 1rem 0;">
                        Groups
                    </h3>
                    <div style="text-align: center; padding: 2rem 1rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem;">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">👨‍👩‍👧‍👦</div>
                        <p style="color: rgba(255,255,255,0.6); margin: 0 0 1rem 0; font-size: 0.875rem;">
                            Create groups with multiple friends to find movies everyone loves
                        </p>
                        <button id="create-group-btn" style="padding: 0.75rem 1.5rem; background: rgba(99,102,241,0.2); border: 1px solid rgba(99,102,241,0.4); border-radius: 0.75rem; color: #818cf8; font-weight: 600; cursor: pointer;">
                            Create Group
                        </button>
                    </div>
                </div>

            </div>
        `;

        this.attachFriendsListeners();
    }

    renderFriendCard(friend) {
        const userSwipes = store.getState().swipeHistory || [];
        
        // ✅ FIX: Add error handling for calculateMatches
        let matches = [];
        try {
            matches = this.calculateMatches(userSwipes, friend.swipeHistory || []);
        } catch (error) {
            console.error('[Matches] Error calculating matches for friend:', friend.name, error);
            matches = [];
        }
        
        return `
            <div class="friend-card" data-friend-id="${friend.id}" style="padding: 1.25rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; cursor: pointer; transition: all 0.3s;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 56px; height: 56px; background: linear-gradient(135deg,#ff2e63,#d90062); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem;">
                        ${friend.avatar}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 700; color: white; margin-bottom: 0.25rem;">
                            ${friend.name}
                        </div>
                        <div style="font-size: 0.875rem; color: rgba(255,255,255,0.6);">
                            ${friend.username}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.75rem; font-weight: 800; color: #10b981; margin-bottom: 0.25rem;">
                            ${matches.length}
                        </div>
                        <div style="font-size: 0.75rem; color: rgba(255,255,255,0.6);">
                            matches
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderMatchesView() {
        const userSwipes = store.getState().swipeHistory || [];
        
        // ✅ FIX: Add error handling and null checks
        let allMatches = [];
        try {
            if (!this.selectedFriend || !this.selectedFriend.swipeHistory) {
                console.warn('[Matches] Invalid selected friend data');
                this.selectedFriend = null;
                this.renderFriendsList();
                return;
            }
            
            allMatches = this.calculateMatches(userSwipes, this.selectedFriend.swipeHistory);
        } catch (error) {
            console.error('[Matches] Error calculating matches:', error);
            allMatches = [];
        }
        
        this.matchedMovies = this.filterMatches(allMatches);

        this.container.innerHTML = `
            <div style="padding: 1.5rem 1rem 6rem;">
                
                <!-- Header with Back Button -->
                <div style="margin-bottom: 2rem;">
                    <button id="back-btn" style="padding: 0.5rem 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; color: rgba(255,255,255,0.8); font-weight: 600; cursor: pointer; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span>←</span>
                        <span>Back to Friends</span>
                    </button>
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
                        <div style="width: 48px; height: 48px; background: linear-gradient(135deg,#ff2e63,#d90062); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            ${this.selectedFriend.avatar}
                        </div>
                        <div>
                            <h1 style="font-size: 1.5rem; font-weight: 800; color: white; margin: 0;">
                                ${this.selectedFriend.name}
                            </h1>
                            <p style="color: rgba(255,255,255,0.6); font-size: 0.875rem; margin: 0;">
                                ${this.matchedMovies.length} matched movies
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Filters -->
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; padding: 1.25rem; margin-bottom: 1.5rem;">
                    <h3 style="font-size: 1rem; font-weight: 700; color: white; margin: 0 0 1rem 0;">
                        Filter Matches
                    </h3>
                    
                    <!-- Action Filters -->
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
                        <button class="filter-btn" data-filter="all" style="padding: 0.5rem 1rem; background: ${this.currentFilter === 'all' ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'rgba(255,255,255,0.05)'}; border: 1px solid ${this.currentFilter === 'all' ? '#6366f1' : 'rgba(255,255,255,0.1)'}; border-radius: 0.5rem; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer;">
                            All Matches (${allMatches.length})
                        </button>
                        <button class="filter-btn" data-filter="loved" style="padding: 0.5rem 1rem; background: ${this.currentFilter === 'loved' ? 'linear-gradient(135deg,#ff2e63,#d90062)' : 'rgba(255,255,255,0.05)'}; border: 1px solid ${this.currentFilter === 'loved' ? '#ff2e63' : 'rgba(255,255,255,0.1)'}; border-radius: 0.5rem; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer;">
                            ❤️ Both Loved (10 pts)
                        </button>
                        <button class="filter-btn" data-filter="liked" style="padding: 0.5rem 1rem; background: ${this.currentFilter === 'liked' ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.05)'}; border: 1px solid ${this.currentFilter === 'liked' ? '#10b981' : 'rgba(255,255,255,0.1)'}; border-radius: 0.5rem; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer;">
                            👍 Liked/Loved (6+ pts)
                        </button>
                        <button class="filter-btn" data-filter="maybe" style="padding: 0.5rem 1rem; background: ${this.currentFilter === 'maybe' ? 'linear-gradient(135deg,#fbbf24,#f59e0b)' : 'rgba(255,255,255,0.05)'}; border: 1px solid ${this.currentFilter === 'maybe' ? '#fbbf24' : 'rgba(255,255,255,0.1)'}; border-radius: 0.5rem; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer;">
                            ❓ Maybe (2+ pts)
                        </button>
                    </div>

                    <!-- Score Slider -->
                    <div>
                        <label style="display: block; color: rgba(255,255,255,0.7); font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">
                            Minimum Score: ${this.minScore} points
                        </label>
                        <input type="range" id="score-slider" min="0" max="10" step="1" value="${this.minScore}" 
                               style="width: 100%; accent-color: #6366f1;">
                    </div>
                </div>

                <!-- Spin Wheel Button -->
                ${this.matchedMovies.length > 0 ? `
                    <button id="spin-wheel-btn" style="width: 100%; padding: 1.25rem; background: linear-gradient(135deg,#ec4899,#db2777); border: none; border-radius: 1rem; color: white; font-weight: 700; cursor: pointer; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: center; gap: 0.75rem; transition: transform 0.2s; font-size: 1.125rem;">
                        <span style="font-size: 1.5rem;">🎡</span>
                        <span>Spin the Wheel!</span>
                    </button>
                ` : ''}

                <!-- Matched Movies Grid -->
                ${this.matchedMovies.length === 0 ? `
                    <div style="text-align: center; padding: 3rem 1rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem;">
                        <div style="font-size: 3rem; margin-bottom: 0.5rem;">🎬</div>
                        <p style="color: rgba(255,255,255,0.6); margin: 0;">
                            No matches found with these filters
                        </p>
                    </div>
                ` : `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem;">
                        ${this.matchedMovies.map(match => this.renderMatchCard(match)).join('')}
                    </div>
                `}

            </div>

            ${this.showingWheel ? this.renderSpinWheel() : ''}
        `;

        this.attachMatchesListeners();
    }

    renderMatchCard(match) {
        const posterUrl = match.movie.poster_path || `https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(match.movie.title)}`;
        
        return `
            <div class="match-movie-card" data-movie-id="${match.movie.id}">
                <div style="position: relative; width: 100%; aspect-ratio: 2/3; border-radius: 0.75rem; overflow: hidden; background: rgba(255,255,255,0.05); box-shadow: 0 4px 16px rgba(0,0,0,0.3); transition: transform 0.3s; cursor: pointer;">
                    <img src="${posterUrl}" alt="${match.movie.title}" style="width: 100%; height: 100%; object-fit: cover;"
                         onerror="this.src='https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(match.movie.title)}'">
                    
                    <!-- Score Badge -->
                    <div style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.5rem; background: ${this.getScoreColor(match.totalScore)}; border-radius: 0.75rem; backdrop-filter: blur(10px); box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                        <div style="font-weight: 800; color: white; font-size: 1.125rem; line-height: 1;">${match.totalScore}</div>
                        <div style="font-size: 0.625rem; color: rgba(255,255,255,0.9); text-align: center;">pts</div>
                    </div>

                    <!-- Reactions -->
                    <div style="position: absolute; top: 0.5rem; left: 0.5rem; display: flex; flex-direction: column; gap: 0.25rem;">
                        <div style="padding: 0.25rem 0.5rem; background: rgba(0,0,0,0.7); border-radius: 0.5rem; backdrop-filter: blur(10px);">
                            <span style="font-size: 0.875rem;">${this.getActionEmoji(match.userAction)}</span>
                        </div>
                        <div style="padding: 0.25rem 0.5rem; background: rgba(0,0,0,0.7); border-radius: 0.5rem; backdrop-filter: blur(10px);">
                            <span style="font-size: 0.875rem;">${this.getActionEmoji(match.friendAction)}</span>
                        </div>
                    </div>

                    <!-- Title Overlay -->
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 0.75rem 0.5rem; background: linear-gradient(0deg, rgba(0,0,0,0.9), transparent);">
                        <h3 style="font-size: 0.8125rem; font-weight: 700; color: white; margin: 0; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                            ${match.movie.title}
                        </h3>
                    </div>
                </div>
            </div>
        `;
    }

    getScoreColor(score) {
        if (score >= 10) return 'linear-gradient(135deg, #ff2e63, #d90062)'; // Both loved
        if (score >= 8) return 'linear-gradient(135deg, #ec4899, #db2777)'; // High match
        if (score >= 6) return 'linear-gradient(135deg, #10b981, #059669)'; // Good match
        if (score >= 4) return 'linear-gradient(135deg, #fbbf24, #f59e0b)'; // Decent match
        return 'linear-gradient(135deg, #6b7280, #4b5563)'; // Low match
    }

    renderSpinWheel() {
        return `
            <div id="spin-wheel-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 2rem;">
                <div style="background: linear-gradient(180deg, #1a1a2e 0%, #0a0a0f 100%); border-radius: 2rem; max-width: 500px; width: 100%; padding: 2rem; border: 1px solid rgba(255,255,255,0.1);">
                    
                    <!-- Header -->
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <h2 style="font-size: 1.75rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0;">
                            🎡 Spin the Wheel!
                        </h2>
                        <p style="color: rgba(255,255,255,0.6); font-size: 0.875rem; margin: 0;">
                            Let fate decide your next movie
                        </p>
                    </div>

                    <!-- Wheel Canvas -->
                    <div style="position: relative; margin-bottom: 2rem;">
                        <canvas id="wheel-canvas" width="400" height="400" style="max-width: 100%; display: block; margin: 0 auto;"></canvas>
                        <!-- Pointer -->
                        <div style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); font-size: 2rem;">
                            🔻
                        </div>
                    </div>

                    <!-- Result -->
                    <div id="wheel-result" style="text-align: center; margin-bottom: 2rem; min-height: 60px;">
                        <!-- Result will appear here -->
                    </div>

                    <!-- Buttons -->
                    <div style="display: flex; gap: 1rem;">
                        <button id="spin-btn" style="flex: 1; padding: 1rem; background: linear-gradient(135deg,#ec4899,#db2777); border: none; border-radius: 0.75rem; color: white; font-weight: 700; cursor: pointer; transition: transform 0.2s;">
                            Spin!
                        </button>
                        <button id="close-wheel-btn" style="flex: 1; padding: 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; color: white; font-weight: 600; cursor: pointer;">
                            Close
                        </button>
                    </div>

                </div>
            </div>
        `;
    }

    attachFriendsListeners() {
        // Add Friend
        const addFriendBtn = this.container.querySelector('#add-friend-btn');
        if (addFriendBtn) {
            addFriendBtn.addEventListener('mouseover', () => {
                addFriendBtn.style.transform = 'scale(1.02)';
            });
            addFriendBtn.addEventListener('mouseout', () => {
                addFriendBtn.style.transform = 'scale(1)';
            });
            addFriendBtn.addEventListener('click', () => {
                this.showAddFriendDialog();
            });
        }

        // Create Group
        const createGroupBtn = this.container.querySelector('#create-group-btn');
        if (createGroupBtn) {
            createGroupBtn.addEventListener('click', () => {
                alert('Group feature coming soon! Create groups with multiple friends to find movies everyone loves.');
            });
        }

        // Friend Cards
        this.container.querySelectorAll('.friend-card').forEach(card => {
            card.addEventListener('mouseover', () => {
                card.style.background = 'rgba(255,255,255,0.05)';
                card.style.transform = 'translateX(4px)';
            });
            card.addEventListener('mouseout', () => {
                card.style.background = 'rgba(255,255,255,0.03)';
                card.style.transform = 'translateX(0)';
            });
            card.addEventListener('click', () => {
                const friendId = card.dataset.friendId;
                this.selectedFriend = this.friends.find(f => f.id === friendId);
                this.renderMatchesView();
            });
        });
    }

    attachMatchesListeners() {
        // Back button
        const backBtn = this.container.querySelector('#back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.selectedFriend = null;
                this.renderFriendsList();
            });
        }

        // Filter buttons
        this.container.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentFilter = e.target.dataset.filter;
                this.renderMatchesView();
            });
        });

        // Score slider
        const scoreSlider = this.container.querySelector('#score-slider');
        if (scoreSlider) {
            scoreSlider.addEventListener('input', (e) => {
                this.minScore = parseInt(e.target.value);
                this.renderMatchesView();
            });
        }

        // Spin wheel button
        const spinWheelBtn = this.container.querySelector('#spin-wheel-btn');
        if (spinWheelBtn) {
            spinWheelBtn.addEventListener('mouseover', () => {
                spinWheelBtn.style.transform = 'scale(1.02)';
            });
            spinWheelBtn.addEventListener('mouseout', () => {
                spinWheelBtn.style.transform = 'scale(1)';
            });
            spinWheelBtn.addEventListener('click', () => {
                this.showSpinWheel();
            });
        }

        // Movie cards
        this.container.querySelectorAll('.match-movie-card').forEach(card => {
            card.addEventListener('mouseover', () => {
                card.querySelector('div[style*="cursor: pointer"]').style.transform = 'scale(1.05)';
            });
            card.addEventListener('mouseout', () => {
                card.querySelector('div[style*="cursor: pointer"]').style.transform = 'scale(1)';
            });
            card.addEventListener('click', () => {
                const movieId = parseInt(card.dataset.movieId);
                const match = this.matchedMovies.find(m => m.movie.id === movieId);
                if (match) {
                    movieModal.show(match.movie);
                }
            });
        });

        // Wheel listeners
        this.attachWheelListeners();
    }

    attachWheelListeners() {
        const closeBtn = this.container.querySelector('#close-wheel-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.showingWheel = false;
                this.renderMatchesView();
            });
        }

        const spinBtn = this.container.querySelector('#spin-btn');
        if (spinBtn) {
            spinBtn.addEventListener('click', () => {
                this.spinWheel();
            });
        }

        // Draw initial wheel
        if (this.showingWheel) {
            setTimeout(() => this.drawWheel(), 100);
        }
    }

    showSpinWheel() {
        this.showingWheel = true;
        this.renderMatchesView();
    }

    drawWheel() {
        const canvas = document.getElementById('wheel-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 180;

        // Colors for wheel segments
        const colors = ['#ff2e63', '#10b981', '#fbbf24', '#6366f1', '#ec4899', '#8b5cf6'];

        // Calculate segments
        const movies = this.matchedMovies.slice(0, 8); // Max 8 movies
        const sliceAngle = (2 * Math.PI) / movies.length;

        // Draw segments
        movies.forEach((match, i) => {
            const startAngle = i * sliceAngle;
            const endAngle = (i + 1) * sliceAngle;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.fillStyle = colors[i % colors.length];
            ctx.fill();
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Draw text (movie title)
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(startAngle + sliceAngle / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText(
                match.movie.title.substring(0, 15) + (match.movie.title.length > 15 ? '...' : ''),
                radius - 20,
                5
            );
            ctx.restore();
        });

        // Draw center circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
        ctx.strokeStyle = '#ff2e63';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    spinWheel() {
        const canvas = document.getElementById('wheel-canvas');
        const spinBtn = document.getElementById('spin-btn');
        const resultDiv = document.getElementById('wheel-result');
        
        if (!canvas || !spinBtn) return;

        spinBtn.disabled = true;
        spinBtn.textContent = 'Spinning...';
        resultDiv.innerHTML = '';

        const movies = this.matchedMovies.slice(0, 8);
        const sliceAngle = (2 * Math.PI) / movies.length;
        
        // Random spin (3-5 full rotations + random position)
        const spins = 3 + Math.random() * 2;
        const extraDegrees = Math.random() * 360;
        const totalRotation = spins * 360 + extraDegrees;
        
        // Determine winner
        const finalAngle = (extraDegrees * Math.PI) / 180;
        const winnerIndex = Math.floor(((2 * Math.PI - finalAngle) % (2 * Math.PI)) / sliceAngle);
        const winner = movies[winnerIndex];

        // Animate spin
        let currentRotation = 0;
        const duration = 3000;
        const startTime = Date.now();

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease out)
            const eased = 1 - Math.pow(1 - progress, 3);
            currentRotation = totalRotation * eased;

            // Rotate canvas
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((currentRotation * Math.PI) / 180);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
            this.drawWheel();
            ctx.restore();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Show result
                resultDiv.innerHTML = `
                    <div style="padding: 1rem; background: linear-gradient(135deg,#ff2e63,#d90062); border-radius: 1rem;">
                        <div style="font-size: 1.25rem; font-weight: 800; color: white; margin-bottom: 0.5rem;">
                            🎉 ${winner.movie.title}
                        </div>
                        <div style="font-size: 0.875rem; color: rgba(255,255,255,0.9);">
                            ${winner.movie.year} • Score: ${winner.totalScore} pts
                        </div>
                    </div>
                `;
                spinBtn.disabled = false;
                spinBtn.textContent = 'Spin Again';
            }
        };

        animate();
    }

    showAddFriendDialog() {
        const dialog = document.createElement('div');
        dialog.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 2rem;';
        
        dialog.innerHTML = `
            <div style="background: linear-gradient(180deg, #1a1a2e 0%, #0a0a0f 100%); border-radius: 1.5rem; max-width: 400px; width: 100%; padding: 2rem; border: 1px solid rgba(255,255,255,0.1);">
                <h2 style="font-size: 1.5rem; font-weight: 800; color: white; margin: 0 0 1rem 0;">
                    Add Friend
                </h2>
                <p style="color: rgba(255,255,255,0.6); font-size: 0.875rem; margin: 0 0 1.5rem 0;">
                    Enter your friend's username or friend code
                </p>
                <input type="text" id="friend-code-input" placeholder="@username or friend code" 
                       style="width: 100%; padding: 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; color: white; font-size: 1rem; margin-bottom: 1.5rem;">
                <div style="display: flex; gap: 1rem;">
                    <button id="cancel-add-friend" style="flex: 1; padding: 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; color: white; font-weight: 600; cursor: pointer;">
                        Cancel
                    </button>
                    <button id="confirm-add-friend" style="flex: 1; padding: 1rem; background: linear-gradient(135deg,#10b981,#059669); border: none; border-radius: 0.75rem; color: white; font-weight: 700; cursor: pointer;">
                        Add Friend
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        dialog.querySelector('#cancel-add-friend').addEventListener('click', () => {
            dialog.remove();
        });

        dialog.querySelector('#confirm-add-friend').addEventListener('click', () => {
            const input = dialog.querySelector('#friend-code-input');
            const code = input.value.trim();
            
            if (code) {
                alert(`Friend request sent to ${code}!\n\nNote: This is a demo. In production, this would send a real friend request.`);
                dialog.remove();
            }
        });

        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                dialog.remove();
            }
        });
    }

    destroy() {
        // Cleanup
    }
}
