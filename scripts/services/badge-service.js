/**
 * Badge Service - Achievement System
 * 🏆 Track user achievements and unlock badges
 * 🎯 Categories: Explorer, Social, Watcher, Special
 * 📊 Progress tracking and notifications
 */

import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// Badge definitions
const BADGES = {
    // 🎬 EXPLORER BADGES (Swiping)
    first_swipe: {
        id: 'first_swipe',
        category: 'explorer',
        name: 'First Swipe',
        description: 'Swipe on your first movie',
        icon: '🎬',
        requirement: { type: 'swipes', count: 1 },
        tier: 'bronze',
        points: 10
    },
    movie_buff: {
        id: 'movie_buff',
        category: 'explorer',
        name: 'Movie Buff',
        description: 'Swipe on 100 movies',
        icon: '🍿',
        requirement: { type: 'swipes', count: 100 },
        tier: 'silver',
        points: 50
    },
    cinema_addict: {
        id: 'cinema_addict',
        category: 'explorer',
        name: 'Cinema Addict',
        description: 'Swipe on 500 movies',
        icon: '🎥',
        requirement: { type: 'swipes', count: 500 },
        tier: 'gold',
        points: 200
    },
    swipe_master: {
        id: 'swipe_master',
        category: 'explorer',
        name: 'Swipe Master',
        description: 'Swipe on 1000 movies',
        icon: '👑',
        requirement: { type: 'swipes', count: 1000 },
        tier: 'platinum',
        points: 500
    },
    genre_explorer: {
        id: 'genre_explorer',
        category: 'explorer',
        name: 'Genre Explorer',
        description: 'Swipe movies in 10+ genres',
        icon: '🎭',
        requirement: { type: 'genres', count: 10 },
        tier: 'silver',
        points: 75
    },

    // 👥 SOCIAL BADGES (Friends & Matches)
    friend_zone: {
        id: 'friend_zone',
        category: 'social',
        name: 'Friend Zone',
        description: 'Add your first friend',
        icon: '👋',
        requirement: { type: 'friends', count: 1 },
        tier: 'bronze',
        points: 10
    },
    social_butterfly: {
        id: 'social_butterfly',
        category: 'social',
        name: 'Social Butterfly',
        description: 'Add 5 friends',
        icon: '🦋',
        requirement: { type: 'friends', count: 5 },
        tier: 'silver',
        points: 50
    },
    squad_goals: {
        id: 'squad_goals',
        category: 'social',
        name: 'Squad Goals',
        description: 'Add 10 friends',
        icon: '👥',
        requirement: { type: 'friends', count: 10 },
        tier: 'gold',
        points: 150
    },
    perfect_match: {
        id: 'perfect_match',
        category: 'social',
        name: 'Perfect Match',
        description: 'Find your first match with a friend',
        icon: '💫',
        requirement: { type: 'matches', count: 1 },
        tier: 'bronze',
        points: 15
    },
    match_maker: {
        id: 'match_maker',
        category: 'social',
        name: 'Match Maker',
        description: 'Find 50 matches',
        icon: '🎯',
        requirement: { type: 'matches', count: 50 },
        tier: 'gold',
        points: 200
    },

    // 🎥 WATCHER BADGES (Watched Movies)
    premiere_night: {
        id: 'premiere_night',
        category: 'watcher',
        name: 'Premiere Night',
        description: 'Mark your first movie as watched',
        icon: '🎫',
        requirement: { type: 'watched', count: 1 },
        tier: 'bronze',
        points: 10
    },
    weekend_warrior: {
        id: 'weekend_warrior',
        category: 'watcher',
        name: 'Weekend Warrior',
        description: 'Watch 10 movies',
        icon: '📽️',
        requirement: { type: 'watched', count: 10 },
        tier: 'silver',
        points: 50
    },
    marathon_runner: {
        id: 'marathon_runner',
        category: 'watcher',
        name: 'Marathon Runner',
        description: 'Watch 50 movies',
        icon: '🏃',
        requirement: { type: 'watched', count: 50 },
        tier: 'gold',
        points: 150
    },
    film_festival: {
        id: 'film_festival',
        category: 'watcher',
        name: 'Film Festival',
        description: 'Watch 100 movies',
        icon: '🎪',
        requirement: { type: 'watched', count: 100 },
        tier: 'platinum',
        points: 400
    },

    // 🌟 SPECIAL BADGES
    early_adopter: {
        id: 'early_adopter',
        category: 'special',
        name: 'Early Adopter',
        description: 'Joined MoviEase in its first year',
        icon: '🌟',
        requirement: { type: 'special', check: 'early_user' },
        tier: 'gold',
        points: 100
    },
    triple_threat: {
        id: 'triple_threat',
        category: 'special',
        name: 'Triple Threat',
        description: 'Love 3 movies in a row',
        icon: '❤️',
        requirement: { type: 'special', check: 'triple_love' },
        tier: 'silver',
        points: 50
    },
    night_owl: {
        id: 'night_owl',
        category: 'special',
        name: 'Night Owl',
        description: 'Swipe after midnight',
        icon: '🦉',
        requirement: { type: 'special', check: 'midnight_swipe' },
        tier: 'bronze',
        points: 25
    },
    binge_lord: {
        id: 'binge_lord',
        category: 'special',
        name: 'Binge Lord',
        description: 'Swipe on 50 movies in one day',
        icon: '⚡',
        requirement: { type: 'special', check: 'binge_day' },
        tier: 'gold',
        points: 150
    },
    wheel_spinner: {
        id: 'wheel_spinner',
        category: 'special',
        name: 'Lucky Spinner',
        description: 'Use the movie wheel 10 times',
        icon: '🎡',
        requirement: { type: 'wheel_spins', count: 10 },
        tier: 'silver',
        points: 50
    }
};

