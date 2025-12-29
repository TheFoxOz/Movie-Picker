/**
 * Couple Service
 * Manages couple linking and finds mutual movie matches
 * ✅ Link two users as a couple
 * ✅ Find mutual movie matches in real-time
 * ✅ Calculate compatibility score
 * ✅ Send couple invitations
 * ✅ Real-time sync between partners
 */

import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from './firebase-config.js';
import { authService } from './auth-service.js';
import { notify } from '../utils/notifications.js';

class CoupleService {
    constructor() {
        this.coupleListeners = new Map();
        this.currentCoupleId = null;
        
        // Action weights for compatibility scoring
        this.actionWeights = {
            'love': 5,
            'like': 3,
            'maybe': 1,
            'nope': 0
        };
    }

    /**
     * Send couple invitation via email
     * @param {string} partnerEmail - Partner's email address
     * @returns {Promise<Object>} Invitation result
     */
    async sendCoupleInvite(partnerEmail) {
        console.log('[Couple] Sending invite to:', partnerEmail);
        
        try {
            const currentUser = authService.getCurrentUser();
            if (!currentUser) {
                throw new Error('Not authenticated');
            }

            // SECURITY FIX #5: Prevent self-invite
            if (partnerEmail.toLowerCase() === currentUser.email?.toLowerCase()) {
                throw new Error("You can't invite yourself! 😅");
            }

            // Check if user is already in a couple
            const existingCouple = await this.getUserCouple(currentUser.uid);
            if (existingCouple) {
                throw new Error('Already in a couple. Unlink first.');
            }

            // Find partner by email
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', partnerEmail));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error('User not found. They need to create an account first.');
            }

            const partnerDoc = querySnapshot.docs[0];
            const partnerId = partnerDoc.id;
            const partnerData = partnerDoc.data();

            // Check if partner is already in a couple
            const partnerCouple = await this.getUserCouple(partnerId);
            if (partnerCouple) {
                throw new Error(`${partnerData.displayName} is already in a couple.`);
            }

            // Check if already sent invite to this person
            const existingInvite = await this.checkExistingInvite(currentUser.uid, partnerId);
            if (existingInvite) {
                throw new Error('Invitation already sent to this user.');
            }

            // Create invitation document
            const inviteId = `${currentUser.uid}_${partnerId}_${Date.now()}`;
            const inviteRef = doc(db, 'coupleInvites', inviteId);
            
            await setDoc(inviteRef, {
                from: currentUser.uid,
                fromName: currentUser.displayName || currentUser.email?.split('@')[0] || 'A user',
                fromEmail: currentUser.email,
                to: partnerId,
                toName: partnerData.displayName,
                toEmail: partnerEmail,
                status: 'pending',
                createdAt: Date.now(),
                expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
            });

            console.log('[Couple] ✅ Invitation sent');
            
            notify.success(`Invitation sent to ${partnerData.displayName}!`);

            return {
                success: true,
                inviteId,
                partnerName: partnerData.displayName
            };

        } catch (error) {
            console.error('[Couple] Error sending invite:', error);
            notify.error(error.message || 'Failed to send invitation');
            throw error;
        }
    }

    /**
     * Check for existing invite between two users
     */
    async checkExistingInvite(fromId, toId) {
        try {
            const invitesRef = collection(db, 'coupleInvites');
            const q = query(
                invitesRef,
                where('from', '==', fromId),
                where('to', '==', toId),
                where('status', '==', 'pending')
            );
            const snapshot = await getDocs(q);
            return !snapshot.empty;
        } catch (error) {
            console.error('[Couple] Error checking existing invite:', error);
            return false;
        }
    }

    /**
     * Get pending invitations for current user
     */
    async getPendingInvites(userId) {
        try {
            const invitesRef = collection(db, 'coupleInvites');
            const q = query(
                invitesRef,
                where('to', '==', userId),
                where('status', '==', 'pending')
            );
            
            const snapshot = await getDocs(q);
            const invites = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                // Check if not expired
                if (data.expiresAt > Date.now()) {
                    invites.push({
                        id: doc.id,
                        ...data
                    });
                }
            });

            return invites;

        } catch (error) {
            console.error('[Couple] Error getting invites:', error);
            return [];
        }
    }

    /**
     * Accept couple invitation and link accounts
     */
    async acceptInvite(inviteId) {
        console.log('[Couple] Accepting invite:', inviteId);

        try {
            const currentUser = authService.getCurrentUser();
            if (!currentUser) {
                throw new Error('Not authenticated');
            }

            // Get invite
            const inviteRef = doc(db, 'coupleInvites', inviteId);
            const inviteDoc = await getDoc(inviteRef);

            if (!inviteDoc.exists()) {
                throw new Error('Invitation not found');
            }

            const inviteData = inviteDoc.data();

            // Verify recipient
            if (inviteData.to !== currentUser.uid) {
                throw new Error('This invitation is not for you');
            }

            // Check expiration
            if (inviteData.expiresAt < Date.now()) {
                await deleteDoc(inviteRef);
                throw new Error('Invitation has expired');
            }

            // SECURITY FIX #2: Check if either user is already coupled (race condition prevention)
            const currentUserCouple = await this.getUserCouple(currentUser.uid);
            const partnerCouple = await this.getUserCouple(inviteData.from);

            if (currentUserCouple) {
                await updateDoc(inviteRef, { status: 'rejected' });
                throw new Error('You are already linked with someone. Unlink first.');
            }

            if (partnerCouple) {
                await updateDoc(inviteRef, { status: 'rejected' });
                throw new Error('Your partner is already linked with someone else.');
            }

            // Create couple
            const result = await this.linkCouple(inviteData.from, inviteData.to);

            // Mark invite as accepted
            await updateDoc(inviteRef, {
                status: 'accepted',
                acceptedAt: Date.now()
            });

            notify.success('Couple linked successfully! 💑');

            return result;

        } catch (error) {
            console.error('[Couple] Error accepting invite:', error);
            notify.error(error.message || 'Failed to accept invitation');
            throw error;
        }
    }

    /**
     * Decline couple invitation
     */
    async declineInvite(inviteId) {
        try {
            const inviteRef = doc(db, 'coupleInvites', inviteId);
            await updateDoc(inviteRef, {
                status: 'declined',
                declinedAt: Date.now()
            });
            
            notify.info('Invitation declined');
            
        } catch (error) {
            console.error('[Couple] Error declining invite:', error);
            throw error;
        }
    }

    /**
     * Link two users as a couple
     */
    async linkCouple(userId1, userId2) {
        console.log('[Couple] Linking couple:', userId1, userId2);

        try {
            // Create unique couple ID (alphabetically sorted for consistency)
            const coupleId = [userId1, userId2].sort().join('_');

            // Get both users' data
            const user1Doc = await getDoc(doc(db, 'users', userId1));
            const user2Doc = await getDoc(doc(db, 'users', userId2));

            if (!user1Doc.exists() || !user2Doc.exists()) {
                throw new Error('One or both users not found');
            }

            const user1Data = user1Doc.data();
            const user2Data = user2Doc.data();

            // Create couple document
            const coupleRef = doc(db, 'couples', coupleId);
            await setDoc(coupleRef, {
                users: [userId1, userId2],
                userNames: {
                    [userId1]: user1Data.displayName || 'User 1',
                    [userId2]: user2Data.displayName || 'User 2'
                },
                linkedAt: Date.now(),
                sharedMatches: [],
                compatibility: 0,
                notifications: true,
                lastMatchAt: null
            });

            // Update both users with couple reference
            await updateDoc(doc(db, 'users', userId1), {
                coupledWith: coupleId,
                coupleLinkedAt: Date.now()
            });

            await updateDoc(doc(db, 'users', userId2), {
                coupledWith: coupleId,
                coupleLinkedAt: Date.now()
            });

            // Calculate initial matches
            await this.findMatches(coupleId);

            console.log('[Couple] ✅ Couple linked successfully');

            return {
                coupleId,
                users: [userId1, userId2]
            };

        } catch (error) {
            console.error('[Couple] Error linking couple:', error);
            throw error;
        }
    }

    /**
     * Unlink couple
     */
    async unlinkCouple(userId) {
        console.log('[Couple] Unlinking couple for user:', userId);

        try {
            const coupleId = await this.getUserCouple(userId);
            
            if (!coupleId) {
                throw new Error('Not in a couple');
            }

            const coupleRef = doc(db, 'couples', coupleId);
            const coupleDoc = await getDoc(coupleRef);

            if (!coupleDoc.exists()) {
                throw new Error('Couple not found');
            }

            const coupleData = coupleDoc.data();
            const users = coupleData.users || [];

            // Remove couple reference from both users
            for (const uid of users) {
                await updateDoc(doc(db, 'users', uid), {
                    coupledWith: null,
                    coupleLinkedAt: null
                });
            }

            // Delete couple document
            await deleteDoc(coupleRef);

            // Clean up listener
            this.cleanupListener(coupleId);

            notify.success('Couple unlinked');

            console.log('[Couple] ✅ Couple unlinked');

        } catch (error) {
            console.error('[Couple] Error unlinking couple:', error);
            notify.error('Failed to unlink couple');
            throw error;
        }
    }

    /**
     * Get user's couple ID
     */
    async getUserCouple(userId) {
        try {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                return null;
            }

            return userDoc.data().coupledWith || null;

        } catch (error) {
            console.error('[Couple] Error getting user couple:', error);
            return null;
        }
    }

    /**
     * Get couple data
     */
    async getCoupleData(coupleId) {
        try {
            const coupleRef = doc(db, 'couples', coupleId);
            const coupleDoc = await getDoc(coupleRef);

            if (!coupleDoc.exists()) {
                return null;
            }

            return {
                id: coupleId,
                ...coupleDoc.data()
            };

        } catch (error) {
            console.error('[Couple] Error getting couple data:', error);
            return null;
        }
    }

    /**
     * Find mutual matches between couple
     */
    async findMatches(coupleId) {
        console.log('[Couple] Finding matches for couple:', coupleId);

        try {
            const coupleData = await this.getCoupleData(coupleId);
            
            if (!coupleData) {
                throw new Error('Couple not found');
            }

            const [userId1, userId2] = coupleData.users;

            // Get both users' swipe history
            const user1Doc = await getDoc(doc(db, 'users', userId1));
            const user2Doc = await getDoc(doc(db, 'users', userId2));

            if (!user1Doc.exists() || !user2Doc.exists()) {
                throw new Error('User data not found');
            }

            const user1Swipes = user1Doc.data().swipeHistory || [];
            const user2Swipes = user2Doc.data().swipeHistory || [];

            console.log(`[Couple] User 1: ${user1Swipes.length} swipes, User 2: ${user2Swipes.length} swipes`);

            // Create maps of positive swipes (love, like, maybe)
            const user1Likes = new Map();
            user1Swipes.forEach(swipe => {
                if (['love', 'like', 'maybe'].includes(swipe.action)) {
                    const movieId = swipe.movieId || swipe.movie?.id;
                    if (movieId) {
                        user1Likes.set(movieId.toString(), {
                            action: swipe.action,
                            score: this.actionWeights[swipe.action],
                            timestamp: swipe.timestamp
                        });
                    }
                }
            });

            // Find mutual matches
            const matches = [];
            user2Swipes.forEach(swipe => {
                if (['love', 'like', 'maybe'].includes(swipe.action)) {
                    const movieId = swipe.movieId || swipe.movie?.id;
                    if (movieId) {
                        const movieIdStr = movieId.toString();
                        if (user1Likes.has(movieIdStr)) {
                            const user1Match = user1Likes.get(movieIdStr);
                            const user2Score = this.actionWeights[swipe.action];
                            
                            matches.push({
                                movieId: parseInt(movieId),
                                movie: swipe.movie || {},
                                user1Action: user1Match.action,
                                user2Action: swipe.action,
                                combinedScore: user1Match.score + user2Score,
                                timestamp: Math.max(user1Match.timestamp, swipe.timestamp)
                            });
                        }
                    }
                }
            });

            // Sort by combined score and timestamp
            matches.sort((a, b) => {
                if (b.combinedScore !== a.combinedScore) {
                    return b.combinedScore - a.combinedScore;
                }
                return b.timestamp - a.timestamp;
            });

            console.log(`[Couple] Found ${matches.length} mutual matches`);

            // Calculate compatibility score (0-100)
            const compatibility = this.calculateCompatibility(user1Swipes, user2Swipes, matches.length);

            // Update couple document
            const coupleRef = doc(db, 'couples', coupleId);
            await updateDoc(coupleRef, {
                sharedMatches: matches.map(m => ({
                    movieId: m.movieId,
                    user1Action: m.user1Action,
                    user2Action: m.user2Action,
                    combinedScore: m.combinedScore
                })),
                compatibility,
                lastMatchAt: matches.length > 0 ? Date.now() : null,
                lastUpdated: Date.now()
            });

            return {
                matches,
                compatibility,
                totalMatches: matches.length
            };

        } catch (error) {
            console.error('[Couple] Error finding matches:', error);
            throw error;
        }
    }

    /**
     * Calculate compatibility score (0-100)
     */
    calculateCompatibility(user1Swipes, user2Swipes, matchCount) {
        if (user1Swipes.length === 0 || user2Swipes.length === 0) {
            return 0;
        }

        // Get positive swipes for both users
        const user1Positive = user1Swipes.filter(s => ['love', 'like', 'maybe'].includes(s.action));
        const user2Positive = user2Swipes.filter(s => ['love', 'like', 'maybe'].includes(s.action));

        const totalPositive = Math.min(user1Positive.length, user2Positive.length);
        
        if (totalPositive === 0) {
            return 0;
        }

        // Base compatibility on match ratio
        const matchRatio = matchCount / totalPositive;
        
        // Scale to 0-100 with a curve (sqrt for better distribution)
        const compatibility = Math.min(100, Math.round(Math.sqrt(matchRatio) * 100));

        return compatibility;
    }

    /**
     * Setup real-time listener for couple updates
     */
    setupCoupleListener(coupleId, callback) {
        console.log('[Couple] Setting up listener for:', coupleId);

        // Clean up existing listener
        this.cleanupListener(coupleId);

        const coupleRef = doc(db, 'couples', coupleId);
        const unsubscribe = onSnapshot(coupleRef, 
            (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const data = {
                        id: coupleId,
                        ...docSnapshot.data()
                    };
                    
                    console.log('[Couple] Real-time update:', {
                        matches: data.sharedMatches?.length || 0,
                        compatibility: data.compatibility
                    });

                    if (callback) {
                        callback(data);
                    }
                }
            },
            (error) => {
                console.error('[Couple] Listener error:', error);
            }
        );

        this.coupleListeners.set(coupleId, unsubscribe);
        this.currentCoupleId = coupleId;

        return unsubscribe;
    }

    /**
     * Cleanup listener
     */
    cleanupListener(coupleId) {
        const unsubscribe = this.coupleListeners.get(coupleId);
        if (unsubscribe) {
            unsubscribe();
            this.coupleListeners.delete(coupleId);
        }
    }

    /**
     * Cleanup all listeners
     */
    cleanup() {
        this.coupleListeners.forEach(unsubscribe => unsubscribe());
        this.coupleListeners.clear();
        this.currentCoupleId = null;
    }

    /**
     * Get couple summary for UI
     */
    getCoupleSummary(coupleData) {
        if (!coupleData) {
            return {
                isLinked: false,
                message: 'Not linked with anyone yet'
            };
        }

        const matchCount = coupleData.sharedMatches?.length || 0;
        const compatibility = coupleData.compatibility || 0;

        return {
            isLinked: true,
            matchCount,
            compatibility,
            compatibilityEmoji: this.getCompatibilityEmoji(compatibility),
            message: matchCount > 0 
                ? `${matchCount} movies you both love!`
                : 'Keep swiping to find matches!'
        };
    }

    /**
     * Get compatibility emoji based on score
     */
    getCompatibilityEmoji(score) {
        if (score >= 80) return '🔥';
        if (score >= 60) return '💕';
        if (score >= 40) return '❤️';
        if (score >= 20) return '💙';
        return '💛';
    }
}

// Create singleton instance
const coupleService = new CoupleService();

export { coupleService, CoupleService };
