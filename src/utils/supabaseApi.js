// API utilities for Supabase operations
import { supabase } from '@/integrations/supabase/client';
import { getUserLocalDate, calculateStreakFromData } from './streakUtils';

/**
 * Fetch user's flashcards with progress data
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of flashcards with progress
 */
export const fetchFlashcardsWithProgress = async (userId) => {
  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('user_id', userId)
    .order('folder', { ascending: true })
    .order('front', { ascending: true });

  if (error) throw error;
  return data || [];
};

/**
 * Fetch user's tracking data
 * @param {string} userId - User ID
 * @param {Object} dateRange - Optional { startDate, endDate }
 * @returns {Promise<Array>} - Array of tracking records
 */
export const fetchTrackingData = async (userId, dateRange = {}) => {
  let query = supabase
    .from('daily_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'flashed')
    .order('date', { ascending: false });

  if (dateRange.startDate) {
    query = query.gte('date', dateRange.startDate);
  }
  if (dateRange.endDate) {
    query = query.lte('date', dateRange.endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * Fetch user profile with streak data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User profile
 */
export const fetchUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update user streak data
 * @param {string} userId - User ID
 * @param {Object} streakData - { currentStreak, longestStreak, lastActivityDate }
 * @returns {Promise<Object>}
 */
export const updateUserStreak = async (userId, streakData) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(streakData)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Track flashcard activity
 * @param {Object} trackingData - Tracking data to insert
 * @returns {Promise<Object>}
 */
export const trackFlashcard = async (trackingData) => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localDate = getUserLocalDate(timezone);

  const { data, error } = await supabase
    .from('daily_tracking')
    .insert({
      ...trackingData,
      timezone,
      user_local_date: localDate,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update flashcard progress
 * @param {string} flashcardId - Flashcard ID
 * @param {string} userId - User ID
 * @param {Object} progress - { mastery_level, review_count }
 * @returns {Promise<Object>}
 */
export const updateFlashcardProgress = async (flashcardId, userId, progress) => {
  const { data, error } = await supabase
    .from('flashcards')
    .update({
      ...progress,
      last_reviewed_at: new Date().toISOString(),
    })
    .eq('id', flashcardId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Get flashcard statistics by category
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Statistics grouped by category
 */
export const getFlashcardStatsByCategory = async (userId) => {
  const flashcards = await fetchFlashcardsWithProgress(userId);
  const trackingData = await fetchTrackingData(userId);
  
  const flashedIds = new Set(trackingData.map(t => t.flashcard_id));
  
  const statsByCategory = {};
  
  flashcards.forEach(card => {
    const category = card.folder || 'Uncategorized';
    if (!statsByCategory[category]) {
      statsByCategory[category] = {
        total: 0,
        flashed: 0,
        mastered: 0,
        avgMastery: 0,
      };
    }
    
    statsByCategory[category].total++;
    if (flashedIds.has(card.id)) {
      statsByCategory[category].flashed++;
    }
    if (card.mastery_level >= 4) {
      statsByCategory[category].mastered++;
    }
    statsByCategory[category].avgMastery += (card.mastery_level || 0);
  });
  
  // Calculate averages
  Object.keys(statsByCategory).forEach(category => {
    const stats = statsByCategory[category];
    stats.avgMastery = stats.total > 0 
      ? (stats.avgMastery / stats.total).toFixed(1) 
      : 0;
    stats.progress = stats.total > 0 
      ? Math.round((stats.flashed / stats.total) * 100) 
      : 0;
  });
  
  return statsByCategory;
};

/**
 * Calculate and sync user streak
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Updated streak data
 */
export const syncUserStreak = async (userId) => {
  const trackingData = await fetchTrackingData(userId);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const streakData = calculateStreakFromData(trackingData, timezone);
  const updated = await updateUserStreak(userId, streakData);
  
  return updated;
};
