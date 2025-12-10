/**
 * Profile Tab - User Settings & Preferences (Dec 2025)
 * • No dead imports - self-contained platforms & categories
 * • Works with localStorage + trigger-warning-manager.js
 */

import { authService } from '../services/auth-service.js';
import { triggerWarningManager } from '../services/trigger-warning-manager.js';
import { notify } from '../utils/notifications.js';
import { db, firebase } from '../services/firebase-config.js';

const STREAMING_PLATFORMS = [
    { id: 'netflix', name: 'Netflix', icon: 'N' },
    { id: 'prime', name: 'Prime Video', icon: 'P' },
    { id: 'disney', name: 'Disney+', icon: 'D' },
    { id: 'hbo', name: 'HBO Max', icon: 'H' },
    { id: 'apple', name: 'Apple TV+', icon: 'A' },
    { id: 'hulu', name: 'Hulu', icon: 'H' }
];

export class ProfileTab {
    constructor() {
        this.container = null;
    }

    async render(container) {
        this.container = container;
        const user = authService.getCurrentUser();
        
        if (!user) {
            this.renderError();
            return;
        }

        // Load from localStorage (fallback to defaults)
        const rawPrefs = localStorage.getItem('moviePickerPreferences') || '{}';
        const profile = JSON.parse(rawPrefs);
        const prefs = {
            region: profile.region || 'US',
            selectedPlatforms: profile.platforms || ['Netflix', 'Prime Video'],
            triggerWarnings: profile.triggerWarnings || { enabledCategories: [], showAllWarnings: false }
        };

        console.log('[ProfileTab] Rendering for:', user.email);

        this.container.innerHTML = `
            <div class="profile-container" style="padding: 1.5rem; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #ff2e63, #d90062); border-radius: 50%; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: white;">
                        ${this.getInitials(user.displayName || user.email)}
                    </div>
                    <h1 style="font-size: 1.5rem; font-weight: 700; color: white; margin-bottom: 0.5rem;">
                        ${user.displayName || 'Movie Picker User'}
                    </h1>
                    <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.875rem;">
                        ${user.email}
                    </p>
                </div>

                ${this.renderRegionSection(prefs)}
                ${this.renderPlatformsSection(prefs)}
                ${this.renderTriggerWarningsSection(prefs)}
                ${this.renderAccountSection()}
            </div>
        `;

        this.attachEventListeners(prefs);
    }

    renderRegionSection(profile) {
        return `
            <div class="settings-section" style="background: rgba(255, 255, 255, 0.05); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.125rem; font-weight: 700; color: white; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    🌍 Region
                </h2>
                <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.875rem; margin-bottom: 1rem;">
                    Affects movie availability and recommendations
                </p>
                <select id="region-select" style="width: 100%; padding: 0.75rem; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 0.5rem; color: white; font-size: 0.875rem;">
                    <option value="US" ${profile.region === 'US' ? 'selected' : ''}>🇺🇸 United States</option>
                    <option value="GB" ${profile.region === 'GB' ? 'selected' : ''}>🇬🇧 United Kingdom</option>
                    <option value="CA" ${profile.region === 'CA' ? 'selected' : ''}>🇨🇦 Canada</option>
                    <option value="AU" ${profile.region === 'AU' ? 'selected' : ''}>🇦🇺 Australia</option>
                    <option value="DE" ${profile.region === 'DE' ? 'selected' : ''}>🇩🇪 Germany</option>
                    <option value="FR" ${profile.region === 'FR' ? 'selected' : ''}>🇫🇷 France</option>
                    <option value="ES" ${profile.region === 'ES' ? 'selected' : ''}>🇪🇸 Spain</option>
                    <option value="IT" ${profile.region === 'IT' ? 'selected' : ''}>🇮🇹 Italy</option>
                    <option value="JP" ${profile.region === 'JP' ? 'selected' : ''}>🇯🇵 Japan</option>
                    <option value="KR" ${profile.region === 'KR' ? 'selected' : ''}>🇰🇷 South Korea</option>
                    <option value="BR" ${profile.region === 'BR' ? 'selected' : ''}>🇧🇷 Brazil</option>
                    <option value="MX" ${profile.region === 'MX' ? 'selected' : ''}>🇲🇽 Mexico</option>
                    <option value="IN" ${profile.region === 'IN' ? 'selected' : ''}>🇮🇳 India</option>
                </select>
            </div>
        `;
    }

