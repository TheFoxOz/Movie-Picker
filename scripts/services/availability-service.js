/**
 * Availability Service - Provider Agnostic
 * Currently uses TMDB, can easily switch to Streaming Availability API
 */

import { ENV } from '../config/env.js';

// ============================================================================
// ABSTRACT PROVIDER INTERFACE
// ============================================================================

class AvailabilityProvider {
    async getAvailability(movieId, region) {
        throw new Error('getAvailability must be implemented');
    }
    
    parseResponse(data, region) {
        throw new Error('parseResponse must be implemented');
    }
}

// ============================================================================
// TMDB PROVIDER (PHASE 1 - FREE)
// ============================================================================

class TMDBAvailabilityProvider extends AvailabilityProvider {
    constructor(apiKey) {
        super();
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.themoviedb.org/3';
    }

    async getAvailability(movieId, region) {
        try {
            const response = await fetch(
                `${this.baseUrl}/movie/${movieId}/watch/providers?api_key=${this.apiKey}`,
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`TMDB API error: ${response.status}`);
            }

            const data = await response.json();
            return this.parseResponse(data, region);
            
        } catch (error) {
            console.error('[TMDB Provider] Error:', error);
            throw error;
        }
    }

    parseResponse(data, region) {
        const regionData = data.results?.[region];
        
        if (!regionData) {
            return {
                available: false,
                region,
                providers: {
                    flatrate: [],
                    buy: [],
                    rent: []
                },
                link: null
            };
        }

        return {
            available: true,
            region,
            providers: {
                flatrate: this.parseProviders(regionData.flatrate || []),
                buy: this.parseProviders(regionData.buy || []),
                rent: this.parseProviders(regionData.rent || [])
            },
            link: regionData.link || null
        };
    }

    parseProviders(providers) {
        return providers.map(p => ({
            id: p.provider_id,
            name: p.provider_name,
            logo: `https://image.tmdb.org/t/p/original${p.logo_path}`,
            displayPriority: p.display_priority
        })).sort((a, b) => a.displayPriority - b.displayPriority);
    }
}

// ============================================================================
// STREAMING AVAILABILITY API PROVIDER (PHASE 2 - FUTURE)
// ============================================================================

class StreamingAvailabilityProvider extends AvailabilityProvider {
    constructor(apiKey) {
        super();
        this.apiKey = apiKey;
        this.baseUrl = 'https://streaming-availability.p.rapidapi.com';
    }

