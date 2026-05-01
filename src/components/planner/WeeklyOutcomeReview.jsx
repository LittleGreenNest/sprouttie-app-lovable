import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Surfaces accepted suggestions from prior weeks where the parent
 * hasn't yet rated whether the child responded to them.
 * Feeds into the autopilot's "what's working / not working" prompt.
 */
const WeeklyOutcomeReview = ({ currentWeekStart }) => {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    const weekStartStr = (() => {
      const y = currentWeekStart.getFullYear();
      const m = String(currentWeekStart.getMonth() + 1).padStart(2, '0');
      const d = String(currentWeekStart.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    })();

    const sixWeeksAgo = new Date(currentWeekStart);
    sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);
    const sixWeeksAgoStr = sixWeeksAgo.toISOString().split('T')[0];

    const { data } = await supabase
      .from('weekly_suggestions')
      .select('id, word, theme, week_start, outcome, status')
      .eq('user_id', currentUser.id)
      .eq('status', 'accepted')
      .lt('week_start', weekStartStr)
      .gte('week_start', sixWeeksAgoStr)
      .or('outcome.is.null,outcome.eq.pending')
      .order('week_start', { ascending: false })
      .limit(10);

    setItems(data || []);
    setLoading(false);
  }, [currentUser, currentWeekStart]);

  useEffect(() => { load(); }, [load]);

  const rate = async (id, outcome) => {
    setSavingId(id);
    await supabase
      .from('weekly_suggestions')
      .update({ outcome, outcome_noted_at: new Date().toISOString() })
      .eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
    setSavingId(null);
  };

  if (loading || items.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl overflow-hidden"
      >
        <div className="px-5 py-3 border-b border-[hsl(var(--border))] bg-amber-50">
          <div className="flex items-center gap-2">
            <span>🎯</span>
            <span className="font-semibold text-sm text-amber-900">
              How did last week's words go?
            </span>
          </div>
          <p className="text-xs text-amber-700 mt-0.5">
            One tap each. Sprouttie uses this to plan smarter.
          </p>
        </div>
        <div className="divide-y divide-[hsl(var(--border))]">
          {items.map((it) => (
            <div key={it.id} className="px-5 py-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <span className="font-medium text-[hsl(var(--foreground))]">{it.word}</span>
                  {it.theme && (
                    <span className="ml-2 text-xs text-[hsl(var(--muted-foreground))]">
                      · {it.theme}
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button
                    disabled={savingId === it.id}
                    onClick={() => rate(it.id, 'responded')}
                    className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  >
                    👍 Yes
                  </button>
                  <button
                    disabled={savingId === it.id}
                    onClick={() => rate(it.id, 'partial')}
                    className="text-xs px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50"
                  >
                    🤔 Some
                  </button>
                  <button
                    disabled={savingId === it.id}
                    onClick={() => rate(it.id, 'no_response')}
                    className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors disabled:opacity-50"
                  >
                    👎 No
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WeeklyOutcomeReview;
