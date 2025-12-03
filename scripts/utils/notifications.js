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
 */
export function showToast(message, type = 'info', duration = 3000, onUndo = null) {
    initToastContainer();
    
    if (activeToast) {
        removeToast(activeToast);
    }
    
    undoCallback = onUndo;
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    
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
    
    const iconSpan = document.createElement('span');
    iconSpan.style.cssText = 'font-size: 1.25rem; flex-shrink: 0;';
    iconSpan.textContent = style.icon;
    
    const messageSpan = document.createElement('span');
    messageSpan.style.cssText = 'flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    messageSpan.textContent = message;
    
    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = 'display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0;';
    contentDiv.appendChild(iconSpan);
    contentDiv.appendChild(messageSpan);
    
    toast.appendChild(contentDiv);
    
    if (onUndo) {
        const undoBtn = document.createElement('button');
        undoBtn.className = 'toast-undo-btn';
        undoBtn.textContent = 'Undo';
        undoBtn.style.cssText = `
            padding: 0.375rem 0.875rem;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 0.5rem;
            color: white;
            font-size: 0.8125rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            flex-shrink: 0;
        `;
        
        undoBtn.addEventListener('mouseover', () => {
            undoBtn.style.background = 'rgba(255, 255, 255, 0.25)';
        });
        
        undoBtn.addEventListener('mouseout', () => {
            undoBtn.style.background = 'rgba(255, 255, 255, 0.15)';
        });
        
        undoBtn.addEventListener('click', () => {
            onUndo();
            removeToast(toast);
            showToast('↩️ Action undone', 'info', 2000);
            
            if (ENV.APP.debug) {
                console.log('[Notifications] Undo action triggered');
            }
        });
        
        toast.appendChild(undoBtn);
    }
    
    toastContainer.appendChild(toast);
    activeToast = toast;
    
    requestAnimationFrame(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    });
    
    const timeout = setTimeout(() => {
        removeToast(toast);
    }, duration);
    
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
    
    if (toast.dataset.timeout) {
        clearTimeout(parseInt(toast.dataset.timeout));
    }
    
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
    
    const message = actionEmoji[action] + ' ' + actionText[action];
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
