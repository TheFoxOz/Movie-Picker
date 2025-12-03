/**
 * Toast Notification System
 * Shows temporary success/error/info messages
 */

import { ENV } from '../config/env.js';

let toastContainer = null;
let activeToast = null;
let undoCallback = null;

/**
 * Initialize toast container
 */
function initToastContainer() {
    if (toastContainer) return;
    
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
        position: fixed;
        bottom: 6rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        pointer-events: none;
        width: calc(100% - 2rem);
        max-width: 400px;
    `;
    document.body.appendChild(toastContainer);
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duration in ms (default: 3000)
 * @param {function} onUndo - Optional undo callback function
 */
export function showToast(message, type = 'info', duration = 3000, onUndo = null) {
    initToastContainer();
    
    // Remove active toast if exists
    if (activeToast) {
        removeToast(activeToast);
    }
    
    // Store undo callback
    undoCallback = onUndo;
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    // Set colors based on type
    const styles = {
        success: {
            bg: 'rgba(16, 185, 129, 0.15)',
            border: 'rgba(16, 185, 129, 0.4)',
            color: '#10b981',
            icon: '✓'
        },
        error: {
            bg: 'rgba(239, 68, 68, 0.15)',
            border: 'rgba(239, 68, 68, 0.4)',
            color: '#ef4444',
            icon: '✕'
        },
        warning: {
            bg: 'rgba(251, 191, 36, 0.15)',
            border: 'rgba(251, 191, 36, 0.4)',
            color: '#fbbf24',
            icon: '⚠'
        },
        info: {
            bg: 'rgba(99, 102, 241, 0.15)',
            border: 'rgba(99, 102, 241, 0.4)',
            color: '#6366f1',
            icon: 'ℹ'
        }
    };
    
    const style = styles[type] || styles.info;
    
    toast.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 1rem 1.25rem;
        background: ${style.bg};
        backdrop-filter: blur(10px);
        border: 1px solid ${style.border};
        border-radius: 1rem;
        color: white;
        font-size: 0.9375rem;
        font-weight: 600;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        pointer-events: auto;
        transform: translateY(20px);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    // Build toast content
    let toastHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0;">
            <span style="font-size: 1.25rem; flex-shrink: 0;">${style.icon}</span>
            <span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${message}</span>
        </div>
    `;
    
    // Add undo button if callback provided
    if (onUndo) {
        toastHTML += `
            <button 
                class="toast-undo-btn"
                style="padding: 0.375rem 0.875rem; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 0.5rem; color: white; font-size: 0.8125rem; font-weight: 700; cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.05em; flex-shrink: 0;"
                onmouseover="this.style.background='rgba(255, 255, 255, 0.25)'"
                onmouseout="this.style.background='rgba(255, 255, 255, 0.15)'"
            >
                Undo
            </button>
        `;
    }
    
    toast.innerHTML = toastHTML;
    toastContainer.appendChild(toast);
    activeToast = toast;
    
    // Attach undo button listener
    if (onUndo) {
        const undoBtn = toast.querySelector('.toast-undo-btn');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                onUndo();
                removeToast(toast);
                showToast('↩️ Action undone', 'info', 2000);
                
                if (ENV.APP.debug) {
                    console.log('[Notifications] Undo action triggered');
                }
            });
        }
    }
    
    // Animate in
    requestAnimationFrame(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    });
    
    // Auto-remove after duration
    const timeout = setTimeout(() => {
        removeToast(toast);
    }, duration);
    
    // Store timeout for early removal
    toast.dataset.timeout = timeout;
    
    if (ENV.APP.debug) {
        console.log('[Notifications] Toast shown:', message, type);
    }
}

/**
 * Remove a toast
 */
function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    
    // Clear timeout
    if (toast.dataset.timeout) {
        clearTimeout(parseInt(toast.dataset.timeout));
    }
    
    // Animate out
    toast.style.transform = 'translateY(20px)';
    toast.style.opacity = '0';
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
        if (activeToast === toast) {
            activeToast = null;
            undoCallback = null;
        }
    }, 300);
}

/**
 * Show a swipe action toast with undo
 * @param {string} movieTitle - Movie title
 * @param {string} action - Swipe action (love, like, maybe, pass)
 * @param {function} onUndo - Undo callback
 */
export function showSwipeToast(movieTitle, action, onUndo) {
    const actionEmoji = {
        love: '❤️',
        like: '👍',
        maybe: '🤔',
        pass: '✕'
    };
    
    const actionText = {
        love: 'Loved',
        like: 'Liked',
        maybe: 'Maybe later',
        pass: 'Passed'
    };
    
    const actionType = {
        love: 'success',
        like: 'success',
        maybe: 'warning',
        pass: 'error'
    };
    
    const message = `${actionEmoji[action]} ${actionText[action]}`;
    const type = actionType[action] || 'info';
    
    showToast(message, type, 4000, onUndo);
}

/**
 * Show error toast
 */
export function showError(message) {
    showToast(message, 'error', 4000);
}

/**
 * Show success toast
 */
export function showSuccess(message) {
    showToast(message, 'success', 3000);
}

/**
 * Show info toast
 */
export function showInfo(message) {
    showToast(message, 'info', 3000);
}

/**
 * Show warning toast
 */
export function showWarning(message) {
    showToast(message, 'warning', 3000);
}
