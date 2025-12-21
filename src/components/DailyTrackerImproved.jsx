import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../context/AuthContext';
import { useFlashcards } from '../context/FlashcardContext';
import { toast } from 'react-toastify';
import DayHeader from './tracking/DayHeader';
import StickyNoteButton from './tracking/StickyNoteButton';
import NotesList from './tracking/NotesList';
import UpgradeBanner from './tracking/UpgradeBanner';
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
  const [supabaseFlashcards, setSupabaseFlashcards] = useState({}); // Map of flashcard IDs to Supabase data
  
  // Track Child's Engagement State
  const [engagement, setEngagement] = useState(null);
  const [peakEngagementTime, setPeakEngagementTime] = useState(null);
  const [dailyNotes, setDailyNotes] = useState('');
  
  // 🔄 Rotation Engine State
  const [sessionOccurred, setSessionOccurred] = useState(false);
  const [rotationSummary, setRotationSummary] = useState({
    retiredToday: 0,
    introducedToday: 0,
    activeCards: 0
  });

  const dailyGoal = sets.length * 3; // Each set should be done 3 times

  useEffect(() => {
    if (currentUser) {
      loadDayData();
      loadUserPlan();
      loadSupabaseFlashcards();
    } else {
      setLoading(false);
    }
  }, [currentUser, selectedDate]);

  // Load flashcard metadata from Supabase (for created_at, date_introduced)
  // Maps by word text (front field) since localStorage uses different IDs than Supabase UUIDs
  const loadSupabaseFlashcards = async () => {
    try {
      const { data, error } = await supabase
        .from('flashcards')
        .select('id, front, created_at, date_introduced, date_retired, card_status, active_day_count')
        .eq('user_id', currentUser.id);

      if (error) throw error;

      const flashcardMap = {};
      (data || []).forEach(card => {
        // Map by word text (front field) to match localStorage cards
        flashcardMap[card.front] = card;
      });
      setSupabaseFlashcards(flashcardMap);
    } catch (error) {
      console.error('Error loading Supabase flashcards:', error);
    }
  };

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

  // 🔄 ROTATION ENGINE: Load session status and calculate summary
  const loadDayData = async () => {
    try {
      setLoading(true);
      const dateString = selectedDate.toISOString().split('T')[0];

      // Check if session occurred for this date
      const { data: sessionData, error: sessionError } = await supabase
        .from('daily_flashing_sessions')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('session_date', dateString)
        .maybeSingle();

      if (sessionError && sessionError.code !== 'PGRST116') throw sessionError;
      setSessionOccurred(sessionData?.session_occurred || false);

      // Load session tracking
      const { data: trackingData, error: trackingError } = await supabase
        .from('daily_tracking')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('date', dateString);

      if (trackingError) throw trackingError;
      
      // Calculate rotation summary
      await calculateRotationSummary(dateString);

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
        // 🔄 Auto-trigger rotation engine on first tracking of the day
        if (!sessionOccurred) {
          await handleSessionToggle(true);
        }

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
      // 🔄 Auto-trigger rotation engine on first tracking of the day
      if (!sessionOccurred) {
        const dateString = selectedDate.toISOString().split('T')[0];
        await handleSessionToggle(true);
      }

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
    if (setFlashcards.length === 0) return { oldest: null, newest: null, oldestDate: null, newestDate: null };
    
    // Use Supabase metadata (date_introduced or created_at) to determine age
    const sorted = [...setFlashcards].sort((a, b) => {
      const aData = supabaseFlashcards[a.front] || supabaseFlashcards[a.word];
      const bData = supabaseFlashcards[b.front] || supabaseFlashcards[b.word];
      
      // Use date_introduced first, fallback to created_at
      const aDate = aData?.date_introduced || aData?.created_at || '9999-12-31';
      const bDate = bData?.date_introduced || bData?.created_at || '9999-12-31';
      
      return new Date(aDate) - new Date(bDate);
    });

    const oldestCard = sorted[0];
    const newestCard = sorted[sorted.length - 1];
    const oldestData = supabaseFlashcards[oldestCard?.front] || supabaseFlashcards[oldestCard?.word];
    const newestData = supabaseFlashcards[newestCard?.front] || supabaseFlashcards[newestCard?.word];

    return {
      oldest: oldestCard?.id,
      newest: newestCard?.id,
      oldestDate: oldestData?.date_introduced || oldestData?.created_at,
      newestDate: newestData?.date_introduced || newestData?.created_at
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

  // 🔄 ROTATION ENGINE: Calculate rotation summary
  const calculateRotationSummary = async (dateString) => {
    try {
      // Get all active flashcards
      const { data: activeCards, error: activeError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('card_status', 'active');

      if (activeError) throw activeError;

      // Cards retired today
      const retiredToday = activeCards?.filter(card => 
        card.date_retired === dateString
      ).length || 0;

      // Cards introduced today
      const introducedToday = activeCards?.filter(card => 
        card.date_introduced === dateString
      ).length || 0;

      setRotationSummary({
        retiredToday,
        introducedToday,
        activeCards: activeCards?.length || 0
      });
    } catch (error) {
      console.error('Error calculating rotation summary:', error);
    }
  };

  // 🔄 ROTATION ENGINE: Handle session toggle
  const handleSessionToggle = async (occurred) => {
    const dateString = selectedDate.toISOString().split('T')[0];
    
    try {
      setSessionOccurred(occurred);

      // Save session status
      const { data: existingSession } = await supabase
        .from('daily_flashing_sessions')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('session_date', dateString)
        .maybeSingle();

      if (existingSession) {
        await supabase
          .from('daily_flashing_sessions')
          .update({ session_occurred: occurred })
          .eq('id', existingSession.id);
      } else {
        await supabase
          .from('daily_flashing_sessions')
          .insert({
            user_id: currentUser.id,
            session_date: dateString,
            session_occurred: occurred
          });
      }

      // If session occurred, run rotation engine
      if (occurred) {
        await runRotationEngine(dateString);
      }
    } catch (error) {
      console.error('Error handling session toggle:', error);
      toast.error('Failed to update session status');
    }
  };

  // 🔄 ROTATION ENGINE: Main rotation logic
  const runRotationEngine = async (dateString) => {
    try {
      // TASK 1: Find and retire cards with active_day_count = 5
      const { data: cardsToRetire, error: retireQueryError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('card_status', 'active')
        .eq('active_day_count', 5);

      if (retireQueryError) throw retireQueryError;

      const retireCount = cardsToRetire?.length || 0;

      if (retireCount > 0) {
        const retireIds = cardsToRetire.map(card => card.id);
        
        await supabase
          .from('flashcards')
          .update({
            card_status: 'retired',
            date_retired: dateString
          })
          .in('id', retireIds);
      }

      // TASK 2: Introduce new cards from waiting queue
      if (retireCount > 0) {
        const { data: waitingCards, error: waitingError } = await supabase
          .from('flashcards')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('card_status', 'waiting')
          .order('created_at', { ascending: true })
          .limit(retireCount);

        if (waitingError) throw waitingError;

        if (waitingCards && waitingCards.length > 0) {
          const introduceIds = waitingCards.map(card => card.id);
          
          await supabase
            .from('flashcards')
            .update({
              card_status: 'active',
              active_day_count: 1,
              date_introduced: dateString
            })
            .in('id', introduceIds);
        }
      }

      // TASK 3: Increment active_day_count for remaining active cards
      const { data: remainingActive, error: remainingError } = await supabase
        .from('flashcards')
        .select('id, active_day_count')
        .eq('user_id', currentUser.id)
        .eq('card_status', 'active')
        .neq('date_introduced', dateString); // Don't increment cards introduced today

      if (remainingError) throw remainingError;

      if (remainingActive && remainingActive.length > 0) {
        // Update each card's count
        for (const card of remainingActive) {
          await supabase
            .from('flashcards')
            .update({
              active_day_count: (card.active_day_count || 0) + 1
            })
            .eq('id', card.id);
        }
      }

      // Recalculate summary
      await calculateRotationSummary(dateString);
      
      toast.success(`Rotation complete! ${retireCount} cards retired, ${retireCount} new cards introduced.`);
    } catch (error) {
      console.error('Error running rotation engine:', error);
      toast.error('Failed to run rotation engine');
    }
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

      {/* 🔄 ROTATION SUMMARY */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Rotation Summary
        </h3>
        {!sessionOccurred ? (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>No tracking yet today</strong> — Mark any round to automatically trigger the 5-day rotation.
            </p>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Rotation applied</strong> — Cards have been updated for today.
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-700">
              {rotationSummary.activeCards}
            </div>
            <div className="text-xs text-slate-600 mt-1">Active Cards</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-700">
              {rotationSummary.retiredToday}
            </div>
            <div className="text-xs text-slate-600 mt-1">Retired Today</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">
              {rotationSummary.introducedToday}
            </div>
            <div className="text-xs text-slate-600 mt-1">New Today</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-700">
              {sets.length}
            </div>
            <div className="text-xs text-slate-600 mt-1">Total Sets</div>
          </div>
        </div>
      </div>

      {/* Family Member Input */}
      {(userPlan === 'print' || userPlan === 'pro') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Who's tracking today?
          </label>
          <input
            type="text"
            placeholder="Enter your name (e.g., Mom, Dad, Grandma)"
            value={familyMember}
            onChange={(e) => setFamilyMember(e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500 transition-colors"
          />
        </div>
      )}

      {/* Spreadsheet-Style Tracking Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider w-16">
                  Set
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Word
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider w-20">
                  Day
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider w-16">
                  R1
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider w-16">
                  R2
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider w-16">
                  R3
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sets.map((set, setIdx) => {
                const setFlashcards = getFlashcardsForSet(set.id);
                const setSessionData = sessions[set.id] || {};
                const isEditing = editingSetId === set.id;
                const isEmpty = setFlashcards.length === 0;

                return (
                  <React.Fragment key={set.id}>
                    {/* Empty Set Row - Show when set has no cards */}
                    {isEmpty && !isEditing && (
                      <tr className={`hover:bg-slate-50 transition-colors ${setIdx > 0 ? 'border-t-2 border-slate-300' : ''}`}>
                        <td className="px-4 py-3 text-sm">
                          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-700 font-bold text-sm">
                            {set.index}
                          </div>
                        </td>
                        <td className="px-4 py-3" colSpan={7}>
                          <span className="text-sm text-slate-400 italic">No cards in this set</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => startEditingSet(set.id)}
                            className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
                          >
                            + Add Cards
                          </button>
                        </td>
                      </tr>
                    )}
                    {setFlashcards.map((card, cardIdx) => {
                      const dayCount = card?.active_day_count || 0;
                      const status = card?.card_status || 'waiting';
                      const isNewToday = card?.date_introduced === selectedDate.toISOString().split('T')[0];
                      const isRetiringNext = dayCount === 5 && status === 'active';
                      const isRetired = status === 'retired' && card?.date_retired === selectedDate.toISOString().split('T')[0];
                      const isOldest = cardIdx === 0; // First card is oldest
                      
                      // Get the date this word was added to the set
                      const wordAddedDate = set.flashcardDates?.[card.id];
                      
                      // Calculate set start date (earliest date in flashcardDates)
                      const setStartDate = set.flashcardDates 
                        ? Object.values(set.flashcardDates).sort()[0] 
                        : null;

                      const getDayBadgeColor = () => {
                        if (status !== 'active') return 'bg-slate-100 text-slate-500';
                        const colors = [
                          'bg-green-100 text-green-700',
                          'bg-blue-100 text-blue-700',
                          'bg-purple-100 text-purple-700',
                          'bg-orange-100 text-orange-700',
                          'bg-red-100 text-red-700'
                        ];
                        return colors[Math.min(dayCount - 1, 4)] || colors[0];
                      };

                      return (
                        <tr 
                          key={card.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            cardIdx === 0 && setIdx > 0 ? 'border-t-2 border-slate-300' : ''
                          } ${isOldest && isEditing ? 'bg-red-50' : ''}`}
                        >
                          {/* Set Number - only show on first card of each set */}
                          <td className="px-4 py-3 text-sm">
                            {cardIdx === 0 && (
                              <div className="flex flex-col items-center gap-1">
                                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-700 font-bold text-sm">
                                  {set.index}
                                </div>
                                {setStartDate && (
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(setStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Word */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col flex-1">
                                <span className="text-sm font-medium text-slate-900">
                                  {card.word}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {card.english}
                                </span>
                                <div className="flex gap-3 text-[10px] text-slate-400 mt-0.5">
                                  {wordAddedDate && (
                                    <span>Added to set: {new Date(wordAddedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                  )}
                                  {supabaseFlashcards[card.word]?.date_introduced && (
                                    <span>Started: {new Date(supabaseFlashcards[card.word].date_introduced).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                  )}
                                </div>
                              </div>
                              {isOldest && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-600">
                                  Oldest
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Day Count Badge */}
                          <td className="px-4 py-3 text-center">
                            {status === 'active' && dayCount > 0 && (
                              <span className={`inline-flex items-center justify-center w-10 h-6 rounded-full text-xs font-bold ${getDayBadgeColor()}`}>
                                D{dayCount}
                              </span>
                            )}
                          </td>

                          {/* Round Checkboxes */}
                          {[1, 2, 3].map((round) => {
                            const roundKey = `round${round}`;
                            const isCompleted = setSessionData[roundKey]?.completed || false;
                            
                            return (
                              <td key={round} className="px-4 py-3 text-center">
                                <button
                                  onClick={() => toggleSession(set.id, round)}
                                  className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all mx-auto ${
                                    isCompleted
                                      ? 'bg-green-500 border-green-500'
                                      : 'border-slate-300 hover:border-green-400 hover:bg-green-50'
                                  }`}
                                  aria-label={`Toggle round ${round} for set ${set.index}`}
                                >
                                  {isCompleted && (
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                    </svg>
                                  )}
                                </button>
                              </td>
                            );
                          })}

                          {/* Status Badges */}
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {isNewToday && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                  New
                                </span>
                              )}
                              {isRetiringNext && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                  Next
                                </span>
                              )}
                              {isRetired && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                  Retired
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions - only show on first card */}
                          <td className="px-4 py-3 text-center">
                            {cardIdx === 0 && (
                              <button
                                onClick={() => isEditing ? setEditingSetId(null) : startEditingSet(set.id)}
                                className={`p-1.5 rounded transition-colors ${
                                  isEditing 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'hover:bg-slate-100 text-slate-500'
                                }`}
                                title={isEditing ? 'Done editing' : 'Edit set'}
                              >
                                {isEditing ? (
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                )}
                              </button>
                            )}
                            {isEditing && isOldest && setFlashcards.length > 0 && (
                              <button
                                onClick={() => removeWordFromSet(card.id)}
                                className="p-1.5 rounded hover:bg-red-100 text-red-500 transition-colors ml-1"
                                title="Remove oldest card"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    
                    {/* Add Card Row - shown when editing this set */}
                    {isEditing && (
                      <tr className={`bg-green-50 ${isEmpty ? '' : 'border-t'} border-green-200`}>
                        <td colSpan={10} className="px-4 py-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {isEmpty && (
                                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-200 text-green-800 font-bold text-sm">
                                    {set.index}
                                  </div>
                                )}
                                <span className="text-sm font-medium text-green-800">
                                  Add cards to Set {set.index} ({setFlashcards.length}/5 cards)
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {setFlashcards.length >= 5 && (
                                  <span className="text-xs text-orange-600">Remove the oldest card first to add new ones</span>
                                )}
                                <button
                                  onClick={() => setEditingSetId(null)}
                                  className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  Done
                                </button>
                              </div>
                            </div>
                            
                            {setFlashcards.length < 5 && (
                              <>
                                {/* Search and Filter */}
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Search words..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-green-500"
                                  />
                                  <select
                                    value={selectedCategoryFilter}
                                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-green-500"
                                  >
                                    <option value="all">All Categories</option>
                                    {categories.map(cat => (
                                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                  </select>
                                </div>
                                
                                {/* Available Words */}
                                <div className="max-h-40 overflow-y-auto">
                                  <div className="flex flex-wrap gap-2">
                                    {getFilteredAvailableWords().slice(0, 20).map(word => (
                                      <button
                                        key={word.id}
                                        onClick={() => addWordToSet(word.id)}
                                        className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
                                      >
                                        <span className="font-medium">{word.word}</span>
                                        <span className="text-slate-400 ml-1">({word.english})</span>
                                      </button>
                                    ))}
                                    {getFilteredAvailableWords().length === 0 && (
                                      <span className="text-sm text-slate-500">No available words found</span>
                                    )}
                                    {getFilteredAvailableWords().length > 20 && (
                                      <span className="text-xs text-slate-400 px-2 py-1">
                                        +{getFilteredAvailableWords().length - 20} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* No sets message */}
        {sets.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="text-sm">No flashcard sets yet. Create your first set to get started!</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h4 className="font-bold text-lg text-slate-800 mb-4">
          Quick Actions
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((round) => (
            <button
              key={round}
              onClick={() => markAllRound(round)}
              className="px-4 py-3 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg font-medium transition-colors text-sm"
            >
              R{round}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Mark all sets as complete for a specific round
        </p>
      </div>

      {/* Track Child's Engagement */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h4 className="font-bold text-xl text-slate-800 mb-6 text-center">
          Track Child's Engagement
        </h4>
        
        {/* Engagement Rating */}
        <div className="mb-6">
          <p className="text-slate-700 text-center mb-4">How engaged was your child today?</p>
          <div className="flex justify-center gap-3 mb-2">
            {[
              { value: 1, emoji: '😐' },
              { value: 2, emoji: '😐' },
              { value: 3, emoji: '🙂' },
              { value: 4, emoji: '😊' },
              { value: 5, emoji: '😃' }
            ].map(({ value, emoji }) => (
              <button
                key={value}
                onClick={() => setEngagement(value)}
                className={`w-12 h-12 text-2xl rounded-full transition-all ${
                  engagement === value
                    ? 'bg-green-100 ring-2 ring-green-500 scale-110'
                    : 'bg-slate-100 hover:bg-slate-200'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 text-center">
            1 = Minimal Interest • 5 = Highly Engaged
          </p>
        </div>

        {/* Peak Engagement Time */}
        <div className="mb-6">
          <p className="text-slate-700 text-center mb-4">When was your child most engaged?</p>
          <div className="flex justify-center gap-2 flex-wrap">
            {[
              { value: 'morning', label: 'Morning', emoji: '🌅' },
              { value: 'afternoon', label: 'Afternoon', emoji: '☀️' },
              { value: 'evening', label: 'Evening', emoji: '🌆' },
              { value: 'night', label: 'Night', emoji: '🌙' }
            ].map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => setPeakEngagementTime(value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  peakEngagementTime === value
                    ? 'bg-green-100 text-green-800 ring-2 ring-green-500'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {label} {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Daily Notes */}
        <div className="mb-6">
          <p className="text-slate-700 text-center mb-3 font-medium">Notes for Today</p>
          <textarea
            value={dailyNotes}
            onChange={(e) => setDailyNotes(e.target.value)}
            placeholder="Record observations, words recognised, special moments..."
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-y min-h-[100px]"
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={async () => {
              if (!engagement && !peakEngagementTime && !dailyNotes.trim()) {
                toast.warning('Please add some engagement data before saving');
                return;
              }
              try {
                const dateString = selectedDate.toISOString().split('T')[0];
                // Update existing flashed records for today with engagement data
                const { error } = await supabase
                  .from('daily_tracking')
                  .update({
                    engagement: engagement,
                    time_of_day: peakEngagementTime,
                    notes: dailyNotes.trim() || null
                  })
                  .eq('user_id', currentUser.id)
                  .eq('date', dateString)
                  .eq('status', 'flashed');
                
                if (error) throw error;
                toast.success("Today's records saved!");
              } catch (error) {
                console.error('Error saving engagement:', error);
                toast.error('Failed to save records');
              }
            }}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors shadow-sm"
          >
            Save Today's Records
          </button>
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
