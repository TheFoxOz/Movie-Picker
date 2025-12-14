/**
 * DoesTheDogDie.com API Service - VERCEL PROXY VERSION
 * ✅ Uses Vercel serverless function to bypass CORS
 * ✅ No more unreliable CORS proxies
 * Fetches trigger warnings for movies
 */

import { ENV } from '../config/env.js';

// ✅ Use Vercel serverless function as proxy (instead of corsproxy.io)
const API_BASE = '/api/trigger-warnings';

class DoesTheDogDieService {
    constructor() {
        this.cache = new Map(); // Cache results to avoid repeated API calls
    }

    /**
     * Search for a movie by title
     */
    async searchByTitle(title) {
        const cacheKey = `title:${title.toLowerCase()}`;
        if (this.cache.has(cacheKey)) {
            if (ENV && ENV.DEBUG_MODE) {
                console.log(`[DDD] Cache hit for: ${title}`);
            }
            return this.cache.get(cacheKey);
        }

        try {
            if (ENV && ENV.DEBUG_MODE) {
                console.log(`[DDD] Searching for: ${title}`);
            }
            
            // ✅ CHANGED: Use Vercel proxy endpoint instead of CORS proxy
            const url = `${API_BASE}?action=search-title&title=${encodeURIComponent(title)}`;
            const response = await fetch(url);

            if (!response.ok) {
                console.warn(`[DDD] Search failed for: ${title} (${response.status})`);
                return null;
            }

            const data = await response.json();
            const result = data.items?.[0] || null; // Get first match
            
            this.cache.set(cacheKey, result);
            
            if (ENV && ENV.DEBUG_MODE) {
                console.log(`[DDD] Found: ${result?.name || 'No match'}`);
            }
            
            return result;

        } catch (error) {
            console.error('[DDD] Search error:', error);
            return null;
        }
    }

    /**
     * Search for a movie by IMDB ID
     */
    async searchByIMDB(imdbId) {
        const cacheKey = `imdb:${imdbId}`;
        if (this.cache.has(cacheKey)) {
            if (ENV && ENV.DEBUG_MODE) {
                console.log(`[DDD] Cache hit for IMDB: ${imdbId}`);
            }
            return this.cache.get(cacheKey);
        }

        try {
            if (ENV && ENV.DEBUG_MODE) {
                console.log(`[DDD] Searching by IMDB: ${imdbId}`);
            }
            
            // ✅ CHANGED: Use Vercel proxy endpoint
            const url = `${API_BASE}?action=search-imdb&imdbId=${imdbId}`;
            const response = await fetch(url);

            if (!response.ok) {
                console.warn(`[DDD] Search failed for IMDB: ${imdbId} (${response.status})`);
                return null;
            }

            const data = await response.json();
            const result = data.items?.[0] || null;
            
            this.cache.set(cacheKey, result);
            
            if (ENV && ENV.DEBUG_MODE) {
                console.log(`[DDD] Found: ${result?.name || 'No match'}`);
            }
            
            return result;

        } catch (error) {
            console.error('[DDD] IMDB search error:', error);
            return null;
        }
    }

    /**
     * Get trigger warnings for a specific movie/show
     */
    async getTriggerWarnings(dddId) {
        const cacheKey = `warnings:${dddId}`;
        if (this.cache.has(cacheKey)) {
            if (ENV && ENV.DEBUG_MODE) {
                console.log(`[DDD] Cache hit for warnings: ${dddId}`);
            }
            return this.cache.get(cacheKey);
        }

        try {
            if (ENV && ENV.DEBUG_MODE) {
                console.log(`[DDD] Fetching warnings for ID: ${dddId}`);
            }
            
            // ✅ CHANGED: Use Vercel proxy endpoint
            const url = `${API_BASE}?action=get-warnings&dddId=${dddId}`;
            const response = await fetch(url);

            if (!response.ok) {
                console.warn(`[DDD] Failed to fetch warnings for: ${dddId} (${response.status})`);
                return [];
            }

            const data = await response.json();
            
            // Extract trigger warnings from topics
            const warnings = [];
            if (data.topicItemStats) {
                for (const topic of data.topicItemStats) {
                    // Only include topics with YES votes (indicates trigger is present)
                    if (topic.yesSum > topic.noSum) {
                        warnings.push({
                            name: topic.topic?.name || 'Unknown',
                            description: topic.topic?.description,
                            yesVotes: topic.yesSum,
                            noVotes: topic.noSum
                        });
                    }
                }
            }
            
            this.cache.set(cacheKey, warnings);
            
            if (ENV && ENV.DEBUG_MODE) {
                console.log(`[DDD] Found ${warnings.length} trigger warnings`);
            }
            
            return warnings;

        } catch (error) {
            console.error('[DDD] Warnings fetch error:', error);
            return [];
        }
    }

    /**
     * Get trigger warnings for a movie by title
     * (Convenience method that combines search + warnings)
     */
    async getWarningsForMovie(title, imdbId = null) {
        try {
            // Try IMDB first if available
            let movie = null;
            if (imdbId) {
                movie = await this.searchByIMDB(imdbId);
            }
            
            // Fallback to title search
            if (!movie) {
                movie = await this.searchByTitle(title);
            }

            if (!movie || !movie.id) {
                if (ENV && ENV.DEBUG_MODE) {
                    console.log(`[DDD] No match found for: ${title}`);
                }
                return [];
            }

            // Fetch warnings for the movie
            const warnings = await this.getTriggerWarnings(movie.id);
            return warnings;

        } catch (error) {
            console.error('[DDD] Error getting warnings:', error);
            return [];
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        if (ENV && ENV.DEBUG_MODE) {
            console.log('[DDD] Cache cleared');
        }
    }
}

// Export singleton instance
export const doesTheDogDieService = new DoesTheDogDieService();
