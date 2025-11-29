/**
 * Matches Tab - PREMIUM VERSION
 * Friend/group selection → Detailed match view with scoring
 */

import { store } from '../state/store.js';
import { movieModal } from '../components/movie-modal.js';
import { getPlatformStyle } from '../utils/scoring.js';

export class MatchesTab {
    constructor(container) {
        this.container = container;
        this.currentView = 'selection'; // 'selection' or 'matches'
        this.selectedGroup = null;
    }
    
    render() {
        if (this.currentView === 'selection') {
            this.renderSelection();
        } else {
            this.renderMatches();
        }
    }
    
    renderSelection() {
        const userId = store.get('userId');
        const groups = store.get('groups') || [];
        const friends = store.get('friends') || [];
        
        this.container.innerHTML = `
            <div style="background: linear-gradient(180deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%); min-height: 100vh; padding-bottom: 100px;">
                
                <!-- Header -->
                <div style="padding: 2rem 1.5rem 1rem; background: linear-gradient(135deg, rgba(255, 46, 99, 0.15), rgba(139, 92, 246, 0.1)); border-bottom: 1px solid rgba(255, 46, 99, 0.2);">
                    <h1 style="font-size: 2rem; font-weight: 800; margin: 0 0 0.5rem 0; background: linear-gradient(135deg, #fff, #ff2e63); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                        Find Matches
                    </h1>
                    <p style="color: rgba(255, 255, 255, 0.6); margin: 0; font-size: 0.875rem;">
                        Compare your movie tastes with friends or groups
                    </p>
                </div>
                
                <!-- Groups Section -->
                ${groups.length > 0 ? `
                    <div style="padding: 2rem 1.5rem 1rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                            <div style="width: 4px; height: 24px; background: linear-gradient(180deg, #8b5cf6, #ec4899); border-radius: 2px;"></div>
                            <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0;">
                                Your Groups
                            </h2>
                            <span style="padding: 0.25rem 0.75rem; background: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.4); border-radius: 0.5rem; font-size: 0.75rem; font-weight: 700; color: #a78bfa; margin-left: auto;">
                                ${groups.length}
                            </span>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            ${groups.map(group => this.renderGroupCard(group)).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Friends Section -->
                ${friends.length > 0 ? `
                    <div style="padding: 2rem 1.5rem 1rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                            <div style="width: 4px; height: 24px; background: linear-gradient(180deg, #ff2e63, #ff9900); border-radius: 2px;"></div>
                            <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0;">
                                Your Friends
                            </h2>
                            <span style="padding: 0.25rem 0.75rem; background: rgba(255, 46, 99, 0.2); border: 1px solid rgba(255, 46, 99, 0.4); border-radius: 0.5rem; font-size: 0.75rem; font-weight: 700; color: #ff2e63; margin-left: auto;">
                                ${friends.length}
                            </span>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                            ${friends.map(friend => this.renderFriendCard(friend)).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Empty State -->
                ${groups.length === 0 && friends.length === 0 ? `
                    <div class="empty-state" style="padding: 4rem 2rem; text-align: center;">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 80px; height: 80px; margin: 0 auto 1.5rem; color: rgba(255, 46, 99, 0.5);">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                        </svg>
                        <h2 style="font-size: 1.5rem; font-weight: 700; color: white; margin-bottom: 0.5rem;">No Groups or Friends Yet</h2>
                        <p style="color: rgba(255, 255, 255, 0.6); margin-bottom: 2rem; max-width: 300px; margin-left: auto; margin-right: auto;">
                            Create a group or add friends to find movie matches together!
                        </p>
                        <div style="display: flex; gap: 1rem; justify-content: center;">
                            <button class="btn btn-primary" id="create-group-btn" style="padding: 1rem 2rem;">
                                Create Group
                            </button>
                            <button class="btn btn-secondary" id="add-friend-btn" style="padding: 1rem 2rem;">
                                Add Friend
                            </button>
                        </div>
                    </div>
                ` : ''}
                
                <!-- Demo Data Button (for testing) -->
                <div style="padding: 1rem 1.5rem;">
                    <button class="btn" id="load-demo-btn" style="width: 100%; padding: 1rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.6); font-size: 0.875rem;">
                        Load Demo Friends & Groups
                    </button>
                </div>
            </div>
        `;
        
        this.attachSelectionListeners();
    }
    
    renderGroupCard(group) {
        const memberCount = group.members?.length || 0;
        const matchCount = group.matchCount || 0;
        
        return `
            <div class="group-card" data-group-id="${group.id}" style="backdrop-filter: blur(10px); background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1)); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 1.5rem; padding: 1.5rem; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);" onmouseover="this.style.transform='translateY(-4px)'; this.style.borderColor='rgba(139, 92, 246, 0.5)'" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='rgba(139, 92, 246, 0.3)'">
                <div style="display: flex; align-items: start; gap: 1rem; margin-bottom: 1rem;">
                    <div style="width: 64px; height: 64px; border-radius: 1rem; background: linear-gradient(135deg, #8b5cf6, #ec4899); display: flex; align-items: center; justify-content: center; font-size: 2rem; flex-shrink: 0; box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);">
                        ${group.emoji || '🎬'}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <h3 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0 0 0.5rem 0;">
                            ${group.name}
                        </h3>
                        <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 16px; height: 16px; color: rgba(255, 255, 255, 0.6);">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                                </svg>
                                <span style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.8);">${memberCount} members</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 16px; height: 16px; color: #10b981;">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span style="font-size: 0.875rem; color: #10b981; font-weight: 600;">${matchCount} matches</span>
                            </div>
                        </div>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 24px; height: 24px; color: rgba(255, 255, 255, 0.4); flex-shrink: 0;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                </div>
                ${group.description ? `
                    <p style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.6); margin: 0; line-height: 1.5;">
                        ${group.description}
                    </p>
                ` : ''}
            </div>
        `;
    }
    
    renderFriendCard(friend) {
        const matchCount = friend.matchCount || 0;
        const compatibility = friend.compatibility || 0;
        
        return `
            <div class="friend-card" data-friend-id="${friend.id}" style="backdrop-filter: blur(10px); background: linear-gradient(135deg, rgba(255, 46, 99, 0.1), rgba(255, 153, 0, 0.1)); border: 1px solid rgba(255, 46, 99, 0.3); border-radius: 1.5rem; padding: 1.5rem; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);" onmouseover="this.style.transform='translateY(-4px)'; this.style.borderColor='rgba(255, 46, 99, 0.5)'" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='rgba(255, 46, 99, 0.3)'">
                <div style="text-align: center;">
                    <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #ff2e63, #ff9900); margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; box-shadow: 0 8px 24px rgba(255, 46, 99, 0.4); border: 3px solid rgba(255, 255, 255, 0.1);">
                        ${friend.avatar || '👤'}
                    </div>
                    <h3 style="font-size: 1.125rem; font-weight: 700; color: white; margin: 0 0 0.5rem 0;">
                        ${friend.name}
                    </h3>
                    <div style="margin-bottom: 1rem;">
                        <div style="display: inline-block; padding: 0.25rem 0.75rem; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 0.5rem; font-size: 0.75rem; font-weight: 700; color: #10b981;">
                            ${compatibility}% compatible
                        </div>
                    </div>
                    <div style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.6);">
                        ${matchCount} movie matches
                    </div>
                </div>
            </div>
        `;
    }
    
    renderMatches() {
        const group = this.selectedGroup;
        const movies = store.get('movies');
        const swipeHistory = store.get('swipeHistory');
        
        // Calculate matches based on group members
        const matches = this.calculateMatches(group, movies, swipeHistory);
        
        this.container.innerHTML = `
            <div style="background: linear-gradient(180deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%); min-height: 100vh; padding-bottom: 100px;">
                
                <!-- Header with Back Button -->
                <div style="padding: 1.5rem; background: linear-gradient(135deg, rgba(255, 46, 99, 0.15), rgba(139, 92, 246, 0.1)); border-bottom: 1px solid rgba(255, 46, 99, 0.2);">
                    <button id="back-btn" style="background: none; border: none; padding: 0.5rem; margin: -0.5rem 0 1rem -0.5rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; color: rgba(255, 255, 255, 0.8); transition: color 0.3s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='rgba(255, 255, 255, 0.8)'">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 20px; height: 20px;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                        <span style="font-size: 0.875rem; font-weight: 600;">Back</span>
                    </button>
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
                        <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #ff2e63, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 2rem; flex-shrink: 0; box-shadow: 0 8px 24px rgba(255, 46, 99, 0.4);">
                            ${group.emoji || group.avatar || '🎬'}
                        </div>
                        <div style="flex: 1;">
                            <h1 style="font-size: 1.5rem; font-weight: 800; margin: 0 0 0.25rem 0; color: white;">
                                ${group.name}
                            </h1>
                            <p style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.6); margin: 0;">
                                ${matches.length} movie matches found
                            </p>
                        </div>
                    </div>
                </div>
                
                <!-- Match Stats -->
                <div style="padding: 1.5rem; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                    ${this.renderMatchStats(matches)}
                </div>
                
                <!-- Matches List -->
                <div style="padding: 0 1.5rem 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                        <div style="width: 4px; height: 24px; background: linear-gradient(180deg, #10b981, #059669); border-radius: 2px;"></div>
                        <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0;">
                            Perfect Matches
                        </h2>
                    </div>
                    ${matches.length > 0 ? `
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            ${matches.map((match, index) => this.renderMatchCard(match, index)).join('')}
                        </div>
                    ` : `
                        <div class="empty-state" style="padding: 3rem 2rem; text-align: center; background: rgba(255, 255, 255, 0.02); border-radius: 1.5rem; border: 1px solid rgba(255, 255, 255, 0.05);">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 64px; height: 64px; margin: 0 auto 1rem; color: rgba(255, 255, 255, 0.3);">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                            </svg>
                            <h3 style="font-size: 1.25rem; font-weight: 700; color: white; margin-bottom: 0.5rem;">No Matches Yet</h3>
                            <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.875rem;">
                                Keep swiping to find movies you all love!
                            </p>
                        </div>
                    `}
                </div>
            </div>
        `;
        
        this.attachMatchesListeners();
    }
    
    renderMatchStats(matches) {
        const perfectMatches = matches.filter(m => m.consensusPercent === 100).length;
        const avgScore = matches.length > 0 
            ? (matches.reduce((sum, m) => sum + m.totalScore, 0) / matches.length).toFixed(1)
            : '0.0';
        const totalLoved = matches.filter(m => m.hasLove).length;
        
        return `
            <div style="backdrop-filter: blur(10px); background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15)); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 1rem; padding: 1rem; text-align: center;">
                <div style="font-size: 2rem; font-weight: 800; background: linear-gradient(135deg, #10b981, #059669); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 0.25rem;">
                    ${perfectMatches}
                </div>
                <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.7); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">
                    100% Match
                </div>
            </div>
            <div style="backdrop-filter: blur(10px); background: linear-gradient(135deg, rgba(255, 46, 99, 0.15), rgba(217, 0, 98, 0.15)); border: 1px solid rgba(255, 46, 99, 0.3); border-radius: 1rem; padding: 1rem; text-align: center;">
                <div style="font-size: 2rem; font-weight: 800; background: linear-gradient(135deg, #ff006e, #d90062); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 0.25rem;">
                    ${totalLoved}
                </div>
                <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.7); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">
                    Loved
                </div>
            </div>
            <div style="backdrop-filter: blur(10px); background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.15)); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 1rem; padding: 1rem; text-align: center;">
                <div style="font-size: 2rem; font-weight: 800; background: linear-gradient(135deg, #fbbf24, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 0.25rem;">
                    ${avgScore}
                </div>
                <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.7); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">
                    Avg Score
                </div>
            </div>
        `;
    }
    
    renderMatchCard(match, index) {
        const { icon, color } = getPlatformStyle(match.movie.platform);
        const posterUrl = match.movie.poster_path || `https://placehold.co/160x240/${color.replace('#', '')}/ffffff?text=${encodeURIComponent(match.movie.title)}`;
        
        const rankColors = [
            'linear-gradient(135deg, #fbbf24, #f59e0b)', // Gold
            'linear-gradient(135deg, #d1d5db, #9ca3af)', // Silver
            'linear-gradient(135deg, #f97316, #ea580c)'  // Bronze
        ];
        const rankColor = index < 3 ? rankColors[index] : 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
        
        return `
            <div class="match-card" data-movie-id="${match.movie.id}" style="backdrop-filter: blur(10px); background: rgba(255, 255, 255, 0.02); border: 1px solid ${match.consensusPercent === 100 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255, 255, 255, 0.05)'}; border-radius: 1.5rem; padding: 1rem; cursor: pointer; transition: all 0.3s; box-shadow: ${match.consensusPercent === 100 ? '0 8px 32px rgba(16, 185, 129, 0.3)' : '0 4px 16px rgba(0, 0, 0, 0.2)'};" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
                <div style="display: flex; gap: 1rem;">
                    <!-- Rank Badge -->
                    <div style="width: 48px; height: 48px; border-radius: 50%; background: ${rankColor}; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 800; color: white; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); align-self: center;">
                        ${index + 1}
                    </div>
                    
                    <!-- Poster -->
                    <div style="width: 80px; height: 120px; border-radius: 0.75rem; overflow: hidden; background: ${color}; flex-shrink: 0; position: relative; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);">
                        <img 
                            src="${posterUrl}" 
                            alt="${match.movie.title}"
                            style="width: 100%; height: 100%; object-fit: cover;"
                            onerror="this.style.display='none'"
                        >
                        ${match.consensusPercent === 100 ? `
                            <div style="position: absolute; top: 0.25rem; right: 0.25rem; width: 24px; height: 24px; border-radius: 50%; background: #10b981; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" style="width: 14px; height: 14px; color: white;">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Info -->
                    <div style="flex: 1; min-width: 0;">
                        <h3 style="font-size: 1rem; font-weight: 700; color: white; margin: 0 0 0.5rem 0;">
                            ${match.movie.title}
                        </h3>
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap;">
                            <span style="padding: 0.25rem 0.75rem; background: rgba(251, 191, 36, 0.2); border: 1px solid rgba(251, 191, 36, 0.4); border-radius: 0.5rem; font-size: 0.75rem; font-weight: 700; color: #fbbf24;">
                                ⭐ ${match.movie.imdb}
                            </span>
                            <span style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.5);">${match.movie.year}</span>
                            <div style="width: 20px; height: 20px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; font-size: 0.625rem; color: white; font-weight: 800;">${icon}</div>
                        </div>
                        
                        <!-- Consensus Bar -->
                        <div style="margin-bottom: 0.75rem;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem;">
                                <span style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.7); font-weight: 600;">Consensus</span>
                                <span style="font-size: 0.75rem; font-weight: 700; color: ${match.consensusPercent >= 80 ? '#10b981' : match.consensusPercent >= 60 ? '#fbbf24' : '#ff9900'};">
                                    ${match.consensusPercent}%
                                </span>
                            </div>
                            <div style="width: 100%; height: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 4px; overflow: hidden;">
                                <div style="width: ${match.consensusPercent}%; height: 100%; background: linear-gradient(90deg, ${match.consensusPercent >= 80 ? '#10b981, #059669' : match.consensusPercent >= 60 ? '#fbbf24, #f59e0b' : '#ff9900, #ff2e63'}); transition: width 0.3s;"></div>
                            </div>
                        </div>
                        
                        <!-- Swipe Avatars -->
                        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                            ${match.swipes.map(swipe => `
                                <div style="display: flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.5rem; background: ${this.getSwipeColor(swipe.action)}; border-radius: 0.5rem; font-size: 0.625rem; font-weight: 700; color: white; text-transform: uppercase;">
                                    <span>${swipe.user.avatar || '👤'}</span>
                                    <span>${swipe.action}</span>
                                </div>
                            `).join('')}
                        </div>
                        
                        <!-- Total Score -->
                        <div style="margin-top: 0.75rem; padding: 0.5rem 0.75rem; background: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.4); border-radius: 0.5rem; display: inline-block;">
                            <span style="font-size: 0.75rem; color: #a78bfa; font-weight: 700;">Score: ${match.totalScore.toFixed(1)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    calculateMatches(group, movies, swipeHistory) {
        // Simulate group matches based on swipe history
        const userSwipes = swipeHistory.filter(s => ['love', 'like'].includes(s.action));
        
        // Create matches with scoring
        const matches = userSwipes.map(swipe => {
            // Simulate group member swipes
            const groupSwipes = group.members?.map(member => ({
                user: member,
                action: Math.random() > 0.3 ? 'love' : Math.random() > 0.5 ? 'like' : 'maybe'
            })) || [];
            
            // Add user's swipe
            groupSwipes.push({
                user: { id: store.get('userId'), name: 'You', avatar: '😊' },
                action: swipe.action
            });
            
            // Calculate scores
            const scores = groupSwipes.map(s => {
                if (s.action === 'love') return 3;
                if (s.action === 'like') return 2;
                if (s.action === 'maybe') return 1;
                return 0;
            });
            
            const totalScore = scores.reduce((sum, s) => sum + s, 0);
            const maxScore = groupSwipes.length * 3;
            const consensusPercent = Math.round((totalScore / maxScore) * 100);
            
            return {
                movie: swipe.movie,
                swipes: groupSwipes,
                totalScore,
                consensusPercent,
                hasLove: groupSwipes.some(s => s.action === 'love')
            };
        });
        
        // Sort by score
        return matches
            .filter(m => m.consensusPercent >= 50) // Only show 50%+ matches
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, 20); // Top 20 matches
    }
    
    getSwipeColor(action) {
        const colors = {
            love: 'rgba(255, 0, 110, 0.8)',
            like: 'rgba(16, 185, 129, 0.8)',
            maybe: 'rgba(251, 191, 36, 0.8)',
            pass: 'rgba(239, 68, 68, 0.8)'
        };
        return colors[action] || 'rgba(100, 100, 100, 0.8)';
    }
    
    attachSelectionListeners() {
        // Group cards
        const groupCards = this.container.querySelectorAll('.group-card');
        groupCards.forEach(card => {
            card.addEventListener('click', () => {
                const groupId = card.dataset.groupId;
                const groups = store.get('groups') || [];
                this.selectedGroup = groups.find(g => g.id === groupId);
                this.currentView = 'matches';
                this.render();
            });
        });
        
        // Friend cards
        const friendCards = this.container.querySelectorAll('.friend-card');
        friendCards.forEach(card => {
            card.addEventListener('click', () => {
                const friendId = card.dataset.friendId;
                const friends = store.get('friends') || [];
                const friend = friends.find(f => f.id === friendId);
                // Convert friend to group format
                this.selectedGroup = {
                    id: friendId,
                    name: friend.name,
                    avatar: friend.avatar,
                    members: [friend]
                };
                this.currentView = 'matches';
                this.render();
            });
        });
        
        // Demo data button
        const demoBtn = this.container.querySelector('#load-demo-btn');
        if (demoBtn) {
            demoBtn.addEventListener('click', () => {
                this.loadDemoData();
            });
        }
        
        // Create group/add friend buttons
        const createGroupBtn = this.container.querySelector('#create-group-btn');
        const addFriendBtn = this.container.querySelector('#add-friend-btn');
        
        if (createGroupBtn) {
            createGroupBtn.addEventListener('click', () => {
                alert('Group creation feature coming soon!');
            });
        }
        
        if (addFriendBtn) {
            addFriendBtn.addEventListener('click', () => {
                alert('Add friend feature coming soon!');
            });
        }
    }
    
    attachMatchesListeners() {
        // Back button
        const backBtn = this.container.querySelector('#back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.currentView = 'selection';
                this.selectedGroup = null;
                this.render();
            });
        }
        
