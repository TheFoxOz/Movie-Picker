/**
 * Profile Tab Component
 * User preferences: platforms, trigger warnings, friends, theme, language
 */

import { store } from '../state/store.js';
import { authService } from '../services/auth-service.js';
import { ENV } from '../config/env.js';

export class ProfileTab {
    constructor() {
        this.container = null;
        this.user = null;
        this.preferences = null;
    }

    async render(container) {
        this.container = container;
        this.user = authService.getCurrentUser();
        this.preferences = store.getState().preferences || this.getDefaultPreferences();
        
        // Ensure preferences exist in store
        if (!store.getState().preferences) {
            store.setState({ preferences: this.preferences });
        }

        this.renderContent();
    }

    getDefaultPreferences() {
        return {
            platforms: {
                'Netflix': true,
                'Hulu': true,
                'Prime Video': true,
                'Disney+': true,
                'HBO Max': true,
                'Apple TV+': true
            },
            triggerWarnings: {
                enabled: false,
                blockedWarnings: [] // Array of warning names to block
            },
            theme: 'dark',
            language: 'en',
            location: 'US',
            friends: [],
            badges: []
        };
    }

    renderContent() {
        const swipeHistory = store.getState().swipeHistory || [];
        const stats = {
            loved: swipeHistory.filter(s => s.action === 'love').length,
            liked: swipeHistory.filter(s => s.action === 'like').length,
            maybe: swipeHistory.filter(s => s.action === 'maybe').length,
            passed: swipeHistory.filter(s => s.action === 'pass').length,
            total: swipeHistory.length
        };

        this.container.innerHTML = `
            <div style="padding: 1.5rem 1rem 6rem; max-width: 600px; margin: 0 auto;">
                
                <!-- Header -->
                <div style="margin-bottom: 2rem;">
                    <h1 style="font-size: 1.75rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0;">Profile</h1>
                    <p style="color: rgba(255,255,255,0.6); font-size: 0.875rem; margin: 0;">
                        Customize your movie experience
                    </p>
                </div>

                <!-- User Stats Card -->
                <div style="background: linear-gradient(135deg, rgba(255,46,99,0.1), rgba(99,102,241,0.1)); border: 1px solid rgba(255,255,255,0.1); border-radius: 1.5rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                    <h3 style="font-size: 1.125rem; font-weight: 700; color: white; margin: 0 0 1rem 0;">
                        Your Stats
                    </h3>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                        <div style="text-align: center; padding: 1rem; background: rgba(255,46,99,0.1); border-radius: 1rem;">
                            <div style="font-size: 2rem; font-weight: 800; color: #ff2e63;">${stats.loved}</div>
                            <div style="font-size: 0.875rem; color: rgba(255,255,255,0.7);">❤️ Loved</div>
                        </div>
                        <div style="text-align: center; padding: 1rem; background: rgba(16,185,129,0.1); border-radius: 1rem;">
                            <div style="font-size: 2rem; font-weight: 800; color: #10b981;">${stats.liked}</div>
                            <div style="font-size: 0.875rem; color: rgba(255,255,255,0.7);">👍 Liked</div>
                        </div>
                        <div style="text-align: center; padding: 1rem; background: rgba(251,191,36,0.1); border-radius: 1rem;">
                            <div style="font-size: 2rem; font-weight: 800; color: #fbbf24;">${stats.maybe}</div>
                            <div style="font-size: 0.875rem; color: rgba(255,255,255,0.7);">❓ Maybe</div>
                        </div>
                        <div style="text-align: center; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 1rem;">
                            <div style="font-size: 2rem; font-weight: 800; color: rgba(255,255,255,0.9);">${stats.total}</div>
                            <div style="font-size: 0.875rem; color: rgba(255,255,255,0.7);">Total Swipes</div>
                        </div>
                    </div>
                </div>

                <!-- Streaming Platforms -->
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 1.5rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                        <h3 style="font-size: 1.125rem; font-weight: 700; color: white; margin: 0;">
                            Streaming Platforms
                        </h3>
                        <button id="toggle-all-platforms" style="padding: 0.5rem 1rem; background: rgba(99,102,241,0.2); border: 1px solid rgba(99,102,241,0.4); border-radius: 0.5rem; color: #818cf8; font-size: 0.875rem; font-weight: 600; cursor: pointer;">
                            Toggle All
                        </button>
                    </div>
                    <p style="color: rgba(255,255,255,0.6); font-size: 0.875rem; margin: 0 0 1rem 0;">
                        Select which platforms you have access to
                    </p>
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        ${this.renderPlatformToggles()}
                    </div>
                </div>

                <!-- Trigger Warnings -->
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 1.5rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                    <h3 style="font-size: 1.125rem; font-weight: 700; color: white; margin: 0 0 1rem 0;">
                        Content Filtering
                    </h3>
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); border-radius: 1rem; margin-bottom: 1rem;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: white; margin-bottom: 0.25rem;">⚠️ Enable Trigger Warnings</div>
                            <div style="font-size: 0.875rem; color: rgba(255,255,255,0.6);">
                                Hide movies with sensitive content
                            </div>
                        </div>
                        <label class="toggle-switch" style="position: relative; display: inline-block; width: 60px; height: 34px;">
                            <input type="checkbox" id="trigger-warnings-toggle" ${this.preferences.triggerWarnings.enabled ? 'checked' : ''} 
                                   style="opacity: 0; width: 0; height: 0;">
                            <span style="position: absolute; cursor: pointer; inset: 0; background: rgba(255,255,255,0.2); border-radius: 34px; transition: 0.3s;"></span>
                        </label>
                    </div>
                    <p style="color: rgba(255,255,255,0.5); font-size: 0.75rem; margin: 0;">
                        When enabled, movies with trigger warnings will be hidden from recommendations
                    </p>
                </div>

                <!-- Theme -->
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 1.5rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                    <h3 style="font-size: 1.125rem; font-weight: 700; color: white; margin: 0 0 1rem 0;">
                        Appearance
                    </h3>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
                        <button class="theme-btn" data-theme="dark" style="padding: 1rem; background: ${this.preferences.theme === 'dark' ? 'linear-gradient(135deg,#1a1a2e,#16213e)' : 'rgba(255,255,255,0.05)'}; border: 1px solid ${this.preferences.theme === 'dark' ? '#6366f1' : 'rgba(255,255,255,0.1)'}; border-radius: 1rem; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.3s;">
                            <span style="font-size: 1.5rem;">🌙</span>
                            <span style="font-weight: 600;">Dark</span>
                        </button>
                        <button class="theme-btn" data-theme="light" style="padding: 1rem; background: ${this.preferences.theme === 'light' ? 'linear-gradient(135deg,#f3f4f6,#e5e7eb)' : 'rgba(255,255,255,0.05)'}; border: 1px solid ${this.preferences.theme === 'light' ? '#fbbf24' : 'rgba(255,255,255,0.1)'}; border-radius: 1rem; color: ${this.preferences.theme === 'light' ? '#1a1a2e' : 'white'}; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.3s;">
                            <span style="font-size: 1.5rem;">☀️</span>
                            <span style="font-weight: 600;">Light</span>
                        </button>
                    </div>
                </div>

                <!-- Language & Location -->
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 1.5rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                    <h3 style="font-size: 1.125rem; font-weight: 700; color: white; margin: 0 0 1rem 0;">
                        Region & Language
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        <div>
                            <label style="display: block; color: rgba(255,255,255,0.7); font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">
                                Language
                            </label>
                            <select id="language-select" style="width: 100%; padding: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; color: white; font-size: 1rem;">
                                <option value="en" ${this.preferences.language === 'en' ? 'selected' : ''}>English</option>
                                <option value="es" ${this.preferences.language === 'es' ? 'selected' : ''}>Español</option>
                                <option value="fr" ${this.preferences.language === 'fr' ? 'selected' : ''}>Français</option>
                                <option value="de" ${this.preferences.language === 'de' ? 'selected' : ''}>Deutsch</option>
                                <option value="it" ${this.preferences.language === 'it' ? 'selected' : ''}>Italiano</option>
                                <option value="pt" ${this.preferences.language === 'pt' ? 'selected' : ''}>Português</option>
                                <option value="ja" ${this.preferences.language === 'ja' ? 'selected' : ''}>日本語</option>
                                <option value="ko" ${this.preferences.language === 'ko' ? 'selected' : ''}>한국어</option>
                                <option value="zh" ${this.preferences.language === 'zh' ? 'selected' : ''}>中文</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; color: rgba(255,255,255,0.7); font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">
                                Location
                            </label>
                            <select id="location-select" style="width: 100%; padding: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; color: white; font-size: 1rem;">
                                <option value="US" ${this.preferences.location === 'US' ? 'selected' : ''}>🇺🇸 United States</option>
                                <option value="GB" ${this.preferences.location === 'GB' ? 'selected' : ''}>🇬🇧 United Kingdom</option>
                                <option value="CA" ${this.preferences.location === 'CA' ? 'selected' : ''}>🇨🇦 Canada</option>
                                <option value="AU" ${this.preferences.location === 'AU' ? 'selected' : ''}>🇦🇺 Australia</option>
                                <option value="FR" ${this.preferences.location === 'FR' ? 'selected' : ''}>🇫🇷 France</option>
                                <option value="DE" ${this.preferences.location === 'DE' ? 'selected' : ''}>🇩🇪 Germany</option>
                                <option value="ES" ${this.preferences.location === 'ES' ? 'selected' : ''}>🇪🇸 Spain</option>
                                <option value="IT" ${this.preferences.location === 'IT' ? 'selected' : ''}>🇮🇹 Italy</option>
                                <option value="JP" ${this.preferences.location === 'JP' ? 'selected' : ''}>🇯🇵 Japan</option>
                                <option value="KR" ${this.preferences.location === 'KR' ? 'selected' : ''}>🇰🇷 South Korea</option>
                                <option value="BR" ${this.preferences.location === 'BR' ? 'selected' : ''}>🇧🇷 Brazil</option>
                                <option value="MX" ${this.preferences.location === 'MX' ? 'selected' : ''}>🇲🇽 Mexico</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Friends (Placeholder) -->
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 1.5rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                    <h3 style="font-size: 1.125rem; font-weight: 700; color: white; margin: 0 0 1rem 0;">
                        Friends
                    </h3>
                    <div style="text-align: center; padding: 2rem 1rem;">
                        <div style="font-size: 3rem; margin-bottom: 0.5rem;">👥</div>
                        <p style="color: rgba(255,255,255,0.6); margin: 0 0 1rem 0;">
                            Connect with friends to find matching movies
                        </p>
                        <button id="add-friend-btn" style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg,#10b981,#059669); border: none; border-radius: 0.75rem; color: white; font-weight: 700; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                            Add Friend
                        </button>
                    </div>
                </div>

                <!-- Badges (Placeholder) -->
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 1.5rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                    <h3 style="font-size: 1.125rem; font-weight: 700; color: white; margin: 0 0 1rem 0;">
                        Achievements
                    </h3>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;">
                        ${this.renderBadges(stats)}
                    </div>
                </div>

                <!-- Account Actions -->
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <button id="clear-history-btn" style="width: 100%; padding: 1rem; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 0.75rem; color: #ef4444; font-weight: 600; cursor: pointer;">
                        Clear Swipe History
                    </button>
                    <button id="reset-preferences-btn" style="width: 100%; padding: 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; color: rgba(255,255,255,0.7); font-weight: 600; cursor: pointer;">
                        Reset to Defaults
                    </button>
                </div>

            </div>

            <style>
                /* Toggle Switch Styling */
                .toggle-switch input:checked + span {
                    background: linear-gradient(135deg, #10b981, #059669) !important;
                }
                .toggle-switch span::before {
                    content: "";
                    position: absolute;
                    height: 26px;
                    width: 26px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white;
                    border-radius: 50%;
                    transition: 0.3s;
                }
                .toggle-switch input:checked + span::before {
                    transform: translateX(26px);
                }

                /* Select Styling */
                select {
                    cursor: pointer;
                }
                select option {
                    background: #1a1a2e;
                    color: white;
                }
            </style>
        `;

        this.attachListeners();
    }

