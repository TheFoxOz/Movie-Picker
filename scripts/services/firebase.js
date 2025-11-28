/**
 * Firebase Database Layer
 * Handles all Firebase operations with offline support
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { 
    getAuth, 
    signInAnonymously, 
    signInWithCustomToken, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc,
    getDocs,
    collection,
    query,
    where,
    orderBy,
    serverTimestamp,
    enableIndexedDbPersistence,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

export class FirebaseService {
    constructor() {
        this.app = null;
        this.db = null;
        this.auth = null;
        this.userId = null;
        this.appId = null;
        this.isInitialized = false;
        this.listeners = new Map();
    }
    
    /**
     * Initialize Firebase with configuration
     * @param {Object} config - Firebase configuration
     * @param {String} appId - Application ID
     * @param {String} authToken - Optional custom auth token
     */
    async initialize(config, appId, authToken = null) {
        try {
            this.appId = appId;
            this.app = initializeApp(config);
            this.db = getFirestore(this.app);
            this.auth = getAuth(this.app);
            
            // Enable offline persistence
            try {
                await enableIndexedDbPersistence(this.db, {
                    synchronizeTabs: true
                });
                console.log('[Firebase] Offline persistence enabled');
            } catch (err) {
                if (err.code === 'failed-precondition') {
                    console.warn('[Firebase] Multiple tabs open, persistence enabled in one');
                } else if (err.code === 'unimplemented') {
                    console.warn('[Firebase] Browser doesn\'t support offline persistence');
                }
            }
            
            // Setup authentication
            await this.setupAuth(authToken);
            
            this.isInitialized = true;
            console.log('[Firebase] Initialized successfully');
            
        } catch (error) {
            console.error('[Firebase] Initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Setup authentication with custom token or anonymous
     * @param {String} authToken - Optional custom auth token
     */
    async setupAuth(authToken) {
        return new Promise((resolve, reject) => {
            // Set a 10-second timeout for auth
            const timeout = setTimeout(() => {
                console.warn('[Firebase] Auth timeout - continuing without authentication');
                unsubscribe();
                resolve(null); // Continue without auth
            }, 10000);
            
            // Listen for auth state changes
            const unsubscribe = onAuthStateChanged(this.auth, (user) => {
                clearTimeout(timeout);
                if (user) {
                    this.userId = user.uid;
                    console.log('[Firebase] Authenticated:', this.userId);
                    unsubscribe();
                    resolve(user);
                } else {
                    console.warn('[Firebase] No user - continuing as guest');
                    unsubscribe();
                    resolve(null);
                }
            }, (error) => {
                clearTimeout(timeout);
                console.error('[Firebase] Auth error:', error);
                unsubscribe();
                resolve(null); // Continue without auth instead of rejecting
            });
            
            // Perform sign-in
            if (authToken) {
                signInWithCustomToken(this.auth, authToken).catch((error) => {
                    clearTimeout(timeout);
                    console.error('[Firebase] Custom token sign-in failed:', error);
                    unsubscribe();
                    resolve(null); // Continue without auth
                });
            } else {
                signInAnonymously(this.auth).catch((error) => {
                    clearTimeout(timeout);
                    console.error('[Firebase] Anonymous sign-in failed:', error);
                    unsubscribe();
                    resolve(null); // Continue without auth
                });
            }
        });
    }
    
    /**
     * Save a swipe action to Firestore
     * @param {Object} swipeData - Swipe information
     */
    async saveSwipe(swipeData) {
        if (!this.isInitialized) {
            throw new Error('Firebase not initialized');
        }
        
        try {
            const swipeRef = doc(
                this.db,
                'artifacts', this.appId,
                'users', this.userId,
                'swipes', swipeData.movieId
            );
            
            const data = {
                ...swipeData,
                timestamp: serverTimestamp(),
                userId: this.userId,
            };
            
            await setDoc(swipeRef, data);
            console.log('[Firebase] Swipe saved:', swipeData.movieId);
            
        } catch (error) {
            console.error('[Firebase] Error saving swipe:', error);
            throw error;
        }
    }
    
    /**
     * Get user's swipe history
     * @returns {Array} Swipe history
     */
    async getSwipeHistory() {
        if (!this.isInitialized) {
            throw new Error('Firebase not initialized');
        }
        
        try {
            const swipesRef = collection(
                this.db,
                'artifacts', this.appId,
                'users', this.userId,
                'swipes'
            );
            
            const snapshot = await getDocs(swipesRef);
            const swipes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log('[Firebase] Loaded swipe history:', swipes.length);
            return swipes;
            
        } catch (error) {
            console.error('[Firebase] Error loading swipe history:', error);
            return [];
        }
    }
    
    /**
     * Subscribe to match updates for a group
     * @param {String} groupId - Group identifier
     * @param {Function} callback - Callback for updates
     * @returns {Function} Unsubscribe function
     */
    subscribeToMatches(groupId, callback) {
        if (!this.isInitialized) {
            console.warn('[Firebase] Not initialized, cannot subscribe to matches');
            return () => {};
        }
        
        try {
            const matchesQuery = query(
                collection(this.db, 'artifacts', this.appId, 'groups', groupId, 'matches'),
                where('matchScore', '>=', 50),
                orderBy('matchScore', 'desc')
            );
            
            const unsubscribe = onSnapshot(
                matchesQuery,
                (snapshot) => {
                    const matches = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    callback(matches);
                },
                (error) => {
                    console.error('[Firebase] Match subscription error:', error);
                }
            );
            
            this.listeners.set(groupId, unsubscribe);
            console.log('[Firebase] Subscribed to matches for:', groupId);
            
            return unsubscribe;
            
        } catch (error) {
            console.error('[Firebase] Error subscribing to matches:', error);
            return () => {};
        }
    }
    
    /**
     * Unsubscribe from all active listeners
     */
    unsubscribeAll() {
        this.listeners.forEach((unsubscribe) => {
            unsubscribe();
        });
        this.listeners.clear();
        console.log('[Firebase] Unsubscribed from all listeners');
    }
    
    /**
     * Save user preferences
     * @param {Object} preferences - User preferences
     */
    async savePreferences(preferences) {
        if (!this.isInitialized) {
            throw new Error('Firebase not initialized');
        }
        
        try {
            const userRef = doc(
                this.db,
                'artifacts', this.appId,
                'users', this.userId
            );
            
            await setDoc(userRef, {
                preferences,
                updatedAt: serverTimestamp()
            }, { merge: true });
            
            console.log('[Firebase] Preferences saved');
            
        } catch (error) {
            console.error('[Firebase] Error saving preferences:', error);
            throw error;
        }
    }
    
    /**
     * Load user preferences
     * @returns {Object} User preferences
     */
    async loadPreferences() {
        if (!this.isInitialized) {
            throw new Error('Firebase not initialized');
        }
        
        try {
            const userRef = doc(
                this.db,
                'artifacts', this.appId,
                'users', this.userId
            );
            
            const snapshot = await getDoc(userRef);
            
            if (snapshot.exists()) {
                const data = snapshot.data();
                console.log('[Firebase] Preferences loaded');
                return data.preferences || {};
            }
            
            return {};
            
        } catch (error) {
            console.error('[Firebase] Error loading preferences:', error);
            return {};
        }
    }
    
    /**
     * Get user ID (or generate guest ID if not authenticated)
     * @returns {String} User ID
     */
    getUserId() {
        if (this.userId) {
            return this.userId;
        }
        
        // Generate guest ID
        const guestId = 'guest-' + crypto.randomUUID().substring(0, 8);
        this.userId = guestId;
        return guestId;
    }
}

// Create singleton instance
export const firebaseService = new FirebaseService();
