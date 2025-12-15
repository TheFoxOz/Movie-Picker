/**
 * DoesTheDogDie Service - Trigger Warning Integration
 * ✅ Uses Vercel serverless proxy to bypass CORS
 * ✅ Improved error handling with graceful fallbacks
 * ✅ Better search with title normalization
 */

class DoesTheDogDieService {
    constructor() {
        this.baseURL = '/api/trigger-warnings'; // Vercel proxy endpoint
        this.cache = new Map();
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
    }

    /**
     * Normalize movie title for better matching
     * Removes special characters, extra spaces, and common suffixes
     */
    normalizeTitle(title) {
        if (!title) return '';
        
        return title
            .toLowerCase()
            .replace(/[:\-–—]/g, '') // Remove colons, hyphens, dashes
            .replace(/\s+/g, ' ') // Normalize spaces
            .replace(/\(.*?\)/g, '') // Remove anything in parentheses
            .trim();
    }

    /**
     * Get trigger warnings for a movie
     * @param {string} title - Movie title
     * @param {string} imdbId - Optional IMDB ID for better accuracy
     * @returns {Promise<Array>} Array of warnings
     */
    async getWarningsForMovie(title, imdbId = null) {
        if (!title) {
            console.warn('[DDD] No title provided');
            return [];
        }

        // Check cache first
        const cacheKey = imdbId || title;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            console.log(`[DDD] Using cached warnings for: ${title}`);
            return cached.warnings;
        }

