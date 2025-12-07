/**
 * Environment Configuration
 * 🔒 SECURITY: This file contains your actual API keys
 * This is a TEMPLATE - copy and replace with your real keys
 */

export const ENV = {
    // TMDB API Key
    TMDB_API_KEY: 'fb172ed62b2cd58897d484ad8ba0cf60',  // Replace with your key
    
    // DoesTheDogDie API Key  
    DTD_API_KEY: '8422ca0f3512e1d0cb973215099d0f20',  // Replace with your NEW key (old one exposed)
    
    // Firebase Configuration
    FIREBASE: {
        apiKey: "AIzaSyDTCfzxBvYDRCB5LmLaTm5NrBZMkEb52yE",
        authDomain: "movie-picker-19390.firebaseapp.com",
        projectId: "movie-picker-19390",
        storageBucket: "movie-picker-19390.firebasestorage.app",
        messagingSenderId: "688022829806",
        appId: "1:688022829806:web:e09ca9dd27fd1b5ddb8d21",
        measurementId: "G-K6HV5HFNF0"
    },
    
    // Feature Flags
    ENABLE_AVAILABILITY: true,
    ENABLE_TRIGGER_WARNINGS: true,
    DEBUG_MODE: false,  // Production mode
    
    // API Configuration
    DDD_PROXY_URL: '/api/ddd-proxy',
    
    // App Metadata
    APP_VERSION: '1.0.0',
    APP_NAME: 'Movie Picker'
};

export default ENV;
