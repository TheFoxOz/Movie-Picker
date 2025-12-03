/**
 * Profile Tab Component
 * User profile, stats, and settings
 */

import { store } from '../state/store.js';
import { authService } from '../services/auth-service.js';
import { showToast, showSuccess, showError } from '../utils/notifications.js';
import { ENV } from '../config/env.js';

export class ProfileTab {
    constructor() {
        this.container = null;
    }
    
    render(container) {
        this.container = container;
        
        const state = store.getState();
        const isAuthenticated = state.isAuthenticated || false;
        
        if (isAuthenticated) {
            this.renderAuthenticatedProfile(state);
        } else {
            this.renderUnauthenticatedProfile();
        }
    }
    
    renderUnauthenticatedProfile() {
        this.container.innerHTML = `
            <div style="padding: 1.5rem 1rem 6rem;">
                <h1 style="font-size: 1.75rem; font-weight: 800; color: white; margin: 0 0 1.5rem 0;">
                    👤 Profile
                </h1>
                
                <!-- Sign In Prompt -->
                <div style="text-align: center; padding: 3rem 2rem; background: rgba(255, 255, 255, 0.05); border-radius: 1.5rem; border: 1px solid rgba(255, 255, 255, 0.1);">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🔒</div>
                    <h2 style="font-size: 1.5rem; font-weight: 700; color: white; margin: 0 0 0.5rem 0;">Sign In Required</h2>
                    <p style="color: rgba(255, 255, 255, 0.6); margin: 0 0 2rem 0; font-size: 0.875rem;">
                        Sign in to sync your swipes, add friends, and create groups!
                    </p>
                    <button id="goto-signin" style="padding: 1rem 2rem; background: linear-gradient(135deg, #ff2e63, #d90062); border: none; border-radius: 1rem; color: white; font-size: 1rem; font-weight: 700; cursor: pointer; transition: transform 0.3s; box-shadow: 0 8px 24px rgba(255, 46, 99, 0.4);" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        Sign In / Sign Up
                    </button>
                </div>
                
                <!-- Guest Stats -->
                <section style="margin-top: 2rem;">
                    <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0 0 1rem 0;">
                        📊 Your Stats (Guest Mode)
                    </h2>
                    ${this.renderStats()}
                </section>
            </div>
        `;
        
        // Attach listener
        const signinBtn = this.container.querySelector('#goto-signin');
        if (signinBtn) {
            signinBtn.addEventListener('click', () => {
                window.location.href = '/auth.html';
            });
        }
    }
    
