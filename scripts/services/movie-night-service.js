/**
 * Movie Night Service
 * Manages group movie matching sessions
 * Features:
 * - Create/join movie nights
 * - Real-time presence tracking
 * - Automatic match calculation
 * - Voting system
 * - Match notifications
 */

import { db } from '../config/firebase-config.js';
import { 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy,
    onSnapshot,
    serverTimestamp,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import { authService } from './auth-service.js';
import { notify } from '../utils/notifications.js';

class MovieNightService {
    constructor() {
        this.currentNightId = null;
        this.listeners = new Map();
    }

    /**
     * Generate unique movie night ID
     */
    generateNightId() {
        return 'night_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Create a new movie night
     */
    async createMovieNight(name, creatorId, memberIds = []) {
        try {
            const nightId = this.generateNightId();
            const members = [creatorId, ...memberIds.filter(id => id !== creatorId)];
            
            const movieNight = {
                id: nightId,
                name: name,
                createdBy: creatorId,
                members: members,
                status: 'active',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                matches: [],
                finalPick: null,
                votes: {}
            };

            await setDoc(doc(db, 'movieNights', nightId), movieNight);
            
            console.log('[MovieNight] Created:', nightId);
            notify.success(`Movie night "${name}" created!`);
            
            return { success: true, nightId, movieNight };
        } catch (error) {
            console.error('[MovieNight] Create failed:', error);
            notify.error('Failed to create movie night');
            return { success: false, error };
        }
    }

    /**
     * Join an existing movie night
     */
    async joinMovieNight(nightId, userId) {
        try {
            const nightRef = doc(db, 'movieNights', nightId);
            const nightDoc = await getDoc(nightRef);
            
            if (!nightDoc.exists()) {
                throw new Error('Movie night not found');
            }

            await updateDoc(nightRef, {
                members: arrayUnion(userId),
                updatedAt: serverTimestamp()
            });

            console.log('[MovieNight] Joined:', nightId);
            notify.success('Joined movie night!');
            
            return { success: true, nightId };
        } catch (error) {
            console.error('[MovieNight] Join failed:', error);
            notify.error('Failed to join movie night');
            return { success: false, error };
        }
    }

    /**
     * Get movie night details
     */
    async getMovieNight(nightId) {
        try {
            const nightDoc = await getDoc(doc(db, 'movieNights', nightId));
            
            if (!nightDoc.exists()) {
                return null;
            }

            return { id: nightDoc.id, ...nightDoc.data() };
        } catch (error) {
            console.error('[MovieNight] Get failed:', error);
            return null;
        }
    }

    /**
     * Get all movie nights for a user
     */
    async getUserMovieNights(userId) {
        try {
            const q = query(
                collection(db, 'movieNights'),
                where('members', 'array-contains', userId),
                orderBy('updatedAt', 'desc')
            );

            const snapshot = await getDocs(q);
            const nights = [];

            snapshot.forEach(doc => {
                nights.push({ id: doc.id, ...doc.data() });
            });

            return nights;
        } catch (error) {
            console.error('[MovieNight] Get user nights failed:', error);
            return [];
        }
    }

    /**
     * Record a swipe for a movie night
     */
    async recordSwipe(nightId, userId, movieId, action, movieData) {
        try {
            const swipeRef = doc(db, 'movieNightSwipes', nightId);
            const swipeDoc = await getDoc(swipeRef);

            let swipes = {};
            if (swipeDoc.exists()) {
                swipes = swipeDoc.data();
            }

            if (!swipes[userId]) {
                swipes[userId] = {
                    swipes: [],
                    lastActive: serverTimestamp()
                };
            }

            // Update swipes
            swipes[userId].swipes.push({
                movieId: movieId,
                action: action,
                movie: movieData,
                timestamp: Date.now()
            });
            swipes[userId].lastActive = serverTimestamp();

            await setDoc(swipeRef, swipes);

            // Update movie night updatedAt
            await updateDoc(doc(db, 'movieNights', nightId), {
                updatedAt: serverTimestamp()
            });

            // Recalculate matches
            await this.calculateMatches(nightId);

            return { success: true };
        } catch (error) {
            console.error('[MovieNight] Record swipe failed:', error);
            return { success: false, error };
        }
    }

    /**
     * Get swipes for a movie night
     */
    async getSwipes(nightId) {
        try {
            const swipeDoc = await getDoc(doc(db, 'movieNightSwipes', nightId));
            
            if (!swipeDoc.exists()) {
                return {};
            }

            return swipeDoc.data();
        } catch (error) {
            console.error('[MovieNight] Get swipes failed:', error);
            return {};
        }
    }

    /**
     * Calculate matches for a movie night
     */
    async calculateMatches(nightId) {
        try {
            const night = await this.getMovieNight(nightId);
            if (!night) return;

            const swipes = await this.getSwipes(nightId);
            const members = night.members;

            // Group swipes by movie
            const movieSwipes = new Map();

            members.forEach(userId => {
                const userSwipes = swipes[userId]?.swipes || [];
                
                userSwipes.forEach(swipe => {
                    if (!movieSwipes.has(swipe.movieId)) {
                        movieSwipes.set(swipe.movieId, {
                            movieId: swipe.movieId,
                            movie: swipe.movie,
                            users: new Set(),
                            actions: {},
                            loves: 0,
                            likes: 0
                        });
                    }

                    const movieData = movieSwipes.get(swipe.movieId);
                    movieData.users.add(userId);
                    movieData.actions[userId] = swipe.action;
                    
                    if (swipe.action === 'love') movieData.loves++;
                    if (swipe.action === 'like') movieData.likes++;
                });
            });

            // Find matches (2+ people liked/loved)
            const matches = [];

            movieSwipes.forEach((data, movieId) => {
                if (data.users.size >= 2) {
                    // Calculate match score
                    const totalUsers = members.length;
                    const matchedUsers = data.users.size;
                    const matchScore = (matchedUsers / totalUsers) * 100;
                    
                    matches.push({
                        movieId: movieId,
                        movie: data.movie,
                        users: Array.from(data.users),
                        actions: data.actions,
                        matchScore: Math.round(matchScore),
                        loves: data.loves,
                        likes: data.likes,
                        totalReactions: matchedUsers,
                        isPerfect: matchedUsers === totalUsers
                    });
                }
            });

            // Sort by match score (perfect matches first, then by score)
            matches.sort((a, b) => {
                if (a.isPerfect && !b.isPerfect) return -1;
                if (!a.isPerfect && b.isPerfect) return 1;
                return b.matchScore - a.matchScore;
            });

            // Update movie night with matches
            await updateDoc(doc(db, 'movieNights', nightId), {
                matches: matches,
                updatedAt: serverTimestamp()
            });

            console.log(`[MovieNight] Calculated ${matches.length} matches for ${nightId}`);

            return matches;
        } catch (error) {
            console.error('[MovieNight] Calculate matches failed:', error);
            return [];
        }
    }

    /**
     * Vote on a movie
     */
    async voteOnMovie(nightId, userId, movieId) {
        try {
            const nightRef = doc(db, 'movieNights', nightId);
            const nightDoc = await getDoc(nightRef);
            
            if (!nightDoc.exists()) {
                throw new Error('Movie night not found');
            }

            const votes = nightDoc.data().votes || {};
            votes[userId] = movieId;

            await updateDoc(nightRef, {
                votes: votes,
                updatedAt: serverTimestamp()
            });

            console.log('[MovieNight] Vote recorded:', userId, movieId);
            
            return { success: true };
        } catch (error) {
            console.error('[MovieNight] Vote failed:', error);
            return { success: false, error };
        }
    }

    /**
     * Set final pick for movie night
     */
    async setFinalPick(nightId, movieId, movieData) {
        try {
            await updateDoc(doc(db, 'movieNights', nightId), {
                finalPick: {
                    movieId: movieId,
                    movie: movieData,
                    pickedAt: serverTimestamp()
                },
                status: 'completed',
                updatedAt: serverTimestamp()
            });

            console.log('[MovieNight] Final pick set:', movieId);
            notify.success('Movie selected! Enjoy the show! 🎬');
            
            return { success: true };
        } catch (error) {
            console.error('[MovieNight] Set final pick failed:', error);
            return { success: false, error };
        }
    }

    /**
     * Listen to movie night changes (real-time)
     */
    listenToMovieNight(nightId, callback) {
        if (this.listeners.has(nightId)) {
            console.log('[MovieNight] Already listening to', nightId);
            return;
        }

        const unsubscribe = onSnapshot(
            doc(db, 'movieNights', nightId),
            (doc) => {
                if (doc.exists()) {
                    callback({ id: doc.id, ...doc.data() });
                }
            },
            (error) => {
                console.error('[MovieNight] Listen failed:', error);
            }
        );

        this.listeners.set(nightId, unsubscribe);
        console.log('[MovieNight] Listening to', nightId);
    }

    /**
     * Listen to swipes changes (real-time)
     */
    listenToSwipes(nightId, callback) {
        const swipesKey = `${nightId}_swipes`;
        
        if (this.listeners.has(swipesKey)) {
            console.log('[MovieNight] Already listening to swipes', nightId);
            return;
        }

        const unsubscribe = onSnapshot(
            doc(db, 'movieNightSwipes', nightId),
            (doc) => {
                if (doc.exists()) {
                    callback(doc.data());
                } else {
                    callback({});
                }
            },
            (error) => {
                console.error('[MovieNight] Listen to swipes failed:', error);
            }
        );

        this.listeners.set(swipesKey, unsubscribe);
        console.log('[MovieNight] Listening to swipes', nightId);
    }

    /**
     * Stop listening to a movie night
     */
    stopListening(nightId) {
        if (this.listeners.has(nightId)) {
            this.listeners.get(nightId)();
            this.listeners.delete(nightId);
            console.log('[MovieNight] Stopped listening to', nightId);
        }

        const swipesKey = `${nightId}_swipes`;
        if (this.listeners.has(swipesKey)) {
            this.listeners.get(swipesKey)();
            this.listeners.delete(swipesKey);
            console.log('[MovieNight] Stopped listening to swipes', nightId);
        }
    }

    /**
     * Stop all listeners
     */
    stopAllListeners() {
        this.listeners.forEach((unsubscribe) => {
            unsubscribe();
        });
        this.listeners.clear();
        console.log('[MovieNight] Stopped all listeners');
    }

    /**
     * Generate shareable link
     */
    generateShareLink(nightId) {
        return `${window.location.origin}/join/${nightId}`;
    }

    /**
     * Calculate taste compatibility between users
     */
    async calculateCompatibility(userId1, userId2) {
        try {
            // Get both users' swipe histories
            const user1Swipes = await authService.getSwipeHistory(userId1);
            const user2Swipes = await authService.getSwipeHistory(userId2);

            if (!user1Swipes || !user2Swipes) {
                return 0;
            }

            // Find common movies
            const user1Movies = new Map(user1Swipes.map(s => [s.movieId, s.action]));
            const user2Movies = new Map(user2Swipes.map(s => [s.movieId, s.action]));

            let matches = 0;
            let total = 0;

            user1Movies.forEach((action1, movieId) => {
                if (user2Movies.has(movieId)) {
                    total++;
                    const action2 = user2Movies.get(movieId);
                    
                    // Same action = perfect match
                    if (action1 === action2) {
                        matches += 1;
                    }
                    // Both positive = partial match
                    else if ((action1 === 'love' || action1 === 'like') && 
                             (action2 === 'love' || action2 === 'like')) {
                        matches += 0.5;
                    }
                }
            });

            const compatibility = total > 0 ? Math.round((matches / total) * 100) : 0;
            
            return compatibility;
        } catch (error) {
            console.error('[MovieNight] Calculate compatibility failed:', error);
            return 0;
        }
    }

    /**
     * Delete movie night
     */
    async deleteMovieNight(nightId) {
        try {
            await deleteDoc(doc(db, 'movieNights', nightId));
            await deleteDoc(doc(db, 'movieNightSwipes', nightId));
            
            this.stopListening(nightId);
            
            console.log('[MovieNight] Deleted:', nightId);
            notify.success('Movie night deleted');
            
            return { success: true };
        } catch (error) {
            console.error('[MovieNight] Delete failed:', error);
            notify.error('Failed to delete movie night');
            return { success: false, error };
        }
    }
}

export const movieNightService = new MovieNightService();
