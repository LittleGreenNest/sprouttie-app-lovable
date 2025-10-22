// Milestone detection and configuration

export const MILESTONES = {
  // Word-based milestones
  FIRST_WORD: {
    id: 'first_word',
    threshold: 1,
    type: 'words',
    icon: '🌱',
    title: 'First Sprout!',
    description: 'You flashed your very first word! Your learning garden has begun to grow.',
    reward: 'Seedling Badge'
  },
  TEN_WORDS: {
    id: 'ten_words',
    threshold: 10,
    type: 'words',
    icon: '🌿',
    title: 'Growing Strong!',
    description: 'Amazing! You\'ve flashed 10 words. Your vocabulary is sprouting!',
    reward: 'Sprout Badge'
  },
  FIFTY_WORDS: {
    id: 'fifty_words',
    threshold: 50,
    type: 'words',
    icon: '🌻',
    title: 'Blooming Beautifully!',
    description: 'Incredible progress! 50 words mastered. You\'re in full bloom!',
    reward: 'Bloom Badge'
  },
  HUNDRED_WORDS: {
    id: 'hundred_words',
    threshold: 100,
    type: 'words',
    icon: '🌳',
    title: 'Mighty Oak!',
    description: 'Outstanding! 100 words learned. Your knowledge tree is growing tall!',
    reward: 'Oak Tree Badge'
  },
  TWO_FIFTY_WORDS: {
    id: 'two_fifty_words',
    threshold: 250,
    type: 'words',
    icon: '🏞️',
    title: 'Garden Master!',
    description: 'Phenomenal achievement! 250 words. You\'ve cultivated a stunning garden!',
    reward: 'Garden Master Badge'
  },
  FIVE_HUNDRED_WORDS: {
    id: 'five_hundred_words',
    threshold: 500,
    type: 'words',
    icon: '🌲',
    title: 'Forest Guardian!',
    description: 'Legendary! 500 words mastered. You\'ve grown an entire forest of knowledge!',
    reward: 'Forest Guardian Badge'
  },

  // Streak-based milestones
  THREE_DAY_STREAK: {
    id: 'three_day_streak',
    threshold: 3,
    type: 'streak',
    icon: '🔥',
    title: 'Streak Started!',
    description: 'Three days in a row! Your consistency is building momentum.',
    reward: 'Spark Badge'
  },
  WEEK_STREAK: {
    id: 'week_streak',
    threshold: 7,
    type: 'streak',
    icon: '⚡',
    title: 'Week Warrior!',
    description: 'A full week of learning! Your dedication is electrifying!',
    reward: 'Lightning Badge'
  },
  TWO_WEEK_STREAK: {
    id: 'two_week_streak',
    threshold: 14,
    type: 'streak',
    icon: '🌟',
    title: 'Fortnight Champion!',
    description: 'Two weeks strong! You\'re shining bright with consistency.',
    reward: 'Star Badge'
  },
  MONTH_STREAK: {
    id: 'month_streak',
    threshold: 30,
    type: 'streak',
    icon: '💎',
    title: 'Diamond Dedication!',
    description: '30 days of continuous learning! Your commitment is precious!',
    reward: 'Diamond Badge'
  },
  HUNDRED_DAY_STREAK: {
    id: 'hundred_day_streak',
    threshold: 100,
    type: 'streak',
    icon: '👑',
    title: 'Century Royalty!',
    description: '100 days! You\'re royalty in the realm of dedication!',
    reward: 'Crown Badge'
  },

  // Session-based milestones
  FIRST_SESSION: {
    id: 'first_session',
    threshold: 1,
    type: 'sessions',
    icon: '🎯',
    title: 'First Steps!',
    description: 'You completed your first flashcard session! The journey begins.',
    reward: 'Beginner Badge'
  },
  TEN_SESSIONS: {
    id: 'ten_sessions',
    threshold: 10,
    type: 'sessions',
    icon: '🎪',
    title: 'Practice Makes Perfect!',
    description: '10 sessions completed! You\'re building great habits.',
    reward: 'Practice Badge'
  },
  FIFTY_SESSIONS: {
    id: 'fifty_sessions',
    threshold: 50,
    type: 'sessions',
    icon: '🎖️',
    title: 'Dedicated Learner!',
    description: '50 sessions! Your commitment to learning is admirable.',
    reward: 'Dedication Medal'
  },
  HUNDRED_SESSIONS: {
    id: 'hundred_sessions',
    threshold: 100,
    type: 'sessions',
    icon: '🏅',
    title: 'Master of Practice!',
    description: '100 sessions completed! You\'re a true master of consistent practice.',
    reward: 'Master Medal'
  }
};

