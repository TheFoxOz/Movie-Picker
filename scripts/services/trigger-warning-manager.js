/**
 * Trigger Warning Manager
 * Categorizes raw DDD warnings into 12 beautiful, user-controllable categories
 */

import { doesTheDogDieService } from './does-the-dog-die.js';

export const TRIGGER_CATEGORIES = [
  { id: 1, name: "Animal Harm", icon: "Dog/Cat", severity: "high", keywords: ["dog", "cat", "animal", "pet", "horse"] },
  { id: 2, name: "Violence/Gore", icon: "Sword", severity: "high", keywords: ["violence", "gore", "blood", "murder", "kill", "stab"] },
  { id: 3, name: "Sexual Violence", icon: "Prohibited", severity: "critical", keywords: ["rape", "sexual assault", "molestation"] },
  { id: 4, name: "Death", icon: "Skull", severity: "medium", keywords: ["death", "dies", "dead", "corpse"] },
  { id: 5, name: "Child Harm", icon: "Baby", severity: "critical", keywords: ["child", "kid", "baby", "infant"] },
  { id: 6, name: "Mental Health", icon: "Brain", severity: "high", keywords: ["suicide", "self-harm", "depression", "mental"] },
  { id: 7, name: "Jump Scares", icon: "Scared Face", severity: "low", keywords: ["jump scare", "startle"] },
  { id: 8, name: "Substance Abuse", icon: "Wine Glass", severity: "medium", keywords: ["drug", "alcohol", "addiction"] },
  { id: 9, name: "Domestic Abuse", icon: "House", severity: "critical", keywords: ["domestic", "abuse", "partner"] },
  { id: 10, name: "Medical Trauma", icon: "Hospital", severity: "medium", keywords: ["medical", "hospital", "needle", "surgery"] },
  { id: 11, name: "Hate/Discrimination", icon: "Balance Scale", severity: "high", keywords: ["racist", "homophobic", "slur"] },
  { id: 12, name: "Body Horror", icon: "Bones", severity: "high", keywords: ["body horror", "mutilation", "dismember"] }
];

export class TriggerWarningManager {
  constructor() {
    this.cache = new Map();
  }

  async getCategorizedWarnings(movie) {
    if (!movie?.id) return { categories: [], total: 0 };

    if (this.cache.has(movie.id)) {
      return this.cache.get(movie.id);
    }

    const raw = await doesTheDogDieService.getWarningsForMovie(movie.title);
    const result = this.categorizeWarnings(raw);

    this.cache.set(movie.id, result);
    movie.warningsLoaded = true;
    movie.triggerWarnings = result.categories;
    movie.triggerWarningCount = result.total;

    return result;
  }

  categorizeWarnings(rawWarnings) {
    const categories = TRIGGER_CATEGORIES.map(cat => ({
      ...cat,
      warnings: [],
      count: 0
    }));

    let total = 0;

    rawWarnings.forEach(w => {
      if (w.yesVotes > w.noVotes) {
        const matched = categories.find(cat =>
          cat.keywords.some(k => w.name.toLowerCase().includes(k))
        );

        if (matched) {
          matched.warnings.push(w);
          matched.count++;
          total++;
        }
      }
    });

    const active = categories.filter(c => c.count > 0);

    return {
      categories: active,
      total,
      hasWarnings: total > 0
    };
  }

  filterByPreferences(warnings, preferences) {
    if (!warnings.hasWarnings) return warnings;

    const { enabledCategories = [], showAllWarnings = false } = preferences;

    if (showAllWarnings) return warnings;

    const filtered = warnings.categories.filter(cat =>
      enabledCategories.includes(cat.id)
    );

    return {
      categories: filtered,
      total: filtered.reduce((sum, c) => sum + c.count, 0),
      hasWarnings: filtered.length > 0
    };
  }
}

export const triggerWarningManager = new TriggerWarningManager();
