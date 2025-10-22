// Timezone-safe streak calculation utilities

/**
 * Get user's local date in their timezone
 * @param {string} timezone - User's timezone (e.g., 'America/New_York')
 * @returns {string} - Date in YYYY-MM-DD format
 */
export const getUserLocalDate = (timezone = 'UTC') => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now); // Returns YYYY-MM-DD
};

/**
 * Calculate streak from daily tracking data
 * @param {Array} trackingData - Array of tracking records with date field
 * @param {string} timezone - User's timezone
 * @returns {Object} - { currentStreak, longestStreak, lastActivityDate }
 */
export const calculateStreakFromData = (trackingData, timezone = 'UTC') => {
  if (!trackingData || trackingData.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastActivityDate: null };
  }

  // Get unique dates and sort them in descending order
  const uniqueDates = [...new Set(trackingData.map(t => t.date))].sort().reverse();
  
  if (uniqueDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastActivityDate: null };
  }

  const today = getUserLocalDate(timezone);
  const yesterday = getDateBefore(today, 1);
  
  let currentStreak = 0;
  let longestStreak = 0;
  let consecutiveCount = 0;
  
  // Check if user has activity today or yesterday to start counting current streak
  const hasRecentActivity = uniqueDates[0] === today || uniqueDates[0] === yesterday;
  let isCurrentStreak = hasRecentActivity;
  
  // Calculate streaks
  for (let i = 0; i < uniqueDates.length; i++) {
    const currentDate = uniqueDates[i];
    consecutiveCount++;
    
    // Track longest streak
    longestStreak = Math.max(longestStreak, consecutiveCount);
    
    // Track current streak (only if it starts from today or yesterday)
    if (isCurrentStreak) {
      currentStreak = consecutiveCount;
    }
    
    // Check if next date is consecutive
    const nextDate = uniqueDates[i + 1];
    if (nextDate) {
      const expectedNextDate = getDateBefore(currentDate, 1);
      if (nextDate !== expectedNextDate) {
        // Streak broken
        consecutiveCount = 0;
        isCurrentStreak = false;
      }
    }
  }

  return {
    currentStreak,
    longestStreak,
    lastActivityDate: uniqueDates[0],
  };
};

/**
 * Get date N days before a given date
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {number} days - Number of days to subtract
 * @returns {string} - Date in YYYY-MM-DD format
 */
export const getDateBefore = (dateString, days) => {
  const date = new Date(dateString + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().split('T')[0];
};

/**
 * Get date range for filtering
 * @param {string} filter - 'today' | 'week' | 'month' | 'all'
 * @param {string} timezone - User's timezone
 * @returns {Object} - { startDate, endDate }
 */
export const getDateRange = (filter, timezone = 'UTC') => {
  const today = getUserLocalDate(timezone);
  
  switch (filter) {
    case 'today':
      return { startDate: today, endDate: today };
    case 'week':
      return { startDate: getDateBefore(today, 7), endDate: today };
    case 'month':
      return { startDate: getDateBefore(today, 30), endDate: today };
    case 'all':
    default:
      return { startDate: null, endDate: null };
  }
};

/**
 * Check if date is within range
 * @param {string} date - Date to check
 * @param {string} startDate - Range start
 * @param {string} endDate - Range end
 * @returns {boolean}
 */
export const isDateInRange = (date, startDate, endDate) => {
  if (!startDate && !endDate) return true;
  if (!date) return false;
  
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  
  return true;
};
