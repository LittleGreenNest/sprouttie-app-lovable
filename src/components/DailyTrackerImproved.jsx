import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../context/AuthContext';
import { useFlashcards } from '../context/FlashcardContext';
import { toast } from 'react-toastify';
import DayHeader from './tracking/DayHeader';
import SetAccordion from './tracking/SetAccordion';
import StickyNoteButton from './tracking/StickyNoteButton';
import NotesList from './tracking/NotesList';
import UpgradeBanner from './tracking/UpgradeBanner';
import PillToggle from './ui/PillToggle';
import PronunciationButton from './pronunciation/PronunciationButton';

const DailyTrackerImproved = () => {
  const { currentUser } = useAuth();
  const { sets, flashcards, getFlashcardsForSet, categories, updateSetFlashcards, addFlashcard, addCategory } = useFlashcards();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sessions, setSessions] = useState({}); // { setId: { round1: {completed, by, time}, round2: {}, round3: {} } }
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [familyMember, setFamilyMember] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingSetId, setEditingSetId] = useState(null);
  const [availableWords, setAvailableWords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [flashedWords, setFlashedWords] = useState(new Set());
  const [showCreateWord, setShowCreateWord] = useState(false);
  const [newWordData, setNewWordData] = useState({ word: '', english: '', pinyin: '', categoryId: '' });
  const [userPlan, setUserPlan] = useState(null);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  const dailyGoal = sets.length * 3; // Each set should be done 3 times

  useEffect(() => {
    if (currentUser) {
      loadDayData();
      loadUserPlan();
    } else {
      setLoading(false);
    }
  }, [currentUser, selectedDate]);

  const loadUserPlan = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', currentUser.id)
        .single();

      if (error) throw error;
      setUserPlan(data?.plan || 'free');
    } catch (error) {
      console.error('Error loading user plan:', error);
      setUserPlan('free');
    }
  };

  // Update available words when flashcards or sets change while editing
  useEffect(() => {
    if (editingSetId !== null) {
      const currentSet = sets.find(s => s.id === editingSetId);
      if (currentSet) {
        const currentSetCardIds = new Set(currentSet.flashcardIds || []);
        const available = flashcards.filter(card => !currentSetCardIds.has(card.id));
        setAvailableWords(available);
      }
    }
  }, [flashcards, sets, editingSetId]);

  const loadDayData = async () => {
    try {
      setLoading(true);
      const dateString = selectedDate.toISOString().split('T')[0];

      // Load session tracking
      const { data: trackingData, error: trackingError } = await supabase
        .from('daily_tracking')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('date', dateString);

      if (trackingError) throw trackingError;

      // Organize sessions by set and round
      const sessionsMap = {};
      const flashedWordsSet = new Set();
      
      (trackingData || []).forEach(record => {
        // Track flashed words
        if (record.status === 'flashed' && record.flashcard_id && record.flashcard_id !== 'shared-note') {
          flashedWordsSet.add(record.flashcard_id);
        }
        
        // Organize session data
        if (record.notes && record.status === 'flashed') {
          try {
            const metadata = JSON.parse(record.notes);
            if (metadata.setId && metadata.round) {
              if (!sessionsMap[metadata.setId]) {
                sessionsMap[metadata.setId] = {};
              }
              sessionsMap[metadata.setId][`round${metadata.round}`] = {
                completed: true,
                by: record.flashed_by,
                time: record.flashed_at
              };
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      });

      setSessions(sessionsMap);
      setFlashedWords(flashedWordsSet);

      // Load notes (stored separately)
      const { data: notesData, error: notesError } = await supabase
        .from('daily_tracking')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('date', dateString)
        .eq('status', 'note')
        .order('created_at', { ascending: true });

      if (notesError) throw notesError;

      const parsedNotes = (notesData || []).map(n => ({
        text: n.notes,
        by: n.flashed_by,
        time: n.flashed_at
      }));

      setNotes(parsedNotes);
    } catch (error) {
      console.error('Error loading day data:', error);
      toast.error('Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  const toggleSession = async (setId, round) => {
    if (!currentUser) {
      toast.error('Please log in to track sessions');
      return;
    }

    const requiresFamilyMember = userPlan === 'print' || userPlan === 'pro';
    if (requiresFamilyMember && !familyMember.trim()) {
      toast.warning('Please enter your name first');
      return;
    }

    const trackedBy = familyMember.trim() || 'User';

    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      const roundKey = `round${round}`;
      const isCompleted = sessions[setId]?.[roundKey]?.completed;

      if (isCompleted) {
        // Remove the session
        const newSessions = { ...sessions };
        delete newSessions[setId]?.[roundKey];
        setSessions(newSessions);

        // Delete from database
        const { error } = await supabase
          .from('daily_tracking')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('date', dateString)
          .eq('status', 'flashed')
          .like('notes', `%"setId":${setId}%`)
          .like('notes', `%"round":${round}%`);

        if (error) throw error;
      } else {
        // Add the session
        const newSessions = { ...sessions };
        if (!newSessions[setId]) newSessions[setId] = {};
        newSessions[setId][roundKey] = {
          completed: true,
          by: trackedBy,
          time: new Date().toISOString()
        };
        setSessions(newSessions);

        // Save to database - save ALL flashcards in the set as flashed
        const setFlashcards = getFlashcardsForSet(setId);
        
        console.log('Tracking session:', { setId, round, setFlashcards: setFlashcards.map(f => f.id) });

        // Insert a tracking record for EACH flashcard in the set
        for (const flashcard of setFlashcards) {
          const { error } = await supabase
            .from('daily_tracking')
            .insert({
              user_id: currentUser.id,
              flashcard_id: flashcard.id,
              date: dateString,
              status: 'flashed',
              flashed_by: trackedBy,
              flashed_at: new Date().toISOString(),
              notes: JSON.stringify({ setId, round })
            });

          if (error) throw error;
        }
        
        // If set has no flashcards, save a placeholder
        if (setFlashcards.length === 0) {
          const { error } = await supabase
            .from('daily_tracking')
            .insert({
              user_id: currentUser.id,
              flashcard_id: `set-${setId}`,
              date: dateString,
              status: 'flashed',
              flashed_by: trackedBy,
              flashed_at: new Date().toISOString(),
              notes: JSON.stringify({ setId, round })
            });

          if (error) throw error;
        }
        toast.success('Session marked complete!');
      }
    } catch (error) {
      console.error('Error toggling session:', error);
      toast.error('Failed to update session: ' + error.message);
    }
  };

  const markAllRound = async (round) => {
    if (!currentUser) {
      toast.error('Please log in to track sessions');
      return;
    }

    // Check if family member is required (for print/pro plans) and if it's filled
    const requiresFamilyMember = userPlan === 'print' || userPlan === 'pro';
    if (requiresFamilyMember && !familyMember.trim()) {
      toast.warning('Please enter your name first');
      return;
    }

    // Use family member name if available, otherwise use a default
    const trackedBy = familyMember.trim() || 'User';

    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      const roundKey = `round${round}`;
      const newSessions = { ...sessions };

      for (const set of sets) {
        if (!newSessions[set.id]) newSessions[set.id] = {};
        if (!newSessions[set.id][roundKey]?.completed) {
          newSessions[set.id][roundKey] = {
            completed: true,
            by: trackedBy,
            time: new Date().toISOString()
          };

          // Save to database - save ALL flashcards in the set as flashed
          const setFlashcards = getFlashcardsForSet(set.id);
          
          console.log('Tracking all round:', { setId: set.id, round, setFlashcards: setFlashcards.map(f => f.id) });

          // Insert a tracking record for EACH flashcard in the set
          for (const flashcard of setFlashcards) {
            const { error } = await supabase
              .from('daily_tracking')
              .insert({
                user_id: currentUser.id,
                flashcard_id: flashcard.id,
                date: dateString,
                status: 'flashed',
                flashed_by: trackedBy,
                flashed_at: new Date().toISOString(),
                notes: JSON.stringify({ setId: set.id, round })
              });

            if (error) throw error;
          }
          
          // If set has no flashcards, save a placeholder
          if (setFlashcards.length === 0) {
            const { error } = await supabase
              .from('daily_tracking')
              .insert({
                user_id: currentUser.id,
                flashcard_id: `set-${set.id}`,
                date: dateString,
                status: 'flashed',
                flashed_by: trackedBy,
                flashed_at: new Date().toISOString(),
                notes: JSON.stringify({ setId: set.id, round })
              });

            if (error) throw error;
          }
        }
      }

      setSessions(newSessions);
      toast.success(`All Round ${round} sessions marked complete!`);
    } catch (error) {
      console.error('Error marking all round:', error);
      toast.error('Failed to mark all sessions: ' + error.message);
    }
  };

  const addNote = async () => {
    if (!currentUser) {
      toast.error('Please log in to add notes');
      return;
    }

    if (!newNote.trim()) {
      toast.warning('Please enter a note');
      return;
    }

    // Check if family member is required and filled
    const requiresFamilyMember = userPlan === 'print' || userPlan === 'pro';
    if (requiresFamilyMember && !familyMember.trim()) {
      toast.warning('Please enter your name first');
      return;
    }

    const trackedBy = familyMember.trim() || 'User';

    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      const timestamp = new Date().toISOString();

      const noteEntry = {
        text: newNote.trim(),
        by: trackedBy,
        time: timestamp
      };

      setNotes([...notes, noteEntry]);
      setNewNote('');

      // Save to database - use a placeholder flashcard_id for notes
      const { error } = await supabase
        .from('daily_tracking')
        .insert({
          user_id: currentUser.id,
          flashcard_id: 'shared-note',
          date: dateString,
          status: 'note',
          flashed_by: trackedBy,
          flashed_at: timestamp,
          notes: newNote.trim()
        });

      if (error) throw error;
      toast.success('Note added successfully!');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note: ' + error.message);
    }
  };

  const getCompletedCount = () => {
    let count = 0;
    Object.values(sessions).forEach(setData => {
      ['round1', 'round2', 'round3'].forEach(round => {
        if (setData[round]?.completed) count++;
      });
    });
    return count;
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  const getWordAge = (setFlashcards) => {
    if (setFlashcards.length === 0) return { oldest: null, newest: null };
    
    // Sort by some identifier - for now, we'll use the id or creation order
    // Assuming earlier ids = older cards
    const sorted = [...setFlashcards].sort((a, b) => {
      // Try to extract number from id (e.g., "f1" -> 1)
      const aNum = parseInt(a.id.replace(/\D/g, '')) || 0;
      const bNum = parseInt(b.id.replace(/\D/g, '')) || 0;
      return aNum - bNum;
    });

    return {
      oldest: sorted[0]?.id,
      newest: sorted[sorted.length - 1]?.id
    };
  };

  const startEditingSet = (setId) => {
    setEditingSetId(setId);
    setSearchQuery('');
    setSelectedCategoryFilter('all');
    setShowCreateWord(false);
    setNewWordData({ word: '', english: '', pinyin: '', categoryId: categories[0]?.id || '' });
    
    // Get all available flashcards not in this set AND not flashed today
    const currentSet = sets.find(s => s.id === setId);
    const currentSetCardIds = new Set(currentSet?.flashcardIds || []);
    const available = flashcards.filter(card => !currentSetCardIds.has(card.id) && !flashedWords.has(card.id));
    setAvailableWords(available);
  };

  const createAndAddWord = () => {
    if (!newWordData.word.trim()) {
      toast.warning('Please enter a word');
      return;
    }

    // Check if we need to create a new category
    let categoryId = newWordData.categoryId;
    if (showCreateCategory) {
      if (!newCategoryName.trim()) {
        toast.warning('Please enter a category name');
        return;
      }
      const newCat = addCategory(newCategoryName.trim());
      categoryId = newCat.id;
      setNewCategoryName('');
      setShowCreateCategory(false);
      toast.success(`Created category "${newCat.name}"`);
    }
    
    if (!categoryId) {
      toast.warning('Please select a category');
      return;
    }

    // Create the new flashcard
    const newCard = addFlashcard(
      newWordData.word.trim(),
      categoryId,
      newWordData.english.trim(),
      newWordData.pinyin.trim()
    );

    // Add to current set
    addWordToSet(newCard.id);

    // Reset form
    setShowCreateWord(false);
    setNewWordData({ word: '', english: '', pinyin: '', categoryId: categories[0]?.id || '' });
    setSearchQuery('');
    toast.success('Word created and added to set!');
  };

  const addWordToSet = (wordId) => {
    const set = sets.find(s => s.id === editingSetId);
    if (!set) return;

    // Check if set already has 5 words
    if (set.flashcardIds.length >= 5) {
      toast.warning('This set already has 5 words. Remove the oldest word first.');
      return;
    }

    const updatedFlashcardIds = [...set.flashcardIds, wordId];
    
    // Track the date this word was added
    const today = new Date().toISOString().split('T')[0];
    const updatedFlashcardDates = {
      ...(set.flashcardDates || {}),
      [wordId]: today
    };
    
    updateSetFlashcards(editingSetId, updatedFlashcardIds, updatedFlashcardDates);

    // Recalculate available words (exclude words in set AND words flashed today)
    const currentSet = sets.find(s => s.id === editingSetId);
    const updatedSetCardIds = new Set([...updatedFlashcardIds]);
    const available = flashcards.filter(card => !updatedSetCardIds.has(card.id) && !flashedWords.has(card.id));
    setAvailableWords(available);
    
    toast.success('Word added to set');
  };

  const removeWordFromSet = (wordId) => {
    const set = sets.find(s => s.id === editingSetId);
    if (!set) return;

    // Only allow removing the oldest word (first in the array)
    if (set.flashcardIds[0] !== wordId) {
      toast.warning('You can only remove the oldest word (first word) from the set.');
      return;
    }

    const updatedFlashcardIds = set.flashcardIds.filter(id => id !== wordId);
    
    // Remove the date tracking for this word
    const updatedFlashcardDates = { ...(set.flashcardDates || {}) };
    delete updatedFlashcardDates[wordId];
    
    updateSetFlashcards(editingSetId, updatedFlashcardIds, updatedFlashcardDates);

    // Recalculate available words
    const updatedSetCardIds = new Set(updatedFlashcardIds);
    const available = flashcards.filter(card => !updatedSetCardIds.has(card.id));
    setAvailableWords(available);
    
    toast.success('Word removed from set');
  };

  const getFilteredAvailableWords = () => {
    let filtered = availableWords;
    
    // Filter by category
    if (selectedCategoryFilter !== 'all') {
      filtered = filtered.filter(card => card.categoryId === selectedCategoryFilter);
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(card => {
        const word = (card.word || '').toLowerCase();
        const english = (card.english || '').toLowerCase();
        const pinyin = (card.pinyin || '').toLowerCase();
        
        return word.includes(query) || 
               english.includes(query) || 
               pinyin.includes(query);
      });
    }
    
    return filtered;
  };

  const getWordCountByCategory = () => {
    const counts = {};
    availableWords.forEach(card => {
      counts[card.categoryId] = (counts[card.categoryId] || 0) + 1;
    });
    return counts;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const completedCount = getCompletedCount();
  const progressPercentage = dailyGoal > 0 ? (completedCount / dailyGoal) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Upgrade Banner */}
      <UpgradeBanner userPlan={userPlan} />

      {/* Day Header with Progress */}
      <DayHeader
        selectedDate={selectedDate}
        onChangeDate={changeDate}
        completedCount={completedCount}
        totalGoal={dailyGoal}
      />

      {/* Family Member Input */}
      {(userPlan === 'print' || userPlan === 'pro') && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
            Who's tracking today? 👨‍👩‍👧
          </label>
          <input
            type="text"
            placeholder="Enter your name (e.g., Mom, Dad, Grandma)"
            value={familyMember}
            onChange={(e) => setFamilyMember(e.target.value)}
            className="w-full border-2 border-[hsl(var(--border))] rounded-lg px-4 py-3 focus:outline-none focus:border-[hsl(var(--sprouttie-green))] transition-colors"
          />
        </div>
      )}

      {/* Sets Tracking */}
      <div className="space-y-4">
        {sets.map((set, index) => {
          const setFlashcards = getFlashcardsForSet(set.id);
          const isEditing = editingSetId === set.id;
          
          return (
            <div key={set.id}>
              <SetAccordion
                set={set}
                setIndex={index}
                flashcards={setFlashcards}
                sessions={sessions[set.id] || {}}
                onToggleSession={toggleSession}
                onManageWords={startEditingSet}
                flashedWords={flashedWords}
              />

              {/* Edit Set Interface - shown when editing */}
              {isEditing && (
                <div className="mt-2 bg-blue-50 rounded-xl border-2 border-blue-200 p-4">
                  {/* Current Words with Remove Option */}
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-700 mb-2">
                      Manage Words ({setFlashcards.length}/5)
                    </h5>
                    {setFlashcards.length >= 5 && (
                      <p className="text-xs text-amber-600 mb-2">
                        Set is full. Remove oldest word to add new one.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {setFlashcards.map((card) => {
                        const currentSet = sets.find(s => s.id === editingSetId);
                        const isOldest = currentSet?.flashcardIds[0] === card.id;
                        const dateAdded = currentSet?.flashcardDates?.[card.id];
                        const isFlashed = flashedWords.has(card.id);
                        
                        return (
                          <div
                            key={card.id}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs border-2 ${
                              isFlashed
                                ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-400'
                                : isOldest 
                                ? 'bg-amber-50 border-amber-300' 
                                : 'bg-white border-gray-300'
                            }`}
                          >
                            {/* Flashed Status Indicator */}
                            <div className="flex-shrink-0">
                              {isFlashed ? (
                                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold">
                                  ✓
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-gray-300 bg-white" />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <div>
                                {isOldest && <span className="text-amber-600 font-bold mr-1">[Oldest]</span>}
                                <span className="font-medium">{card.word}</span>
                                {card.english && <span className="text-gray-600 ml-1">({card.english})</span>}
                                {dateAdded && (
                                  <div className="text-[10px] text-gray-500 mt-0.5">
                                    Added: {new Date(dateAdded).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </div>
                                )}
                              </div>
                              <PronunciationButton
                                wordId={card.id}
                                wordText={card.word}
                                language="en"
                                userPlan={userPlan || 'free'}
                                size="xs"
                                showLabel={false}
                              />
                            </div>
                            
                            {/* Flashed Status Pill */}
                            <span className={`flex-shrink-0 text-[9px] px-1.5 py-0.5 font-semibold rounded-full ${
                              isFlashed 
                                ? 'bg-emerald-500 text-white' 
                                : 'bg-slate-200 text-slate-600'
                            }`}>
                              {isFlashed ? 'Flashed' : 'Not yet'}
                            </span>
                            
                            <button
                              onClick={() => removeWordFromSet(card.id)}
                              disabled={!isOldest}
                              className={`flex-shrink-0 font-bold text-sm ${
                                isOldest ? 'text-red-600 hover:text-red-800' : 'text-gray-300 cursor-not-allowed'
                              }`}
                              title={isOldest ? 'Remove' : 'Only oldest can be removed'}
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add Words Section */}
                  {setFlashcards.length < 5 && (
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2 text-sm">Add Word</h5>
                      
                      {!showCreateWord ? (
                        <>
                          {/* Search Bar */}
                          <input
                            type="text"
                            placeholder="Search words..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm mb-3"
                          />
                          
                          {/* Category Filter Pills */}
                          {availableWords.length > 0 && (
                            <div className="mb-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => setSelectedCategoryFilter('all')}
                                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                    selectedCategoryFilter === 'all'
                                      ? 'bg-[hsl(var(--sprouttie-green))] text-white'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  All ({availableWords.length})
                                </button>
                                {categories.map(cat => {
                                  const count = getWordCountByCategory()[cat.id] || 0;
                                  if (count === 0) return null;
                                  return (
                                    <button
                                      key={cat.id}
                                      onClick={() => setSelectedCategoryFilter(cat.id)}
                                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                        selectedCategoryFilter === cat.id
                                          ? 'bg-[hsl(var(--sprouttie-green))] text-white'
                                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                      }`}
                                    >
                                      {cat.name} ({count})
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {availableWords.length === 0 ? (
                            <div className="text-center py-4">
                              <p className="text-gray-500 text-xs mb-2">No available words</p>
                              <button
                                onClick={() => setShowCreateWord(true)}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                              >
                                + Create New Word
                              </button>
                            </div>
                          ) : getFilteredAvailableWords().length === 0 && searchQuery.trim() ? (
                            <div className="text-center py-4">
                              <p className="text-gray-500 text-xs mb-2">No matches for "{searchQuery}"</p>
                              <button
                                onClick={() => {
                                  setShowCreateWord(true);
                                  setNewWordData({ ...newWordData, word: searchQuery });
                                }}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                              >
                                + Create "{searchQuery}"
                              </button>
                            </div>
                           ) : (
                            <>
                              {/* Words Grid - Organized by Category */}
                              <div className="max-h-80 overflow-y-auto mb-2 space-y-4">
                                {selectedCategoryFilter === 'all' ? (
                                  // Group by category when showing all
                                  categories.map(cat => {
                                    const categoryWords = getFilteredAvailableWords().filter(card => card.categoryId === cat.id);
                                    if (categoryWords.length === 0) return null;
                                    
                                    return (
                                      <div key={cat.id}>
                                        <div className="flex items-center gap-2 mb-2">
                                          <h6 className="text-xs font-semibold text-gray-700">{cat.name}</h6>
                                          <div className="flex-1 h-px bg-gray-200"></div>
                                          <span className="text-[10px] text-gray-500">{categoryWords.length}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                          {categoryWords.map((card) => (
                                            <button
                                              key={card.id}
                                              onClick={() => addWordToSet(card.id)}
                                              className="px-2 py-2 bg-white border-2 border-gray-200 hover:border-[hsl(var(--sprouttie-green))] hover:shadow-md rounded-lg text-xs text-left transition-all"
                                            >
                                              <div className="font-semibold text-[hsl(var(--foreground))]">{card.word}</div>
                                              {card.english && <div className="text-[10px] text-gray-600 mt-0.5">{card.english}</div>}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  // Show single category
                                  <div className="grid grid-cols-3 gap-2">
                                    {getFilteredAvailableWords().map((card) => (
                                      <button
                                        key={card.id}
                                        onClick={() => addWordToSet(card.id)}
                                        className="px-2 py-2 bg-white border-2 border-gray-200 hover:border-[hsl(var(--sprouttie-green))] hover:shadow-md rounded-lg text-xs text-left transition-all"
                                      >
                                        <div className="font-semibold text-[hsl(var(--foreground))]">{card.word}</div>
                                        {card.english && <div className="text-[10px] text-gray-600 mt-0.5">{card.english}</div>}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {searchQuery.trim() && (
                                <button
                                  onClick={() => {
                                    setShowCreateWord(true);
                                    setNewWordData({ ...newWordData, word: searchQuery });
                                  }}
                                  className="w-full px-2 py-1.5 bg-green-50 border border-green-300 hover:bg-green-100 text-green-700 rounded text-xs"
                                >
                                  + Create New Word
                                </button>
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        <div className="bg-green-50 border border-green-200 rounded p-3 space-y-2">
                          <div className="flex justify-between items-center mb-2">
                            <h6 className="font-medium text-sm text-green-900">Create New Word</h6>
                            <button
                              onClick={() => {
                                setShowCreateWord(false);
                                setShowCreateCategory(false);
                                setNewCategoryName('');
                                setNewWordData({ word: '', english: '', pinyin: '', categoryId: categories[0]?.id || '' });
                              }}
                              className="text-gray-500 hover:text-gray-700 text-sm"
                            >
                              ✕
                            </button>
                          </div>
                          
                          <input
                            type="text"
                            placeholder="Chinese word *"
                            value={newWordData.word}
                            onChange={(e) => setNewWordData({ ...newWordData, word: e.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                          />
                          
                          <input
                            type="text"
                            placeholder="English translation"
                            value={newWordData.english}
                            onChange={(e) => setNewWordData({ ...newWordData, english: e.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                          />
                          
                          <input
                            type="text"
                            placeholder="Pinyin"
                            value={newWordData.pinyin}
                            onChange={(e) => setNewWordData({ ...newWordData, pinyin: e.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                          />
                          
                          {!showCreateCategory ? (
                            <>
                              <select
                                value={newWordData.categoryId}
                                onChange={(e) => {
                                  if (e.target.value === 'CREATE_NEW') {
                                    setShowCreateCategory(true);
                                    setNewWordData({ ...newWordData, categoryId: '' });
                                  } else {
                                    setNewWordData({ ...newWordData, categoryId: e.target.value });
                                  }
                                }}
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                              >
                                <option value="">Select Category *</option>
                                {categories.map(cat => (
                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                                <option value="CREATE_NEW" className="text-green-600 font-medium">+ Create New Category</option>
                              </select>
                            </>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-gray-700">New Category Name *</label>
                                <button
                                  onClick={() => {
                                    setShowCreateCategory(false);
                                    setNewCategoryName('');
                                    setNewWordData({ ...newWordData, categoryId: categories[0]?.id || '' });
                                  }}
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Cancel
                                </button>
                              </div>
                              <input
                                type="text"
                                placeholder="Enter category name (e.g., Food, Colors)"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="w-full border border-green-300 rounded px-2 py-1.5 text-sm focus:border-green-500 focus:outline-none"
                                autoFocus
                              />
                            </div>
                          )}
                          
                          <button
                            onClick={createAndAddWord}
                            className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium"
                          >
                            Create and Add to Set
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <button
                    onClick={() => setEditingSetId(null)}
                    className="mt-3 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    Done Editing
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h4 className="font-bold text-lg text-[hsl(var(--foreground))] mb-4">
          ⚡ Quick Actions
        </h4>
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3].map((round) => (
            <button
              key={round}
              onClick={() => markAllRound(round)}
              className="px-6 py-3 bg-gradient-to-r from-[hsl(var(--sprouttie-green))] to-[hsl(var(--sprouttie-green-dark))] hover:shadow-lg text-white rounded-lg font-medium transition-all"
            >
              Mark all Round {round}
            </button>
          ))}
        </div>
      </div>

      {/* Notes List */}
      <NotesList notes={notes} />

      {/* Sticky Note Button */}
      <StickyNoteButton onAddNote={addNote} familyMember={familyMember} />
    </div>
  );
};

export default DailyTrackerImproved;