class BadgeService {
    constructor() {
        this.badgeCache = null;
        this.listeners = [];
    }

    /**
     * Get all badge definitions
     */
    getAllBadges() {
        return Object.values(BADGES);
    }

    /**
     * Get badges by category
     */
    getBadgesByCategory(category) {
        return Object.values(BADGES).filter(badge => badge.category === category);
    }

    /**
     * Initialize user badges document
     */
    async initializeUserBadges(userId) {
        try {
            const badgesRef = doc(db, 'users', userId, 'achievements', 'badges');
            const badgesDoc = await getDoc(badgesRef);

            if (!badgesDoc.exists()) {
                const initialData = {
                    unlockedBadges: [],
                    progress: {},
                    stats: {
                        totalSwipes: 0,
                        totalFriends: 0,
                        totalMatches: 0,
                        totalWatched: 0,
                        genresExplored: [],
                        wheelSpins: 0,
                        lastSwipeDate: null,
                        consecutiveLoves: 0,
                        createdAt: new Date().toISOString()
                    },
                    points: 0,
                    lastUpdated: new Date().toISOString()
                };

                await setDoc(badgesRef, initialData);
                console.log('[BadgeService] Initialized badges for user:', userId);
                return initialData;
            }

            return badgesDoc.data();
        } catch (error) {
            console.error('[BadgeService] Init error:', error);
            return null;
        }
    }

    /**
     * Get user's badge progress
     */
    async getUserBadges(userId) {
        try {
            const badgesRef = doc(db, 'users', userId, 'achievements', 'badges');
            const badgesDoc = await getDoc(badgesRef);

            if (!badgesDoc.exists()) {
                return await this.initializeUserBadges(userId);
            }

            return badgesDoc.data();
        } catch (error) {
            console.error('[BadgeService] Get badges error:', error);
            return null;
        }
    }

