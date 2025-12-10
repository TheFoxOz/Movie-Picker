/**
 * Authentication Service – FINAL FIXED VERSION (Dec 2025)
 * • No more "undefined" errors in Firestore
 * • Swipe history saves safely
 * • Offline-first & resilient
 * • Perfect Google Sign-In with your enhanced error messages
 */

import { firebase, auth, db } from './firebase-config.js';
import { store } from '../state/store.js';
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
                console.log('[Auth] User signed in:', user.email || user.email);

                try {
                    await this.loadUserData(user.uid);
                } catch (err) {
                    console.warn('[Auth] Failed to load user data (offline?)', err.message);
                    // Don't block login — we can work offline
                }

                this.setupRealtimeListeners(user.uid);

                store.setState({
                    userId: user.uid,
                    userEmail: user.email,
                    userName: user.displayName || user.email?.split('@')[0] || 'User',
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

                console.log('[Auth] User signed out');
            }
        });
    }

    async signUp(email, password, displayName) {
        try {
            const { user } = await auth.createUserWithEmailAndPassword(email, password);
            await user.updateProfile({ displayName });

            await db.collection('users').doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                displayName: displayName || user.email.split('@')[0],
                avatar: 'Smile',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                swipeHistory: [],
                friends: [],
                groups: [],
                onboardingCompleted: false,
                preferences: {
                    platforms: ['Netflix', 'Prime Video', 'Disney+'],
                    region: 'US',
                    triggerWarnings: {
                        enabledCategories: [],
                        showAllWarnings: false
                    }
                }
            });

            notify.success('Welcome to Movie Picker!');
            return { user, isNewUser: true };
        } catch (error) {
            const msg = {
                'auth/email-already-in-use': 'This email is already registered',
                'auth/weak-password': 'Password too weak (6+ chars)',
                'auth/invalid-email': 'Invalid email'
            }[error.code] || 'Sign up failed';

            notify.error(msg);
            throw error;
        }
    }

    async signIn(email, password) {
        try {
            await auth.signInWithEmailAndPassword(email, password);
            notify.success('Welcome back!');
        } catch (error) {
            const msg = {
                'auth/user-not-found': 'No account with this email',
                'auth/wrong-password': 'Wrong password',
                'auth/invalid-email': 'Invalid email',
                'auth/too-many-requests': 'Too many tries — wait a bit'
            }[error.code] || 'Sign in failed';

            notify.error(msg);
            throw error;
        }
    }

    async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('email profile');
            provider.setCustomParameters({ prompt: 'select_account' });

            const { user } = await auth.signInWithPopup(provider);

            const doc = await db.collection('users').doc(user.uid).get();
            const isNewUser = !doc.exists;

            if (isNewUser) {
                await db.collection('users').doc(user.uid).set({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || user.email.split('@')[0],
                    avatar: user.photoURL || 'Smile,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    swipeHistory: [],
                    friends: [],
                    groups: [],
                    onboardingCompleted: false,
                    preferences: {
                        platforms: ['Netflix', 'Prime Video', 'Disney+'],
                        region: 'US',
                        triggerWarnings: { enabledCategories: [], showAllWarnings: false }
                    }
                });
            }

            notify.success('Signed in with Google!');
            return { user, isNewUser };
        } catch (error) {
            console.error('[Auth] Google sign-in failed:', error);

            const messages = {
                'auth/popup-blocked': 'Pop-up blocked — allow pop-ups and try again',
                'auth/unauthorized-domain': `Domain not allowed. Add ${location.hostname} in Firebase Console → Auth → Settings`,
                'auth/popup-closed-by-user': 'Sign-in cancelled',
                'auth/network-request-failed': 'No internet — check connection'
            };

            notify.error(messages[error.code] || 'Google sign-in failed');
            throw error;
        }
    }

    async signInAnonymously() {
        try {
            const { user } = await auth.signInAnonymously();

            const doc = await db.collection('users').doc(user.uid).get();
            const isNewUser = !doc.exists;

            if (isNewUser) {
                await db.collection('users').doc(user.uid).set({
                    uid: user.uid,
                    email: null,
                    displayName: 'Guest',
                    avatar: 'Guest',
                    isAnonymous: true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    swipeHistory: [],
                    friends: [],
                    groups: [],
                    onboardingCompleted: false
                });
            }

            notify.success('Welcome, Guest!');
            return { user, isNewUser };
        } catch (error) {
            notify.error('Guest mode failed');
            throw error;
        }
    }

    async signOut() {
        try {
            await auth.signOut();
            notify.success('Signed out');
        } catch (error) {
            notify.error('Sign out failed');
        }
    }

    async loadUserData(uid) {
        try {
            const doc = await db.collection('users').doc(uid).get();
            if (doc.exists) {
                const data = doc.data();
                store.setState({
                    swipeHistory: data.swipeHistory || [],
                    friends: data.friends || [],
                    groups: data.groups || []
                });
            }
        } catch (error) {
            console.warn('[Auth] Could not load user data (offline?)', error.message);
            // Don't crash — offline is allowed
        }
    }

    setupRealtimeListeners(uid) {
        const unsub = db.collection('users').doc(uid).onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                store.setState({
                    swipeHistory: data.swipeHistory || [],
                    friends: data.friends || [],
                    groups: data.groups || []
                });
            }
        }, err => {
            console.warn('[Auth] Realtime listener failed (offline?)', err.message);
        });
        this.unsubscribers.push(unsub);
    }

    // FIXED: Only save safe, serializable data
    async syncSwipeHistory(swipeHistory) {
        if (!this.currentUser) return;

        try {
            const cleanHistory = swipeHistory.map(entry => ({
                movieId: entry.movie.id,
                title: entry.movie.title,
                poster: entry.movie.posterURL || entry.movie.poster_path || '',
                action: entry.action,
                timestamp: entry.timestamp
            }));

            await db.collection('users').doc(this.currentUser.uid).update({
                swipeHistory: cleanHistory
            });

            console.log('[Auth] Swipe history synced safely');
        } catch (error) {
            // This is non-critical — don't spam user
            console.warn('[Auth] Failed to sync swipe history (offline?)', error.message);
        }
    }

    getCurrentUser() { return this.currentUser; }
    isAuthenticated() { return !!this.currentUser; }

    cleanup() {
        this.unsubscribers.forEach(fn => fn());
        this.unsubscribers = [];
    }
}

export const authService = new AuthService();

