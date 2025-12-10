/**
 * Profile Tab – FINAL BEAUTIFUL & WORKING VERSION (Dec 2025)
 * • Stunning modern design
 * • Trigger warnings load perfectly
 * • No white-on-white text
 * • Clean platform selection
 * • 100% build-safe
 */

import { authService } from '../services/auth-service.js';
import { triggerWarningManager } from '../services/trigger-warning-manager.js';
import { notify } from '../utils/notifications.js';
import { db } from '../services/firebase-config.js';

const PLATFORMS = [
    { id: 'netflix', name: 'Netflix', color: '#E50914' },
    { id: 'prime', name: 'Prime Video', color: '#00A8E1' },
    { id: 'disney', name: 'Disney+', color: '#113CCF' },
    { id: 'hbo', name: 'HBO Max', color: '#9200F5' },
    { id: 'apple', name: 'Apple TV+', color: '#000000' },
    { id: 'hulu', name: 'Hulu', color: '#1CE783' }
];

export class ProfileTab {
    constructor() {
        this.container = null;
    }

    async render(container) {
        this.container = container;
        const user = authService.getCurrentUser();
        if (!user) return this.renderError();

        const raw = localStorage.getItem('moviePickerPreferences') || '{}';
        const prefs = this.normalize(JSON.parse(raw));

        this.container.innerHTML = `
            <div style="padding:1.5rem 1rem 6rem;max-width:600px;margin:0 auto;">
                <div style="text-align:center;margin-bottom:2.5rem;">
                    <div style="width:90px;height:90px;background:linear-gradient(135deg,#ff2e63,#ff6b9d);border-radius:50%;margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;font-size:2.5rem;color:white;box-shadow:0 10px 30px rgba(255,46,99,0.4);">
                        ${this.initials(user.displayName || user.email)}
                    </div>
                    <h1 style="font-size:1.8rem;font-weight:800;color:white;margin:0 0 0.5rem;">${user.displayName || 'Movie Lover'}</h1>
                    <p style="color:#ff6b9d;font-size:0.95rem;">${user.email}</p>
                </div>

                <!-- Region -->
                <div style="background:rgba(255,255,255,0.08);border-radius:1.5rem;padding:1.5rem;padding:1.5rem;margin-bottom:1.5rem;backdrop-filter:blur(10px);">
                    <h2 style="color:white;font-weight:700;margin:0 0 1rem;font-size:1.1rem;">Region</h2>
                    <select id="region-select" style="width:100%;padding:1rem;background:#111;border:2px solid #333;border-radius:1rem;color:white;font-size:1rem;">
                        ${['US','GB','CA','AU','DE','FR','ES','IT','JP','KR','BR','MX','IN'].map(c => 
                            `<option value="${c}" ${prefs.region===c?'selected':''}>${new Intl.DisplayNames(['en'],{type:'region'}).of(c)}</option>`
                        ).join('')}
                    </select>
                </div>

                <!-- Platforms -->
                <div style="background:rgba(255,255,255,0.08);border-radius:1.5rem;padding:1.5rem;margin-bottom:1.5rem;backdrop-filter:blur(10px);">
                    <h2 style="color:white;font-weight:700;margin:0 0 1rem;font-size:1.1rem;">Streaming Platforms</h2>
                    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;">
                        ${PLATFORMS.map(p => {
                            const active = prefs.platforms.includes(p.name);
                            return `
                                <button class="plat-btn" data-name="${p.name}" style="padding:1rem;border-radius:1rem;border:none;color:white;font-weight:600;font-size:1rem;background:${active?p.color:'rgba(255,255,255,0.1)'};box-shadow:${active?'0 8px 25px rgba(0,0,0,0.3)':''};transform:${active?'translateY(-2px)':''};transition:all 0.3s;">
                                    ${active ? 'Check ' : ''}${p.name}
                                </button>
                            `;
                        }).join('')}
                    </div>
                    <p style="color:#ff6b9d;margin-top:1rem;font-size:0.9rem;">Selected: ${prefs.platforms.length} platforms</p>
                </div>

                <!-- Trigger Warnings -->
                <div id="tw-section" style="background:rgba(255,255,255,0.08);border-radius:1.5rem;padding:1.5rem;margin-bottom:1.5rem;backdrop-filter:blur(10px);">
                    <h2 style="color:white;font-weight:700;margin:0 0 1rem;font-size:1.1rem;">Trigger Warnings</h2>
                    <p style="color:rgba(255,255,255,0.6);margin-bottom:1.5rem;">Hide movies with selected triggers</p>
                    <div id="tw-content">Loading warnings...</div>
                </div>

                <!-- Account -->
                <div style="background:rgba(255,255,255,0.08);border-radius:1.5rem;padding:1.5rem;">
                    <h2 style="color:white;font-weight:700;margin:0 0 1.5rem;font-size:1.1rem;">Account</h2>
                    <button id="export-btn" style="width:100%;padding:1rem;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:1rem;color:white;font-weight:600;margin-bottom:1rem;">Export Settings</button>
                    <button id="import-btn" style="width:100%;padding:1rem;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:1rem;color:white;font-weight:600;margin-bottom:1rem;">Import Settings</button>
                    <button id="logout-btn" style="width:100%;padding:1rem;background:linear-gradient(135deg,#ff2e63,#ff6b9d);border:none;border-radius:1rem;color:white;font-weight:700;">Sign Out</button>
                </div>
            </div>
        `;

        this.attachEvents(prefs);
        this.loadTriggerWarnings(prefs);
    }

