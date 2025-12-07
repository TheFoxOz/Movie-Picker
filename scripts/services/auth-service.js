/**
 * Authentication Service
 * Firebase v8 Compatible - FULLY WORKING Google Sign-In
 * FIXED: All ENV.APP.debug → ENV.DEBUG_MODE
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
    
    setupAuthListener() {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                
                // FIXED: ENV.APP.debug → ENV.DEBUG_MODE
                if (ENV && ENV.DEBUG_MODE) {
                    console.log('[Auth] User signed in:', user.email);
                }
                
                await this.loadUserData(user.uid);
                this.setupRealtimeListeners(user.uid);
                
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
                
                // FIXED: ENV.APP.debug → ENV.DEBUG_MODE
                if (ENV && ENV.DEBUG_MODE) {
                    console.log('[Auth] User signed out');
                }
            }
        });
    }
    
    async signUp(email, password, displayName) {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            await user.updateProfile({ displayName });
            
            await db.collection('users').doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                displayName: displayName,
                avatar: 'Smile',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                swipeHistory: [],
                friends: [],
                groups: [],
                onboardingCompleted: false  // New users need onboarding
            });
            
            showSuccess('Account created successfully!');
            
            // FIXED: ENV.APP.debug → ENV.DEBUG_MODE
            if (ENV && ENV.DEBUG_MODE) {
                console.log('[Auth] User signed up:', email);
            }
            
            return { user, isNewUser: true };  // Always new user for signUp
            
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
    
    async signIn(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            showSuccess('Welcome back!');
            
            // FIXED: ENV.APP.debug → ENV.DEBUG_MODE
            if (ENV && ENV.DEBUG_MODE) {
                console.log('[Auth] User signed in:', email);
            }
            
            return { user: userCredential.user, isNewUser: false };  // Existing user
            
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
    
    // FIXED & BULLETPROOF Google Sign-In
    async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');
            
            // Critical fix: forces account selection + prevents domain issues
            provider.setCustomParameters({
                prompt: 'select_account'
            });

            const result = await auth.signInWithPopup(provider);
            const user = result.user;

            if (!user) throw new Error('No user returned from Google');

            // Check if user exists in Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            const isNewUser = !userDoc.exists;
            
            if (isNewUser) {
                await db.collection('users').doc(user.uid).set({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || user.email.split('@')[0],
                    avatar: user.photoURL || 'Smile',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    swipeHistory: [],
                    friends: [],
                    groups: [],
                    onboardingCompleted: false  // New users need onboarding
                });
                console.log('[Auth] New Google user created in Firestore');
            }

            showSuccess('Signed in with Google!');
            
            // FIXED: ENV.APP.debug → ENV.DEBUG_MODE
            if (ENV && ENV.DEBUG_MODE) {
                console.log('[Auth] Google sign in successful:', user.email);
            }
            
            // Return user with new user flag
            return { user, isNewUser };
            
        } catch (error) {
            console.error('[Auth] Google sign in error:', error);
            
            const errorMessages = {
                'auth/popup-blocked': 'Popup blocked. Please allow popups and try again.',
                'auth/unauthorized-domain': 'Domain not authorized. Add your domain in Firebase Console → Authentication → Settings.',
                'auth/network-request-failed': 'No internet connection. Please check your network.',
                'auth/cancelled-popup-request': 'Sign-in was cancelled.',
                'auth/operation-not-allowed': 'Google sign-in is disabled in Firebase Console.',
                'auth/popup-closed-by-user': 'Sign-in popup was closed.'
            };
            
            showError(errorMessages[error.code] || 'Failed to sign in with Google');
            throw error;
        }
    }
    
    // Anonymous/Guest Sign-In
    async signInAnonymously() {
        try {
            const result = await auth.signInAnonymously();
            const user = result.user;
            
            if (!user) throw new Error('Anonymous sign-in failed');
            
            // Create guest user profile
            const userDoc = await db.collection('users').doc(user.uid).get();
            const isNewUser = !userDoc.exists;
            
            if (isNewUser) {
                await db.collection('users').doc(user.uid).set({
                    uid: user.uid,
                    email: null,
                    displayName: 'Guest',
                    avatar: '😊',
                    isAnonymous: true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    swipeHistory: [],
                    friends: [],
                    groups: [],
                    onboardingCompleted: false  // New guests need onboarding
                });
                console.log('[Auth] Guest user created');
            }
            
            showSuccess('Welcome, Guest!');
            
            if (ENV && ENV.DEBUG_MODE) {
                console.log('[Auth] Anonymous sign in successful');
            }
            
            return { user, isNewUser };
            
        } catch (error) {
            console.error('[Auth] Anonymous sign in error:', error);
            showError('Failed to continue as guest. Please try again.');
            throw error;
        }
    }
    
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
     * Check if user has completed onboarding
     */
    async hasCompletedOnboarding(uid) {
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists) {
                return userDoc.data().onboardingCompleted === true;
            }
            return false;
        } catch (error) {
            console.error('[Auth] Check onboarding error:', error);
            return false;  // Default to false if error
        }
    }
    
    /**
     * Mark onboarding as complete
     */
    async completeOnboarding(uid) {
        try {
            await db.collection('users').doc(uid).update({
                onboardingCompleted: true,
                onboardingCompletedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('[Auth] Onboarding marked as complete');
        } catch (error) {
            console.error('[Auth] Complete onboarding error:', error);
        }
    }
    
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
                
                // FIXED: ENV.APP.debug → ENV.DEBUG_MODE
                if (ENV && ENV.DEBUG_MODE) {
                    console.log('[Auth] User data loaded');
                }
            }
            
        } catch (error) {
            console.error('[Auth] Load user data error:', error);
        }
    }
    
    setupRealtimeListeners(uid) {
        const unsubUser = db.collection('users').doc(uid).onSnapshot((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                
                store.setState({
                    swipeHistory: userData.swipeHistory || [],
                    friends: userData.friends || [],
                    groups: userData.groups || []
                });
                
                // FIXED: ENV.APP.debug → ENV.DEBUG_MODE
                if (ENV && ENV.DEBUG_MODE) {
                    console.log('[Auth] User data updated');
                }
            }
        });
        
        this.unsubscribers.push(unsubUser);
    }
    
    async syncSwipeHistory(swipeHistory) {
        if (!this.currentUser) return;
        
        try {
            await db.collection('users').doc(this.currentUser.uid).update({
                swipeHistory: swipeHistory
            });
            
            // FIXED: ENV.APP.debug → ENV.DEBUG_MODE
            if (ENV && ENV.DEBUG_MODE) {
                console.log('[Auth] Swipe history synced');
            }
            
        } catch (error) {
            console.error('[Auth] Sync error:', error);
        }
    }
    
    async addFriend(friendEmail) {
        if (!this.currentUser) {
            showError('You must be signed in to add friends');
            return;
        }
        
        try {
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
                avatar: friendData.avatar || 'Person',
                addedAt: new Date().toISOString()
            };
            
            await db.collection('users').doc(this.currentUser.uid).update({
                friends: firebase.firestore.FieldValue.arrayUnion(friendInfo)
            });
            
            await db.collection('users').doc(friendData.uid).update({
                friends: firebase.firestore.FieldValue.arrayUnion({
                    id: this.currentUser.uid,
                    name: this.currentUser.displayName || 'User',
                    email: this.currentUser.email,
                    avatar: 'Smile',
                    addedAt: new Date().toISOString()
                })
            });
            
            showSuccess(`Added ${friendData.displayName} as a friend!`);
            
            // FIXED: ENV.APP.debug → ENV.DEBUG_MODE
            if (ENV && ENV.DEBUG_MODE) {
                console.log('[Auth] Friend added:', friendEmail);
            }
            
        } catch (error) {
            console.error('[Auth] Add friend error:', error);
            showError('Failed to add friend');
        }
    }
    
    async createGroup(groupName, groupEmoji = 'Film') {
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
                    avatar: 'Smile',
                    role: 'admin'
                }],
                matchCount: 0
            };
            
            await db.collection('users').doc(this.currentUser.uid).update({
                groups: firebase.firestore.FieldValue.arrayUnion(newGroup)
            });
            
            showSuccess(`Group "${groupName}" created!`);
            
            // FIXED: ENV.APP.debug → ENV.DEBUG_MODE
            if (ENV && ENV.DEBUG_MODE) {
                console.log('[Auth] Group created:', groupName);
            }
            
            return groupId;
            
        } catch (error) {
            console.error('[Auth] Create group error:', error);
            showError('Failed to create group');
        }
    }
    
    cleanup() {
        this.unsubscribers.forEach(unsubscribe => unsubscribe());
        this.unsubscribers = [];
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    isAuthenticated() {
        return !!this.currentUser;
    }
}

export const authService = new AuthService();
