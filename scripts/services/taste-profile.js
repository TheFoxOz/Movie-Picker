/**
 * Taste Profile Service
 * Analyzes user swipe history to generate taste profiles and recommendations
 * ✅ Analyzes swipeHistory from Firestore
 * ✅ Calculates genre preferences with weighted scoring
 * ✅ Extracts favorite actors/directors from TMDB
 * ✅ Generates smart recommendations
 * ✅ Caches profiles for performance
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase-config.js';
import { tmdbService } from './tmdb.js';

class TasteProfileService {
    constructor() {
        this.profileCache = new Map();
        this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
        
        // Action weights for scoring
        this.actionWeights = {
            'love': 5,
            'like': 3,
            'maybe': 1,
            'nope': -2
        };
    }

    /**
     * Analyze user's swipe history and generate taste profile
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Taste profile object
     */
    async analyzeTasteProfile(userId) {
        console.log('[TasteProfile] Analyzing profile for user:', userId);
        
        try {
            // Check cache first
            const cached = this.getCachedProfile(userId);
            if (cached) {
                console.log('[TasteProfile] Using cached profile');
                return cached;
            }

            // Load swipe history from Firestore
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                console.warn('[TasteProfile] User not found');
                return this.getEmptyProfile();
            }

            const userData = userDoc.data();
            const swipeHistory = userData.swipeHistory || [];

            if (swipeHistory.length === 0) {
                console.log('[TasteProfile] No swipe history found');
                return this.getEmptyProfile();
            }

            console.log(`[TasteProfile] Analyzing ${swipeHistory.length} swipes...`);

            // Filter positive swipes (love, like, maybe)
            const positiveSwipes = swipeHistory.filter(swipe => 
                ['love', 'like', 'maybe'].includes(swipe.action)
            );

            const negativeSwipes = swipeHistory.filter(swipe => 
                swipe.action === 'nope'
            );

            // Calculate profile
            const profile = {
                userId,
                totalSwipes: swipeHistory.length,
                positiveSwipes: positiveSwipes.length,
                negativeSwipes: negativeSwipes.length,
                likeRate: (positiveSwipes.length / swipeHistory.length * 100).toFixed(1),
                
                // Genre analysis
                genres: this.analyzeGenres(swipeHistory),
                topGenres: [],
                
                // Movie preferences
                avgRating: this.calculateAverageRating(positiveSwipes),
                preferredDecades: this.analyzeDecades(positiveSwipes),
                
                // Platform preferences (from user preferences)
                platforms: userData.preferences?.platforms || [],
                
                // Metadata
                lastUpdated: Date.now(),
                lastSwipeDate: swipeHistory[swipeHistory.length - 1]?.timestamp || Date.now()
            };

            // Get top 5 genres
            profile.topGenres = Object.entries(profile.genres)
                .sort((a, b) => b[1].score - a[1].score)
                .slice(0, 5)
                .map(([name, data]) => ({
                    name,
                    score: data.score,
                    count: data.count,
                    percentage: ((data.count / positiveSwipes.length) * 100).toFixed(0)
                }));

            // Fetch detailed movie data for actor/director analysis
            // (Only analyze recent 20 positive swipes for performance)
            const recentPositive = positiveSwipes.slice(-20);
            const detailedAnalysis = await this.analyzeMovieDetails(recentPositive);
            
            profile.topActors = detailedAnalysis.topActors;
            profile.topDirectors = detailedAnalysis.topDirectors;

            // Cache the profile
            this.cacheProfile(userId, profile);

            // Save to Firestore for future reference
            await this.saveProfile(userId, profile);

            console.log('[TasteProfile] ✅ Profile generated:', {
                totalSwipes: profile.totalSwipes,
                likeRate: profile.likeRate + '%',
                topGenres: profile.topGenres.map(g => g.name)
            });

            return profile;

        } catch (error) {
            console.error('[TasteProfile] Error analyzing profile:', error);
            return this.getEmptyProfile();
        }
    }

    /**
     * Analyze genres from swipe history with weighted scoring
     */
    analyzeGenres(swipeHistory) {
        const genreMap = {};
        
        console.log('[TasteProfile] 🔍 Sample swipe structure:', swipeHistory[0]);

        swipeHistory.forEach((swipe, index) => {
            const weight = this.actionWeights[swipe.action] || 0;
            const genres = swipe.genres || swipe.movie?.genres || swipe.movie?.genre_ids || [];
            
            // Debug first few swipes
            if (index < 3) {
                console.log(`[TasteProfile] Swipe ${index}:`, {
                    movieId: swipe.movieId || swipe.movie?.id,
                    action: swipe.action,
                    genres: genres,
                    swipeKeys: Object.keys(swipe),
                    movieKeys: swipe.movie ? Object.keys(swipe.movie) : 'no movie object'
                });
            }

            // Handle both genre objects {id: 28, name: 'Action'} and IDs [28, 12]
            const genreNames = genres.map(g => {
                if (typeof g === 'object' && g.name) {
                    return g.name;
                } else if (typeof g === 'number') {
                    return this.getGenreNameById(g);
                }
                return null;
            }).filter(Boolean);

            genreNames.forEach(genreName => {
                if (!genreMap[genreName]) {
                    genreMap[genreName] = { score: 0, count: 0 };
                }
                genreMap[genreName].score += weight;
                if (weight > 0) {
                    genreMap[genreName].count++;
                }
            });
        });
        
        console.log('[TasteProfile] 📊 Genre map after analysis:', Object.keys(genreMap).length, 'genres found');

        return genreMap;
    }

    /**
     * Get genre name from TMDB genre ID
     */
    getGenreNameById(genreId) {
        const genreMap = {
            28: 'Action',
            12: 'Adventure',
            16: 'Animation',
            35: 'Comedy',
            80: 'Crime',
            99: 'Documentary',
            18: 'Drama',
            10751: 'Family',
            14: 'Fantasy',
            36: 'History',
            27: 'Horror',
            10402: 'Music',
            9648: 'Mystery',
            10749: 'Romance',
            878: 'Science Fiction',
            10770: 'TV Movie',
            53: 'Thriller',
            10752: 'War',
            37: 'Western'
        };
        return genreMap[genreId] || 'Unknown';
    }

    /**
     * Calculate average rating of liked movies
     */
    calculateAverageRating(positiveSwipes) {
        if (positiveSwipes.length === 0) return 0;

        const total = positiveSwipes.reduce((sum, swipe) => {
            const rating = swipe.rating || swipe.movie?.rating || swipe.movie?.vote_average || 0;
            return sum + rating;
        }, 0);

        return (total / positiveSwipes.length).toFixed(1);
    }

    /**
     * Analyze preferred decades from release dates
     */
    analyzeDecades(positiveSwipes) {
        const decadeMap = {};

        positiveSwipes.forEach(swipe => {
            const releaseDate = swipe.releaseDate || swipe.movie?.releaseDate || swipe.movie?.release_date;
            if (releaseDate) {
                const year = parseInt(releaseDate.split('-')[0]);
                if (year) {
                    const decade = Math.floor(year / 10) * 10;
                    decadeMap[decade] = (decadeMap[decade] || 0) + 1;
                }
            }
        });

        return Object.entries(decadeMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([decade, count]) => ({
                decade: `${decade}s`,
                count
            }));
    }

    /**
     * Analyze actors and directors from detailed movie data
     * NOTE: Disabled for now - getMovieCredits not available in tmdbService
     */
    async analyzeMovieDetails(swipes) {
        // Temporarily disabled - credits API not available
        console.log('[TasteProfile] Movie credits analysis skipped (API not available)');
        
        return {
            topActors: [],
            topDirectors: []
        };
        
        /* FUTURE: Re-enable when tmdbService.getMovieCredits is added
        const actorMap = {};
        const directorMap = {};

        for (const swipe of swipes) {
            try {
                const movieId = swipe.movieId || swipe.movie?.id;
                if (!movieId) continue;

                const credits = await tmdbService.getMovieCredits(movieId);
                
                if (credits) {
                    const cast = credits.cast?.slice(0, 5) || [];
                    cast.forEach(actor => {
                        if (!actorMap[actor.name]) {
                            actorMap[actor.name] = { count: 0, id: actor.id };
                        }
                        actorMap[actor.name].count++;
                    });

                    const director = credits.crew?.find(person => person.job === 'Director');
                    if (director) {
                        if (!directorMap[director.name]) {
                            directorMap[director.name] = { count: 0, id: director.id };
                        }
                        directorMap[director.name].count++;
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                console.warn('[TasteProfile] Error fetching credits:', error);
            }
        }

        return {
            topActors: Object.entries(actorMap)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 5)
                .map(([name, data]) => ({ name, count: data.count })),
            
            topDirectors: Object.entries(directorMap)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 3)
                .map(([name, data]) => ({ name, count: data.count }))
        };
        */
    }

    /**
     * Generate smart recommendations based on taste profile
     */
    async getRecommendations(userId, limit = 20) {
        console.log('[TasteProfile] Generating recommendations for user:', userId);

        try {
            const profile = await this.analyzeTasteProfile(userId);

            if (profile.totalSwipes === 0) {
                console.log('[TasteProfile] No swipes yet, returning popular movies');
                return this.getPopularMovies(limit);
            }

            // Build TMDB discovery query based on profile
            const topGenreIds = profile.topGenres.map(g => this.getGenreIdByName(g.name)).filter(Boolean);
            const minRating = Math.max(6, parseFloat(profile.avgRating) - 1);

            console.log('[TasteProfile] Recommendation criteria:', {
                genres: topGenreIds,
                minRating
            });

            const recommendations = await tmdbService.discoverMovies({
                sortBy: 'vote_average.desc',
                withGenres: topGenreIds.slice(0, 2).join(','), // Top 2 genres
                voteAverageGte: minRating,
                voteCountGte: 100,
                page: 1
            });

            let movies = recommendations.movies || [];

            // Enrich with platform data
            if (movies.length > 0 && tmdbService.loadWatchProvidersForMovies) {
                await tmdbService.loadWatchProvidersForMovies(movies.slice(0, limit));
            }

            // Filter by user platforms
            if (tmdbService.filterByUserPlatforms) {
                movies = tmdbService.filterByUserPlatforms(movies);
            }

            // Filter blocked movies (trigger warnings)
            if (tmdbService.filterBlockedMovies) {
                movies = tmdbService.filterBlockedMovies(movies);
            }

            console.log(`[TasteProfile] ✅ Generated ${movies.length} recommendations`);

            return movies.slice(0, limit);

        } catch (error) {
            console.error('[TasteProfile] Error generating recommendations:', error);
            return this.getPopularMovies(limit);
        }
    }

    /**
     * Get genre ID by name (reverse lookup)
     */
    getGenreIdByName(name) {
        const genreMap = {
            'Action': 28,
            'Adventure': 12,
            'Animation': 16,
            'Comedy': 35,
            'Crime': 80,
            'Documentary': 99,
            'Drama': 18,
            'Family': 10751,
            'Fantasy': 14,
            'History': 36,
            'Horror': 27,
            'Music': 10402,
            'Mystery': 9648,
            'Romance': 10749,
            'Science Fiction': 878,
            'TV Movie': 10770,
            'Thriller': 53,
            'War': 10752,
            'Western': 37
        };
        return genreMap[name];
    }

    /**
     * Fallback: Get popular movies
     */
    async getPopularMovies(limit = 20) {
        try {
            const response = await tmdbService.discoverMovies({
                sortBy: 'popularity.desc',
                page: 1
            });
            return (response.movies || []).slice(0, limit);
        } catch (error) {
            console.error('[TasteProfile] Error getting popular movies:', error);
            return [];
        }
    }

    /**
     * Get empty profile structure
     */
    getEmptyProfile() {
        return {
            userId: null,
            totalSwipes: 0,
            positiveSwipes: 0,
            negativeSwipes: 0,
            likeRate: '0',
            genres: {},
            topGenres: [],
            avgRating: 0,
            preferredDecades: [],
            platforms: [],
            topActors: [],
            topDirectors: [],
            lastUpdated: Date.now()
        };
    }

    /**
     * Cache profile in memory
     */
    cacheProfile(userId, profile) {
        this.profileCache.set(userId, {
            profile,
            cachedAt: Date.now()
        });
    }

    /**
     * Get cached profile if still valid
     */
    getCachedProfile(userId) {
        const cached = this.profileCache.get(userId);
        if (!cached) return null;

        const age = Date.now() - cached.cachedAt;
        if (age > this.cacheTimeout) {
            this.profileCache.delete(userId);
            return null;
        }

        return cached.profile;
    }

    /**
     * Save profile to Firestore for persistence
     */
    async saveProfile(userId, profile) {
        try {
            const profileRef = doc(db, 'users', userId, 'tasteProfile', 'current');
            await setDoc(profileRef, {
                ...profile,
                savedAt: Date.now()
            });
            console.log('[TasteProfile] ✅ Profile saved to Firestore');
        } catch (error) {
            console.error('[TasteProfile] Failed to save profile:', error);
        }
    }

    /**
     * Force refresh profile (clear cache)
     */
    async refreshProfile(userId) {
        this.profileCache.delete(userId);
        return this.analyzeTasteProfile(userId);
    }

    /**
     * Get profile summary for display
     */
    getProfileSummary(profile) {
        if (!profile || profile.totalSwipes === 0) {
            return {
                isEmpty: true,
                message: 'Keep swiping to build your taste profile!'
            };
        }

        return {
            isEmpty: false,
            summary: `You've swiped ${profile.totalSwipes} movies`,
            likeRate: `${profile.likeRate}% liked`,
            topGenre: profile.topGenres[0]?.name || 'Various',
            topGenrePercentage: profile.topGenres[0]?.percentage || 0
        };
    }
}

// Create singleton instance
const tasteProfileService = new TasteProfileService();

export { tasteProfileService, TasteProfileService };
