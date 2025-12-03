/**
 * Profile Tab Component
 * User settings and preferences
 */

import { store } from '../state/store.js';
import { showToast } from '../utils/notifications.js';
import { ENV } from '../config/env.js';

export class ProfileTab {
    constructor() {
        this.container = null;
    }
    
    render(container) {
        this.container = container;
        
        const state = store.getState();
        const preferences = state.preferences || {};
        const swipeHistory = state.swipeHistory || [];
        
        // Calculate stats
        const stats = this.calculateStats(swipeHistory);
        
        container.innerHTML = `
            <div style="padding: 1.5rem 1rem 6rem; max-width: 600px; margin: 0 auto;">
                
                <!-- Profile Header -->
                <div style="text-align: center; margin-bottom: 2rem;">
                    <div style="width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, #ff2e63, #d90062); margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 3rem; box-shadow: 0 8px 32px rgba(255, 46, 99, 0.4);">
                        🎬
                    </div>
                    <h1 style="font-size: 1.75rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0;">
                        Movie Buff
                    </h1>
                    <p style="font-size: 0.9375rem; color: rgba(255, 255, 255, 0.6); margin: 0;">
                        Level ${stats.level} • ${stats.totalSwipes} movies reviewed
                    </p>
                </div>
                
                <!-- Stats Cards -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 2rem;">
                    <div style="padding: 1.25rem; background: rgba(255, 46, 99, 0.1); border: 1px solid rgba(255, 46, 99, 0.2); border-radius: 1rem;">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">❤️</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: white; margin-bottom: 0.25rem;">
                            ${stats.loved}
                        </div>
                        <div style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.6);">
                            Loved
                        </div>
                    </div>
                    
                    <div style="padding: 1.25rem; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 1rem;">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">👍</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: white; margin-bottom: 0.25rem;">
                            ${stats.liked}
                        </div>
                        <div style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.6);">
                            Liked
                        </div>
                    </div>
                    
                    <div style="padding: 1.25rem; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 1rem;">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">🤔</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: white; margin-bottom: 0.25rem;">
                            ${stats.maybe}
                        </div>
                        <div style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.6);">
                            Maybe
                        </div>
                    </div>
                    
                    <div style="padding: 1.25rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 1rem;">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">✕</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: white; margin-bottom: 0.25rem;">
                            ${stats.passed}
                        </div>
                        <div style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.6);">
                            Passed
                        </div>
                    </div>
                </div>
                
                <!-- Preferences Section -->
                <div style="margin-bottom: 2rem;">
                    <h2 style="font-size: 1.25rem; font-weight: 800; color: white; margin: 0 0 1rem 0;">
                        ⚙️ Preferences
                    </h2>
                    
                    <!-- Trigger Warnings Toggle -->
                    <div style="padding: 1.25rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 1rem; margin-bottom: 1rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div style="flex: 1;">
                                <div style="font-size: 1rem; font-weight: 600; color: white; margin-bottom: 0.25rem;">
                                    Show Trigger Warnings
                                </div>
                                <div style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.6);">
                                    Display content warnings on movie cards
                                </div>
                            </div>
                            <label class="toggle-switch" style="position: relative; display: inline-block; width: 52px; height: 28px; flex-shrink: 0; margin-left: 1rem;">
                                <input type="checkbox" id="trigger-warnings-toggle" ${preferences.showTriggerWarnings !== false ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                                <span class="toggle-slider" style="position: absolute; cursor: pointer; inset: 0; background: rgba(255, 255, 255, 0.2); border-radius: 28px; transition: 0.3s; border: 1px solid rgba(255, 255, 255, 0.3);"></span>
                            </label>
                        </div>
                    </div>
                    
                    <!-- Platform Preferences -->
                    <div style="padding: 1.25rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 1rem;">
                        <div style="font-size: 1rem; font-weight: 600; color: white; margin-bottom: 1rem;">
                            Streaming Platforms
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                            ${this.renderPlatformToggles(preferences.platforms || [])}
                        </div>
                    </div>
                </div>
                
                <!-- Actions Section -->
                <div>
                    <h2 style="font-size: 1.25rem; font-weight: 800; color: white; margin: 0 0 1rem 0;">
                        🛠️ Actions
                    </h2>
                    
                    <button id="clear-history-btn" style="width: 100%; padding: 1.25rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 1rem; color: #ef4444; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s; margin-bottom: 1rem;" onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'">
                        🗑️ Clear All Swipe History
                    </button>
                    
                    <button id="export-data-btn" style="width: 100%; padding: 1.25rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 1rem; color: white; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.background='rgba(255, 255, 255, 0.1)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.05)'">
                        📥 Export My Data (JSON)
                    </button>
                </div>
                
                <!-- App Info -->
                <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid rgba(255, 255, 255, 0.1); text-align: center;">
                    <p style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.5); margin: 0 0 0.5rem 0;">
                        Movie Picker v1.0.0
                    </p>
                    <p style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.4); margin: 0;">
                        Made with ❤️ for movie lovers
                    </p>
                </div>
            </div>
        `;
        
        this.attachListeners();
    }
    
