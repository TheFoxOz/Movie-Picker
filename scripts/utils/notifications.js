/**
 * Notifications Utility
 * Toast notifications and announcements
 */

let toastContainer = null;
let announcer = null;
let toastCounter = 0;

/**
 * Initialize notification system
 */
export function initNotifications() {
    toastContainer = document.getElementById('toast-container');
    announcer = document.getElementById('announcer');
    
    if (!toastContainer || !announcer) {
        console.warn('[Notifications] Toast container or announcer not found');
    }
}

/**
 * Show a toast notification
 * @param {String} message - Toast message
 * @param {Object} options - Toast options
 * @returns {String} Toast ID
 */
export function showToast(message, options = {}) {
    if (!toastContainer) {
        console.warn('[Notifications] Toast container not initialized');
        return null;
    }
    
    const {
        duration = 5000,
        action = null,
        actionLabel = 'Undo',
        type = 'info',
        icon = null
    } = options;
    
    const toastId = `toast-${++toastCounter}`;
    const toast = createToastElement(toastId, message, { action, actionLabel, type, icon });
    
    toastContainer.appendChild(toast);
    
    // Trigger enter animation
    requestAnimationFrame(() => {
        toast.classList.add('entering');
    });
    
    // Auto-dismiss after duration
    if (duration > 0) {
        setTimeout(() => {
            dismissToast(toastId);
        }, duration);
    }
    
    return toastId;
}

/**
 * Create toast element
 * @param {String} id - Toast ID
 * @param {String} message - Toast message
 * @param {Object} options - Toast options
 * @returns {HTMLElement} Toast element
 */
function createToastElement(id, message, options) {
    const toast = document.createElement('div');
    toast.id = id;
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    
    const iconHtml = options.icon ? `
        <svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            ${options.icon}
        </svg>
    ` : '';
    
    const actionHtml = options.action ? `
        <button class="btn btn-ghost btn-sm toast-action" data-action="true">
            ${options.actionLabel}
        </button>
    ` : '';
    
    toast.innerHTML = `
        <div class="toast-content">
            ${iconHtml}
            <span class="toast-message">${message}</span>
        </div>
        ${actionHtml}
    `;
    
    // Add action listener
    if (options.action) {
        const actionBtn = toast.querySelector('[data-action]');
        actionBtn.addEventListener('click', () => {
            options.action();
            dismissToast(id);
        });
    }
    
    return toast;
}

/**
 * Dismiss a toast
 * @param {String} toastId - Toast ID
 */
export function dismissToast(toastId) {
    const toast = document.getElementById(toastId);
    if (!toast) return;
    
    toast.classList.remove('entering');
    toast.classList.add('exiting');
    
    setTimeout(() => {
        toast.remove();
    }, 300);
}

/**
 * Show swipe undo toast
 * @param {String} movieTitle - Movie title
 * @param {String} action - Swipe action
 * @param {Function} undoCallback - Undo callback
 * @returns {String} Toast ID
 */
export function showSwipeToast(movieTitle, action, undoCallback) {
    const actionText = action.toUpperCase();
    const message = `${actionText}: ${movieTitle}`;
    
    return showToast(message, {
        duration: 5000,
        action: undoCallback,
        actionLabel: 'UNDO',
        icon: getSwipeIcon(action)
    });
}

/**
 * Get swipe icon SVG path
 * @param {String} action - Swipe action
 * @returns {String} SVG path
 */
function getSwipeIcon(action) {
    const icons = {
        love: '<path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.054-4.312 2.655-.715-1.601-2.377-2.655-4.313-2.655C4.099 3.75 2 5.765 2 8.25c0 7.22 9 12 10 12s10-4.78 10-12z" />',
        like: '<path stroke-linecap="round" stroke-linejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" />',
        maybe: '<path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />',
        pass: '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />'
    };
    return icons[action] || icons.pass;
}

/**
 * Show success notification
 * @param {String} message - Success message
 */
export function showSuccess(message) {
    showToast(message, {
        duration: 3000,
        type: 'success',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />'
    });
}

/**
 * Show error notification
 * @param {String} message - Error message
 */
export function showError(message) {
    showToast(message, {
        duration: 5000,
        type: 'error',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.446-.866 3.376 0 4.822 1.065 1.76 2.983 2.377 4.779 2.377h11.048c1.796 0 3.713-.617 4.778-2.377.866-1.446.866-3.376 0-4.822-1.065-1.76-2.982-2.377-4.778-2.377H6.476c-1.796 0-3.714.617-4.779 2.377z" />'
    });
}

/**
 * Show info notification
 * @param {String} message - Info message
 */
export function showInfo(message) {
    showToast(message, {
        duration: 3000,
        type: 'info',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />'
    });
}

/**
 * Announce to screen readers
 * @param {String} message - Message to announce
 * @param {String} priority - 'polite' or 'assertive'
 */
export function announce(message, priority = 'polite') {
    if (!announcer) return;
    
    announcer.setAttribute('aria-live', priority);
    announcer.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
        announcer.textContent = '';
    }, 1000);
}

/**
 * Show confetti effect
 */
export function showConfetti() {
    if (typeof confetti === 'undefined') {
        console.warn('[Notifications] Confetti library not loaded');
        return;
    }
    
    confetti({
        particleCount: 200,
        spread: 120,
        gravity: 0.8,
        decay: 0.95,
        scalar: 1.2,
        zIndex: 1000,
        origin: { y: 0.6 }
    });
}

/**
 * Trigger haptic feedback (if supported)
 * @param {String} type - 'light', 'medium', 'heavy'
 */
export function hapticFeedback(type = 'medium') {
    if (!navigator.vibrate) return;
    
    const patterns = {
        light: [10],
        medium: [30],
        heavy: [50, 50, 50],
        success: [30, 10, 30]
    };
    
    navigator.vibrate(patterns[type] || patterns.medium);
}
