/**
 * Planning Engine - Separated logic for word selection, exposure scheduling,
 * and rolling replacement. This is the brain of Sprouttie's activation protocol.
 */

// Core constants
export const MAX_WORDS_PER_SET = 5;
export const MAX_SETS_DEFAULT = 3;
export const EXPOSURE_DAYS = 5;
export const MAX_PHRASES_PER_SET = 1;
export const MAX_ACTIVE_WORDS = 15;

/**
 * Determine number of sets based on time commitment
 */
export const getSetsForTime = (timeCommitment) => {
  switch (timeCommitment) {
    case '1-2': return 2;
    case '3-5': return 3;
    case '5-10': return 3;
    default: return 3;
  }
};

/**
 * Validate a plan against system constraints
 * Returns { valid: boolean, errors: string[] }
 */
export const validatePlan = (plan, maxSets = MAX_SETS_DEFAULT) => {
  const errors = [];

  if (!plan?.sets || !Array.isArray(plan.sets)) {
    return { valid: false, errors: ['Invalid plan structure'] };
  }

  if (plan.sets.length > maxSets) {
    errors.push(`Maximum ${maxSets} sets allowed`);
  }

  plan.sets.forEach((set, i) => {
    if (!set.words || set.words.length > MAX_WORDS_PER_SET) {
      errors.push(`Set ${i + 1}: Maximum ${MAX_WORDS_PER_SET} words per set`);
    }

    const phraseCount = set.words?.filter(w => w.is_phrase).length || 0;
    if (phraseCount > MAX_PHRASES_PER_SET) {
      errors.push(`Set ${i + 1}: Maximum ${MAX_PHRASES_PER_SET} phrase per set`);
    }
  });

  return { valid: errors.length === 0, errors };
};

/**
 * Check if a word can be swapped out of a set
 * Words mid-cycle (< 5 exposures) should not be removed
 */
export const canRemoveWord = (word, exposureCount = 0) => {
  // Mid-cycle words must stay
  if (word.reason === 'mid-cycle' && exposureCount < EXPOSURE_DAYS) {
    return false;
  }
  return true;
};

/**
 * Check if a custom word can be added to a set
 */
export const canAddToSet = (set) => {
  if (!set?.words) return true;
  return set.words.length < MAX_WORDS_PER_SET;
};

/**
 * Get adherence suggestion based on days completed
 */
export const getAdherenceSuggestion = (daysCompleted) => {
  if (daysCompleted >= 5) {
    return { pace: 'full', message: null };
  }
  if (daysCompleted >= 3) {
    return { pace: 'steady', message: null };
  }
  return {
    pace: 'simplified',
    message: 'Would you like to keep 3 sets per day, or simplify to 2 sets this week?'
  };
};

/**
 * Format week start date for display
 */
export const formatWeekRange = (weekStartStr) => {
  const start = new Date(weekStartStr + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const opts = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
};

/**
 * Get the Monday of the current week
 */
export const getWeekStart = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
};
