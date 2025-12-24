/**
 * MoviEase - Main Application Entry Point
 * Discover your next favorite film with ease
 * 
 * ✅ FIXED: Proper auth initialization sequence
 * ✅ FIXED: Google redirect handled before auth listener
 * ✅ FIXED: Create account functionality added
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

// ✅ FIXED: Initialize auth with proper sequence
async function initializeAuth() {
    try {
        console.log('[MoviEase] Initializing auth service...');
        
        // ✅ CRITICAL: This checks redirect BEFORE setting up auth listener
        await authService.initialize();
        
        console.log('[MoviEase] ✅ Auth Service ready');
    } catch (error) {
        console.error('⚠️ Auth initialization failed:', error);
    }
}

// Start the app
async function startApp() {
    console.log('🚀 Initializing MoviEase services...');
    
    // ✅ Initialize auth FIRST (handles Google redirect)
    await initializeAuth();
    
    // Then initialize TMDB
    await initializeTMDB();
    
    // ✅ Give auth state a moment to propagate
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Import and start the app
    const { MoviEaseApp } = await import('./app-init.js');
    const app = new MoviEaseApp();
    await app.init();
    
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
