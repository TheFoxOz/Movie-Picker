/**
 * Profile Tab - User Settings & Preferences
 * ✅ INTEGRATED: user-profile-revised.js for centralized preference management
 */

import { authService } from '../services/auth-service.js';
import { userProfileService } from '../services/user-profile-revised.js';
import { STREAMING_PLATFORMS } from '../config/streaming-platforms.js';
import { TRIGGER_CATEGORIES } from '../config/trigger-categories.js';

export class ProfileTab {
    constructor() {
        this.container = null;
    }

    async render(container) {
        this.container = container;
        
        const user = authService.getCurrentUser();
        const profile = userProfileService.getProfile();
        
        if (!user) {
            console.error('[ProfileTab] No user logged in');
            this.renderError();
            return;
        }

        console.log('[ProfileTab] Rendering profile for:', user.email);
        
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

                ${this.renderRegionSection(profile)}
                ${this.renderPlatformsSection(profile)}
                ${this.renderTriggerWarningsSection(profile)}
                ${this.renderAccountSection(profile)}
            </div>
        `;

        this.attachEventListeners();
    }

    renderRegionSection(profile) {
        return `
            <div class="settings-section" style="background: rgba(255, 255, 255, 0.05); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.125rem; font-weight: 700; color: white; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    🌍 Region
                </h2>
                <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.875rem; margin-bottom: 1rem;">
                    Your region affects movie availability and recommendations
                </p>
                <select 
                    id="region-select" 
                    style="width: 100%; padding: 0.75rem; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 0.5rem; color: white; font-size: 0.875rem;"
                >
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
            const isSelected = profile.selectedPlatforms.includes(platform.id);
            return `
                <button 
                    class="platform-btn" 
                    data-platform="${platform.id}"
                    style="padding: 0.75rem 1rem; background: ${isSelected ? 'linear-gradient(135deg, #ff2e63, #d90062)' : 'rgba(255, 255, 255, 0.1)'}; border: 1px solid ${isSelected ? '#ff2e63' : 'rgba(255, 255, 255, 0.2)'}; border-radius: 0.5rem; color: white; font-weight: 600; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;"
                >
                    ${isSelected ? '✓' : ''} ${platform.name}
                </button>
            `;
        }).join('');

        return `
            <div class="settings-section" style="background: rgba(255, 255, 255, 0.05); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.125rem; font-weight: 700; color: white; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    📺 Streaming Platforms
                </h2>
                <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.875rem; margin-bottom: 1rem;">
                    Select your subscriptions for personalized recommendations
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
        const categoriesHTML = TRIGGER_CATEGORIES.map(category => {
            const isEnabled = profile.triggerWarnings.enabledCategories.includes(category.id);
            return `
                <div 
                    class="trigger-category" 
                    data-category="${category.id}"
                    style="padding: 1rem; background: rgba(255, 255, 255, 0.05); border: 2px solid ${isEnabled ? '#ff2e63' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 0.75rem; cursor: pointer; transition: all 0.3s;"
                >
                    <div style="display: flex; align-items: start; gap: 0.75rem;">
                        <div style="flex-shrink: 0; width: 24px; height: 24px; background: ${isEnabled ? '#ff2e63' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 0.25rem; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.875rem;">
                            ${isEnabled ? '✓' : ''}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: white; margin-bottom: 0.25rem; font-size: 0.875rem;">
                                ${category.name}
                            </div>
                            <div style="color: rgba(255, 255, 255, 0.5); font-size: 0.75rem;">
                                ${category.description}
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
                    Choose which content warnings you want to see
                </p>
                
                <div style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 0.75rem;">
                    <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer;">
                        <input type="checkbox" id="show-all-warnings" ${profile.triggerWarnings.showAllWarnings ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;" />
                        <div>
                            <div style="color: white; font-weight: 600; font-size: 0.875rem;">Show All Warnings</div>
                            <div style="color: rgba(255, 255, 255, 0.5); font-size: 0.75rem;">Display all trigger warnings regardless of category selection</div>
                        </div>
                    </label>
                </div>

                <div style="display: grid; gap: 0.75rem;">
                    ${categoriesHTML}
                </div>

                <p style="color: rgba(255, 255, 255, 0.4); font-size: 0.75rem; margin-top: 1rem;">
                    Active categories: ${profile.triggerWarnings.enabledCategories.length}/${TRIGGER_CATEGORIES.length}
                </p>
            </div>
        `;
    }

    renderAccountSection(profile) {
        return `
            <div class="settings-section" style="background: rgba(255, 255, 255, 0.05); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.125rem; font-weight: 700; color: white; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">⚙️ Account</h2>
                
                <button id="export-settings-btn" style="width: 100%; padding: 0.75rem; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 0.5rem; color: white; font-weight: 600; cursor: pointer; margin-bottom: 0.75rem; transition: all 0.3s;">📥 Export Settings</button>

                <button id="import-settings-btn" style="width: 100%; padding: 0.75rem; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 0.5rem; color: white; font-weight: 600; cursor: pointer; margin-bottom: 0.75rem; transition: all 0.3s;">📤 Import Settings</button>

                <button id="clear-cache-btn" style="width: 100%; padding: 0.75rem; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 0.5rem; color: white; font-weight: 600; cursor: pointer; margin-bottom: 0.75rem; transition: all 0.3s;">🗑️ Clear Cache</button>

                <button id="logout-btn" style="width: 100%; padding: 0.75rem; background: linear-gradient(135deg, #ff2e63, #d90062); border: none; border-radius: 0.5rem; color: white; font-weight: 700; cursor: pointer; transition: all 0.3s;">🚪 Sign Out</button>
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

    attachEventListeners() {
        const regionSelect = document.getElementById('region-select');
        if (regionSelect) {
            regionSelect.addEventListener('change', (e) => {
                userProfileService.updateRegion(e.target.value);
                this.showToast(`Region updated to ${e.target.value}`);
            });
        }

        const platformBtns = document.querySelectorAll('.platform-btn');
        platformBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                userProfileService.togglePlatform(btn.dataset.platform);
                const profile = userProfileService.getProfile();
                const section = btn.closest('.settings-section');
                section.outerHTML = this.renderPlatformsSection(profile);
                this.attachEventListeners();
            });
        });

        const categoryDivs = document.querySelectorAll('.trigger-category');
        categoryDivs.forEach(div => {
            div.addEventListener('click', () => {
                const categoryId = parseInt(div.dataset.category);
                const profile = userProfileService.getProfile();
                
                if (profile.triggerWarnings.enabledCategories.includes(categoryId)) {
                    userProfileService.disableTriggerCategory(categoryId);
                } else {
                    userProfileService.enableTriggerCategory(categoryId);
                }
                
                const updatedProfile = userProfileService.getProfile();
                const section = div.closest('.settings-section');
                section.outerHTML = this.renderTriggerWarningsSection(updatedProfile);
                this.attachEventListeners();
            });
        });

        const showAllCheckbox = document.getElementById('show-all-warnings');
        if (showAllCheckbox) {
            showAllCheckbox.addEventListener('change', (e) => {
                userProfileService.setShowAllWarnings(e.target.checked);
                this.showToast(e.target.checked ? 'Showing all warnings' : 'Showing selected categories only');
            });
        }

        const exportBtn = document.getElementById('export-settings-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const settings = userProfileService.exportSettings();
                this.downloadJSON(settings, 'movie-picker-settings.json');
                this.showToast('Settings exported successfully');
            });
        }

        const importBtn = document.getElementById('import-settings-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        try {
                            const text = await file.text();
                            const settings = JSON.parse(text);
                            userProfileService.importSettings(settings);
                            this.showToast('Settings imported successfully');
                            this.render(this.container);
                        } catch (error) {
                            console.error('[ProfileTab] Import failed:', error);
                            this.showToast('Failed to import settings', true);
                        }
                    }
                };
                input.click();
            });
        }

        const clearCacheBtn = document.getElementById('clear-cache-btn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => {
                localStorage.clear();
                this.showToast('Cache cleared successfully');
            });
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await authService.signOut();
                    window.location.reload();
                } catch (error) {
                    console.error('[ProfileTab] Logout failed:', error);
                    this.showToast('Failed to sign out', true);
                }
            });
        }
    }

    getInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
        toast.style.cssText = `position: fixed; bottom: 6rem; left: 50%; transform: translateX(-50%); padding: 0.75rem 1.5rem; background: ${isError ? '#dc2626' : '#10b981'}; color: white; border-radius: 0.5rem; font-weight: 600; font-size: 0.875rem; z-index: 10000; animation: slideUp 0.3s ease-out;`;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
}