    renderPlatformsSection(profile) {
        const platformsHTML = STREAMING_PLATFORMS.map(platform => {
            const isSelected = profile.selectedPlatforms.includes(platform.name);
            return `
                <button class="platform-btn" data-platform="${platform.id}" style="padding: 0.75rem 1rem; background: ${isSelected ? 'linear-gradient(135deg, #ff2e63, #d90062)' : 'rgba(255, 255, 255, 0.1)'}; border: 1px solid ${isSelected ? '#ff2e63' : 'rgba(255, 255, 255, 0.2)'}; border-radius: 0.5rem; color: white; font-weight: 600; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
                    ${isSelected ? '✓' : ''} ${platform.icon} ${platform.name}
                </button>
            `;
        }).join('');

        return `
            <div class="settings-section" style="background: rgba(255, 255, 255, 0.05); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.125rem; font-weight: 700; color: white; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    📺 Streaming Platforms
                </h2>
                <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.875rem; margin-bottom: 1rem;">
                    Select subscriptions for personalized recommendations
                </p>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem;">
                    ${platformsHTML}
                </div>
                <p style="color: rgba(255, 255, 255, 0.4); font-size: 0.75rem; margin-top: 1rem;">
                    Selected: ${profile.selectedPlatforms.length} platforms
                </p>
            </div>
        `;
    }

