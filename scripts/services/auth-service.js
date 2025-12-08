/**
 * Authentication Service
 * Firebase v8 Compatible - FULLY WORKING Google Sign-In
 * ENHANCED: Better error messages with Firebase Console links (Fix #2)
 * ✅ FIX: Corrected notification imports
 */

import { firebase, auth, db } from './firebase-config.js';
import { store } from '../state/store.js';
// ✅ FIX: Changed to correct import from notifications.js
import { notify } from '../utils/notifications.js';
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
                onboardingCompleted: false
            });
            
            // ✅ FIX: Changed showSuccess to notify.success
            notify.success('Account created successfully!');
            
            if (ENV && ENV.DEBUG_MODE) {
                console.log('[Auth] User signed up:', email);
            }
            
            return { user, isNewUser: true };
            
        } catch (error) {
            console.error('[Auth] Sign up error:', error);
            
            const errorMessages = {
                'auth/email-already-in-use': 'This email is already registered',
                'auth/weak-password': 'Password should be at least 6 characters',
                'auth/invalid-email': 'Invalid email address'
            };
            
            // ✅ FIX: Changed showError to notify.error
            notify.error(errorMessages[error.code] || 'Failed to create account');
            throw error;
        }
    }
    
    async signIn(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            notify.success('Welcome back!');
            
            if (ENV && ENV.DEBUG_MODE) {
                console.log('[Auth] User signed in:', email);
            }
            
            return { user: userCredential.user, isNewUser: false };
            
        } catch (error) {
            console.error('[Auth] Sign in error:', error);
            
            const errorMessages = {
                'auth/user-not-found': 'No account found with this email',
                'auth/wrong-password': 'Incorrect password',
                'auth/invalid-email': 'Invalid email address',
                'auth/too-many-requests': 'Too many failed attempts. Try again later'
            };
            
            notify.error(errorMessages[error.code] || 'Failed to sign in');
            throw error;
        }
    }
    
    // ✅ FIX #2: ENHANCED Google Sign-In with detailed error messages
    async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');
            
            provider.setCustomParameters({
                prompt: 'select_account'
            });

            const result = await auth.signInWithPopup(provider);
            const user = result.user;

            if (!user) throw new Error('No user returned from Google');

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
                    onboardingCompleted: false
                });
                console.log('[Auth] New Google user created in Firestore');
            }

            notify.success('Signed in with Google!');
            
            if (ENV && ENV.DEBUG_MODE) {
                console.log('[Auth] Google sign in successful:', user.email);
            }
            
            return { user, isNewUser };
            
        } catch (error) {
            console.error('[Auth] Google sign in error:', error);
            
            const enhancedErrorMessages = {
                'auth/popup-blocked': {
                    message: 'Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.',
                    type: 'POPUP_BLOCKED'
                },
                'auth/unauthorized-domain': {
                    message: `This domain (${window.location.hostname}) is not authorized for Google Sign-In.\n\nTo fix this:\n1. Go to Firebase Console → Authentication → Settings → Authorized domains\n2. Add: ${window.location.hostname}\n3. Wait 2-5 minutes and try again`,
                    type: 'DOMAIN_NOT_AUTHORIZED',
                    helpLink: `https://console.firebase.google.com/project/${ENV.FIREBASE.projectId}/authentication/settings`
                },
                'auth/network-request-failed': {
                    message: 'No internet connection. Please check your network and try again.',
                    type: 'NETWORK_ERROR'
                },
                'auth/cancelled-popup-request': {
                    message: 'Sign-in was cancelled. Please try again.',
                    type: 'CANCELLED'
                },
                'auth/operation-not-allowed': {
                    message: 'Google Sign-In is not enabled in Firebase Console.\n\nTo fix this:\n1. Go to Firebase Console → Authentication → Sign-in method\n2. Enable Google provider\n3. Try again',
                    type: 'NOT_ENABLED',
                    helpLink: `https://console.firebase.google.com/project/${ENV.FIREBASE.projectId}/authentication/providers`
                },
                'auth/popup-closed-by-user': {
                    message: 'Sign-in popup was closed. Please try again.',
                    type: 'CANCELLED'
                },
                'auth/internal-error': {
                    message: 'Internal error occurred. This usually means:\n\n1. Google Sign-In provider is not enabled in Firebase Console\n2. Domain is not authorized\n\nPlease check Firebase Console → Authentication',
                    type: 'INTERNAL_ERROR',
                    helpLink: `https://console.firebase.google.com/project/${ENV.FIREBASE.projectId}/authentication/providers`
                }
            };
            
            const errorInfo = enhancedErrorMessages[error.code];
            
            if (errorInfo) {
                const errorWithType = new Error(`${errorInfo.type}: ${errorInfo.message}`);
                errorWithType.helpLink = errorInfo.helpLink;
                errorWithType.type = errorInfo.type;
                
                notify.error(errorInfo.message);
                throw errorWithType;
            } else {
                notify.error(`Failed to sign in with Google: ${error.message}`);
                throw error;
            }
        }
    }
    
    async signInAnonymously() {
        try {
            const result = await auth.signInAnonymously();
            const user = result.user;
            
            if (!user) throw new Error('Anonymous sign-in failed');
            
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
                    onboardingCompleted: false
                });
                console.log('[Auth] Guest user created');
            }
            
            notify.success('Welcome, Guest!');
            
            if (ENV && ENV.DEBUG_MODE) {
                console.log('[Auth] Anonymous sign in successful');
            }
            
            return { user, isNewUser };
            
        } catch (error) {
            console.error('[Auth] Anonymous sign in error:', error);
            notify.error('Failed to continue as guest. Please try again.');
            throw error;
        }
    }
    
    async signOut() {
        try {
            await auth.signOut();
            notify.success('Signed out successfully');
            
        } catch (error) {
            console.error('[Auth] Sign out error:', error);
            notify.error('Failed to sign out');
            throw error;
        }
    }
    
    async hasCompletedOnboarding(uid) {
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists) {
                return userDoc.data().onboardingCompleted === true;
            }
            return false;
        } catch (error) {
            console.error('[Auth] Check onboarding error:', error);
            return false;
        }
    }
    
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
            
            if (ENV && ENV.DEBUG_MODE) {
                console.log('[Auth] Swipe history synced');
            }
            
        } catch (error) {
            console.error('[Auth] Sync error:', error);
        }
    }
    
    async addFriend(friendEmail) {
        if (!this.currentUser) {
            notify.error('You must be signed in to add friends');
            return;
        }
        
        try {
            const querySnapshot = await db.collection('users')
                .where('email', '==', friendEmail)
                .get();
            
            if (querySnapshot.empty) {
                notify.error('No user found with that email');
                return;
            }
            
            const friendDoc = querySnapshot.docs[0];
            const friendData = friendDoc.data();
            
            if (friendData.uid === this.currentUser.uid) {
                notify.error('You cannot add yourself as a friend');
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
            
            notify.success(`Added ${friendData.displayName} as a friend!`);
            
            if (ENV && ENV.DEBUG_MODE) {
                console.log('[Auth] Friend added:', friendEmail);
            }
            
        } catch (error) {
            console.error('[Auth] Add friend error:', error);
            notify.error('Failed to add friend');
        }
    }
    
    async createGroup(groupName, groupEmoji = 'Film') {
        if (!this.currentUser) {
            notify.error('You must be signed in to create groups');
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
            
            notify.success(`Group "${groupName}" created!`);
            
            if (ENV && ENV.DEBUG_MODE) {
                console.log('[Auth] Group created:', groupName);
            }
            
            return groupId;
            
        } catch (error) {
            console.error('[Auth] Create group error:', error);
            notify.error('Failed to create group');
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
