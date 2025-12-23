/**
 * Streaming Platform Utilities
 * Centralized platform icons, colors, and formatting
 */

/**
 * Platform visual configuration
 * Contains icons, colors, and display names for streaming services
 */
export const PLATFORM_STYLES = {
    'Netflix': {
        icon: 'N',
        color: '#E50914',
        textColor: '#FFFFFF',
        name: 'Netflix'
    },
    'Hulu': {
        icon: 'H',
        color: '#1CE783',
        textColor: '#000000',
        name: 'Hulu'
    },
    'Prime Video': {
        icon: 'P',
        color: '#00A8E1',
        textColor: '#FFFFFF',
        name: 'Prime Video'
    },
    'Amazon Prime Video': { // Alias
        icon: 'P',
        color: '#00A8E1',
        textColor: '#FFFFFF',
        name: 'Prime Video'
    },
    'Disney+': {
        icon: 'D',
        color: '#113CCF',
        textColor: '#FFFFFF',
        name: 'Disney+'
    },
    'Disney Plus': { // Alias
        icon: 'D',
        color: '#113CCF',
        textColor: '#FFFFFF',
        name: 'Disney+'
    },
    'HBO Max': {
        icon: 'M',
        color: '#B200FF',
        textColor: '#FFFFFF',
        name: 'HBO Max'
    },
    'Max': { // Alias (rebranded)
        icon: 'M',
        color: '#B200FF',
        textColor: '#FFFFFF',
        name: 'Max'
    },
    'Apple TV+': {
        icon: 'A',
        color: '#000000',
        textColor: '#FFFFFF',
        name: 'Apple TV+'
    },
    'Apple TV Plus': { // Alias
        icon: 'A',
        color: '#000000',
        textColor: '#FFFFFF',
        name: 'Apple TV+'
    },
    'Peacock': {
        icon: 'P',
        color: '#0057B8',
        textColor: '#FFFFFF',
        name: 'Peacock'
    },
    'Paramount+': {
        icon: 'P',
        color: '#0064FF',
        textColor: '#FFFFFF',
        name: 'Paramount+'
    },
    'Paramount Plus': { // Alias
        icon: 'P',
        color: '#0064FF',
        textColor: '#FFFFFF',
        name: 'Paramount+'
    },
    'Crunchyroll': {
        icon: 'C',
        color: '#F47521',
        textColor: '#FFFFFF',
        name: 'Crunchyroll'
    },
    'Showtime': {
        icon: 'S',
        color: '#D10915',
        textColor: '#FFFFFF',
        name: 'Showtime'
    },
    'Starz': {
        icon: 'S',
        color: '#000000',
        textColor: '#FFFFFF',
        name: 'Starz'
    },
    'Crave': {
        icon: 'C',
        color: '#0091DA',
        textColor: '#FFFFFF',
        name: 'Crave'
    },
    'Now TV': {
        icon: 'N',
        color: '#00D1FF',
        textColor: '#000000',
        name: 'Now TV'
    }
};

/**
 * Default/fallback platform style
 */
const DEFAULT_PLATFORM_STYLE = {
    icon: '▶',
    color: '#6366f1',
    textColor: '#FFFFFF',
    name: 'Streaming'
};

/**
 * Get platform style configuration
 * @param {string} platformName - Name of the streaming platform
 * @returns {Object} Platform style object with icon, color, textColor, name
 */
export function getPlatformStyle(platformName) {
    if (!platformName) {
        return DEFAULT_PLATFORM_STYLE;
    }

    // Try exact match first
    if (PLATFORM_STYLES[platformName]) {
        return PLATFORM_STYLES[platformName];
    }

    // Try case-insensitive match
    const normalizedName = platformName.toLowerCase().trim();
    const matchingKey = Object.keys(PLATFORM_STYLES).find(
        key => key.toLowerCase() === normalizedName
    );

    if (matchingKey) {
        return PLATFORM_STYLES[matchingKey];
    }

    // Return default for unknown platforms
    return {
        ...DEFAULT_PLATFORM_STYLE,
        name: platformName
    };
}

/**
 * Render platform badge HTML
 * @param {string} platformName - Name of the streaming platform
 * @param {Object} options - Rendering options
 * @param {string} options.size - Badge size: 'small' (24px), 'medium' (28px), 'large' (32px)
 * @param {boolean} options.showName - Whether to show platform name alongside icon
 * @returns {string} HTML string for platform badge
 */
export function renderPlatformBadge(platformName, options = {}) {
    const {
        size = 'medium',
        showName = false
    } = options;

    const style = getPlatformStyle(platformName);

    const sizes = {
        small: { width: '24px', height: '24px', fontSize: '0.75rem' },
        medium: { width: '28px', height: '28px', fontSize: '0.875rem' },
        large: { width: '32px', height: '32px', fontSize: '1rem' }
    };

    const sizeConfig = sizes[size] || sizes.medium;

    const badgeHTML = `
        <span style="
            width: ${sizeConfig.width};
            height: ${sizeConfig.height};
            border-radius: 50%;
            background: ${style.color};
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: ${sizeConfig.fontSize};
            color: ${style.textColor};
            font-weight: 800;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            flex-shrink: 0;
        ">
            ${style.icon}
        </span>
    `;

    if (showName) {
        return `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                ${badgeHTML}
                <span style="color: white; font-weight: 600;">
                    ${style.name}
                </span>
            </div>
        `;
    }

    return badgeHTML;
}

/**
 * Render multiple platform badges (for movies on multiple platforms)
 * @param {Array<string>} platforms - Array of platform names
 * @param {Object} options - Rendering options
 * @returns {string} HTML string for platform badges
 */
export function renderPlatformBadges(platforms, options = {}) {
    if (!platforms || platforms.length === 0) {
        return renderPlatformBadge('Not Available', options);
    }

    // Show first platform prominently
    const primaryPlatform = renderPlatformBadge(platforms[0], { ...options, showName: true });

    // If multiple platforms, show count
    if (platforms.length > 1) {
        return `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                ${primaryPlatform}
                <span style="
                    padding: 0.25rem 0.5rem;
                    background: rgba(166, 192, 221, 0.2);
                    border-radius: 0.5rem;
                    color: #A6C0DD;
                    font-size: 0.75rem;
                    font-weight: 600;
                ">
                    +${platforms.length - 1} more
                </span>
            </div>
        `;
    }

    return primaryPlatform;
}

/**
 * Get platform color (for inline styling)
 * @param {string} platformName - Name of the streaming platform
 * @returns {string} Hex color code
 */
export function getPlatformColor(platformName) {
    return getPlatformStyle(platformName).color;
}

/**
 * Get platform icon character
 * @param {string} platformName - Name of the streaming platform
 * @returns {string} Icon character
 */
export function getPlatformIcon(platformName) {
    return getPlatformStyle(platformName).icon;
}