    renderAuthenticatedProfile(state) {
        const swipeCount = (state.swipeHistory || []).length;
        const level = Math.floor(swipeCount / 10) + 1;
        
        this.container.innerHTML = `
            <div style="padding: 1.5rem 1rem 6rem;">
                
                <!-- User Header -->
                <div style="text-align: center; padding: 2rem 1rem; background: linear-gradient(135deg, rgba(255, 46, 99, 0.1), rgba(139, 92, 246, 0.1)); border-radius: 1.5rem; margin-bottom: 2rem; border: 1px solid rgba(255, 46, 99, 0.2);">
                    <div style="width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, #ff2e63, #8b5cf6); margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 3rem; border: 4px solid rgba(255, 255, 255, 0.1); box-shadow: 0 8px 24px rgba(255, 46, 99, 0.4);">
                        😊
                    </div>
                    <h1 style="font-size: 1.5rem; font-weight: 800; color: white; margin: 0 0 0.25rem 0;">
                        ${state.userName || 'User'}
                    </h1>
                    <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.875rem; margin: 0 0 1rem 0;">
                        ${state.userEmail || ''}
                    </p>
                    <div style="display: inline-block; padding: 0.5rem 1rem; background: rgba(251, 191, 36, 0.2); border: 1px solid rgba(251, 191, 36, 0.4); border-radius: 0.75rem;">
                        <span style="font-size: 0.875rem; font-weight: 700; color: #fbbf24;">Level ${level} ⭐</span>
                    </div>
                </div>
                
                <!-- Stats -->
                <section style="margin-bottom: 2rem;">
                    <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0 0 1rem 0;">
                        📊 Your Stats
                    </h2>
                    ${this.renderStats()}
                </section>
                
                <!-- Friends Section -->
                <section style="margin-bottom: 2rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                        <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0;">
                            👥 Friends
                        </h2>
                        <button id="add-friend-btn" style="padding: 0.5rem 1rem; background: rgba(255, 46, 99, 0.2); border: 1px solid rgba(255, 46, 99, 0.4); border-radius: 0.5rem; color: #ff2e63; font-size: 0.875rem; font-weight: 600; cursor: pointer;">
                            + Add Friend
                        </button>
                    </div>
                    <div style="padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 1rem; border: 1px solid rgba(255, 255, 255, 0.1);">
                        <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.875rem; margin: 0; text-align: center;">
                            ${(state.friends || []).length} friends
                        </p>
                    </div>
                </section>
                
                <!-- Groups Section -->
                <section style="margin-bottom: 2rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                        <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0;">
                            🎬 Groups
                        </h2>
                        <button id="create-group-btn" style="padding: 0.5rem 1rem; background: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.4); border-radius: 0.5rem; color: #a78bfa; font-size: 0.875rem; font-weight: 600; cursor: pointer;">
                            + Create Group
                        </button>
                    </div>
                    <div style="padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 1rem; border: 1px solid rgba(255, 255, 255, 0.1);">
                        <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.875rem; margin: 0; text-align: center;">
                            ${(state.groups || []).length} groups
                        </p>
                    </div>
                </section>
                
                <!-- Preferences -->
                <section style="margin-bottom: 2rem;">
                    <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0 0 1rem 0;">
                        ⚙️ Preferences
                    </h2>
                    ${this.renderPreferences()}
                </section>
                
                <!-- Actions -->
                <section style="margin-bottom: 2rem;">
                    <h2 style="font-size: 1.25rem; font-weight: 700; color: white; margin: 0 0 1rem 0;">
                        🔧 Actions
                    </h2>
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <button id="export-data-btn" style="padding: 1rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 0.75rem; color: white; font-weight: 600; cursor: pointer; text-align: left;">
                            📥 Export My Data
                        </button>
                        <button id="clear-history-btn" style="padding: 1rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 0.75rem; color: #ef4444; font-weight: 600; cursor: pointer; text-align: left;">
                            🗑️ Clear History
                        </button>
                        <button id="signout-btn" style="padding: 1rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 0.75rem; color: white; font-weight: 600; cursor: pointer; text-align: left;">
                            🚪 Sign Out
                        </button>
                    </div>
                </section>
            </div>
        `;
        
        this.attachAuthenticatedListeners();
    }
    
    renderStats() {
        const state = store.getState();
        const swipeHistory = state.swipeHistory || [];
        
        const stats = {
            total: swipeHistory.length,
            loved: swipeHistory.filter(s => s.action === 'love').length,
            liked: swipeHistory.filter(s => s.action === 'like').length,
            maybe: swipeHistory.filter(s => s.action === 'maybe').length,
            passed: swipeHistory.filter(s => s.action === 'pass').length
        };
        
        return `
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div style="padding: 1.5rem 1rem; background: rgba(255, 46, 99, 0.1); border: 1px solid rgba(255, 46, 99, 0.3); border-radius: 1rem; text-align: center;">
                    <div style="font-size: 2rem; font-weight: 800; color: #ff2e63; margin-bottom: 0.25rem;">
                        ${stats.total}
                    </div>
                    <div style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.7); font-weight: 600;">
                        Total Swipes
                    </div>
                </div>
                
                <div style="padding: 1.5rem 1rem; background: rgba(255, 0, 110, 0.1); border: 1px solid rgba(255, 0, 110, 0.3); border-radius: 1rem; text-align: center;">
                    <div style="font-size: 2rem; font-weight: 800; color: #ff006e; margin-bottom: 0.25rem;">
                        ${stats.loved}
                    </div>
                    <div style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.7); font-weight: 600;">
                        ❤️ Loved
                    </div>
                </div>
                
                <div style="padding: 1.5rem 1rem; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 1rem; text-align: center;">
                    <div style="font-size: 2rem; font-weight: 800; color: #10b981; margin-bottom: 0.25rem;">
                        ${stats.liked}
                    </div>
                    <div style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.7); font-weight: 600;">
                        👍 Liked
                    </div>
                </div>
                
                <div style="padding: 1.5rem 1rem; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 1rem; text-align: center;">
                    <div style="font-size: 2rem; font-weight: 800; color: #fbbf24; margin-bottom: 0.25rem;">
                        ${stats.maybe}
                    </div>
                    <div style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.7); font-weight: 600;">
                        🤔 Maybe
                    </div>
                </div>
            </div>
        `;
    }
    
