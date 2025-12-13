import { store } from '../state/store.js';
import { tmdbService } from '../services/tmdb.js';
import { movieModal } from '../components/movie-modal.js';
import { ENV } from '../config/env.js';

const GENRE_IDS = {
    ACTION: 28,
    ADVENTURE: 12,
    ANIMATION: 16,
    COMEDY: 35,
    CRIME: 80,
    DOCUMENTARY: 99,
    DRAMA: 18,
    FAMILY: 10751,
    FANTASY: 14,
    HISTORY: 36,
    HORROR: 27,
    MUSIC: 10402,
    MYSTERY: 9648,
    ROMANCE: 10749,
    SCIFI: 878,
    THRILLER: 53,
    WAR: 10752,
    WESTERN: 37
};

const GENRE_NAMES = {
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
    878: 'Sci-Fi',
    53: 'Thriller',
    10752: 'War',
    37: 'Western'
};

export class HomeTab {
    constructor() {
        this.container = null;
        this.preferences = null;
        this.sections = {}; // Will hold all movie sections
        this.isLoading = false;
    }

    async render(container) {
        this.container = container;
        this.preferences = store.getState().preferences || this.getDefaultPreferences();
        
        window.addEventListener('preferences-updated', () => {
            console.log('[Home] Preferences updated, refreshing...');
            this.render(this.container);
        });

        this.container.innerHTML = this.renderLoading();
        await this.loadContent();
        this.renderContent();
    }

    getDefaultPreferences() {
        return {
            platforms: {
                'Netflix': true,
                'Hulu': true,
                'Prime Video': true,
                'Disney+': true,
                'HBO Max': true,
                'Apple TV+': true
            },
            triggerWarnings: { enabled: false },
            theme: 'dark',
            language: 'en',
            location: 'US'
        };
    }

