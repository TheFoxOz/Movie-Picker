/**
 * Trigger Warning Categories Configuration
 * Maps DoesTheDogDie topics to internal categories
 */

export const TRIGGER_CATEGORIES = {
    1: {
        id: 1,
        name: 'Animal Harm',
        icon: '🐕',
        description: 'Content involving harm to animals',
        severity: 'high',
        spoilerFree: 'This movie contains content related to animal harm'
    },
    2: {
        id: 2,
        name: 'Violence',
        icon: '⚔️',
        description: 'Violent content including fights, gore, and brutality',
        severity: 'high',
        spoilerFree: 'This movie contains violent content'
    },
    3: {
        id: 3,
        name: 'Sexual Violence',
        icon: '🚫',
        description: 'Sexual assault, harassment, or related content',
        severity: 'critical',
        spoilerFree: 'This movie contains sexual violence'
    },
    4: {
        id: 4,
        name: 'Death',
        icon: '💀',
        description: 'Character deaths or death-related content',
        severity: 'medium',
        spoilerFree: 'This movie contains death-related content'
    },
    5: {
        id: 5,
        name: 'Kid Danger',
        icon: '👶',
        description: 'Content involving harm or danger to children',
        severity: 'critical',
        spoilerFree: 'This movie contains content involving children in danger'
    },
    6: {
        id: 6,
        name: 'Mental Health',
        icon: '🧠',
        description: 'Depictions of mental illness, self-harm, or suicide',
        severity: 'high',
        spoilerFree: 'This movie contains mental health-related content'
    },
    7: {
        id: 7,
        name: 'Jump Scares',
        icon: '😱',
        description: 'Sudden frightening moments',
        severity: 'low',
        spoilerFree: 'This movie contains jump scares'
    },
    8: {
        id: 8,
        name: 'Substance Abuse',
        icon: '🍷',
        description: 'Drug or alcohol use and addiction',
        severity: 'medium',
        spoilerFree: 'This movie contains substance abuse content'
    },
    9: {
        id: 9,
        name: 'Domestic Violence',
        icon: '🏠',
        description: 'Intimate partner violence or family abuse',
        severity: 'critical',
        spoilerFree: 'This movie contains domestic violence'
    },
    10: {
        id: 10,
        name: 'Medical',
        icon: '🏥',
        description: 'Medical procedures, illness, or injury',
        severity: 'medium',
        spoilerFree: 'This movie contains medical content'
    },
    11: {
        id: 11,
        name: 'Discrimination',
        icon: '⚖️',
        description: 'Racism, homophobia, transphobia, or other discrimination',
        severity: 'high',
        spoilerFree: 'This movie contains discriminatory content'
    },
    12: {
        id: 12,
        name: 'Body Horror',
        icon: '🦴',
        description: 'Graphic body modification or disfigurement',
        severity: 'medium',
        spoilerFree: 'This movie contains body horror'
    }
};

export function getCategoryById(id) {
    return TRIGGER_CATEGORIES[id] || {
        id,
        name: 'Other',
        icon: '⚠️',
        description: 'Other potentially triggering content',
        severity: 'medium',
        spoilerFree: 'This movie contains potentially triggering content'
    };
}

export function getAllCategories() {
    return Object.values(TRIGGER_CATEGORIES);
}

export function getCategoriesBySeverity(severity) {
    return Object.values(TRIGGER_CATEGORIES).filter(cat => cat.severity === severity);
}