    /**
     * Check and unlock badges based on activity
     */
    async checkBadges(userId, activity) {
        try {
            const badgesData = await this.getUserBadges(userId);
            if (!badgesData) return [];

            const newlyUnlocked = [];
            const updates = {};

            // Update stats based on activity
            if (activity.type === 'swipe') {
                updates['stats.totalSwipes'] = (badgesData.stats.totalSwipes || 0) + 1;
                updates['stats.lastSwipeDate'] = new Date().toISOString();

                // Track genres
                if (activity.genres) {
                    const genres = new Set(badgesData.stats.genresExplored || []);
                    activity.genres.forEach(g => genres.add(g));
                    updates['stats.genresExplored'] = Array.from(genres);
                }

                // Track consecutive loves
                if (activity.action === 'love') {
                    updates['stats.consecutiveLoves'] = (badgesData.stats.consecutiveLoves || 0) + 1;
                } else {
                    updates['stats.consecutiveLoves'] = 0;
                }

                // Check midnight swipe
                const hour = new Date().getHours();
                if (hour >= 0 && hour < 3) {
                    updates['stats.midnightSwipe'] = true;
                }
            } else if (activity.type === 'friend') {
                updates['stats.totalFriends'] = (badgesData.stats.totalFriends || 0) + 1;
            } else if (activity.type === 'match') {
                updates['stats.totalMatches'] = (badgesData.stats.totalMatches || 0) + 1;
            } else if (activity.type === 'watched') {
                updates['stats.totalWatched'] = (badgesData.stats.totalWatched || 0) + 1;
            } else if (activity.type === 'wheel_spin') {
                updates['stats.wheelSpins'] = (badgesData.stats.wheelSpins || 0) + 1;
            }

            // Check each badge
            const currentStats = { ...badgesData.stats, ...updates };
            const unlockedIds = new Set(badgesData.unlockedBadges || []);

            for (const badge of Object.values(BADGES)) {
                if (unlockedIds.has(badge.id)) continue;

                if (this.checkBadgeRequirement(badge, currentStats)) {
                    unlockedIds.add(badge.id);
                    newlyUnlocked.push(badge);
                    console.log('[BadgeService] Badge unlocked:', badge.name);
                }
            }

            // Update Firestore
            if (Object.keys(updates).length > 0 || newlyUnlocked.length > 0) {
                const badgesRef = doc(db, 'users', userId, 'achievements', 'badges');
                
                if (newlyUnlocked.length > 0) {
                    updates.unlockedBadges = Array.from(unlockedIds);
                    updates.points = (badgesData.points || 0) + newlyUnlocked.reduce((sum, b) => sum + b.points, 0);
                }
                
                updates.lastUpdated = new Date().toISOString();

                await updateDoc(badgesRef, updates);
            }

            // Notify listeners
            if (newlyUnlocked.length > 0) {
                this.notifyListeners(newlyUnlocked);
            }

            return newlyUnlocked;

        } catch (error) {
            console.error('[BadgeService] Check badges error:', error);
            return [];
        }
    }

    /**
     * Check if badge requirement is met
     */
    checkBadgeRequirement(badge, stats) {
        const req = badge.requirement;

        switch (req.type) {
            case 'swipes':
                return stats.totalSwipes >= req.count;
            
            case 'friends':
                return stats.totalFriends >= req.count;
            
            case 'matches':
                return stats.totalMatches >= req.count;
            
            case 'watched':
                return stats.totalWatched >= req.count;
            
            case 'genres':
                return (stats.genresExplored || []).length >= req.count;
            
            case 'wheel_spins':
                return stats.wheelSpins >= req.count;
            
            case 'special':
                if (req.check === 'early_user') {
                    const created = new Date(stats.createdAt);
                    const cutoff = new Date('2025-12-31');
                    return created < cutoff;
                }
                if (req.check === 'triple_love') {
                    return stats.consecutiveLoves >= 3;
                }
                if (req.check === 'midnight_swipe') {
                    return stats.midnightSwipe === true;
                }
                if (req.check === 'binge_day') {
                    // Would need to track daily swipes
                    return false; // Implement if needed
                }
                return false;
            
            default:
                return false;
        }
    }

    /**
     * Get badge progress percentage
     */
    getBadgeProgress(badge, stats) {
        const req = badge.requirement;

        if (req.type === 'swipes') {
            return Math.min(100, (stats.totalSwipes / req.count) * 100);
        } else if (req.type === 'friends') {
            return Math.min(100, (stats.totalFriends / req.count) * 100);
        } else if (req.type === 'matches') {
            return Math.min(100, (stats.totalMatches / req.count) * 100);
        } else if (req.type === 'watched') {
            return Math.min(100, (stats.totalWatched / req.count) * 100);
        } else if (req.type === 'genres') {
            return Math.min(100, ((stats.genresExplored || []).length / req.count) * 100);
        } else if (req.type === 'wheel_spins') {
            return Math.min(100, (stats.wheelSpins / req.count) * 100);
        }

        return 0;
    }

    /**
     * Add listener for badge unlocks
     */
    addListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * Notify all listeners
     */
    notifyListeners(newBadges) {
        this.listeners.forEach(callback => {
            try {
                callback(newBadges);
            } catch (error) {
                console.error('[BadgeService] Listener error:', error);
            }
        });
    }

    /**
     * Get tier color
     */
    getTierColor(tier) {
        const colors = {
            bronze: '#cd7f32',
            silver: '#c0c0c0',
            gold: '#ffd700',
            platinum: '#e5e4e2'
        };
        return colors[tier] || '#A6C0DD';
    }

    /**
     * Get category emoji
     */
    getCategoryEmoji(category) {
        const emojis = {
            explorer: '🎬',
            social: '👥',
            watcher: '🎥',
            special: '🌟'
        };
        return emojis[category] || '🏆';
    }
}

const badgeService = new BadgeService();
export { badgeService, BadgeService, BADGES };
