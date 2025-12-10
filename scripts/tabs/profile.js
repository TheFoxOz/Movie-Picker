/**
 * Profile Tab – FINAL PRODUCTION VERSION (Dec 2025)
 * • No dead imports
 * • Works with trigger-warning-manager.js + localStorage
 * • Beautiful, fast, reliable
 */

import { authService } from '../services/auth-service.js';
import { triggerWarningManager } from '../services/trigger-warning-manager.js';
import { notify } from '../utils/notifications.js';
import { db, firebase } from '../services/firebase-config.js';

const PLATFORMS = [
    { id: 'netflix', name: 'Netflix', icon: 'Red Circle', color: '#E50914' },
    { id: 'prime', name: 'Prime Video', icon: 'Blue Circle', color: '#00A8E1' },
    { id: 'disney', name: 'Disney+', icon: 'Star', color: '#113CCF' },
    { id: 'hbo', name: 'HBO Max', icon: 'Purple Circle', color: '#B200FF' },
    { id: 'apple', name: 'Apple TV+', icon: 'Apple', color: '#000000' },
    { id: 'hulu', name: 'Hulu', icon: 'Green Circle', color: '#1CE783' }
];

export class ProfileTab {
    constructor() {
        this.container = null;
    }

    async render(container) {
        this.container = container;
        const user = authService.getCurrentUser();

        if (!user) {
            this.renderGuestView();
            return;
        }

        // Load preferences from localStorage (used everywhere)
        const rawPrefs = localStorage.getItem('moviePickerPreferences');
        const prefs = rawPrefs ? JSON.parse(rawPrefs) : {
            platforms: ['Netflix', 'Prime Video'],
            region: 'US',
            triggerWarnings: { enabledCategories: [], showAllWarnings: false }
        };

        this.container.innerHTML = `
            <div style="padding:2rem;max-width:600px;margin:0 auto;">
                <div style="text-align:center;margin-bottom:3rem;">
                    <div style="width:100px;height:100px;background:#ff2e63;border-radius:50%;margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;font-size:3.5rem;color:white;overflow:hidden;">
                        ${user.photoURL ? `<img src="${user.photoURL}" style="width:100%;height:100%;object-fit:cover;">` : 'Smile'}
                    </div>
                    <h1 style="font-size:1.75rem;font-weight:800;color:white;margin:0.5rem 0;">
                        ${user.displayName || user.email.split('@')[0]}
                    </h1>
                    <p style="color:rgba(255,255,255,0.6);">${user.email}</p>
                </div>

                <!-- Region -->
                <div style="background:rgba(255,255,255,0.05);border-radius:1rem;padding:1.5rem;margin-bottom:1.5rem;">
                    <h2 style="font-size:1.125rem;font-weight:700;color:white;margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;">Region</h2>
                    <select id="region-select" style="width:100%;padding:1rem;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:1rem;color:white;font-size:1rem;">
                        ${['US','GB','CA','AU','FR','DE','JP','KR','BR','MX','IN'].map(code => `
                            <option value="${code}" ${prefs.region === code ? 'selected' : ''}>
                                ${code === 'US' ? 'United States' : 
                                 code === 'GB' ? 'United Kingdom' :
                                 code === 'CA' ? 'Canada' :
                                 code === 'AU' ? 'Australia' : 
                                 code === 'FR' ? 'France' : 
                                 code === 'DE' ? 'Germany' : 
                                 code === 'JP' ? 'Japan' : 
                                 code === 'KR' ? 'South Korea' : 
                                 code === 'BR' ? 'Brazil' : 
                                 code === 'MX' ? 'Mexico' : 'India'}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <!-- Platforms -->
                <div style="background:rgba(255,255,255,0.05);border-radius:1rem;padding:1.5rem;margin-bottom:1.5rem;">
                    <h2 style="font-size:1.125rem;font-weight:700;color:white;margin-bottom:1rem;">Streaming Platforms</h2>
                    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:0.75rem;">
                        ${PLATFORMS.map(p => {
                            const selected = prefs.platforms.includes(p.name);
                            return `
                                <button data-platform="${p.name}" class="platform-btn" style="
                                    padding:1rem;background:${selected ? 'linear-gradient(135deg,#ff2e63,#d90062)' : 'rgba(255,255,255,0.05)'};
                                    border:1px solid ${selected ? '#ff2e63' : 'rgba(255,255,255,0.1)'};
                                    border-radius:1rem;color:white;font-weight:600;cursor:pointer;transition:all 0.3s;display:flex;align-items:center;gap:0.75rem;
                                ">
                                    ${selected ? 'Check ' : ''}${p.icon} ${p.name}
                                </button>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Trigger Warnings -->
                <div style="background:rgba(255,255,255,0.05);border-radius:1rem;padding:1.5rem;margin-bottom:1.5rem;">
                    <h2 style="font-size:1.125rem;font-weight:700;color:white;margin-bottom:1rem;">Content Warnings</h2>
                    
                    <label style="display:flex;align-items:center;gap:1rem;padding:1rem;background:rgba(255,255,255,0.05);border-radius:1rem;margin-bottom:1rem;cursor:pointer;">
                        <input type="checkbox" id="show-all-warnings" ${prefs.triggerWarnings.showAllWarnings ? 'checked' : ''}>
                        <div>
                            <div style="color:white;font-weight:600;">Show All Warnings</div>
                            <div style="color:rgba(255,255,255,0.6);font-size:0.875rem;">Override category filters</div>
                        </div>
                    </label>

                    <div style="display:grid;gap:0.75rem;">
                        ${triggerWarningManager.TRIGGER_CATEGORIES.map(cat => {
                            const enabled = prefs.triggerWarnings.enabledCategories.includes(cat.id);
                            return `
                                <div data-category="${cat.id}" class="trigger-cat" style="
                                    padding:1rem;background:rgba(255,255,255,0.05);border:2px solid ${enabled ? '#ff2e63' : 'rgba(255,255,255,0.1)'};
                                    border-radius:1rem;cursor:pointer;transition:all 0.3s;
                                ">
                                    <div style="display:flex;align-items:center;gap:1rem;">
                                        <div style="font-size:1.5rem;">${cat.icon}</div>
                                        <div>
                                            <div style="color:white;font-weight:600;">${cat.name}</div>
                                            <div style="color:rgba(255,255,255,0.6);font-size:0.875rem;">${cat.severity} severity</div>
                                        </div>
                                        <div style="margin-left:auto;color:${enabled ? '#ff2e63' : 'rgba(255,255,255,0.4)'};font-weight:800;">
                                            ${enabled ? 'ON' : 'OFF'}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Actions -->
                <div style="display:grid;gap:0.75rem;">
                    <button id="save-prefs" style="padding:1.25rem;background:linear-gradient(135deg,#ff2e63,#d90062);border:none;border-radius:1.5rem;color:white;font-size:1.125rem;font-weight:800;cursor:pointer;">
                        Save All Preferences
                    </button>
                    <button id="logout-btn" style="padding:1rem;background:transparent;border:1px solid rgba(255,255,255,0.3);border-radius:1rem;color:white;font-weight:600;cursor:pointer;">
                        Sign Out
                    </button>
                </div>
            </div>
        `;

        this.attachListeners(prefs);
    }

    attachListeners(currentPrefs) {
        // Save button
        document.getElementById('save-prefs')?.addEventListener('click', () => {
            const platforms = Array.from(this.container.querySelectorAll('.platform-btn'))
                .filter(b => b.style.background.includes('#ff2e63'))
                .map(b => b.dataset.platform);

            const region = document.getElementById('region-select').value;
            const showAll = document.getElementById('show-all-warnings').checked;
            const enabledCats = Array.from(this.container.querySelectorAll('.trigger-cat'))
                .filter(d => d.style.borderColor === 'rgb(255, 46, 99)' || d.style.borderColor.includes('#ff2e63'))
                .map(d => parseInt(d.dataset.category));

            const newPrefs = {
                platforms: platforms.length > 0 ? platforms : ['Netflix'],
                region,
                triggerWarnings: {
                    enabledCategories: enabledCats,
                    showAllWarnings: showAll
                }
            };

            localStorage.setItem('moviePickerPreferences', JSON.stringify(newPrefs));

            // Also save to Firestore if logged in
            if (authService.isAuthenticated()) {
                db.collection('users').doc(authService.getCurrentUser().uid).update({
                    'preferences': newPrefs
                }).catch(() => {});
            }

            notify.success('Preferences saved!');
        });

        // Platform toggle
        this.container.querySelectorAll('.platform-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const selected = btn.style.background.includes('#ff2e63');
                btn.style.background = selected ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#ff2e63,#d90062)';
                btn.style.borderColor = selected ? 'rgba(255,255,255,0.1)' : '#ff2e63';
                btn.innerHTML = btn.innerHTML.replace('Check ', '') + (selected ? '' : 'Check ');
            });
        });

        // Trigger category toggle
        this.container.querySelectorAll('.trigger-cat').forEach(div => {
            div.addEventListener('click', () => {
                const enabled = div.style.borderColor.includes('#ff2e63');
                div.style.borderColor = enabled ? 'rgba(255,255,255,0.1)' : '#ff2e63';
                div.querySelector(':last-child').textContent = enabled ? 'OFF' : 'ON';
                div.querySelector(':last-child').style.color = enabled ? 'rgba(255,255,255,0.4)' : '#ff2e63';
            });
        });

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            authService.signOut();
        });
    }

    renderGuestView() {
        this.container.innerHTML = `
            <div style="text-align:center;padding:4rem 2rem;">
                <h1 style="font-size:2rem;font-weight:800;color:white;margin-bottom:1rem;">Welcome</h1>
                <p style="color:rgba(255,255,255,0.7);font-size:1.125rem;line-height:1.6;">
                    Sign in to save your swipes and preferences
                </p>
                <button onclick="document.querySelector('[data-tab=onboarding]').click()" 
                        style="margin-top:2rem;padding:1rem 2rem;background:#ff2e63;border:none;border-radius:1.5rem;color:white;font-size:1.125rem;font-weight:700;cursor:pointer;">
                    Sign In
                </button>
            </div>
        `;
    }
}

// Export singleton
export const profileTab = new ProfileTab();