    renderPlatformToggles() {
        const platformIcons = {
            'Netflix': { emoji: '🔴', color: '#E50914' },
            'Hulu': { emoji: '🟢', color: '#1CE783' },
            'Prime Video': { emoji: '🔵', color: '#00A8E1' },
            'Disney+': { emoji: '⭐', color: '#113CCF' },
            'HBO Max': { emoji: '🟣', color: '#B200FF' },
            'Apple TV+': { emoji: '🍎', color: '#000000' }
        };

        return Object.keys(this.preferences.platforms).map(platform => {
            const icon = platformIcons[platform] || { emoji: '▶️', color: '#6366f1' };
            const isEnabled = this.preferences.platforms[platform];

            return `
                <label style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: ${isEnabled ? `${icon.color}15` : 'rgba(255,255,255,0.03)'}; border: 1px solid ${isEnabled ? `${icon.color}50` : 'rgba(255,255,255,0.1)'}; border-radius: 1rem; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-size: 1.5rem;">${icon.emoji}</span>
                        <span style="font-weight: 600; color: ${isEnabled ? 'white' : 'rgba(255,255,255,0.7)'};">
                            ${platform}
                        </span>
                    </div>
                    <input type="checkbox" class="platform-toggle" data-platform="${platform}" ${isEnabled ? 'checked' : ''} 
                           style="width: 20px; height: 20px; cursor: pointer; accent-color: ${icon.color};">
                </label>
            `;
        }).join('');
    }