        try {
            // Strategy 1: Try IMDB ID first (most accurate)
            if (imdbId) {
                console.log(`[DDD] Searching by IMDB ID: ${imdbId}`);
                const warnings = await this.searchByImdbId(imdbId);
                
                if (warnings && warnings.length > 0) {
                    this.cacheResult(cacheKey, warnings);
                    return warnings;
                }
            }

            // Strategy 2: Try exact title match
            console.log(`[DDD] Searching by title: ${title}`);
            const exactMatch = await this.searchByTitle(title);
            
            if (exactMatch && exactMatch.length > 0) {
                this.cacheResult(cacheKey, exactMatch);
                return exactMatch;
            }

            // Strategy 3: Try normalized title (remove special chars)
            const normalizedTitle = this.normalizeTitle(title);
            if (normalizedTitle !== title.toLowerCase()) {
                console.log(`[DDD] Trying normalized title: ${normalizedTitle}`);
                const normalizedMatch = await this.searchByTitle(normalizedTitle);
                
                if (normalizedMatch && normalizedMatch.length > 0) {
                    this.cacheResult(cacheKey, normalizedMatch);
                    return normalizedMatch;
                }
            }

            // No warnings found - cache empty result to avoid repeated API calls
            console.log(`[DDD] No warnings found for: ${title}`);
            this.cacheResult(cacheKey, []);
            return [];

        } catch (error) {
            console.error('[DDD] Error fetching warnings:', error);
            // Cache empty result to prevent repeated failed attempts
            this.cacheResult(cacheKey, []);
            return [];
        }
    }

    /**
     * Search by IMDB ID (most reliable)
     */
    async searchByImdbId(imdbId) {
        try {
            const response = await fetch(`${this.baseURL}?action=search-imdb&imdbId=${encodeURIComponent(imdbId)}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log(`[DDD] No DDD entry for IMDB: ${imdbId}`);
                    return [];
                }
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data.mediaId) {
                return await this.getWarnings(data.mediaId);
            }

            return [];
        } catch (error) {
            console.warn(`[DDD] IMDB search failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Search by title
     */
    async searchByTitle(title) {
        try {
            const response = await fetch(`${this.baseURL}?action=search-title&title=${encodeURIComponent(title)}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    // 404 is normal - means movie not in DDD database
                    return [];
                }
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // DDD API returns array of search results
            if (Array.isArray(data) && data.length > 0) {
                const firstResult = data[0];
                if (firstResult.id) {
                    return await this.getWarnings(firstResult.id);
                }
            }

            return [];
        } catch (error) {
            // Don't log 404s as errors - they're expected for movies not in DDD
            if (!error.message.includes('404')) {
                console.warn(`[DDD] Title search failed for "${title}": ${error.message}`);
            }
            return [];
        }
    }

    /**
     * Get warnings for a specific media ID
     */
    async getWarnings(mediaId) {
        try {
            const response = await fetch(`${this.baseURL}?action=get-warnings&mediaId=${mediaId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // Extract warnings from DDD response format
            if (data.topicItemStats && Array.isArray(data.topicItemStats)) {
                const warnings = data.topicItemStats
                    .filter(item => item.yesSum > 0) // Only include confirmed warnings
                    .map(item => ({
                        category: this.mapDDDCategory(item.topic?.name || 'Unknown'),
                        description: item.topic?.name || 'Unknown warning',
                        severity: this.calculateSeverity(item.yesSum, item.noSum),
                        votes: {
                            yes: item.yesSum || 0,
                            no: item.noSum || 0
                        }
                    }));

                console.log(`[DDD] ✅ Found ${warnings.length} warnings for media ${mediaId}`);
                return warnings;
            }

            return [];
        } catch (error) {
            console.error(`[DDD] Failed to get warnings for media ${mediaId}:`, error);
            return [];
        }
    }

    /**
     * Map DoesTheDogDie category names to our trigger warning categories
     */
    mapDDDCategory(dddCategory) {
        const categoryMap = {
            // Animal harm
            'animal death': 'Animal Harm',
            'dog dies': 'Animal Harm',
            'cat dies': 'Animal Harm',
            'animal abuse': 'Animal Harm',
            
            // Violence
            'blood': 'Violence',
            'gore': 'Violence',
            'gun violence': 'Violence',
            'physical violence': 'Violence',
            'torture': 'Violence',
            
            // Sexual violence
            'sexual assault': 'Sexual Violence',
            'rape': 'Sexual Violence',
            'sexual harassment': 'Sexual Violence',
            
            // Death
            'death': 'Death',
            'child death': 'Child Harm',
            'parent death': 'Death',
            
            // Mental health
            'suicide': 'Mental Health',
            'self harm': 'Mental Health',
            'panic attacks': 'Mental Health',
            'mental illness': 'Mental Health',
            
            // Jump scares
            'jump scares': 'Jump Scares',
            'scary': 'Jump Scares',
            
            // Substance abuse
            'alcohol': 'Substance Abuse',
            'drug use': 'Substance Abuse',
            
            // Domestic abuse
            'domestic violence': 'Domestic Abuse',
            'child abuse': 'Child Harm',
            
            // Medical trauma
            'medical procedures': 'Medical Trauma',
            'needles': 'Medical Trauma',
            'hospital': 'Medical Trauma',
            
            // Discrimination
            'racism': 'Hate/Discrimination',
            'homophobia': 'Hate/Discrimination',
            'transphobia': 'Hate/Discrimination',
            'sexism': 'Hate/Discrimination',
            
            // Body horror
            'body horror': 'Body Horror',
            'mutilation': 'Body Horror'
        };

        const normalized = dddCategory.toLowerCase();
        
        for (const [key, category] of Object.entries(categoryMap)) {
            if (normalized.includes(key)) {
                return category;
            }
        }

        // Default to general warning
        return 'Other';
    }

    /**
     * Calculate severity based on yes/no votes
     */
    calculateSeverity(yesVotes, noVotes) {
        const total = yesVotes + noVotes;
        if (total === 0) return 'low';
        
        const yesPercentage = (yesVotes / total) * 100;
        
        if (yesPercentage >= 75) return 'high';
        if (yesPercentage >= 50) return 'medium';
        return 'low';
    }

    /**
     * Cache results to minimize API calls
     */
    cacheResult(key, warnings) {
        this.cache.set(key, {
            warnings,
            timestamp: Date.now()
        });
    }

    /**
     * Clear expired cache entries
     */
    clearExpiredCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp >= this.cacheExpiry) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear all cache
     */
    clearCache() {
        this.cache.clear();
        console.log('[DDD] Cache cleared');
    }
}

// Create singleton instance
const doesTheDogDieService = new DoesTheDogDieService();

export { doesTheDogDieService };
