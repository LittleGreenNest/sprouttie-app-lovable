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
} from 'lucide-react';

const MAX_ACTIVATION_WORDS = 5;

const PARENT_PROMPTS = {
  default: {
    ask: '这是什么？',
    tip: 'If child replies in English, gently model the Mandarin response.',
  },
};

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

  function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  const formatDate = (date) => date.toISOString().split('T')[0];

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

  // Load tracking & spoken words for summary
  const loadTrackingData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const startDate = formatDate(currentWeekStart);
      const endDate = new Date(currentWeekStart);
      endDate.setDate(endDate.getDate() + 6);

      const [trackingRes, spokenRes] = await Promise.all([
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
      ]);

      // Build round tracking per flashcard_id
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
    } catch (err) {
      console.error('Error loading tracking data:', err);
    }
  }, [currentUser, currentWeekStart]);

  useEffect(() => {
    loadWordPlans();
    loadTrackingData();
  }, [loadWordPlans, loadTrackingData]);

  // Get activation stage for a word
  const getWordStage = (wordText) => {
    const spoken = spokenWords.find(
      (sw) => sw.word.toLowerCase() === wordText.toLowerCase()
    );
    if (!spoken) return { icon: '🌱', label: 'New' };
    if (spoken.word_stage === 'owned') return { icon: '🌳', label: 'Owned' };
    if (spoken.word_stage === 'growing') return { icon: '🌿', label: 'Growing' };
    return { icon: '🌱', label: 'New' };
  };

  // Get round completion for a word (approximate: days flashed)
  const getWordRounds = (wordPlan) => {
    // Try to find matching flashcard by word text
    const daysFlashed = Object.entries(trackingData).reduce((count, [fcId, dates]) => {
      // We approximate: if the word was tracked at all this week, count rounds
      return count;
    }, 0);

    // For now, check if word has matching flashcard tracking
    // We'll use a simpler approach: check if any flashcard with matching word was tracked
    let roundCount = 0;
    // This is a simplified approach - in production you'd match by flashcard_id
    return { r1: roundCount >= 1, r2: roundCount >= 2, r3: roundCount >= 3 };
  };

  const allRoundsComplete = (wordPlan) => {
    const rounds = getWordRounds(wordPlan);
    return rounds.r1 && rounds.r2 && rounds.r3;
  };

  // Add word
  const handleAddWord = async () => {
    if (!newWord.word.trim()) {
      toast.error('Please enter a word');
      return;
    }

    if (wordPlans.length >= MAX_ACTIVATION_WORDS) {
      toast.info('Fewer words = stronger speaking activation.');
      return;
    }

    try {
      const { error } = await supabase.from('word_plans').insert({
        user_id: currentUser.id,
        word: newWord.word.trim(),
        pinyin: newWord.pinyin.trim() || null,
        theme: newWord.theme.trim() || null,
        planned_week_start: formatDate(currentWeekStart),
        planned_date: null,
        display_order: wordPlans.length,
      });

      if (error) throw error;
      toast.success('Word added to activation cycle');
      setNewWord({ word: '', pinyin: '', theme: '' });
      setShowAddForm(false);
      loadWordPlans();
    } catch (error) {
      console.error('Error adding word:', error);
      toast.error('Failed to add word');
    }
  };

  // Delete word
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

  // Navigate weeks
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

  // AI Suggestions
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

      // Auto-add suggestions up to limit
      const suggestions = response.data?.suggestions || [];
      const slotsAvailable = MAX_ACTIVATION_WORDS - wordPlans.length;
      const toAdd = suggestions.slice(0, slotsAvailable);

      for (const suggestion of toAdd) {
        await supabase.from('word_plans').insert({
          user_id: currentUser.id,
          word: suggestion.word,
          pinyin: suggestion.pinyin || null,
          theme: suggestion.theme || null,
          planned_week_start: formatDate(currentWeekStart),
          planned_date: null,
          display_order: wordPlans.length + toAdd.indexOf(suggestion),
        });
      }

      toast.success(`Added ${toAdd.length} activation words`);
      loadWordPlans();
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast.error(error.message || 'Failed to generate suggestions');
    } finally {
      setGeneratingSuggestions(false);
    }
  };

  // Summary stats
  const wordsActivated = wordPlans.filter((wp) => {
    const rounds = getWordRounds(wp);
    return rounds.r1 || rounds.r2 || rounds.r3;
  }).length;

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
          This Week's Speaking Activation
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          Choose up to 5 target words to activate speaking this week.
        </p>
      </motion.div>

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

      {/* Activation Goal Box */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5 space-y-4"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">🔹</span>
          <div className="flex-1">
            <h2 className="font-display font-semibold text-[hsl(var(--foreground))] text-lg">
              This Week's Goal
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
              Help your child reply in Mandarin using these words.
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[hsl(var(--muted-foreground))]">Target words</span>
            <span className="font-medium text-[hsl(var(--foreground))]">
              {wordPlans.length} / {MAX_ACTIVATION_WORDS}
            </span>
          </div>
          <div className="w-full h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[hsl(var(--sprouttie-green))] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(wordPlans.length / MAX_ACTIVATION_WORDS) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* CTA */}
        {wordPlans.length > 0 && (
          <button
            className="w-full py-3 bg-gradient-to-r from-[hsl(var(--sprouttie-green))] to-[hsl(var(--sprouttie-green-dark))] text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all"
          >
            Start Activation Rounds
          </button>
        )}
      </motion.div>

      {/* Word Cards */}
      <div className="space-y-3">
        <AnimatePresence>
          {wordPlans.map((wp, index) => {
            const stage = getWordStage(wp.word);
            const rounds = getWordRounds(wp);
            const isExpanded = expandedWordId === wp.id;
            const isComplete = rounds.r1 && rounds.r2 && rounds.r3;

            return (
              <motion.div
                key={wp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-[hsl(var(--card))] border rounded-2xl overflow-hidden transition-all ${
                  isComplete
                    ? 'border-[hsl(var(--sprouttie-green))] shadow-[0_0_12px_-3px_hsl(var(--sprouttie-green)/0.3)]'
                    : 'border-[hsl(var(--border))]'
                }`}
              >
                {/* Word header */}
                <button
                  onClick={() => setExpandedWordId(isExpanded ? null : wp.id)}
                  className="w-full px-5 py-4 flex items-center gap-3 text-left"
                >
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

                  {/* Round indicators */}
                  <div className="flex items-center gap-1.5 mr-1">
                    {[rounds.r1, rounds.r2, rounds.r3].map((done, i) => (
                      <div
                        key={i}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center text-[10px] font-bold transition-colors ${
                          done
                            ? 'bg-[hsl(var(--sprouttie-green))] border-[hsl(var(--sprouttie-green))] text-white'
                            : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
                        }`}
                      >
                        {done ? <Check className="w-3 h-3" /> : `R${i + 1}`}
                      </div>
                    ))}
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  )}
                </button>

                {/* Expanded: Behaviour prompt */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 space-y-3 border-t border-[hsl(var(--border))]">
                        <div className="pt-3">
                          <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">
                            Suggested Parent Prompt
                          </p>
                          <div className="bg-[hsl(var(--muted))] rounded-xl p-3 space-y-1.5">
                            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                              Ask: <span className="text-[hsl(var(--sprouttie-green-dark))]">{PARENT_PROMPTS.default.ask}</span>
                            </p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">
                              {PARENT_PROMPTS.default.tip}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWord(wp.id);
                          }}
                          className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
                        >
                          <X className="w-3 h-3" />
                          Remove from this cycle
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Limit message */}
        {wordPlans.length >= MAX_ACTIVATION_WORDS && !showAddForm && (
          <p className="text-center text-xs text-[hsl(var(--muted-foreground))] py-2">
            Fewer words = stronger speaking activation.
          </p>
        )}
      </div>

      {/* Add Word */}
      {wordPlans.length < MAX_ACTIVATION_WORDS && (
        <>
          {showAddForm ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5 space-y-3"
            >
              <h3 className="font-semibold text-sm text-[hsl(var(--foreground))]">
                Add to This Activation Cycle
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
                  placeholder="Theme (optional)"
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
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[hsl(var(--border))] rounded-2xl text-sm text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--sprouttie-green))] hover:text-[hsl(var(--sprouttie-green))] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Word
              </button>
              <button
                onClick={generateSuggestions}
                disabled={generatingSuggestions}
                className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[hsl(var(--border))] rounded-2xl text-sm text-[hsl(var(--muted-foreground))] hover:border-violet-400 hover:text-violet-500 transition-colors disabled:opacity-50"
              >
                {generatingSuggestions ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Suggest
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {wordPlans.length === 0 && !loading && !showAddForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8"
        >
          <p className="text-4xl mb-3">🌱</p>
          <h3 className="font-display font-semibold text-[hsl(var(--foreground))] mb-1">
            No activation words yet
          </h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
            Add up to 5 words to begin this week's speaking cycle.
          </p>
        </motion.div>
      )}

      {/* Weekly Summary Footer */}
      {wordPlans.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5"
        >
          <h3 className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-3">
            This Week's Activation Summary
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <SummaryItem label="Words Activated" value={wordsActivated} icon="🎯" />
            <SummaryItem label="Words Growing" value={wordsGrowing} icon="🌿" />
            <SummaryItem label="Words Owned" value={wordsOwned} icon="🌳" />
            <SummaryItem
              label="Words in Cycle"
              value={wordPlans.length}
              icon="🔄"
            />
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