    renderBadges(stats) {
        const badges = [
            { emoji: '🎬', name: 'First Swipe', unlocked: stats.total >= 1 },
            { emoji: '🔥', name: 'On Fire', unlocked: stats.total >= 10 },
            { emoji: '💯', name: 'Century', unlocked: stats.total >= 100 },
            { emoji: '❤️', name: 'Love Bug', unlocked: stats.loved >= 25 },
            { emoji: '👍', name: 'Critic', unlocked: stats.liked >= 50 },
            { emoji: '🎯', name: 'Decisive', unlocked: (stats.loved + stats.liked) >= 75 },
            { emoji: '🌟', name: 'Cinephile', unlocked: stats.total >= 500 },
            { emoji: '👑', name: 'Legend', unlocked: stats.total >= 1000 }
        ];

        return badges.map(badge => `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1rem; background: ${badge.unlocked ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${badge.unlocked ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.1)'}; border-radius: 1rem;">
                <div style="font-size: 2rem; filter: ${badge.unlocked ? 'none' : 'grayscale(1) opacity(0.3)'};">
                    ${badge.emoji}
                </div>
                <div style="font-size: 0.75rem; color: ${badge.unlocked ? 'white' : 'rgba(255,255,255,0.4)'}; text-align: center; font-weight: 600;">
                    ${badge.name}
                </div>
            </div>
        `).join('');
    }