    renderTriggerWarningsSection(profile) {
        const categoriesHTML = triggerWarningManager.TRIGGER_CATEGORIES.map(category => {
            const isEnabled = profile.triggerWarnings.enabledCategories.includes(category.id);
            return `
                <div class="trigger-category" data-category="${category.id}" style="padding: 1rem; background: rgba(255, 255, 255, 0.05); border: 2px solid ${isEnabled ? '#ff2e63' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 0.75rem; cursor: pointer; transition: all 0.3s;">
                    <div style="display: flex; align-items: start; gap: 0.75rem;">
                        <div style="flex-shrink: 0; width: 24px; height: 24px; background: ${isEnabled ? '#ff2e63' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 0.25rem; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.875rem;">
                            ${isEnabled ? '✓' : ''}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: white; margin-bottom: 0.25rem; font-size: 0.875rem;">
                                ${category.name}
                            </div>
                            <div style="color: rgba(255, 255, 255, 0.5); font-size: 0.75rem;">
                                ${category.severity} severity
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="settings-section" style="background: rgba(255, 255, 255, 0.05); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.125rem; font-weight: 700; color: white; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    ⚠️ Trigger Warnings
                </h2>
                <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.875rem; margin-bottom: 1rem;">
                    Choose warnings to see/block content
                </p>
                <div style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 0.75rem;">
                    <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer;">
                        <input type="checkbox" id="show-all-warnings" ${profile.triggerWarnings.showAllWarnings ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;" />
                        <div>
                            <div style="color: white; font-weight: 600; font-size: 0.875rem;">Show All Warnings</div>
                            <div style="color: rgba(255, 255, 255, 0.5); font-size: 0.75rem;">Display regardless of category selection</div>
                        </div>
                    </label>
                </div>
                <div style="display: grid; gap: 0.75rem;">
                    ${categoriesHTML}
                </div>
                <p style="color: rgba(255, 255, 255, 0.4); font-size: 0.75rem; margin-top: 1rem;">
                    Active: ${profile.triggerWarnings.enabledCategories.length}/${triggerWarningManager.TRIGGER_CATEGORIES.length}
                </p>
            </div>
        `;
    }

    renderAccountSection() {
        return `
            <div class="settings-section" style="background: rgba(255, 255, 255, 0.05); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.125rem; font-weight: 700; color: white; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">⚙️ Account</h2>
                <button id="export-settings-btn" style="width: 100%; padding: 0.75rem; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 0.5rem; color: white; font-weight: 600; cursor: pointer; margin-bottom: 0.75rem;">📥 Export Settings</button>
                <button id="import-settings-btn" style="width: 100%; padding: 0.75rem; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 0.5rem; color: white; font-weight: 600; cursor: pointer; margin-bottom: 0.75rem;">📤 Import Settings</button>
                <button id="clear-cache-btn" style="width: 100%; padding: 0.75rem; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 0.5rem; color: white; font-weight: 600; cursor: pointer; margin-bottom: 0.75rem;">🗑️ Clear Cache</button>
                <button id="logout-btn" style="width: 100%; padding: 0.75rem; background: linear-gradient(135deg, #ff2e63, #d90062); border: none; border-radius: 0.5rem; color: white; font-weight: 700; cursor: pointer;">🚪 Sign Out</button>
            </div>
        `;
    }

    renderError() {
        this.container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: calc(100vh - 15rem); flex-direction: column; gap: 1rem; padding: 2rem; text-align: center;">
                <div style="font-size: 3rem;">⚠️</div>
                <div style="color: white; font-weight: 700; font-size: 1.25rem;">Not Logged In</div>
                <div style="color: rgba(255, 255, 255, 0.6); font-size: 0.875rem;">Please log in to view your profile</div>
            </div>
        `;
    }

    attachEventListeners(profile) {
        // Region change
        const regionSelect = document.getElementById('region-select');
        if (regionSelect) {
            regionSelect.addEventListener('change', (e) => {
                this.savePref('region', e.target.value);
                this.showToast(`Region updated to ${e.target.value}`);
            });
        }

        // Platforms toggle
        document.querySelectorAll('.platform-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const platformName = STREAMING_PLATFORMS.find(p => p.id === btn.dataset.platform).name;
                const current = profile.selectedPlatforms;
                const isSelected = current.includes(platformName);
                const updated = isSelected ? current.filter(p => p !== platformName) : [...current, platformName];
                this.savePref('platforms', updated);
                this.showToast(isSelected ? `${platformName} disabled` : `${platformName} enabled`);
                // Re-render section for visual update
                const section = btn.closest('.settings-section');
                section.outerHTML = this.renderPlatformsSection({ ...profile, selectedPlatforms: updated });
                this.attachEventListeners({ ...profile, selectedPlatforms: updated });
            });
        });

        // Trigger categories toggle
        document.querySelectorAll('.trigger-category').forEach(div => {
            div.addEventListener('click', () => {
                const catId = parseInt(div.dataset.category);
                const current = profile.triggerWarnings.enabledCategories;
                const isEnabled = current.includes(catId);
                const updated = isEnabled ? current.filter(id => id !== catId) : [...current, catId];
                this.savePref('triggerWarnings.enabledCategories', updated);
                this.showToast(isEnabled ? 'Category disabled' : 'Category enabled');
                // Re-render
                const section = div.closest('.settings-section');
                section.outerHTML = this.renderTriggerWarningsSection({ ...profile, triggerWarnings: { ...profile.triggerWarnings, enabledCategories: updated } });
                this.attachEventListeners({ ...profile, triggerWarnings: { ...profile.triggerWarnings, enabledCategories: updated } });
            });
        });

        // Show all warnings
        const showAllCheckbox = document.getElementById('show-all-warnings');
        if (showAllCheckbox) {
            showAllCheckbox.addEventListener('change', (e) => {
                this.savePref('triggerWarnings.showAllWarnings', e.target.checked);
                this.showToast(e.target.checked ? 'Showing all warnings' : 'Selected categories only');
            });
        }

        // Account actions (export/import simplified)
        document.getElementById('export-settings-btn')?.addEventListener('click', () => {
            const settings = { ...profile };
            this.downloadJSON(settings, 'movie-picker-settings.json');
            this.showToast('Settings exported');
        });

        document.getElementById('clear-cache-btn')?.addEventListener('click', () => {
            localStorage.clear();
            this.showToast('Cache cleared');
            location.reload();
        });

        document.getElementById('logout-btn')?.addEventListener('click', () => authService.signOut());

        // Import (file picker)
        document.getElementById('import-settings-btn')?.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        try {
                            const settings = JSON.parse(ev.target.result);
                            localStorage.setItem('moviePickerPreferences', JSON.stringify(settings));
                            this.showToast('Settings imported');
                            this.render(this.container);
                        } catch {
                            this.showToast('Invalid file', true);
                        }
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        });
    }

    savePref(key, value) {
        const raw = localStorage.getItem('moviePickerPreferences') || '{}';
        const prefs = JSON.parse(raw);
        const keys = key.split('.');
        if (keys.length === 1) {
            prefs[keys[0]] = value;
        } else {
            const [parent, child] = keys;
            prefs[parent] = { ...prefs[parent], [child]: value };
        }
        localStorage.setItem('moviePickerPreferences', JSON.stringify(prefs));
        // Sync to Firestore if online
        if (authService.isAuthenticated()) {
            db.collection('users').doc(authService.getCurrentUser().uid).update({ preferences: prefs }).catch(console.warn);
        }
    }

    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
    }

    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    showToast(message, isError = false) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `position: fixed; bottom: 6rem; left: 50%; transform: translateX(-50%); padding: 0.75rem 1.5rem; background: ${isError ? '#dc2626' : '#10b981'}; color: white; border-radius: 0.5rem; font-weight: 600; z-index: 10000;`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

export const profileTab = new ProfileTab();


