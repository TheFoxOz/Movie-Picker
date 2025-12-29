/**
 * Room Service
 * Manages shared swipe rooms for group movie discovery
 * ✅ Create rooms with unique 6-digit codes
 * ✅ Join rooms via code
 * ✅ Real-time swipe sync across all users
 * ✅ Match detection (movies everyone likes)
 * ✅ Room expiration (24 hours)
 * ✅ Support 2-6 users per room
 */

import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase-config.js';
import { authService } from './auth-service.js';
import { notify } from '../utils/notifications.js';

class RoomService {
    constructor() {
        this.roomListeners = new Map();
        this.currentRoomId = null;
        this.maxUsersPerRoom = 6;
        this.roomDuration = 24 * 60 * 60 * 1000; // 24 hours
        
        // Action weights for match scoring
        this.actionWeights = {
            'love': 5,
            'like': 3,
            'maybe': 1,
            'nope': 0
        };
    }

    /**
     * Create a new swipe room
     * @param {string} hostId - Room creator's user ID
     * @param {string} name - Room name (optional)
     * @param {string} password - Optional password protection
     * @returns {Promise<Object>} Room data with code
     */
    async createRoom(hostId, name = 'Movie Night', password = null) {
        console.log('[Room] Creating room for host:', hostId);

        try {
            // SECURITY FIX #3: Limit to 5 active rooms per user
            const existingRooms = await this.getUserRooms(hostId);
            if (existingRooms.length >= 5) {
                throw new Error('Maximum 5 active rooms allowed. Please close an old room first.');
            }

            // Get host data
            const hostDoc = await getDoc(doc(db, 'users', hostId));
            if (!hostDoc.exists()) {
                throw new Error('User not found');
            }

            const hostData = hostDoc.data();
            const hostName = hostData.displayName || hostData.email?.split('@')[0] || 'User';

            // Generate unique 6-digit code
            const code = await this.generateUniqueCode();

            // Create room ID
            const roomId = `room_${Date.now()}_${code}`;

            // Calculate expiration time
            const expiresAt = Date.now() + this.roomDuration;

            // Create room document
            const roomRef = doc(db, 'rooms', roomId);
            await setDoc(roomRef, {
                code,
                name,
                creator: hostId,
                creatorName: hostName,
                users: [hostId],
                userNames: {
                    [hostId]: hostName
                },
                swipes: {},
                matches: [],
                status: 'active',
                createdAt: Date.now(),
                expiresAt,
                lastActivity: Date.now(),
                maxUsers: this.maxUsersPerRoom,
                // SECURITY FIX #1: Add password protection
                hasPassword: !!password,
                password: password || null
            });

            console.log('[Room] ✅ Room created:', { roomId, code, name, hasPassword: !!password });

            notify.success(`Room created! Code: ${code}${password ? ' 🔒' : ''}`);

            return {
                roomId,
                code,
                name,
                expiresAt,
                hasPassword: !!password
            };

        } catch (error) {
            console.error('[Room] Error creating room:', error);
            notify.error(error.message || 'Failed to create room');
            throw error;
        }
    }

    /**
     * Generate unique 6-digit room code
     */
    async generateUniqueCode() {
        const generateCode = () => {
            // Generate random 6-digit number
            return Math.floor(100000 + Math.random() * 900000).toString();
        };

        let code = generateCode();
        let attempts = 0;
        const maxAttempts = 10;

        // Check for uniqueness
        while (attempts < maxAttempts) {
            const roomsRef = collection(db, 'rooms');
            const q = query(roomsRef, where('code', '==', code), where('status', '==', 'active'));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                return code;
            }

            code = generateCode();
            attempts++;
        }

