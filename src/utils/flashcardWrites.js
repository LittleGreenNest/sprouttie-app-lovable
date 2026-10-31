import { supabase } from '../integrations/supabase/client';
import { createFlashcardWriter } from './flashcardLimit';

export const insertFlashcards = createFlashcardWriter(supabase);
