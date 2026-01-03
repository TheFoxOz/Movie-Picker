/**
 * Global Cache Manager - Week 2 Performance Optimization
 * ✅ Centralized caching for all services
 * ✅ Automatic expiration
 * ✅ Memory management
 * ✅ Cache statistics
 */

class GlobalCacheManager {
    constructor(options = {}) {
        this.maxSize = options.maxSize || 500; // Max cache entries
        this.defaultTTL = options.defaultTTL || 1000 * 60 * 30; // 30 minutes
        this.cache = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            evictions: 0,
            clears: 0
        };
        
        console.log('[CacheManager] Initialized with max size:', this.maxSize);
    }

    /**
     * Generate cache key from namespace and identifier
     */
    _generateKey(namespace, id) {
        return `${namespace}:${id}`;
    }

    /**
     * Get value from cache
     * @param {string} namespace - Cache namespace (e.g., 'tmdb', 'platform', 'user')
     * @param {string|number} id - Unique identifier
     * @returns {any|null} Cached value or null if not found/expired
     */
    get(namespace, id) {
        const key = this._generateKey(namespace, id);
        const entry = this.cache.get(key);
        
        if (!entry) {
            this.stats.misses++;
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.stats.misses++;
            this.stats.evictions++;
            return null;
        }

        this.stats.hits++;
        entry.lastAccessed = Date.now();
        return entry.value;
    }

    /**
     * Set value in cache
     * @param {string} namespace - Cache namespace
     * @param {string|number} id - Unique identifier
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in milliseconds (optional)
     */
    set(namespace, id, value, ttl = null) {
        const key = this._generateKey(namespace, id);
        const expiresAt = Date.now() + (ttl || this.defaultTTL);

        // Evict oldest entries if cache is full
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this._evictOldest();
        }

        this.cache.set(key, {
            value,
            expiresAt,
            createdAt: Date.now(),
            lastAccessed: Date.now(),
            namespace,
            id
        });

        this.stats.sets++;
    }

    /**
     * Check if key exists and is not expired
     */
    has(namespace, id) {
        const value = this.get(namespace, id);
        return value !== null;
    }

    /**
     * Delete specific cache entry
     */
    delete(namespace, id) {
        const key = this._generateKey(namespace, id);
        const deleted = this.cache.delete(key);
        if (deleted) {
            this.stats.evictions++;
        }
        return deleted;
    }

    /**
     * Clear entire namespace
     */
    clearNamespace(namespace) {
        let cleared = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (entry.namespace === namespace) {
                this.cache.delete(key);
                cleared++;
            }
        }
        this.stats.evictions += cleared;
        console.log(`[CacheManager] Cleared ${cleared} entries from namespace: ${namespace}`);
        return cleared;
    }

    /**
     * Clear all cache
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        this.stats.clears++;
        this.stats.evictions += size;
        console.log(`[CacheManager] Cleared all ${size} cache entries`);
    }

    /**
     * Evict oldest entry (LRU - Least Recently Used)
     */
    _evictOldest() {
        let oldestKey = null;
        let oldestTime = Infinity;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.stats.evictions++;
        }
    }

    /**
     * Remove expired entries
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            this.stats.evictions += cleaned;
            console.log(`[CacheManager] Cleaned up ${cleaned} expired entries`);
        }

        return cleaned;
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0
            ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2)
            : '0.00';

        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate: `${hitRate}%`,
            ...this.stats
        };
    }

    /**
     * Log cache statistics to console
     */
    logStats() {
        const stats = this.getStats();
        console.log('[CacheManager] Statistics:', stats);
        return stats;
    }

    /**
     * Get all entries in a namespace (for debugging)
     */
    getNamespaceEntries(namespace) {
        const entries = [];
        for (const [key, entry] of this.cache.entries()) {
            if (entry.namespace === namespace) {
                entries.push({
                    id: entry.id,
                    createdAt: new Date(entry.createdAt).toISOString(),
                    expiresAt: new Date(entry.expiresAt).toISOString(),
                    lastAccessed: new Date(entry.lastAccessed).toISOString()
                });
            }
        }
        return entries;
    }

    /**
     * Batch get - get multiple values at once
     */
    batchGet(namespace, ids) {
        const results = new Map();
        for (const id of ids) {
            const value = this.get(namespace, id);
            if (value !== null) {
                results.set(id, value);
            }
        }
        return results;
    }

    /**
     * Batch set - set multiple values at once
     */
    batchSet(namespace, entries, ttl = null) {
        for (const [id, value] of Object.entries(entries)) {
            this.set(namespace, id, value, ttl);
        }
    }
}

// ✅ Create global singleton instance
const cacheManager = new GlobalCacheManager({
    maxSize: 500,           // Keep max 500 entries
    defaultTTL: 1800000     // 30 minutes default
});

// ✅ Auto-cleanup every 5 minutes
setInterval(() => {
    cacheManager.cleanup();
}, 300000);

// ✅ Log stats every 10 minutes in development
if (window.location.hostname === 'localhost') {
    setInterval(() => {
        cacheManager.logStats();
    }, 600000);
}

export { cacheManager, GlobalCacheManager };
