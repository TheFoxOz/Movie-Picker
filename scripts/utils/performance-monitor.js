/**
 * Performance Monitor - Week 2 Performance Optimization
 * ✅ Track page load times
 * ✅ Monitor API calls
 * ✅ Measure component render times
 * ✅ Log performance metrics
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            pageLoad: null,
            apiCalls: [],
            renders: [],
            interactions: []
        };
        this.marks = new Map();
        this.isEnabled = true;
        
        console.log('[PerfMonitor] Initialized');
        this.trackPageLoad();
    }

    /**
     * Track page load performance
     */
    trackPageLoad() {
        if (typeof window === 'undefined' || !window.performance) {
            return;
        }

        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = window.performance.timing;
                const navigation = window.performance.getEntriesByType('navigation')[0];

                this.metrics.pageLoad = {
                    // Time to Interactive (TTI) approximation
                    domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
                    // Full page load
                    loadComplete: perfData.loadEventEnd - perfData.navigationStart,
                    // DNS + TCP
                    networkTime: perfData.connectEnd - perfData.navigationStart,
                    // Server response
                    serverTime: perfData.responseEnd - perfData.requestStart,
                    // DOM processing
                    domTime: perfData.domComplete - perfData.domLoading,
                    // Resource loading
                    resourceTime: perfData.loadEventEnd - perfData.domContentLoadedEventEnd,
                    // Total time
                    totalTime: perfData.loadEventEnd - perfData.navigationStart,
                    // Navigation type
                    navigationType: navigation?.type || 'unknown'
                };

                console.log('[PerfMonitor] Page load metrics:', this.metrics.pageLoad);
            }, 0);
        });
    }

    /**
     * Start timing an operation
     */
    start(label) {
        if (!this.isEnabled) return;
        
        this.marks.set(label, {
            start: performance.now(),
            label
        });
    }

    /**
     * End timing an operation and return duration
     */
    end(label, metadata = {}) {
        if (!this.isEnabled) return null;
        
        const mark = this.marks.get(label);
        if (!mark) {
            console.warn(`[PerfMonitor] No start mark found for: ${label}`);
            return null;
        }

        const duration = performance.now() - mark.start;
        this.marks.delete(label);

        // Categorize by type
        if (label.startsWith('api:')) {
            this.metrics.apiCalls.push({
                label,
                duration,
                timestamp: Date.now(),
                ...metadata
            });
        } else if (label.startsWith('render:')) {
            this.metrics.renders.push({
                label,
                duration,
                timestamp: Date.now(),
                ...metadata
            });
        } else if (label.startsWith('interaction:')) {
            this.metrics.interactions.push({
                label,
                duration,
                timestamp: Date.now(),
                ...metadata
            });
        }

        // Log slow operations
        if (duration > 1000) {
            console.warn(`[PerfMonitor] ⚠️ Slow operation: ${label} (${duration.toFixed(2)}ms)`);
        }

        return duration;
    }

    /**
     * Measure a function execution time
     */
    async measure(label, fn, metadata = {}) {
        this.start(label);
        try {
            const result = await fn();
            this.end(label, { ...metadata, success: true });
            return result;
        } catch (error) {
            this.end(label, { ...metadata, success: false, error: error.message });
            throw error;
        }
    }

    /**
     * Track API call performance
     */
    trackAPICall(endpoint, duration, metadata = {}) {
        this.metrics.apiCalls.push({
            label: `api:${endpoint}`,
            duration,
            timestamp: Date.now(),
            ...metadata
        });

        // Keep only last 100 API calls
        if (this.metrics.apiCalls.length > 100) {
            this.metrics.apiCalls = this.metrics.apiCalls.slice(-100);
        }
    }

    /**
     * Track component render time
     */
    trackRender(component, duration, metadata = {}) {
        this.metrics.renders.push({
            label: `render:${component}`,
            duration,
            timestamp: Date.now(),
            ...metadata
        });

        // Keep only last 50 renders
        if (this.metrics.renders.length > 50) {
            this.metrics.renders = this.metrics.renders.slice(-50);
        }
    }

    /**
     * Track user interaction time
     */
    trackInteraction(action, duration, metadata = {}) {
        this.metrics.interactions.push({
            label: `interaction:${action}`,
            duration,
            timestamp: Date.now(),
            ...metadata
        });

        // Keep only last 50 interactions
        if (this.metrics.interactions.length > 50) {
            this.metrics.interactions = this.metrics.interactions.slice(-50);
        }
    }

    /**
     * Get performance statistics
     */
    getStats() {
        const stats = {
            pageLoad: this.metrics.pageLoad,
            apiCalls: this._calculateStats(this.metrics.apiCalls),
            renders: this._calculateStats(this.metrics.renders),
            interactions: this._calculateStats(this.metrics.interactions)
        };

        return stats;
    }

    /**
     * Calculate statistics for a metric array
     */
    _calculateStats(metrics) {
        if (metrics.length === 0) {
            return {
                count: 0,
                avg: 0,
                min: 0,
                max: 0,
                p50: 0,
                p95: 0,
                p99: 0
            };
        }

        const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
        const sum = durations.reduce((a, b) => a + b, 0);

        return {
            count: metrics.length,
            avg: sum / metrics.length,
            min: durations[0],
            max: durations[durations.length - 1],
            p50: durations[Math.floor(durations.length * 0.5)],
            p95: durations[Math.floor(durations.length * 0.95)],
            p99: durations[Math.floor(durations.length * 0.99)]
        };
    }

    /**
     * Get slow operations (> 1 second)
     */
    getSlowOperations() {
        const slow = [];
        
        ['apiCalls', 'renders', 'interactions'].forEach(category => {
            this.metrics[category].forEach(metric => {
                if (metric.duration > 1000) {
                    slow.push({ ...metric, category });
                }
            });
        });

        return slow.sort((a, b) => b.duration - a.duration);
    }

    /**
     * Log performance report to console
     */
    logReport() {
        const stats = this.getStats();
        
        console.group('[PerfMonitor] Performance Report');
        
        if (stats.pageLoad) {
            console.log('📊 Page Load:', {
                'DOM Ready': `${stats.pageLoad.domContentLoaded}ms`,
                'Load Complete': `${stats.pageLoad.loadComplete}ms`,
                'Total Time': `${stats.pageLoad.totalTime}ms`
            });
        }

        console.log('🌐 API Calls:', {
            'Count': stats.apiCalls.count,
            'Avg': `${stats.apiCalls.avg.toFixed(2)}ms`,
            'p95': `${stats.apiCalls.p95.toFixed(2)}ms`,
            'Max': `${stats.apiCalls.max.toFixed(2)}ms`
        });

        console.log('🎨 Renders:', {
            'Count': stats.renders.count,
            'Avg': `${stats.renders.avg.toFixed(2)}ms`,
            'p95': `${stats.renders.p95.toFixed(2)}ms`,
            'Max': `${stats.renders.max.toFixed(2)}ms`
        });

        console.log('👆 Interactions:', {
            'Count': stats.interactions.count,
            'Avg': `${stats.interactions.avg.toFixed(2)}ms`,
            'p95': `${stats.interactions.p95.toFixed(2)}ms`,
            'Max': `${stats.interactions.max.toFixed(2)}ms`
        });

        const slow = this.getSlowOperations();
        if (slow.length > 0) {
            console.warn('⚠️ Slow Operations:', slow.slice(0, 5));
        }

        console.groupEnd();

        return stats;
    }

    /**
     * Enable/disable monitoring
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log(`[PerfMonitor] Monitoring ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Clear all metrics
     */
    clear() {
        this.metrics = {
            pageLoad: this.metrics.pageLoad, // Keep page load
            apiCalls: [],
            renders: [],
            interactions: []
        };
        this.marks.clear();
        console.log('[PerfMonitor] Metrics cleared');
    }

    /**
     * Export metrics as JSON
     */
    export() {
        return {
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            metrics: this.metrics,
            stats: this.getStats()
        };
    }
}

// ✅ Create global singleton
const perfMonitor = new PerformanceMonitor();

// ✅ Auto-log report every 5 minutes in development
if (window.location.hostname === 'localhost') {
    setInterval(() => {
        perfMonitor.logReport();
    }, 300000);
}

// ✅ Expose to window for debugging
if (typeof window !== 'undefined') {
    window.perfMonitor = perfMonitor;
}

export { perfMonitor, PerformanceMonitor };
