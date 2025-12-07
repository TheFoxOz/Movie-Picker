/**
 * Notification System
 * Toast notifications with animations
 * FIXED: All ENV.APP.debug → ENV && ENV.DEBUG_MODE
 */

import { ENV } from '../config/env.js';

/**
 * Show a toast notification
 */
export function showToast(message, type = 'info', duration = 3000) {
    // Remove existing toasts
    const existing = document.querySelectorAll('.toast-notification');
    existing.forEach(toast => toast.remove());
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
        position: fixed;
        top: 6rem;
        left: 50%;
        transform: translateX(-50%) translateY(-100px);
        padding: 1rem 1.5rem;
        border-radius: 1rem;
        font-weight: 600;
        font-size: 0.875rem;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        backdrop-filter: blur(20px);
        z-index: 9999;
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
        max-width: 90%;
        text-align: center;
        border: 1px solid rgba(255,255,255,0.1);
    `;
    
    // Set color based on type
    const colors = {
        success: 'background: linear-gradient(135deg, rgba(16,185,129,0.95), rgba(5,150,105,0.95)); color: white;',
        error: 'background: linear-gradient(135deg, rgba(239,68,68,0.95), rgba(220,38,38,0.95)); color: white;',
        warning: 'background: linear-gradient(135deg, rgba(251,191,36,0.95), rgba(245,158,11,0.95)); color: white;',
        info: 'background: linear-gradient(135deg, rgba(59,130,246,0.95), rgba(37,99,235,0.95)); color: white;'
    };
    
    toast.style.cssText += colors[type] || colors.info;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
        toast.style.opacity = '1';
    });
    
    // Animate out
    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(-100px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

/**
 * Show success toast
 */
export function showSuccess(message, duration = 3000) {
    showToast(message, 'success', duration);
}

/**
 * Show error toast
 */
export function showError(message, duration = 4000) {
    showToast(message, 'error', duration);
}

/**
 * Show warning toast
 */
export function showWarning(message, duration = 3500) {
    showToast(message, 'warning', duration);
}

/**
 * Show info toast
 */
export function showInfo(message, duration = 3000) {
    showToast(message, 'info', duration);
}

/**
 * Show swipe action toast with movie title
 */
export function showSwipeToast(movieTitle, action) {
    const messages = {
        pass: `Passed on ${movieTitle}`,
        maybe: `${movieTitle} added to Maybe list`,
        like: `Liked ${movieTitle}!`,
        love: `❤️ Loved ${movieTitle}!`
    };
    
    const types = {
        pass: 'info',
        maybe: 'warning',
        like: 'success',
        love: 'success'
    };
    
    const message = messages[action] || `Swiped on ${movieTitle}`;
    const type = types[action] || 'info';
    
    showToast(message, type, 2000);
    
    // FIXED: Safe debug logging
    if (ENV && ENV.DEBUG_MODE) {
        console.log(`[Toast] ${message}`);
    }
}

/**
 * Show loading toast (stays until dismissed)
 */
export function showLoading(message = 'Loading...') {
    const existing = document.querySelectorAll('.toast-loading');
    existing.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = 'toast-loading toast-notification';
    toast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 1.5rem 2rem;
        border-radius: 1rem;
        font-weight: 600;
        font-size: 0.875rem;
        box-shadow: 0 10px 40px rgba(0,0,0,0.7);
        backdrop-filter: blur(20px);
        z-index: 10000;
        background: linear-gradient(135deg, rgba(59,130,246,0.95), rgba(37,99,235,0.95));
        color: white;
        border: 1px solid rgba(255,255,255,0.1);
        display: flex;
        align-items: center;
        gap: 1rem;
    `;
    
    // Add spinner
    const spinner = document.createElement('div');
    spinner.style.cssText = `
        width: 20px;
        height: 20px;
        border: 3px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    `;
    
    // Add spinner animation if not exists
    if (!document.getElementById('spinner-animation')) {
        const style = document.createElement('style');
        style.id = 'spinner-animation';
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    toast.appendChild(spinner);
    toast.appendChild(document.createTextNode(message));
    
    document.body.appendChild(toast);
    
    return toast; // Return reference to dismiss later
}

/**
 * Hide loading toast
 */
export function hideLoading() {
    const toasts = document.querySelectorAll('.toast-loading');
    toasts.forEach(toast => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, -50%) scale(0.8)';
        setTimeout(() => toast.remove(), 300);
    });
}

/**
 * Show confirmation dialog
 */
export function showConfirm(message, onConfirm, onCancel) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.7);
        backdrop-filter: blur(10px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        opacity: 0;
        transition: opacity 0.3s;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: linear-gradient(135deg, rgba(20,20,30,0.98), rgba(10,10,15,0.98));
        border-radius: 1.5rem;
        padding: 2rem;
        max-width: 400px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.8);
        border: 1px solid rgba(255,255,255,0.1);
        transform: scale(0.9);
        transition: transform 0.3s;
    `;
    
    const messageEl = document.createElement('p');
    messageEl.style.cssText = `
        color: white;
        font-size: 1rem;
        line-height: 1.6;
        margin: 0 0 1.5rem 0;
        text-align: center;
    `;
    messageEl.textContent = message;
    
    const buttons = document.createElement('div');
    buttons.style.cssText = `
        display: flex;
        gap: 1rem;
    `;
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
        flex: 1;
        padding: 0.875rem;
        border-radius: 0.75rem;
        border: 1px solid rgba(255,255,255,0.2);
        background: transparent;
        color: white;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    `;
    
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Confirm';
    confirmBtn.style.cssText = `
        flex: 1;
        padding: 0.875rem;
        border-radius: 0.75rem;
        border: none;
        background: linear-gradient(135deg, #ff2e63, #d90062);
        color: white;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    `;
    
    cancelBtn.addEventListener('click', () => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
        if (onCancel) onCancel();
    });
    
    confirmBtn.addEventListener('click', () => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
        if (onConfirm) onConfirm();
    });
    
    buttons.appendChild(cancelBtn);
    buttons.appendChild(confirmBtn);
    
    dialog.appendChild(messageEl);
    dialog.appendChild(buttons);
    overlay.appendChild(dialog);
    
    document.body.appendChild(overlay);
    
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        dialog.style.transform = 'scale(1)';
    });
}
