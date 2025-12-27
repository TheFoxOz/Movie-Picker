/**
 * MoviEase - Profile Tab
 * ✅ Add Friend section
 * ✅ Working theme toggle
 * ✅ MoviEase branding
 */

import { authService } from '../services/auth-service.js';
import { userProfileService } from '../services/user-profile-revised.js';
import { STREAMING_PLATFORMS } from '../config/streaming-platforms.js';
import { TRIGGER_CATEGORIES } from '../config/trigger-categories.js';

const TMDB_REGIONS = [
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
    { code: 'ES', name: 'Spain', flag: '🇪🇸' },
    { code: 'IT', name: 'Italy', flag: '🇮🇹' },
    { code: 'JP', name: 'Japan', flag: '🇯🇵' },
    { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
    { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
    { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
    { code: 'IN', name: 'India', flag: '🇮🇳' },
    { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
    { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
    { code: 'NO', name: 'Norway', flag: '🇳🇴' },
    { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
    { code: 'FI', name: 'Finland', flag: '🇫🇮' },
    { code: 'PL', name: 'Poland', flag: '🇵🇱' },
    { code: 'RU', name: 'Russia', flag: '🇷🇺' },
    { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
    { code: 'CL', name: 'Chile', flag: '🇨🇱' },
    { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
    { code: 'PE', name: 'Peru', flag: '🇵🇪' }
];

export class ProfileTab {
    constructor() {
        this.container = null;
        this.currentTheme = localStorage.getItem('app-theme') || 'dark';
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
            <div style="
                height: 100%;
                overflow-y: auto;
                overflow-x: hidden;
                -webkit-overflow-scrolling: touch;
            ">
                <div class="profile-container" style="padding: 1.5rem 1rem 6rem; max-width: 600px; margin: 0 auto;">
                    <!-- User Info -->
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #A6C0DD, #8ba3b8); border-radius: 50%; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #18183A; box-shadow: 0 4px 12px rgba(166, 192, 221, 0.3);">
                            ${user.photoURL ? `<img src="${user.photoURL}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : this.getInitials(user.displayName || user.email)}
                        </div>
                        <h1 style="font-size: 1.5rem; font-weight: 700; color: #FDFAB0; margin-bottom: 0.5rem;">
                            ${user.displayName || 'MoviEase User'}
                        </h1>
                        <p style="color: #A6C0DD; font-size: 0.875rem;">
                            ${user.email || ''}
                        </p>
                    </div>

                    ${this.renderAddFriendSection()}
                    ${this.renderThemeSection()}
                    ${this.renderRegionSection(profile)}
                    ${this.renderPlatformsSection(profile)}
                    ${this.renderTriggerWarningsSection(profile)}
                    ${this.renderAccountSection()}
                </div>
            </div>
        `;

        this.attachEventListeners();
        this.injectToggleStyles();
    }

    renderAddFriendSection() {
        return `
            <div class="settings-section" style="background: linear-gradient(135deg, rgba(166, 192, 221, 0.2), rgba(139, 163, 184, 0.2)); border: 1px solid rgba(166, 192, 221, 0.3); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.125rem; font-weight: 700; color: #FDFAB0; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    👥 Friends
                </h2>
                <p style="color: #A6C0DD; font-size: 0.875rem; margin-bottom: 1rem;">
                    Share your movie discoveries with friends
                </p>
                
                <button id="add-friend-btn" style="
                    width: 100%;
                    padding: 1rem;
                    background: linear-gradient(135deg, #A6C0DD, #8ba3b8);
                    border: none;
                    border-radius: 0.75rem;
                    color: #18183A;
                    font-weight: 700;
                    font-size: 0.9375rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 12px rgba(166, 192, 221, 0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                " onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 6px 16px rgba(166, 192, 221, 0.4)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 12px rgba(166, 192, 221, 0.3)'">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:20px;height:20px;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                    </svg>
                    Add Friend
                </button>
            </div>
        `;
    }

    renderThemeSection() {
        const isDark = this.currentTheme === 'dark';
        
        return `
            <div class="settings-section" style="background: linear-gradient(135deg, rgba(166, 192, 221, 0.2), rgba(139, 163, 184, 0.2)); border: 1px solid rgba(166, 192, 221, 0.3); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <h2 style="font-size: 1.125rem; font-weight: 700; color: #FDFAB0; margin: 0 0 0.25rem 0; display: flex; align-items: center; gap: 0.5rem;">
                            ${isDark ? '🌙' : '☀️'} Theme
                        </h2>
                        <p style="color: #A6C0DD; font-size: 0.875rem; margin: 0;">
                            ${isDark ? 'Dark Mode' : 'Light Mode'}
                        </p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="theme-toggle" ${isDark ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        `;
    }

    renderRegionSection(profile) {
        const regionsHTML = TMDB_REGIONS.map(region => 
            `<option value="${region.code}" ${profile.region === region.code ? 'selected' : ''} style="background: #18183A; color: #FDFAB0;">
                ${region.flag} ${region.name}
            </option>`
        ).join('');

        return `
            <div class="settings-section" style="background: linear-gradient(135deg, rgba(166, 192, 221, 0.2), rgba(139, 163, 184, 0.2)); border: 1px solid rgba(166, 192, 221, 0.3); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.125rem; font-weight: 700; color: #FDFAB0; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    🌍 Region
                </h2>
                <p style="color: #A6C0DD; font-size: 0.875rem; margin-bottom: 1rem;">
                    Affects movie availability and streaming options
                </p>
                <select 
                    id="region-select" 
                    style="
                        width: 100%;
                        padding: 0.875rem;
                        background: rgba(166, 192, 221, 0.2);
                        border: 1px solid rgba(166, 192, 221, 0.3);
                        border-radius: 0.75rem;
                        color: #FDFAB0;
                        font-size: 0.9375rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    "
                >
                    ${regionsHTML}
                </select>
            </div>
        `;
    }

    renderPlatformsSection(profile) {
        const platformsHTML = STREAMING_PLATFORMS.map(platform => {
            const isSelected = profile.selectedPlatforms.includes(platform.id);
            return `
                <div class="platform-toggle-item" data-platform="${platform.id}" style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.75rem 1rem;
                    background: rgba(166, 192, 221, 0.15);
                    border: 1px solid rgba(166, 192, 221, 0.2);
                    border-radius: 0.75rem;
                    cursor: pointer;
                    transition: all 0.2s;
                ">
                    <span style="color: #FDFAB0; font-weight: 600; font-size: 0.875rem;">
                        ${platform.name}
                    </span>
                    <label class="toggle-switch" onclick="event.stopPropagation()">
                        <input type="checkbox" class="platform-checkbox" data-platform="${platform.id}" ${isSelected ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            `;
        }).join('');

        return `
            <div class="settings-section" style="background: linear-gradient(135deg, rgba(166, 192, 221, 0.2), rgba(139, 163, 184, 0.2)); border: 1px solid rgba(166, 192, 221, 0.3); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.125rem; font-weight: 700; color: #FDFAB0; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    📺 Streaming Platforms
                </h2>
                <p style="color: #A6C0DD; font-size: 0.875rem; margin-bottom: 1rem;">
                    Your active subscriptions (${profile.selectedPlatforms.length} selected)
                </p>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
                    ${platformsHTML}
                </div>
            </div>
        `;
    }

    renderTriggerWarningsSection(profile) {
        const categoriesHTML = TRIGGER_CATEGORIES.map(category => {
            const isEnabled = profile.triggerWarnings.enabledCategories.includes(category.id);
            return `
                <div class="trigger-toggle-item" data-category="${category.id}" style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.5rem 0.625rem;
                    background: rgba(166, 192, 221, 0.15);
                    border: 1px solid rgba(166, 192, 221, 0.2);
                    border-radius: 0.5rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    gap: 0.5rem;
                    min-height: 42px;
                    max-width: 100%;
                    box-sizing: border-box;
                ">
                    <div style="
                        flex: 1;
                        min-width: 0;
                        max-width: calc(100% - 44px);
                        overflow: hidden;
                    ">
                        <div style="
                            font-weight: 600;
                            color: #FDFAB0;
                            font-size: 0.6875rem;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            line-height: 1.2;
                        ">
                            ${category.name}
                        </div>
                        <div style="
                            color: #A6C0DD;
                            font-size: 0.5625rem;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            margin-top: 0.125rem;
                            line-height: 1.2;
                        ">
                            ${category.description}
                        </div>
                    </div>
                    <label class="toggle-switch-small" onclick="event.stopPropagation()" style="flex-shrink: 0;">
                        <input type="checkbox" class="trigger-checkbox" data-category="${category.id}" ${isEnabled ? 'checked' : ''}>
                        <span class="toggle-slider-small"></span>
                    </label>
                </div>
            `;
        }).join('');

        return `
            <div class="settings-section" style="background: linear-gradient(135deg, rgba(166, 192, 221, 0.2), rgba(139, 163, 184, 0.2)); border: 1px solid rgba(166, 192, 221, 0.3); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.125rem; font-weight: 700; color: #FDFAB0; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    ⚠️ Trigger Warnings
                </h2>
                <p style="color: #A6C0DD; font-size: 0.875rem; margin-bottom: 1rem;">
                    Filter content by warnings (${profile.triggerWarnings.enabledCategories.length} active)
                </p>
                
                <!-- Show All Toggle -->
                <div style="margin-bottom: 0.875rem; padding: 0.625rem 0.75rem; background: rgba(166, 192, 221, 0.15); border: 1px solid rgba(166, 192, 221, 0.2); border-radius: 0.625rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="color: #FDFAB0; font-weight: 600; font-size: 0.8125rem;">Show All Warnings</div>
                        <div style="color: #A6C0DD; font-size: 0.6875rem;">Display regardless of selection</div>
                    </div>
                    <label class="toggle-switch" style="flex-shrink: 0;">
                        <input type="checkbox" id="show-all-warnings" ${profile.triggerWarnings.showAllWarnings ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <!-- Categories Grid -->
                <div style="
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 0.5rem;
                    max-width: 100%;
                ">
                    ${categoriesHTML}
                </div>
            </div>
        `;
    }

    renderAccountSection() {
        return `
            <div class="settings-section" style="background: linear-gradient(135deg, rgba(166, 192, 221, 0.2), rgba(139, 163, 184, 0.2)); border: 1px solid rgba(166, 192, 221, 0.3); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.125rem; font-weight: 700; color: #FDFAB0; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    ⚙️ Account
                </h2>

                <button id="logout-btn" style="
                    width: 100%;
                    padding: 1rem;
                    background: linear-gradient(135deg, #A6C0DD, #8ba3b8);
                    border: 2px solid #FDFAB0;
                    border-radius: 0.75rem;
                    color: #18183A;
                    font-weight: 700;
                    font-size: 0.9375rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 12px rgba(166, 192, 221, 0.3);
                " onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 6px 16px rgba(166, 192, 221, 0.4)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 12px rgba(166, 192, 221, 0.3)'">
                    🚪 Sign Out
                </button>
            </div>
        `;
    }

    renderError() {
        this.container.innerHTML = `
            <div style="
                height: 100%;
                overflow-y: auto;
                overflow-x: hidden;
                -webkit-overflow-scrolling: touch;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                gap: 1rem;
                padding: 2rem;
                text-align: center;
            ">
                <div style="font-size: 3rem;">⚠️</div>
                <div style="color: #FDFAB0; font-weight: 700; font-size: 1.25rem;">Not Logged In</div>
                <div style="color: #A6C0DD; font-size: 0.875rem;">Please log in to view your profile</div>
            </div>
        `;
    }

    injectToggleStyles() {
        if (document.getElementById('profile-toggle-styles')) return;

        const style = document.createElement('style');
        style.id = 'profile-toggle-styles';
        style.textContent = `
            /* Regular Toggle Switch */
            .toggle-switch {
                position: relative;
                display: inline-block;
                width: 48px;
                height: 28px;
                flex-shrink: 0;
            }

            .toggle-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }

            .toggle-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(166, 192, 221, 0.3);
                transition: 0.3s;
                border-radius: 28px;
            }

            .toggle-slider:before {
                position: absolute;
                content: "";
                height: 20px;
                width: 20px;
                left: 4px;
                bottom: 4px;
                background: white;
                transition: 0.3s;
                border-radius: 50%;
            }

            input:checked + .toggle-slider {
                background: linear-gradient(135deg, #A6C0DD, #8ba3b8);
            }

            input:checked + .toggle-slider:before {
                transform: translateX(20px);
            }

            /* Small Toggle Switch */
            .toggle-switch-small {
                position: relative;
                display: inline-block;
                width: 36px;
                height: 20px;
                flex-shrink: 0;
            }

            .toggle-switch-small input {
                opacity: 0;
                width: 0;
                height: 0;
            }

            .toggle-slider-small {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(166, 192, 221, 0.3);
                transition: 0.3s;
                border-radius: 20px;
            }

            .toggle-slider-small:before {
                position: absolute;
                content: "";
                height: 14px;
                width: 14px;
                left: 3px;
                bottom: 3px;
                background: white;
                transition: 0.3s;
                border-radius: 50%;
            }

            input:checked + .toggle-slider-small {
                background: linear-gradient(135deg, #A6C0DD, #8ba3b8);
            }

            input:checked + .toggle-slider-small:before {
                transform: translateX(16px);
            }

            /* Hover effects */
            .platform-toggle-item:hover,
            .trigger-toggle-item:hover {
                background: rgba(166, 192, 221, 0.25);
                border-color: rgba(166, 192, 221, 0.4);
            }

            /* Region select styling */
            #region-select:hover {
                background: rgba(166, 192, 221, 0.3);
                border-color: rgba(166, 192, 221, 0.4);
            }

            #region-select:focus {
                outline: none;
                border-color: #A6C0DD;
                box-shadow: 0 0 0 3px rgba(166, 192, 221, 0.2);
            }

            #region-select option {
                background: #18183A;
                color: #FDFAB0;
                padding: 0.5rem;
            }
        `;
        document.head.appendChild(style);
    }

    attachEventListeners() {
        // Add Friend button
        const addFriendBtn = document.getElementById('add-friend-btn');
        if (addFriendBtn) {
            addFriendBtn.addEventListener('click', () => {
                this.showToast('Friend feature coming soon! 🎬');
                console.log('[Profile] Add Friend clicked');
            });
        }

        // Theme toggle - FIXED!
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('change', (e) => {
                this.currentTheme = e.target.checked ? 'dark' : 'light';
                localStorage.setItem('app-theme', this.currentTheme);
                this.showToast(`Switched to ${this.currentTheme} mode ✨`);
                console.log('[Profile] Theme changed to:', this.currentTheme);
                
                // Re-render the theme section only
                const themeSection = this.container.querySelector('.settings-section');
                if (themeSection && themeSection.querySelector('#theme-toggle')) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = this.renderThemeSection();
                    themeSection.replaceWith(tempDiv.firstElementChild);
                    this.attachEventListeners(); // Re-attach all listeners
                }
            });
        }

        // Region select
        const regionSelect = document.getElementById('region-select');
        if (regionSelect) {
            regionSelect.addEventListener('change', (e) => {
                userProfileService.updateRegion(e.target.value);
                const selectedRegion = TMDB_REGIONS.find(r => r.code === e.target.value);
                this.showToast(`Region updated to ${selectedRegion?.name || e.target.value} ${selectedRegion?.flag || ''}`);
            });
        }

        // Platform checkboxes
        const platformCheckboxes = document.querySelectorAll('.platform-checkbox');
        platformCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const platformId = e.target.dataset.platform;
                userProfileService.togglePlatform(platformId);
                
                const platform = STREAMING_PLATFORMS.find(p => p.id === platformId);
                const isEnabled = e.target.checked;
                this.showToast(`${platform?.name || platformId} ${isEnabled ? 'enabled ✅' : 'disabled ❌'}`);
            });
        });

        // Trigger warning checkboxes
        const triggerCheckboxes = document.querySelectorAll('.trigger-checkbox');
        triggerCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const categoryId = parseInt(e.target.dataset.category);
                const isEnabled = e.target.checked;
                
                if (isEnabled) {
                    userProfileService.enableTriggerCategory(categoryId);
                } else {
                    userProfileService.disableTriggerCategory(categoryId);
                }
                
                const category = TRIGGER_CATEGORIES.find(c => c.id === categoryId);
                this.showToast(`${category?.name || 'Category'} ${isEnabled ? 'enabled ✅' : 'disabled ❌'}`);
            });
        });

        // Show all warnings toggle
        const showAllCheckbox = document.getElementById('show-all-warnings');
        if (showAllCheckbox) {
            showAllCheckbox.addEventListener('change', (e) => {
                userProfileService.setShowAllWarnings(e.target.checked);
                this.showToast(e.target.checked ? 'Showing all warnings ⚠️' : 'Showing selected categories');
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await authService.signOut();
                    this.showToast('Signed out successfully 👋');
                    setTimeout(() => window.location.reload(), 1000);
                } catch (error) {
                    console.error('[ProfileTab] Logout failed:', error);
                    this.showToast('Failed to sign out ❌', true);
                }
            });
        }
    }

    getInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    showToast(message, isError = false) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 7rem;
            left: 50%;
            transform: translateX(-50%);
            padding: 0.875rem 1.5rem;
            background: ${isError ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'linear-gradient(135deg, #A6C0DD, #8ba3b8)'};
            border: 1px solid ${isError ? 'rgba(220, 38, 38, 0.5)' : 'rgba(166, 192, 221, 0.5)'};
            color: ${isError ? 'white' : '#18183A'};
            border-radius: 0.75rem;
            font-weight: 600;
            font-size: 0.875rem;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            animation: slideUp 0.3s ease-out;
        `;
        
        const keyframes = document.createElement('style');
        keyframes.textContent = `
            @keyframes slideUp {
                from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            @keyframes slideDown {
                from { opacity: 1; transform: translateX(-50%) translateY(0); }
                to { opacity: 0; transform: translateX(-50%) translateY(20px); }
            }
        `;
        document.head.appendChild(keyframes);
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease-in';
            setTimeout(() => {
                toast.remove();
                keyframes.remove();
            }, 300);
        }, 2500);
    }
}
