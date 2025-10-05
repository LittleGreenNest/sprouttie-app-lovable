import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../context/AuthContext';
import { useFlashcards } from '../context/FlashcardContext';
import { toast } from 'react-toastify';

const DailyTrackerImproved = () => {
  const { currentUser } = useAuth();
  const { sets, flashcards, getFlashcardsForSet, categories, updateSetFlashcards } = useFlashcards();
  const [activeTab, setActiveTab] = useState('track'); // 'track' or 'words'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sessions, setSessions] = useState({}); // { setId: { round1: {completed, by, time}, round2: {}, round3: {} } }
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [familyMember, setFamilyMember] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingSetId, setEditingSetId] = useState(null);
  const [availableWords, setAvailableWords] = useState([]);

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
      (trackingData || []).forEach(record => {
        const setId = record.flashcard_id; // We'll use this differently - store set info in notes field as JSON
        if (record.notes) {
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
    if (!familyMember) {
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
        await supabase
          .from('daily_tracking')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('date', dateString)
          .eq('notes', JSON.stringify({ setId, round }));
      } else {
        // Add the session
        const newSessions = { ...sessions };
        if (!newSessions[setId]) newSessions[setId] = {};
        newSessions[setId][roundKey] = {
          completed: true,
          by: familyMember,
          time: new Date().toISOString()
        };
        setSessions(newSessions);

        // Save to database (use first flashcard in set as reference)
        const setFlashcards = getFlashcardsForSet(setId);
        if (setFlashcards.length > 0) {
          await supabase
            .from('daily_tracking')
            .insert({
              user_id: currentUser.id,
              flashcard_id: setFlashcards[0].id,
              date: dateString,
              status: 'flashed',
              flashed_by: familyMember,
              flashed_at: new Date().toISOString(),
              notes: JSON.stringify({ setId, round })
            });
        }
      }

      toast.success('Session updated');
    } catch (error) {
      console.error('Error toggling session:', error);
      toast.error('Failed to update session');
    }
  };

  const markAllRound = async (round) => {
    if (!familyMember) {
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
            by: familyMember,
            time: new Date().toISOString()
          };

          // Save to database
          const setFlashcards = getFlashcardsForSet(set.id);
          if (setFlashcards.length > 0) {
            await supabase
              .from('daily_tracking')
              .insert({
                user_id: currentUser.id,
                flashcard_id: setFlashcards[0].id,
                date: dateString,
                status: 'flashed',
                flashed_by: familyMember,
                flashed_at: new Date().toISOString(),
                notes: JSON.stringify({ setId: set.id, round })
              });
          }
        }
      }

      setSessions(newSessions);
      toast.success(`All Round ${round} sessions marked complete`);
    } catch (error) {
      console.error('Error marking all round:', error);
      toast.error('Failed to mark all sessions');
    }
  };

  const addNote = async () => {
    if (!newNote.trim() || !familyMember) {
      toast.warning('Please enter your name and a note');
      return;
    }

    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      const timestamp = new Date().toISOString();

      const noteEntry = {
        text: newNote.trim(),
        by: familyMember,
        time: timestamp
      };

      setNotes([...notes, noteEntry]);
      setNewNote('');

      // Save to database
      await supabase
        .from('daily_tracking')
        .insert({
          user_id: currentUser.id,
          flashcard_id: sets[0]?.flashcardIds?.[0] || 'note',
          date: dateString,
          status: 'note',
          flashed_by: familyMember,
          flashed_at: timestamp,
          notes: newNote.trim()
        });

      toast.success('Note added');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
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
    // Get all available flashcards not in this set
    const currentSet = sets.find(s => s.id === setId);
    const currentSetCardIds = new Set(currentSet?.flashcardIds || []);
    const available = flashcards.filter(card => !currentSetCardIds.has(card.id));
    setAvailableWords(available);
  };

  const addWordToSet = (wordId) => {
    const set = sets.find(s => s.id === editingSetId);
    if (!set) return;

    const updatedFlashcardIds = [...set.flashcardIds, wordId];
    updateSetFlashcards(editingSetId, updatedFlashcardIds);

    // Update available words
    setAvailableWords(availableWords.filter(w => w.id !== wordId));
    toast.success('Word added to set');
  };

  const removeWordFromSet = (wordId) => {
    const set = sets.find(s => s.id === editingSetId);
    if (!set) return;

    const updatedFlashcardIds = set.flashcardIds.filter(id => id !== wordId);
    updateSetFlashcards(editingSetId, updatedFlashcardIds);

    // Add to available words
    const removedWord = flashcards.find(w => w.id === wordId);
    if (removedWord) {
      setAvailableWords([...availableWords, removedWord]);
    }
    toast.success('Word removed from set');
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
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('track')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'track'
                ? 'bg-gray-100 border-b-2 border-green-500 text-green-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Track Sessions
          </button>
          <button
            onClick={() => setActiveTab('words')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'words'
                ? 'bg-gray-100 border-b-2 border-green-500 text-green-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Manage Words
          </button>
        </div>

        {/* Track Sessions Tab */}
        {activeTab === 'track' && (
          <div className="p-6">
            <h3 className="text-xl font-bold mb-4">Today's Sessions</h3>

            {/* Sessions Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Set</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Round 1</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Round 2</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Round 3</th>
                  </tr>
                </thead>
                <tbody>
                  {sets.map((set) => (
                    <tr key={set.id} className="border-b hover:bg-gray-50">
                      <td className="py-4 px-4 font-medium">{set.name}</td>
                      {[1, 2, 3].map((round) => {
                        const session = sessions[set.id]?.[`round${round}`];
                        return (
                          <td key={round} className="py-4 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <button
                                onClick={() => toggleSession(set.id, round)}
                                className={`w-8 h-8 border-2 rounded transition-colors ${
                                  session?.completed
                                    ? 'bg-green-500 border-green-600'
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                {session?.completed && (
                                  <span className="text-white text-lg">✓</span>
                                )}
                              </button>
                              {session?.completed && (
                                <div className="text-xs text-gray-600">
                                  <div className="font-medium">{session.by}</div>
                                  <div>{formatTime(session.time)}</div>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mark All Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => markAllRound(1)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                Mark all Round 1
              </button>
              <button
                onClick={() => markAllRound(2)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                Mark all Round 2
              </button>
              <button
                onClick={() => markAllRound(3)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                Mark all Round 3
              </button>
            </div>
          </div>
        )}

        {/* Manage Words Tab */}
        {activeTab === 'words' && (
          <div className="p-6">
            {editingSetId ? (
              // Edit Set View
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">
                    Edit {sets.find(s => s.id === editingSetId)?.name}
                  </h3>
                  <button
                    onClick={() => setEditingSetId(null)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
                  >
                    Done
                  </button>
                </div>

                {/* Current Words in Set */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-700 mb-3">Current Words in Set</h4>
                  <div className="flex flex-wrap gap-2">
                    {getFlashcardsForSet(editingSetId).map((card) => (
                      <div
                        key={card.id}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-2 border-blue-200 rounded-lg text-sm"
                      >
                        <div>
                          <span className="font-medium">{card.word}</span>
                          {card.english && (
                            <span className="text-gray-600 ml-1">({card.english})</span>
                          )}
                        </div>
                        <button
                          onClick={() => removeWordFromSet(card.id)}
                          className="text-red-600 hover:text-red-800 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Available Words to Add */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Available Words to Add</h4>
                  {availableWords.length === 0 ? (
                    <p className="text-gray-500 text-sm">No more words available. All flashcards are already in sets.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {availableWords.map((card) => (
                        <button
                          key={card.id}
                          onClick={() => addWordToSet(card.id)}
                          className="px-3 py-2 bg-white border-2 border-gray-300 hover:border-green-500 rounded-lg text-sm text-left transition-colors"
                        >
                          <div className="font-medium">{card.word}</div>
                          {card.english && (
                            <div className="text-xs text-gray-600">{card.english}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {getCategoryName(card.categoryId)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Sets Overview
              <div>
                <h3 className="text-xl font-bold mb-4">Today's Sets</h3>
                <div className="space-y-6">
                  {sets.map((set) => {
                    const setFlashcards = getFlashcardsForSet(set.id);
                    const { oldest, newest } = getWordAge(setFlashcards);
                    return (
                      <div key={set.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold text-lg">{set.name}</h4>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600">{setFlashcards.length} words</span>
                            <button
                              onClick={() => startEditingSet(set.id)}
                              className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm font-medium transition-colors"
                            >
                              Edit Set
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {setFlashcards.map((card) => {
                            const isOldest = card.id === oldest;
                            const isNewest = card.id === newest;
                            return (
                              <div
                                key={card.id}
                                className={`px-3 py-2 rounded-lg text-sm border-2 ${
                                  isOldest
                                    ? 'bg-orange-50 border-orange-300'
                                    : isNewest
                                    ? 'bg-green-50 border-green-300'
                                    : 'bg-gray-100 border-gray-200'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div>
                                    <span className="font-medium">{card.word}</span>
                                    {card.english && (
                                      <span className="text-gray-600 ml-1">({card.english})</span>
                                    )}
                                  </div>
                                  {isOldest && (
                                    <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded">
                                      Oldest
                                    </span>
                                  )}
                                  {isNewest && (
                                    <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded">
                                      Newest
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {getCategoryName(card.categoryId)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-6 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-200 border-2 border-orange-300 rounded"></div>
                    <span>Oldest word in set</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-200 border-2 border-green-300 rounded"></div>
                    <span>Newest word in set</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Today's Notes */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4">Today's Notes (Shared)</h3>
        
        {/* Add Note */}
        <div className="flex gap-2 mb-4">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add observations, words recognized, special moments... Everyone can add notes here."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 min-h-[80px] resize-none"
          />
          <button
            onClick={addNote}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            +
          </button>
        </div>

        {/* Notes List */}
        <div className="space-y-3">
          {notes.map((note, idx) => (
            <div key={idx} className="border-l-4 border-green-500 bg-gray-50 p-3 rounded">
              <p className="text-gray-800 mb-1">{note.text}</p>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="px-2 py-1 bg-gray-200 rounded">{note.by}</span>
                <span>{formatTime(note.time)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DailyTrackerImproved;