        // Movie cards
        const movieCards = this.container.querySelectorAll('.match-card');
        movieCards.forEach(card => {
            card.addEventListener('click', () => {
                const movieId = card.dataset.movieId;
                const movies = store.get('movies');
                const movie = movies.find(m => m.id === movieId);
                if (movie) {
                    movieModal.show(movie);
                }
            });
        });
    }
    
    loadDemoData() {
        // Create demo groups
        const demoGroups = [
            {
                id: 'group1',
                name: 'Movie Night Crew',
                emoji: '🍿',
                description: 'Friday night movie watchers',
                members: [
                    { id: 'user1', name: 'Sarah', avatar: '👩' },
                    { id: 'user2', name: 'Mike', avatar: '👨' },
                    { id: 'user3', name: 'Emma', avatar: '👧' }
                ],
                matchCount: 12
            },
            {
                id: 'group2',
                name: 'Sci-Fi Fans',
                emoji: '🚀',
                description: 'Love space, time travel, and aliens',
                members: [
                    { id: 'user4', name: 'Alex', avatar: '🧑' },
                    { id: 'user5', name: 'Chris', avatar: '👨‍🦱' }
                ],
                matchCount: 8
            }
        ];
        
        // Create demo friends
        const demoFriends = [
            { id: 'friend1', name: 'Jessica', avatar: '👩‍🦰', matchCount: 15, compatibility: 87 },
            { id: 'friend2', name: 'David', avatar: '👨‍🦲', matchCount: 11, compatibility: 72 },
            { id: 'friend3', name: 'Lisa', avatar: '👩‍🦳', matchCount: 9, compatibility: 68 },
            { id: 'friend4', name: 'Tom', avatar: '👨‍🦳', matchCount: 6, compatibility: 54 }
        ];
        
        // Save to store
        if (typeof store.set === 'function') {
            store.set('groups', demoGroups);
            store.set('friends', demoFriends);
        } else {
            // Fallback if set doesn't exist
            store.data = store.data || {};
            store.data.groups = demoGroups;
            store.data.friends = demoFriends;
        }
        
        this.render();
    }
    
    destroy() {
        this.currentView = 'selection';
        this.selectedGroup = null;
    }
}
