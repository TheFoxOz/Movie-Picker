/**
 * Authentication Service – Firebase V10 Modernized
 * ✅ FIXED: Proper redirect handling after Google sign-in
 * ✅ FIXED: Navigation to onboarding (new users) or swipe (returning users)
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

                // ✅ NEW: Auto-redirect logic (only if on login/landing page)
                const currentHash = window.location.hash;
                if (!currentHash || currentHash === '#' || currentHash === '#login') {
                    await this.handleAuthRedirect(user);
                }
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

                // Redirect to login only if not already there
                const currentHash = window.location.hash;
                if (currentHash && currentHash !== '#login' && currentHash !== '#') {
                    window.location.hash = '#login';
                }
            }
        });
    }

    // ✅ NEW: Handle post-authentication redirect
    async handleAuthRedirect(user) {
        console.log('[Auth] Handling redirect for user:', user.email || 'anonymous');
        
        try {
            // Check if user has completed onboarding
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            const userData = userDoc.data();
            
            // New user or hasn't completed onboarding
            if (!userDoc.exists() || !userData?.onboardingCompleted) {
                console.log('[Auth] New user or incomplete onboarding → Redirecting to onboarding');
                window.location.hash = '#onboarding';
                return;
            }
            
            // Returning user with completed onboarding
            console.log('[Auth] Returning user → Redirecting to swipe');
            window.location.hash = '#swipe';
            
        } catch (error) {
            console.error('[Auth] Error checking user data:', error);
            // Default to onboarding on error (safe fallback)
            window.location.hash = '#onboarding';
        }
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
            const { user } = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(user, { displayName });

            const prefs = {
                platforms: ['Netflix', 'Prime Video', 'Disney+'],
                region: 'US',
                triggerWarnings: { enabledCategories: [], showAllWarnings: false }
            };
            
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
                onboardingCompleted: false,  // ← CRITICAL for redirect logic
                preferences: prefs
            });

            localStorage.setItem('moviePickerPreferences', JSON.stringify(prefs));
            notify.success('Welcome to Movie Picker!');
            
            // ✅ NEW: Redirect to onboarding for new signups
            window.location.hash = '#onboarding';
            
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
            await signInWithEmailAndPassword(auth, email, password);
            notify.success('Welcome back!');
            // ✅ Redirect handled by onAuthStateChanged → handleAuthRedirect
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

            console.log('[Auth] Initiating Google sign-in redirect...');
            
            // CRITICAL: Use redirect instead of popup to avoid COOP errors
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
            console.log('[Auth] Checking for redirect result...');
            const result = await getRedirectResult(auth);

            if (result) {
                // User signed in successfully via redirect
                const { user } = result;
                console.log('[Auth] ✅ Google sign-in successful:', user.email);

                const userRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userRef);
                const isNewUser = !userDoc.exists();

                const prefs = {
                    platforms: ['Netflix', 'Prime Video', 'Disney+'],
                    region: 'US',
                    triggerWarnings: { enabledCategories: [], showAllWarnings: false }
                };

                if (isNewUser) {
                    console.log('[Auth] New Google user, creating profile...');
                    await setDoc(userRef, {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName || user.email.split('@')[0],
                        avatar: user.photoURL || 'Smile',
                        createdAt: serverTimestamp(),
                        swipeHistory: [],
                        friends: [],
                        groups: [],
                        onboardingCompleted: false,  // ← CRITICAL for redirect logic
                        preferences: prefs
                    });
                    
                    localStorage.setItem('moviePickerPreferences', JSON.stringify(prefs));
                    
                    // ✅ NEW: Redirect new Google users to onboarding
                    console.log('[Auth] New Google user → Redirecting to onboarding');
                    window.location.hash = '#onboarding';
                } else {
                    // ✅ Existing user - redirect handled by handleAuthRedirect in onAuthStateChanged
                    console.log('[Auth] Existing Google user, redirect will be handled by auth listener');
                }

                return { user, isNewUser };
            } else {
                console.log('[Auth] No redirect result found (normal page load)');
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
            const { user } = await signInAnonymously(auth);
            console.log('[Auth] Guest sign-in successful');
            
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            const isNewUser = !userDoc.exists();

            if (isNewUser) {
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
                    onboardingCompleted: false  // ← CRITICAL for redirect logic
                });
            }

            notify.success('Welcome, Guest!');
            
            // ✅ NEW: Guest users always go to onboarding
            console.log('[Auth] Guest user → Redirecting to onboarding');
            window.location.hash = '#onboarding';
            
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
            await signOut(auth);
            notify.success('Signed out');
            window.location.hash = '#login';
        } catch (error) {
            notify.error('Sign out failed');
        }
    }

    // === LOAD USER DATA ===
    async loadUserData(uid) {
        try {
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
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, {
                onboardingCompleted: true,  // ← CRITICAL: Marks user as having finished onboarding
                onboardingCompletedAt: serverTimestamp(),
                preferences: prefs
            });
            console.log('[Auth] Onboarding complete — preferences saved to Firestore');
            
            // ✅ NEW: Redirect to swipe page after onboarding
            window.location.hash = '#swipe';
            
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
