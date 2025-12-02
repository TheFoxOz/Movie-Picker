/**
 * Authentication Service
 * Handles user sign up, sign in, and authentication state
 */

import { auth, db } from './firebase-config.js';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.unsubscribe = null;
  }
  
  /**
   * Sign up with email and password
   */
  async signUp(email, password, displayName) {
    try {
      console.log('[Auth] Creating account for:', email);
      
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile with display name
      await updateProfile(user, {
        displayName: displayName
      });
      
      // Create user profile in Firestore
      await this.createUserProfile(user.uid, {
        name: displayName,
        email: email,
        avatar: '😊'
      });
      
      console.log('[Auth] ✅ Account created successfully');
      return user;
      
    } catch (error) {
      console.error('[Auth] Sign up error:', error);
      throw this.formatError(error);
    }
  }
  
  /**
   * Sign in with email and password
   */
  async signIn(email, password) {
    try {
      console.log('[Auth] Signing in:', email);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('[Auth] ✅ Signed in successfully');
      return userCredential.user;
      
    } catch (error) {
      console.error('[Auth] Sign in error:', error);
      throw this.formatError(error);
    }
  }
  
  /**
   * Sign in with Google
   */
  async signInWithGoogle() {
    try {
      console.log('[Auth] Starting Google sign in...');
      
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      // Check if this is first time sign in
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        // Create profile for new Google user
        await this.createUserProfile(user.uid, {
          name: user.displayName || 'User',
          email: user.email,
          avatar: user.photoURL || '😊'
        });
      }
      
      console.log('[Auth] ✅ Google sign in successful');
      return user;
      
    } catch (error) {
      console.error('[Auth] Google sign in error:', error);
      throw this.formatError(error);
    }
  }
  
  /**
   * Sign out
   */
  async signOut() {
    try {
      console.log('[Auth] Signing out...');
      await firebaseSignOut(auth);
      console.log('[Auth] ✅ Signed out successfully');
    } catch (error) {
      console.error('[Auth] Sign out error:', error);
      throw error;
    }
  }
  
  /**
   * Listen to authentication state changes
   */
  onAuthStateChange(callback) {
    this.unsubscribe = onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      console.log('[Auth] Auth state changed:', user ? user.email : 'No user');
      callback(user);
    });
    return this.unsubscribe;
  }
  
  /**
   * Stop listening to auth state changes
   */
  stopListening() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
  
  /**
   * Get current user
   */
  getCurrentUser() {
    return auth.currentUser || this.currentUser;
  }
  
  /**
   * Create user profile in Firestore
   */
  async createUserProfile(userId, data) {
    try {
      console.log('[Auth] Creating user profile in Firestore...');
      
      await setDoc(doc(db, 'users', userId), {
        name: data.name,
        email: data.email,
        avatar: data.avatar,
        createdAt: serverTimestamp(),
        friends: [],
        groups: [],
        stats: {
          moviesRated: 0,
          friendsCount: 0,
          groupsCount: 0
        }
      });
      
      console.log('[Auth] ✅ User profile created');
    } catch (error) {
      console.error('[Auth] Error creating profile:', error);
      throw error;
    }
  }
  
  /**
   * Format Firebase error messages to be user-friendly
   */
  formatError(error) {
    const errorMessages = {
      'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/operation-not-allowed': 'Email/password accounts are not enabled.',
      'auth/weak-password': 'Password should be at least 6 characters.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-credential': 'Invalid email or password.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/popup-closed-by-user': 'Sign-in cancelled.',
      'auth/cancelled-popup-request': 'Sign-in cancelled.'
    };
    
    const message = errorMessages[error.code] || error.message || 'An error occurred. Please try again.';
    return new Error(message);
  }
}

// Export singleton instance
export const authService = new AuthService();