    async loadContent() {
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            if (!tmdbService) {
                console.error('[Home] TMDB service not available');
                return;
            }

            console.log('[Home] Loading content...');
            this.sections = {};

            // Get user's favorite genres from swipe history
            const favoriteGenres = this.getUserFavoriteGenres();
            console.log('[Home] User favorite genres:', favoriteGenres);

            // Load Trending
            console.log('[Home] Loading trending movies...');
            let trending = await tmdbService.getTrendingMovies('week');
            trending = await this.enrichWithPlatformData(trending);
            this.sections['Trending This Week'] = {
                emoji: '🔥',
                movies: this.filterMovies(trending).slice(0, 20)
            };

            // Load genre-specific sections based on user preferences
            if (favoriteGenres.length > 0) {
                // Load sections for user's favorite genres
                for (const genreId of favoriteGenres.slice(0, 3)) { // Top 3 favorite genres
                    const genreName = GENRE_NAMES[genreId];
                    if (genreName) {
                        console.log(`[Home] Loading ${genreName} movies...`);
                        let genreMovies = await tmdbService.discoverMovies({
                            withGenres: genreId,
                            sortBy: 'popularity.desc',
                            page: 1
                        });
                        genreMovies = genreMovies.movies || genreMovies;
                        genreMovies = await this.enrichWithPlatformData(genreMovies);
                        
                        this.sections[`${genreName} Movies`] = {
                            emoji: this.getGenreEmoji(genreId),
                            movies: this.filterMovies(genreMovies).slice(0, 20)
                        };
                    }
                }
            } else {
                // Default genre sections for new users
                const defaultGenres = [
                    { id: GENRE_IDS.ACTION, name: 'Action' },
                    { id: GENRE_IDS.COMEDY, name: 'Comedy' },
                    { id: GENRE_IDS.DRAMA, name: 'Drama' }
                ];

                for (const { id, name } of defaultGenres) {
                    console.log(`[Home] Loading ${name} movies...`);
                    let genreMovies = await tmdbService.discoverMovies({
                        withGenres: id,
                        sortBy: 'popularity.desc',
                        page: 1
                    });
                    genreMovies = genreMovies.movies || genreMovies;
                    genreMovies = await this.enrichWithPlatformData(genreMovies);
                    
                    this.sections[`${name} Movies`] = {
                        emoji: this.getGenreEmoji(id),
                        movies: this.filterMovies(genreMovies).slice(0, 20)
                    };
                }
            }

            // Top Rated section
            console.log('[Home] Loading top rated movies...');
            let topRated = await tmdbService.discoverMovies({
                sortBy: 'vote_average.desc',
                minVotes: 1000,
                page: 1
            });
            topRated = topRated.movies || topRated;
            topRated = await this.enrichWithPlatformData(topRated);
            this.sections['Top Rated'] = {
                emoji: '⭐',
                movies: this.filterMovies(topRated).slice(0, 20)
            };

            // Popular Movies section
            console.log('[Home] Loading popular movies...');
            let popular = await tmdbService.getPopularMovies(1);
            popular = await this.enrichWithPlatformData(popular);
            this.sections['Popular Now'] = {
                emoji: '🍿',
                movies: this.filterMovies(popular).slice(0, 20)
            };

            console.log('[Home] ✅ Content loaded successfully');
            console.log('[Home] Total sections:', Object.keys(this.sections).length);

        } catch (error) {
            console.error('[Home] Error loading content:', error);
        } finally {
            this.isLoading = false;
        }
    }

    getUserFavoriteGenres() {
        const swipeHistory = store.getState().swipeHistory || [];
        
        const lovedAndLiked = swipeHistory.filter(s => 
            s && 
            (s.action === 'love' || s.action === 'like') && 
            s.movie && 
            s.movie.id
        );

        if (lovedAndLiked.length === 0) {
            return [];
        }

        // Count genre occurrences
        const genreCounts = {};
        lovedAndLiked.forEach(swipe => {
            const movie = swipe.movie;
            if (!movie) return;
            
            const genreIds = movie.genre_ids || movie.genreIds || [];
            genreIds.forEach(genreId => {
                genreCounts[genreId] = (genreCounts[genreId] || 0) + 1;
            });
        });

        // Sort by count and return top genres
        return Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([genreId]) => parseInt(genreId));
    }

    getGenreEmoji(genreId) {
        const emojis = {
            28: '💥',  // Action
            12: '🗺️',  // Adventure
            16: '🎨',  // Animation
            35: '😂',  // Comedy
            80: '🔫',  // Crime
            99: '📽️',  // Documentary
            18: '🎭',  // Drama
            10751: '👨‍👩‍👧‍👦', // Family
            14: '🧙',  // Fantasy
            36: '📜',  // History
            27: '👻',  // Horror
            10402: '🎵', // Music
            9648: '🔍', // Mystery
            10749: '💕', // Romance
            878: '🚀', // Sci-Fi
            53: '😱', // Thriller
            10752: '⚔️', // War
            37: '🤠'  // Western
        };
        return emojis[genreId] || '🎬';
    }

    async enrichWithPlatformData(movies, options = { maxConcurrent: 5, delay: 50 }) {
        if (!movies || movies.length === 0) {
            return movies;
        }

        const { maxConcurrent, delay } = options;
        
        for (let i = 0; i < movies.length; i += maxConcurrent) {
            const batch = movies.slice(i, i + maxConcurrent);
            
            await Promise.all(
                batch.map(async (movie) => {
                    if (tmdbService.getWatchProviders) {
                        movie.availableOn = await tmdbService.getWatchProviders(movie.id);
                        
                        // ✅ NEW: Set platform field
                        if (movie.availableOn && movie.availableOn.length > 0) {
                            movie.platform = movie.availableOn[0];
                        } else {
                            const year = movie.releaseDate?.split('-')[0] || movie.year;
                            const currentYear = new Date().getFullYear();
                            
                            if (year && parseInt(year) > currentYear) {
                                movie.platform = 'Coming Soon';
                            } else {
                                movie.platform = 'Cinema';
                            }
                        }
                    } else {
                        movie.availableOn = [];
                        movie.platform = 'Not Available';
                    }
                })
            );
            
            if (i + maxConcurrent < movies.length) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        return movies;
    }

    // ✅ UPDATED: Filter out cinema-only movies, only show streaming platform content
    filterMovies(movies) {
        if (!movies || movies.length === 0) {
            return [];
        }

        let filtered = [...movies];

        // ✅ NEW: Remove cinema-only movies (must have streaming platform)
        filtered = filtered.filter(movie => {
            // Keep if movie has at least one streaming platform
            if (movie.availableOn && movie.availableOn.length > 0) {
                return true;
            }
            
            // Remove if cinema-only, coming soon, or not available
            const platform = movie.platform;
            if (platform === 'Cinema' || platform === 'Coming Soon' || platform === 'Not Available') {
                console.log(`[Home] Filtering out cinema-only movie: ${movie.title}`);
                return false;
            }
            
            return true;
        });

        console.log(`[Home] Cinema filter: ${movies.length} → ${filtered.length} movies`);

        // Filter by user's selected platforms
        if (tmdbService.filterByUserPlatforms) {
            const beforePlatformFilter = filtered.length;
            filtered = tmdbService.filterByUserPlatforms(filtered);
            
            if (filtered.length < beforePlatformFilter) {
                console.log(`[Home] Platform filter: ${beforePlatformFilter} → ${filtered.length} movies`);
            }
        }

        // Filter by trigger warnings
        if (this.preferences.triggerWarnings.enabled) {
            if (tmdbService.filterBlockedMovies) {
                const beforeTriggerFilter = filtered.length;
                filtered = tmdbService.filterBlockedMovies(filtered);
                
                if (filtered.length < beforeTriggerFilter) {
                    console.log(`[Home] Trigger filter: ${beforeTriggerFilter} → ${filtered.length} movies`);
                }
            }
        }

        return filtered;
    }

    renderLoading() {
        return `
            <div style="display:flex;align-items:center;justify-content:center;height:calc(100vh - 10rem);flex-direction:column;gap:1rem;">
                <div style="width:48px;height:48px;border:4px solid rgba(255,46,99,0.3);border-top-color:#ff2e63;border-radius:50%;animation:spin 1s linear infinite;"></div>
                <p style="color:rgba(255,255,255,0.7);">Loading your personalized feed...</p>
            </div>
            <style>
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
        `;
    }

    renderContent() {
        const enabledPlatforms = Object.keys(this.preferences.platforms)
            .filter(p => this.preferences.platforms[p]);

        const swipeHistory = store.getState().swipeHistory || [];
        const hasHistory = swipeHistory.length > 0;

        this.container.innerHTML = `
            <div style="padding: 1.5rem 1rem 6rem;">
                
                <!-- Header -->
                <div style="margin-bottom: 2rem;">
                    <h1 style="font-size: 1.75rem; font-weight: 800; color: white; margin: 0 0 0.5rem 0;">
                        ${this.getGreeting()}
                    </h1>
                    <p style="color: rgba(255,255,255,0.6); font-size: 0.875rem; margin: 0;">
                        ${hasHistory ? 'Personalized for your taste' : 'Discover movies on your platforms'}
                    </p>
                </div>

                <!-- Warning if no platforms -->
                ${enabledPlatforms.length === 0 ? `
                    <div style="padding: 1.5rem; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 1rem; margin-bottom: 2rem;">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <span style="font-size: 1.5rem;">⚠️</span>
                            <div>
                                <div style="font-weight: 700; color: #ef4444; margin-bottom: 0.25rem;">No Platforms Enabled</div>
                                <div style="font-size: 0.875rem; color: rgba(255,255,255,0.7);">
                                    Go to Profile → Streaming Platforms to enable at least one platform
                                </div>
                            </div>
                        </div>
                    </div>
                ` : ''}

                ${enabledPlatforms.length > 0 ? `
                    <!-- Movie Sections -->
                    ${Object.entries(this.sections).map(([title, data]) => 
                        this.renderSection(data.emoji, title, data.movies)
                    ).join('')}

                    <!-- End Message -->
                    <div style="text-align: center; padding: 3rem 1rem;">
                        <div style="font-size: 3rem; margin-bottom: 0.5rem;">🎬</div>
                        <p style="color: rgba(255,255,255,0.5); margin: 0;">
                            That's all for now! Check back later for more.
                        </p>
                    </div>
                ` : ''}
            </div>
        `;

        this.attachListeners();
    }

    renderSection(emoji, title, movies) {
        if (!movies || movies.length === 0) {
            return '';
        }

        return `
            <div style="margin-bottom: 2.5rem;">
                <!-- Section Header -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; padding: 0 0.5rem;">
                    <h2 style="font-size: 1.125rem; font-weight: 700; color: white; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.25rem;">${emoji}</span>
                        ${title}
                    </h2>
                </div>
                
                <!-- Horizontal scrolling with SMALLER cards (3-4 visible) -->
                <div class="movie-row" style="
                    overflow-x: auto;
                    overflow-y: hidden;
                    scroll-behavior: smooth;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                    padding: 0 0.5rem;
                ">
                    <div style="
                        display: flex;
                        gap: 0.75rem;
                        padding-bottom: 1rem;
                    ">
                        ${movies.map(movie => this.renderMovieCard(movie)).join('')}
                    </div>
                </div>
                
                <style>
                    .movie-row::-webkit-scrollbar {
                        display: none;
                    }
                </style>
            </div>
        `;
    }

    renderMovieCard(movie) {
        const posterUrl = movie.posterURL || 
                         (movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null) ||
                         movie.backdropURL ||
                         `https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title || 'Movie')}`;
        
        const hasWarnings = movie.triggerWarnings && movie.triggerWarnings.length > 0;
        const platform = movie.availableOn && movie.availableOn.length > 0 ? movie.availableOn[0] : null;
        const year = movie.releaseDate?.split('-')[0] || movie.release_date?.split('-')[0] || '';

        return `
            <div class="home-movie-card" data-movie-id="${movie.id}" style="
                min-width: 110px;
                max-width: 110px;
                flex-shrink: 0;
            ">
                <div style="
                    position: relative;
                    width: 100%;
                    aspect-ratio: 2/3;
                    border-radius: 0.625rem;
                    overflow: hidden;
                    background: rgba(255,255,255,0.05);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                    transition: transform 0.2s, box-shadow 0.2s;
                    cursor: pointer;
                ">
                    <img 
                        src="${posterUrl}" 
                        alt="${movie.title}" 
                        style="width: 100%; height: 100%; object-fit: cover;"
                        onerror="this.src='https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title || 'Movie')}'"
                    >
                    
                    <!-- Rating Badge -->
                    ${movie.vote_average || movie.rating ? `
                        <div style="
                            position: absolute;
                            top: 0.375rem;
                            right: 0.375rem;
                            padding: 0.1875rem 0.375rem;
                            background: rgba(251,191,36,0.95);
                            backdrop-filter: blur(8px);
                            border-radius: 0.375rem;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        ">
                            <span style="color: white; font-size: 0.6875rem; font-weight: 700;">
                                ${(movie.vote_average || movie.rating).toFixed(1)}
                            </span>
                        </div>
                    ` : ''}

                    <!-- Trigger Warning Badge -->
                    ${hasWarnings ? `
                        <div style="
                            position: absolute;
                            top: 0.375rem;
                            left: 0.375rem;
                            padding: 0.1875rem 0.375rem;
                            background: rgba(239,68,68,0.95);
                            backdrop-filter: blur(8px);
                            border-radius: 0.375rem;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        ">
                            <span style="color: white; font-size: 0.6875rem; font-weight: 700;">⚠️</span>
                        </div>
                    ` : ''}

                    <!-- Movie Info Overlay -->
                    <div style="
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        padding: 0.5rem 0.375rem;
                        background: linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 50%, transparent 100%);
                    ">
                        <h3 style="
                            font-size: 0.75rem;
                            font-weight: 700;
                            color: white;
                            margin: 0;
                            line-height: 1.2;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            display: -webkit-box;
                            -webkit-line-clamp: 2;
                            -webkit-box-orient: vertical;
                        ">
                            ${movie.title}
                        </h3>
                        <p style="
                            font-size: 0.625rem;
                            color: rgba(255,255,255,0.7);
                            margin: 0.25rem 0 0 0;
                        ">
                            ${year}${platform ? ` • ${this.getPlatformEmoji(platform)}` : ''}
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    getPlatformEmoji(platform) {
        const emojis = {
            'Netflix': '🔴',
            'Hulu': '🟢',
            'Prime Video': '🔵',
            'Disney+': '⭐',
            'HBO Max': '🟣',
            'Apple TV+': '🍎',
            'Peacock': '🦚',
            'Paramount+': '🔷'
        };
        return emojis[platform] || '▶️';
    }

    getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    }

    attachListeners() {
        this.container.querySelectorAll('.home-movie-card').forEach(card => {
            const cardDiv = card.querySelector('div[style*="cursor: pointer"]');
            
            card.addEventListener('mouseover', () => {
                if (cardDiv) {
                    cardDiv.style.transform = 'scale(1.05)';
                    cardDiv.style.boxShadow = '0 8px 20px rgba(0,0,0,0.6)';
                }
            });
            
            card.addEventListener('mouseout', () => {
                if (cardDiv) {
                    cardDiv.style.transform = 'scale(1)';
                    cardDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
                }
            });
            
            card.addEventListener('click', () => {
                const movieId = parseInt(card.dataset.movieId);
                const movie = this.findMovieById(movieId);
                if (movie) {
                    movieModal.show(movie);
                }
            });
        });
    }

    findMovieById(movieId) {
        for (const sectionData of Object.values(this.sections)) {
            const movie = sectionData.movies.find(m => m.id === movieId);
            if (movie) return movie;
        }
        return null;
    }

    destroy() {
        window.removeEventListener('preferences-updated', this.render);
    }
}
