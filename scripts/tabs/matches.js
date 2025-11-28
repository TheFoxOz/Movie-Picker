/**
 * Matches Tab
 * Display group and couple matches
 */

import { store } from '../state/store.js';
import { MatchList } from '../components/match-list.js';
import { sortMatchesByScore } from '../utils/scoring.js';

// Mock match data (would come from Firebase in production)
const MOCK_GROUP_DATA = {
    "Alex K. (Couple)": [
        {
            movie: "Perfect Match Movie",
            swipes: [
                { user: "You", action: "love" },
                { user: "Alex K.", action: "love" }
            ],
            totalMembers: 2,
            platform: "Hulu",
            status: "Available tonight"
        },
        {
            movie: "High Score Hit",
            swipes: [
                { user: "You", action: "love" },
                { user: "Alex K.", action: "like" }
            ],
            totalMembers: 2,
            platform: "Netflix",
            status: "Busy until 8 PM"
        },
        {
            movie: "Middle Ground Film",
            swipes: [
                { user: "You", action: "like" },
                { user: "Alex K.", action: "maybe" }
            ],
            totalMembers: 2,
            platform: "Prime Video"
        }
    ],
    "Sarah J. (Friend)": [
        {
            movie: "Controversial Hit",
            swipes: [
                { user: "You", action: "love" },
                { user: "Sarah J.", action: "pass" }
            ],
            totalMembers: 2,
            platform: "Max (HBO)"
        },
        {
            movie: "Solid Choice",
            swipes: [
                { user: "You", action: "like" },
                { user: "Sarah J.", action: "like" }
            ],
            totalMembers: 2,
            platform: "Hulu"
        }
    ],
    "The Squad (5 Members)": [
        {
            movie: "Group Favorite",
            swipes: [
                { user: "You", action: "love" },
                { user: "Tom", action: "love" },
                { user: "Jess", action: "love" },
                { user: "Mike", action: "love" },
                { user: "Alex", action: "pass" }
            ],
            totalMembers: 5,
            platform: "Max (HBO)"
        },
        {
            movie: "Action Protocol 7",
            swipes: [
                { user: "You", action: "like" },
                { user: "Tom", action: "like" },
                { user: "Jess", action: "like" },
                { user: "Mike", action: "like" },
                { user: "Alex", action: "like" }
            ],
            totalMembers: 5,
            platform: "Hulu"
        },
        {
            movie: "Drama Series",
            swipes: [
                { user: "You", action: "maybe" },
                { user: "Tom", action: "like" },
                { user: "Jess", action: "maybe" },
                { user: "Mike", action: "pass" },
                { user: "Alex", action: "maybe" }
            ],
            totalMembers: 5,
            platform: "Netflix"
        }
    ]
};

export class MatchesTab {
    constructor(container) {
        this.container = container;
        this.matchList = null;
        this.selectedGroup = "Alex K. (Couple)";
    }
    
    render() {
        const groups = Object.keys(MOCK_GROUP_DATA);
        
        this.container.innerHTML = `
            <div class="container" style="padding: 1.5rem;">
                <!-- Header -->
                <h1 style="margin-bottom: 0.5rem;">Group & Couple Matches</h1>
                <p style="color: var(--color-text-secondary); margin-bottom: 1.5rem;">
                    Movies you and your friends both love
                </p>
                
                <!-- Group Selector -->
                <div style="margin-bottom: 1.5rem;">
                    <h2 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem;">Select Watch Group</h2>
                    <div id="group-selector" style="display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.5rem;">
                        ${groups.map(group => `
                            <button 
                                class="group-selector-btn ${group === this.selectedGroup ? 'active' : ''}" 
                                data-group="${group}"
                                style="flex-shrink: 0; padding: 0.5rem 1rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 600; transition: all 0.2s; white-space: nowrap; ${group === this.selectedGroup ? 'background: var(--color-primary); color: white;' : 'background: var(--color-bg-card); color: var(--color-text-secondary); border: 1px solid var(--color-border);'}">
                                ${group}
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Matches Info -->
                <div style="background: var(--color-bg-elevated); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1rem; margin-bottom: 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px; color: var(--color-primary);">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                        </svg>
                        <h3 style="font-size: 0.875rem; font-weight: 600;">How Matches Work</h3>
                    </div>
                    <p style="font-size: 0.75rem; color: var(--color-text-secondary); line-height: 1.5;">
                        Matches are ranked by score: <strong style="color: var(--love-glow);">Love (4)</strong>, <strong style="color: var(--like-glow);">Like (3)</strong>, <strong style="color: var(--maybe-glow);">Maybe (1)</strong>, <strong style="color: var(--nope-glow);">Pass (0)</strong>. Perfect matches (100%) trigger confetti! 🎉
                    </p>
                </div>
                
                <!-- Match List Container -->
                <div id="match-container"></div>
                
                <!-- Add Group CTA -->
                <div style="text-align: center; margin-top: 2rem; padding: 2rem; background: var(--color-bg-elevated); border: 2px dashed var(--color-border); border-radius: 1rem;">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 48px; height: 48px; margin: 0 auto 1rem; color: var(--color-text-secondary);">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                    <h3 style="font-size: 1.125rem; margin-bottom: 0.5rem;">Invite Friends</h3>
                    <p style="font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 1rem;">
                        Create a new watch group and invite friends to find matches together
                    </p>
                    <button class="btn btn-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <span>Create Group</span>
                    </button>
                </div>
            </div>
        `;
        
        this.renderMatches();
        this.attachListeners();
    }
    
    renderMatches() {
        const matchContainer = document.getElementById('match-container');
        if (!matchContainer) return;
        
        const matches = MOCK_GROUP_DATA[this.selectedGroup] || [];
        
        // Use MatchList component
        this.matchList = new MatchList(matchContainer);
        this.matchList.render(matches);
    }
    
    attachListeners() {
        // Group selector buttons
        const groupButtons = this.container.querySelectorAll('.group-selector-btn');
        groupButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.selectedGroup = button.dataset.group;
                
                // Update active state
                groupButtons.forEach(btn => {
                    const isActive = btn.dataset.group === this.selectedGroup;
                    btn.classList.toggle('active', isActive);
                    
                    if (isActive) {
                        btn.style.background = 'var(--color-primary)';
                        btn.style.color = 'white';
                        btn.style.border = 'none';
                    } else {
                        btn.style.background = 'var(--color-bg-card)';
                        btn.style.color = 'var(--color-text-secondary)';
                        btn.style.border = '1px solid var(--color-border)';
                    }
                });
                
                // Re-render matches
                this.renderMatches();
            });
        });
    }
    
    destroy() {
        // Cleanup if needed
        this.matchList = null;
    }
}
