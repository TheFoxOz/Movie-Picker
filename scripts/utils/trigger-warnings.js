/**
 * Trigger Warning Utilities
 * Handles categorization and display of trigger warnings
 */

import { TRIGGER_CATEGORIES } from '../config/trigger-categories.js';

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
 * Categorize warnings by enabled categories
 * Returns object with:
 * - enabledCategories: Array of category names that match user's enabled list
 * - categoryCount: Number of unique enabled categories found
 * - allWarnings: All warnings (for "show all" mode)
 */
export function categorizeWarnings(warnings) {
    if (!warnings || warnings.length === 0) {
        return {
            enabledCategories: [],
            categoryCount: 0,
            allWarnings: []
        };
    }

    const enabledCats = getEnabledCategories();
    const categoriesFound = new Set();
    
    warnings.forEach(warning => {
        const category = warning.category || warning.name || '';
        
        // Check if this warning matches any enabled category
        if (enabledCats.some(enabledCat => 
            category.toLowerCase().includes(enabledCat.toLowerCase())
        )) {
            categoriesFound.add(category);
        }
    });

    return {
        enabledCategories: Array.from(categoriesFound),
        categoryCount: categoriesFound.size,
        allWarnings: warnings
    };
}

/**
 * Render trigger warning badge HTML
 * Returns HTML string for badge (or null if no warnings to show)
 */
export function renderTriggerBadge(movie, options = {}) {
    const {
        size = 'medium',  // 'small', 'medium', 'large'
        showTooltip = true,
        position = 'top-left'  // 'top-left', 'top-right', etc.
    } = options;

    if (!movie.triggerWarnings || movie.triggerWarnings.length === 0) {
        return null;
    }

    const { enabledCategories, categoryCount } = categorizeWarnings(movie.triggerWarnings);
    
    // Only show badge if there are matching categories
    if (categoryCount === 0) {
        return null;
    }

    const sizes = {
        small: { padding: '3px 6px', fontSize: '0.65rem', icon: '0.75rem' },
        medium: { padding: '0.375rem 0.625rem', fontSize: '0.75rem', icon: '0.875rem' },
        large: { padding: '0.5rem 0.75rem', fontSize: '0.875rem', icon: '1rem' }
    };

    const sizeStyle = sizes[size] || sizes.medium;
    const tooltipText = enabledCategories.join(', ');

    return `
        <div 
            class="trigger-warning-badge ${showTooltip ? 'has-tooltip' : ''}"
            data-categories="${tooltipText}"
            style="
                position: absolute;
                ${position.includes('top') ? 'top: 0.5rem;' : 'bottom: 0.5rem;'}
                ${position.includes('left') ? 'left: 0.5rem;' : 'right: 0.5rem;'}
                background: rgba(239, 68, 68, 0.95);
                color: white;
                padding: ${sizeStyle.padding};
                border-radius: 6px;
                font-size: ${sizeStyle.fontSize};
                font-weight: 700;
                display: flex;
                align-items: center;
                gap: 4px;
                z-index: 10;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                cursor: help;
            "
            title="${tooltipText}"
        >
            <span style="font-size: ${sizeStyle.icon};">⚠️</span>
            <span>${categoryCount}</span>
        </div>
    `;
}
