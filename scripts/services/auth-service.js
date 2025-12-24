/**
 * Authentication Service – Firebase V10 Modernized
 * ✅ FIXED: Proper redirect handling with initialization sequence
 * ✅ FIXED: Race condition resolved - checks redirect BEFORE auth listener
 * ✅ FIXED: Navigation to onboarding (new users) or swipe (returning users)
 * ✅ FIXED: Switched to POPUP method for better reliability
 * ✅ FIXED: Popup error handling and duplicate click prevention
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
    signInWithPopup,
    getRedirectResult,
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signInAnonymously, 
    signOut,
    updateProfile,
    setPersistence,
    browserLocalPersistence
} from 'firebase/auth';

// ---------------------------------------------------------------------
// 3. Firebase v10 Firestore Imports
// ---------------------------------------------------------------------

import { 
    serverTimestamp,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    onSnapshot
} from 'firebase/firestore';

// ✅ Set persistence mode explicitly
setPersistence(auth, browserLocalPersistence)
    .then(() => {
        console.log('[Auth] ✅ Persistence set to LOCAL');
    })
    .catch((error) => {
        console.error('[Auth] ❌ Failed to set persistence:', error);
    });

// ---------------------------------------------------------------------
// 4. AuthService Class
// ---------------------------------------------------------------------

class AuthService {
    constructor() {
        this.currentUser = null;
        this.unsubscribers = [];
        this.redirectResultChecked = false;
        this.isProcessingAuth = false;
    }

    // ✅ NEW: Initialize auth service (call this first!)
    async initialize() {
        console.log('[Auth] Initializing auth service...');
        
        // ✅ Check for any pending redirect (for backward compatibility)
        try {
            await this.handleRedirectResult();
        } catch (error) {
            console.error('[Auth] Error handling redirect:', error);
        }
        
        // ✅ Setup auth listener
        this.setupAuthListener();
    }

    setupAuthListener() {
        auth.onAuthStateChanged(async (user) => {
            console.log('[Auth] Auth state changed:', user ? (user.email || 'anonymous') : 'signed out');
            
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

                // ✅ Only auto-redirect if NOT in the middle of processing auth
                if (this.redirectResultChecked && !this.isProcessingAuth) {
                    const currentHash = window.location.hash;
                    
                    // ✅ Don't redirect if already on a valid page
                    if (!currentHash || currentHash === '#' || currentHash === '#login') {
                        console.log('[Auth] User signed in, checking navigation...');
                        await this.handleAuthRedirect(user);
                    } else {
                        console.log('[Auth] User already on page:', currentHash);
                    }
                } else if (this.isProcessingAuth) {
                    console.log('[Auth] Auth already handled, skipping auto-navigation');
                } else {
                    console.log('[Auth] Waiting for auth check to complete...');
                }
            } else {
                // ✅ Only process signout if we've already checked for redirect
                if (this.redirectResultChecked) {
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
                        console.log('[Auth] Redirecting to login...');
                        window.location.hash = '#login';
                    }
                } else {
                    console.log('[Auth] No user, but auth check not complete yet...');
                }
            }
        });
    }

    // ✅ Handle post-authentication redirect
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

    // Auto-migrate old flat preferences → new nested format
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
                onboardingCompleted: false,
                preferences: prefs
            });

            localStorage.setItem('moviePickerPreferences', JSON.stringify(prefs));
            notify.success('Welcome to MoviEase!');
            
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
        } catch (error) {
            const msg = {
                'auth/user-not-found': 'No account found',
                'auth/wrong-password': 'Wrong password',
                'auth/invalid-email': 'Invalid email',
                'auth/too-many-requests': 'Too many attempts — try later',
                'auth/invalid-credential': 'Invalid email or password'
            }[error.code] || 'Sign in failed';
            notify.error(msg);
            throw error;
        }
    }

    // === GOOGLE SIGN-IN (Popup Method - More Reliable) ===
    async signInWithGoogle() {
        try {
            const provider = new GoogleAuthProvider();
            provider.addScope('email profile');
            provider.setCustomParameters({ prompt: 'select_account' });

            console.log('[Auth] Initiating Google sign-in popup...');
            
            // ✅ Set flag BEFORE calling popup
            this.isProcessingAuth = true;
            
            let result;
            try {
                result = await signInWithPopup(auth, provider);
            } catch (popupError) {
                this.isProcessingAuth = false;
                
                // Handle user closing popup (not an error)
                if (popupError.code === 'auth/popup-closed-by-user' || 
                    popupError.code === 'auth/cancelled-popup-request') {
                    console.log('[Auth] User closed popup');
                    return null;
                }
                
                throw popupError;
            }
            
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
                    onboardingCompleted: false,
                    preferences: prefs
                });
                
                localStorage.setItem('moviePickerPreferences', JSON.stringify(prefs));
                notify.success('Welcome to MoviEase!');
                
                console.log('[Auth] New Google user → Redirecting to onboarding');
                
                // ✅ Small delay to let auth state settle
                setTimeout(() => {
                    this.isProcessingAuth = false;
                    window.location.hash = '#onboarding';
                }, 300);
            } else {
                const userData = userDoc.data();
                if (!userData.onboardingCompleted) {
                    console.log('[Auth] Existing user, incomplete onboarding → Redirecting to onboarding');
                    
                    setTimeout(() => {
                        this.isProcessingAuth = false;
                        window.location.hash = '#onboarding';
                    }, 300);
                } else {
                    notify.success('Welcome back!');
                    console.log('[Auth] Existing user, onboarding complete → Redirecting to swipe');
                    
                    setTimeout(() => {
                        this.isProcessingAuth = false;
                        window.location.hash = '#swipe';
                    }, 300);
                }
            }

            return { user, isNewUser };

        } catch (error) {
            this.isProcessingAuth = false;
            console.error('[Auth] Google sign-in failed:', error);
            
            const msg = {
                'auth/network-request-failed': 'No internet connection',
                'auth/popup-blocked': 'Please allow popups for this site',
                'auth/unauthorized-domain': 'This domain is not authorized. Please contact support.',
                'auth/account-exists-with-different-credential': 'Account exists with a different sign-in method.'
            }[error.code] || 'Google sign-in failed.';
            
            notify.error(msg);
            throw error;
        }
    }
    
    // === HANDLE REDIRECT RESULT (For backward compatibility) ===
    async handleRedirectResult() {
        try {
            console.log('[Auth] Checking for redirect result...');
            
            // ✅ Wait for Firebase to be ready
            await new Promise(resolve => setTimeout(resolve, 200));
            
            const result = await getRedirectResult(auth);

            // ✅ Mark that we've checked
            this.redirectResultChecked = true;

            if (result) {
                const { user } = result;
                console.log('[Auth] ✅ Google sign-in successful (redirect):', user.email);

                this.isProcessingAuth = true;
                
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
                        onboardingCompleted: false,
                        preferences: prefs
                    });
                    
                    localStorage.setItem('moviePickerPreferences', JSON.stringify(prefs));
                    
                    console.log('[Auth] New Google user → Redirecting to onboarding');
                    await new Promise(resolve => setTimeout(resolve, 500));
                    window.location.hash = '#onboarding';
                } else {
                    const userData = userDoc.data();
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    if (!userData.onboardingCompleted) {
                        console.log('[Auth] Existing user, incomplete onboarding → Redirecting to onboarding');
                        window.location.hash = '#onboarding';
                    } else {
                        console.log('[Auth] Existing user, onboarding complete → Redirecting to swipe');
                        window.location.hash = '#swipe';
                    }
                }

                this.isProcessingAuth = false;
                return { user, isNewUser };
            } else {
                console.log('[Auth] No redirect result found (using popup method)');
            }
            return null; 

        } catch (error) {
            this.redirectResultChecked = true;
            this.isProcessingAuth = false;
            
            // ✅ Only log error if it's not a "no redirect" scenario
            if (error.code && error.code !== 'auth/invalid-api-key') {
                console.error('[Auth] Error handling redirect result:', error);
                
                const msg = {
                    'auth/account-exists-with-different-credential': 'Account exists with a different sign-in method.',
                    'auth/network-request-failed': 'No internet connection'
                }[error.code];
                
                if (msg) notify.error(msg);
            }
            
            return null;
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
                    onboardingCompleted: false
                });
            }

            notify.success('Welcome, Guest!');
            
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
                onboardingCompleted: true,
                onboardingCompletedAt: serverTimestamp(),
                preferences: prefs
            });
            console.log('[Auth] ✅ Onboarding complete — preferences saved to Firestore');
            
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

// ✅ Create instance but DON'T call setupAuthListener yet
const authService = new AuthService();

export { authService };
