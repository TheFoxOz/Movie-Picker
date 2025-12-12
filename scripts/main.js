/**
 * Main Application Entry Point
 * Initializes the entire Movie Picker app
 */

import { ENV } from './config/env.js';
import { tmdbService } from './services/tmdb.js';
import { authService } from './services/auth-service.js';

console.log('🎬 Movie Picker Starting...');
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

// Initialize Firebase Auth
async function initializeAuth() {
    try {
        // Check for redirect result (Google Sign-In)
        await authService.handleRedirectResult();
        console.log('✅ Auth Service initialized');
    } catch (error) {
        console.error('⚠️ Auth redirect handling failed:', error);
    }
}

// Start the app
async function startApp() {
    console.log('🚀 Initializing services...');
    
    await Promise.all([
        initializeTMDB(),
        initializeAuth()
    ]);
    
    // Import and initialize the main app
    const { MoviePickerApp } = await import('./app-init.js');
    
    console.log('✅ Movie Picker ready!');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