        // Fallback to timestamp-based code if all random codes are taken
        return `${Date.now().toString().slice(-6)}`;
    }

    /**
     * Join room via code
     * @param {string} userId - User ID
     * @param {string} code - 6-digit room code
     * @param {string} password - Optional password if room is protected
     * @returns {Promise<Object>} Room data
     */
    async joinRoom(userId, code, password = null) {
        console.log('[Room] User joining room:', { userId, code });

        try {
            // Clean up code (remove spaces, dashes)
            const cleanCode = code.replace(/[\s-]/g, '');

            if (cleanCode.length !== 6 || !/^\d+$/.test(cleanCode)) {
                throw new Error('Invalid code format. Use 6 digits.');
            }

            // Find room by code
            const roomsRef = collection(db, 'rooms');
            const q = query(
                roomsRef, 
                where('code', '==', cleanCode),
                where('status', '==', 'active')
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                throw new Error('Room not found. Check the code.');
            }

            const roomDoc = snapshot.docs[0];
            const roomId = roomDoc.id;
            const roomData = roomDoc.data();

            // SECURITY FIX #1: Check password if room is protected
            if (roomData.hasPassword && roomData.password !== password) {
                throw new Error('Incorrect room password 🔒');
            }

            // Check if room expired
            if (roomData.expiresAt < Date.now()) {
                await this.closeRoom(roomId);
                throw new Error('Room has expired');
            }

            // Check if already in room
            if (roomData.users.includes(userId)) {
                console.log('[Room] User already in room');
                return {
                    roomId,
                    ...roomData,
                    alreadyJoined: true
                };
            }

            // Check room capacity
            if (roomData.users.length >= roomData.maxUsers) {
                throw new Error(`Room is full (${roomData.maxUsers} users max)`);
            }

            // Get user data
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (!userDoc.exists()) {
                throw new Error('User not found');
            }

            const userData = userDoc.data();
            const userName = userData.displayName || userData.email?.split('@')[0] || 'User';

            // Add user to room
            const roomRef = doc(db, 'rooms', roomId);
            await updateDoc(roomRef, {
                users: [...roomData.users, userId],
                userNames: {
                    ...roomData.userNames,
                    [userId]: userName
                },
                lastActivity: Date.now()
            });

            console.log('[Room] ✅ User joined room:', userName);

            notify.success(`Joined ${roomData.name}!`);

            return {
                roomId,
                ...roomData,
                users: [...roomData.users, userId]
            };

        } catch (error) {
            console.error('[Room] Error joining room:', error);
            notify.error(error.message || 'Failed to join room');
            throw error;
        }
    }

    /**
     * Leave room
     */
    async leaveRoom(userId, roomId) {
        console.log('[Room] User leaving room:', { userId, roomId });

        try {
            const roomRef = doc(db, 'rooms', roomId);
            const roomDoc = await getDoc(roomRef);

            if (!roomDoc.exists()) {
                throw new Error('Room not found');
            }

            const roomData = roomDoc.data();
            const updatedUsers = roomData.users.filter(id => id !== userId);

            // If no users left, close room
            if (updatedUsers.length === 0) {
                await this.closeRoom(roomId);
                notify.info('Room closed (no users left)');
                return;
            }

            // Remove user from room
            const updatedUserNames = { ...roomData.userNames };
            delete updatedUserNames[userId];

            // Remove user's swipes
            const updatedSwipes = { ...roomData.swipes };
            delete updatedSwipes[userId];

            await updateDoc(roomRef, {
                users: updatedUsers,
                userNames: updatedUserNames,
                swipes: updatedSwipes,
                lastActivity: Date.now()
            });

            // Recalculate matches
            await this.calculateMatches(roomId);

            // Clean up listener
            this.cleanupListener(roomId);

            notify.info('Left room');

            console.log('[Room] ✅ User left room');

        } catch (error) {
            console.error('[Room] Error leaving room:', error);
            notify.error('Failed to leave room');
            throw error;
        }
    }

    /**
     * Record swipe in room
     */
    async recordSwipe(roomId, userId, movieId, action) {
        console.log('[Room] Recording swipe:', { roomId, userId, movieId, action });

        try {
            const roomRef = doc(db, 'rooms', roomId);
            const roomDoc = await getDoc(roomRef);

            if (!roomDoc.exists()) {
                throw new Error('Room not found');
            }

            const roomData = roomDoc.data();

            // Check if room expired
            if (roomData.expiresAt < Date.now()) {
                await this.closeRoom(roomId);
                throw new Error('Room has expired');
            }

            // SECURITY FIX #4: Prevent double-swiping same movie
            if (roomData.swipes?.[userId]?.[movieId]) {
                console.warn('[Room] Movie already swiped by this user, ignoring duplicate');
                return {
                    success: true,
                    alreadySwiped: true,
                    matches: roomData.matches || []
                };
            }

            // Update user's swipes
            const updatedSwipes = {
                ...roomData.swipes,
                [userId]: {
                    ...(roomData.swipes[userId] || {}),
                    [movieId]: action
                }
            };

            await updateDoc(roomRef, {
                swipes: updatedSwipes,
                lastActivity: Date.now()
            });

            // Check for new matches
            await this.calculateMatches(roomId);

            console.log('[Room] ✅ Swipe recorded');

        } catch (error) {
            console.error('[Room] Error recording swipe:', error);
            throw error;
        }
    }

    /**
     * Calculate matches (movies everyone likes)
     */
    async calculateMatches(roomId) {
        try {
            const roomRef = doc(db, 'rooms', roomId);
            const roomDoc = await getDoc(roomRef);

            if (!roomDoc.exists()) {
                return;
            }

            const roomData = roomDoc.data();
            const users = roomData.users || [];
            const swipes = roomData.swipes || {};

            if (users.length < 2) {
                return;
            }

            // Find movies that ALL users have swiped positively (love, like, maybe)
            const movieScores = {};

            users.forEach(userId => {
                const userSwipes = swipes[userId] || {};
                
                Object.entries(userSwipes).forEach(([movieId, action]) => {
                    if (['love', 'like', 'maybe'].includes(action)) {
                        if (!movieScores[movieId]) {
                            movieScores[movieId] = {
                                userCount: 0,
                                totalScore: 0,
                                actions: {}
                            };
                        }
                        
                        movieScores[movieId].userCount++;
                        movieScores[movieId].totalScore += this.actionWeights[action];
                        movieScores[movieId].actions[userId] = action;
                    }
                });
            });

            // Filter to movies ALL users liked
            const matches = [];
            Object.entries(movieScores).forEach(([movieId, data]) => {
                if (data.userCount === users.length) {
                    matches.push({
                        movieId: parseInt(movieId),
                        totalScore: data.totalScore,
                        avgScore: (data.totalScore / users.length).toFixed(1),
                        actions: data.actions,
                        matchedAt: Date.now()
                    });
                }
            });

            // Sort by total score
            matches.sort((a, b) => b.totalScore - a.totalScore);

            // Check if new matches were found
            const previousMatches = roomData.matches || [];
            const newMatches = matches.filter(m => 
                !previousMatches.some(pm => pm.movieId === m.movieId)
            );

            // Update room
            await updateDoc(roomRef, {
                matches,
                lastMatchAt: matches.length > 0 ? Date.now() : roomData.lastMatchAt,
                lastActivity: Date.now()
            });

            // Notify if new matches
            if (newMatches.length > 0) {
                console.log(`[Room] 🎉 ${newMatches.length} new matches found!`);
            }

            return matches;

        } catch (error) {
            console.error('[Room] Error calculating matches:', error);
            return [];
        }
    }

    /**
     * Get room data
     */
    async getRoomData(roomId) {
        try {
            const roomRef = doc(db, 'rooms', roomId);
            const roomDoc = await getDoc(roomRef);

            if (!roomDoc.exists()) {
                return null;
            }

            const data = roomDoc.data();

            // Check if expired
            if (data.expiresAt < Date.now()) {
                await this.closeRoom(roomId);
                return null;
            }

            return {
                id: roomId,
                ...data
            };

        } catch (error) {
            console.error('[Room] Error getting room data:', error);
            return null;
        }
    }

    /**
     * Get user's active rooms
     */
    async getUserRooms(userId) {
        try {
            const roomsRef = collection(db, 'rooms');
            const q = query(
                roomsRef,
                where('users', 'array-contains', userId),
                where('status', '==', 'active')
            );

            const snapshot = await getDocs(q);
            const rooms = [];

            for (const doc of snapshot.docs) {
                const data = doc.data();
                
                // Check if expired
                if (data.expiresAt < Date.now()) {
                    await this.closeRoom(doc.id);
                    continue;
                }

                rooms.push({
                    id: doc.id,
                    ...data
                });
            }

            // Sort by last activity
            rooms.sort((a, b) => b.lastActivity - a.lastActivity);

            return rooms;

        } catch (error) {
            console.error('[Room] Error getting user rooms:', error);
            return [];
        }
    }

    /**
     * Close/end room
     */
    async closeRoom(roomId) {
        try {
            const roomRef = doc(db, 'rooms', roomId);
            await updateDoc(roomRef, {
                status: 'closed',
                closedAt: Date.now()
            });

            // Clean up listener
            this.cleanupListener(roomId);

            console.log('[Room] ✅ Room closed');

        } catch (error) {
            console.error('[Room] Error closing room:', error);
        }
    }

    /**
     * Setup real-time listener for room updates
     */
    setupRoomListener(roomId, callback) {
        console.log('[Room] Setting up listener for:', roomId);

        // Clean up existing listener
        this.cleanupListener(roomId);

        const roomRef = doc(db, 'rooms', roomId);
        const unsubscribe = onSnapshot(roomRef,
            (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const data = {
                        id: roomId,
                        ...docSnapshot.data()
                    };

                    console.log('[Room] Real-time update:', {
                        users: data.users?.length || 0,
                        matches: data.matches?.length || 0
                    });

                    // Check if expired
                    if (data.expiresAt < Date.now() && data.status === 'active') {
                        this.closeRoom(roomId);
                        return;
                    }

                    if (callback) {
                        callback(data);
                    }
                }
            },
            (error) => {
                console.error('[Room] Listener error:', error);
            }
        );

        this.roomListeners.set(roomId, unsubscribe);
        this.currentRoomId = roomId;

        return unsubscribe;
    }

    /**
     * Cleanup listener for specific room
     */
    cleanupListener(roomId) {
        const unsubscribe = this.roomListeners.get(roomId);
        if (unsubscribe) {
            unsubscribe();
            this.roomListeners.delete(roomId);
        }
        
        if (this.currentRoomId === roomId) {
            this.currentRoomId = null;
        }
    }

    /**
     * Cleanup all listeners
     */
    cleanup() {
        this.roomListeners.forEach(unsubscribe => unsubscribe());
        this.roomListeners.clear();
        this.currentRoomId = null;
    }

    /**
     * Get room summary for UI
     */
    getRoomSummary(roomData) {
        if (!roomData) {
            return {
                exists: false,
                message: 'Room not found'
            };
        }

        const userCount = roomData.users?.length || 0;
        const matchCount = roomData.matches?.length || 0;
        const timeLeft = this.getTimeRemaining(roomData.expiresAt);

        return {
            exists: true,
            name: roomData.name,
            code: roomData.code,
            userCount,
            matchCount,
            timeLeft,
            isActive: roomData.status === 'active',
            isFull: userCount >= roomData.maxUsers
        };
    }

    /**
     * Get time remaining until expiration
     */
    getTimeRemaining(expiresAt) {
        const remaining = expiresAt - Date.now();
        
        if (remaining <= 0) {
            return 'Expired';
        }

        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    /**
     * Format room code for display (XXX-XXX)
     */
    formatCode(code) {
        if (!code || code.length !== 6) return code;
        return `${code.slice(0, 3)}-${code.slice(3)}`;
    }

    /**
     * Clean up expired rooms (call periodically)
     */
    async cleanupExpiredRooms() {
        try {
            const roomsRef = collection(db, 'rooms');
            const q = query(roomsRef, where('status', '==', 'active'));
            const snapshot = await getDocs(q);

            let closedCount = 0;

            for (const doc of snapshot.docs) {
                const data = doc.data();
                if (data.expiresAt < Date.now()) {
                    await this.closeRoom(doc.id);
                    closedCount++;
                }
            }

            if (closedCount > 0) {
                console.log(`[Room] Cleaned up ${closedCount} expired rooms`);
            }

        } catch (error) {
            console.error('[Room] Error cleaning up expired rooms:', error);
        }
    }
}

// Create singleton instance
const roomService = new RoomService();

// Auto-cleanup expired rooms every 15 minutes
setInterval(() => {
    roomService.cleanupExpiredRooms();
}, 15 * 60 * 1000);

export { roomService, RoomService };
