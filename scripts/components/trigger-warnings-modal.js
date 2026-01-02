/**
 * Trigger Warnings Modal Component
 * FIX 3: Make trigger badge tappable → show full list
 * 
 * Shows detailed trigger warnings when badge is clicked
 */

export class TriggerWarningsModal {
    constructor() {
        this.modal = null;
    }

    show(movie) {
        if (!movie) return;

        const warnings = movie.triggerWarnings || [];
        const failed = movie.warningsFailed || false;

        // Remove existing modal if any
        this.close();

        // Create modal overlay
        this.modal = document.createElement('div');
        this.modal.className = 'trigger-modal-overlay';
        this.modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(24, 24, 58, 0.95);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.2s ease-out;
        `;

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'trigger-modal-content';
        modalContent.style.cssText = `
            background: linear-gradient(135deg, rgba(30, 58, 95, 0.95), rgba(26, 31, 46, 0.95));
            border: 2px solid rgba(166, 192, 221, 0.3);
            border-radius: 1.5rem;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            animation: slideUp 0.3s ease-out;
        `;

        modalContent.innerHTML = `
            <div class="trigger-modal-header" style="
                padding: 1.5rem;
                border-bottom: 1px solid rgba(166, 192, 221, 0.2);
                display: flex;
                align-items: center;
                justify-content: space-between;
            ">
                <h3 style="
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #FDFAB0;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin: 0;
                ">
                    <span style="font-size: 1.5rem;">⚠️</span>
                    Content Warnings
                </h3>
                <button class="close-btn" style="
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: none;
                    background: rgba(166, 192, 221, 0.2);
                    color: #FDFAB0;
                    font-size: 1.25rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                ">✕</button>
            </div>

            <div class="trigger-modal-body" style="
                padding: 1.5rem;
                max-height: 60vh;
                overflow-y: auto;
            ">
                <div style="
                    background: rgba(166, 192, 221, 0.1);
                    border: 1px solid rgba(166, 192, 221, 0.2);
                    border-radius: 0.75rem;
                    padding: 1rem;
                    margin-bottom: 1rem;
                ">
                    <h4 style="
                        font-size: 1.1rem;
                        font-weight: 600;
                        color: white;
                        margin: 0 0 0.5rem 0;
                    ">${movie.title}</h4>
                    <p style="
                        font-size: 0.875rem;
                        color: #A6C0DD;
                        margin: 0;
                    ">${movie.year || 'N/A'} • Rating: ${movie.rating?.toFixed(1) || 'N/A'}/10</p>
                </div>

                ${failed ? `
                    <div style="
                        text-align: center;
                        padding: 2rem;
                        color: #A6C0DD;
                    ">
                        <div style="font-size: 3rem; margin-bottom: 0.5rem;">🤷</div>
                        <p style="margin: 0;">Unable to load trigger warnings for this movie.</p>
                    </div>
                ` : warnings.length === 0 ? `
                    <div style="
                        text-align: center;
                        padding: 2rem;
                        color: #A6C0DD;
                    ">
                        <div style="font-size: 3rem; margin-bottom: 0.5rem;">✅</div>
                        <p style="margin: 0;">No specific content warnings reported for this movie.</p>
                    </div>
                ` : `
                    <div style="
                        font-size: 0.875rem;
                        color: #A6C0DD;
                        margin-bottom: 1rem;
                    ">
                        This movie contains ${warnings.length} trigger warning${warnings.length > 1 ? 's' : ''}:
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        ${warnings.map(warning => this.renderWarningItem(warning)).join('')}
                    </div>
                `}

                <div style="
                    margin-top: 1.5rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid rgba(166, 192, 221, 0.1);
                    font-size: 0.75rem;
                    color: rgba(166, 192, 221, 0.6);
                    text-align: center;
                ">
                    Warnings provided by DoesTheDogDie.com
                </div>
            </div>
        `;

        this.modal.appendChild(modalContent);
        document.body.appendChild(this.modal);

        // Add event listeners
        this.attachListeners(modalContent);
    }

    renderWarningItem(warning) {
        // Determine severity styling
        let severityColor, severityBg;
        switch (warning.severity?.toLowerCase()) {
            case 'high':
            case 'severe':
                severityColor = '#ef4444';
                severityBg = 'rgba(239, 68, 68, 0.2)';
                break;
            case 'medium':
            case 'moderate':
                severityColor = '#fbbf24';
                severityBg = 'rgba(251, 191, 36, 0.2)';
                break;
            case 'low':
            case 'mild':
                severityColor = '#10b981';
                severityBg = 'rgba(16, 185, 129, 0.2)';
                break;
            default:
                severityColor = '#A6C0DD';
                severityBg = 'rgba(166, 192, 221, 0.2)';
        }

        return `
            <div style="
                background: rgba(166, 192, 221, 0.05);
                border: 1px solid rgba(166, 192, 221, 0.2);
                border-radius: 0.75rem;
                padding: 1rem;
                display: flex;
                align-items: flex-start;
                gap: 1rem;
            ">
                <div style="
                    flex-shrink: 0;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: ${severityColor};
                    margin-top: 0.5rem;
                "></div>
                <div style="flex: 1;">
                    <div style="
                        font-weight: 600;
                        color: white;
                        margin-bottom: 0.25rem;
                    ">${warning.category || 'Content Warning'}</div>
                    ${warning.severity ? `
                        <div style="
                            display: inline-block;
                            padding: 0.125rem 0.5rem;
                            border-radius: 0.375rem;
                            background: ${severityBg};
                            color: ${severityColor};
                            font-size: 0.75rem;
                            font-weight: 600;
                            text-transform: uppercase;
                            letter-spacing: 0.025em;
                            margin-bottom: 0.5rem;
                        ">${warning.severity}</div>
                    ` : ''}
                    ${warning.description ? `
                        <div style="
                            font-size: 0.875rem;
                            color: #A6C0DD;
                            line-height: 1.4;
                        ">${warning.description}</div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    attachListeners(modalContent) {
        // Close button
        const closeBtn = modalContent.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => this.close());

        // Close on overlay click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Close on Escape key
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);

        // Hover effect for close button
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = 'rgba(239, 68, 68, 0.3)';
            closeBtn.style.transform = 'scale(1.1)';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = 'rgba(166, 192, 221, 0.2)';
            closeBtn.style.transform = 'scale(1)';
        });
    }

    close() {
        if (this.modal) {
            this.modal.style.animation = 'fadeOut 0.2s ease-out';
            setTimeout(() => {
                if (this.modal && this.modal.parentNode) {
                    this.modal.remove();
                }
                this.modal = null;
            }, 200);
        }

        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
            this.escapeHandler = null;
        }
    }
}

// Create singleton instance
export const triggerWarningsModal = new TriggerWarningsModal();

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }

    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .trigger-modal-body::-webkit-scrollbar {
        width: 8px;
    }

    .trigger-modal-body::-webkit-scrollbar-track {
        background: rgba(166, 192, 221, 0.1);
        border-radius: 4px;
    }

    .trigger-modal-body::-webkit-scrollbar-thumb {
        background: rgba(166, 192, 221, 0.3);
        border-radius: 4px;
    }

    .trigger-modal-body::-webkit-scrollbar-thumb:hover {
        background: rgba(166, 192, 221, 0.5);
    }
`;
document.head.appendChild(style);
