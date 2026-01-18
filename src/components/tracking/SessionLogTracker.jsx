import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { useFlashcards } from '../../context/FlashcardContext';
import { toast } from 'react-toastify';
import { ChevronLeft, ChevronRight, Pencil, Check } from 'lucide-react';
import UpgradeBanner from './UpgradeBanner';

const SessionLogTracker = () => {
  const { currentUser } = useAuth();
  const { sets, flashcards, getFlashcardsForSet, updateSetFlashcards, categories } = useFlashcards();
  
  // Date state
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Tracking state
  const [roundTracking, setRoundTracking] = useState({}); // { `${setId}-${wordId}-${round}`: boolean }
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
  
  // Session occurred flag
  const [sessionOccurred, setSessionOccurred] = useState(false);

  const dateString = useMemo(() => selectedDate.toISOString().split('T')[0], [selectedDate]);
  
  // Calculate total possible sessions (sets × 3 rounds)
  const totalPossibleSessions = sets.length * 3;
  
  // Calculate completed sessions
  const completedSessions = useMemo(() => {
    const completedRounds = new Set();
    Object.entries(roundTracking).forEach(([key, value]) => {
      if (value) {
        const [setId, , round] = key.split('-');
        completedRounds.add(`${setId}-${round}`);
      }
    });
    return completedRounds.size;
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
      
      // Parse tracking data into round tracking state
      const tracking = {};
      let loadedEngagement = null;
      let loadedPeakTime = null;
      let loadedNotes = '';
      
      (trackingData || []).forEach(record => {
        if (record.status === 'flashed' && record.notes) {
          try {
            const metadata = JSON.parse(record.notes);
            if (metadata.setId && metadata.round && record.flashcard_id) {
              tracking[`${metadata.setId}-${record.flashcard_id}-${metadata.round}`] = true;
            }
          } catch (e) {
            // Not JSON - could be daily notes
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
        loadedNotes = sessionData.notes;
      }
      
      setRoundTracking(tracking);
      setEngagement(loadedEngagement);
      setPeakTime(loadedPeakTime);
      setNotes(loadedNotes);
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

  const toggleRound = async (setId, wordId, round) => {
    if (!currentUser) {
      toast.error('Please log in to track sessions');
      return;
    }
    
    const key = `${setId}-${wordId}-${round}`;
    const isCurrentlyChecked = roundTracking[key];
    
    try {
      if (isCurrentlyChecked) {
        // Uncheck - delete the tracking record
        setRoundTracking(prev => ({ ...prev, [key]: false }));
        
        await supabase
          .from('daily_tracking')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('date', dateString)
          .eq('flashcard_id', wordId)
          .like('notes', `%"setId":${setId}%`)
          .like('notes', `%"round":${round}%`);
      } else {
        // Check - create tracking record
        setRoundTracking(prev => ({ ...prev, [key]: true }));
        
        // Auto-trigger rotation on first tracking
        if (!sessionOccurred) {
          await recordSessionOccurred();
        }
        
        await supabase
          .from('daily_tracking')
          .insert({
            user_id: currentUser.id,
            flashcard_id: wordId,
            date: dateString,
            status: 'flashed',
            flashed_at: new Date().toISOString(),
            notes: JSON.stringify({ setId, round })
          });
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
      
      // Update engagement on a tracking record if we have one
      if (engagement || peakTime) {
        const trackingKeys = Object.entries(roundTracking).filter(([, v]) => v);
        if (trackingKeys.length > 0) {
          const [firstKey] = trackingKeys[0];
          const [setId, wordId] = firstKey.split('-');
          
          await supabase
            .from('daily_tracking')
            .update({ 
              engagement: engagement,
              time_of_day: peakTime 
            })
            .eq('user_id', currentUser.id)
            .eq('date', dateString)
            .eq('flashcard_id', wordId);
        }
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
      
      {/* Tracking Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Set</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Word</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Day</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">R1</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">R2</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">R3</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sets.map((set, setIndex) => {
              const words = getSetWordsWithMeta(set.id);
              const setColor = setColors[setIndex % setColors.length];
              
              return words.length > 0 ? (
                words.map((word, wordIndex) => (
                  <tr key={`${set.id}-${word.id}`} className="hover:bg-secondary/30 transition-colors">
                    {/* Set indicator - only show on first word */}
                    <td className="px-4 py-3">
                      {wordIndex === 0 && (
                        <div className={`w-8 h-8 rounded-full ${setColor}`} />
                      )}
                    </td>
                    
                    {/* Word with oldest badge */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{word.front || word.word}</span>
                        {word.isOldest && (
                          <span className="px-2 py-0.5 bg-secondary text-xs text-muted-foreground rounded">
                            Oldest
                          </span>
                        )}
                      </div>
                      {word.back && word.back !== word.front && (
                        <div className="text-xs text-muted-foreground">{word.back}</div>
                      )}
                    </td>
                    
                    {/* Day count */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-muted-foreground">
                        {word.dayCount || '-'}
                      </span>
                    </td>
                    
                    {/* Round checkboxes */}
                    {[1, 2, 3].map(round => {
                      const isChecked = roundTracking[`${set.id}-${word.id}-${round}`];
                      return (
                        <td key={round} className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleRound(set.id, word.id, round)}
                            className={`w-6 h-6 rounded border-2 transition-all flex items-center justify-center ${
                              isChecked 
                                ? 'bg-primary border-primary text-white' 
                                : 'border-border hover:border-primary'
                            }`}
                          >
                            {isChecked && <Check className="w-4 h-4" />}
                          </button>
                        </td>
                      );
                    })}
                    
                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      {/* Status indicator could go here */}
                    </td>
                    
                    {/* Actions - only show on first word */}
                    <td className="px-4 py-3 text-center">
                      {wordIndex === 0 && (
                        <button
                          onClick={() => setEditingSetId(set.id)}
                          className="p-1.5 rounded hover:bg-secondary transition-colors"
                        >
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr key={set.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <div className={`w-8 h-8 rounded-full ${setColor}`} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground italic" colSpan={6}>
                    No words in this set
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setEditingSetId(set.id)}
                      className="p-1.5 rounded hover:bg-secondary transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {sets.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No sets configured yet. Add flashcards to sets in Manage Flashcards.</p>
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
