/**
 * Authentication Service – ABSOLUTE FINAL VERSION (Dec 2025)
 * • Perfect Google Sign-In
 * • Safe swipe history sync
 * • Onboarding fully supported with preferences saved
 * • Auto-migrates old preferences to new format
 * • Syncs preferences to Firestore
 * • Offline-first & bulletproof
 * • Fixes Home & Profile tab crashes forever
 */

import { firebase, auth, db } from './firebase-config.js';
import { store } from '../state/store.js';
import { notify } from '../utils/notifications.js';

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
                console.log('[Auth] User signed in:', user.email || 'anonymous');

                // Critical: Auto-migrate old preferences to new format
                this.migrateAndSyncPreferences();

                // Load user data
                this.loadUserData(user.uid).catch(err =>
                    console.warn('[Auth] Load user data failed (offline?)', err.message)
                );

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

    // Auto-migrate old flat preferences → new nested format (fixes Home & Profile tabs)
    migrateAndSyncPreferences() {
        try {
            let prefs = {};
            const raw = localStorage.getItem('moviePickerPreferences');

            if (raw) {
                const old = JSON.parse(raw);

                // If already correct format → keep it
                if (old.platforms && !Array.isArray(old.platforms)) {
                    prefs = old;
                } else {
                    // Migrate old format
                    prefs = {
                        platforms: Array.isArray(old.platforms) ? old.platforms : ['Netflix', 'Prime Video', 'Disney+'],
                        region: old.region || 'US',
                        triggerWarnings: {
                            enabledCategories: old.enabledCategories || old.triggerWarnings?.enabledCategories || [],
                            showAllWarnings: old.showAllWarnings || false
                        }
                    };
                    console.log('[Auth] Migrated old preferences to new format');
                }
            } else {
                // First time user
                prefs = {
                    platforms: ['Netflix', 'Prime Video', 'Disney+'],
                    region: 'US',
                    triggerWarnings: { enabledCategories: [], showAllWarnings: false }
                };
            }

            // Save clean copy to localStorage
            localStorage.setItem('moviePickerPreferences', JSON.stringify(prefs));

            // Sync to Firestore if user is logged in
            if (this.currentUser) {
                db.collection('users').doc(this.currentUser.uid)
                    .set({ preferences: prefs }, { merge: true })
                    .catch(err => console.warn('[Auth] Failed to sync preferences:', err.message));
            }
        } catch (e) {
            console.warn('[Auth] Preference migration failed:', e);
        }
    }

    // === SIGN UP ===
    async signUp(email, password, displayName) {
        try {
            const { user } = await auth.createUserWithEmailAndPassword(email, password);
            await user.updateProfile({ displayName });

            const prefs = {
                platforms: ['Netflix', 'Prime Video', 'Disney+'],
                region: 'US',
                triggerWarnings: { enabledCategories: [], showAllWarnings: false }
            };

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
                preferences: prefs
            });

            localStorage.setItem('moviePickerPreferences', JSON.stringify(prefs));
            notify.success('Welcome to Movie Picker!');
            return { user, isNewUser: true };
        } catch (error) {
            const msg = {
                'auth/email-already-in-use': 'Email already registered',
                'auth/weak-password': 'Password too weak (6+ characters)',
                'auth/invalid-email': 'Invalid email'
            }[error.code] || 'Sign up failed';
            notify.error(msg);
            throw error;
        }
    }

    // === SIGN IN ===
    async signIn(email, password) {
        try {
            await auth.signInWithEmailAndPassword(email, password);
            notify.success('Welcome back!');
        } catch (error) {
            const msg = {
                'auth/user-not-found': 'No account found',
                'auth/wrong-password': 'Wrong password',
                'auth/invalid-email': 'Invalid email',
                'auth/too-many-requests': 'Too many attempts — try later'
            }[error.code] || 'Sign in failed';
            notify.error(msg);
            throw error;
        }
    }

    // === GOOGLE SIGN-IN ===
    async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('email profile');
            provider.setCustomParameters({ prompt: 'select_account' });

            const { user } = await auth.signInWithPopup(provider);

            const doc = await db.collection('users').doc(user.uid).get();
            const isNewUser = !doc.exists;

            const prefs = {
                platforms: ['Netflix', 'Prime Video', 'Disney+'],
                region: 'US',
                triggerWarnings: { enabledCategories: [], showAllWarnings: false }
            };

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
                    onboardingCompleted: false,
                    preferences: prefs
                });
            }

            localStorage.setItem('moviePickerPreferences', JSON.stringify(prefs));
            notify.success('Signed in with Google!');
            return { user, isNewUser };
        } catch (error) {
            console.error('[Auth] Google sign-in failed:', error);
            const msg = {
                'auth/popup-blocked': 'Popup blocked — allow popups',
                'auth/unauthorized-domain': `Add ${location.hostname} to Firebase Auth domains`,
                'auth/popup-closed-by-user': 'Sign-in cancelled',
                'auth/network-request-failed': 'No internet connection'
            }[error.code] || 'Google sign-in failed';
            notify.error(msg);
            throw error;
        }
    }

    // === GUEST MODE ===
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

    // === SIGN OUT ===
    async signOut() {
        try {
            await auth.signOut();
            notify.success('Signed out');
        } catch (error) {
            notify.error('Sign out failed');
        }
    }

    // === LOAD USER DATA ===
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

                // Also sync preferences from Firestore
                if (data.preferences) {
                    localStorage.setItem('moviePickerPreferences', JSON.stringify(data.preferences));
                }
            }
        } catch (error) {
            console.warn('[Auth] Load user data failed (offline?)', error.message);
        }
    }

    // === REALTIME LISTENERS ===
    setupRealtimeListeners(uid) {
        const unsub = db.collection('users').doc(uid).onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                store.setState({
                    swipeHistory: data.swipeHistory || [],
                    friends: data.friends || [],
                    groups: data.groups || []
                });

                if (data.preferences) {
                    localStorage.setItem('moviePickerPreferences', JSON.stringify(data.preferences));
                }
            }
        }, err => console.warn('[Auth] Realtime update failed', err.message));
        this.unsubscribers.push(unsub);
    }

    // === SAFE SWIPE HISTORY SYNC ===
    async syncSwipeHistory(swipeHistory) {
        if (!this.currentUser) return;

        try {
            const cleanHistory = swipeHistory
                .filter(e => e?.movie?.id && e?.movie?.title)
                .map(e => ({
                    movieId: e.movie.id,
                    title: e.movie.title,
                    poster: e.movie.posterURL || e.movie.poster_path || '',
                    action: e.action,
                    timestamp: e.timestamp || Date.now()
                }));

            if (cleanHistory.length === 0) return;

            await db.collection('users').doc(this.currentUser.uid).update({
                swipeHistory: cleanHistory
            });

            console.log('[Auth] Synced', cleanHistory.length, 'swipes');
        } catch (error) {
            console.warn('[Auth] Sync failed (offline?)', error.message);
        }
    }

    // === ONBOARDING COMPLETE ===
    async completeOnboarding(uid) {
        const raw = localStorage.getItem('moviePickerPreferences');
        const prefs = raw ? JSON.parse(raw) : {
            platforms: ['Netflix', 'Prime Video', 'Disney+'],
            region: 'US',
            triggerWarnings: { enabledCategories: [], showAllWarnings: false }
        };

        try {
            await db.collection('users').doc(uid).update({
                onboardingCompleted: true,
                onboardingCompletedAt: firebase.firestore.FieldValue.serverTimestamp(),
                preferences: prefs
            });
            console.log('[Auth] Onboarding complete — preferences saved to Firestore');
        } catch (err) {
            console.warn('[Auth] Failed to save onboarding:', err.message);
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