    attachListeners() {
        // Platform toggles
        this.container.querySelectorAll('.platform-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const platform = e.target.dataset.platform;
                this.preferences.platforms[platform] = e.target.checked;
                this.savePreferences();
                console.log(`[Profile] ${platform} ${e.target.checked ? 'enabled' : 'disabled'}`);
            });
        });

        // Toggle all platforms
        const toggleAllBtn = this.container.querySelector('#toggle-all-platforms');
        if (toggleAllBtn) {
            toggleAllBtn.addEventListener('click', () => {
                const allEnabled = Object.values(this.preferences.platforms).every(v => v);
                Object.keys(this.preferences.platforms).forEach(platform => {
                    this.preferences.platforms[platform] = !allEnabled;
                });
                this.savePreferences();
                this.renderContent();
            });
        }

        // Trigger warnings toggle
        const triggerToggle = this.container.querySelector('#trigger-warnings-toggle');
        if (triggerToggle) {
            triggerToggle.addEventListener('change', (e) => {
                this.preferences.triggerWarnings.enabled = e.target.checked;
                this.savePreferences();
                console.log(`[Profile] Trigger warnings ${e.target.checked ? 'enabled' : 'disabled'}`);
            });
        }

        // Theme buttons
        this.container.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const theme = e.currentTarget.dataset.theme;
                this.preferences.theme = theme;
                this.savePreferences();
                this.applyTheme(theme);
                this.renderContent();
            });
        });

        // Language select
        const languageSelect = this.container.querySelector('#language-select');
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                this.preferences.language = e.target.value;
                this.savePreferences();
                console.log(`[Profile] Language changed to ${e.target.value}`);
            });
        }

        // Location select
        const locationSelect = this.container.querySelector('#location-select');
        if (locationSelect) {
            locationSelect.addEventListener('change', (e) => {
                this.preferences.location = e.target.value;
                this.savePreferences();
                console.log(`[Profile] Location changed to ${e.target.value}`);
            });
        }

        // Add friend button
        const addFriendBtn = this.container.querySelector('#add-friend-btn');
        if (addFriendBtn) {
            addFriendBtn.addEventListener('click', () => {
                alert('Friend system coming soon! This will allow you to add friends and find matching movies together.');
            });
        }

        // Clear history
        const clearHistoryBtn = this.container.querySelector('#clear-history-btn');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all your swipe history? This cannot be undone.')) {
                    store.setState({ swipeHistory: [] });
                    this.renderContent();
                    console.log('[Profile] Swipe history cleared');
                }
            });
        }

        // Reset preferences
        const resetBtn = this.container.querySelector('#reset-preferences-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Reset all preferences to default values?')) {
                    this.preferences = this.getDefaultPreferences();
                    this.savePreferences();
                    this.renderContent();
                    console.log('[Profile] Preferences reset to defaults');
                }
            });
        }
    }

    savePreferences() {
        store.setState({ preferences: this.preferences });
        
        // Also save to localStorage for persistence
        try {
            localStorage.setItem('moviePickerPreferences', JSON.stringify(this.preferences));
        } catch (error) {
            console.error('[Profile] Failed to save to localStorage:', error);
        }

        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('preferences-updated', {
            detail: this.preferences
        }));
    }

    applyTheme(theme) {
        // Apply theme to document
        if (theme === 'light') {
            document.body.style.background = 'linear-gradient(180deg, #f3f4f6 0%, #e5e7eb 100%)';
            // Add more light theme styles as needed
        } else {
            document.body.style.background = 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 100%)';
        }
        console.log(`[Profile] Theme applied: ${theme}`);
    }

    destroy() {
        // Cleanup if needed
    }
}
