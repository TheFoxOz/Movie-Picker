/**
 * Streaming Platform Configuration
 */

export const STREAMING_PLATFORMS = {
    NETFLIX: {
        id: 'netflix',
        name: 'Netflix',
        icon: '🔴',
        color: '#E50914',
        apiIdentifier: 'netflix'
    },
    PRIME_VIDEO: {
        id: 'prime',
        name: 'Prime Video',
        icon: '🔵',
        color: '#00A8E1',
        apiIdentifier: 'prime'
    },
    DISNEY_PLUS: {
        id: 'disney',
        name: 'Disney+',
        icon: '⭐',
        color: '#113CCF',
        apiIdentifier: 'disney'
    },
    HBO_MAX: {
        id: 'hbo',
        name: 'HBO Max',
        icon: '🟣',
        color: '#B005E3',
        apiIdentifier: 'hbo'
    },
    APPLE_TV: {
        id: 'apple',
        name: 'Apple TV+',
        icon: '🍎',
        color: '#000000',
        apiIdentifier: 'apple'
    },
    HULU: {
        id: 'hulu',
        name: 'Hulu',
        icon: '🟢',
        color: '#1CE783',
        apiIdentifier: 'hulu'
    },
    PARAMOUNT_PLUS: {
        id: 'paramount',
        name: 'Paramount+',
        icon: '⛰️',
        color: '#0064FF',
        apiIdentifier: 'paramount'
    },
    PEACOCK: {
        id: 'peacock',
        name: 'Peacock',
        icon: '🦚',
        color: '#000000',
        apiIdentifier: 'peacock'
    }
};

export const SUPPORTED_COUNTRIES = {
    US: {
        code: 'US',
        name: 'United States',
        flag: '🇺🇸',
        platforms: ['netflix', 'prime', 'disney', 'hbo', 'apple', 'hulu', 'paramount', 'peacock']
    },
    GB: {
        code: 'GB',
        name: 'United Kingdom',
        flag: '🇬🇧',
        platforms: ['netflix', 'prime', 'disney', 'apple']
    },
    FR: {
        code: 'FR',
        name: 'France',
        flag: '🇫🇷',
        platforms: ['netflix', 'prime', 'disney', 'apple']
    },
    DE: {
        code: 'DE',
        name: 'Germany',
        flag: '🇩🇪',
        platforms: ['netflix', 'prime', 'disney', 'apple']
    },
    ES: {
        code: 'ES',
        name: 'Spain',
        flag: '🇪🇸',
        platforms: ['netflix', 'prime', 'disney', 'apple']
    },
    IT: {
        code: 'IT',
        name: 'Italy',
        flag: '🇮🇹',
        platforms: ['netflix', 'prime', 'disney', 'apple']
    },
    CA: {
        code: 'CA',
        name: 'Canada',
        flag: '🇨🇦',
        platforms: ['netflix', 'prime', 'disney', 'apple', 'paramount']
    },
    AU: {
        code: 'AU',
        name: 'Australia',
        flag: '🇦🇺',
        platforms: ['netflix', 'prime', 'disney', 'apple']
    },
    JP: {
        code: 'JP',
        name: 'Japan',
        flag: '🇯🇵',
        platforms: ['netflix', 'prime', 'disney', 'apple']
    },
    BR: {
        code: 'BR',
        name: 'Brazil',
        flag: '🇧🇷',
        platforms: ['netflix', 'prime', 'disney', 'apple']
    }
};

export function getCountryByCode(code) {
    return SUPPORTED_COUNTRIES[code] || SUPPORTED_COUNTRIES.US;
}

export function getPlatformByIdentifier(identifier) {
    return Object.values(STREAMING_PLATFORMS).find(p => p.apiIdentifier === identifier);
}

export function getAvailablePlatformsForCountry(countryCode) {
    const country = SUPPORTED_COUNTRIES[countryCode];
    if (!country) return [];
    
    return country.platforms
        .map(platformId => Object.values(STREAMING_PLATFORMS).find(p => p.apiIdentifier === platformId))
        .filter(Boolean);
}