    async getAvailability(movieId, region) {
        try {
            const response = await fetch(
                `${this.baseUrl}/get?tmdb_id=movie/${movieId}&country=${region}`,
                {
                    headers: {
                        'X-RapidAPI-Key': this.apiKey,
                        'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`SA API error: ${response.status}`);
            }

            const data = await response.json();
            return this.parseResponse(data, region);
            
        } catch (error) {
            console.error('[SA Provider] Error:', error);
            throw error;
        }
    }

    parseResponse(data, region) {
        const streamingInfo = data.result?.streamingInfo?.[region];
        
        if (!streamingInfo) {
            return {
                available: false,
                region,
                providers: {
                    flatrate: [],
                    buy: [],
                    rent: []
                },
                link: null
            };
        }

        const flatrate = [];
        const buy = [];
        const rent = [];

        Object.entries(streamingInfo).forEach(([service, details]) => {
            details.forEach(detail => {
                const provider = {
                    id: service,
                    name: this.normalizeName(service),
                    logo: detail.icon || null,
                    link: detail.link,
                    quality: detail.quality,
                    price: detail.price
                };

                switch (detail.streamingType) {
                    case 'subscription':
                        flatrate.push(provider);
                        break;
                    case 'buy':
                        buy.push(provider);
                        break;
                    case 'rent':
                        rent.push(provider);
                        break;
                }
            });
        });

        return {
            available: flatrate.length > 0 || buy.length > 0 || rent.length > 0,
            region,
            providers: { flatrate, buy, rent },
            link: null
        };
    }

    normalizeName(service) {
        const names = {
            'netflix': 'Netflix',
            'prime': 'Prime Video',
            'disney': 'Disney+',
            'hbo': 'HBO Max',
            'apple': 'Apple TV+'
        };
        return names[service] || service;
    }
}

// ============================================================================
// MAIN AVAILABILITY SERVICE (PROVIDER SWITCHER)
// ============================================================================

export class AvailabilityService {
    constructor() {
        this.provider = null;
        this.cache = new Map();
        this.cacheDuration = 3600000; // 1 hour
    }

    /**
     * Initialize with provider
     * @param {string} providerType - 'tmdb' or 'streaming-availability'
     * @param {string} apiKey - API key for the provider
     */
    initialize(providerType, apiKey) {
        switch (providerType) {
            case 'tmdb':
                this.provider = new TMDBAvailabilityProvider(apiKey);
                console.log('[Availability] Using TMDB provider');
                break;
            case 'streaming-availability':
                this.provider = new StreamingAvailabilityProvider(apiKey);
                console.log('[Availability] Using Streaming Availability provider');
                break;
            default:
                throw new Error(`Unknown provider: ${providerType}`);
        }
    }

    /**
     * Get availability for a movie (with caching)
     * @param {number} movieId - TMDB movie ID
     * @param {string} region - ISO country code (e.g., 'US', 'FR')
     * @returns {Promise<Object>}
     */
    async getAvailability(movieId, region) {
        if (!this.provider) {
            throw new Error('Availability service not initialized');
        }

        const cacheKey = `${movieId}-${region}`;
        
        // Check cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (cached.expiry > Date.now()) {
                console.log(`[Availability] Cache hit: ${cacheKey}`);
                return cached.data;
            }
            this.cache.delete(cacheKey);
        }

        // Fetch from provider
        console.log(`[Availability] Fetching ${movieId} for ${region}`);
        const data = await this.provider.getAvailability(movieId, region);

        // Cache result
        this.cache.set(cacheKey, {
            data,
            expiry: Date.now() + this.cacheDuration
        });

        return data;
    }

    /**
     * Get availability for multiple movies (batch)
     * @param {Array<number>} movieIds - Array of TMDB IDs
     * @param {string} region - ISO country code
     * @returns {Promise<Map>}
     */
    async getAvailabilityBatch(movieIds, region) {
        const results = new Map();
        
        // Process in parallel
        await Promise.all(
            movieIds.map(async (movieId) => {
                try {
                    const availability = await this.getAvailability(movieId, region);
                    results.set(movieId, availability);
                } catch (error) {
                    console.error(`[Availability] Failed for movie ${movieId}:`, error);
                    results.set(movieId, this.getDefaultAvailability(region));
                }
            })
        );

        return results;
    }

    /**
     * Filter availability by user's selected platforms
     * @param {Object} availability - Availability data
     * @param {Array<string>} userPlatforms - User's selected platform names
     * @returns {Object}
     */
    filterByUserPlatforms(availability, userPlatforms) {
        if (!availability.available) return availability;

        const filtered = {
            ...availability,
            providers: {
                flatrate: availability.providers.flatrate.filter(p =>
                    userPlatforms.includes(p.name)
                ),
                buy: availability.providers.buy.filter(p =>
                    userPlatforms.includes(p.name)
                ),
                rent: availability.providers.rent.filter(p =>
                    userPlatforms.includes(p.name)
                )
            }
        };

        filtered.available = 
            filtered.providers.flatrate.length > 0 ||
            filtered.providers.buy.length > 0 ||
            filtered.providers.rent.length > 0;

        return filtered;
    }

    /**
     * Switch to a different provider (for upgrade path)
     * @param {string} providerType - 'tmdb' or 'streaming-availability'
     * @param {string} apiKey - API key
     */
    switchProvider(providerType, apiKey) {
        console.log(`[Availability] Switching provider from ${this.provider?.constructor.name} to ${providerType}`);
        this.clearCache();
        this.initialize(providerType, apiKey);
    }

    /**
     * Get default/empty availability
     */
    getDefaultAvailability(region) {
        return {
            available: false,
            region,
            providers: {
                flatrate: [],
                buy: [],
                rent: []
            },
            link: null
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('[Availability] Cache cleared');
    }

    /**
     * Get cache statistics
     */
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
export const availabilityService = new AvailabilityService();
