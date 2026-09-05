import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { getCurrentWeekStart } from '../thisweek/useThisWeek';

/**
 * The weekly review: one question, "did he say any of these?", asked about the
 * words that were actually flashed in the last seven days.
 *
 * This is the loop's feedback signal. Until now the app collected words but
 * never asked about them again, so every logged word stayed at stage "new"
 * forever and the planner had no way to tell a consolidated word from one said
 * once. Tapping a word here advances it one stage: new, then growing, then
 * owned.
 *
 * No schema change. Flashed words come from daily_tracking, stages live on
 * spoken_words, and completion is recorded as a weekly_logs row so the prompt
 * knows to stop asking.
 */

export const REVIEW_LOG_TYPE = 'review';
const WINDOW_DAYS = 7;

export const STAGES = ['new', 'growing', 'owned'];

export const nextStage = (stage) => {
  const i = STAGES.indexOf(stage);
  if (i === -1) return 'new';
  return STAGES[Math.min(i + 1, STAGES.length - 1)];
};

const normalise = (s) =>
  (s || '').toLowerCase().replace(/[.,!?;:'"()[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();

const hasCJK = (s) => /[㐀-䶿一-鿿]/.test(s || '');

/**
 * Finds the spoken_words row a card refers to, without crossing languages.
 *
 * A bilingual card carries both faces: front 起重机, back "Crane". Matching on
 * either face meant tapping the Chinese card advanced the English word "crane",
 * which he had said back in April. That is wrong twice over: it credits Chinese
 * progress to an English word, and it corrupts the language-balance signal the
 * planner depends on. The back is only consulted for a monolingual card, where
 * both faces are the same script anyway.
 */
const findSpoken = (byWord, card) => {
  const front = byWord.get(normalise(card.front));
  if (front) return front;
  const monolingual = hasCJK(card.front) === hasCJK(card.back || card.front);
  return monolingual ? byWord.get(normalise(card.back)) : undefined;
};

/**
 * daily_tracking.flashcard_id holds "<card uuid>:R<round>", plus sentinel rows
 * like "set-1-sentinel" that point at no card. Same parsing as the planner.
 */
const cardIdFrom = (value) => {
  if (!value) return null;
  const id = String(value).split(':')[0];
  if (!id || id.includes('sentinel')) return null;
  return id;
};

export const useWeeklyReview = () => {
  const { currentUser } = useAuth() || {};
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const weekStart = useMemo(() => getCurrentWeekStart(), []);

  const load = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError('');
    try {
      const since = new Date(Date.now() - WINDOW_DAYS * 86400000)
        .toISOString()
        .split('T')[0];

      const [trackRes, cardRes, spokenRes, logRes] = await Promise.all([
        supabase
          .from('daily_tracking')
          .select('flashcard_id, date, user_local_date')
          .eq('user_id', currentUser.id)
          .gte('date', since),
        supabase
          .from('flashcards')
          .select('id, front, back, folder, card_language')
          .eq('user_id', currentUser.id)
          .limit(1000),
        supabase
          .from('spoken_words')
          .select('id, word, word_stage')
          .eq('user_id', currentUser.id)
          .limit(2000),
        supabase
          .from('weekly_logs')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('week_start', weekStart)
          .eq('log_type', REVIEW_LOG_TYPE),
      ]);

      setDone((logRes.data || []).length > 0);

      const cards = new Map((cardRes.data || []).map((c) => [c.id, c]));

      // Most recently flashed first: that is the order a parent remembers in.
      const lastSeen = new Map();
      (trackRes.data || []).forEach((r) => {
        const id = cardIdFrom(r.flashcard_id);
        if (!id || !cards.has(id)) return;
        const d = r.user_local_date || r.date;
        const prev = lastSeen.get(id);
        if (!prev || d > prev) lastSeen.set(id, d);
      });

      const spoken = spokenRes.data || [];
      const byWord = new Map();
      spoken.forEach((s) => byWord.set(normalise(s.word), s));

      const rows = [...lastSeen.entries()]
        .sort((a, b) => (a[1] < b[1] ? 1 : -1))
        .map(([id, when]) => {
          const card = cards.get(id);
          const match = findSpoken(byWord, card);
          return {
            cardId: id,
            word: card.front,
            translation: card.back || '',
            folder: card.folder || '',
            lastFlashed: when,
            spokenId: match?.id || null,
            stage: match?.word_stage || null,
            tapped: false,
          };
        })
        // A word already at "owned" has nothing left to advance to.
        .filter((r) => r.stage !== 'owned');

      setItems(rows);
    } catch (e) {
      console.error('Weekly review load error:', e);
      setError('Could not load this week\'s words.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback((cardId) => {
    setItems((prev) =>
      prev.map((r) => (r.cardId === cardId ? { ...r, tapped: !r.tapped } : r))
    );
  }, []);

  /**
   * Writes the taps. A word already in spoken_words moves up one stage; a word
   * the parent has never logged is created at "new", because hearing it for the
   * first time is exactly what "new" means.
   */
  const submit = useCallback(async () => {
    if (!currentUser || saving) return { ok: false };
    setSaving(true);
    setError('');
    try {
      const tapped = items.filter((r) => r.tapped);
      const now = new Date().toISOString();

      const updates = tapped
        .filter((r) => r.spokenId)
        .map((r) =>
          supabase
            .from('spoken_words')
            .update({ word_stage: nextStage(r.stage), stage_updated_at: now })
            .eq('id', r.spokenId)
        );

      const inserts = tapped
        .filter((r) => !r.spokenId)
        .map((r) => ({
          user_id: currentUser.id,
          word: r.word,
          word_stage: 'new',
          started_saying_at: now,
          stage_updated_at: now,
        }));

      // The word stages are the point. Do them first and let a failure here
      // surface, because losing them loses the parent's actual answer.
      const results = await Promise.all([
        ...updates,
        inserts.length
          ? supabase.from('spoken_words').insert(inserts)
          : Promise.resolve({ error: null }),
      ]);

      const failed = results.find((r) => r?.error);
      if (failed?.error) throw failed.error;

      // Bookkeeping so the dashboard prompt stops asking. Deliberately not
      // fatal: until the 20260829 migration is applied, weekly_logs.log_type
      // still rejects anything outside ('said','attempted','read'), and the
      // parent's answers should not be thrown away over a nudge that will
      // simply show once more.
      const { error: logError } = await supabase.from('weekly_logs').insert({
        user_id: currentUser.id,
        week_start: weekStart,
        log_type: REVIEW_LOG_TYPE,
        content: `${tapped.length} of ${items.length} words said`,
      });
      if (logError) {
        console.warn('Weekly review saved, but the log row was rejected:', logError.message);
      }

      setDone(true);
      return { ok: true, count: tapped.length };
    } catch (e) {
      console.error('Weekly review submit error:', e);
      setError('Could not save. Please try again.');
      return { ok: false };
    } finally {
      setSaving(false);
    }
  }, [currentUser, items, saving, weekStart]);

  const tappedCount = items.filter((r) => r.tapped).length;

  return {
    loading,
    saving,
    error,
    items,
    done,
    tappedCount,
    toggle,
    submit,
    reload: load,
  };
};
