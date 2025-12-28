/**
 * Streaming Platforms Configuration
 * Defines available streaming services
 * ✅ UPDATED: Added UK platforms (Sky Go, Now TV) and more international services
 * ✅ NEW: Added "In Cinemas" as toggleable option
 */
export const STREAMING_PLATFORMS = [
    // ✅ NEW: Theatrical Releases
    {
        id: 'In Cinemas',
        name: 'In Cinemas',
        color: '#D97706',
        icon: '🎬',
        available: true
    },
    
    // Major Global Platforms
    {
        id: 'Netflix',
        name: 'Netflix',
        color: '#E50914',
        icon: '🔴',
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
        id: 'Apple TV+',
        name: 'Apple TV+',
        color: '#000000',
        icon: '🍎',
        available: true
    },
    
    // US Platforms
    {
        id: 'Hulu',
        name: 'Hulu',
        color: '#1CE783',
        icon: '🟢',
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
    },
    
    // UK Platforms
    {
        id: 'Sky Go',
        name: 'Sky Go',
        color: '#0072C6',
        icon: '📡',
        available: true
    },
    {
        id: 'Now',
        name: 'Now TV',
        color: '#00D1FF',
        icon: '▶️',
        available: true
    },
    {
        id: 'BBC iPlayer',
        name: 'BBC iPlayer',
        color: '#E01F26',
        icon: '🎬',
        available: true
    },
    {
        id: 'Channel 4',
        name: 'Channel 4',
        color: '#5A2B81',
        icon: '4️⃣',
        available: true
    },
    {
        id: 'ITV Hub',
        name: 'ITV Hub',
        color: '#0E8F8D',
        icon: '📺',
        available: true
    },
    
    // Other International Platforms
    {
        id: 'Stan',
        name: 'Stan',
        color: '#00A8E1',
        icon: '🇦🇺',
        available: true
    },
    {
        id: 'Crave',
        name: 'Crave',
        color: '#FF4040',
        icon: '🇨🇦',
        available: true
    },
    {
        id: 'Hotstar',
        name: 'Disney+ Hotstar',
        color: '#0F1014',
        icon: '🇮🇳',
        available: true
    },
    {
        id: 'Viaplay',
        name: 'Viaplay',
        color: '#F85D20',
        icon: '🎭',
        available: true
    },
    {
        id: 'Crunchyroll',
        name: 'Crunchyroll',
        color: '#F47521',
        icon: '🍥',
        available: true
    },
    {
        id: 'Max',
        name: 'Max',
        color: '#0030E4',
        icon: '🎥',
        available: true
    },
    {
        id: 'Showtime',
        name: 'Showtime',
        color: '#D60027',
        icon: '🎭',
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

/**
 * Check if platform is available
 */
export function isPlatformAvailable(platformName) {
    const platform = STREAMING_PLATFORMS.find(p => p.id === platformName);
    return platform ? platform.available : false;
}

/**
 * Get platforms by region (helper function)
 */
export function getPlatformsByRegion(region) {
    const regionPlatforms = {
        'US': ['In Cinemas', 'Netflix', 'Hulu', 'Prime Video', 'Disney+', 'HBO Max', 'Apple TV+', 'Paramount+', 'Peacock', 'Max', 'Showtime'],
        'GB': ['In Cinemas', 'Netflix', 'Prime Video', 'Disney+', 'Apple TV+', 'Sky Go', 'Now', 'BBC iPlayer', 'Channel 4', 'ITV Hub'],
        'CA': ['In Cinemas', 'Netflix', 'Prime Video', 'Disney+', 'Apple TV+', 'Crave', 'Paramount+'],
        'AU': ['In Cinemas', 'Netflix', 'Prime Video', 'Disney+', 'Apple TV+', 'Stan'],
        'IN': ['In Cinemas', 'Netflix', 'Prime Video', 'Disney+', 'Apple TV+', 'Hotstar']
    };
    
    const platformIds = regionPlatforms[region] || ['In Cinemas', 'Netflix', 'Prime Video', 'Disney+', 'Apple TV+'];
    return STREAMING_PLATFORMS.filter(p => platformIds.includes(p.id));
}
