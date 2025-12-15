/**
 * Movie Scoring & Matching System
 * ✅ FIXED: Changed ENV.APP.debug to ENV.DEBUG_MODE
 */

import { ENV } from '../config/env.js';

/**
 * Calculate intelligent score for a movie
 */
export function calculateIntelligentScore(movie, userPreferences = null, userSwipeHistory = null) {
    let score = 0;
    
    // 1. Base score from rating (0-100 points)
    const rating = parseFloat(movie.vote_average || movie.imdb || 0);
    score += rating * 10;
    
    // 2. Popularity bonus (0-50 points)
    const voteCount = parseInt(movie.vote_count || 0);
    if (voteCount > 5000) score += 50;
    else if (voteCount > 2000) score += 35;
    else if (voteCount > 1000) score += 20;
    else if (voteCount > 500) score += 10;
    
    // 3. Recency bonus (0-30 points)
    const year = parseInt(movie.year || movie.release_date?.substring(0, 4) || 0);
    const currentYear = new Date().getFullYear();
    const yearDiff = currentYear - year;
    
    if (yearDiff <= 1) score += 30;
    else if (yearDiff <= 3) score += 20;
    else if (yearDiff <= 5) score += 10;
    
    // 4. User preference match (0-30 points)
    if (userPreferences && userSwipeHistory) {
        const preferenceScore = calculateUserPreferenceMatch(movie, userPreferences, userSwipeHistory);
        score += preferenceScore;
        
        // ✅ FIX: Changed from ENV.APP.debug to ENV.DEBUG_MODE
        if (ENV.DEBUG_MODE) {
            console.log('[Scoring] Preference match for', movie.title, ':', preferenceScore);
        }
    }
    
    // 5. Platform availability (0-15 points)
    if (userPreferences?.platforms?.length > 0) {
        if (userPreferences.platforms.includes(movie.platform)) {
            score += 15;
            
            // ✅ FIX: Changed from ENV.APP.debug to ENV.DEBUG_MODE
            if (ENV.DEBUG_MODE) {
                console.log('[Scoring] Platform match for', movie.title);
            }
        }
    }
    
    // ✅ FIX: Changed from ENV.APP.debug to ENV.DEBUG_MODE
    if (ENV.DEBUG_MODE) {
        console.log('[Scoring] Total score for', movie.title, ':', Math.round(score));
    }
    
    return Math.round(score);
}

/**
 * Calculate user preference match
 */
function calculateUserPreferenceMatch(movie, userPreferences, userSwipeHistory) {
    let score = 0;
    
    const lovedMovies = userSwipeHistory
        .filter(entry => entry.action === 'love')
        .map(entry => entry.movie);
    
    if (lovedMovies.length === 0) return 0;
    
    // Check genre match
    const lovedGenres = lovedMovies.map(m => m.genre).filter(Boolean);
    if (lovedGenres.includes(movie.genre)) {
        score += 15;
    }
    
    // Check year range match
    const lovedYears = lovedMovies.map(m => parseInt(m.year || 0)).filter(y => y > 0);
    const movieYear = parseInt(movie.year || 0);
    if (movieYear > 0 && lovedYears.length > 0) {
        const avgYear = lovedYears.reduce((a, b) => a + b, 0) / lovedYears.length;
        const yearDiff = Math.abs(movieYear - avgYear);
        if (yearDiff <= 5) score += 10;
        else if (yearDiff <= 10) score += 5;
    }
    
    // Check rating range match
    const lovedRatings = lovedMovies.map(m => parseFloat(m.imdb || 0)).filter(r => r > 0);
    const movieRating = parseFloat(movie.imdb || 0);
    if (movieRating > 0 && lovedRatings.length > 0) {
        const avgRating = lovedRatings.reduce((a, b) => a + b, 0) / lovedRatings.length;
        const ratingDiff = Math.abs(movieRating - avgRating);
        if (ratingDiff <= 1) score += 5;
    }
    
    return score;
}

/**
 * Calculate match score between two users
 */
