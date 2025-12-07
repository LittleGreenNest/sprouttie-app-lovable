// context/FlashcardContext.js - Supabase-backed flashcard storage
import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

// Create context
const FlashcardContext = createContext();

// Default categories (used for migration)
const defaultCategories = [
  { id: 'cat1', name: 'Animals' },
  { id: 'cat2', name: 'Vehicles' },
  { id: 'cat3', name: 'Household' },
  { id: 'cat4', name: 'Nature' },
  { id: 'cat5', name: 'Body Parts' }
];

// Default sets structure
const defaultSets = [
  { id: 1, name: 'Set 1', flashcardIds: [] },
  { id: 2, name: 'Set 2', flashcardIds: [] },
  { id: 3, name: 'Set 3', flashcardIds: [] },
  { id: 4, name: 'Set 4', flashcardIds: [] },
  { id: 5, name: 'Set 5', flashcardIds: [] }
];

// Provider component
export const FlashcardProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [categories, setCategories] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [sets, setSets] = useState(defaultSets);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [migrationDone, setMigrationDone] = useState(false);
  
  // Load flashcards from Supabase when user logs in
  useEffect(() => {
    if (currentUser?.id) {
      loadFlashcardsFromSupabase();
    } else {
      // Load from localStorage for unauthenticated users (backwards compatibility)
      loadFromLocalStorage();
    }
  }, [currentUser?.id]);

  // Load sets from localStorage (sets are still local for now)
  useEffect(() => {
    const savedSets = localStorage.getItem('sets');
    if (savedSets) {
      setSets(JSON.parse(savedSets));
    }
  }, []);

  // Save sets to localStorage whenever they change
  useEffect(() => {
    if (sets.length > 0) {
      localStorage.setItem('sets', JSON.stringify(sets));
    }
  }, [sets]);

  const loadFromLocalStorage = () => {
    try {
      const savedCategories = localStorage.getItem('categories');
      setCategories(savedCategories ? JSON.parse(savedCategories) : defaultCategories);
      
      const savedFlashcards = localStorage.getItem('flashcards');
      const loadedFlashcards = savedFlashcards ? JSON.parse(savedFlashcards) : [];
      setFlashcards(loadedFlashcards.map(fc => ({
        english: '',
        pinyin: '',
        ...fc,
      })));
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading from localStorage:", error);
      setCategories(defaultCategories);
      setFlashcards([]);
      setLoading(false);
    }
  };

  const loadFlashcardsFromSupabase = async () => {
    try {
      setLoading(true);
      
      // Fetch flashcards from Supabase
      const { data: supabaseFlashcards, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('folder', { ascending: true })
        .order('front', { ascending: true });

      if (error) throw error;

      // Check for localStorage data to migrate
      const localFlashcards = localStorage.getItem('flashcards');
      const localCategories = localStorage.getItem('categories');
      const hasMigrated = localStorage.getItem(`migrated_${currentUser.id}`);
      
      if (localFlashcards && !hasMigrated) {
        // Migrate localStorage data to Supabase
        await migrateLocalStorageToSupabase(
          JSON.parse(localFlashcards),
          localCategories ? JSON.parse(localCategories) : defaultCategories
        );
        localStorage.setItem(`migrated_${currentUser.id}`, 'true');
        // Reload after migration
        await loadFlashcardsFromSupabase();
        return;
      }

      // Transform Supabase data to match our context structure
      const transformedFlashcards = (supabaseFlashcards || []).map(card => ({
        id: card.id,
        word: card.front,
        english: card.back,
        pinyin: '', // Supabase doesn't store pinyin separately yet
        categoryId: card.folder || 'default',
        card_type: card.card_type || 'word',
        phrase_group: card.phrase_group,
        card_status: card.card_status,
        active_day_count: card.active_day_count,
        date_introduced: card.date_introduced,
        date_retired: card.date_retired,
        mastery_level: card.mastery_level,
      }));

      // Extract unique categories from flashcards
      const uniqueFolders = [...new Set(transformedFlashcards.map(fc => fc.categoryId))];
      const derivedCategories = uniqueFolders
        .filter(folder => folder && folder !== 'default')
        .map((folder, index) => ({
          id: folder,
          name: folder
        }));

      // Merge with default categories if needed
      const mergedCategories = derivedCategories.length > 0 
        ? derivedCategories 
        : (localCategories ? JSON.parse(localCategories) : defaultCategories);

      setFlashcards(transformedFlashcards);
      setCategories(mergedCategories);
      setLoading(false);
    } catch (error) {
      console.error("Error loading flashcards from Supabase:", error);
      loadFromLocalStorage(); // Fallback to localStorage
    }
  };

  const migrateLocalStorageToSupabase = async (localFlashcards, localCategories) => {
    try {
      console.log('Migrating localStorage flashcards to Supabase...');
      
      // Create a map of category IDs to names
      const categoryMap = {};
      localCategories.forEach(cat => {
        categoryMap[cat.id] = cat.name;
      });

      // Transform localStorage flashcards to Supabase format
      const flashcardsToInsert = localFlashcards.map(card => ({
        user_id: currentUser.id,
        front: card.word,
        back: card.english || '',
        folder: categoryMap[card.categoryId] || card.categoryId || 'default',
        card_type: card.card_type || 'word',
        phrase_group: card.phrase_group || null,
        card_status: 'waiting',
        mastery_level: 0,
        review_count: 0,
        active_day_count: 0,
      }));

      if (flashcardsToInsert.length > 0) {
        const { error } = await supabase
          .from('flashcards')
          .insert(flashcardsToInsert);

        if (error) throw error;
        console.log(`Migrated ${flashcardsToInsert.length} flashcards to Supabase`);
      }

      setMigrationDone(true);
    } catch (error) {
      console.error("Error migrating to Supabase:", error);
    }
  };

  // Category CRUD operations
  const addCategory = async (name) => {
    const newCategory = {
      id: name, // Use name as ID for simplicity
      name
    };
    setCategories(prev => [...prev, newCategory]);
    
    // Also save to localStorage for backwards compatibility
    localStorage.setItem('categories', JSON.stringify([...categories, newCategory]));
    
    return newCategory;
  };
  
  const updateCategory = async (id, name) => {
    const updatedCategories = categories.map(cat => 
      cat.id === id ? { ...cat, name } : cat
    );
    setCategories(updatedCategories);
    localStorage.setItem('categories', JSON.stringify(updatedCategories));

    // Update all flashcards with this folder in Supabase
    if (currentUser?.id) {
      try {
        await supabase
          .from('flashcards')
          .update({ folder: name })
          .eq('user_id', currentUser.id)
          .eq('folder', id);
        
        // Reload flashcards
        await loadFlashcardsFromSupabase();
      } catch (error) {
        console.error("Error updating category in Supabase:", error);
      }
    }
  };
  
  const deleteCategory = async (id) => {
    const hasFlashcards = flashcards.some(card => card.categoryId === id);
    
    if (hasFlashcards) {
      return { success: false, message: 'Cannot delete category with flashcards. Remove flashcards first.' };
    }
    
    const updatedCategories = categories.filter(cat => cat.id !== id);
    setCategories(updatedCategories);
    localStorage.setItem('categories', JSON.stringify(updatedCategories));
    
    return { success: true };
  };
  
  // Flashcard CRUD operations - Now saves to Supabase
  const addFlashcard = async (word, categoryId, english = '', pinyin = '', cardType = 'word', phraseGroup = null) => {
    const categoryName = categories.find(c => c.id === categoryId)?.name || categoryId;
    
    if (currentUser?.id) {
      try {
        const { data, error } = await supabase
          .from('flashcards')
          .insert({
            user_id: currentUser.id,
            front: word,
            back: english,
            folder: categoryName,
            card_type: cardType,
            phrase_group: phraseGroup,
            card_status: 'waiting',
            mastery_level: 0,
            review_count: 0,
            active_day_count: 0,
          })
          .select()
          .single();

        if (error) throw error;

        const newFlashcard = {
          id: data.id,
          word: data.front,
          english: data.back,
          pinyin,
          categoryId: data.folder,
          card_type: data.card_type,
          phrase_group: data.phrase_group,
        };

        setFlashcards(prev => [...prev, newFlashcard]);
        return newFlashcard;
      } catch (error) {
        console.error("Error adding flashcard to Supabase:", error);
        throw error;
      }
    } else {
      // Fallback to localStorage for unauthenticated users
      const newFlashcard = {
        id: `f${Date.now()}`,
        word,
        english,
        pinyin,
        categoryId,
        card_type: cardType,
        phrase_group: phraseGroup,
      };
      const updatedFlashcards = [...flashcards, newFlashcard];
      setFlashcards(updatedFlashcards);
      localStorage.setItem('flashcards', JSON.stringify(updatedFlashcards));
      return newFlashcard;
    }
  };
  
  const updateFlashcard = async (id, updates) => {
    if (currentUser?.id) {
      try {
        const categoryName = updates.categoryId 
          ? (categories.find(c => c.id === updates.categoryId)?.name || updates.categoryId)
          : undefined;

        const supabaseUpdates = {};
        if (updates.word !== undefined) supabaseUpdates.front = updates.word;
        if (updates.english !== undefined) supabaseUpdates.back = updates.english;
        if (categoryName !== undefined) supabaseUpdates.folder = categoryName;
        if (updates.card_type !== undefined) supabaseUpdates.card_type = updates.card_type;
        if (updates.phrase_group !== undefined) supabaseUpdates.phrase_group = updates.phrase_group;
        if (updates.card_status !== undefined) supabaseUpdates.card_status = updates.card_status;
        if (updates.active_day_count !== undefined) supabaseUpdates.active_day_count = updates.active_day_count;
        if (updates.date_introduced !== undefined) supabaseUpdates.date_introduced = updates.date_introduced;
        if (updates.date_retired !== undefined) supabaseUpdates.date_retired = updates.date_retired;

        const { error } = await supabase
          .from('flashcards')
          .update(supabaseUpdates)
          .eq('id', id)
          .eq('user_id', currentUser.id);

        if (error) throw error;

        setFlashcards(prev => prev.map(card => 
          card.id === id ? { ...card, ...updates } : card
        ));
      } catch (error) {
        console.error("Error updating flashcard in Supabase:", error);
        throw error;
      }
    } else {
      // Fallback to localStorage
      const updatedFlashcards = flashcards.map(card => 
        card.id === id ? { ...card, ...updates } : card
      );
      setFlashcards(updatedFlashcards);
      localStorage.setItem('flashcards', JSON.stringify(updatedFlashcards));
    }
  };
  
  const deleteFlashcard = async (id) => {
    // Remove from sets first
    const inSets = sets.some(set => set.flashcardIds.includes(id));
    if (inSets) {
      setSets(prev => prev.map(set => ({
        ...set,
        flashcardIds: set.flashcardIds.filter(cardId => cardId !== id)
      })));
    }

    if (currentUser?.id) {
      try {
        const { error } = await supabase
          .from('flashcards')
          .delete()
          .eq('id', id)
          .eq('user_id', currentUser.id);

        if (error) throw error;

        setFlashcards(prev => prev.filter(card => card.id !== id));
      } catch (error) {
        console.error("Error deleting flashcard from Supabase:", error);
        throw error;
      }
    } else {
      // Fallback to localStorage
      const updatedFlashcards = flashcards.filter(card => card.id !== id);
      setFlashcards(updatedFlashcards);
      localStorage.setItem('flashcards', JSON.stringify(updatedFlashcards));
    }
  };
  
  // Set operations (still localStorage-based)
  const updateSetFlashcards = (setId, flashcardIds, flashcardDates = null) => {
    setSets(prev => prev.map(set => {
      if (set.id === setId) {
        const updatedSet = { ...set, flashcardIds };
        if (flashcardDates !== null) {
          updatedSet.flashcardDates = flashcardDates;
        }
        return updatedSet;
      }
      return set;
    }));
  };
  
  // Get flashcards by category
  const getFlashcardsByCategory = (categoryId) => {
    return flashcards.filter(card => 
      card.categoryId === categoryId || 
      card.categoryId === categories.find(c => c.id === categoryId)?.name
    );
  };
  
  // Get flashcards for a set
  const getFlashcardsForSet = (setId) => {
    const set = sets.find(s => s.id === setId);
    if (!set) return [];
    
    return set.flashcardIds
      .map(id => flashcards.find(card => card.id === id))
      .filter(Boolean);
  };
  
  // Record daily tracking data (still localStorage for backwards compatibility)
  const saveTrackingData = (data) => {
    const existingIndex = history.findIndex(item => item.date === data.date);
    
    if (existingIndex >= 0) {
      const updatedHistory = [...history];
      updatedHistory[existingIndex] = data;
      setHistory(updatedHistory);
    } else {
      setHistory(prev => [...prev, data]);
    }
  };
  
  // Get tracking data for a specific date
  const getTrackingData = (date) => {
    return history.find(item => item.date === date) || null;
  };
  
  // Get flashcard usage statistics
  const getFlashcardStats = () => {
    const stats = {};
    
    history.forEach(day => {
      Object.entries(day.setUsage || {}).forEach(([setId, count]) => {
        if (count > 0) {
          const setObj = sets.find(s => s.id === parseInt(setId));
          if (setObj) {
            setObj.flashcardIds.forEach(flashcardId => {
              stats[flashcardId] = (stats[flashcardId] || 0) + count;
              
              const card = flashcards.find(c => c.id === flashcardId);
              if (card) {
                stats[card.categoryId] = (stats[card.categoryId] || 0) + count;
              }
            });
          }
        }
      });
    });
    
    return stats;
  };

  // Refresh flashcards from Supabase
  const refreshFlashcards = async () => {
    if (currentUser?.id) {
      await loadFlashcardsFromSupabase();
    }
  };
  
  const contextValue = {
    categories,
    setCategories,
    flashcards,
    sets,
    history,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    addFlashcard,
    updateFlashcard,
    deleteFlashcard,
    updateSetFlashcards,
    getFlashcardsByCategory,
    getFlashcardsForSet,
    saveTrackingData,
    getTrackingData,
    getFlashcardStats,
    refreshFlashcards,
  };
  
  return (
    <FlashcardContext.Provider value={contextValue}>
      {children}
    </FlashcardContext.Provider>
  );
};

// Custom hook for using the flashcard context
export const useFlashcards = () => {
  return useContext(FlashcardContext);
};
