/**
 * Profile Tab – select platforms and block triggers
 */

import { store } from "../state/store.js";

const AVAILABLE_PLATFORMS = [
    "netflix", "prime video", "disney+", "hbo max", "hulu", "apple tv", "bbc iplayer"
];

// Minimal list — expand to match your trigger taxonomy
const AVAILABLE_TRIGGERS = [
    "violence", "self_harm", "animal_death", "sexual_content", "suicide", "drug_use", "flashing_lights"
];

export class ProfileTab {
    constructor() {
        this.container = null;
    }

    render(container) {
        this.container = container;

        const state = store.getState();
        const user = state.user || {};
        const selectedPlatforms = Array.isArray(user.selectedPlatforms) ? user.selectedPlatforms : [];
        const blockedTriggers = Array.isArray(user.blockedTriggers) ? user.blockedTriggers : [];

        container.innerHTML = `
            <div style="padding:1rem;color:white;">
                <h2>Profile</h2>

                <div style="margin-top:12px;">
                    <h3 style="margin:0 0 8px 0;">Streaming Platforms</h3>
                    <div id="platforms" style="display:flex;flex-wrap:wrap;gap:8px;"></div>
                </div>

                <div style="margin-top:18px;">
                    <h3 style="margin:0 0 8px 0;">Block Content / Trigger Warnings</h3>
                    <div id="triggers" style="display:flex;flex-direction:column;gap:8px;"></div>
                </div>

                <div style="margin-top:18px;">
                    <button id="save-profile" style="padding:10px 14px;border-radius:8px;border:none;background:#ff2e63;color:white;cursor:pointer;">Save</button>
                </div>
            </div>
        `;

        const pContainer = container.querySelector("#platforms");
        AVAILABLE_PLATFORMS.forEach(p => {
            const btn = document.createElement("button");
            const active = selectedPlatforms.includes(p);
            btn.textContent = p;
            btn.style = `padding:8px 10px;border-radius:8px;border:${active ? '2px solid #ff2e63' : '1px solid rgba(255,255,255,0.06)'}; background:${active ? 'rgba(255,46,99,0.12)' : 'transparent'}; color:white; cursor:pointer; text-transform:capitalize;`;
            btn.dataset.platform = p;
            btn.addEventListener("click", () => {
                const idx = selectedPlatforms.indexOf(p);
                if (idx === -1) selectedPlatforms.push(p);
                else selectedPlatforms.splice(idx, 1);
                // re-render buttons (quick & simple)
                this.render(container);
            });
            pContainer.appendChild(btn);
        });

        const tContainer = container.querySelector("#triggers");
        AVAILABLE_TRIGGERS.forEach(t => {
            const row = document.createElement("label");
            row.style = "display:flex;align-items:center;gap:8px;cursor:pointer;";
            row.innerHTML = `<input type="checkbox" data-trigger="${t}" ${blockedTriggers.includes(t) ? 'checked' : ''} /> <span style="color:white;text-transform:capitalize;">${t.replace(/_/g,' ')}</span>`;
            tContainer.appendChild(row);
        });

        this.container.querySelector("#save-profile").addEventListener("click", () => {
            const selected = Array.from(this.container.querySelectorAll("#platforms button"))
                .filter(b => b.style.border.includes("#ff2e63"))
                .map(b => b.dataset.platform);

            const blocked = Array.from(this.container.querySelectorAll("#triggers input[type='checkbox']"))
                .filter(cb => cb.checked)
                .map(cb => cb.dataset.trigger);

            // Write to store.user (adjust shape to your store implementation)
            const current = store.getState();
            const newState = {
                ...current,
                user: {
                    ...(current.user || {}),
                    selectedPlatforms: selected,
                    blockedTriggers: blocked
                }
            };

            store.setState(newState);
            showSavedToast();
        });

        const showSavedToast = () => {
            const el = document.createElement("div");
            el.textContent = "Profile saved";
            el.style = "position:fixed;bottom:6rem;left:50%;transform:translateX(-50%);background:#111;padding:8px 12px;border-radius:8px;color:white;";
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 1400);
        };
    }

    destroy() {
        // no-op
    }
}
