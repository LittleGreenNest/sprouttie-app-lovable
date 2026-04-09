import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { useFlashcards } from '../../context/FlashcardContext';
import { toast } from 'react-toastify';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon, Pencil, Check, Plus, X, Sparkles, FileText } from 'lucide-react';
import SortableWordList from './SortableWordList';
import SetTimeline from './SetTimeline';
import { AnimatePresence, motion } from 'framer-motion';

const SET_COLORS = [
  { dot: '#7B61FF', label: 'purple' },
  { dot: '#F59E0B', label: 'amber' },
  { dot: '#3B82F6', label: 'blue' },
  { dot: '#10B981', label: 'green' },
  { dot: '#F43F5E', label: 'rose' },
];

const SessionLogTracker = () => {
  const { currentUser } = useAuth();
  const { sets, flashcards, getFlashcardsForSet, updateSetFlashcards, categories, refreshFlashcards } = useFlashcards();

  // Date state
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Tracking state - { `${setId}-${round}`: boolean }
  const [roundTracking, setRoundTracking] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);

  // Engagement state
  const [engagement, setEngagement] = useState(null);
  const [peakTime, setPeakTime] = useState(null);
  const [notes, setNotes] = useState('');

  // UI state
  const [expandedSetId, setExpandedSetId] = useState(null);
  const [expandedSetTab, setExpandedSetTab] = useState({}); // { [setId]: 'words' | 'timeline' }
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [editingSetId, setEditingSetId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');

  // Session occurred flag
  const [sessionOccurred, setSessionOccurred] = useState(false);
  const [backlogWords, setBacklogWords] = useState([]);
  const [toggling, setToggling] = useState(false);

  const dateString = useMemo(() => selectedDate.toISOString().split('T')[0], [selectedDate]);

  const completedSessions = useMemo(() => {
    return Object.values(roundTracking).filter(v => v).length;
  }, [roundTracking]);

  const totalPossibleSessions = sets.length * 3;

  const isToday = useMemo(() => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  }, [selectedDate]);

  const hasAnyRoundChecked = completedSessions > 0;
  const hasAnyData = hasAnyRoundChecked || engagement || peakTime || notes.trim().length > 0;

  useEffect(() => {
    if (currentUser) {
      refreshFlashcards();
      if (!toggling) {
        loadTrackingData();
      }
      loadBacklogWords();
    } else {
      setLoading(false);
    }
  }, [currentUser?.id, dateString]);

  const loadTrackingData = async () => {
    try {
      setLoading(true);
      const { data: trackingData, error } = await supabase
        .from('daily_tracking')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('date', dateString);

      if (error) throw error;

      const tracking = {};
      let loadedEngagement = null;
      let loadedPeakTime = null;

      (trackingData || []).forEach(record => {
        if (record.status === 'flashed') {
          if (record.notes) {
            try {
              const metadata = JSON.parse(record.notes);
              if (metadata.setId !== undefined && metadata.round !== undefined) {
                tracking[`${metadata.setId}-${metadata.round}`] = true;
              }
            } catch (e) {}
          }
          if (record.flashed_by && record.flashed_by.includes(':')) {
            const [recSetId, recRound] = record.flashed_by.split(':');
            const roundNum = parseInt(recRound, 10);
            if (recSetId && !isNaN(roundNum)) {
              tracking[`${recSetId}-${roundNum}`] = true;
            }
          }
        }
        if (record.engagement && !loadedEngagement) loadedEngagement = record.engagement;
        if (record.time_of_day && !loadedPeakTime) loadedPeakTime = record.time_of_day;
      });

      const { data: sessionData } = await supabase
        .from('daily_flashing_sessions')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('session_date', dateString)
        .maybeSingle();

      setSessionOccurred(sessionData?.session_occurred || false);
      if (sessionData?.notes) setNotes(sessionData.notes);

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

  const loadBacklogWords = async () => {
    if (!currentUser) return;
    try {
      const today = new Date();
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(today);
      weekStart.setDate(diff);
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('word_plans')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('planned_week_start', weekStartStr)
        .order('display_order', { ascending: true });
      if (error) throw error;
      setBacklogWords(data || []);
    } catch (error) {
      console.error('Error loading backlog:', error);
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

    setToggling(true);
    setRoundTracking(prev => ({ ...prev, [key]: !isCurrentlyChecked }));

    try {
      if (isCurrentlyChecked) {
        // Delete all tracking rows for this set+round on this date
        const { error: deleteErr } = await supabase
          .from('daily_tracking')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('date', dateString)
          .eq('flashed_by', `${setId}:${round}`);
        if (deleteErr) throw deleteErr;
      } else {
        if (!sessionOccurred) await recordSessionOccurred();
        const cardsToInsert = setFlashcards.length > 0 ? setFlashcards : [{ id: `set-${setId}-sentinel` }];
        // Use a round-specific flashcard_id to avoid unique constraint violations
        // when the same card is flashed across multiple rounds on the same date
        const inserts = cardsToInsert.map(card => ({
          user_id: currentUser.id,
          flashcard_id: `${card.id}:R${round}`,
          date: dateString,
          status: 'flashed',
          flashed_at: new Date().toISOString(),
          flashed_by: `${setId}:${round}`,
          notes: JSON.stringify({ setId, round })
        }));
        const { error } = await supabase.from('daily_tracking').insert(inserts);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error toggling round:', error);
      toast.error('Failed to update — please try again');
      setRoundTracking(prev => ({ ...prev, [key]: isCurrentlyChecked }));
    } finally {
      setToggling(false);
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
        await supabase.from('daily_flashing_sessions').update({ session_occurred: true }).eq('id', existing.id);
      } else {
        await supabase.from('daily_flashing_sessions').insert({
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
      const { data: existing } = await supabase
        .from('daily_flashing_sessions')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('session_date', dateString)
        .maybeSingle();
      if (existing) {
        await supabase.from('daily_flashing_sessions').update({ notes }).eq('id', existing.id);
      } else {
        await supabase.from('daily_flashing_sessions').insert({
          user_id: currentUser.id,
          session_date: dateString,
          session_occurred: Object.values(roundTracking).some(v => v),
          notes
        });
      }
      if (engagement || peakTime) {
        await supabase
          .from('daily_tracking')
          .update({ engagement, time_of_day: peakTime })
          .eq('user_id', currentUser.id)
          .eq('date', dateString)
          .eq('status', 'flashed');
      }
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1800);
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

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getSetWordsWithMeta = (setId) => {
    const setFlashcards = getFlashcardsForSet(setId);
    if (setFlashcards.length === 0) return [];
    const sorted = [...setFlashcards].sort((a, b) => {
      const aOrder = a.set_display_order ?? 999;
      const bOrder = b.set_display_order ?? 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      const aDate = a.date_introduced || a.created_at || '9999-12-31';
      const bDate = b.date_introduced || b.created_at || '9999-12-31';
      return new Date(aDate) - new Date(bDate);
    });
    const lastIndex = sorted.length - 1;
    return sorted.map((card, index) => ({
      ...card,
      isOldest: sorted.length > 1 && index === 0,
      isNewest: sorted.length > 1 && index === lastIndex,
      dayCount: card.active_day_count || 1
    }));
  };

  // Count retired words for a set (approximate — words with date_retired and no current set)
  const getRetiredCountForSet = (setId) => {
    // We can only approximate this since retired words lose their set_number
    // For now, count words currently in this set that have card_status 'retired' or 'graduated'/'owned'
    const words = getFlashcardsForSet(setId);
    return words.filter(w => w.card_status === 'retired' || w.card_status === 'graduated' || w.card_status === 'owned').length;
  };

  const getAvailableWords = () => {
    const wordsInSets = new Set();
    sets.forEach(set => {
      getFlashcardsForSet(set.id).forEach(card => wordsInSets.add(card.id));
    });
    return flashcards.filter(card => {
      if (wordsInSets.has(card.id)) return false;
      const matchesSearch = !searchQuery ||
        card.front?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.back?.toLowerCase().includes(searchQuery.toLowerCase());
      const cardFolder = card.folder || card.categoryId;
      const matchesCategory = selectedCategoryFilter === 'all' || cardFolder === selectedCategoryFilter;
      const matchesType = selectedTypeFilter === 'all' || card.card_type === selectedTypeFilter;
      return matchesSearch && matchesCategory && matchesType;
    });
  };

  const getRecommendedWords = () => {
    if (!editingSetId) return [];
    const wordsInSets = new Set();
    const wordTextsInSets = new Set();
    sets.forEach(set => {
      getFlashcardsForSet(set.id).forEach(card => {
        wordsInSets.add(card.id);
        if (card.front) wordTextsInSets.add(card.front.toLowerCase());
      });
    });
    const currentSetCards = getFlashcardsForSet(editingSetId);
    const setCategories = new Set(currentSetCards.map(c => c.folder).filter(Boolean));
    const backlogFlashcardMatches = [];
    backlogWords.forEach(bp => {
      if (wordTextsInSets.has(bp.word.toLowerCase())) return;
      const matchingCard = flashcards.find(
        f => f.front?.toLowerCase() === bp.word.toLowerCase() && !wordsInSets.has(f.id)
      );
      if (matchingCard) {
        backlogFlashcardMatches.push({ ...matchingCard, _source: 'backlog', _reason: `From planner${bp.theme ? ` · ${bp.theme}` : ''}` });
      }
    });
    const categoryMatches = [];
    if (setCategories.size > 0) {
      flashcards.forEach(card => {
        if (wordsInSets.has(card.id) || backlogFlashcardMatches.some(b => b.id === card.id)) return;
        if (card.front && wordTextsInSets.has(card.front.toLowerCase())) return;
        if (setCategories.has(card.folder)) {
          categoryMatches.push({ ...card, _source: 'category', _reason: `Same category · ${card.folder}` });
        }
      });
    }
    return [...backlogFlashcardMatches.slice(0, 5), ...categoryMatches.slice(0, 5)];
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
    if (currentUser) {
      try {
        await supabase
          .from('flashcards')
          .update({ date_retired: new Date().toISOString().split('T')[0], card_status: 'retired' })
          .eq('id', wordId)
          .eq('user_id', currentUser.id);
      } catch (err) {
        console.error('Error writing date_retired:', err);
      }
    }
    const currentIds = currentSet.flashcardIds || [];
    await updateSetFlashcards(editingSetId, currentIds.filter(id => id !== wordId));
    toast.success('Word removed from set');
  };

  const handleReorderWords = async (reorderedWords) => {
    if (!editingSetId || !currentUser) return;
    try {
      const promises = reorderedWords.map((word, index) =>
        supabase.from('flashcards').update({ set_display_order: index }).eq('id', word.id).eq('user_id', currentUser.id)
      );
      await Promise.all(promises);
      await refreshFlashcards();
    } catch (error) {
      console.error('Error reordering words:', error);
      toast.error('Failed to save order');
    }
  };

  const toggleExpand = (setId) => {
    setExpandedSetId(prev => prev === setId ? null : setId);
    if (!expandedSetTab[setId]) {
      setExpandedSetTab(prev => ({ ...prev, [setId]: 'words' }));
    }
  };

  const openTimeline = (setId) => {
    setExpandedSetId(setId);
    setExpandedSetTab(prev => ({ ...prev, [setId]: 'timeline' }));
  };

  const engagementEmojis = [
    { value: 1, emoji: '😑' },
    { value: 2, emoji: '😊' },
    { value: 3, emoji: '😄' },
    { value: 4, emoji: '🤩' },
    { value: 5, emoji: '😍' },
  ];

  const timeOptions = [
    { value: 'morning', label: 'Morning' },
    { value: 'afternoon', label: 'Afternoon' },
    { value: 'evening', label: 'Evening' },
    { value: 'night', label: 'Night' },
  ];

  if (!currentUser) {
    return (
      <div className="text-center py-12">
        <p className="text-[#9CA3AF]">Please log in to track your sessions.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: '#2D6A4F' }} />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-36">
      {/* Section 1: Date Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '0.5px solid #E5E7EB' }}>
        <div className="flex items-center gap-2">
          <button onClick={() => navigateDate(-1)} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-4 h-4" style={{ color: '#6B7280' }} />
          </button>
          <span style={{ fontSize: '15px', fontWeight: 500, color: '#1F2937' }}>
            {formatDate(selectedDate)}
          </span>
          <button onClick={() => navigateDate(1)} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
            <ChevronRight className="w-4 h-4" style={{ color: '#6B7280' }} />
          </button>
        </div>
        {isToday && (
          <span style={{
            fontSize: '11px', fontWeight: 500, color: '#2D6A4F',
            background: '#D8F3DC', borderRadius: '20px', padding: '3px 9px'
          }}>
            Today
          </span>
        )}
      </div>

      {/* Section 2: Sets Tracker Card */}
      <div className="mx-4 mt-4" style={{
        background: '#fff', borderRadius: '12px',
        border: '0.5px solid #D1D5DB', overflow: 'hidden'
      }}>
        {sets.map((set, setIndex) => {
          const words = getSetWordsWithMeta(set.id);
          const color = SET_COLORS[setIndex % SET_COLORS.length];
          const roundsChecked = [1, 2, 3].filter(r => roundTracking[`${set.id}-${r}`]).length;
          const allComplete = roundsChecked === 3;
          const partial = roundsChecked > 0 && roundsChecked < 3;
          const isExpanded = expandedSetId === set.id;
          const activeTab = expandedSetTab[set.id] || 'words';
          const retiredCount = getRetiredCountForSet(set.id);

          return (
            <div key={set.id}>
              {/* Divider between rows */}
              {setIndex > 0 && <div style={{ height: '0.5px', background: '#E5E7EB' }} />}

              <div
                className="relative"
                style={{ background: allComplete ? '#F0F7F4' : '#fff' }}
              >
                {/* Partial completion left border */}
                <div
                  className="absolute left-0 top-0 bottom-0"
                  style={{
                    width: '3px',
                    background: allComplete ? '#52B788' : partial ? '#A7D4BE' : 'transparent',
                    borderRadius: '3px 0 0 3px'
                  }}
                />

                {/* Set row */}
                <div className="flex items-start gap-2.5 px-4 py-3" style={{ paddingLeft: '14px' }}>
                  {/* Coloured dot */}
                  <div
                    className="flex-shrink-0 flex items-center justify-center mt-0.5"
                    style={{
                      width: '20px', height: '20px', borderRadius: '50%',
                      background: color.dot, color: '#fff',
                      fontSize: '10px', fontWeight: 600
                    }}
                  >
                    {setIndex + 1}
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    {/* Top line: set name + R buttons + word count + chevron */}
                    <div className="flex items-center gap-2">
                      <span className="flex-shrink-0" style={{ fontSize: '13px', fontWeight: 500, color: '#1F2937' }}>
                        Set {setIndex + 1}
                      </span>

                      {/* R1 R2 R3 buttons */}
                      <div className="flex flex-1 min-w-0 gap-1.5">
                        {[1, 2, 3].map(round => {
                          const isChecked = roundTracking[`${set.id}-${round}`];
                          return (
                            <button
                              key={round}
                              onClick={() => toggleSetRound(set.id, round)}
                              className="flex-1 min-w-0 transition-colors"
                              style={{
                                fontSize: '11px', fontWeight: 500,
                                padding: '5px 0', borderRadius: '6px',
                                border: isChecked ? '0.5px solid #52B788' : '0.5px solid #D1D5DB',
                                background: isChecked ? '#52B788' : '#fff',
                                color: isChecked ? '#fff' : '#9CA3AF',
                              }}
                            >
                              R{round}
                            </button>
                          );
                        })}
                      </div>

                      <span className="flex-shrink-0 whitespace-nowrap" style={{ fontSize: '12px', color: '#9CA3AF' }}>
                        {words.length} words
                      </span>

                      {/* Expand chevron */}
                      <button
                        onClick={() => toggleExpand(set.id)}
                        className="flex-shrink-0 p-0.5"
                        style={{ color: '#9CA3AF' }}
                      >
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4" />
                          : <ChevronRightIcon className="w-4 h-4" />
                        }
                      </button>
                    </div>

                    {/* Sub-hint line */}
                    {partial && (
                      <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px', paddingLeft: '2px' }}>
                        {roundsChecked} of 3 rounds done
                      </div>
                    )}
                    {retiredCount > 0 && !partial && (
                      <button
                        onClick={() => openTimeline(set.id)}
                        style={{ fontSize: '10px', color: '#52B788', marginTop: '2px', paddingLeft: '2px', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        {retiredCount} retired · View history ›
                      </button>
                    )}
                    {partial && retiredCount > 0 && (
                      <button
                        onClick={() => openTimeline(set.id)}
                        style={{ fontSize: '10px', color: '#52B788', marginTop: '1px', paddingLeft: '2px', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        {retiredCount} retired · View history ›
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded area */}
                {isExpanded && (
                  <div style={{ borderTop: '0.5px solid #E5E7EB' }}>
                    {/* Tab bar */}
                    <div className="flex items-center gap-1.5" style={{ padding: '8px 12px 0' }}>
                      {['words', 'timeline'].map(tab => {
                        const active = activeTab === tab;
                        return (
                          <button
                            key={tab}
                            onClick={() => setExpandedSetTab(prev => ({ ...prev, [set.id]: tab }))}
                            style={{
                              fontSize: '11px', fontWeight: 500,
                              padding: '4px 10px', borderRadius: '6px',
                              background: active ? '#2D6A4F' : 'transparent',
                              color: active ? '#fff' : '#9CA3AF',
                              border: 'none', cursor: 'pointer'
                            }}
                          >
                            {tab === 'words' ? 'Words' : 'Timeline'}
                          </button>
                        );
                      })}

                      {/* Edit button */}
                      <button
                        onClick={() => setEditingSetId(editingSetId === set.id ? null : set.id)}
                        className="ml-auto p-1 rounded hover:bg-gray-100"
                        style={{ color: '#9CA3AF' }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div style={{ height: '0.5px', background: '#E5E7EB', margin: '6px 12px 0' }} />

                    <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                      {activeTab === 'words' ? (
                        <div style={{ padding: '10px 12px 12px 40px' }}>
                          <div className="flex flex-wrap gap-1.5">
                            {words.length === 0 && (
                              <span style={{ fontSize: '13px', color: '#9CA3AF', fontStyle: 'italic' }}>No words in this set</span>
                            )}
                            {words.map((word, idx) => {
                              let tagLabel = null;
                              let tagBg = null;
                              let tagColor = null;
                              if (word.isOldest) { tagLabel = 'Oldest'; tagBg = '#FEF3C7'; tagColor = '#92400E'; }
                              else if (word.isNewest) { tagLabel = 'New'; tagBg = '#D1FAE5'; tagColor = '#065F46'; }

                              return (
                                <div key={word.id} className="flex items-center gap-1.5">
                                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#1F2937' }}>
                                    {word.front || word.word}
                                  </span>
                                  {tagLabel && (
                                    <span style={{
                                      fontSize: '10px', fontWeight: 500, borderRadius: '10px',
                                      padding: '2px 6px', background: tagBg, color: tagColor
                                    }}>
                                      {tagLabel}
                                    </span>
                                  )}
                                  {(word.date_introduced || word.created_at) && (
                                    <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                                      {new Date(word.date_introduced || word.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                    </span>
                                  )}
                                  {idx < words.length - 1 && <span style={{ color: '#D1D5DB', margin: '0 2px' }}>·</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '10px 12px 12px' }}>
                          <SetTimeline setId={set.id} currentWords={words} />
                        </div>
                      )}
                    </div>

                    {/* Edit Panel */}
                    {editingSetId === set.id && (
                      <div style={{ borderTop: '0.5px solid #E5E7EB', padding: '12px', background: '#F9FAFB' }}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937' }}>Edit Set {setIndex + 1}</h4>
                          <button onClick={() => setEditingSetId(null)} className="p-1 rounded hover:bg-gray-200">
                            <X className="w-3.5 h-3.5" style={{ color: '#6B7280' }} />
                          </button>
                        </div>
                        <div className="mb-3">
                          <p style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '6px' }}>Current words (drag to reorder):</p>
                          <SortableWordList words={words} onRemove={handleRemoveWordFromSet} onReorder={handleReorderWords} />
                        </div>
                        {(() => {
                          const recommended = getRecommendedWords();
                          if (recommended.length === 0) return null;
                          return (
                            <div className="mb-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Sparkles className="w-3 h-3" style={{ color: '#7B61FF' }} />
                                <p style={{ fontSize: '11px', fontWeight: 500, color: '#7B61FF' }}>Recommended</p>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {recommended.map(word => (
                                  <button
                                    key={word.id}
                                    onClick={() => handleAddWordToSet(word.id)}
                                    className="flex items-center gap-1 rounded-full transition-colors"
                                    style={{
                                      padding: '4px 10px', fontSize: '11px',
                                      background: '#F5F3FF', border: '0.5px solid #DDD6FE', color: '#6D28D9'
                                    }}
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>{word.front || word.word}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                        <div>
                          <p style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '6px' }}>Browse all:</p>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            <select
                              value={selectedCategoryFilter}
                              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                              style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '0.5px solid #D1D5DB' }}
                            >
                              <option value="all">All Categories</option>
                              {categories.map(cat => (
                                <option key={cat.id || cat} value={cat.name || cat}>{cat.name || cat}</option>
                              ))}
                            </select>
                            <select
                              value={selectedTypeFilter}
                              onChange={(e) => setSelectedTypeFilter(e.target.value)}
                              style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '0.5px solid #D1D5DB' }}
                            >
                              <option value="all">All</option>
                              <option value="word">Words</option>
                              <option value="phrase">Phrases</option>
                            </select>
                          </div>
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search available words..."
                            style={{
                              width: '100%', fontSize: '11px', padding: '6px 10px',
                              borderRadius: '6px', border: '0.5px solid #D1D5DB', marginBottom: '6px'
                            }}
                          />
                          <div className="flex flex-wrap gap-1.5" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                            {getAvailableWords().slice(0, 30).map(word => (
                              <button
                                key={word.id}
                                onClick={() => handleAddWordToSet(word.id)}
                                className="flex items-center gap-1 rounded-full transition-colors"
                                style={{
                                  padding: '4px 10px', fontSize: '11px',
                                  background: '#F0FDF4', border: '0.5px solid #BBF7D0', color: '#166534'
                                }}
                              >
                                <Plus className="w-3 h-3" />
                                <span>{word.front || word.word}</span>
                              </button>
                            ))}
                            {getAvailableWords().length === 0 && (
                              <span style={{ fontSize: '11px', color: '#9CA3AF', fontStyle: 'italic' }}>No available words</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {sets.length === 0 && (
          <div className="text-center py-8">
            <p style={{ fontSize: '13px', color: '#9CA3AF' }}>No sets configured. Add flashcards to sets first.</p>
          </div>
        )}

        {/* Bottom summary */}
        {sets.length > 0 && (
          <div style={{ borderTop: '0.5px solid #E5E7EB', padding: '10px 0', textAlign: 'center' }}>
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
              {completedSessions} / {totalPossibleSessions} rounds completed today
            </span>
          </div>
        )}
      </div>

      {/* Section 3: Optional Quick Log */}
      <div className="mx-4 mt-3">
        <div style={{ fontSize: '10px', fontWeight: 500, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
          OPTIONAL · 30 SECONDS
        </div>

        {/* Collapsed trigger */}
        <button
          onClick={() => setQuickLogOpen(!quickLogOpen)}
          className="w-full flex items-center justify-between"
          style={{
            background: '#F8FBF9', border: '0.5px solid #C6E6D4',
            borderRadius: '12px', padding: '12px 14px', cursor: 'pointer'
          }}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: '#9CA3AF' }} />
            <span style={{ fontSize: '14px', color: '#9CA3AF' }}>Add a note or observation</span>
          </div>
          {quickLogOpen
            ? <ChevronDown className="w-4 h-4" style={{ color: '#52B788' }} />
            : <ChevronRightIcon className="w-4 h-4" style={{ color: '#52B788' }} />
          }
        </button>

        {/* Expanded content */}
        {quickLogOpen && (
          <div className="mt-2" style={{
            background: '#fff', border: '0.5px solid #D1D5DB',
            borderRadius: '12px', overflow: 'hidden'
          }}>
            {/* Engagement emojis */}
            <div style={{ padding: '14px 14px 10px' }}>
              <p style={{ fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                How engaged was your child?
              </p>
              <div className="flex gap-2">
                {engagementEmojis.map(({ value, emoji }) => (
                  <button
                    key={value}
                    onClick={() => setEngagement(engagement === value ? null : value)}
                    className="text-2xl p-2 rounded-lg transition-colors"
                    style={{
                      border: engagement === value ? '2px solid #52B788' : '2px solid transparent',
                      background: engagement === value ? '#F0F7F4' : 'transparent',
                      borderRadius: '8px',
                      minWidth: '44px', minHeight: '44px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ height: '0.5px', background: '#E5E7EB', margin: '0 14px' }} />

            {/* Peak time */}
            <div style={{ padding: '10px 14px' }}>
              <p style={{ fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                Most active?
              </p>
              <div className="flex gap-2 flex-wrap">
                {timeOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setPeakTime(peakTime === value ? null : value)}
                    style={{
                      fontSize: '12px', fontWeight: 500,
                      padding: '6px 14px', borderRadius: '20px',
                      border: peakTime === value ? '0.5px solid #52B788' : '0.5px solid #D1D5DB',
                      background: peakTime === value ? '#52B788' : '#fff',
                      color: peakTime === value ? '#fff' : '#9CA3AF',
                      cursor: 'pointer', minHeight: '32px'
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ height: '0.5px', background: '#E5E7EB', margin: '0 14px' }} />

            {/* Notes textarea */}
            <div style={{ padding: '10px 14px 14px' }}>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Words noticed, reactions, anything worth remembering..."
                style={{
                  width: '100%', border: '0.5px solid #D1D5DB', borderRadius: '8px',
                  padding: '10px 12px', fontSize: '13px', lineHeight: 1.5,
                  resize: 'none', outline: 'none', minHeight: '80px',
                  color: '#1F2937'
                }}
                onFocus={(e) => e.target.style.borderColor = '#52B788'}
                onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
              />
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Fixed Save Button */}
      <div style={{
        position: 'fixed', bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))', left: 0, right: 0,
        padding: '12px 16px',
        background: 'hsl(var(--background))',
        borderTop: '0.5px solid #D1D5DB',
        zIndex: 25
      }}>
        <button
          onClick={hasAnyData ? saveEngagementData : undefined}
          disabled={saving || !hasAnyData}
          className="w-full transition-colors"
          style={{
            borderRadius: '10px', padding: '14px',
            fontSize: '15px', fontWeight: 500,
            background: saveFlash ? '#1B4332' : hasAnyData ? '#2D6A4F' : 'transparent',
            border: hasAnyData ? 'none' : '1px solid #D1D5DB',
            color: hasAnyData ? '#fff' : '#9CA3AF',
            cursor: hasAnyData ? 'pointer' : 'default',
            opacity: saving ? 0.7 : 1
          }}
        >
          {saving ? 'Saving...' : saveFlash ? 'Saved!' : "Save Today's Log"}
        </button>
      </div>
    </div>
  );
};

export default SessionLogTracker;
