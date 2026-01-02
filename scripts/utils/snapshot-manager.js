/**
 * Snapshot Manager Utility
 * ✅ CRITICAL FIX: Prevents memory leaks from unclosed Firebase listeners
 * 
 * Usage:
 * import { snapshotManager } from './utils/snapshot-manager.js';
 * 
 * // Register listener
 * const unsubscribe = onSnapshot(query, callback);
 * snapshotManager.register('friends-list', unsubscribe);
 * 
 * // Clean up specific listener
 * snapshotManager.cleanup('friends-list');
 * 
 * // Clean up all listeners
 * snapshotManager.cleanupAll();
 */

class SnapshotManager {
    constructor() {
        this.listeners = new Map();
        this.listenersByTab = new Map();
        this.activeTab = null;
        
        // Auto-cleanup on tab change
        this.setupTabChangeListener();
        
        // Auto-cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanupAll();
        });
        
        console.log('[SnapshotManager] Initialized');
    }

    /**
     * Register a snapshot listener
     * @param {string} id - Unique identifier for this listener
     * @param {function} unsubscribe - The unsubscribe function returned by onSnapshot
     * @param {string} tab - Optional tab name (for auto-cleanup on tab switch)
     */
    register(id, unsubscribe, tab = null) {
        if (!id || typeof unsubscribe !== 'function') {
            console.error('[SnapshotManager] Invalid registration:', id);
            return;
        }

        // Clean up existing listener with same ID
        if (this.listeners.has(id)) {
            console.warn(`[SnapshotManager] Replacing existing listener: ${id}`);
            this.cleanup(id);
        }

        this.listeners.set(id, {
            unsubscribe,
            tab,
            registeredAt: Date.now()
        });

        // Track by tab for batch cleanup
        if (tab) {
            if (!this.listenersByTab.has(tab)) {
                this.listenersByTab.set(tab, new Set());
            }
            this.listenersByTab.get(tab).add(id);
        }

        console.log(`[SnapshotManager] Registered: ${id} (tab: ${tab || 'global'})`);
        this.logStatus();
    }

    /**
     * Clean up a specific listener
     * @param {string} id - Listener ID to clean up
     */
    cleanup(id) {
        const listener = this.listeners.get(id);
        if (!listener) {
            console.warn(`[SnapshotManager] Listener not found: ${id}`);
            return false;
        }

        try {
            listener.unsubscribe();
            this.listeners.delete(id);
            
            // Remove from tab tracking
            if (listener.tab && this.listenersByTab.has(listener.tab)) {
                this.listenersByTab.get(listener.tab).delete(id);
            }
            
            console.log(`[SnapshotManager] Cleaned up: ${id}`);
            return true;
        } catch (error) {
            console.error(`[SnapshotManager] Error cleaning up ${id}:`, error);
            return false;
        }
    }

    /**
     * Clean up all listeners for a specific tab
     * @param {string} tab - Tab name
     */
    cleanupTab(tab) {
        if (!this.listenersByTab.has(tab)) {
            return;
        }

        const listenerIds = Array.from(this.listenersByTab.get(tab));
        let cleaned = 0;

        listenerIds.forEach(id => {
            if (this.cleanup(id)) {
                cleaned++;
            }
        });

        this.listenersByTab.delete(tab);
        console.log(`[SnapshotManager] Cleaned up ${cleaned} listeners for tab: ${tab}`);
        this.logStatus();
    }

    /**
     * Clean up all registered listeners
     */
    cleanupAll() {
        const count = this.listeners.size;
        
        this.listeners.forEach((listener, id) => {
            try {
                listener.unsubscribe();
            } catch (error) {
                console.error(`[SnapshotManager] Error cleaning up ${id}:`, error);
            }
        });

        this.listeners.clear();
        this.listenersByTab.clear();
        
        console.log(`[SnapshotManager] Cleaned up all ${count} listeners`);
    }

    /**
     * Get list of active listeners
     */
    getActiveListeners() {
        return Array.from(this.listeners.entries()).map(([id, listener]) => ({
            id,
            tab: listener.tab || 'global',
            age: Date.now() - listener.registeredAt
        }));
    }

    /**
     * Log current status
     */
    logStatus() {
        const total = this.listeners.size;
        const byTab = {};
        
        this.listenersByTab.forEach((ids, tab) => {
            byTab[tab] = ids.size;
        });

        console.log(`[SnapshotManager] Active listeners: ${total}`, byTab);
    }

    /**
     * Setup automatic cleanup on tab change
     */
    setupTabChangeListener() {
        document.addEventListener('tab-changed', (e) => {
            const previousTab = this.activeTab;
            const newTab = e.detail?.tab;

            if (previousTab && previousTab !== newTab) {
                console.log(`[SnapshotManager] Tab changed: ${previousTab} → ${newTab}`);
                this.cleanupTab(previousTab);
            }

            this.activeTab = newTab;
        });
    }

    /**
     * Get statistics
     */
    getStats() {
        const listeners = this.getActiveListeners();
        const oldestAge = Math.max(...listeners.map(l => l.age), 0);
        const byTab = {};

        listeners.forEach(l => {
            byTab[l.tab] = (byTab[l.tab] || 0) + 1;
        });

        return {
            total: this.listeners.size,
            byTab,
            oldestAge: Math.round(oldestAge / 1000), // seconds
            listeners: listeners.map(l => ({
                ...l,
                age: Math.round(l.age / 1000)
            }))
        };
    }
}

// Create singleton instance
const snapshotManager = new SnapshotManager();

// Expose to window for debugging
if (typeof window !== 'undefined') {
    window.snapshotManager = snapshotManager;
}

export { snapshotManager, SnapshotManager };

/**
 * USAGE EXAMPLES:
 * 
 * // In matches-tab.js
 * async loadFriends() {
 *     const q = query(collection(db, 'friends'), where('userId', '==', currentUser.uid));
 *     
 *     const unsubscribe = onSnapshot(q, (snapshot) => {
 *         // Handle updates
 *     });
 *     
 *     // Register with manager
 *     snapshotManager.register('friends-list', unsubscribe, 'matches');
 * }
 * 
 * // When tab changes (in tab-manager.js)
 * switchTab(newTab) {
 *     document.dispatchEvent(new CustomEvent('tab-changed', { 
 *         detail: { tab: newTab } 
 *     }));
 * }
 * 
 * // Manual cleanup
 * snapshotManager.cleanup('friends-list');
 * 
 * // Cleanup all for tab
 * snapshotManager.cleanupTab('matches');
 * 
 * // Debug in console
 * window.snapshotManager.getStats();
 * window.snapshotManager.logStatus();
 */
