/**
 * Authentication Service
 * Handles user authentication and real-time sync
 */

import { firebase, auth, db } from './firebase-config.js';
import { store } from '../state/store.js';
import { showSuccess, showError } from '../utils/notifications.js';
import { ENV } from '../config/env.js';

class AuthService {
    constructor() {
        this.currentUser = null;
        this.unsubscribers = [];
        this.setupAuthListener();
    }
    
    /**
     * Listen for auth state changes
     */
    setupAuthListener() {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                
                if (ENV.APP.debug) {
                    console.log('[Auth] User signed in:', user.email);
                }
                
                // Load user data from Firestore
                await this.loadUserData(user.uid);
                
                // Setup real-time listeners
                this.setupRealtimeListeners(user.uid);
                
                // Update store
                store.setState({ 
                    userId: user.uid,
                    userEmail: user.email,
                    userName: user.displayName || 'User',
                    isAuthenticated: true
                });
                
            } else {
                this.currentUser = null;
                this.cleanup();
                
                store.setState({ 
                    userId: null,
                    userEmail: null,
                    userName: null,
                    isAuthenticated: false,
                    friends: [],
                    groups: []
                });
                
                if (ENV.APP.debug) {
                    console.log('[Auth] User signed out');
                }
            }
        });
    }
    
    /**
     * Sign up with email and password
     */
    async signUp(email, password, displayName) {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Update display name
            await user.updateProfile({ displayName });
            
            // Create user document in Firestore
            await db.collection('users').doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                displayName: displayName,
                avatar: '😊',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                swipeHistory: [],
                friends: [],
                groups: []
            });
            
            showSuccess('Account created successfully!');
            
            if (ENV.APP.debug) {
                console.log('[Auth] User signed up:', email);
            }
            
            return user;
            
        } catch (error) {
            console.error('[Auth] Sign up error:', error);
            
            const errorMessages = {
                'auth/email-already-in-use': 'This email is already registered',
                'auth/weak-password': 'Password should be at least 6 characters',
                'auth/invalid-email': 'Invalid email address'
            };
            
            showError(errorMessages[error.code] || 'Failed to create account');
            throw error;
        }
    }
    
    /**
     * Sign in with email and password
     */
    async signIn(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            showSuccess('Welcome back!');
            
            if (ENV.APP.debug) {
                console.log('[Auth] User signed in:', email);
            }
            
            return userCredential.user;
            
        } catch (error) {
            console.error('[Auth] Sign in error:', error);
            
            const errorMessages = {
                'auth/user-not-found': 'No account found with this email',
                'auth/wrong-password': 'Incorrect password',
                'auth/invalid-email': 'Invalid email address',
                'auth/too-many-requests': 'Too many failed attempts. Try again later'
            };
            
            showError(errorMessages[error.code] || 'Failed to sign in');
            throw error;
        }
    }
    
    /**
     * Sign in with Google
     */
    async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const userCredential = await auth.signInWithPopup(provider);
            const user = userCredential.user;
            
            // Check if user document exists
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                // Create user document for new Google users
                await db.collection('users').doc(user.uid).set({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    avatar: user.photoURL || '😊',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    swipeHistory: [],
                    friends: [],
                    groups: []
                });
            }
            
            showSuccess('Signed in with Google!');
            
            if (ENV.APP.debug) {
                console.log('[Auth] Google sign in:', user.email);
            }
            
            return user;
            
        } catch (error) {
            console.error('[Auth] Google sign in error:', error);
            showError('Failed to sign in with Google');
            throw error;
        }
    }
    
    /**
     * Sign out
     */
    async signOut() {
        try {
            await auth.signOut();
            showSuccess('Signed out successfully');
            
        } catch (error) {
            console.error('[Auth] Sign out error:', error);
            showError('Failed to sign out');
            throw error;
        }
    }
    
    /**
     * Load user data from Firestore
     */
    async loadUserData(uid) {
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                
                store.setState({
                    swipeHistory: userData.swipeHistory || [],
                    friends: userData.friends || [],
                    groups: userData.groups || []
                });
                
                if (ENV.APP.debug) {
                    console.log('[Auth] User data loaded');
                }
            }
            
        } catch (error) {
            console.error('[Auth] Load user data error:', error);
        }
    }
    
    /**
     * Setup real-time listeners
     */
    setupRealtimeListeners(uid) {
        // Listen to user document changes
        const unsubUser = db.collection('users').doc(uid).onSnapshot((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                
                store.setState({
                    swipeHistory: userData.swipeHistory || [],
                    friends: userData.friends || [],
                    groups: userData.groups || []
                });
                
                if (ENV.APP.debug) {
                    console.log('[Auth] User data updated');
                }
            }
        });
        
        this.unsubscribers.push(unsubUser);
    }
    
    /**
     * Sync swipe history to Firestore
     */
    async syncSwipeHistory(swipeHistory) {
        if (!this.currentUser) return;
        
        try {
            await db.collection('users').doc(this.currentUser.uid).update({
                swipeHistory: swipeHistory
            });
            
            if (ENV.APP.debug) {
                console.log('[Auth] Swipe history synced');
            }
            
        } catch (error) {
            console.error('[Auth] Sync error:', error);
        }
    }
    
    /**
     * Add friend by email
     */
    async addFriend(friendEmail) {
        if (!this.currentUser) {
            showError('You must be signed in to add friends');
            return;
        }
        
        try {
            // Find friend by email
            const querySnapshot = await db.collection('users')
                .where('email', '==', friendEmail)
                .get();
            
            if (querySnapshot.empty) {
                showError('No user found with that email');
                return;
            }
            
            const friendDoc = querySnapshot.docs[0];
            const friendData = friendDoc.data();
            
            if (friendData.uid === this.currentUser.uid) {
                showError('You cannot add yourself as a friend');
                return;
            }
            
            const friendInfo = {
                id: friendData.uid,
                name: friendData.displayName,
                email: friendData.email,
                avatar: friendData.avatar || '👤',
                addedAt: new Date().toISOString()
            };
            
            // Add friend to current user's friends list
            await db.collection('users').doc(this.currentUser.uid).update({
                friends: firebase.firestore.FieldValue.arrayUnion(friendInfo)
            });
            
            // Add current user to friend's friends list
            await db.collection('users').doc(friendData.uid).update({
                friends: firebase.firestore.FieldValue.arrayUnion({
                    id: this.currentUser.uid,
                    name: this.currentUser.displayName || 'User',
                    email: this.currentUser.email,
                    avatar: '😊',
                    addedAt: new Date().toISOString()
                })
            });
            
            showSuccess(`Added ${friendData.displayName} as a friend!`);
            
            if (ENV.APP.debug) {
                console.log('[Auth] Friend added:', friendEmail);
            }
            
        } catch (error) {
            console.error('[Auth] Add friend error:', error);
            showError('Failed to add friend');
        }
    }
    
    /**
     * Create a group
     */
    async createGroup(groupName, groupEmoji = '🎬') {
        if (!this.currentUser) {
            showError('You must be signed in to create groups');
            return;
        }
        
        try {
            const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const newGroup = {
                id: groupId,
                name: groupName,
                emoji: groupEmoji,
                createdBy: this.currentUser.uid,
                createdAt: new Date().toISOString(),
                members: [{
                    id: this.currentUser.uid,
                    name: this.currentUser.displayName || 'User',
                    email: this.currentUser.email,
                    avatar: '😊',
                    role: 'admin'
                }],
                matchCount: 0
            };
            
            // Add group to user's groups list
            await db.collection('users').doc(this.currentUser.uid).update({
                groups: firebase.firestore.FieldValue.arrayUnion(newGroup)
            });
            
            showSuccess(`Group "${groupName}" created!`);
            
            if (ENV.APP.debug) {
                console.log('[Auth] Group created:', groupName);
            }
            
            return groupId;
            
        } catch (error) {
            console.error('[Auth] Create group error:', error);
            showError('Failed to create group');
        }
    }
    
    /**
     * Cleanup listeners
     */
    cleanup() {
        this.unsubscribers.forEach(unsubscribe => unsubscribe());
        this.unsubscribers = [];
    }
    
    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }
    
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.currentUser;
    }
}

// Export singleton instance
export const authService = new AuthService();
