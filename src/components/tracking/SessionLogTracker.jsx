import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { useFlashcards } from '../../context/FlashcardContext';
import { toast } from 'react-toastify';
import { ChevronLeft, ChevronRight, Pencil, Check, Plus, X } from 'lucide-react';
import UpgradeBanner from './UpgradeBanner';
import { motion, AnimatePresence } from 'framer-motion';

const SessionLogTracker = () => {
  const { currentUser } = useAuth();
  const { sets, flashcards, getFlashcardsForSet, updateSetFlashcards, categories } = useFlashcards();
  
  // Date state
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Tracking state - now at SET level: { `${setId}-${round}`: boolean }
  const [roundTracking, setRoundTracking] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Rotation summary
  const [rotationSummary, setRotationSummary] = useState({
    activeCards: 0,
    retiredToday: 0,
    newToday: 0,
    totalSets: 5
  });
  
  // Engagement state
  const [engagement, setEngagement] = useState(null);
  const [peakTime, setPeakTime] = useState(null);
  const [notes, setNotes] = useState('');
  
  // Edit modal state
  const [editingSetId, setEditingSetId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
  
  // Session occurred flag
  const [sessionOccurred, setSessionOccurred] = useState(false);

  const dateString = useMemo(() => selectedDate.toISOString().split('T')[0], [selectedDate]);
  
  // Calculate total possible sessions (sets × 3 rounds)
  const totalPossibleSessions = sets.length * 3;
  
  // Calculate completed sessions
  const completedSessions = useMemo(() => {
    return Object.values(roundTracking).filter(v => v).length;
  }, [roundTracking]);

  // Load data when date or user changes
  useEffect(() => {
    if (currentUser) {
      loadTrackingData();
      loadRotationSummary();
    } else {
      setLoading(false);
    }
  }, [currentUser, dateString]);

  const loadTrackingData = async () => {
    try {
      setLoading(true);
      
      // Load tracking data for the selected date
      const { data: trackingData, error } = await supabase
        .from('daily_tracking')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('date', dateString);
      
      if (error) throw error;
      
      // Parse tracking data into set-level round tracking
      const tracking = {};
      let loadedEngagement = null;
      let loadedPeakTime = null;
      
      (trackingData || []).forEach(record => {
        if (record.status === 'flashed' && record.notes) {
          try {
            const metadata = JSON.parse(record.notes);
            if (metadata.setId !== undefined && metadata.round) {
              // Mark set-round as complete
              tracking[`${metadata.setId}-${metadata.round}`] = true;
            }
          } catch (e) {
            // Not JSON
          }
        }
        
        // Load engagement data
        if (record.engagement && !loadedEngagement) {
          loadedEngagement = record.engagement;
        }
        if (record.time_of_day && !loadedPeakTime) {
          loadedPeakTime = record.time_of_day;
        }
      });
      
      // Check if session occurred
      const { data: sessionData } = await supabase
        .from('daily_flashing_sessions')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('session_date', dateString)
        .maybeSingle();
      
      setSessionOccurred(sessionData?.session_occurred || false);
      if (sessionData?.notes) {
        setNotes(sessionData.notes);
      }
      
      setRoundTracking(tracking);
      setEngagement(loadedEngagement);
      setPeakTime(loadedPeakTime);
    } catch (error) {
      console.error('Error loading tracking data:', error);
      toast.error('Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  const loadRotationSummary = async () => {
    try {
      // Get active cards count
      const { data: activeCards } = await supabase
        .from('flashcards')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('card_status', 'active');
      
      // Get cards retired today
      const { data: retiredToday } = await supabase
        .from('flashcards')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('date_retired', dateString);
      
      // Get cards introduced today
      const { data: newToday } = await supabase
        .from('flashcards')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('date_introduced', dateString);
      
      setRotationSummary({
        activeCards: activeCards?.length || 0,
        retiredToday: retiredToday?.length || 0,
        newToday: newToday?.length || 0,
        totalSets: sets.length || 5
      });
    } catch (error) {
      console.error('Error loading rotation summary:', error);
    }
  };

  const toggleSetRound = async (setId, round) => {
    if (!currentUser) {
      toast.error('Please log in to track sessions');
      return;
    }
    
    const key = `${setId}-${round}`;
    const isCurrentlyChecked = roundTracking[key];
    const setFlashcards = getFlashcardsForSet(setId);
    
    try {
      if (isCurrentlyChecked) {
        // Uncheck - delete all tracking records for this set-round
        setRoundTracking(prev => ({ ...prev, [key]: false }));
        
        await supabase
          .from('daily_tracking')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('date', dateString)
          .like('notes', `%"setId":${setId}%`)
          .like('notes', `%"round":${round}%`);
      } else {
        // Check - create tracking records for ALL words in the set
        setRoundTracking(prev => ({ ...prev, [key]: true }));
        
        // Auto-trigger rotation on first tracking
        if (!sessionOccurred) {
          await recordSessionOccurred();
        }
        
        // Upsert a record for each flashcard in the set (avoid duplicate key error)
        for (const card of setFlashcards) {
          await supabase
            .from('daily_tracking')
            .upsert({
              user_id: currentUser.id,
              flashcard_id: card.id,
              date: dateString,
              status: 'flashed',
              flashed_at: new Date().toISOString(),
              notes: JSON.stringify({ setId, round })
            }, { 
              onConflict: 'user_id,flashcard_id,date',
              ignoreDuplicates: false 
            });
        }
        
        // If no flashcards, upsert a placeholder
        if (setFlashcards.length === 0) {
          await supabase
            .from('daily_tracking')
            .upsert({
              user_id: currentUser.id,
              flashcard_id: `set-${setId}`,
              date: dateString,
              status: 'flashed',
              flashed_at: new Date().toISOString(),
              notes: JSON.stringify({ setId, round })
            }, { 
              onConflict: 'user_id,flashcard_id,date',
              ignoreDuplicates: false 
            });
        }
        
        toast.success(`Set ${setId} - Round ${round} complete!`);
      }
    } catch (error) {
      console.error('Error toggling round:', error);
      toast.error('Failed to update tracking');
      // Revert on error
      setRoundTracking(prev => ({ ...prev, [key]: isCurrentlyChecked }));
    }
  };

  const recordSessionOccurred = async () => {
    try {
      const { data: existing } = await supabase
        .from('daily_flashing_sessions')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('session_date', dateString)
        .maybeSingle();
      
      if (existing) {
        await supabase
          .from('daily_flashing_sessions')
          .update({ session_occurred: true })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('daily_flashing_sessions')
          .insert({
            user_id: currentUser.id,
            session_date: dateString,
            session_occurred: true
          });
      }
      
      setSessionOccurred(true);
    } catch (error) {
      console.error('Error recording session:', error);
    }
  };

  const saveEngagementData = async () => {
    if (!currentUser) return;
    
    try {
      setSaving(true);
      
      // Update session notes
      const { data: existing } = await supabase
        .from('daily_flashing_sessions')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('session_date', dateString)
        .maybeSingle();
      
      if (existing) {
        await supabase
          .from('daily_flashing_sessions')
          .update({ notes })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('daily_flashing_sessions')
          .insert({
            user_id: currentUser.id,
            session_date: dateString,
            session_occurred: Object.values(roundTracking).some(v => v),
            notes
          });
      }
      
      // Update engagement on tracking records
      if (engagement || peakTime) {
        await supabase
          .from('daily_tracking')
          .update({ 
            engagement: engagement,
            time_of_day: peakTime 
          })
          .eq('user_id', currentUser.id)
          .eq('date', dateString)
          .eq('status', 'flashed');
      }
      
      toast.success('Records saved successfully!');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save records');
    } finally {
      setSaving(false);
    }
  };

  const navigateDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = useMemo(() => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  }, [selectedDate]);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Get flashcards for each set with oldest marker
  const getSetWordsWithMeta = (setId) => {
    const setFlashcards = getFlashcardsForSet(setId);
    if (setFlashcards.length === 0) return [];
    
    // Sort by date_introduced or created_at
    const sorted = [...setFlashcards].sort((a, b) => {
      const aDate = a.date_introduced || a.created_at || '9999-12-31';
      const bDate = b.date_introduced || b.created_at || '9999-12-31';
      return new Date(aDate) - new Date(bDate);
    });
    
    return sorted.map((card, index) => ({
      ...card,
      isOldest: index === 0,
      dayCount: card.active_day_count || 1
    }));
  };

  // Get available words for adding to set (not in any set)
  const getAvailableWords = () => {
    const wordsInSets = new Set();
    sets.forEach(set => {
      const setCards = getFlashcardsForSet(set.id);
      setCards.forEach(card => wordsInSets.add(card.id));
    });
    
    return flashcards.filter(card => {
      // Exclude words already in sets
      if (wordsInSets.has(card.id)) return false;
      
      // Filter by search query
      const matchesSearch = !searchQuery || 
        card.front?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.back?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.word?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filter by category (folder)
      const matchesCategory = selectedCategoryFilter === 'all' || 
        card.folder === selectedCategoryFilter;
      
      // Filter by type (word or phrase)
      const matchesType = selectedTypeFilter === 'all' || 
        card.card_type === selectedTypeFilter;
      
      return matchesSearch && matchesCategory && matchesType;
    });
  };

  const handleAddWordToSet = async (wordId) => {
    if (!editingSetId) return;
    
    const currentSet = sets.find(s => s.id === editingSetId);
    if (!currentSet) return;
    
    const currentIds = currentSet.flashcardIds || [];
    await updateSetFlashcards(editingSetId, [...currentIds, wordId]);
    toast.success('Word added to set');
  };

  const handleRemoveWordFromSet = async (wordId) => {
    if (!editingSetId) return;
    
    const currentSet = sets.find(s => s.id === editingSetId);
    if (!currentSet) return;
    
    const currentIds = currentSet.flashcardIds || [];
    await updateSetFlashcards(editingSetId, currentIds.filter(id => id !== wordId));
    toast.success('Word removed from set');
  };

  // Set colors for visual grouping
  const setColors = [
    'bg-primary',
    'bg-amber-400',
    'bg-emerald-400',
    'bg-sky-400',
    'bg-purple-400'
  ];

  const engagementEmojis = [
    { value: 1, emoji: '😐', label: 'Minimal Interest' },
    { value: 2, emoji: '🙂', label: '' },
    { value: 3, emoji: '😊', label: '' },
    { value: 4, emoji: '😄', label: '' },
    { value: 5, emoji: '🤩', label: 'Highly Engaged' }
  ];

  const timeOptions = [
    { value: 'morning', label: 'Morning', emoji: '🌅' },
    { value: 'afternoon', label: 'Afternoon', emoji: '☀️' },
    { value: 'evening', label: 'Evening', emoji: '🌆' },
    { value: 'night', label: 'Night', emoji: '🌙' }
  ];

  if (!currentUser) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to track your sessions.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Family Tracking Banner */}
      <UpgradeBanner />
      
      {/* Date Navigation Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateDate(-1)}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          
          <div className="text-center">
            <div className="text-xl font-semibold text-foreground">
              {formatDate(selectedDate)}
            </div>
            {isToday && (
              <div className="text-sm text-primary font-medium">
                Today 🌱
              </div>
            )}
          </div>
          
          <button
            onClick={() => navigateDate(1)}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        
        <div className="text-right">
          <div className="text-3xl font-bold text-primary">
            {completedSessions}/{totalPossibleSessions}
          </div>
          <div className="text-sm text-muted-foreground">Sessions</div>
        </div>
      </div>
      
      {/* Rotation Summary */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground text-center mb-4">
          Rotation Summary
        </h2>
        
        {!sessionOccurred && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-center text-sm text-amber-700">
            <span className="font-medium">No tracking yet today</span> — Mark any round to automatically trigger the 5-day rotation.
          </div>
        )}
        
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary">{rotationSummary.activeCards}</div>
            <div className="text-xs text-muted-foreground">Active Cards</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{rotationSummary.retiredToday}</div>
            <div className="text-xs text-muted-foreground">Retired Today</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{rotationSummary.newToday}</div>
            <div className="text-xs text-muted-foreground">New Today</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">{rotationSummary.totalSets}</div>
            <div className="text-xs text-muted-foreground">Total Sets</div>
          </div>
        </div>
      </div>
      
      {/* Tracking Cards - One per Set */}
      <div className="space-y-4">
        {sets.map((set, setIndex) => {
          const words = getSetWordsWithMeta(set.id);
          const setColor = setColors[setIndex % setColors.length];
          const roundsCompleted = [1, 2, 3].filter(r => roundTracking[`${set.id}-${r}`]).length;
          
          return (
            <div 
              key={set.id} 
              className="bg-card rounded-xl border border-border overflow-hidden"
            >
              {/* Set Header */}
              <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${setColor} flex items-center justify-center text-white font-bold`}>
                    {setIndex + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Set {setIndex + 1}</div>
                    <div className="text-sm text-muted-foreground">{words.length} words</div>
                  </div>
                </div>
                
                {/* Round Checkboxes */}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    {[1, 2, 3].map(round => {
                      const isChecked = roundTracking[`${set.id}-${round}`];
                      return (
                        <div key={round} className="flex flex-col items-center gap-1">
                          <span className="text-xs text-muted-foreground">R{round}</span>
                          <button
                            onClick={() => toggleSetRound(set.id, round)}
                            className={`w-8 h-8 rounded border-2 transition-all flex items-center justify-center ${
                              isChecked 
                                ? 'bg-primary border-primary text-white' 
                                : 'border-border hover:border-primary bg-background'
                            }`}
                          >
                            {isChecked && <Check className="w-5 h-5" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {roundsCompleted}/3
                  </div>
                  
                  <button
                    onClick={() => setEditingSetId(editingSetId === set.id ? null : set.id)}
                    className="p-2 rounded hover:bg-secondary transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              
              {/* Words List */}
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {words.map(word => (
                    <div 
                      key={word.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-full"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {word.front || word.word}
                      </span>
                      {word.isOldest && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
                          Oldest
                        </span>
                      )}
                      {word.back && word.back !== (word.front || word.word) && (
                        <span className="text-xs text-muted-foreground">
                          ({word.back})
                        </span>
                      )}
                    </div>
                  ))}
                  {words.length === 0 && (
                    <span className="text-sm text-muted-foreground italic">No words in this set</span>
                  )}
                </div>
              </div>
              
              {/* Edit Panel */}
              <AnimatePresence>
                {editingSetId === set.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border overflow-hidden"
                  >
                    <div className="p-4 bg-secondary/20 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-foreground">Edit Set {setIndex + 1}</h4>
                        <button
                          onClick={() => setEditingSetId(null)}
                          className="p-1 rounded hover:bg-secondary"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Current words with remove option */}
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Current words (click to remove):</p>
                        <div className="flex flex-wrap gap-2">
                          {words.map(word => (
                            <button
                              key={word.id}
                              onClick={() => handleRemoveWordFromSet(word.id)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-full text-sm transition-colors"
                            >
                              <span>{word.front || word.word}</span>
                              <X className="w-3 h-3" />
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Add new words */}
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Add words:</p>
                        
                        {/* Filter Row */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {/* Category Filter */}
                          <select
                            value={selectedCategoryFilter}
                            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm flex-1 min-w-[120px]"
                          >
                            <option value="all">All Categories</option>
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          
                          {/* Type Filter (Word vs Phrase) */}
                          <select
                            value={selectedTypeFilter}
                            onChange={(e) => setSelectedTypeFilter(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                          >
                            <option value="all">All Types</option>
                            <option value="word">Words</option>
                            <option value="phrase">Phrases</option>
                          </select>
                        </div>
                        
                        {/* Search Input */}
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search available words..."
                          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm mb-2"
                        />
                        
                        {/* Available Words List */}
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                          {getAvailableWords().slice(0, 30).map(word => (
                            <button
                              key={word.id}
                              onClick={() => handleAddWordToSet(word.id)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-sm transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              <span>{word.front || word.word}</span>
                              {word.card_type === 'phrase' && (
                                <span className="text-xs opacity-60">📝</span>
                              )}
                            </button>
                          ))}
                          {getAvailableWords().length === 0 && (
                            <span className="text-sm text-muted-foreground italic">
                              No available words{selectedCategoryFilter !== 'all' || selectedTypeFilter !== 'all' ? ' matching filters' : ''}. Add more in Manage Flashcards.
                            </span>
                          )}
                          {getAvailableWords().length > 30 && (
                            <span className="text-xs text-muted-foreground">
                              +{getAvailableWords().length - 30} more (use filters or search)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        
        {sets.length === 0 && (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <p className="text-muted-foreground">No sets configured. Add flashcards to sets in Manage Flashcards.</p>
          </div>
        )}
      </div>
      
      {/* Track Child's Engagement */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-6">
        <h2 className="text-lg font-semibold text-foreground text-center">
          Track Child's Engagement
        </h2>
        
        {/* Engagement Rating */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">How engaged was your child today?</p>
          <div className="flex justify-center gap-2">
            {engagementEmojis.map(({ value, emoji }) => (
              <button
                key={value}
                onClick={() => setEngagement(value)}
                className={`text-3xl p-2 rounded-lg transition-all ${
                  engagement === value 
                    ? 'bg-primary/10 ring-2 ring-primary scale-110' 
                    : 'hover:bg-secondary'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2 max-w-xs mx-auto">
            <span>1 = Minimal Interest</span>
            <span>5 = Highly Engaged</span>
          </div>
        </div>
        
        {/* Peak Time */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">When was your child most engaged?</p>
          <div className="flex justify-center gap-2 flex-wrap">
            {timeOptions.map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => setPeakTime(value)}
                className={`px-4 py-2 rounded-full border transition-all text-sm ${
                  peakTime === value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:border-primary'
                }`}
              >
                {label} {emoji}
              </button>
            ))}
          </div>
        </div>
        
        {/* Notes */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">Notes for Today</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Record observations, words recognised, special moments..."
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            rows={3}
          />
        </div>
      </div>
      
      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveEngagementData}
          disabled={saving}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : "Save Today's Records"}
        </button>
      </div>
    </div>
  );
};

export default SessionLogTracker;
