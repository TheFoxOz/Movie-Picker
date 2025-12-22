/**
 * Trigger Warning Categories Configuration
 * Defines all content warning categories used in the app
 * ✅ Simplified to match DoesTheDogDie API structure
 */

export const TRIGGER_CATEGORIES = [
    { id: 'animal', name: 'Animal Harm', icon: '🐕' },
    { id: 'violence', name: 'Violence/Gore', icon: '⚔️' },
    { id: 'sexual', name: 'Sexual Violence', icon: '🚫' },
    { id: 'death', name: 'Death', icon: '💀' },
    { id: 'child', name: 'Child Harm', icon: '👶' },
    { id: 'mental', name: 'Mental Health', icon: '🧠' },
    { id: 'jump', name: 'Jump Scares', icon: '😱' },
    { id: 'substance', name: 'Substance Abuse', icon: '🍷' },
    { id: 'domestic', name: 'Domestic Abuse', icon: '🏠' },
    { id: 'medical', name: 'Medical Trauma', icon: '🏥' },
    { id: 'discrimination', name: 'Hate/Discrimination', icon: '⚖️' },
    { id: 'body', name: 'Body Horror', icon: '🦴' },
    { id: 'insects', name: 'Insects/Spiders', icon: '🕷️' },
    { id: 'drowning', name: 'Drowning', icon: '🌊' },
    { id: 'fire', name: 'Fire/Burning', icon: '🔥' },
    { id: 'car', name: 'Car Accidents', icon: '🚗' },
    { id: 'food', name: 'Eating Disorders', icon: '🍽️' },
    { id: 'pregnancy', name: 'Pregnancy/Childbirth', icon: '🤰' }
];

/**
 * Get category by ID
 */
export function getCategoryById(id) {
    return TRIGGER_CATEGORIES.find(c => c.id === id);
}

/**
 * Get category by name (case-insensitive partial match)
 */
export function getCategoryByName(name) {
    if (!name) return null;
    const lowerName = name.toLowerCase();
    return TRIGGER_CATEGORIES.find(c => 
        c.name.toLowerCase().includes(lowerName) || 
        lowerName.includes(c.name.toLowerCase())
    );
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
 * Map DoesTheDogDie warning to category
 * DDD warnings come with names like "A dog dies", "There is gore", etc.
 */
export function mapWarningToCategory(warningName) {
    if (!warningName) return null;
    
    const lowerName = warningName.toLowerCase();
    
    // Animal keywords
    if (/dog|cat|pet|animal|horse|bird/.test(lowerName)) {
        return getCategoryById('animal');
    }
    
    // Violence keywords
    if (/gore|blood|violen|murder|kill|stab|shoot|fight/.test(lowerName)) {
        return getCategoryById('violence');
    }
    
    // Sexual violence keywords
    if (/rape|sexual assault|molestat/.test(lowerName)) {
        return getCategoryById('sexual');
    }
    
    // Death keywords
    if (/dies|death|dead|corpse|funeral/.test(lowerName)) {
        return getCategoryById('death');
    }
    
    // Child harm keywords
    if (/child|kid|baby|minor/.test(lowerName)) {
        return getCategoryById('child');
    }
    
    // Mental health keywords
    if (/suicide|self-harm|depression|mental/.test(lowerName)) {
        return getCategoryById('mental');
    }
    
    // Jump scares
    if (/jump scare|startle|sudden/.test(lowerName)) {
        return getCategoryById('jump');
    }
    
    // Substance abuse
    if (/drug|alcohol|addict|substance/.test(lowerName)) {
        return getCategoryById('substance');
    }
    
    // Domestic abuse
    if (/domestic|abuse|spouse|partner/.test(lowerName)) {
        return getCategoryById('domestic');
    }
    
    // Medical trauma
    if (/medical|hospital|needle|surgery|injection/.test(lowerName)) {
        return getCategoryById('medical');
    }
    
    // Discrimination
    if (/racist|homophob|slur|discriminat|hate/.test(lowerName)) {
        return getCategoryById('discrimination');
    }
    
    // Body horror
    if (/body horror|mutilat|dismember/.test(lowerName)) {
        return getCategoryById('body');
    }
    
    // Insects
    if (/insect|spider|bug|crawl/.test(lowerName)) {
        return getCategoryById('insects');
    }
    
    // Drowning
    if (/drown|underwater|suffocate/.test(lowerName)) {
        return getCategoryById('drowning');
    }
    
    // Fire
    if (/fire|burn|flame/.test(lowerName)) {
        return getCategoryById('fire');
    }
    
    // Car accidents
    if (/car|crash|accident|collision/.test(lowerName)) {
        return getCategoryById('car');
    }
    
    // Eating disorders
    if (/eating disorder|anorex|bulim|vomit/.test(lowerName)) {
        return getCategoryById('food');
    }
    
    // Pregnancy
    if (/pregnan|childbirth|miscarr/.test(lowerName)) {
        return getCategoryById('pregnancy');
    }
    
    // Default: return null (no category match)
    return null;
}

/**
 * Get all categories as array of names
 */
export function getAllCategoryNames() {
    return TRIGGER_CATEGORIES.map(c => c.name);
}

/**
 * Get all categories as array of IDs
 */
export function getAllCategoryIds() {
    return TRIGGER_CATEGORIES.map(c => c.id);
}
