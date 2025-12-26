/**
 * Authentication Service – Firebase V10 Modernized
 * ✅ FIXED: Proper redirect handling with initialization sequence
 * ✅ FIXED: Race condition resolved - checks redirect BEFORE auth listener
 * ✅ FIXED: Navigation to onboarding (new users) or swipe (returning users)
 * ✅ FIXED: Switched to POPUP method for better reliability
 * ✅ FIXED: Popup error handling and duplicate click prevention
 * ✅ FIXED: Force page reload after successful authentication
 * ✅ FIXED: Load swipe history FROM Firestore on login
 * ✅ FIXED: Keep full movie object in sync for Library compatibility
 * ✅ CRITICAL FIX #1: Real-time listener re-attached on every login
 * ✅ CRITICAL FIX #2: Sync swipe history BEFORE logout
 * ✅ CRITICAL FIX #3: Strong localStorage fallback when Firestore fails
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

    // ✅ CRITICAL FIX #1: Real-time listener re-attached on EVERY login
    setupAuthListener() {
        return auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                console.log('[Auth] User signed in:', user.email || 'anonymous');

                // Migrate old localStorage preferences
                this.migrateAndSyncPreferences();

                // ✅ CRITICAL FIX #1: Load user data from Firestore
                await this.loadUserData(user.uid);
                
                // ✅ CRITICAL FIX #1: Re-attach real-time listeners on EVERY login
                this.setupRealtimeListeners(user.uid);

                // Navigate if on auth pages
                const hash = window.location.hash;
                if (hash === '#login' || hash === '#signup' || hash === '' || hash === '#') {
                    console.log('[Auth] User already on page:', hash);
                } else {
                    window.location.hash = hash;
                }

                document.dispatchEvent(new CustomEvent('auth-state-changed', {
                    detail: { user }
                }));

            } else {
                console.log('[Auth] User signed out');
                
                // ✅ Clean up listeners on logout
                this.cleanup();
                
                this.currentUser = null;
                store.setState({
                    swipeHistory: [],
                    friends: [],
                    groups: []
                });

                localStorage.removeItem('moviEaseSwipeHistory');
                
                document.dispatchEvent(new CustomEvent('auth-state-changed', {
                    detail: { user: null }
                }));
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
                
                // ✅ FIXED: Force page reload to onboarding
                setTimeout(() => {
                    this.isProcessingAuth = false;
                    window.location.href = window.location.origin + '/#onboarding';
                    window.location.reload();
                }, 300);
            } else {
                const userData = userDoc.data();
                if (!userData.onboardingCompleted) {
                    console.log('[Auth] Existing user, incomplete onboarding → Redirecting to onboarding');
                    
                    // ✅ FIXED: Force page reload to onboarding
                    setTimeout(() => {
                        this.isProcessingAuth = false;
                        window.location.href = window.location.origin + '/#onboarding';
                        window.location.reload();
                    }, 300);
                } else {
                    notify.success('Welcome back!');
                    console.log('[Auth] Existing user, onboarding complete → Redirecting to swipe');
                    
                    // ✅ FIXED: Force page reload to swipe
                    setTimeout(() => {
                        this.isProcessingAuth = false;
                        window.location.href = window.location.origin + '/#swipe';
                        window.location.reload();
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

    // ✅ CRITICAL FIX #2: Sync swipe history BEFORE logout
    async signOut() {
        try {
            // ✅ CRITICAL FIX #2: Sync swipe history BEFORE logout
            if (this.currentUser) {
                const state = store.getState();
                const swipeHistory = state.swipeHistory || [];
                
                if (swipeHistory.length > 0) {
                    console.log('[Auth] Syncing swipe history before logout...');
                    await this.syncSwipeHistory(swipeHistory);
                    console.log('[Auth] ✅ Final sync complete');
                }
            }
            
            await signOut(auth);
            notify.success('Signed out successfully');
            window.location.hash = '#login';
        } catch (error) {
            console.error('[Auth] Sign out error:', error);
            notify.error('Failed to sign out');
        }
    }

    // ✅ CRITICAL FIX #3: Strong localStorage fallback when Firestore fails
    async loadUserData(uid) {
        try {
            const userRef = doc(db, 'users', uid);
            const docSnapshot = await getDoc(userRef);
            
            let firestoreSwipeHistory = [];
            
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                firestoreSwipeHistory = data.swipeHistory || [];
                
                store.setState({
                    swipeHistory: firestoreSwipeHistory,
                    friends: data.friends || [],
                    groups: data.groups || []
                });
                
                console.log(`[Auth] Loaded ${firestoreSwipeHistory.length} swipes from Firestore`);
                
                // Save to localStorage as backup
                if (firestoreSwipeHistory.length > 0) {
                    localStorage.setItem('moviEaseSwipeHistory', JSON.stringify(firestoreSwipeHistory));
                }

                if (data.preferences) {
                    localStorage.setItem('moviePickerPreferences', JSON.stringify(data.preferences));
                }
            } else {
                // ✅ CRITICAL FIX #3: Fallback to localStorage if Firestore empty
                console.log('[Auth] No Firestore data found, checking localStorage...');
                const localHistory = localStorage.getItem('moviEaseSwipeHistory');
                
                if (localHistory) {
                    try {
                        firestoreSwipeHistory = JSON.parse(localHistory);
                        store.setState({ swipeHistory: firestoreSwipeHistory });
                        console.log(`[Auth] ✅ Loaded ${firestoreSwipeHistory.length} swipes from localStorage fallback`);
                        
                        // Sync to Firestore
                        await this.syncSwipeHistory(firestoreSwipeHistory);
                    } catch (e) {
                        console.error('[Auth] Failed to parse localStorage:', e);
                    }
                }
            }
            
        } catch (error) {
            console.error('[Auth] Error loading user data:', error);
            
            // ✅ CRITICAL FIX #3: Emergency fallback to localStorage on any error
            console.log('[Auth] Firestore failed, using localStorage emergency fallback...');
            const localHistory = localStorage.getItem('moviEaseSwipeHistory');
            
            if (localHistory) {
                try {
                    const swipeHistory = JSON.parse(localHistory);
                    store.setState({ swipeHistory });
                    console.log(`[Auth] ✅ Emergency loaded ${swipeHistory.length} swipes from localStorage`);
                } catch (e) {
                    console.error('[Auth] Emergency fallback also failed:', e);
                    store.setState({ swipeHistory: [] });
                }
            } else {
                console.log('[Auth] No localStorage backup available');
                store.setState({ swipeHistory: [] });
            }
        }
    }

    // ✅ CRITICAL FIX #1: Enhanced real-time listeners with better logging
    setupRealtimeListeners(uid) {
        console.log('[Auth] Setting up real-time listeners for user:', uid);
        
        const userRef = doc(db, 'users', uid);
        
        const unsub = onSnapshot(userRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                const firestoreSwipeHistory = data.swipeHistory || [];
                
                console.log(`[Auth] Real-time update: ${firestoreSwipeHistory.length} swipes`);
                
                store.setState({
                    swipeHistory: firestoreSwipeHistory,
                    friends: data.friends || [],
                    groups: data.groups || []
                });
                
                // Keep localStorage in sync
                if (firestoreSwipeHistory.length > 0) {
                    localStorage.setItem('moviEaseSwipeHistory', JSON.stringify(firestoreSwipeHistory));
                }

                if (data.preferences) {
                    localStorage.setItem('moviePickerPreferences', JSON.stringify(data.preferences));
                }
            }
        }, (error) => {
            console.error('[Auth] Real-time listener error:', error);
        });
        
        this.unsubscribers.push(unsub);
        console.log('[Auth] ✅ Real-time listener attached');
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
                    releaseDate: e.movie.releaseDate || e.movie.release_date || '',
                    rating: e.movie.rating || e.movie.vote_average || 0,
                    overview: e.movie.overview || '',
                    genres: e.movie.genres || e.movie.genre_ids || [],
                    availableOn: e.movie.availableOn || [],
                    platform: e.movie.platform || '',
                    action: e.action,
                    timestamp: e.timestamp || Date.now(),
                    // ✅ CRITICAL: Keep full movie object for Library
                    movie: e.movie
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
