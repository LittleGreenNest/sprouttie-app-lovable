// Encouragement messages system

/**
 * Get contextual encouragement message based on user stats
 * @param {Object} stats - User statistics
 * @returns {Object} - Encouragement object with icon and message
 */
export const getEncouragement = (stats) => {
  const { 
    learnedWords = 0, 
    currentStreak = 0, 
    totalSessions = 0,
    todayFlashes = 0,
    avgEngagement = 0
  } = stats;

  // Morning motivation (if no activity today)
  if (todayFlashes === 0) {
    return {
      icon: '🌅',
      message: 'Good morning! Ready to plant some new words today?',
      type: 'morning'
    };
  }

  // Streak-based encouragements
  if (currentStreak >= 30) {
    return {
      icon: '🔥',
      message: `${currentStreak} day streak! You're absolutely unstoppable!`,
      type: 'streak'
    };
  }
  
  if (currentStreak >= 14) {
    return {
      icon: '⚡',
      message: `${currentStreak} days strong! Your consistency is inspiring!`,
      type: 'streak'
    };
  }
  
  if (currentStreak >= 7) {
    return {
      icon: '🌟',
      message: `Week ${Math.floor(currentStreak / 7)} completed! Keep the momentum going!`,
      type: 'streak'
    };
  }
  
  if (currentStreak >= 3) {
    return {
      icon: '💪',
      message: `${currentStreak} days in a row! You're building great habits!`,
      type: 'streak'
    };
  }

  // Progress-based encouragements
  if (learnedWords >= 500) {
    return {
      icon: '🏆',
      message: 'Over 500 words! You\'re a vocabulary champion!',
      type: 'progress'
    };
  }
  
  if (learnedWords >= 250) {
    return {
      icon: '🌳',
      message: 'Your knowledge forest is flourishing with 250+ words!',
      type: 'progress'
    };
  }
  
  if (learnedWords >= 100) {
    return {
      icon: '🌻',
      message: '100+ words mastered! Your garden is in full bloom!',
      type: 'progress'
    };
  }
  
  if (learnedWords >= 50) {
    return {
      icon: '🌿',
      message: '50 words and counting! You\'re growing beautifully!',
      type: 'progress'
    };
  }
  
  if (learnedWords >= 10) {
    return {
      icon: '🌱',
      message: 'Great start! 10 words sprouting strong!',
      type: 'progress'
    };
  }

  // Session-based encouragements
  if (totalSessions >= 100) {
    return {
      icon: '🎯',
      message: '100+ sessions! Your dedication is remarkable!',
      type: 'sessions'
    };
  }
  
  if (totalSessions >= 50) {
    return {
      icon: '🎪',
      message: 'Over 50 practice sessions completed! Excellence is a habit!',
      type: 'sessions'
    };
  }

  // Engagement-based encouragements
  if (avgEngagement >= 4.5) {
    return {
      icon: '✨',
      message: 'Your high engagement shows your passion for learning!',
      type: 'engagement'
    };
  }
  
  if (avgEngagement >= 3.5) {
    return {
      icon: '💫',
      message: 'Wonderful engagement! You\'re making great connections!',
      type: 'engagement'
    };
  }

  // Today's activity encouragements
  if (todayFlashes >= 20) {
    return {
      icon: '🌟',
      message: `${todayFlashes} words today! You're on fire!`,
      type: 'daily'
    };
  }
  
  if (todayFlashes >= 10) {
    return {
      icon: '🌞',
      message: `${todayFlashes} cards flashed today! Excellent progress!`,
      type: 'daily'
    };
  }
  
  if (todayFlashes > 0) {
    return {
      icon: '🌿',
      message: 'Great work today! Every card counts toward your growth!',
      type: 'daily'
    };
  }

  // Default encouragement for beginners
  return {
    icon: '🌱',
    message: 'Welcome to your learning journey! Let\'s grow together!',
    type: 'welcome'
  };
};

/**
 * Get time-of-day specific greeting
 * @returns {Object} - Greeting object with icon and message
 */
export const getTimeGreeting = () => {
  const hour = new Date().getHours();
  
  if (hour < 6) {
    return {
      icon: '🌙',
      message: 'Burning the midnight oil? Amazing dedication!',
      period: 'night'
    };
  }
  
  if (hour < 12) {
    return {
      icon: '🌅',
      message: 'Good morning! Perfect time to water your word garden!',
      period: 'morning'
    };
  }
  
  if (hour < 17) {
    return {
      icon: '☀️',
      message: 'Good afternoon! Your brain is at peak learning mode!',
      period: 'afternoon'
    };
  }
  
  if (hour < 21) {
    return {
      icon: '🌆',
      message: 'Good evening! A perfect time to review today\'s progress!',
      period: 'evening'
    };
  }
  
  return {
    icon: '🌙',
    message: 'Good night! Even a short session counts!',
    period: 'night'
  };
};

/**
 * Get motivational tip based on user behavior
 * @param {Object} stats - User statistics
 * @returns {string} - Motivational tip
 */
export const getMotivationalTip = (stats) => {
  const { currentStreak, avgEngagement, todayFlashes } = stats;

  const tips = [];

  // Streak maintenance tips
  if (currentStreak === 0) {
    tips.push("💡 Tip: Start a streak today! Just 5 minutes of daily practice can make a huge difference.");
  } else if (currentStreak >= 1 && currentStreak < 3) {
    tips.push("💡 Tip: You're building momentum! Come back tomorrow to keep your streak alive.");
  }

  // Engagement tips
  if (avgEngagement < 3) {
    tips.push("💡 Tip: Try reviewing cards in different settings to boost retention!");
  }

  // Activity tips
  if (todayFlashes === 0) {
    tips.push("💡 Tip: Research shows that reviewing in the morning improves retention by 30%!");
  }

  // General tips
  tips.push(
    "💡 Tip: Consistency beats intensity. 10 minutes daily is better than 2 hours once a week!",
    "💡 Tip: Say the words out loud while reviewing to engage multiple learning pathways!",
    "💡 Tip: Create mental images for each word to boost memory retention!",
    "💡 Tip: Review difficult words right before bed for better consolidation during sleep!",
    "💡 Tip: Mix up your sets to prevent boredom and improve long-term retention!"
  );

  return tips[Math.floor(Math.random() * tips.length)];
};