    renderPreferences() {
        const state = store.getState();
        const preferences = state.preferences || {
            showTriggerWarnings: true,
            autoplayTrailers: false,
            preferredPlatforms: []
        };
        
        return `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 0.75rem;">
                    <span style="color: white; font-weight: 600;">Show Trigger Warnings</span>
                    <label class="toggle">
                        <input type="checkbox" id="toggle-warnings" ${preferences.showTriggerWarnings ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 0.75rem;">
                    <span style="color: white; font-weight: 600;">Autoplay Trailers</span>
                    <label class="toggle">
                        <input type="checkbox" id="toggle-autoplay" ${preferences.autoplayTrailers ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        `;
    }
    
    attachAuthenticatedListeners() {
        // Add friend button
        const addFriendBtn = this.container.querySelector('#add-friend-btn');
        if (addFriendBtn) {
            addFriendBtn.addEventListener('click', () => this.showAddFriendDialog());
        }
        
        // Create group button
        const createGroupBtn = this.container.querySelector('#create-group-btn');
        if (createGroupBtn) {
            createGroupBtn.addEventListener('click', () => this.showCreateGroupDialog());
        }
        
        // Export data
        const exportBtn = this.container.querySelector('#export-data-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }
        
        // Clear history
        const clearBtn = this.container.querySelector('#clear-history-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearHistory());
        }
        
        // Sign out
        const signoutBtn = this.container.querySelector('#signout-btn');
        if (signoutBtn) {
            signoutBtn.addEventListener('click', () => this.signOut());
        }
        
        // Preferences
        const warningsToggle = this.container.querySelector('#toggle-warnings');
        const autoplayToggle = this.container.querySelector('#toggle-autoplay');
        
        if (warningsToggle) {
            warningsToggle.addEventListener('change', (e) => {
                const state = store.getState();
                store.setState({
                    preferences: {
                        ...state.preferences,
                        showTriggerWarnings: e.target.checked
                    }
                });
                showToast('Preferences updated');
            });
        }
        
        if (autoplayToggle) {
            autoplayToggle.addEventListener('change', (e) => {
                const state = store.getState();
                store.setState({
                    preferences: {
                        ...state.preferences,
                        autoplayTrailers: e.target.checked
                    }
                });
                showToast('Preferences updated');
            });
        }
    }
    
    showAddFriendDialog() {
        const email = prompt('Enter friend\'s email address:');
        if (email) {
            authService.addFriend(email.trim());
        }
    }
    
    showCreateGroupDialog() {
        const groupName = prompt('Enter group name:');
        if (groupName) {
            authService.createGroup(groupName.trim());
        }
    }
    
    exportData() {
        const state = store.getState();
        const data = {
            swipeHistory: state.swipeHistory,
            preferences: state.preferences,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `movie-picker-data-${Date.now()}.json`;
        a.click();
        
        showSuccess('Data exported successfully!');
    }
    
    clearHistory() {
        if (confirm('Are you sure you want to clear your entire swipe history? This cannot be undone.')) {
            store.setState({ swipeHistory: [] });
            
            // Sync to Firebase if authenticated
            if (authService.isAuthenticated()) {
                authService.syncSwipeHistory([]);
            }
            
            showSuccess('History cleared');
            this.render(this.container);
        }
    }
    
    async signOut() {
        if (confirm('Are you sure you want to sign out?')) {
            await authService.signOut();
            this.render(this.container);
        }
    }
    
    destroy() {
        // Cleanup if needed
    }
}
