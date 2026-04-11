import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Loader2,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from 'lucide-react';

const MAX_ACTIVATION_WORDS = 5;

const WeeklyWordPlanner = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [wordPlans, setWordPlans] = useState([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(new Date()));
  const [newWord, setNewWord] = useState({ word: '', pinyin: '', theme: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedWordId, setExpandedWordId] = useState(null);
  const [trackingData, setTrackingData] = useState({});
  const [spokenWords, setSpokenWords] = useState([]);
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userFlashcards, setUserFlashcards] = useState([]);
  const [addingWord, setAddingWord] = useState(null);
  const [pendingSuggestions, setPendingSuggestions] = useState([]);
  const [swappingWordId, setSwappingWordId] = useState(null);
  const [swapAlternatives, setSwapAlternatives] = useState({});
  const [loadingSwap, setLoadingSwap] = useState(null);
  const [acceptingAll, setAcceptingAll] = useState(false);

  function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getWeekRangeString = () => {
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    const opts = { month: 'short', day: 'numeric' };
    return `${currentWeekStart.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
  };

  const isCurrentWeek = () => {
    const today = getWeekStart(new Date());
    return formatDate(today) === formatDate(currentWeekStart);
  };

  // Load word plans
  const loadWordPlans = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const { data, error } = await supabase
        .from('word_plans')
        .select('*')
        .eq('user_id', currentUser.id)
        .gte('planned_week_start', formatDate(currentWeekStart))
        .lte('planned_week_start', formatDate(weekEnd))
        .order('display_order', { ascending: true });

      if (error) throw error;
      setWordPlans(data || []);
    } catch (error) {
      console.error('Error loading word plans:', error);
      toast.error('Failed to load activation words');
    } finally {
      setLoading(false);
    }
  }, [currentUser, currentWeekStart]);

  // Load tracking, spoken words, and flashcards
  const loadTrackingData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const startDate = formatDate(currentWeekStart);
      const endDate = new Date(currentWeekStart);
      endDate.setDate(endDate.getDate() + 6);

      const [trackingRes, spokenRes, flashcardsRes] = await Promise.all([
        supabase
          .from('daily_tracking')
          .select('flashcard_id, date, status')
          .eq('user_id', currentUser.id)
          .gte('date', startDate)
          .lte('date', formatDate(endDate)),
        supabase
          .from('spoken_words')
          .select('word, word_stage')
          .eq('user_id', currentUser.id),
        supabase
          .from('flashcards')
          .select('id, front, back, folder, card_type, card_status, set_number')
          .eq('user_id', currentUser.id),
      ]);

      const rounds = {};
      if (trackingRes.data) {
        trackingRes.data.forEach((r) => {
          if (r.status === 'flashed') {
            if (!rounds[r.flashcard_id]) rounds[r.flashcard_id] = new Set();
            rounds[r.flashcard_id].add(r.date);
          }
        });
      }
      setTrackingData(rounds);
      setSpokenWords(spokenRes.data || []);
      setUserFlashcards(flashcardsRes.data || []);
    } catch (err) {
      console.error('Error loading tracking data:', err);
    }
  }, [currentUser, currentWeekStart]);

  // Load pending auto-pilot suggestions
  const loadPendingSuggestions = useCallback(async () => {
    if (!currentUser) return;
    const { data } = await supabase.from('weekly_suggestions').select('*')
      .eq('user_id', currentUser.id).eq('week_start', formatDate(currentWeekStart)).eq('status', 'pending_review');
    setPendingSuggestions(data || []);
  }, [currentUser, currentWeekStart]);

  useEffect(() => {
    loadWordPlans();
    loadTrackingData();
    loadPendingSuggestions();
  }, [loadWordPlans, loadTrackingData, loadPendingSuggestions]);

  const fetchSwapAlternatives = async (suggestionId, word, category) => {
    if (swapAlternatives[suggestionId]) return; // already loaded
    setLoadingSwap(suggestionId);
    try {
      const { data, error } = await supabase.functions.invoke('generate-swap-alternatives', {
        body: { word, category },
      });
      if (error || data?.error) throw new Error(data?.error || 'Failed');
      setSwapAlternatives(prev => ({ ...prev, [suggestionId]: data.alternatives || [] }));
    } catch (err) {
      console.error('Swap alternatives error:', err);
      toast.error("Couldn't load alternatives. Try again.");
    } finally {
      setLoadingSwap(null);
    }
  };

  const handleAcceptAll = async () => {
    if (!currentUser || pendingSuggestions.length === 0) return;
    setAcceptingAll(true);
    try {
      const ids = pendingSuggestions.map(s => s.id);
      await supabase.from('weekly_suggestions').update({ status: 'accepted' }).in('id', ids);

      // Add each word to backlog (word_plans) and flashcards if needed
      for (const s of pendingSuggestions) {
        const existsInBacklog = wordPlans.some(wp => wp.word.toLowerCase() === s.word.toLowerCase());
        if (!existsInBacklog) {
          await supabase.from('word_plans').insert({
            user_id: currentUser.id, word: s.word, theme: s.category || null,
            planned_week_start: formatDate(currentWeekStart), display_order: wordPlans.length,
          });
        }
        const existsInFlashcards = userFlashcards.some(f => f.front?.toLowerCase() === s.word.toLowerCase());
        if (!existsInFlashcards) {
          await supabase.from('flashcards').insert({
            user_id: currentUser.id, front: s.word, back: '', folder: s.category || 'default',
            card_type: 'word', card_status: 'waiting',
          });
        }
      }
      toast.success(`${pendingSuggestions.length} words added to your backlog 🌱`);
      setPendingSuggestions([]);
      loadWordPlans();
      loadTrackingData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to accept suggestions');
    } finally {
      setAcceptingAll(false);
    }
  };

  const handleDismissAll = async () => {
    if (!currentUser || pendingSuggestions.length === 0) return;
    const ids = pendingSuggestions.map(s => s.id);
    await supabase.from('weekly_suggestions').update({ status: 'dismissed' }).in('id', ids);
    setPendingSuggestions([]);
  };

  const handleSwapWord = async (suggestionId, newWord) => {
    await supabase.from('weekly_suggestions').update({ word: newWord }).eq('id', suggestionId);
    setSwappingWordId(null);
    loadPendingSuggestions();
  };

  const getWordStage = (wordText) => {
    const spoken = spokenWords.find(
      (sw) => sw.word.toLowerCase() === wordText.toLowerCase()
    );
    if (!spoken) return { icon: '🌱', label: 'New' };
    if (spoken.word_stage === 'owned') return { icon: '🌳', label: 'Owned' };
    if (spoken.word_stage === 'growing') return { icon: '🌿', label: 'Growing' };
    return { icon: '🌱', label: 'New' };
  };

  const getWordRounds = () => {
    return { r1: false, r2: false, r3: false };
  };

  // Add word to backlog (word_plans) AND flashcards if not already there
  const handleAddWord = async () => {
    if (!newWord.word.trim()) {
      toast.error('Please enter a word');
      return;
    }

    try {
      // Add to word_plans (backlog)
      await supabase.from('word_plans').insert({
        user_id: currentUser.id,
        word: newWord.word.trim(),
        pinyin: newWord.pinyin.trim() || null,
        theme: newWord.theme.trim() || null,
        planned_week_start: formatDate(currentWeekStart),
        planned_date: null,
        display_order: wordPlans.length,
      });

      // Also add to flashcards if not already there
      const existsInFlashcards = userFlashcards.some(
        f => f.front?.toLowerCase() === newWord.word.trim().toLowerCase()
      );
      if (!existsInFlashcards) {
        await supabase.from('flashcards').insert({
          user_id: currentUser.id,
          front: newWord.word.trim(),
          back: newWord.pinyin.trim() || '',
          folder: newWord.theme.trim() || 'default',
          card_type: 'word',
          card_status: 'waiting',
        });
      }

      toast.success('Word added to your list');
      setNewWord({ word: '', pinyin: '', theme: '' });
      setShowAddForm(false);
      loadWordPlans();
      loadTrackingData();
    } catch (error) {
      console.error('Error adding word:', error);
      toast.error('Failed to add word');
    }
  };

  const handleDeleteWord = async (id) => {
    try {
      const { error } = await supabase.from('word_plans').delete().eq('id', id);
      if (error) throw error;
      toast.success('Word removed');
      loadWordPlans();
    } catch (error) {
      console.error('Error deleting word:', error);
      toast.error('Failed to remove word');
    }
  };

  const goToPreviousWeek = () => {
    const newWeek = new Date(currentWeekStart);
    newWeek.setDate(newWeek.getDate() - 7);
    setCurrentWeekStart(newWeek);
  };

  const goToNextWeek = () => {
    const newWeek = new Date(currentWeekStart);
    newWeek.setDate(newWeek.getDate() + 7);
    setCurrentWeekStart(newWeek);
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getWeekStart(new Date()));
  };

  // AI Suggestions - now shows cards for user to choose
  const generateSuggestions = async () => {
    setGeneratingSuggestions(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to use suggestions');
        return;
      }

      const response = await supabase.functions.invoke('suggest-words', {
        body: { weekStart: formatDate(currentWeekStart) },
      });

      if (response.error) throw new Error(response.error.message);

      const suggestions = response.data?.suggestions || [];
      setAiSuggestions(suggestions);
      setShowSuggestions(true);

      if (suggestions.length === 0) {
        toast.info('No new suggestions at the moment.');
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast.error(error.message || 'Failed to generate suggestions');
    } finally {
      setGeneratingSuggestions(false);
    }
  };

  // Add a single AI suggestion to backlog + flashcards (if new)
  const handleAddSuggestion = async (suggestion) => {
    setAddingWord(suggestion.word);
    try {
      const existsInFlashcards = userFlashcards.some(
        f => f.front?.toLowerCase() === suggestion.word.toLowerCase()
      );

      // Add to word_plans (backlog)
      await supabase.from('word_plans').insert({
        user_id: currentUser.id,
        word: suggestion.word,
        pinyin: suggestion.pinyin || null,
        theme: suggestion.theme || null,
        planned_week_start: formatDate(currentWeekStart),
        planned_date: null,
        display_order: wordPlans.length,
      });

      // Only add to flashcards if NOT already there
      if (!existsInFlashcards) {
        await supabase.from('flashcards').insert({
          user_id: currentUser.id,
          front: suggestion.word,
          back: suggestion.pinyin || '',
          folder: suggestion.theme || 'default',
          card_type: 'word',
          card_status: 'waiting',
        });
        toast.success(`"${suggestion.word}" added to your words & backlog`);
      } else {
        toast.success(`"${suggestion.word}" added to backlog`);
      }
      
      // Remove from suggestions list
      setAiSuggestions(prev => prev.filter(s => s.word !== suggestion.word));
      loadWordPlans();
      loadTrackingData();
    } catch (error) {
      console.error('Error adding suggestion:', error);
      toast.error('Failed to add word');
    } finally {
      setAddingWord(null);
    }
  };

  const wordsGrowing = spokenWords.filter((sw) => sw.word_stage === 'growing').length;
  const wordsOwned = spokenWords.filter((sw) => sw.word_stage === 'owned').length;

  if (loading && wordPlans.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--sprouttie-green))]" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-2xl font-display font-bold text-[hsl(var(--foreground))]">
          Weekly Word Planner
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          Plan your flashcard words by theme and week
        </p>
      </motion.div>

      {/* Action buttons row */}
      <div className="flex items-center gap-2">
        <button
          onClick={generateSuggestions}
          disabled={generatingSuggestions}
          className="flex items-center gap-2 px-4 py-2.5 bg-[hsl(var(--sprouttie-green))] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {generatingSuggestions ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          AI Suggest
        </button>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Word
        </button>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPreviousWeek}
          className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[hsl(var(--foreground))]">
            {getWeekRangeString()}
          </span>
          {!isCurrentWeek() && (
            <button
              onClick={goToCurrentWeek}
              className="text-xs text-[hsl(var(--sprouttie-green))] hover:underline"
            >
              Today
            </button>
          )}
        </div>
        <button
          onClick={goToNextWeek}
          className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
        </button>
      </div>

      {/* This Week's Plan — auto-pilot review section */}
      <AnimatePresence>
        {pendingSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-[hsl(var(--border))] bg-emerald-50">
              <div className="flex items-center gap-2">
                <span>📋</span>
                <span className="font-semibold text-sm text-emerald-900">This Week's Plan</span>
              </div>
              <p className="text-xs text-emerald-700 mt-0.5">Auto-generated · Tap to swap any word</p>
            </div>
            <div className="divide-y divide-[hsl(var(--border))]">
              {pendingSuggestions.map((s) => (
                <div key={s.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-[hsl(var(--foreground))]">{s.word}</span>
                        {s.category && (
                          <span className="text-xs bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-2 py-0.5 rounded-full">
                            {s.category}
                          </span>
                        )}
                      </div>
                      {s.reason && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 leading-relaxed italic">
                          {s.reason}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const opening = swappingWordId !== s.id;
                        setSwappingWordId(opening ? s.id : null);
                        if (opening) fetchSwapAlternatives(s.id, s.word, s.category);
                      }}
                      className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                    >
                      Swap
                    </button>
                  </div>
                  {/* Swap bottom sheet */}
                  <AnimatePresence>
                    {swappingWordId === s.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 pt-2 border-t border-dashed border-[hsl(var(--border))] flex flex-wrap gap-2">
                          {loadingSwap === s.id ? (
                            <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                              <Loader2 className="w-3 h-3 animate-spin" /> Finding alternatives…
                            </span>
                          ) : (swapAlternatives[s.id] || []).length > 0 ? (
                            (swapAlternatives[s.id]).map(alt => (
                              <button
                                key={alt}
                                onClick={() => {
                                  handleSwapWord(s.id, alt);
                                  setSwapAlternatives(prev => { const next = { ...prev }; delete next[s.id]; return next; });
                                }}
                                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                              >
                                {alt}
                              </button>
                            ))
                          ) : (
                            <span className="text-xs text-[hsl(var(--muted-foreground))]">No alternatives found</span>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-[hsl(var(--border))] space-y-2">
              <button
                onClick={handleAcceptAll}
                disabled={acceptingAll}
                className="w-full py-2.5 bg-[hsl(var(--sprouttie-green))] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {acceptingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>✓ Accept All & Add to Sets</>
                )}
              </button>
              <button
                onClick={handleDismissAll}
                className="w-full text-center text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors py-1"
              >
                Dismiss — I'll plan manually
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Suggestions Panel */}
      <AnimatePresence>
        {showSuggestions && aiSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-[hsl(var(--border))] flex items-center justify-between bg-violet-50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-600" />
                <span className="font-semibold text-sm text-violet-900">
                  AI Suggestions ({aiSuggestions.length} words)
                </span>
              </div>
              <button
                onClick={() => setShowSuggestions(false)}
                className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                Hide
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
              {aiSuggestions.map((suggestion, i) => {
                const alreadyInFlashcards = userFlashcards.some(
                  f => f.front?.toLowerCase() === suggestion.word.toLowerCase()
                );
                const alreadyInBacklog = wordPlans.some(
                  wp => wp.word.toLowerCase() === suggestion.word.toLowerCase()
                );
                const isAdding = addingWord === suggestion.word;

                return (
                  <motion.div
                    key={suggestion.word}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          {suggestion.word}
                        </span>
                        {suggestion.pinyin && (
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">
                            ({suggestion.pinyin})
                          </span>
                        )}
                        {suggestion.theme && (
                          <span className="text-xs bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-2 py-0.5 rounded-full">
                            {suggestion.theme}
                          </span>
                        )}
                        {alreadyInFlashcards && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                            In your words
                          </span>
                        )}
                      </div>
                      {suggestion.reasoning && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 leading-relaxed">
                          {suggestion.reasoning}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddSuggestion(suggestion)}
                      disabled={alreadyInBacklog || isAdding}
                      className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        alreadyInBacklog
                          ? 'bg-emerald-100 text-emerald-700 cursor-default'
                          : 'bg-[hsl(var(--sprouttie-green))] text-white hover:opacity-90'
                      } disabled:opacity-60`}
                    >
                      {isAdding ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : alreadyInBacklog ? (
                        <>
                          <Check className="w-3 h-3" />
                          Added
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          {alreadyInFlashcards ? 'Add to backlog' : 'Add'}
                        </>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Word Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5 space-y-3"
          >
            <h3 className="font-semibold text-sm text-[hsl(var(--foreground))]">
              Add a Word
            </h3>
            <input
              type="text"
              placeholder="Word (Chinese)"
              value={newWord.word}
              onChange={(e) => setNewWord({ ...newWord, word: e.target.value })}
              className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sprouttie-green))]"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Pinyin (optional)"
                value={newWord.pinyin}
                onChange={(e) => setNewWord({ ...newWord, pinyin: e.target.value })}
                className="px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sprouttie-green))]"
              />
              <input
                type="text"
                placeholder="Category (optional)"
                value={newWord.theme}
                onChange={(e) => setNewWord({ ...newWord, theme: e.target.value })}
                className="px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sprouttie-green))]"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddWord}
                className="flex-1 py-2.5 bg-[hsl(var(--sprouttie-green))] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Add Word
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2.5 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded-xl text-sm hover:opacity-80 transition-opacity"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backlog Word Cards */}
      <div className="space-y-3">
        {wordPlans.length > 0 && (
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
              Backlog ({wordPlans.length} words)
            </h2>
          </div>
        )}
        <AnimatePresence>
          {wordPlans.map((wp, index) => {
            const stage = getWordStage(wp.word);
            const isExpanded = expandedWordId === wp.id;

            return (
              <motion.div
                key={wp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl overflow-hidden"
              >
                <div className="px-5 py-4 flex items-center gap-3">
                  <span className="text-xl">{stage.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[hsl(var(--foreground))] text-base">
                        {wp.word}
                      </span>
                      {wp.pinyin && (
                        <span className="text-sm text-[hsl(var(--muted-foreground))]">
                          {wp.pinyin}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {wp.theme && (
                        <span className="text-xs text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-2 py-0.5 rounded-full">
                          {wp.theme}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        stage.label === 'Owned'
                          ? 'bg-[hsl(var(--sprouttie-green-light))] text-[hsl(var(--sprouttie-green-dark))]'
                          : stage.label === 'Growing'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                      }`}>
                        {stage.label}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWord(wp.id);
                    }}
                    className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {wordPlans.length === 0 && !loading && !showAddForm && !showSuggestions && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8"
        >
          <p className="text-4xl mb-3">🌱</p>
          <h3 className="font-display font-semibold text-[hsl(var(--foreground))] mb-1">
            No words planned yet
          </h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
            Use AI Suggest or add words manually to build your backlog.
          </p>
        </motion.div>
      )}

      {/* Weekly Summary Footer */}
      {(wordPlans.length > 0 || spokenWords.length > 0) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5"
        >
          <h3 className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-3">
            Summary
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <SummaryItem label="In Backlog" value={wordPlans.length} icon="📋" />
            <SummaryItem label="Words Growing" value={wordsGrowing} icon="🌿" />
            <SummaryItem label="Words Owned" value={wordsOwned} icon="🌳" />
          </div>
        </motion.div>
      )}
    </div>
  );
};

const SummaryItem = ({ label, value, icon }) => (
  <div className="flex items-center gap-2.5 py-1.5">
    <span className="text-lg">{icon}</span>
    <div>
      <p className="text-lg font-semibold text-[hsl(var(--foreground))] leading-tight">{value}</p>
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
    </div>
  </div>
);

export default WeeklyWordPlanner;
