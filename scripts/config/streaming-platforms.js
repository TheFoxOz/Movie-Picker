/**
 * Streaming Platforms Configuration
 * Defines available streaming services
 */

export const STREAMING_PLATFORMS = [
    {
        id: 'Netflix',
        name: 'Netflix',
        color: '#E50914',
        icon: '🔴',
        available: true
    },
    {
        id: 'Hulu',
        name: 'Hulu',
        color: '#1CE783',
        icon: '🟢',
        available: true
    },
    {
        id: 'Prime Video',
        name: 'Prime Video',
        color: '#00A8E1',
        icon: '🔵',
        available: true
    },
    {
        id: 'Disney+',
        name: 'Disney+',
        color: '#113CCF',
        icon: '⭐',
        available: true
    },
    {
        id: 'HBO Max',
        name: 'HBO Max',
        color: '#B200FF',
        icon: '🟣',
        available: true
    },
    {
        id: 'Apple TV+',
        name: 'Apple TV+',
        color: '#000000',
        icon: '🍎',
        available: true
    },
    {
        id: 'Paramount+',
        name: 'Paramount+',
        color: '#0064FF',
        icon: '⛰️',
        available: true
    },
    {
        id: 'Peacock',
        name: 'Peacock',
        color: '#000000',
        icon: '🦚',
        available: true
    }
];

/**
 * Get platform by ID
 */
export function getPlatformById(id) {
    return STREAMING_PLATFORMS.find(p => p.id === id);
}

/**
 * Get platform color
 */
export function getPlatformColor(platformName) {
    const platform = STREAMING_PLATFORMS.find(p => p.id === platformName);
    return platform ? platform.color : '#6366f1';
}

/**
 * Get platform icon
 */
export function getPlatformIcon(platformName) {
    const platform = STREAMING_PLATFORMS.find(p => p.id === platformName);
    return platform ? platform.icon : '▶️';
}