/**
 * Check if a new milestone has been reached
 * @param {Object} stats - Current user statistics
 * @param {Array} achievedMilestones - Array of milestone IDs already achieved
 * @returns {Object|null} - New milestone object or null
 */
export const checkForNewMilestone = (stats, achievedMilestones = []) => {
  const { learnedWords = 0, currentStreak = 0, totalSessions = 0 } = stats;

  // Get all milestones sorted by threshold
  const allMilestones = Object.values(MILESTONES);
  
  // Check word milestones
  const wordMilestones = allMilestones
    .filter(m => m.type === 'words' && !achievedMilestones.includes(m.id))
    .sort((a, b) => a.threshold - b.threshold);
  
  for (const milestone of wordMilestones) {
    if (learnedWords >= milestone.threshold) {
      return milestone;
    }
  }

  // Check streak milestones
  const streakMilestones = allMilestones
    .filter(m => m.type === 'streak' && !achievedMilestones.includes(m.id))
    .sort((a, b) => a.threshold - b.threshold);
  
  for (const milestone of streakMilestones) {
    if (currentStreak >= milestone.threshold) {
      return milestone;
    }
  }

  // Check session milestones
  const sessionMilestones = allMilestones
    .filter(m => m.type === 'sessions' && !achievedMilestones.includes(m.id))
    .sort((a, b) => a.threshold - b.threshold);
  
  for (const milestone of sessionMilestones) {
    if (totalSessions >= milestone.threshold) {
      return milestone;
    }
  }

  return null;
};

/**
 * Get progress towards next milestone
 * @param {Object} stats - Current user statistics
 * @param {Array} achievedMilestones - Array of milestone IDs already achieved
 * @returns {Object} - Progress information
 */
export const getNextMilestoneProgress = (stats, achievedMilestones = []) => {
  const { learnedWords = 0, currentStreak = 0, totalSessions = 0 } = stats;
  
  const allMilestones = Object.values(MILESTONES);
  const unachievedMilestones = allMilestones
    .filter(m => !achievedMilestones.includes(m.id));

  let nextMilestone = null;
  let progress = 0;
  let currentValue = 0;

  // Find the closest next milestone across all types
  const wordNext = unachievedMilestones
    .filter(m => m.type === 'words' && m.threshold > learnedWords)
    .sort((a, b) => a.threshold - b.threshold)[0];
  
  const streakNext = unachievedMilestones
    .filter(m => m.type === 'streak' && m.threshold > currentStreak)
    .sort((a, b) => a.threshold - b.threshold)[0];
  
  const sessionNext = unachievedMilestones
    .filter(m => m.type === 'sessions' && m.threshold > totalSessions)
    .sort((a, b) => a.threshold - b.threshold)[0];

  // Calculate progress for each type
  const candidates = [];
  
  if (wordNext) {
    candidates.push({
      milestone: wordNext,
      progress: (learnedWords / wordNext.threshold) * 100,
      current: learnedWords,
      needed: wordNext.threshold - learnedWords
    });
  }
  
  if (streakNext) {
    candidates.push({
      milestone: streakNext,
      progress: (currentStreak / streakNext.threshold) * 100,
      current: currentStreak,
      needed: streakNext.threshold - currentStreak
    });
  }
  
  if (sessionNext) {
    candidates.push({
      milestone: sessionNext,
      progress: (totalSessions / sessionNext.threshold) * 100,
      current: totalSessions,
      needed: sessionNext.threshold - totalSessions
    });
  }

  // Return the milestone with highest progress
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.progress - a.progress);
    return candidates[0];
  }

  return null;
};
