import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import { Loader2, Plus, X, Sparkles } from 'lucide-react';
import {
  validatePlan,
  canRemoveWord,
  canAddToSet,
  formatWeekRange,
  getWeekStart,
  getSetsForTime,
  MAX_WORDS_PER_SET,
  MAX_PHRASES_PER_SET,
} from '@/utils/planningEngine';

const GeneratedPlanView = ({ isFirstPlan = false, onStartWeek, onBack }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [planMeta, setPlanMeta] = useState(null);
  const [error, setError] = useState(null);
  const [adjusting, setAdjusting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customWordInput, setCustomWordInput] = useState({ setIndex: null, word: '', back: '' });
  const [numSets, setNumSets] = useState(1);

  const weekStart = getWeekStart();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let initialNumSets = 1;
      if (currentUser) {
        const { data } = await supabase
          .from('profiles')
          .select('daily_time_commitment')
          .eq('id', currentUser.id)
          .single();
        initialNumSets = getSetsForTime(data?.daily_time_commitment);
      }
      if (cancelled) return;
      setNumSets(initialNumSets);
      generatePlan(initialNumSets);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Distribute the autopilot's flat list of words across sets round-robin.
  const buildPlanFromAutopilot = (suggestions, theme, themeRationale, sets) => {
    const safeSets = Math.max(1, Math.min(3, sets || 1));
    const buckets = Array.from({ length: safeSets }, (_, i) => ({
      set_number: i + 1,
      words: [],
    }));

    (suggestions || []).slice(0, safeSets * MAX_WORDS_PER_SET).forEach((s, idx) => {
      const word = {
        word: s.word,
        back: s.pinyin || '',
        category: s.category || theme || 'Custom',
        stage_icon: '🌱',
        is_phrase: typeof s.word === 'string' && s.word.trim().split(/\s+/).length > 1,
        reason: s.reason || null,
        activity: s.activity || null,
      };
      buckets[idx % safeSets].words.push(word);
    });

    return { theme, theme_rationale: themeRationale, sets: buckets };
  };

  const generatePlan = async (sets = numSets) => {
    setLoading(true);
    setError(null);
    try {
      const response = await supabase.functions.invoke('generate-autopilot-suggestions', {
        body: { weekStart, numSets: sets },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      const { suggestions = [], theme = null, theme_rationale = null } = response.data || {};

      if (!suggestions.length) {
        throw new Error("Sprouttie couldn't generate suggestions just yet — try again in a moment.");
      }

      setPlan(buildPlanFromAutopilot(suggestions, theme, theme_rationale, sets));
      setPlanMeta({ setsPerDay: sets, isPreSpeech: false, weekStart, theme, theme_rationale });
    } catch (err) {
      console.error('Failed to generate plan:', err);
      setError(err.message || 'Failed to generate your plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeNumSets = (next) => {
    if (next === numSets) return;
    setNumSets(next);
    generatePlan(next);
  };

  const handleStartWeek = async () => {
    if (!plan?.sets) return;
    setSaving(true);

    try {
      // Create flashcards for each word in the plan
      const flashcardsToCreate = [];
      plan.sets.forEach((set) => {
        set.words.forEach((word) => {
          flashcardsToCreate.push({
            user_id: currentUser.id,
            front: word.word,
            back: word.back || '',
            folder: word.category || 'default',
            card_type: word.is_phrase ? 'phrase' : 'word',
            card_status: 'active',
            set_number: set.set_number,
            date_introduced: weekStart,
          });
        });
      });

      // Insert flashcards (upsert-like: skip if front already exists for user)
      for (const card of flashcardsToCreate) {
        const { data: existing } = await supabase
          .from('flashcards')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('front', card.front)
          .maybeSingle();

        if (existing) {
          // Update set assignment
          await supabase
            .from('flashcards')
            .update({ set_number: card.set_number, card_status: 'active', date_introduced: card.date_introduced })
            .eq('id', existing.id);
        } else {
          await supabase.from('flashcards').insert(card);
        }
      }

      // Also add words to word_plans
      const wordPlans = [];
      plan.sets.forEach((set) => {
        set.words.forEach((word, idx) => {
          wordPlans.push({
            user_id: currentUser.id,
            word: word.word,
            pinyin: word.back || null,
            theme: word.category || null,
            planned_week_start: weekStart,
            display_order: (set.set_number - 1) * 5 + idx,
          });
        });
      });

      // Clear existing plans for this week first
      await supabase
        .from('word_plans')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('planned_week_start', weekStart);

      await supabase.from('word_plans').insert(wordPlans);

      toast.success('Your week is ready!');
      onStartWeek?.();
    } catch (err) {
      console.error('Failed to save plan:', err);
      toast.error('Failed to start week. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveWord = (setIndex, wordIndex) => {
    const word = plan.sets[setIndex].words[wordIndex];
    if (!canRemoveWord(word)) {
      toast.info('This word is mid-cycle and needs to continue.');
      return;
    }

    const updated = { ...plan };
    updated.sets[setIndex].words.splice(wordIndex, 1);
    setPlan({ ...updated });
    toast.success('Plan updated.');
  };

  const handleAddCustomWord = (setIndex) => {
    const set = plan.sets[setIndex];
    if (!canAddToSet(set)) {
      toast.info(`Maximum ${MAX_WORDS_PER_SET} words per set.`);
      return;
    }

    if (!customWordInput.word.trim()) return;

    // Check phrase limit
    const existingPhrases = set.words.filter(w => w.is_phrase).length;
    const isPhrase = customWordInput.word.trim().split(/\s+/).length > 1;
    if (isPhrase && existingPhrases >= MAX_PHRASES_PER_SET) {
      toast.info('Maximum 1 phrase per set.');
      return;
    }

    const updated = { ...plan };
    updated.sets[setIndex].words.push({
      word: customWordInput.word.trim(),
      back: customWordInput.back.trim() || '',
      category: 'Custom',
      stage_icon: '🌱',
      is_phrase: isPhrase,
      reason: 'custom',
    });
    setPlan({ ...updated });
    setCustomWordInput({ setIndex: null, word: '', back: '' });
    toast.success('Plan updated.');
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Loader2 className="w-10 h-10 animate-spin text-[hsl(var(--sprouttie-green))] mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold text-[hsl(var(--foreground))] mb-2">
            {isFirstPlan ? 'Building your first themed week…' : 'Reading the room…'}
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Sprouttie is checking your logs, interests and what worked last week.
          </p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-[hsl(var(--destructive))] mb-4">{error}</p>
          <button
            onClick={() => generatePlan()}
            className="px-6 py-3 bg-[hsl(var(--sprouttie-green))] text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!plan?.sets) return null;

  const validation = validatePlan(plan, planMeta?.setsPerDay || 1);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Week header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-sm text-[hsl(var(--sprouttie-green))] font-medium mb-1 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Sprouttie's pick for this week
        </p>
        <h1 className="text-2xl font-display font-bold text-[hsl(var(--foreground))]">
          Week of {formatWeekRange(planMeta?.weekStart || weekStart)}
        </h1>
      </motion.div>

      {/* Theme banner */}
      {plan.theme && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-emerald-50 to-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5"
        >
          <p className="text-xs uppercase tracking-wide text-[hsl(var(--sprouttie-green))] font-semibold mb-1">
            This week's theme
          </p>
          <h2 className="text-lg font-display font-bold text-[hsl(var(--foreground))] mb-1.5">
            {plan.theme}
          </h2>
          {plan.theme_rationale && (
            <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
              {plan.theme_rationale}
            </p>
          )}
        </motion.div>
      )}

      {/* Sets-per-day toggle */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs text-[hsl(var(--muted-foreground))]">Sets this week:</span>
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            onClick={() => handleChangeNumSets(n)}
            disabled={loading}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
              numSets === n
                ? 'bg-[hsl(var(--sprouttie-green))] text-white border-[hsl(var(--sprouttie-green))]'
                : 'bg-transparent text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'
            } disabled:opacity-50`}
          >
            {n} × 5
          </button>
        ))}
      </div>

      {/* Set cards */}
      {plan.sets.map((set, setIndex) => (
        <motion.div
          key={set.set_number}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + setIndex * 0.1 }}
          className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl overflow-hidden"
        >
          <div className="px-5 py-3 border-b border-[hsl(var(--border))] flex items-center justify-between">
            <h3 className="font-semibold text-[hsl(var(--foreground))]">Set {set.set_number}</h3>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {set.words.length}/{MAX_WORDS_PER_SET}
            </span>
          </div>

          <div className="divide-y divide-[hsl(var(--border))]">
            {set.words.map((word, wordIndex) => (
              <div key={wordIndex} className="px-5 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-lg leading-none mt-0.5">{word.stage_icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[hsl(var(--foreground))] font-medium">{word.word}</span>
                        {word.back && (
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">{word.back}</span>
                        )}
                        {word.is_phrase && (
                          <span className="text-[10px] bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-1.5 py-0.5 rounded">
                            Phrase
                          </span>
                        )}
                      </div>
                      {word.reason && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 leading-relaxed">
                          {word.reason}
                        </p>
                      )}
                      {word.activity && (
                        <p className="text-xs text-[hsl(var(--sprouttie-green))] mt-1.5 leading-relaxed">
                          💡 {word.activity}
                        </p>
                      )}
                    </div>
                  </div>
                  {adjusting && (
                    <button
                      onClick={() => handleRemoveWord(setIndex, wordIndex)}
                      className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors mt-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {adjusting && canAddToSet(set) && (
            <div className="px-5 py-3 border-t border-[hsl(var(--border))]">
              {customWordInput.setIndex === setIndex ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Word"
                    value={customWordInput.word}
                    onChange={(e) => setCustomWordInput({ ...customWordInput, word: e.target.value })}
                    className="flex-1 px-3 py-1.5 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-1 focus:ring-[hsl(var(--sprouttie-green))]"
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Meaning"
                    value={customWordInput.back}
                    onChange={(e) => setCustomWordInput({ ...customWordInput, back: e.target.value })}
                    className="flex-1 px-3 py-1.5 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-1 focus:ring-[hsl(var(--sprouttie-green))]"
                  />
                  <button
                    onClick={() => handleAddCustomWord(setIndex)}
                    className="px-3 py-1.5 bg-[hsl(var(--sprouttie-green))] text-white rounded-lg text-sm"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCustomWordInput({ setIndex, word: '', back: '' })}
                  className="flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add custom word
                </button>
              )}
            </div>
          )}
        </motion.div>
      ))}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="space-y-3 pt-2"
      >
        <button
          onClick={handleStartWeek}
          disabled={saving || !validation.valid}
          className="w-full py-3.5 bg-gradient-to-r from-[hsl(var(--sprouttie-green))] to-[hsl(var(--sprouttie-green-dark))] text-white rounded-xl font-semibold text-base shadow-md hover:shadow-lg transition-all disabled:opacity-50"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Setting up…
            </span>
          ) : (
            'Start This Week'
          )}
        </button>

        <button
          onClick={() => generatePlan()}
          className="w-full py-2.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Regenerate
        </button>

        <button
          onClick={() => setAdjusting(!adjusting)}
          className="w-full py-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          {adjusting ? 'Done Adjusting' : 'Adjust Plan'}
        </button>

        {onBack && (
          <button
            onClick={onBack}
            className="w-full py-2 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            ← Back
          </button>
        )}
      </motion.div>
    </div>
  );
};

export default GeneratedPlanView;
