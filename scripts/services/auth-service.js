/**
 * Authentication Service – Firebase V10 Modernized
 * • Fixes Cross-Origin-Opener-Policy error for Google Sign-In (using redirect)
 * • Ensures all Firestore/Auth calls use modern v10 module syntax
 */

// ---------------------------------------------------------------------
// 1. Core Imports (Auth/DB Services)
// ---------------------------------------------------------------------

import { auth, db } from './firebase-config.js'; 
import { store } from '../state/store.js';
import { notify } from '../utils/notifications.js';


// ---------------------------------------------------------------------
// 2. Firebase v10 Auth Imports
// ---------------------------------------------------------------------

import { 
    GoogleAuthProvider, 
    signInWithRedirect,   // Used for the robust sign-in method
    getRedirectResult,    // Used to retrieve the result after redirect (CRITICAL)
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signInAnonymously, 
    signOut,
    updateProfile 
} from 'firebase/auth';


// ---------------------------------------------------------------------
// 3. Firebase v10 Firestore Imports
// ---------------------------------------------------------------------

import { 
    serverTimestamp,      // For storing creation timestamps
    doc,                  // For creating document references
    getDoc,               // For fetching a document once
    setDoc,               // For setting or merging document data
    updateDoc,            // For updating specific fields
    onSnapshot            // For realtime listeners
} from 'firebase/firestore';


// ---------------------------------------------------------------------
// 4. AuthService Class
// ---------------------------------------------------------------------

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

                this.migrateAndSyncPreferences();
                
                // Load user data (Note: loadUserData handles the doc(db, 'users', uid).get() internally)
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
                if (old.platforms && !Array.isArray(old.platforms)) {
                    prefs = old;
                } else {
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
                prefs = {
                    platforms: ['Netflix', 'Prime Video', 'Disney+'],
                    region: 'US',
                    triggerWarnings: { enabledCategories: [], showAllWarnings: false }
                };
            }

            localStorage.setItem('moviePickerPreferences', JSON.stringify(prefs));

            if (this.currentUser) {
                // Modern Firestore: doc, setDoc
                const userRef = doc(db, 'users', this.currentUser.uid);
                setDoc(userRef, { preferences: prefs }, { merge: true })
                    .catch(err => console.warn('[Auth] Failed to sync preferences:', err.message));
            }
        } catch (e) {
            console.warn('[Auth] Preference migration failed:', e);
        }
    }

    // === SIGN UP ===
    async signUp(email, password, displayName) {
        try {
            // Modern Auth: createUserWithEmailAndPassword, updateProfile
            const { user } = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(user, { displayName });

            const prefs = {
                platforms: ['Netflix', 'Prime Video', 'Disney+'],
                region: 'US',
                triggerWarnings: { enabledCategories: [], showAllWarnings: false }
            };
            
            // Modern Firestore: doc, setDoc, serverTimestamp
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: displayName || user.email.split('@')[0],
                avatar: 'Smile',
                createdAt: serverTimestamp(),
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
            // Modern Auth: signInWithEmailAndPassword
            await signInWithEmailAndPassword(auth, email, password);
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

    // === GOOGLE SIGN-IN (Redirect Method FIX) ===
    async signInWithGoogle() {
        try {
            const provider = new GoogleAuthProvider();
            provider.addScope('email profile');
            provider.setCustomParameters({ prompt: 'select_account' });

            // CRITICAL FIX: Use redirect instead of popup to avoid COOP errors
            await signInWithRedirect(auth, provider);
            // Execution stops here. The app will reload after redirect.

        } catch (error) {
            console.error('[Auth] Google sign-in failed during redirect setup:', error);
            const msg = {
                'auth/network-request-failed': 'No internet connection'
            }[error.code] || 'Google sign-in failed to initialize.';
            notify.error(msg);
            throw error;
        }
    }
    
    // === HANDLE REDIRECT RESULT (CRITICAL: Must be called on app startup) ===
    async handleRedirectResult() {
        try {
            // Modern Auth: getRedirectResult
            const result = await getRedirectResult(auth);

            if (result) {
                // User signed in successfully via redirect
                const { user } = result;

                // Modern Firestore: doc, getDoc
                const userRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userRef);
                const isNewUser = !userDoc.exists;

                const prefs = {
                    platforms: ['Netflix', 'Prime Video', 'Disney+'],
                    region: 'US',
                    triggerWarnings: { enabledCategories: [], showAllWarnings: false }
                };

                if (isNewUser) {
                    // Modern Firestore: setDoc, serverTimestamp
                    await setDoc(userRef, {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName || user.email.split('@')[0],
                        avatar: user.photoURL || 'Smile',
                        createdAt: serverTimestamp(),
                        swipeHistory: [],
                        friends: [],
                        groups: [],
                        onboardingCompleted: false,
                        preferences: prefs
                    });
                }

                localStorage.setItem('moviePickerPreferences', JSON.stringify(prefs));
                // Note: The auth listener will automatically handle the store update and navigation
                return { user, isNewUser };
            }
            return null; 

        } catch (error) {
            console.error('[Auth] Error handling redirect result:', error);
            const msg = {
                'auth/account-exists-with-different-credential': 'Account exists with a different sign-in method.',
                'auth/popup-closed-by-user': 'Sign-in cancelled',
                'auth/network-request-failed': 'No internet connection'
            }[error.code] || 'Google sign-in failed on redirect.';
            notify.error(msg);
            throw error;
        }
    }

    // === GUEST MODE ===
    async signInAnonymously() {
        try {
            // Modern Auth: signInAnonymously
            const { user } = await signInAnonymously(auth);
            
            // Modern Firestore: doc, getDoc
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            const isNewUser = !userDoc.exists;

            if (isNewUser) {
                // Modern Firestore: setDoc, serverTimestamp
                await setDoc(userRef, {
                    uid: user.uid,
                    email: null,
                    displayName: 'Guest',
                    avatar: 'Guest',
                    isAnonymous: true,
                    createdAt: serverTimestamp(),
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
            console.error('[Auth] Anonymous sign-in failed:', error);
            throw error;
        }
    }

    // === SIGN OUT ===
    async signOut() {
        try {
            // Modern Auth: signOut
            await signOut(auth);
            notify.success('Signed out');
        } catch (error) {
            notify.error('Sign out failed');
        }
    }

    // === LOAD USER DATA ===
    async loadUserData(uid) {
        try {
            // Modern Firestore: doc, getDoc
            const userRef = doc(db, 'users', uid);
            const docSnapshot = await getDoc(userRef);
            
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                store.setState({
                    swipeHistory: data.swipeHistory || [],
                    friends: data.friends || [],
                    groups: data.groups || []
                });

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
        // Modern Firestore: doc, onSnapshot
        const userRef = doc(db, 'users', uid);
        const unsub = onSnapshot(userRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
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

            // Modern Firestore: doc, updateDoc
            const userRef = doc(db, 'users', this.currentUser.uid);
            await updateDoc(userRef, {
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
            // Modern Firestore: doc, updateDoc, serverTimestamp
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, {
                onboardingCompleted: true,
                onboardingCompletedAt: serverTimestamp(),
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
