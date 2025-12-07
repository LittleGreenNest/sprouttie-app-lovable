import { supabase } from '@/integrations/supabase/client';

/**
 * Log user activity to the database
 * @param {string} activityType - Type of activity (e.g., 'print', 'bingo', 'export')
 * @param {string} description - Human-readable description
 * @param {object} metadata - Additional data about the activity
 */
export const logActivity = async (activityType, description, metadata = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('Activity not logged: user not authenticated');
      return null;
    }

    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        activity_type: activityType,
        description,
        metadata
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging activity:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error in logActivity:', err);
    return null;
  }
};

// Activity type constants
export const ACTIVITY_TYPES = {
  PRINT_FLASHCARDS: 'print_flashcards',
  BINGO_GENERATED: 'bingo_generated',
  EXPORT_DATA: 'export_data',
  FLASHCARD_ADDED: 'flashcard_added',
  FLASHCARD_DELETED: 'flashcard_deleted',
  CSV_IMPORT: 'csv_import'
};
