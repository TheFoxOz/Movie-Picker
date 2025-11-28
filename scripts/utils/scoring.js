/**
 * Scoring Utilities
 * Calculate match percentages and rankings
 */

// Swipe action score values
export const SWIPE_SCORES = {
    love: 4,
    like: 3,
    maybe: 1,
    pass: 0
};

/**
 * Calculate match data for a group/couple
 * @param {Object} match - Match object with swipes and metadata
 * @returns {Object} Calculated match data
 */
export function calculateMatchData(match) {
    const maxPossibleScore = match.totalMembers * SWIPE_SCORES.love;
    let actualScore = 0;
    let loveCount = 0;
    let likeCount = 0;
    let maybeCount = 0;
    let passCount = 0;
    
    // Calculate actual score and counts
    match.swipes.forEach(swipe => {
        const score = SWIPE_SCORES[swipe.action] || 0;
        actualScore += score;
        
        switch (swipe.action) {
            case 'love': loveCount++; break;
            case 'like': likeCount++; break;
            case 'maybe': maybeCount++; break;
            case 'pass': passCount++; break;
        }
    });
    
    // Calculate match percentage
    const matchPercentage = maxPossibleScore > 0 
        ? Math.round((actualScore / maxPossibleScore) * 100) 
        : 0;
    
    // Determine match quality
    const matchQuality = getMatchQuality(matchPercentage);
    
    return {
        matchPercentage,
        actualScore,
        maxPossibleScore,
        loveCount,
        likeCount,
        maybeCount,
        passCount,
        matchQuality,
        isPerfectMatch: matchPercentage === 100,
        isStrongMatch: matchPercentage >= 75,
        isGoodMatch: matchPercentage >= 50,
    };
}

/**
 * Get match quality description
 * @param {Number} percentage - Match percentage
 * @returns {String} Quality description
 */
export function getMatchQuality(percentage) {
    if (percentage === 100) return 'Perfect Match! 🎉';
    if (percentage >= 75) return 'Strong Match';
    if (percentage >= 50) return 'Good Match';
    if (percentage >= 25) return 'Okay Match';
    return 'Weak Match';
}

/**
 * Sort matches by score (descending)
 * @param {Array} matches - Array of match objects
 * @returns {Array} Sorted matches with calculated data
 */
export function sortMatchesByScore(matches) {
    return matches
        .map(match => ({
            ...match,
            ...calculateMatchData(match)
        }))
        .sort((a, b) => b.matchPercentage - a.matchPercentage);
}

/**
 * Get color for match percentage
 * @param {Number} percentage - Match percentage
 * @returns {String} CSS color variable
 */
export function getMatchColor(percentage) {
    if (percentage === 100) return 'var(--love-glow)';
    if (percentage >= 75) return 'var(--like-glow)';
    if (percentage >= 50) return 'var(--maybe-glow)';
    return 'var(--nope-glow)';
}

/**
 * Get platform icon and color
 * @param {String} platform - Platform name
 * @returns {Object} Icon and color properties
 */
export function getPlatformStyle(platform) {
    const platformMap = {
        'Netflix': { icon: 'N', color: '#E50914', textColor: 'white' },
        'Prime Video': { icon: 'P', color: '#00A8E1', textColor: 'white' },
        'Hulu': { icon: 'H', color: '#1CE783', textColor: 'black' },
        'Max (HBO)': { icon: 'M', color: '#0060FF', textColor: 'white' },
        'Disney+': { icon: 'D', color: '#113CCF', textColor: 'white' },
        'Apple TV+': { icon: 'A', color: '#000000', textColor: 'white' },
    };
    
    return platformMap[platform] || { 
        icon: '?', 
        color: '#6b7280', 
        textColor: 'white' 
    };
}

/**
 * Calculate recommendation score for a movie
 * @param {Object} movie - Movie data
 * @param {Object} userPreferences - User preferences
 * @returns {Number} Recommendation score (0-100)
 */
export function calculateRecommendationScore(movie, userPreferences) {
    let score = 50; // Base score
    
    // Genre match
    if (userPreferences.favoriteGenres?.includes(movie.genre)) {
        score += 20;
    }
    
    // Actor match
    const hasPreferredActor = movie.actors?.some(actor => 
        userPreferences.favoriteActors?.includes(actor)
    );
    if (hasPreferredActor) {
        score += 15;
    }
    
    // Rating preference
    if (movie.imdb >= 7.5) {
        score += 10;
    }
    
    // Platform availability
    if (userPreferences.connectedPlatforms?.includes(movie.platform)) {
        score += 5;
    }
    
    return Math.min(100, Math.max(0, score));
}

/**
 * Find best watch time for a group
 * @param {Array} availabilities - Member availabilities
 * @param {Number} movieRuntime - Movie runtime in minutes
 * @returns {Object} Best time slot
 */
export function findBestWatchTime(availabilities, movieRuntime) {
    // Simple implementation - find overlapping time slots
    // In a real app, this would be more sophisticated
    
    const overlaps = [];
    
    // Mock implementation
    const today = new Date();
    const tonight = new Date(today);
    tonight.setHours(20, 0, 0, 0);
    
    overlaps.push({
        startTime: tonight,
        endTime: new Date(tonight.getTime() + (movieRuntime + 30) * 60000),
        availableMembers: availabilities.length,
        confidence: 85
    });
    
    return {
        bestTime: overlaps[0],
        alternativeTimes: overlaps.slice(1, 4),
        allAvailable: overlaps[0]?.availableMembers === availabilities.length
    };
}

/**
 * Calculate consensus level
 * @param {Array} swipes - Array of swipe actions
 * @returns {Object} Consensus data
 */
export function calculateConsensus(swipes) {
    const total = swipes.length;
    const loveCount = swipes.filter(s => s.action === 'love').length;
    const likeCount = swipes.filter(s => s.action === 'like').length;
    const positiveCount = loveCount + likeCount;
    
    const consensusPercentage = Math.round((positiveCount / total) * 100);
    
    return {
        consensusPercentage,
        isUnanimous: consensusPercentage === 100,
        isStrong: consensusPercentage >= 75,
        message: getConsensusMessage(consensusPercentage)
    };
}

/**
 * Get consensus message
 * @param {Number} percentage - Consensus percentage
 * @returns {String} Message
 */
function getConsensusMessage(percentage) {
    if (percentage === 100) return 'Everyone loves this!';
    if (percentage >= 75) return 'Strong group consensus';
    if (percentage >= 50) return 'Mixed opinions';
    return 'Divergent preferences';
}

/**
 * Get action emoji
 * @param {String} action - Swipe action
 * @returns {String} Emoji
 */
export function getActionEmoji(action) {
    const emojiMap = {
        love: '💖',
        like: '👍',
        maybe: '🤔',
        pass: '👎'
    };
    return emojiMap[action] || '❓';
}

/**
 * Format runtime
 * @param {Number|String} runtime - Runtime in minutes or formatted string
 * @returns {String} Formatted runtime
 */
export function formatRuntime(runtime) {
    if (typeof runtime === 'string') return runtime;
    
    const hours = Math.floor(runtime / 60);
    const minutes = runtime % 60;
    
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
}
