/**
 * Profile Tab
 * User profile, settings, and preferences
 */

import { store } from '../state/store.js';
import { showSuccess, showInfo } from '../utils/notifications.js';

// Mock platform data
const MOCK_PLATFORMS = [
    { name: "Netflix", status: "Connected", icon: "N", color: "#E50914" },
    { name: "Hulu", status: "Connected", icon: "H", color: "#1CE783" },
    { name: "Prime Video", status: "Disconnected", icon: "P", color: "#00A8E1" },
    { name: "Max (HBO)", status: "Disconnected", icon: "M", color: "#0060FF" },
    { name: "Disney+", status: "Disconnected", icon: "D", color: "#113CCF" },
    { name: "Apple TV+", status: "Disconnected", icon: "A", color: "#000000" }
];

// Mock trigger warnings
const TRIGGER_WARNINGS = [
    "High Violence",
    "Flashing Lights",
    "Emotional Loss",
    "Large Spiders",
    "Needles / Injections",
    "Smoking",
    "Jump Scares",
    "Gore",
    "Sexual Content",
    "Strong Language"
];

export class ProfileTab {
    constructor(container) {
        this.container = container;
        this.isDarkMode = true;
    }
    
    render() {
        const userId = store.get('userId');
        const swipeHistory = store.get('swipeHistory');
        
        // Calculate user level based on swipes
        const level = Math.floor(swipeHistory.length / 10) + 1;
        const nextLevelSwipes = (level * 10) - swipeHistory.length;
        
        this.container.innerHTML = `
            <div class="container" style="padding: 1.5rem;">
                <!-- Profile Header -->
                <div class="card" style="text-align: center; padding: 2rem 1.5rem; margin-bottom: 1.5rem; background: linear-gradient(135deg, var(--color-bg-elevated), var(--color-bg-card));">
                    <div style="width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, var(--color-primary), var(--color-reel)); margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 3rem; box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);">
                        🎬
                    </div>
                    <h2 style="font-size: 1.5rem; margin-bottom: 0.25rem;">Movie Enthusiast</h2>
                    <p style="font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 0.75rem;">
                        Level ${level} • ${swipeHistory.length} movies rated
                    </p>
                    <div style="background: var(--color-bg); border-radius: 0.5rem; padding: 0.75rem; margin-top: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <span style="font-size: 0.75rem; color: var(--color-text-secondary);">Next Level</span>
                            <span style="font-size: 0.75rem; font-weight: 600; color: var(--color-primary);">${nextLevelSwipes} swipes to go</span>
                        </div>
                        <div style="height: 8px; background: var(--color-border); border-radius: 999px; overflow: hidden;">
                            <div style="height: 100%; background: linear-gradient(90deg, var(--color-primary), var(--color-reel)); width: ${(swipeHistory.length % 10) * 10}%; transition: width 0.5s ease-out;"></div>
                        </div>
                    </div>
                </div>
                
                <!-- User ID -->
                <div class="card" style="margin-bottom: 1.5rem; padding: 1rem;">
                    <h3 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">
                        Your User ID
                    </h3>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <code style="flex: 1; background: var(--color-bg); padding: 0.75rem; border-radius: 0.5rem; font-size: 0.75rem; color: var(--color-reel); overflow-x: auto; white-space: nowrap;">
                            ${userId || 'Loading...'}
                        </code>
                        <button class="btn btn-ghost btn-icon" onclick="navigator.clipboard.writeText('${userId}').then(() => window.showCopySuccess())" aria-label="Copy user ID">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                            </svg>
                        </button>
                    </div>
                </div>
                
                <!-- Add Friend -->
                <div class="card" style="margin-bottom: 1.5rem; padding: 1.5rem;">
                    <h3 style="font-size: 1.125rem; margin-bottom: 0.5rem;">Add Friend</h3>
                    <p style="font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 1rem;">
                        Enter a friend's user ID to start matching movies together
                    </p>
                    <div style="display: flex; gap: 0.75rem;">
                        <input 
                            type="text" 
                            id="friend-id-input"
                            placeholder="Enter friend's user ID..." 
                            style="flex: 1; padding: 0.75rem; border-radius: 0.5rem; background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-text-primary); font-size: 0.875rem;"
                        >
                        <button class="btn btn-primary" onclick="window.sendFriendRequest()">
                            Send Request
                        </button>
                    </div>
                </div>
                
                <!-- Connected Platforms -->
                <h2 style="font-size: 1.25rem; margin-bottom: 1rem;">Streaming Platforms</h2>
                <div class="card stagger-children" style="margin-bottom: 1.5rem; padding: 1rem;">
                    ${MOCK_PLATFORMS.map(platform => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--color-border-light);">
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <div style="width: 36px; height: 36px; border-radius: 50%; background: ${platform.color}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 0.875rem;">
                                    ${platform.icon}
                                </div>
                                <div>
                                    <p style="font-weight: 600; font-size: 0.875rem;">${platform.name}</p>
                                    <p style="font-size: 0.75rem; color: var(--color-text-secondary);">${platform.status}</p>
                                </div>
                            </div>
                            <button 
                                class="btn ${platform.status === 'Connected' ? 'btn-ghost' : 'btn-secondary'}" 
                                style="font-size: 0.75rem; padding: 0.5rem 1rem;"
                                data-platform="${platform.name}"
                                data-status="${platform.status}">
                                ${platform.status === 'Connected' ? 'Disconnect' : 'Connect'}
                            </button>
                        </div>
                    `).join('')}
                </div>
                
                <!-- Trigger Warnings -->
                <h2 style="font-size: 1.25rem; margin-bottom: 1rem;">Content Preferences</h2>
                <div class="card" style="margin-bottom: 1.5rem; padding: 1.5rem;">
                    <h3 style="font-size: 1rem; margin-bottom: 0.5rem;">Filter Trigger Warnings</h3>
                    <p style="font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 1rem;">
                        Select content you'd prefer to avoid
                    </p>
                    <div id="trigger-warnings" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
                        ${TRIGGER_WARNINGS.map(warning => `
                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.5rem; border-radius: 0.5rem; transition: background 0.2s;" class="trigger-label">
                                <input 
                                    type="checkbox" 
                                    value="${warning}"
                                    style="width: 18px; height: 18px; accent-color: var(--color-primary);"
                                    ${['High Violence', 'Flashing Lights'].includes(warning) ? 'checked' : ''}
                                >
                                <span style="font-size: 0.875rem;">${warning}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <!-- App Settings -->
                <h2 style="font-size: 1.25rem; margin-bottom: 1rem;">App Settings</h2>
                <div class="card" style="margin-bottom: 1.5rem; padding: 1rem;">
                    <!-- Dark Mode Toggle -->
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--color-border-light);">
                        <div>
                            <p style="font-weight: 600; font-size: 0.875rem;">Dark Mode</p>
                            <p style="font-size: 0.75rem; color: var(--color-text-secondary);">Cinema-inspired dark theme</p>
                        </div>
                        <label style="position: relative; display: inline-block; width: 48px; height: 24px; cursor: pointer;">
                            <input type="checkbox" id="dark-mode-toggle" ${this.isDarkMode ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                            <span style="position: absolute; cursor: pointer; inset: 0; background-color: var(--color-border); transition: 0.3s; border-radius: 24px;">
                                <span style="position: absolute; content: ''; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: 0.3s; border-radius: 50%;"></span>
                            </span>
                        </label>
                    </div>
                    
                    <!-- Notifications -->
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--color-border-light);">
                        <div>
                            <p style="font-weight: 600; font-size: 0.875rem;">Push Notifications</p>
                            <p style="font-size: 0.75rem; color: var(--color-text-secondary);">Get notified of new matches</p>
                        </div>
                        <label style="position: relative; display: inline-block; width: 48px; height: 24px; cursor: pointer;">
                            <input type="checkbox" checked style="opacity: 0; width: 0; height: 0;">
                            <span style="position: absolute; cursor: pointer; inset: 0; background-color: var(--color-border); transition: 0.3s; border-radius: 24px;">
                                <span style="position: absolute; content: ''; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: 0.3s; border-radius: 50%;"></span>
                            </span>
                        </label>
                    </div>
                    
                    <!-- Language -->
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0;">
                        <div>
                            <p style="font-weight: 600; font-size: 0.875rem;">Language</p>
                            <p style="font-size: 0.75rem; color: var(--color-text-secondary);">Choose your language</p>
                        </div>
                        <select style="padding: 0.5rem 1rem; border-radius: 0.5rem; background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-text-primary); font-size: 0.875rem;">
                            <option>English (US)</option>
                            <option>Español (ES)</option>
                            <option>Français (FR)</option>
                            <option>Deutsch (DE)</option>
                        </select>
                    </div>
                </div>
                
                <!-- Danger Zone -->
                <h2 style="font-size: 1.25rem; margin-bottom: 1rem; color: var(--nope-glow);">Danger Zone</h2>
                <div class="card" style="margin-bottom: 1.5rem; padding: 1rem; border: 1px solid var(--nope-glow);">
                    <button class="btn" style="width: 100%; background: transparent; color: var(--nope-glow); border: 1px solid var(--nope-glow); margin-bottom: 0.75rem;" onclick="window.clearSwipeHistory()">
                        Clear Swipe History
                    </button>
                    <button class="btn" style="width: 100%; background: var(--nope-glow); color: white;" onclick="window.logOut()">
                        Log Out
                    </button>
                </div>
                
                <!-- App Info -->
                <div style="text-align: center; padding: 2rem 1rem; color: var(--color-text-muted); font-size: 0.75rem;">
                    <p>Movie Picker v1.0.0</p>
                    <p>Made with ❤️ for movie lovers</p>
                    <div style="margin-top: 1rem;">
                        <a href="#" style="color: var(--color-primary); margin: 0 0.5rem;">Privacy Policy</a>
                        <a href="#" style="color: var(--color-primary); margin: 0 0.5rem;">Terms of Service</a>
                    </div>
                </div>
            </div>
        `;
        
        this.attachListeners();
    }
    
    attachListeners() {
        // Dark mode toggle
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', (e) => {
                this.isDarkMode = e.target.checked;
                this.toggleDarkMode();
            });
        }
        
        // Platform connect/disconnect buttons
        const platformButtons = this.container.querySelectorAll('[data-platform]');
        platformButtons.forEach(button => {
            button.addEventListener('click', () => {
                const platform = button.dataset.platform;
                const status = button.dataset.status;
                const newStatus = status === 'Connected' ? 'Disconnected' : 'Connected';
                
                button.dataset.status = newStatus;
                button.textContent = newStatus === 'Connected' ? 'Disconnect' : 'Connect';
                button.className = newStatus === 'Connected' ? 'btn btn-ghost' : 'btn btn-secondary';
                button.style.fontSize = '0.75rem';
                button.style.padding = '0.5rem 1rem';
                
                showSuccess(`${platform} ${newStatus.toLowerCase()}`);
            });
        });
        
        // Trigger warning checkboxes
        const triggerLabels = this.container.querySelectorAll('.trigger-label');
        triggerLabels.forEach(label => {
            label.addEventListener('mouseenter', () => {
                label.style.background = 'var(--color-bg)';
            });
            label.addEventListener('mouseleave', () => {
                label.style.background = 'transparent';
            });
        });
        
        // Global functions for buttons
        window.showCopySuccess = () => {
            showSuccess('User ID copied to clipboard!');
        };
        
        window.sendFriendRequest = () => {
            const input = document.getElementById('friend-id-input');
            if (input && input.value.trim()) {
                showSuccess(`Friend request sent to ${input.value}`);
                input.value = '';
            } else {
                showInfo('Please enter a user ID');
            }
        };
        
        window.clearSwipeHistory = () => {
            if (confirm('Are you sure you want to clear your swipe history? This cannot be undone.')) {
                store.setState({ swipeHistory: [] });
                showSuccess('Swipe history cleared');
                this.render();
            }
        };
        
        window.logOut = () => {
            if (confirm('Are you sure you want to log out?')) {
                showInfo('Logging out...');
                setTimeout(() => {
                    location.reload();
                }, 1000);
            }
        };
    }
    
    toggleDarkMode() {
        const body = document.body;
        body.classList.toggle('dark-mode', this.isDarkMode);
        body.classList.toggle('light-mode', !this.isDarkMode);
        showSuccess(`Switched to ${this.isDarkMode ? 'Dark' : 'Light'} Mode`);
    }
    
    destroy() {
        // Cleanup global functions
        delete window.showCopySuccess;
        delete window.sendFriendRequest;
        delete window.clearSwipeHistory;
        delete window.logOut;
    }
}
