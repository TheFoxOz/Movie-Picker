/**
 * State Management Store
 * Centralized application state with pub/sub pattern
 */

export class AppStore {
    constructor() {
        this.state = {
            // User
            user: null,
            userId: null,
            isAuthenticated: false,
            
            // Movies
            movies: [],
            currentMovieIndex: 0,
            currentMovie: null,
            
            // Swipe History
            swipeHistory: [],
            
            // Matches
            matches: {},
            selectedGroup: null,
            
            // Friends & Groups
            groups: [],
            friends: [],
            
            // UI State
            activeTab: 'swipe',
            isLoading: true,
            error: null,
            
            // App State
            isInitialized: false,
            appId: null,
        };
        
        this.listeners = new Set();
    }
    
    /**
     * Subscribe to state changes
     * @param {Function} listener - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    
    /**
     * Update state and notify listeners
     * @param {Object} updates - State updates
     */
    setState(updates) {
        const prevState = { ...this.state };
        this.state = { ...this.state, ...updates };
        
        // Notify all listeners
        this.listeners.forEach(listener => {
            listener(this.state, prevState);
        });
        
        // Log state changes in development
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
            console.log('[Store] State updated:', updates);
        }
    }
    
    /**
     * Get current state
     * @returns {Object} Current state
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * Get specific state value
     * @param {String} key - State key
     * @returns {*} State value
     */
    get(key) {
        return this.state[key];
    }
    
    /**
     * Reset state to initial values
     */
    reset() {
        this.setState({
            movies: [],
            currentMovieIndex: 0,
            currentMovie: null,
            swipeHistory: [],
            matches: {},
            selectedGroup: null,
            activeTab: 'swipe',
            error: null,
        });
    }
    
    /**
     * Update current movie based on index
     */
    updateCurrentMovie() {
        const movie = this.state.movies[this.state.currentMovieIndex];
        this.setState({ currentMovie: movie || null });
    }
    
    /**
     * Add swipe to history
     * @param {Object} swipe - Swipe data
     */
    addSwipeToHistory(swipe) {
        const swipeHistory = [...this.state.swipeHistory, swipe];
        this.setState({ swipeHistory });
    }
    
    /**
     * Remove last swipe from history
     * @returns {Object|null} Last swipe or null
     */
    undoLastSwipe() {
        const swipeHistory = [...this.state.swipeHistory];
        const lastSwipe = swipeHistory.pop();
        
        if (lastSwipe) {
            this.setState({
                swipeHistory,
                currentMovieIndex: lastSwipe.index,
            });
            this.updateCurrentMovie();
        }
        
        return lastSwipe;
    }
    
    /**
     * Advance to next movie
     */
    nextMovie() {
        const nextIndex = this.state.currentMovieIndex + 1;
        this.setState({ currentMovieIndex: nextIndex });
        this.updateCurrentMovie();
    }
    
    /**
     * Set movies and initialize current movie
     * @param {Array} movies - Movie data
     */
    setMovies(movies) {
        this.setState({
            movies,
            currentMovieIndex: 0,
        });
        this.updateCurrentMovie();
    }
    
    /**
     * Update matches for a group
     * @param {String} groupName - Group identifier
     * @param {Array} matches - Match data
     */
    updateMatches(groupName, matches) {
        const allMatches = { ...this.state.matches };
        allMatches[groupName] = matches;
        this.setState({ matches: allMatches });
    }
    
    /**
     * Set active tab
     * @param {String} tabName - Tab identifier
     */
    setActiveTab(tabName) {
        this.setState({ activeTab: tabName });
    }
    
    /**
     * Set loading state
     * @param {Boolean} isLoading - Loading state
     */
    setLoading(isLoading) {
        this.setState({ isLoading });
    }
    
    /**
     * Set error
     * @param {Error|String|null} error - Error object or message
     */
    setError(error) {
        this.setState({ 
            error: error ? (error.message || error) : null 
        });
    }
    
    /**
     * Clear error
     */
    clearError() {
        this.setState({ error: null });
    }
}

// Create singleton instance
export const store = new AppStore();
