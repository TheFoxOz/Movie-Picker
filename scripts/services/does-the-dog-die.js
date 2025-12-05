/**
 * DoesTheDogDie.com API Service
 * Fetches trigger warnings for movies
 */

const DDD_API_KEY = '8422ca0f3512e1d0cb973215099d0f20';
const DDD_BASE_URL = 'https://www.doesthedogdie.com';
// CORS proxy to bypass browser restrictions
const CORS_PROXY = 'https://corsproxy.io/?';

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
            console.log(`[DDD] Cache hit for: ${title}`);
            return this.cache.get(cacheKey);
        }

        try {
            console.log(`[DDD] Searching for: ${title}`);
            const url = `${DDD_BASE_URL}/dddsearch?q=${encodeURIComponent(title)}`;
            const response = await fetch(
                `${CORS_PROXY}${encodeURIComponent(url)}`,
                {
                    headers: {
                        'Accept': 'application/json',
                        'X-API-KEY': DDD_API_KEY
                    }
                }
            );

            if (!response.ok) {
                console.warn(`[DDD] Search failed for: ${title}`);
                return null;
            }

            const data = await response.json();
            const result = data.items?.[0] || null; // Get first match
            
            this.cache.set(cacheKey, result);
            console.log(`[DDD] Found: ${result?.name || 'No match'}`);
            
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
            console.log(`[DDD] Cache hit for IMDB: ${imdbId}`);
            return this.cache.get(cacheKey);
        }

        try {
            console.log(`[DDD] Searching by IMDB: ${imdbId}`);
            const url = `${DDD_BASE_URL}/dddsearch?imdb=${imdbId}`;
            const response = await fetch(
                `${CORS_PROXY}${encodeURIComponent(url)}`,
                {
                    headers: {
                        'Accept': 'application/json',
                        'X-API-KEY': DDD_API_KEY
                    }
                }
            );

            if (!response.ok) {
                console.warn(`[DDD] Search failed for IMDB: ${imdbId}`);
                return null;
            }

            const data = await response.json();
            const result = data.items?.[0] || null;
            
            this.cache.set(cacheKey, result);
            console.log(`[DDD] Found: ${result?.name || 'No match'}`);
            
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
            console.log(`[DDD] Cache hit for warnings: ${dddId}`);
            return this.cache.get(cacheKey);
        }

        try {
            console.log(`[DDD] Fetching warnings for ID: ${dddId}`);
            const url = `${DDD_BASE_URL}/media/${dddId}`;
            const response = await fetch(
                `${CORS_PROXY}${encodeURIComponent(url)}`,
                {
                    headers: {
                        'Accept': 'application/json',
                        'X-API-KEY': DDD_API_KEY
                    }
                }
            );

            if (!response.ok) {
                console.warn(`[DDD] Failed to fetch warnings for: ${dddId}`);
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
            console.log(`[DDD] Found ${warnings.length} trigger warnings`);
            
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
                console.log(`[DDD] No match found for: ${title}`);
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
        console.log('[DDD] Cache cleared');
    }
}

// Export singleton instance
export const doesTheDogDieService = new DoesTheDogDieService();
