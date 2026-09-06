import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import WeeklyOutcomeReview from './WeeklyOutcomeReview';
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
  Library,
} from 'lucide-react';

const MAX_ACTIVATION_WORDS = 5;

const LOADING_STEPS = [
  "Reading your child's profile…",
  "Analysing their spoken words…",
  "Finding vocabulary patterns…",
  "Picking this week's theme…",
  "Writing the rationale…",
  "Almost ready…",
];

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
  const [dismissingId, setDismissingId] = useState(null); // suggestion currently showing reason picker
  const [wordRatings, setWordRatings] = useState({}); // { [lowercaseWord]: { id, outcome } } for current week
  const [ratingWord, setRatingWord] = useState(null); // word currently being saved
  const [addingToFlashcards, setAddingToFlashcards] = useState(null); // wp.id being added to deck
  const [loadingStep, setLoadingStep] = useState(0);

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

  const isPastWeek = () => {
    const today = getWeekStart(new Date());
    return formatDate(currentWeekStart) < formatDate(today);
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

  // Load this-week ratings (mid-week feedback) from weekly_suggestions
  const loadWordRatings = useCallback(async () => {
    if (!currentUser) return;
    const { data } = await supabase
      .from('weekly_suggestions')
      .select('id, word, outcome')
      .eq('user_id', currentUser.id)
      .eq('week_start', formatDate(currentWeekStart));
    const map = {};
    (data || []).forEach((r) => {
      map[r.word.toLowerCase()] = { id: r.id, outcome: r.outcome };
    });
    setWordRatings(map);
  }, [currentUser, currentWeekStart]);

  // Rate a backlog word mid-week — upserts a weekly_suggestions row so the
  // autopilot's outcome signals include this feedback.
  const rateWord = async (wp, outcome) => {
    if (!currentUser) return;
    const key = wp.word.toLowerCase();
    setRatingWord(key);
    try {
      const existing = wordRatings[key];
      if (existing?.id) {
        await supabase
          .from('weekly_suggestions')
          .update({ outcome, outcome_noted_at: new Date().toISOString() })
          .eq('id', existing.id);
        setWordRatings((prev) => ({ ...prev, [key]: { id: existing.id, outcome } }));
      } else {
        const { data, error } = await supabase
          .from('weekly_suggestions')
          .insert({
            user_id: currentUser.id,
            week_start: formatDate(currentWeekStart),
            word: wp.word,
            category: wp.theme || null,
            status: 'accepted',
            outcome,
            outcome_noted_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        if (error) throw error;
        setWordRatings((prev) => ({ ...prev, [key]: { id: data.id, outcome } }));
      }
    } catch (err) {
      console.error('Failed to rate word:', err);
      toast.error('Could not save rating');
    } finally {
      setRatingWord(null);
    }
  };

  useEffect(() => {
    loadWordPlans();
    loadTrackingData();
    loadPendingSuggestions();
    loadWordRatings();
  }, [loadWordPlans, loadTrackingData, loadPendingSuggestions, loadWordRatings]);

  useEffect(() => {
    if (!generatingSuggestions) {
      setLoadingStep(0);
      return;
    }
    const timer = setInterval(() => {
      setLoadingStep(prev => Math.min(prev + 1, LOADING_STEPS.length - 1));
    }, 3200);
    return () => clearInterval(timer);
  }, [generatingSuggestions]);

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

  // Looks up English + pinyin for words we are about to save. weekly_suggestions
  // only stores the word itself, so without this the accepted cards land with an
  // empty English side and no pinyin, and the parent has to fill 25 of them in by
  // hand — exactly the admin the planner is supposed to remove.
  // Chunked rather than fired all at once so a 25-word accept doesn't trip the
  // translate-word rate limit. A failed lookup degrades to blank, never blocks.
  const translateWords = async (words) => {
    const out = {};
    const CHUNK = 5;
    for (let i = 0; i < words.length; i += CHUNK) {
      const batch = words.slice(i, i + CHUNK);
      const results = await Promise.all(batch.map(async (w) => {
        try {
          const { data, error } = await supabase.functions.invoke('translate-word', { body: { word: w } });
          if (error) throw error;
          return [w, { english: data?.english || '', pinyin: data?.pinyin || '' }];
        } catch (err) {
          console.warn('translate-word failed for', w, err);
          return [w, { english: '', pinyin: '' }];
        }
      }));
      results.forEach(([w, v]) => { out[w] = v; });
    }
    return out;
  };

  const handleAcceptAll = async () => {
    if (!currentUser || pendingSuggestions.length === 0) return;
    setAcceptingAll(true);
    try {
      const ids = pendingSuggestions.map(s => s.id);
      await supabase.from('weekly_suggestions').update({ status: 'accepted' }).in('id', ids);

      // Batched: the old version issued two sequential round trips per word, so a
      // 5-set accept meant 50 of them back to back while the parent waited.
      const newForBacklog = pendingSuggestions.filter(
        s => !wordPlans.some(wp => wp.word.toLowerCase() === s.word.toLowerCase())
      );
      const newForCards = pendingSuggestions.filter(
        s => !userFlashcards.some(f => f.front?.toLowerCase() === s.word.toLowerCase())
      );

      const translations = await translateWords([
        ...new Set([...newForBacklog, ...newForCards].map(s => s.word)),
      ]);

      if (newForBacklog.length > 0) {
        await supabase.from('word_plans').insert(
          newForBacklog.map((s, i) => ({
            user_id: currentUser.id,
            word: s.word,
            pinyin: translations[s.word]?.pinyin || null,
            theme: s.category || null,
            planned_week_start: formatDate(currentWeekStart),
            display_order: wordPlans.length + i,
          }))
        );
      }

      if (newForCards.length > 0) {
        await supabase.from('flashcards').insert(
          newForCards.map(s => ({
            user_id: currentUser.id,
            front: s.word,
            back: translations[s.word]?.english || '',
            pinyin: translations[s.word]?.pinyin || null,
            folder: s.category || 'default',
            card_type: 'word',
            card_status: 'waiting',
          }))
        );
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

  const handleDismissAll = async (reason = null) => {
    if (!currentUser || pendingSuggestions.length === 0) return;
    const ids = pendingSuggestions.map(s => s.id);
    await supabase.from('weekly_suggestions')
      .update({ status: 'dismissed', dismissal_reason: reason })
      .in('id', ids);
    setPendingSuggestions([]);
    toast.success(reason ? 'Got it. Sprouttie will learn from this.' : 'Suggestions dismissed.');
  };

  const handleDismissOne = async (id, reason) => {
    if (!currentUser) return;
    await supabase.from('weekly_suggestions')
      .update({ status: 'dismissed', dismissal_reason: reason })
      .eq('id', id);
    setPendingSuggestions(prev => prev.filter(s => s.id !== id));
    setDismissingId(null);
    toast.success('Sprouttie will remember that.');
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

  const handleAddToFlashcards = async (wp) => {
    setAddingToFlashcards(wp.id);
    try {
      // `back` is the English meaning (FlashcardContext maps english -> back), so
      // the old `back: wp.pinyin` filed pinyin into the English field. Look up the
      // real meaning, and keep the pinyin we already have on the word plan.
      const looked = (await translateWords([wp.word]))[wp.word] || {};
      const english = looked.english || '';
      const pinyin = wp.pinyin || looked.pinyin || null;

      const { error } = await supabase.from('flashcards').insert({
        user_id: currentUser.id,
        front: wp.word,
        back: english,
        pinyin,
        folder: wp.theme || 'default',
        card_type: 'word',
        card_status: 'waiting',
      });
      if (error) throw error;
      setUserFlashcards(prev => [...prev, { front: wp.word, back: english, pinyin, folder: wp.theme || 'default' }]);
      toast.success(`"${wp.word}" added to flashcard deck`);
    } catch (err) {
      console.error('Error adding to flashcards:', err);
      toast.error('Failed to add to flashcard deck');
    } finally {
      setAddingToFlashcards(null);
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

  // AI Suggestions — calls the autopilot, which writes a themed week of
  // suggestions into weekly_suggestions for review.
  const generateSuggestions = async (numSets = 1) => {
    setGeneratingSuggestions(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to use suggestions');
        return;
      }

      const response = await supabase.functions.invoke('generate-autopilot-suggestions', {
        body: { weekStart: formatDate(currentWeekStart), numSets },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      const count = response.data?.count || 0;
      if (count === 0) {
        toast.info('No new suggestions at the moment.');
      } else {
        toast.success(`Sprouttie planned ${count} word${count === 1 ? '' : 's'} for this week 🌿`);
      }

      await loadPendingSuggestions();
      setShowSuggestions(false);
      setAiSuggestions([]);
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
        <h1 className="text-2xl font-display font-bold text-[hsl(var(--foreground))] flex items-center justify-center gap-2">
          Weekly Word Planner
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 align-middle">
            Beta
          </span>
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          Plan your flashcard words by theme and week
        </p>
      </motion.div>

      {/* Action buttons row */}
      {!isPastWeek() && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Word
          </button>
        </div>
      )}

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

      {/* Past week read-only notice */}
      {isPastWeek() && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[hsl(var(--muted))] rounded-xl text-xs text-[hsl(var(--muted-foreground))]">
          <span>🔒</span>
          <span>Past week · read only. Navigate to the current week to add or plan words.</span>
        </div>
      )}

      {/* Outcome review for last week's accepted words (feedback loop) */}
      <WeeklyOutcomeReview currentWeekStart={currentWeekStart} />

      {/* Empty-state CTA: Generate themed week with Sprouttie */}
      {pendingSuggestions.length === 0 && !generatingSuggestions && !isPastWeek() && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-emerald-50 to-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5"
        >
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl">🌿</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-[hsl(var(--foreground))] text-base">
                Plan this week with Sprouttie
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 leading-relaxed">
                Sprouttie reads your recent logs, your child's interests, and what worked last week, then proposes one themed set of words.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 5].map((n) => (
              <button
                key={n}
                onClick={() => generateSuggestions(n)}
                disabled={generatingSuggestions}
                className="flex-1 min-w-[90px] py-2.5 px-3 bg-[hsl(var(--sprouttie-green))] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex flex-col items-center justify-center gap-0.5"
              >
                <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" />{n} set{n > 1 ? 's' : ''}</span>
                <span className="text-[10px] opacity-80">~{n * 5} words</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Loading state for autopilot generation */}
      {generatingSuggestions && pendingSuggestions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6"
        >
          <div className="text-center mb-4">
            <span className="text-3xl">🌿</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-[hsl(var(--muted))] rounded-full h-1 mb-4 overflow-hidden">
            <motion.div
              className="h-full bg-[hsl(var(--sprouttie-green))] rounded-full"
              animate={{ width: `${Math.round(((loadingStep + 1) / LOADING_STEPS.length) * 92)}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          {/* Step dots */}
          <div className="flex justify-center gap-1.5 mb-3">
            {LOADING_STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                  i <= loadingStep
                    ? 'bg-[hsl(var(--sprouttie-green))]'
                    : 'bg-[hsl(var(--muted))]'
                }`}
              />
            ))}
          </div>
          {/* Animated message */}
          <AnimatePresence mode="wait">
            <motion.p
              key={loadingStep}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="text-sm text-center text-[hsl(var(--muted-foreground))]"
            >
              {LOADING_STEPS[loadingStep]}
            </motion.p>
          </AnimatePresence>
        </motion.div>
      )}

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
              {pendingSuggestions[0]?.theme ? (
                <p className="text-xs text-emerald-700 mt-0.5">
                  Theme: <strong>{pendingSuggestions[0].theme}</strong> · Tap to swap any word
                </p>
              ) : (
                <p className="text-xs text-emerald-700 mt-0.5">Auto-generated · Tap to swap any word</p>
              )}
            </div>
            <div className="divide-y divide-[hsl(var(--border))]">
              {(() => {
                // Sort: set-assigned first (ascending), then unassigned
                const sorted = [...pendingSuggestions].sort((a, b) => {
                  if (a.set_number == null && b.set_number == null) return 0;
                  if (a.set_number == null) return 1;
                  if (b.set_number == null) return -1;
                  return a.set_number - b.set_number;
                });
                let lastSetNumber = undefined;
                return sorted.map((s) => {
                  const showSetHeader = s.set_number != null && s.set_number !== lastSetNumber;
                  lastSetNumber = s.set_number;
                  return (
                    <React.Fragment key={s.id}>
                      {showSetHeader && (
                        <div className="px-5 py-1.5 bg-blue-50 border-b border-[hsl(var(--border))]">
                          <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">
                            → Set {s.set_number}
                          </span>
                        </div>
                      )}
                      <div className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-[hsl(var(--foreground))]">{s.word}</span>
                        {s.category && (
                          <span className="text-xs bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-2 py-0.5 rounded-full">
                            {s.category}
                          </span>
                        )}
                        {s.tier && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-normal ${
                            s.tier === 'reinforce'
                              ? 'bg-green-100 text-green-700'
                              : s.tier === 'bridge'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}>
                            {s.tier}
                          </span>
                        )}
                      </div>
                      {s.reason && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 leading-relaxed italic">
                          {s.reason}
                        </p>
                      )}
                      {s.activity_tip && (
                        <p className="text-xs text-[hsl(var(--foreground))] mt-1 leading-relaxed">
                          💡 {s.activity_tip}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1">
                      <button
                        onClick={() => {
                          const opening = swappingWordId !== s.id;
                          setSwappingWordId(opening ? s.id : null);
                          setDismissingId(null);
                          if (opening) fetchSwapAlternatives(s.id, s.word, s.category);
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                      >
                        Swap
                      </button>
                      <button
                        onClick={() => {
                          setDismissingId(dismissingId === s.id ? null : s.id);
                          setSwappingWordId(null);
                        }}
                        title="Dismiss this suggestion"
                        className="p-1.5 rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
                  {/* Dismiss reason picker */}
                  <AnimatePresence>
                    {dismissingId === s.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 pt-2 border-t border-dashed border-[hsl(var(--border))]">
                          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">
                            Why dismiss? (Sprouttie will learn from this)
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: 'Too easy', value: 'too easy, already knows similar' },
                              { label: 'Already says it', value: 'already says it' },
                              { label: 'Not relevant', value: 'not relevant to our routine' },
                              { label: 'Too hard', value: 'too hard for now' },
                              { label: 'Other', value: 'other' },
                            ].map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => handleDismissOne(s.id, opt.value)}
                                className="text-xs px-2.5 py-1 rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] transition-colors"
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                    </React.Fragment>
                  );
                });
              })()}
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
                onClick={() => handleDismissAll('dismissed all, planning manually')}
                className="w-full text-center text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors py-1"
              >
                Dismiss all, I'll plan manually
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
              This Week's Words ({wordPlans.length})
            </h2>
          </div>
        )}
        <AnimatePresence>
          {wordPlans.map((wp, index) => {
            const stage = getWordStage(wp.word);
            const isExpanded = expandedWordId === wp.id;
            const inDeck = userFlashcards.some(f => f.front?.toLowerCase() === wp.word.toLowerCase());
            const isAddingCard = addingToFlashcards === wp.id;

            return (
              <motion.div
                key={wp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl overflow-hidden"
              >
                <div className="px-5 py-4 flex items-start gap-3">
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
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
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
                      {inDeck ? (
                        <span
                          className="text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 leading-none"
                          title="In your flashcard deck"
                        >
                          <Library className="w-2.5 h-2.5" />
                          In deck
                        </span>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAddToFlashcards(wp); }}
                          disabled={isAddingCard}
                          title="Add to flashcard deck"
                          className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 border border-[hsl(var(--border))] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 leading-none transition-colors disabled:opacity-50"
                        >
                          {isAddingCard ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            <Plus className="w-2.5 h-2.5" />
                          )}
                          {isAddingCard ? 'Adding…' : 'Add card'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 pt-0.5">
                    {/* Mid-week reaction ratings */}
                    {(() => {
                      const key = wp.word.toLowerCase();
                      const rating = wordRatings[key];
                      const isRating = ratingWord === key;
                      return (
                        <>
                          <span className="text-[10px] text-[hsl(var(--muted-foreground))] leading-none">How did it go?</span>
                          <div className="flex items-center gap-0.5">
                            {['responded', 'partial', 'no_response'].map((outcome) => {
                              const emoji = outcome === 'responded' ? '👍' : outcome === 'partial' ? '🤔' : '👎';
                              const active = rating?.outcome === outcome;
                              return (
                                <button
                                  key={outcome}
                                  disabled={isRating}
                                  onClick={(e) => { e.stopPropagation(); rateWord(wp, outcome); }}
                                  className={`text-xs px-1.5 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                                    active
                                      ? 'bg-[hsl(var(--sprouttie-green-light))] text-[hsl(var(--sprouttie-green-dark))] border border-[hsl(var(--sprouttie-green))]'
                                      : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'
                                  }`}
                                  title={outcome === 'responded' ? 'They responded' : outcome === 'partial' ? 'Some interest' : 'No response'}
                                >
                                  {isRating && rating?.outcome !== outcome ? '' : emoji}
                                </button>
                              );
                            })}
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
                        </>
                      );
                    })()}
                  </div>
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
            Pick 5–10 words to focus on this week. Sprouttie will suggest words based on your child's progress and interests.
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
