cat > /home/claude/movie-picker-refactored/scripts/components/match-list.js << 'EOF'
/**
 * MatchList Component
 * Displays group/couple matches
 */

import { sortMatchesByScore, getMatchColor } from '../utils/scoring.js';
import { showConfetti } from '../utils/notifications.js';

export class MatchList {
    constructor(container) {
        this.container = container;
    }
    
    render(matches) {
        if (!matches || matches.length === 0) {
            this.container.innerHTML = this.getEmptyState();
            return;
        }
        
        const sortedMatches = sortMatchesByScore(matches);
        this.container.innerHTML = sortedMatches.map(match => this.getMatchCard(match)).join('');
        
        // Trigger confetti for perfect matches
        const hasPerfectMatch = sortedMatches.some(m => m.matchPercentage === 100);
        if (hasPerfectMatch) {
            setTimeout(showConfetti, 300);
        }
    }
    
    getMatchCard(match) {
        const color = getMatchColor(match.matchPercentage);
        const isPerfect = match.matchPercentage === 100;
        
        return `
            <div class="card ${isPerfect ? 'perfect-match' : ''}" style="margin-bottom: 1rem;">
                <div class="card-header">
                    <div>
                        <h3 class="card-title">${match.movie}</h3>
                        <p class="card-subtitle">${match.platform}</p>
                    </div>
                    <div style="font-size: 2rem; font-weight: 800; color: ${color};">
                        ${match.matchPercentage}%
                    </div>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <p style="font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 0.5rem;">
                        Group Consensus: ${match.loveCount + match.likeCount} / ${match.totalMembers} positive
                    </p>
                    <div style="height: 8px; background-color: var(--color-border); border-radius: 999px; overflow: hidden;">
                        <div style="height: 100%; background: ${color}; width: ${match.matchPercentage}%; transition: width 0.5s ease-out;"></div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    ${match.swipes.map(swipe => this.getSwipeAvatar(swipe)).join('')}
                    ${isPerfect ? '<span style="font-size: 1.5rem;">🎉</span>' : ''}
                </div>
            </div>
        `;
    }
    
    getSwipeAvatar(swipe) {
        const colors = {
            love: 'var(--love-glow)',
            like: 'var(--like-glow)',
            maybe: 'var(--maybe-glow)',
            pass: 'var(--nope-glow)'
        };
        
        return `
            <div 
                style="width: 32px; height: 32px; border-radius: 50%; background-color: ${colors[swipe.action]}; 
                       display: flex; align-items: center; justify-content: center; color: white; 
                       font-size: 0.75rem; font-weight: 700; border: 2px solid var(--color-bg-card);"
                title="${swipe.user}: ${swipe.action.toUpperCase()}">
                ${swipe.user.charAt(0)}
            </div>
        `;
    }
    
    getEmptyState() {
        return `
            <div class="empty-state">
                <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.054-4.312 2.655-.715-1.601-2.377-2.655-4.313-2.655C4.099 3.75 2 5.765 2 8.25c0 7.22 9 12 10 12s10-4.78 10-12z" />
                </svg>
                <h2>No matches yet</h2>
                <p>Keep swiping! Once your friends rate the same movies, perfect matches will appear here.</p>
            </div>
        `;
    }
}
