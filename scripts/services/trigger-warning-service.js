/**
 * Trigger Warning Service
 * Groups DoesTheDogDie warnings into clean categories
 * Prevents spoiler exposure unless user opts in
 */

import { TRIGGER_CATEGORIES } from '../config/trigger-categories.js';

export class TriggerWarningService {
    constructor() {
        this.apiKey = null;
        this.baseUrl = 'https://www.doesthedogdie.com/dddsearchapi/v1';
        this.cache = new Map();
        this.cacheDuration = 86400000; // 24 hours
    }

    initialize(apiKey) {
        this.apiKey = apiKey;
        console.log('[TriggerWarning] Service initialized');
    }

    /**
     * Get warnings for a movie (grouped by category)
     * @param {number} tmdbId - TMDB movie ID
     * @returns {Promise<Object>}
     */
    async getWarnings(tmdbId) {
        if (!this.apiKey) {
            console.warn('[TriggerWarning] API key not configured');
            return this.getDefaultWarnings();
        }

        const cacheKey = `warnings-${tmdbId}`;
        
        // Check cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (cached.expiry > Date.now()) {
                console.log(`[TriggerWarning] Cache hit: ${tmdbId}`);
                return cached.data;
            }
            this.cache.delete(cacheKey);
        }

        try {
            // Step 1: Search for movie
            console.log(`[TriggerWarning] Searching for TMDB ID ${tmdbId}`);
            const searchResponse = await fetch(
                `${this.baseUrl}/search?q=tmdb:${tmdbId}`,
                {
                    headers: {
                        'X-API-KEY': this.apiKey,
                        'Accept': 'application/json'
                    }
                }
            );

            if (!searchResponse.ok) {
                throw new Error(`Search failed: ${searchResponse.status}`);
            }

            const searchData = await searchResponse.json();
            const item = searchData.items?.[0];

            if (!item) {
                console.log(`[TriggerWarning] No data found for ${tmdbId}`);
                return this.getDefaultWarnings();
            }

            // Step 2: Get warnings
            console.log(`[TriggerWarning] Fetching warnings for DTD ID ${item.id}`);
            const warningsResponse = await fetch(
                `${this.baseUrl}/media/${item.id}`,
                {
                    headers: {
                        'X-API-KEY': this.apiKey,
                        'Accept': 'application/json'
                    }
                }
            );

            if (!warningsResponse.ok) {
                throw new Error(`Warnings failed: ${warningsResponse.status}`);
            }

            const warningsData = await warningsResponse.json();
            const parsed = this.parseAndCategorize(warningsData, tmdbId);

            // Cache result
            this.cache.set(cacheKey, {
                data: parsed,
                expiry: Date.now() + this.cacheDuration
            });

            return parsed;

        } catch (error) {
            console.error('[TriggerWarning] Error:', error);
            return this.getDefaultWarnings();
        }
    }

    /**
     * Parse DTD response and group into categories
     */
    parseAndCategorize(data, tmdbId) {
        const topics = data.topicItemStats || [];
        const categoryMap = new Map();

        console.log(`[TriggerWarning] Processing ${topics.length} topics for ${tmdbId}`);

        topics.forEach(topic => {
            // Skip topics with very few votes
            if ((topic.yesSum || 0) < 2) return;

            // Determine category
            const categoryId = this.mapTopicToCategory(topic.topic);
            const category = TRIGGER_CATEGORIES[categoryId];

            if (!category) return;

            // Initialize category if not exists
            if (!categoryMap.has(categoryId)) {
                categoryMap.set(categoryId, {
                    id: categoryId,
                    name: category.name,
                    icon: category.icon,
                    severity: category.severity,
                    spoilerFree: category.spoilerFree,
                    warnings: [],
                    stats: {
                        totalYes: 0,
                        totalNo: 0,
                        count: 0
                    }
                });
            }

            const cat = categoryMap.get(categoryId);

            // Add warning
            cat.warnings.push({
                topic: topic.topic,
                question: topic.topicQuestion || topic.topic,
                yesVotes: topic.yesSum || 0,
                noVotes: topic.noSum || 0,
                confidence: this.calculateConfidence(topic.yesSum || 0, topic.noSum || 0)
            });

            // Update stats
            cat.stats.totalYes += topic.yesSum || 0;
            cat.stats.totalNo += topic.noSum || 0;
            cat.stats.count++;
        });

        // Sort warnings within each category by confidence
        categoryMap.forEach(category => {
            category.warnings.sort((a, b) => 
                (b.confidence.percentage || 0) - (a.confidence.percentage || 0)
            );
        });

        // Convert to array and sort by severity
        const categories = Array.from(categoryMap.values());
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        categories.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        return {
            hasWarnings: categories.length > 0,
            categories,
            metadata: {
                fetchedAt: new Date().toISOString(),
                tmdbId,
                totalCategories: categories.length,
                totalWarnings: categories.reduce((sum, cat) => sum + cat.warnings.length, 0)
            }
        };
    }

    /**
     * Map DTD topic to category ID
     */
    mapTopicToCategory(topic) {
        const lower = topic.toLowerCase();

        // Animal Harm (1)
        if (lower.match(/dog|cat|animal|pet|horse|bird/)) return 1;

        // Sexual Violence (3) - Check before general violence
        if (lower.match(/sexual|rape|assault.*sexual/)) return 3;

        // Domestic Violence (9)
        if (lower.match(/domestic|abuse.*partner|intimate.*violence/)) return 9;

        // Violence (2)
        if (lower.match(/violence|gore|blood|fight|murder|kill|gun|weapon|stab/)) return 2;

        // Death (4)
        if (lower.match(/death|dies|dead|killed|corpse/)) return 4;

        // Kid Danger (5)
        if (lower.match(/kid|child|baby|infant|minor/)) return 5;

        // Mental Health (6)
        if (lower.match(/suicide|self-harm|mental|depression|anxiety|ptsd/)) return 6;

        // Jump Scares (7)
        if (lower.match(/jump.*scare|startle|sudden.*fright/)) return 7;

        // Substance Abuse (8)
        if (lower.match(/drug|alcohol|addiction|substance/)) return 8;

        // Medical (10)
        if (lower.match(/medical|hospital|surgery|needle|injection|blood.*draw/)) return 10;

        // Discrimination (11)
        if (lower.match(/racist|homophob|transphob|sexis|discriminat|slur/)) return 11;

        // Body Horror (12)
        if (lower.match(/body.*horror|dismember|mutilat|disfigure/)) return 12;

        // Default - Other
        return 0;
    }

    /**
     * Calculate confidence level
     */
    calculateConfidence(yesVotes, noVotes) {
        const total = yesVotes + noVotes;
        
        if (total < 5) {
            return { level: 'low', percentage: 0, display: 'Low confidence' };
        }

        const percentage = (yesVotes / total) * 100;

        if (percentage >= 75) {
            return { level: 'high', percentage, display: 'High confidence' };
        } else if (percentage >= 50) {
            return { level: 'medium', percentage, display: 'Medium confidence' };
        } else {
            return { level: 'low', percentage, display: 'Low confidence' };
        }
    }

    /**
     * Filter warnings by user's enabled categories
     * @param {Object} warnings - Full warnings object
     * @param {Array<number>} enabledCategories - User's enabled category IDs
     * @param {Object} showDetails - Per-category detail preferences
     * @returns {Object}
     */
    filterByUserPreferences(warnings, enabledCategories, showDetails = {}) {
        if (!warnings.hasWarnings) return warnings;

        const filtered = warnings.categories
            .filter(cat => enabledCategories.includes(cat.id))
            .map(cat => ({
                ...cat,
                showDetails: showDetails[cat.id] || false,
                // Only include detailed warnings if user enabled them
                warnings: showDetails[cat.id] ? cat.warnings : []
            }));

        return {
            ...warnings,
            categories: filtered,
            filtered: true
        };
    }

    /**
     * Get summary (non-spoiler) for display
     * @param {Object} warnings - Full warnings object
     * @param {Array<number>} enabledCategories - User's enabled category IDs
     * @returns {Array<Object>}
     */
    getSummary(warnings, enabledCategories) {
        if (!warnings.hasWarnings) return [];

        return warnings.categories
            .filter(cat => enabledCategories.includes(cat.id))
            .map(cat => ({
                id: cat.id,
                name: cat.name,
                icon: cat.icon,
                severity: cat.severity,
                message: cat.spoilerFree,
                warningCount: cat.warnings.length
            }));
    }

    getDefaultWarnings() {
        return {
            hasWarnings: false,
            categories: [],
            metadata: {
                fetchedAt: new Date().toISOString(),
                error: 'No data available'
            }
        };
    }

    clearCache() {
        this.cache.clear();
        console.log('[TriggerWarning] Cache cleared');
    }

    getCacheStats() {
        let valid = 0;
        let expired = 0;
        const now = Date.now();

        this.cache.forEach((entry) => {
            if (entry.expiry > now) {
                valid++;
            } else {
                expired++;
            }
        });

        return { valid, expired, total: this.cache.size };
    }
}

// Singleton instance
export const triggerWarningService = new TriggerWarningService();
