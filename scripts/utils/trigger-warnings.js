/**
 * Trigger Warning Utilities
 * Handles categorization and display of trigger warnings
 * ✅ FIXED: Removed inline styles to let CSS handle positioning
 * ✅ PHASE 1: Added clickable badges with modal support
 */
import { TRIGGER_CATEGORIES, mapWarningToCategory } from '../config/trigger-categories.js';
import { triggerWarningsModal } from '../components/trigger-warnings-modal.js';

/**
 * Get enabled trigger categories from user profile
 */
export function getEnabledCategories() {
    try {
        const prefs = JSON.parse(localStorage.getItem('moviePickerPreferences') || '{}');
        return prefs.triggerWarnings?.enabledCategories || [];
    } catch (error) {
        console.error('[TriggerWarnings] Failed to get enabled categories:', error);
        return [];
    }
}

/**
 * Check if user has "show all warnings" enabled in profile
 */
export function shouldShowAllWarnings() {
    try {
        const prefs = JSON.parse(localStorage.getItem('moviePickerPreferences') || '{}');
        return prefs.triggerWarnings?.showAllWarnings === true;
    } catch (error) {
        console.error('[TriggerWarnings] Failed to check show all warnings:', error);
        return false;
    }
}

/**
 * Categorize warnings from DoesTheDogDie API
 * Returns object with:
 * - categories: Set of unique category IDs found
 * - categoryNames: Array of category names
 * - categoryCount: Number of unique categories
 */
export function categorizeWarnings(warnings) {
    if (!warnings || warnings.length === 0) {
        return {
            categories: new Set(),
            categoryNames: [],
            categoryCount: 0
        };
    }

    const enabledCats = getEnabledCategories();
    const categoriesFound = new Set();
    const categoryNamesFound = new Set();
    
    warnings.forEach(warning => {
        const warningName = warning.name || warning.category || warning;
        
        // Map warning to category
        const category = mapWarningToCategory(warningName);
        
        if (category) {
            // Check if this category is enabled by user
            if (enabledCats.length === 0 || enabledCats.includes(category.id)) {
                categoriesFound.add(category.id);
                categoryNamesFound.add(category.name);
            }
        }
    });

    return {
        categories: categoriesFound,
        categoryNames: Array.from(categoryNamesFound),
        categoryCount: categoriesFound.size
    };
}

/**
 * Render trigger warning badge HTML
 * Returns HTML string for badge (or empty string if no warnings to show)
 * ✅ FIXED: Removed inline styles, uses CSS classes only
 * ✅ PHASE 1: Made badges clickable and added loading state check
 */
export function renderTriggerBadge(movie, options = {}) {
    const {
        size = 'medium',  // 'small', 'medium', 'large'
        position = 'top-left'  // 'top-left', 'top-right', etc.
    } = options;

    // ✅ PHASE 1 FIX: Don't show badge if still loading (not failed)
    if (!movie.warningsLoaded && !movie.warningsFailed) {
        return ''; // CRITICAL: Don't show "Loading..." badge
    }

    // Don't show badge if no warnings
    if (!movie.triggerWarnings || movie.triggerWarnings.length === 0) {
        return '';
    }

    const { categoryNames, categoryCount } = categorizeWarnings(movie.triggerWarnings);
    
    // Only show badge if there are matching categories
    if (categoryCount === 0) {
        return '';
    }

    const tooltipText = categoryNames.join(', ');

    // ✅ PHASE 1 FIX: Make badge clickable
    return `
        <div 
            class="trigger-warning-badge trigger-badge-clickable ${size} ${position}"
            data-tooltip="${tooltipText}"
            data-movie-id="${movie.id}"
            title="Click to view ${categoryCount} warning${categoryCount > 1 ? 's' : ''}"
            style="cursor: pointer;"
        >
            <span class="warning-icon">⚠️</span>
            <span class="warning-count">${categoryCount}</span>
        </div>
    `;
}

/**
 * Get simple badge count without HTML (for use in notifications, etc)
 */
export function getBadgeCount(movie) {
    if (!movie.triggerWarnings || movie.triggerWarnings.length === 0) {
        return 0;
    }
    
    const { categoryCount } = categorizeWarnings(movie.triggerWarnings);
    return categoryCount;
}

/**
 * ✅ PHASE 1 FIX: Attach click listeners to all trigger badges
 * Call this after rendering cards with badges
 * @param {HTMLElement} container - Container element with movie cards
 * @param {Array} movies - Array of movie objects
 */
export function attachTriggerBadgeListeners(container, movies) {
    if (!container) {
        console.warn('[TriggerWarnings] No container provided to attachTriggerBadgeListeners');
        return;
    }

    const badges = container.querySelectorAll('.trigger-badge-clickable');
    
    badges.forEach(badge => {
        badge.addEventListener('click', (e) => {
            e.stopPropagation(); // Don't trigger card click
            
            const movieId = parseInt(badge.dataset.movieId);
            const movie = movies.find(m => m.id === movieId);
            
            if (movie && triggerWarningsModal) {
                triggerWarningsModal.show(movie);
            } else if (!triggerWarningsModal) {
                console.error('[TriggerWarnings] Modal not available');
            } else {
                console.error('[TriggerWarnings] Movie not found:', movieId);
            }
        });
    });

    console.log(`[TriggerWarnings] Attached listeners to ${badges.length} badges`);
}
