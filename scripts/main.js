/**
 * MoviEase - Main Application Entry Point
 * Discover your next favorite film with ease
 * 
 * ✅ GOOGLE REDIRECT FIX: Properly waits for redirect to complete
 * ✅ Initializes TMDB and Firebase services
 * ✅ Handles auth state propagation
 */

import { ENV } from './config/env.js';
import { tmdbService } from './services/tmdb.js';
import { authService } from './services/auth-service.js';

console.log('🎬 MoviEase Starting...');
console.log('Environment:', ENV.APP_ENV);

// Initialize TMDB Service
async function initializeTMDB() {
    try {
        const success = await tmdbService.initialize(ENV.TMDB_API_KEY);
        if (success) {
            console.log('✅ TMDB Service initialized');
        } else {
            console.error('❌ TMDB Service failed to initialize');
        }
    } catch (error) {
        console.error('❌ TMDB initialization error:', error);
    }
}

// === UPDATED: Better Google redirect handling ===
async function initializeAuth() {
    try {
        console.log('[MoviEase] Checking for Google redirect result...');
        
        const redirectResult = await authService.handleRedirectResult();
        
        if (redirectResult) {
            console.log('[MoviEase] Google redirect successful:', redirectResult.user.email);
            // Give Firebase a moment to fully update auth state
            await new Promise(resolve => setTimeout(resolve, 800));
        } else {
            console.log('[MoviEase] No redirect result');
        }
        
        console.log('✅ Auth Service ready');
    } catch (error) {
        console.error('⚠️ Auth redirect handling failed:', error);
    }
}

// Start the app
async function startApp() {
    console.log('🚀 Initializing MoviEase services...');
    
    // ✅ Initialize auth FIRST and WAIT for it to complete
    await initializeAuth();
    
    // Then initialize TMDB (can happen in parallel now)
    await initializeTMDB();
    
    // ✅ Give auth state a moment to propagate
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Import and initialize the main app
    const { MoviePickerApp } = await import('./app-init.js');
    
    console.log('✅ MoviEase ready! Discover your next favorite film 🎬');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('[MoviEase] Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('[MoviEase] Unhandled promise rejection:', event.reason);
});
