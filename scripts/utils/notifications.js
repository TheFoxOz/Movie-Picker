/**
 * MoviEase - Notification System
 * Toast-style notifications with Space Indigo & Powder Blue theme
 * 
 * ✅ Updated with MoviEase branding and color palette
 * ✅ Fixed ENV reference from ENV.APP.debug to ENV.DEBUG_MODE
 */

import { ENV } from '../config/env.js';

class NotificationManager {
    constructor() {
        this.container = null;
        this.notifications = [];
        this.nextId = 1;
        this.init();
    }

    init() {
        // Create notification container
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            pointer-events: none;
            max-width: 400px;
        `;
        document.body.appendChild(this.container);

        if (ENV && ENV.DEBUG_MODE) {
            console.log('[MoviEase Notifications] Manager initialized');
        }
    }

    /**
     * Show a notification
     * @param {string} message - The message to display
     * @param {string} type - Type of notification: 'success', 'error', 'warning', 'info'
     * @param {number} duration - How long to show (ms), 0 for persistent
     * @param {object} options - Additional options
     */
    show(message, type = 'info', duration = 4000, options = {}) {
        const id = this.nextId++;
        
        const notification = {
            id,
            message,
            type,
            duration,
            options
        };

        if (ENV && ENV.DEBUG_MODE) {
            console.log('[MoviEase Notifications] Showing:', notification);
        }

        this.notifications.push(notification);
        this.renderNotification(notification);

        // Auto-dismiss if duration is set
        if (duration > 0) {
            setTimeout(() => this.dismiss(id), duration);
        }

        return id;
    }

    /**
     * Show success notification
     */
    success(message, duration = 4000, options = {}) {
        return this.show(message, 'success', duration, options);
    }

    /**
     * Show error notification
     */
    error(message, duration = 6000, options = {}) {
        return this.show(message, 'error', duration, options);
    }

    /**
     * Show warning notification
     */
    warning(message, duration = 5000, options = {}) {
        return this.show(message, 'warning', duration, options);
    }

    /**
     * Show info notification
     */
    info(message, duration = 4000, options = {}) {
        return this.show(message, 'info', duration, options);
    }

    /**
     * Render a notification element
     */
    renderNotification(notification) {
        const element = document.createElement('div');
        element.id = `notification-${notification.id}`;
        element.className = `notification notification-${notification.type}`;
        
        // Style based on type with MoviEase colors
        const styles = this.getStyles(notification.type);
        
        element.style.cssText = `
            background: ${styles.background};
            border: 1px solid ${styles.border};
            border-left: 4px solid ${styles.accent};
            border-radius: 0.75rem;
            padding: 1rem 1.25rem;
            box-shadow: 0 10px 25px rgba(30, 58, 95, 0.4);
            backdrop-filter: blur(12px);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            pointer-events: auto;
            cursor: pointer;
            animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            min-width: 280px;
            max-width: 400px;
        `;

        // Icon
        const icon = this.getIcon(notification.type);
        element.innerHTML = `
            <div style="flex-shrink: 0; font-size: 1.25rem; color: ${styles.iconColor};">
                ${icon}
            </div>
            <div style="flex: 1; color: rgba(255, 255, 255, 0.95); font-size: 0.9375rem; line-height: 1.5; font-weight: 500;">
                ${notification.message}
            </div>
            <button class="notification-close" style="
                flex-shrink: 0;
                background: rgba(176, 212, 227, 0.1);
                border: none;
                border-radius: 0.375rem;
                color: rgba(176, 212, 227, 0.9);
                cursor: pointer;
                padding: 0.25rem 0.5rem;
                font-size: 0.875rem;
                transition: all 0.2s;
                font-weight: 600;
            " onmouseover="this.style.background='rgba(176,212,227,0.2)'; this.style.color='#b0d4e3';" 
               onmouseout="this.style.background='rgba(176,212,227,0.1)'; this.style.color='rgba(176,212,227,0.9)';">
                ✕
            </button>
        `;

        // Close button handler
        const closeBtn = element.querySelector('.notification-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.dismiss(notification.id);
        });

        // Click to dismiss
        element.addEventListener('click', () => {
            if (notification.options.onClick) {
                notification.options.onClick();
            }
            this.dismiss(notification.id);
        });

        this.container.appendChild(element);
    }

    /**
     * Get styles for notification type with MoviEase colors
     */
    getStyles(type) {
        const styles = {
            success: {
                background: 'linear-gradient(135deg, rgba(30, 58, 95, 0.95), rgba(26, 31, 46, 0.95))',
                border: 'rgba(176, 212, 227, 0.2)',
                accent: '#4ade80',
                iconColor: '#4ade80'
            },
            error: {
                background: 'linear-gradient(135deg, rgba(30, 58, 95, 0.95), rgba(26, 31, 46, 0.95))',
                border: 'rgba(176, 212, 227, 0.2)',
                accent: '#ef4444',
                iconColor: '#ef4444'
            },
            warning: {
                background: 'linear-gradient(135deg, rgba(30, 58, 95, 0.95), rgba(26, 31, 46, 0.95))',
                border: 'rgba(176, 212, 227, 0.2)',
                accent: '#fbbf24',
                iconColor: '#fbbf24'
            },
            info: {
                background: 'linear-gradient(135deg, rgba(30, 58, 95, 0.95), rgba(26, 31, 46, 0.95))',
                border: 'rgba(176, 212, 227, 0.2)',
                accent: '#b0d4e3',
                iconColor: '#b0d4e3'
            }
        };

        return styles[type] || styles.info;
    }

    /**
     * Get icon for notification type
     */
    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        return icons[type] || icons.info;
    }

    /**
     * Dismiss a notification
     */
    dismiss(id) {
        const element = document.getElementById(`notification-${id}`);
        if (!element) return;

        if (ENV && ENV.DEBUG_MODE) {
            console.log('[MoviEase Notifications] Dismissing:', id);
        }

        // Slide out animation
        element.style.animation = 'slideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        
        setTimeout(() => {
            element.remove();
            this.notifications = this.notifications.filter(n => n.id !== id);
        }, 300);
    }

    /**
     * Dismiss all notifications
     */
    dismissAll() {
        if (ENV && ENV.DEBUG_MODE) {
            console.log('[MoviEase Notifications] Dismissing all');
        }

        this.notifications.forEach(n => this.dismiss(n.id));
    }

    /**
     * Show a loading notification (persistent until dismissed)
     */
    showLoading(message = 'Loading...') {
        const id = this.show(
            `<div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="width: 16px; height: 16px; border: 2px solid rgba(176, 212, 227, 0.3); border-top-color: #b0d4e3; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <span>${message}</span>
            </div>`,
            'info',
            0
        );

        return id;
    }

    /**
     * Update an existing notification
     */
    update(id, message, type) {
        const element = document.getElementById(`notification-${id}`);
        if (!element) return;

        const notification = this.notifications.find(n => n.id === id);
        if (!notification) return;

        notification.message = message;
        notification.type = type || notification.type;

        // Re-render
        const parent = element.parentNode;
        element.remove();
        this.renderNotification(notification);

        if (ENV && ENV.DEBUG_MODE) {
            console.log('[MoviEase Notifications] Updated:', id);
        }
    }

    /**
     * Clean up
     */
    destroy() {
        this.dismissAll();
        if (this.container) {
            this.container.remove();
        }

        if (ENV && ENV.DEBUG_MODE) {
            console.log('[MoviEase Notifications] Manager destroyed');
        }
    }
}

// Add CSS animations with MoviEase theme
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    .notification:hover {
        transform: translateX(-4px);
        box-shadow: 0 12px 32px rgba(30, 58, 95, 0.5), 0 0 20px rgba(176, 212, 227, 0.2);
        border-color: rgba(176, 212, 227, 0.3);
    }

    .notification:active {
        transform: translateX(-2px);
    }

    /* Subtle pulse animation for active notifications */
    @keyframes pulse {
        0%, 100% {
            box-shadow: 0 10px 25px rgba(30, 58, 95, 0.4);
        }
        50% {
            box-shadow: 0 10px 25px rgba(30, 58, 95, 0.4), 0 0 20px rgba(176, 212, 227, 0.15);
        }
    }

    .notification {
        animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1), pulse 2s ease-in-out infinite;
    }

    @media (max-width: 640px) {
        #notification-container {
            top: 0.5rem;
            right: 0.5rem;
            left: 0.5rem;
            max-width: none;
        }

        .notification {
            min-width: auto !important;
            padding: 0.875rem 1rem !important;
        }

        .notification .notification-close {
            padding: 0.2rem 0.4rem !important;
        }
    }
`;
document.head.appendChild(style);

// Export singleton instance
export const notificationManager = new NotificationManager();

// Convenience exports
export const notify = {
    success: (msg, duration, options) => notificationManager.success(msg, duration, options),
    error: (msg, duration, options) => notificationManager.error(msg, duration, options),
    warning: (msg, duration, options) => notificationManager.warning(msg, duration, options),
    info: (msg, duration, options) => notificationManager.info(msg, duration, options),
    loading: (msg) => notificationManager.showLoading(msg),
    dismiss: (id) => notificationManager.dismiss(id),
    dismissAll: () => notificationManager.dismissAll(),
    update: (id, msg, type) => notificationManager.update(id, msg, type)
};