export function calculateMatchScore(user1Swipes, user2Swipes) {
    const user1Movies = user1Swipes
        .filter(entry => ['love', 'like'].includes(entry.action))
        .map(entry => entry.movie.id);
    
    const user2Movies = user2Swipes
        .filter(entry => ['love', 'like'].includes(entry.action))
        .map(entry => entry.movie.id);
    
    const commonMovies = user1Movies.filter(id => user2Movies.includes(id));
    
    const totalMovies = new Set([...user1Movies, ...user2Movies]).size;
    const matchPercentage = totalMovies > 0 
        ? Math.round((commonMovies.length / totalMovies) * 100)
        : 0;
    
    const commonMovieObjects = user1Swipes
        .filter(entry => commonMovies.includes(entry.movie.id))
        .map(entry => entry.movie);
    
    // ✅ FIX: Changed from ENV.APP.debug to ENV.DEBUG_MODE
    if (ENV.DEBUG_MODE) {
        console.log('[Scoring] Match score:', matchPercentage, '% with', commonMovies.length, 'common movies');
    }
    
    return {
        score: matchPercentage,
        commonMovies: commonMovieObjects,
        commonCount: commonMovies.length,
        isPerfectMatch: matchPercentage >= 80
    };
}

/**
 * Calculate group compatibility score
 */
export function calculateGroupScore(groupMembers) {
    if (groupMembers.length === 0) {
        return { score: 0, commonMovies: [], isPerfectMatch: false };
    }
    
    const memberMovieSets = groupMembers.map(member => 
        new Set(
            (member.swipeHistory || [])
                .filter(entry => ['love', 'like'].includes(entry.action))
                .map(entry => entry.movie.id)
        )
    );
    
    const intersection = [...memberMovieSets[0]].filter(movieId =>
        memberMovieSets.every(set => set.has(movieId))
    );
    
    const avgLibrarySize = memberMovieSets.reduce((sum, set) => sum + set.size, 0) / memberMovieSets.length;
    
    const groupScore = avgLibrarySize > 0
        ? Math.round((intersection.length / avgLibrarySize) * 100)
        : 0;
    
    const allSwipes = groupMembers.flatMap(m => m.swipeHistory || []);
    const commonMovieObjects = intersection.map(id => 
        allSwipes.find(entry => entry.movie.id === id)?.movie
    ).filter(Boolean);
    
    // ✅ FIX: Changed from ENV.APP.debug to ENV.DEBUG_MODE
    if (ENV.DEBUG_MODE) {
        console.log('[Scoring] Group score:', groupScore, '% with', intersection.length, 'common movies');
    }
    
    return {
        score: groupScore,
        commonMovies: commonMovieObjects,
        commonCount: intersection.length,
        isPerfectMatch: groupScore >= 70 && intersection.length >= 3
    };
}

/**
 * Get recommended movies based on user preferences
 */
export function getRecommendedMovies(allMovies, userSwipeHistory, userPreferences, limit = 10) {
    const swipedIds = new Set(userSwipeHistory.map(entry => entry.movie.id));
    const unswipedMovies = allMovies.filter(movie => !swipedIds.has(movie.id));
    
    const scoredMovies = unswipedMovies.map(movie => ({
        ...movie,
        recommendationScore: calculateIntelligentScore(movie, userPreferences, userSwipeHistory)
    }));
    
    const recommendations = scoredMovies
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, limit);
    
    // ✅ FIX: Changed from ENV.APP.debug to ENV.DEBUG_MODE
    if (ENV.DEBUG_MODE) {
        console.log('[Scoring] Generated', recommendations.length, 'recommendations');
    }
    
    return recommendations;
}

/**
 * Get platform icon and color
 */
export function getPlatformStyle(platform) {
    const styles = {
        'Netflix': { icon: 'N', color: '#E50914' },
        'Hulu': { icon: 'H', color: '#1CE783' },
        'Prime Video': { icon: 'P', color: '#00A8E1' },
        'Disney+': { icon: 'D', color: '#113CCF' },
        'HBO Max': { icon: 'M', color: '#B200FF' },
        'Apple TV+': { icon: 'A', color: '#000000' }
    };
    
    return styles[platform] || { icon: '▶', color: '#6366f1' };
}
