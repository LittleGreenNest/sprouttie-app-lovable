import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../context/AuthContext';
import { useFlashcards } from '../context/FlashcardContext';
import { toast } from 'react-toastify';

const DailyTrackerImproved = () => {
  const { currentUser } = useAuth();
  const { sets, flashcards, getFlashcardsForSet, categories, updateSetFlashcards } = useFlashcards();
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

  const dailyGoal = sets.length * 3; // Each set should be done 3 times

  useEffect(() => {
    if (currentUser) {
      loadDayData();
    } else {
      setLoading(false);
    }
  }, [currentUser, selectedDate]);

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

    if (!familyMember.trim()) {
      toast.warning('Please enter your name first');
      return;
    }

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
          by: familyMember.trim(),
          time: new Date().toISOString()
        };
        setSessions(newSessions);

        // Save to database - create a dummy flashcard_id if no flashcards in set
        const setFlashcards = getFlashcardsForSet(setId);
        const flashcardId = setFlashcards.length > 0 ? setFlashcards[0].id : `set-${setId}`;

        const { error } = await supabase
          .from('daily_tracking')
          .insert({
            user_id: currentUser.id,
            flashcard_id: flashcardId,
            date: dateString,
            status: 'flashed',
            flashed_by: familyMember.trim(),
            flashed_at: new Date().toISOString(),
            notes: JSON.stringify({ setId, round })
          });

        if (error) throw error;
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

    if (!familyMember.trim()) {
      toast.warning('Please enter your name first');
      return;
    }

    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      const roundKey = `round${round}`;
      const newSessions = { ...sessions };

      for (const set of sets) {
        if (!newSessions[set.id]) newSessions[set.id] = {};
        if (!newSessions[set.id][roundKey]?.completed) {
          newSessions[set.id][roundKey] = {
            completed: true,
            by: familyMember.trim(),
            time: new Date().toISOString()
          };

          // Save to database
          const setFlashcards = getFlashcardsForSet(set.id);
          const flashcardId = setFlashcards.length > 0 ? setFlashcards[0].id : `set-${set.id}`;

          const { error } = await supabase
            .from('daily_tracking')
            .insert({
              user_id: currentUser.id,
              flashcard_id: flashcardId,
              date: dateString,
              status: 'flashed',
              flashed_by: familyMember.trim(),
              flashed_at: new Date().toISOString(),
              notes: JSON.stringify({ setId: set.id, round })
            });

          if (error) throw error;
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

    if (!familyMember.trim()) {
      toast.warning('Please enter your name first');
      return;
    }

    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      const timestamp = new Date().toISOString();

      const noteEntry = {
        text: newNote.trim(),
        by: familyMember.trim(),
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
          flashed_by: familyMember.trim(),
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
    setSearchQuery(''); // Reset search when opening edit view
    // Get all available flashcards not in this set
    const currentSet = sets.find(s => s.id === setId);
    const currentSetCardIds = new Set(currentSet?.flashcardIds || []);
    const available = flashcards.filter(card => !currentSetCardIds.has(card.id));
    setAvailableWords(available);
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

    // Update available words
    setAvailableWords(availableWords.filter(w => w.id !== wordId));
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

    // Add to available words
    const removedWord = flashcards.find(w => w.id === wordId);
    if (removedWord) {
      setAvailableWords([...availableWords, removedWord]);
    }
    toast.success('Word removed from set');
  };

  const getFilteredAvailableWords = () => {
    if (!searchQuery.trim()) {
      return availableWords;
    }

    const query = searchQuery.toLowerCase();
    return availableWords.filter(card => {
      const word = (card.word || '').toLowerCase();
      const english = (card.english || '').toLowerCase();
      const pinyin = (card.pinyin || '').toLowerCase();
      const category = getCategoryName(card.categoryId).toLowerCase();
      
      return word.includes(query) || 
             english.includes(query) || 
             pinyin.includes(query) ||
             category.includes(query);
    });
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
      {/* Header with Progress */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Daily Tracking</h2>
            <p className="text-sm text-gray-600">Glenn Doman Method - Track your 3 daily sessions</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              ←
            </button>
            <div className="text-center">
              <div className="font-medium">{selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
              <div className="text-sm text-gray-600">{completedCount} / {dailyGoal} sessions</div>
            </div>
            <button
              onClick={() => changeDate(1)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              →
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Family Member Input */}
        <div className="mt-4">
          <input
            type="text"
            placeholder="Enter your name (e.g., Parent, Mother-in-law)"
            value={familyMember}
            onChange={(e) => setFamilyMember(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden p-6">
        <h3 className="text-xl font-bold mb-6">Track Sessions</h3>

        {/* Track Sessions */}
        <div>
          {/* Sessions List */}
          <div className="space-y-6">
            {sets.map((set) => {
              const setFlashcards = getFlashcardsForSet(set.id);
              const isEditing = editingSetId === set.id;
              
              return (
                <div key={set.id} className="border rounded-lg p-5">
                  {/* Set Header */}
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-lg">{set.name}</h4>
                    <button
                      onClick={() => isEditing ? setEditingSetId(null) : startEditingSet(set.id)}
                      className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm font-medium transition-colors"
                    >
                      {isEditing ? 'Done Editing' : 'Edit Set'}
                    </button>
                  </div>
                  
                  {/* Words in Set */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">Words ({setFlashcards.length}):</div>
                    <div className="flex flex-wrap gap-2">
                      {setFlashcards.map((card) => (
                        <div
                          key={card.id}
                          className="px-2 py-1 bg-white border border-gray-300 rounded text-xs"
                        >
                          <span className="font-medium">{card.word}</span>
                          {card.english && (
                            <span className="text-gray-600 ml-1">({card.english})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Edit Set Interface - shown when editing */}
                  {isEditing && (
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
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
                            
                            return (
                              <div
                                key={card.id}
                                className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs border ${
                                  isOldest 
                                    ? 'bg-amber-50 border-amber-300' 
                                    : 'bg-white border-gray-300'
                                }`}
                              >
                                <div className="flex-1">
                                  {isOldest && <span className="text-amber-600 font-bold mr-1">[Oldest]</span>}
                                  <span className="font-medium">{card.word}</span>
                                  {card.english && <span className="text-gray-600 ml-1">({card.english})</span>}
                                  {dateAdded && (
                                    <div className="text-[10px] text-gray-500 mt-0.5">
                                      Added: {new Date(dateAdded).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => removeWordFromSet(card.id)}
                                  disabled={!isOldest}
                                  className={`font-bold text-sm ${
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
                          <input
                            type="text"
                            placeholder="Search words..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm mb-2"
                          />
                          {availableWords.length === 0 ? (
                            <p className="text-gray-500 text-xs">No available words</p>
                          ) : getFilteredAvailableWords().length === 0 ? (
                            <p className="text-gray-500 text-xs">No matches</p>
                          ) : (
                            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                              {getFilteredAvailableWords().map((card) => (
                                <button
                                  key={card.id}
                                  onClick={() => addWordToSet(card.id)}
                                  className="px-2 py-1.5 bg-white border border-gray-300 hover:border-green-500 rounded text-xs text-left"
                                >
                                  <div className="font-medium">{card.word}</div>
                                  {card.english && <div className="text-[10px] text-gray-600">{card.english}</div>}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Session Tracking */}
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((round) => {
                      const session = sessions[set.id]?.[`round${round}`];
                      return (
                        <button
                          key={round}
                          onClick={() => toggleSession(set.id, round)}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            session?.completed
                              ? 'bg-green-100 border-green-500'
                              : 'bg-white border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-700 mb-1">Round {round}</div>
                            {session?.completed ? (
                              <>
                                <div className="text-2xl mb-1">✓</div>
                                <div className="text-xs text-gray-600">{session.by}</div>
                                <div className="text-xs text-gray-500">{formatTime(session.time)}</div>
                              </>
                            ) : (
                              <div className="text-gray-400 text-2xl">○</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium text-gray-700 mb-3">Quick Actions</h4>
            <div className="flex gap-3">
              {[1, 2, 3].map((round) => (
                <button
                  key={round}
                  onClick={() => markAllRound(round)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Mark all Round {round}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Today's Notes */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4">Today's Notes (Shared)</h3>
        
        {/* Add Note */}
        <div className="mb-6">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add observations, words recognized, special moments... Everyone can add notes here."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={addNote}
            className="mt-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            Add Note
          </button>
        </div>

        {/* Notes List */}
        <div className="space-y-4">
          {notes.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No notes yet today. Add your first observation!</p>
          ) : (
            notes.map((note, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-800 mb-3 leading-relaxed">{note.text}</p>
                <div className="flex items-center gap-3 text-sm">
                  <span className="px-3 py-1 bg-gray-700 text-white rounded font-medium">
                    {note.by}
                  </span>
                  <span className="text-gray-600">{formatTime(note.time)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyTrackerImproved;
