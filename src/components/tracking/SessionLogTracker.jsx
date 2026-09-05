import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { useFlashcards } from '../../context/FlashcardContext';
import { toast } from 'react-toastify';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon, Pencil, Check, Plus, X, Sparkles, FileText, BookOpen, Tag } from 'lucide-react';
import SortableWordList from './SortableWordList';
import WordLabel from '../WordLabel';
import { wordMatchesQuery, needsEnglish, getPrimaryText } from '@/utils/wordLabel';
import SetTimeline from './SetTimeline';
import DailyInsight from './DailyInsight';
import InterestsCard from './InterestsCard';
import { AnimatePresence, motion } from 'framer-motion';

const SET_COLORS = [
  { dot: '#7B61FF', label: 'purple' },
  { dot: '#F59E0B', label: 'amber' },
  { dot: '#3B82F6', label: 'blue' },
  { dot: '#10B981', label: 'green' },
  { dot: '#F43F5E', label: 'rose' },
];

// Translating is a network round trip per card, so fill in chunks rather than
// firing a hundred requests at once and leaving the button spinning for minutes.
const FILL_BATCH = 25;

const SessionLogTracker = () => {
  const { currentUser } = useAuth();
  const { sets, flashcards, getFlashcardsForSet, updateSetFlashcards, categories, refreshFlashcards, addFlashcard, updateFlashcard, loading: flashcardsLoading } = useFlashcards();

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

  // Inline "create new word/phrase" form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWordFront, setNewWordFront] = useState('');
  const [newWordEnglish, setNewWordEnglish] = useState('');
  const [newWordPinyin, setNewWordPinyin] = useState('');
  const [newWordType, setNewWordType] = useState('word');
  const [newWordCategory, setNewWordCategory] = useState('');
  const [creatingWord, setCreatingWord] = useState(false);

  // Filling in missing English meanings
  const [fillingEnglish, setFillingEnglish] = useState(false);
  const [fillProgress, setFillProgress] = useState(0);

  // Session occurred flag
  const [sessionOccurred, setSessionOccurred] = useState(false);
  const [backlogWords, setBacklogWords] = useState([]);
  const [toggling, setToggling] = useState(false);

  // "More about today" state
  const [moreOpen, setMoreOpen] = useState(false);
  const [booksRead, setBooksRead] = useState([]);
  const [bookInput, setBookInput] = useState('');
  const [activities, setActivities] = useState([]); // [{ id: string, note?: string }]

  const dateString = useMemo(() => selectedDate.toISOString().split('T')[0], [selectedDate]);

  const completedSessions = useMemo(() => {
    return Object.values(roundTracking).filter(v => v).length;
  }, [roundTracking]);

  // Count only sets that actually hold cards. Counting all five slots made this
  // page report "0 / 15 rounds" while the dashboard, which already filtered out
  // empty sets, reported "0 / 12" for the same day. An empty set has no rounds
  // to complete, so 12 was the correct figure.
  const totalPossibleSessions = sets.filter(s => (s.flashcardIds || []).length > 0).length * 3;

  const isToday = useMemo(() => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  }, [selectedDate]);

  const hasAnyRoundChecked = completedSessions > 0;
  const hasAnyData = hasAnyRoundChecked || engagement || peakTime || notes.trim().length > 0 || booksRead.length > 0 || activities.length > 0;

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
      setBooksRead(sessionData?.books_read || []);
      // Parse activities - handle both old string[] format and new {id, note}[] format
      const rawActivities = sessionData?.activities || [];
      if (Array.isArray(rawActivities)) {
        setActivities(rawActivities.map(a => typeof a === 'string' ? { id: a } : a));
      } else {
        setActivities([]);
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
        await supabase.from('daily_flashing_sessions').update({ notes, books_read: booksRead, activities }).eq('id', existing.id);
      } else {
        await supabase.from('daily_flashing_sessions').insert({
          user_id: currentUser.id,
          session_date: dateString,
          session_occurred: Object.values(roundTracking).some(v => v),
          notes,
          books_read: booksRead,
          activities
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
      const matchesSearch = wordMatchesQuery(card, searchQuery);
      const cardFolder = card.folder || card.categoryId;
      const matchesCategory = selectedCategoryFilter === 'all' || cardFolder === selectedCategoryFilter;
      const matchesType = selectedTypeFilter === 'all' || card.card_type === selectedTypeFilter;
      return matchesSearch && matchesCategory && matchesType;
    });
  };

  // Cards brought in by CSV import or typed in a hurry often have nothing on the
  // back, which leaves them unreadable in this list and invisible to an English
  // search. Fill them as a batch instead of one card at a time.
  const cardsMissingEnglish = useMemo(() => flashcards.filter(needsEnglish), [flashcards]);
  const fillBatchSize = Math.min(cardsMissingEnglish.length, FILL_BATCH);

  const handleFillMissingEnglish = async () => {
    if (fillingEnglish || cardsMissingEnglish.length === 0) return;
    const batch = cardsMissingEnglish.slice(0, FILL_BATCH);

    setFillingEnglish(true);
    setFillProgress(0);
    let filled = 0;

    for (const card of batch) {
      try {
        const { data, error } = await supabase.functions.invoke('translate-word', {
          body: { word: getPrimaryText(card) },
        });
        if (error) throw error;
        if (data?.english) {
          const updates = { english: data.english };
          // Never overwrite pinyin the user has already corrected by hand.
          if (!card.pinyin && data.pinyin) updates.pinyin = data.pinyin;
          await updateFlashcard(card.id, updates);
          filled += 1;
        }
      } catch (err) {
        console.error('Fill English error:', getPrimaryText(card), err);
      }
      setFillProgress(prev => prev + 1);
    }

    setFillingEnglish(false);
    setFillProgress(0);
    if (filled > 0) {
      toast.success(`Added English for ${filled} word${filled === 1 ? '' : 's'}`);
    } else {
      toast.error('Could not add English right now. Try again in a moment.');
    }
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

  const handleCreateAndAddWord = async () => {
    const front = newWordFront.trim();
    if (!front) {
      toast.error('Word or phrase is required');
      return;
    }
    setCreatingWord(true);
    try {
      const categoryId =
        newWordCategory ||
        (categories[0] && (categories[0].id || categories[0])) ||
        'default';

      const created = await addFlashcard(
        front,
        categoryId,
        newWordEnglish.trim(),
        newWordPinyin.trim(),
        newWordType,
        newWordType === 'phrase' ? front : null,
        'zh'
      );

      if (created?.id) {
        const currentSet = sets.find(s => s.id === editingSetId);
        const currentIds = currentSet?.flashcardIds || [];
        await updateSetFlashcards(editingSetId, [...currentIds, created.id]);
        toast.success(`"${front}" added to set`);
      }

      setNewWordFront('');
      setNewWordEnglish('');
      setNewWordPinyin('');
      setNewWordType('word');
      setNewWordCategory('');
      setShowCreateForm(false);
    } catch (err) {
      console.error('Error creating word:', err);
      toast.error('Could not create word. Please try again.');
    } finally {
      setCreatingWord(false);
    }
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

  if (loading || flashcardsLoading) {
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
                              <div style={{ width: '100%' }}>
                                <span style={{ fontSize: '13px', color: '#9CA3AF', fontStyle: 'italic' }}>No words in this set</span>
                                <a href="/cards" style={{ display: 'block', marginTop: '6px', fontSize: '12px', color: '#52B788', textDecoration: 'underline' }}>
                                  Add words in Flashcard Manager →
                                </a>
                              </div>
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
                                    <WordLabel card={word} secondaryStyle={{ color: '#6B7280' }} />
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
                                    <WordLabel card={word} secondaryStyle={{ color: '#8B5CF6' }} />
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
                          {cardsMissingEnglish.length > 0 && (
                            <button
                              type="button"
                              onClick={handleFillMissingEnglish}
                              disabled={fillingEnglish}
                              className="flex items-center gap-1 rounded-full transition-colors mb-2"
                              style={{
                                padding: '4px 10px', fontSize: '11px',
                                background: '#FFFBEB', border: '0.5px solid #FDE68A', color: '#92400E',
                                cursor: fillingEnglish ? 'wait' : 'pointer',
                              }}
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>
                                {fillingEnglish
                                  ? `Adding English… ${fillProgress}/${fillBatchSize}`
                                  : `Add English for ${fillBatchSize} word${fillBatchSize === 1 ? '' : 's'}`}
                              </span>
                            </button>
                          )}
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
                                <WordLabel card={word} secondaryStyle={{ color: '#3F8F5B' }} />
                              </button>
                            ))}
                            {getAvailableWords().length === 0 && (
                              <span style={{ fontSize: '11px', color: '#9CA3AF', fontStyle: 'italic' }}>No available words</span>
                            )}
                          </div>

                          {/* Inline: Add a brand new word/phrase */}
                          <div style={{ marginTop: '10px', borderTop: '0.5px dashed #E5E7EB', paddingTop: '10px' }}>
                            {!showCreateForm ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowCreateForm(true);
                                  if (searchQuery.trim()) setNewWordFront(searchQuery.trim());
                                }}
                                className="flex items-center gap-1 rounded-full transition-colors"
                                style={{
                                  padding: '5px 12px', fontSize: '11px',
                                  background: '#EEF2FF', border: '0.5px dashed #A5B4FC', color: '#4338CA',
                                  fontWeight: 500
                                }}
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add a new word or phrase</span>
                              </button>
                            ) : (
                              <div style={{ background: '#F9FAFB', border: '0.5px solid #E5E7EB', borderRadius: '8px', padding: '10px' }}>
                                <div className="flex items-center justify-between mb-2">
                                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>New word</span>
                                  <button onClick={() => setShowCreateForm(false)} style={{ color: '#9CA3AF', cursor: 'pointer' }}>
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="flex gap-1.5 mb-2">
                                  {['word', 'phrase'].map(t => (
                                    <button
                                      key={t}
                                      type="button"
                                      onClick={() => setNewWordType(t)}
                                      style={{
                                        fontSize: '11px', padding: '3px 10px', borderRadius: '12px', cursor: 'pointer',
                                        background: newWordType === t ? '#52B788' : '#fff',
                                        color: newWordType === t ? '#fff' : '#6B7280',
                                        border: newWordType === t ? '0.5px solid #52B788' : '0.5px solid #D1D5DB',
                                      }}
                                    >
                                      {t.charAt(0).toUpperCase() + t.slice(1)}
                                    </button>
                                  ))}
                                </div>
                                <input
                                  type="text"
                                  value={newWordFront}
                                  onChange={(e) => setNewWordFront(e.target.value)}
                                  placeholder={newWordType === 'phrase' ? 'Phrase (Chinese)' : 'Word (Chinese)'}
                                  style={{ width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: '6px', border: '0.5px solid #D1D5DB', marginBottom: '5px' }}
                                />
                                <input
                                  type="text"
                                  value={newWordEnglish}
                                  onChange={(e) => setNewWordEnglish(e.target.value)}
                                  placeholder="English meaning (optional)"
                                  style={{ width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: '6px', border: '0.5px solid #D1D5DB', marginBottom: '5px' }}
                                />
                                <input
                                  type="text"
                                  value={newWordPinyin}
                                  onChange={(e) => setNewWordPinyin(e.target.value)}
                                  placeholder="Pinyin (optional)"
                                  style={{ width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: '6px', border: '0.5px solid #D1D5DB', marginBottom: '8px' }}
                                />
                                <button
                                  type="button"
                                  onClick={handleCreateAndAddWord}
                                  disabled={creatingWord || !newWordFront.trim()}
                                  style={{
                                    width: '100%', padding: '7px', fontSize: '12px', fontWeight: 600,
                                    background: creatingWord || !newWordFront.trim() ? '#D1D5DB' : '#52B788',
                                    color: '#fff', border: 'none', borderRadius: '6px', cursor: creatingWord ? 'wait' : 'pointer'
                                  }}
                                >
                                  {creatingWord ? 'Adding…' : 'Add to Set'}
                                </button>
                              </div>
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

      {/* Daily Insight */}
      <DailyInsight dateString={dateString} />

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

            <div style={{ height: '0.5px', background: '#E5E7EB', margin: '0 14px' }} />

            {/* Child interests — feeds AI word suggestions */}
            <InterestsCard />
          </div>
        )}
      </div>

      {/* Section 3.5: More About Today */}
      <div className="mx-4 mt-3">
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className="w-full flex items-center justify-between"
          style={{
            background: '#F8FBF9', border: '0.5px solid #C6E6D4',
            borderRadius: '12px', padding: '12px 14px', cursor: 'pointer'
          }}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" style={{ color: '#9CA3AF' }} />
            <span style={{ fontSize: '14px', color: '#9CA3AF' }}>More about today</span>
            {(booksRead.length > 0 || activities.length > 0) && (
              <span style={{ fontSize: '11px', background: '#D1FAE5', color: '#065F46', padding: '1px 6px', borderRadius: '8px', fontWeight: 500 }}>
                {booksRead.length + activities.length}
              </span>
            )}
          </div>
          {moreOpen
            ? <ChevronDown className="w-4 h-4" style={{ color: '#52B788' }} />
            : <ChevronRightIcon className="w-4 h-4" style={{ color: '#52B788' }} />
          }
        </button>

        {moreOpen && (
          <div className="mt-2" style={{
            background: '#fff', border: '0.5px solid #D1D5DB',
            borderRadius: '12px', overflow: 'hidden'
          }}>
            {/* Books read */}
            <div style={{ padding: '14px 14px 10px' }}>
              <p style={{ fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                📖 Books read today
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={bookInput}
                  onChange={(e) => setBookInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && bookInput.trim()) {
                      setBooksRead(prev => [...prev, bookInput.trim()]);
                      setBookInput('');
                    }
                  }}
                  placeholder="Type book title + Enter"
                  style={{
                    flex: 1, border: '0.5px solid #D1D5DB', borderRadius: '8px',
                    padding: '8px 12px', fontSize: '13px', outline: 'none', color: '#1F2937'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#52B788'}
                  onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                />
                <button
                  onClick={() => {
                    if (bookInput.trim()) {
                      setBooksRead(prev => [...prev, bookInput.trim()]);
                      setBookInput('');
                    }
                  }}
                  style={{
                    padding: '8px 12px', borderRadius: '8px',
                    background: '#52B788', color: '#fff', fontSize: '13px', fontWeight: 500,
                    border: 'none', cursor: 'pointer'
                  }}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {booksRead.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {booksRead.map((book, i) => (
                    <span key={i} className="flex items-center gap-1" style={{
                      fontSize: '12px', background: '#F0F7F4', color: '#1F2937',
                      padding: '4px 10px', borderRadius: '16px', border: '0.5px solid #C6E6D4'
                    }}>
                      📖 {book}
                      <button onClick={() => setBooksRead(prev => prev.filter((_, idx) => idx !== i))} style={{ marginLeft: '2px', color: '#9CA3AF', cursor: 'pointer' }}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ height: '0.5px', background: '#E5E7EB', margin: '0 14px' }} />

            {/* Activities */}
            <div style={{ padding: '10px 14px 14px' }}>
              <p style={{ fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                🎯 Activities played
              </p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { id: 'art', label: '🎨 Art' },
                  { id: 'puzzles', label: '🧩 Puzzles' },
                  { id: 'songs', label: '🎵 Songs' },
                  { id: 'reading', label: '📖 Reading' },
                  { id: 'outdoor', label: '🏃 Outdoor' },
                  { id: 'roleplay', label: '🎭 Role Play' },
                  { id: 'cooking', label: '🍳 Cooking' },
                  { id: 'screen', label: '📺 Screen Time' },
                ].map(({ id, label }) => {
                  const selected = activities.some(a => a.id === id);
                  return (
                    <button
                      key={id}
                      onClick={() => setActivities(prev =>
                        selected ? prev.filter(a => a.id !== id) : [...prev, { id, note: '' }]
                      )}
                      style={{
                        fontSize: '12px', fontWeight: 500,
                        padding: '6px 14px', borderRadius: '20px',
                        border: selected ? '0.5px solid #52B788' : '0.5px solid #D1D5DB',
                        background: selected ? '#52B788' : '#fff',
                        color: selected ? '#fff' : '#6B7280',
                        cursor: 'pointer', minHeight: '32px'
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Notes for selected activities */}
              {activities.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {activities.map((activity) => {
                    const activityLabel = {
                      art: '🎨 Art', puzzles: '🧩 Puzzles', songs: '🎵 Songs', reading: '📖 Reading',
                      outdoor: '🏃 Outdoor', roleplay: '🎭 Role Play', cooking: '🍳 Cooking', screen: '📺 Screen Time'
                    }[activity.id] || activity.id;
                    return (
                      <div key={activity.id} style={{
                        background: '#F8FBF9', borderRadius: '8px', padding: '8px 10px',
                        border: '0.5px solid #C6E6D4'
                      }}>
                        <p style={{ fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                          {activityLabel}
                        </p>
                        <input
                          type="text"
                          value={activity.note || ''}
                          onChange={(e) => setActivities(prev =>
                            prev.map(a => a.id === activity.id ? { ...a, note: e.target.value } : a)
                          )}
                          placeholder="What did you do? (optional)"
                          style={{
                            width: '100%', border: '0.5px solid #D1D5DB', borderRadius: '6px',
                            padding: '6px 10px', fontSize: '12px', outline: 'none', color: '#1F2937',
                            background: '#fff'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#52B788'}
                          onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
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
