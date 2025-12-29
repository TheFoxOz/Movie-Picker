/**
 * Cache Invalidation Helper
 * 
 * CRITICAL: Call these methods after swipes to keep recommendations fresh!
 * 
 * Usage in your swipe handler (swipe.js or wherever you record swipes):
 * 
 * import { invalidateCachesAfterSwipe } from './utils/cache-invalidation.js';
 * 
 * // After successful swipe:
 * await invalidateCachesAfterSwipe(userId, action, movieData);
 */

import { recommendationsService } from '../services/recommendations.js';
import { coupleService } from '../services/couple-service.js';
import { tasteProfileService } from '../services/taste-profile.js';

/**
 * Invalidate all relevant caches after a swipe
 * CRITICAL: Call this after EVERY swipe to keep recommendations fresh
 * 
 * @param {string} userId - User who swiped
 * @param {string} action - Swipe action (love, like, maybe, nope)
 * @param {Object} movieData - Optional movie data for context
 * @param {string} roomId - Optional room ID if swiping in a room
 */
export async function invalidateCachesAfterSwipe(userId, action, movieData = null, roomId = null) {
    console.log('[CacheInvalidation] 🔄 Invalidating caches after swipe:', { userId, action });

    try {
        // 1. ALWAYS invalidate user's personal recommendation cache
        recommendationsService.invalidateUserCache(userId);

        // 2. If in couple mode, invalidate couple cache too
        try {
            const coupleId = await coupleService.getUserCouple(userId);
            if (coupleId) {
                recommendationsService.invalidateCoupleCache(coupleId);
                console.log('[CacheInvalidation] ✅ Couple cache invalidated');
            }
        } catch (error) {
            console.warn('[CacheInvalidation] Could not check couple status:', error);
        }

        // 3. If in a room, invalidate room cache
        if (roomId) {
            recommendationsService.invalidateRoomCache(roomId);
            console.log('[CacheInvalidation] ✅ Room cache invalidated');
        }

        // 4. BONUS: Refresh taste profile for important swipes (love/like/nope)
        if (['love', 'like', 'nope'].includes(action)) {
            // Fire and forget - don't wait for this
            tasteProfileService.analyzeTasteProfile(userId, true)
                .then(() => console.log('[CacheInvalidation] ✅ Taste profile refreshed'))
                .catch(err => console.warn('[CacheInvalidation] Taste profile refresh failed:', err));
        }

        console.log('[CacheInvalidation] ✅ All caches invalidated successfully');

    } catch (error) {
        console.error('[CacheInvalidation] ❌ Error invalidating caches:', error);
        // Don't throw - cache invalidation failure shouldn't block swipes
    }
}

/**
 * Invalidate caches when user links/unlinks as couple
 */
export function invalidateCachesForCouple(coupleId) {
    console.log('[CacheInvalidation] 🔄 Invalidating couple caches:', coupleId);
    recommendationsService.invalidateCoupleCache(coupleId);
}

/**
 * Invalidate caches when room gets a new swipe
 */
export function invalidateCachesForRoom(roomId) {
    console.log('[CacheInvalidation] 🔄 Invalidating room caches:', roomId);
    recommendationsService.invalidateRoomCache(roomId);
}

/**
 * Force refresh of taste profile (call sparingly)
 */
export async function forceRefreshTasteProfile(userId) {
    console.log('[CacheInvalidation] 🔄 Force refreshing taste profile:', userId);
    try {
        await tasteProfileService.analyzeTasteProfile(userId, true);
        console.log('[CacheInvalidation] ✅ Taste profile force refreshed');
    } catch (error) {
        console.error('[CacheInvalidation] ❌ Error refreshing taste profile:', error);
    }
}