    calculateStats(swipeHistory) {
        const stats = {
            totalSwipes: swipeHistory.length,
            loved: 0,
            liked: 0,
            maybe: 0,
            passed: 0,
            level: 1
        };
        
        swipeHistory.forEach(entry => {
            if (entry.action === 'love') stats.loved++;
            else if (entry.action === 'like') stats.liked++;
            else if (entry.action === 'maybe') stats.maybe++;
            else if (entry.action === 'pass') stats.passed++;
        });
        
        // Calculate level (every 10 swipes = 1 level)
        stats.level = Math.floor(stats.totalSwipes / 10) + 1;
        
        return stats;
    }
    
    renderPlatformToggles(selectedPlatforms) {
        const platforms = [
            { name: 'Netflix', color: '#E50914' },
            { name: 'Hulu', color: '#1CE783' },
            { name: 'Prime Video', color: '#00A8E1' },
            { name: 'Disney+', color: '#113CCF' },
            { name: 'HBO Max', color: '#B200FF' },
            { name: 'Apple TV+', color: '#000000' }
        ];
        
        return platforms.map(platform => {
            const isSelected = selectedPlatforms.includes(platform.name) || selectedPlatforms.length === 0;
            return `
                <button 
                    class="platform-toggle" 
                    data-platform="${platform.name}"
                    style="padding: 0.625rem 1rem; background: ${isSelected ? platform.color + '33' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${isSelected ? platform.color + '66' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 0.75rem; color: ${isSelected ? platform.color : 'rgba(255, 255, 255, 0.5)'}; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.3s;"
                >
                    ${platform.name}
                </button>
            `;
        }).join('');
    }
    
    attachListeners() {
        // Trigger warnings toggle
        const triggerToggle = this.container.querySelector('#trigger-warnings-toggle');
        if (triggerToggle) {
            triggerToggle.addEventListener('change', (e) => {
                store.setState({
                    preferences: {
                        ...store.getState().preferences,
                        showTriggerWarnings: e.target.checked
                    }
                });
                showToast(e.target.checked ? '✓ Trigger warnings enabled' : '✓ Trigger warnings disabled', 'success');
                
                if (ENV.APP.debug) {
                    console.log('[ProfileTab] Trigger warnings:', e.target.checked);
                }
            });
        }
        
        // Platform toggles
        const platformToggles = this.container.querySelectorAll('.platform-toggle');
        platformToggles.forEach(btn => {
            btn.addEventListener('click', () => {
                const platform = btn.dataset.platform;
                const state = store.getState();
                let platforms = [...(state.preferences?.platforms || [])];
                
                if (platforms.includes(platform)) {
                    platforms = platforms.filter(p => p !== platform);
                } else {
                    platforms.push(platform);
                }
                
                store.setState({
                    preferences: {
                        ...state.preferences,
                        platforms
                    }
                });
                
                this.render(this.container); // Re-render to update UI
                showToast(`✓ Preferences updated`, 'success');
            });
        });
        
        // Clear history button
        const clearBtn = this.container.querySelector('#clear-history-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all your swipe history? This cannot be undone.')) {
                    store.setState({ swipeHistory: [] });
                    this.render(this.container); // Re-render to update stats
                    showToast('✓ History cleared', 'success');
                    
                    if (ENV.APP.debug) {
                        console.log('[ProfileTab] History cleared');
                    }
                }
            });
        }
        
        // Export data button
        const exportBtn = this.container.querySelector('#export-data-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const state = store.getState();
                const dataStr = JSON.stringify(state, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `movie-picker-data-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('✓ Data exported', 'success');
                
                if (ENV.APP.debug) {
                    console.log('[ProfileTab] Data exported');
                }
            });
        }
        
        // Toggle slider styling
        const toggleInputs = this.container.querySelectorAll('.toggle-switch input');
        toggleInputs.forEach(input => {
            const slider = input.nextElementSibling;
            if (slider) {
                input.addEventListener('change', () => {
                    if (input.checked) {
                        slider.style.background = '#ff2e63';
                        slider.style.borderColor = '#ff2e63';
                    } else {
                        slider.style.background = 'rgba(255, 255, 255, 0.2)';
                        slider.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    }
                });
                
                // Set initial state
                if (input.checked) {
                    slider.style.background = '#ff2e63';
                    slider.style.borderColor = '#ff2e63';
                }
            }
        });
    }
    
    destroy() {
        // Cleanup if needed
    }
}
