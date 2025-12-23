/**
 * Trigger Warning Utilities
 * Handles categorization and display of trigger warnings
 * ✅ FIXED: Removed inline styles to let CSS handle positioning
 */

import { TRIGGER_CATEGORIES, mapWarningToCategory } from '../config/trigger-categories.js';

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
 */
export function renderTriggerBadge(movie, options = {}) {
    const {
        size = 'medium',  // 'small', 'medium', 'large'
        position = 'top-left'  // 'top-left', 'top-right', etc.
    } = options;

    if (!movie.triggerWarnings || movie.triggerWarnings.length === 0) {
        return '';
    }

    const { categoryNames, categoryCount } = categorizeWarnings(movie.triggerWarnings);
    
    // Only show badge if there are matching categories
    if (categoryCount === 0) {
        return '';
    }

    const tooltipText = categoryNames.join(', ');

    return `
        <div 
            class="trigger-warning-badge ${size} ${position}"
            data-tooltip="${tooltipText}"
            title="${tooltipText}"
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
