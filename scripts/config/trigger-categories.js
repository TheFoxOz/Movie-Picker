/**
 * Trigger Warning Categories Configuration
 * Defines all content warning categories used in the app
 */

export const TRIGGER_CATEGORIES = [
    {
        id: 1,
        name: 'Animal Harm',
        icon: '🐕',
        severity: 'high',
        description: 'Content involving harm to animals',
        spoilerFree: 'This movie contains scenes with animals in distress',
        keywords: ['dog', 'cat', 'animal', 'pet', 'horse', 'dies']
    },
    {
        id: 2,
        name: 'Violence/Gore',
        icon: '⚔️',
        severity: 'high',
        description: 'Graphic violence or gore',
        spoilerFree: 'This movie contains graphic violence',
        keywords: ['violence', 'gore', 'blood', 'murder', 'kill', 'stab', 'shoot']
    },
    {
        id: 3,
        name: 'Sexual Violence',
        icon: '🚫',
        severity: 'critical',
        description: 'Sexual assault or rape',
        spoilerFree: 'This movie contains scenes of sexual violence',
        keywords: ['rape', 'sexual assault', 'molestation', 'abuse']
    },
    {
        id: 4,
        name: 'Death',
        icon: '💀',
        severity: 'medium',
        description: 'Character deaths',
        spoilerFree: 'Characters die in this movie',
        keywords: ['death', 'dies', 'dead', 'corpse', 'funeral']
    },
    {
        id: 5,
        name: 'Child Harm',
        icon: '👶',
        severity: 'critical',
        description: 'Harm to children',
        spoilerFree: 'This movie contains scenes involving children in danger',
        keywords: ['child', 'kid', 'baby', 'infant', 'minor']
    },
    {
        id: 6,
        name: 'Mental Health',
        icon: '🧠',
        severity: 'high',
        description: 'Suicide, self-harm, or mental health crises',
        spoilerFree: 'This movie contains mental health themes',
        keywords: ['suicide', 'self-harm', 'depression', 'mental', 'overdose']
    },
    {
        id: 7,
        name: 'Jump Scares',
        icon: '😱',
        severity: 'low',
        description: 'Sudden frightening moments',
        spoilerFree: 'This movie contains jump scares',
        keywords: ['jump scare', 'startle', 'sudden']
    },
    {
        id: 8,
        name: 'Substance Abuse',
        icon: '🍷',
        severity: 'medium',
        description: 'Drug or alcohol abuse',
        spoilerFree: 'This movie contains substance abuse',
        keywords: ['drug', 'alcohol', 'addiction', 'substance', 'overdose']
    },
    {
        id: 9,
        name: 'Domestic Abuse',
        icon: '🏠',
        severity: 'critical',
        description: 'Domestic or intimate partner violence',
        spoilerFree: 'This movie contains domestic violence',
        keywords: ['domestic', 'abuse', 'partner', 'spouse']
    },
    {
        id: 10,
        name: 'Medical Trauma',
        icon: '🏥',
        severity: 'medium',
        description: 'Medical procedures, needles, surgery',
        spoilerFree: 'This movie contains medical scenes',
        keywords: ['medical', 'hospital', 'needle', 'surgery', 'blood draw']
    },
    {
        id: 11,
        name: 'Hate/Discrimination',
        icon: '⚖️',
        severity: 'high',
        description: 'Racism, homophobia, or other discrimination',
        spoilerFree: 'This movie contains discriminatory content',
        keywords: ['racist', 'homophobic', 'slur', 'discrimination', 'hate']
    },
    {
        id: 12,
        name: 'Body Horror',
        icon: '🦴',
        severity: 'high',
        description: 'Disturbing body transformation or mutilation',
        spoilerFree: 'This movie contains body horror',
        keywords: ['body horror', 'mutilation', 'dismember', 'disfigure']
    }
];

/**
 * Get category by ID
 */
export function getCategoryById(id) {
    return TRIGGER_CATEGORIES.find(c => c.id === id);
}

/**
 * Get category name by ID
 */
export function getCategoryName(id) {
    const category = getCategoryById(id);
    return category ? category.name : 'Unknown';
}

/**
 * Get category icon by ID
 */
export function getCategoryIcon(id) {
    const category = getCategoryById(id);
    return category ? category.icon : '⚠️';
}

/**
 * Get severity color
 */
export function getSeverityColor(severity) {
    const colors = {
        critical: '#ef4444',
        high: '#f59e0b',
        medium: '#fbbf24',
        low: '#10b981'
    };
    return colors[severity] || colors.medium;
}
