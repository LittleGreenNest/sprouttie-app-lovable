/**
 * useWordPlannerData — fetches and transforms data for the Word Planner page.
 * Sources: flashcards, spoken_words, daily_tracking, word_plans, profiles
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getWeekStart } from '@/utils/planningEngine';

/* ─── date helpers ─── */
const mondayOf = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d.toISOString().split('T')[0];
};

const addDays = (dateStr, n) => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

const formatDateRange = (start) => {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(start + 'T00:00:00');
  e.setDate(e.getDate() + 6);
  const opts = { day: 'numeric', month: 'short' };
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}`;
};

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/* ─── session counting ─── */
const countSessionsForDate = (tracking, date) => {
  const entries = tracking.filter(t => (t.user_local_date || t.date) === date && t.status === 'flashed');
  const rounds = new Set();
  entries.forEach(t => {
    if (t.notes) {
      try {
        const p = JSON.parse(t.notes);
        if (p.round) rounds.add(p.round);
      } catch { /* not JSON or no round field */ }
    }
  });
  // If there are entries but no round metadata, count as 1 session
  return rounds.size || (entries.length > 0 ? 1 : 0);
};

/* ─── stage helpers ─── */
const stageEmoji = (days, isCarried) => {
  if (days >= 5) return '🌳';
  if (isCarried || days >= 3) return '🌿';
  return '🌱';
};

const stageMeta = (days) => {
  if (days >= 5) return 'Completed 5 days · graduated';
  if (days === 4) return "Almost done — graduates after tomorrow's flash";
  if (days === 0) return 'Just entered — 5 days to go';
  const rem = 5 - days;
  return `Needs ${rem} more day${rem > 1 ? 's' : ''}`;
};

/* ─── main hook ─── */
export const useWordPlannerData = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const thisWeekStart = getWeekStart();
      const lastWeekStart = addDays(thisWeekStart, -7);

      // parallel fetches
      const [fcRes, swRes, dtRes, wpRes, prRes] = await Promise.all([
        supabase.from('flashcards').select('*').eq('user_id', user.id),
        supabase.from('spoken_words').select('*').eq('user_id', user.id),
        supabase.from('daily_tracking').select('*').eq('user_id', user.id).gte('date', lastWeekStart),
        supabase.from('word_plans').select('*').eq('user_id', user.id).gte('planned_week_start', lastWeekStart),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
      ]);

      const flashcards = fcRes.data || [];
      const spokenWords = swRes.data || [];
      const tracking = dtRes.data || [];
      const plans = wpRes.data || [];
      const profile = prRes.data;

      const thisWeekTracking = tracking.filter(t => (t.user_local_date || t.date) >= thisWeekStart);
      const lastWeekTracking = tracking.filter(t => {
        const d = t.user_local_date || t.date;
        return d >= lastWeekStart && d < thisWeekStart;
      });

      /* ─── This Week's Sets ─── */
      const activeSets = [1, 2, 3].map(setNum => {
        const setCards = flashcards
          .filter(c => c.set_number === setNum && c.card_status === 'active' && !c.date_retired)
          .sort((a, b) => (a.date_introduced || a.created_at || '').localeCompare(b.date_introduced || b.created_at || ''));

        const active = setCards.map(c => {
          const days = c.active_day_count ?? 0;
          const isCarried = c.date_introduced && c.date_introduced < thisWeekStart;
          return {
            id: c.id,
            word: c.front || c.back,
            emoji: stageEmoji(days, isCarried),
            meta: stageMeta(days),
            day: Math.min(days, 5),
            phrase: c.card_type === 'phrase',
            folder: c.folder,
          };
        });

        // Queued: waiting cards in this set
        const queued = flashcards
          .filter(c => c.set_number === setNum && c.card_status === 'waiting')
          .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
          .slice(0, 3)
          .map((c, i) => ({
            rank: i + 1,
            word: c.front || c.back,
            tags: [
              ...(i === 0 ? ['Next to enter'] : []),
              ...(c.folder && c.folder !== 'default' ? [c.folder] : []),
            ],
            ai: '', // AI rationale populated by generate-weekly-plan edge fn
          }));

        // Relevant spoken words — words the child says that relate to queued/active categories
        const setFolders = new Set([
          ...active.map(w => w.folder),
          ...queued.map(w => w.tags?.find(t => t !== 'Next to enter')),
        ].filter(Boolean));

        const relevantSpoken = spokenWords
          .filter(sw => sw.word_stage !== 'owned')
          .slice(0, 3);

        return {
          name: `Set ${setNum}`,
          setNumber: setNum,
          activeCount: active.length,
          queuedCount: queued.length,
          active,
          queued,
          relevantSpoken,
        };
      });

      /* ─── Last Week Check-in ─── */
      const checkinDays = DAY_LABELS.map((label, i) => ({
        label,
        sessions: countSessionsForDate(lastWeekTracking, addDays(lastWeekStart, i)),
      }));
      const fullDays = checkinDays.filter(d => d.sessions >= 3).length;

      /* ─── Last Week's Words ─── */
      const lastWeekSets = [1, 2, 3].map(setNum => {
        const graduated = flashcards.filter(c =>
          c.set_number === setNum &&
          c.date_retired &&
          c.date_retired >= lastWeekStart &&
          c.date_retired < thisWeekStart
        );

        const introduced = flashcards.filter(c =>
          c.set_number === setNum &&
          c.card_status === 'active' &&
          c.date_introduced &&
          c.date_introduced >= lastWeekStart &&
          c.date_introduced < thisWeekStart
        );

        const carried = flashcards.filter(c =>
          c.set_number === setNum &&
          c.card_status === 'active' &&
          c.date_introduced &&
          c.date_introduced < lastWeekStart &&
          !c.date_retired
        );

        const words = [
          ...introduced.map(c => ({
            word: c.front || c.back,
            emoji: '🌱',
            meta: `Introduced · Day ${Math.min(c.active_day_count ?? 0, 5)} of 5`,
            day: Math.min(c.active_day_count ?? 0, 5),
            phrase: c.card_type === 'phrase',
          })),
          ...carried.map(c => ({
            word: c.front || c.back,
            emoji: '🌿',
            meta: `Carried from prior week · Day ${Math.min(c.active_day_count ?? 0, 5)} of 5`,
            day: Math.min(c.active_day_count ?? 0, 5),
            phrase: c.card_type === 'phrase',
          })),
        ];

        const grad = graduated[0];
        return {
          name: `Set ${setNum}`,
          wordCount: words.length + (grad ? 1 : 0),
          graduated: grad ? { word: grad.front || grad.back, emoji: '🌳' } : null,
          gradChip: grad ? `✓ ${grad.front || grad.back} graduated` : null,
          words,
        };
      });

      /* ─── Today ─── */
      const today = new Date().toISOString().split('T')[0];
      const todaySessions = countSessionsForDate(thisWeekTracking, today);
      const now = new Date();
      const dayOfWeekIdx = now.getDay();
      const dayInWeek = dayOfWeekIdx === 0 ? 7 : dayOfWeekIdx;
      const totalActive = activeSets.reduce((s, set) => s + set.activeCount, 0);
      const totalSets = activeSets.filter(s => s.activeCount > 0).length;

      setData({
        activeSets: activeSets.filter(s => s.activeCount > 0 || s.queuedCount > 0),
        lastWeekSets: lastWeekSets.filter(s => s.wordCount > 0),
        checkinDays,
        fullDays,
        todaySessions,
        dayInWeek,
        totalActive,
        totalSets,
        today: {
          label: now.toLocaleDateString('en-US', { weekday: 'short' }),
          dayMonth: `${now.toLocaleDateString('en-US', { weekday: 'short' })} ${now.getDate()} ${now.toLocaleDateString('en-US', { month: 'short' })}`,
        },
        profile,
        spokenWords,
        thisWeekRange: formatDateRange(thisWeekStart),
        lastWeekRange: formatDateRange(lastWeekStart),
        hasData: flashcards.length > 0,
      });
    } catch (err) {
      console.error('WordPlanner fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { loading, data, error, refetch: fetchData };
};