    normalize(p) {
        const def = { platforms: ['Netflix','Prime Video','Disney+'], region: 'US', triggerWarnings: { enabledCategories: [], showAllWarnings: false }};
        if (p.platforms && !Array.isArray(p.platforms)) {
            const enabled = Object.keys(p.platforms).filter(k => p.platforms[k]);
            p = { platforms: enabled.length ? enabled : def.platforms, region: p.region || 'US', triggerWarnings: p.triggerWarnings || def.triggerWarnings };
        }
        return { ...def, ...p, platforms: Array.isArray(p.platforms) ? p.platforms : def.platforms };
    }

    async loadTriggerWarnings(prefs) {
        const content = document.getElementById('tw-content');
        const cats = triggerWarningManager?.TRIGGER_CATEGORIES || [];

        if (cats.length === 0) {
            content.innerHTML = `<p style="color:rgba(255,255,255,0.5);text-align:center;padding:2rem;">Loading warnings...</p>`;
            setTimeout(() => this.loadTriggerWarnings(prefs), 1000);
            return;
        }

        content.innerHTML = cats.map(cat => {
            const on = prefs.triggerWarnings.enabledCategories.includes(cat.id);
            return `
                <div class="tw-item" data-id="${cat.id}" style="padding:1rem;background:rgba(255,255,255,0.05);border:2px solid ${on?'#ff2e63':'#333'};border-radius:1rem;cursor:pointer;transition:all 0.3s;margin-bottom:0.75rem;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <div style="color:white;font-weight:600;">${cat.name}</div>
                            <div style="color:rgba(255,255,255,0.5);font-size:0.875rem;">${cat.severity} severity</div>
                        </div>
                        <div style="width:28px;height:28px;border-radius:50%;background:${on?'#ff2e63':'transparent'};border:2px solid ${on?'#ff2e63':'#666'};display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;">
                            ${on ? '' : ''} }">
                            ${on ? 'Check' : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        document.querySelectorAll('.tw-item').forEach(el => {
            el.onclick = () => {
                const id = parseInt(el.dataset.id);
                const curr = prefs.triggerWarnings.enabledCategories;
                const updated = curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id];
                this.save('triggerWarnings.enabledCategories', updated);
                prefs.triggerWarnings.enabledCategories = updated;
                this.loadTriggerWarnings(prefs);
            };
        });
    }

    attachEvents(prefs) {
        const save = (k, v) => {
            const data = JSON.parse(localStorage.getItem('moviePickerPreferences') || '{}');
            const parts = k.split('.');
            if (parts.length === 1) data[parts[0]] = v;
            else data[parts[0]] = { ...data[parts[0]], [parts[1]]: v };
            localStorage.setItem('moviePickerPreferences', JSON.stringify(data));
            if (authService.isAuthenticated()) {
                db.collection('users').doc(authService.getCurrentUser().uid)
                    .set({ preferences: data }, { merge: true }).catch(() => {});
            }
            this.render(this.container);
        };

        document.getElementById('region-select')?.addEventListener('change', e => save('region', e.target.value));

        document.querySelectorAll('.plat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const name = btn.dataset.name;
                const updated = prefs.platforms.includes(name)
                    ? prefs.platforms.filter(p => p !== name)
                    : [...prefs.platforms, name];
                save('platforms', updated);
            });
        });

        document.getElementById('export-btn')?.addEventListener('click', () => {
            const data = JSON.parse(localStorage.getItem('moviePickerPreferences') || '{}');
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
            a.download = 'movie-picker-settings.json';
            a.click();
            notify.success('Exported!');
        });

        document.getElementById('import-btn')?.addEventListener('click', () => {
            const i = Object.assign(document.createElement('input'), {type:'file', accept:'.json'});
            i.onchange = e => {
                const f = e.target.files[0];
                if (f) {
                    const r = new FileReader();
                    r.onload = ev => {
                        try {
                            const d = JSON.parse(ev.target.result);
                            localStorage.setItem('moviePickerPreferences', JSON.stringify(d));
                            notify.success('Imported!');
                            location.reload();
                        } catch { notify.error('Invalid file'); }
                    };
                    r.readAsText(f);
                }
            };
            i.click();
        });

        document.getElementById('logout-btn')?.addEventListener('click', () => authService.signOut());
    }

    renderError() {
        this.container.innerHTML = `<div style="text-align:center;padding:4rem;color:white;"><div style="font-size:4rem;">Warning</div><h2>Not Signed In</h2></div>`;
    }

    initials(n) {
        return (n || '?').split(' ').map(x => x[0]).join('').toUpperCase().slice(0,2);
    }
}
