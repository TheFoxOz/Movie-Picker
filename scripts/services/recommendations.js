/**
 * Recommendations Service
 * Smart movie recommendations combining taste profiles, couple preferences, and TMDB data
 * ✅ Personal recommendations based on taste profile
 * ✅ Couple recommendations (both partners will like)
 * ✅ Room recommendations (group consensus)
 * ✅ Quick helpers for common recommendation scenarios
 */

import { tasteProfileService } from './taste-profile.js';
import { coupleService } from './couple-service.js';
import { roomService } from './room-service.js';
import { tmdbService } from './tmdb.js';

class RecommendationsService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    }

    /**
     * Get personalized recommendations for user
     * @param {string} userId - User ID
     * @param {number} limit - Number of recommendations
     * @returns {Promise<Array>} Recommended movies
     */
    async getPersonalRecommendations(userId, limit = 20) {
        console.log('[Recommendations] Getting personal recommendations for user:', userId);

        try {
            // Check cache
            const cacheKey = `personal_${userId}_${limit}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log('[Recommendations] Using cached recommendations');
                return cached;
            }

            // Get recommendations from taste profile service
            const recommendations = await tasteProfileService.getRecommendations(userId, limit);

            // Cache results
            this.saveToCache(cacheKey, recommendations);

            console.log(`[Recommendations] ✅ Generated ${recommendations.length} personal recommendations`);

            return recommendations;

        } catch (error) {
            console.error('[Recommendations] Error getting personal recommendations:', error);
            return [];
        }
    }

    /**
     * Get couple recommendations (movies both partners will like)
     * @param {string} coupleId - Couple ID
     * @param {number} limit - Number of recommendations
     * @returns {Promise<Array>} Recommended movies
     */
    async getCoupleRecommendations(coupleId, limit = 20) {
        console.log('[Recommendations] Getting couple recommendations for:', coupleId);

        try {
            // Check cache
            const cacheKey = `couple_${coupleId}_${limit}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log('[Recommendations] Using cached couple recommendations');
                return cached;
            }

            // Get couple data
            const coupleData = await coupleService.getCoupleData(coupleId);
            if (!coupleData) {
                throw new Error('Couple not found');
            }

            const [userId1, userId2] = coupleData.users;

            // Get both users' taste profiles
            const [profile1, profile2] = await Promise.all([
                tasteProfileService.analyzeTasteProfile(userId1),
                tasteProfileService.analyzeTasteProfile(userId2)
            ]);

            // Find common top genres
            const commonGenres = this.findCommonGenres(profile1, profile2);

            if (commonGenres.length === 0) {
                console.log('[Recommendations] No common genres, using popular movies');
                return this.getPopularMovies(limit);
            }

            // Calculate average preferred rating
            const avgRating = (parseFloat(profile1.avgRating) + parseFloat(profile2.avgRating)) / 2;
            const minRating = Math.max(6, avgRating - 1);

            console.log('[Recommendations] Couple criteria:', {
                commonGenres: commonGenres.map(g => g.name),
                minRating
            });

            // Get recommendations based on common preferences
            const genreIds = commonGenres
                .slice(0, 2)
                .map(g => tasteProfileService.getGenreIdByName(g.name))
                .filter(Boolean);

            const response = await tmdbService.discoverMovies({
                sortBy: 'vote_average.desc',
                withGenres: genreIds.join(','),
                voteAverageGte: minRating,
                voteCountGte: 100,
                page: 1
            });

            let movies = response.movies || [];

            // Enrich with platform data
            if (movies.length > 0 && tmdbService.loadWatchProvidersForMovies) {
                await tmdbService.loadWatchProvidersForMovies(movies.slice(0, limit));
            }

            // Filter by platforms (use first user's preferences)
            if (tmdbService.filterByUserPlatforms) {
                movies = tmdbService.filterByUserPlatforms(movies);
            }

            // Filter blocked movies
            if (tmdbService.filterBlockedMovies) {
                movies = tmdbService.filterBlockedMovies(movies);
            }

            const recommendations = movies.slice(0, limit);

            // Cache results
            this.saveToCache(cacheKey, recommendations);

            console.log(`[Recommendations] ✅ Generated ${recommendations.length} couple recommendations`);

            return recommendations;

        } catch (error) {
            console.error('[Recommendations] Error getting couple recommendations:', error);
            return [];
        }
    }

    /**
     * Get room recommendations (movies everyone in room might like)
     * @param {string} roomId - Room ID
     * @param {number} limit - Number of recommendations
     * @returns {Promise<Array>} Recommended movies
     */
    async getRoomRecommendations(roomId, limit = 20) {
        console.log('[Recommendations] Getting room recommendations for:', roomId);

        try {
            // Check cache
            const cacheKey = `room_${roomId}_${limit}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log('[Recommendations] Using cached room recommendations');
                return cached;
            }

            // Get room data
            const roomData = await roomService.getRoomData(roomId);
            if (!roomData) {
                throw new Error('Room not found');
            }

            const users = roomData.users || [];
            if (users.length === 0) {
                return [];
            }

            // Get all users' taste profiles
            const profiles = await Promise.all(
                users.map(userId => tasteProfileService.analyzeTasteProfile(userId))
            );

            // Find genres that appear in most profiles
            const genreScores = {};
            profiles.forEach(profile => {
                profile.topGenres.forEach(genre => {
                    if (!genreScores[genre.name]) {
                        genreScores[genre.name] = 0;
                    }
                    genreScores[genre.name] += parseInt(genre.percentage) || 0;
                });
            });

            // Get top genres by total score
            const topGenres = Object.entries(genreScores)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([name]) => name);

            if (topGenres.length === 0) {
                console.log('[Recommendations] No common genres, using popular movies');
                return this.getPopularMovies(limit);
            }

            // Calculate average rating preference
            const avgRatings = profiles.map(p => parseFloat(p.avgRating)).filter(r => r > 0);
            const avgRating = avgRatings.length > 0 
                ? avgRatings.reduce((a, b) => a + b, 0) / avgRatings.length
                : 7.0;
            const minRating = Math.max(6, avgRating - 1);

            console.log('[Recommendations] Room criteria:', {
                topGenres,
                minRating,
                userCount: users.length
            });

            // Get recommendations
            const genreIds = topGenres
                .slice(0, 2)
                .map(name => tasteProfileService.getGenreIdByName(name))
                .filter(Boolean);

            const response = await tmdbService.discoverMovies({
                sortBy: 'vote_average.desc',
                withGenres: genreIds.join(','),
                voteAverageGte: minRating,
                voteCountGte: 200, // Higher vote count for groups
                page: 1
            });

            let movies = response.movies || [];

            // Enrich with platform data
            if (movies.length > 0 && tmdbService.loadWatchProvidersForMovies) {
                await tmdbService.loadWatchProvidersForMovies(movies.slice(0, limit));
            }

            // Filter by platforms
            if (tmdbService.filterByUserPlatforms) {
                movies = tmdbService.filterByUserPlatforms(movies);
            }

            // Filter blocked movies
            if (tmdbService.filterBlockedMovies) {
                movies = tmdbService.filterBlockedMovies(movies);
            }

            const recommendations = movies.slice(0, limit);

            // Cache results
            this.saveToCache(cacheKey, recommendations);

            console.log(`[Recommendations] ✅ Generated ${recommendations.length} room recommendations`);

            return recommendations;

        } catch (error) {
            console.error('[Recommendations] Error getting room recommendations:', error);
            return [];
        }
    }

    /**
     * Get "Tonight's Pick" - best movie for immediate watching
     * @param {string} userId - User ID
     * @param {string} coupleId - Optional couple ID
     * @returns {Promise<Object>} Single movie recommendation
     */
    async getTonightsPick(userId, coupleId = null) {
        console.log('[Recommendations] Getting tonight\'s pick');

        try {
            let recommendations;

            if (coupleId) {
                recommendations = await this.getCoupleRecommendations(coupleId, 10);
            } else {
                recommendations = await this.getPersonalRecommendations(userId, 10);
            }

            if (recommendations.length === 0) {
                return null;
            }

            // Pick highest rated movie from top 5
            const topMovies = recommendations.slice(0, 5);
            const pick = topMovies.reduce((best, current) => {
                const currentRating = current.rating || current.vote_average || 0;
                const bestRating = best.rating || best.vote_average || 0;
                return currentRating > bestRating ? current : best;
            }, topMovies[0]);

            console.log('[Recommendations] ✅ Tonight\'s pick:', pick.title);

            return pick;

        } catch (error) {
            console.error('[Recommendations] Error getting tonight\'s pick:', error);
            return null;
        }
    }

    /**
     * Get recommendations by mood
     * @param {string} mood - Mood type (happy, sad, scared, romantic, excited)
     * @param {number} limit - Number of recommendations
     * @returns {Promise<Array>} Recommended movies
     */
    async getRecommendationsByMood(mood, limit = 20) {
        console.log('[Recommendations] Getting recommendations for mood:', mood);

        try {
            const moodToGenres = {
                'happy': ['Comedy', 'Animation', 'Family'],
                'sad': ['Drama', 'Romance'],
                'scared': ['Horror', 'Thriller'],
                'romantic': ['Romance', 'Drama'],
                'excited': ['Action', 'Adventure', 'Science Fiction']
            };

            const genres = moodToGenres[mood.toLowerCase()] || ['Drama'];
            const genreIds = genres
                .map(name => tasteProfileService.getGenreIdByName(name))
                .filter(Boolean);

            const response = await tmdbService.discoverMovies({
                sortBy: 'popularity.desc',
                withGenres: genreIds.join(','),
                voteAverageGte: 7.0,
                page: 1
            });

            let movies = response.movies || [];

            // Enrich with platform data
            if (movies.length > 0 && tmdbService.loadWatchProvidersForMovies) {
                await tmdbService.loadWatchProvidersForMovies(movies.slice(0, limit));
            }

            // Filter by platforms
            if (tmdbService.filterByUserPlatforms) {
                movies = tmdbService.filterByUserPlatforms(movies);
            }

            console.log(`[Recommendations] ✅ Generated ${movies.length} ${mood} recommendations`);

            return movies.slice(0, limit);

        } catch (error) {
            console.error('[Recommendations] Error getting mood recommendations:', error);
            return [];
        }
    }

    /**
     * Find common genres between two profiles
     */
    findCommonGenres(profile1, profile2) {
        const genres1 = profile1.topGenres.map(g => g.name);
        const genres2 = profile2.topGenres.map(g => g.name);

        // Find intersection
        const common = genres1.filter(name => genres2.includes(name));

        // Return with combined scores
        return common.map(name => {
            const genre1 = profile1.topGenres.find(g => g.name === name);
            const genre2 = profile2.topGenres.find(g => g.name === name);
            return {
                name,
                combinedScore: (genre1.score + genre2.score) / 2
            };
        }).sort((a, b) => b.combinedScore - a.combinedScore);
    }

    /**
     * Get popular movies as fallback
     */
    async getPopularMovies(limit = 20) {
        try {
            const response = await tmdbService.discoverMovies({
                sortBy: 'popularity.desc',
                voteAverageGte: 7.0,
                page: 1
            });

            let movies = response.movies || [];

            // Enrich with platform data
            if (movies.length > 0 && tmdbService.loadWatchProvidersForMovies) {
                await tmdbService.loadWatchProvidersForMovies(movies.slice(0, limit));
            }

            return movies.slice(0, limit);

        } catch (error) {
            console.error('[Recommendations] Error getting popular movies:', error);
            return [];
        }
    }

    /**
     * Cache management
     */
    saveToCache(key, data) {
        this.cache.set(key, {
            data,
            cachedAt: Date.now()
        });
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        const age = Date.now() - cached.cachedAt;
        if (age > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    clearCache() {
        this.cache.clear();
    }

    /**
     * Invalidate user cache (call when user swipes)
     */
    invalidateUserCache(userId) {
        const keysToDelete = [];
        this.cache.forEach((value, key) => {
            if (key.includes(userId)) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.cache.delete(key));
    }
}

// Create singleton instance
const recommendationsService = new RecommendationsService();

export { recommendationsService, RecommendationsService };
