import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cardIdFrom } from '@/utils/cardId';
import { isReviewDay, localWeekStart, toLocalDateString } from '@/utils/week';
import { useAuth } from '../../context/AuthContext';
import { useFlashcards } from '../../context/FlashcardContext';
import { REVIEW_LOG_TYPE } from '../review/useWeeklyReview';
import { acceptWeek } from './acceptWeek';

/**
 * Which state this week is in, for the one weekly card on Home and /this-week.
 *
 *   notice  Saturday or Sunday, cards were flashed in the last 7 days, and the
 *           week has not been reviewed yet. `forceReview` skips the day check,
 *           for old /weekly-review links.
 *   doing   this week's words have been accepted.
 *   plan    everything else. If nothing has been suggested for the week at
 *           all, words are requested once per session so the parent never
 *           meets a blank card.
 */
export const useWeekState = ({ forceReview = false } = {}) => {
  const { currentUser } = useAuth() || {};
  const { refreshFlashcards } = useFlashcards() || {};
  const uid = currentUser?.id;
  const weekStart = useMemo(() => localWeekStart(), []);

  const [rows, setRows] = useState([]);
  const [practisedDays, setPractisedDays] = useState(0);
  const [flashedRecently, setFlashedRecently] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [alternatives, setAlternatives] = useState({});
  const [loadingAlternatives, setLoadingAlternatives] = useState(null);

  const generatingRef = useRef(false);
  const acceptingRef = useRef(false);
  const autoTried = useRef(false);

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const since = new Date();
      since.setDate(since.getDate() - 6);
      const sinceStr = toLocalDateString(since);

      const [sugRes, trackRes, logRes] = await Promise.all([
        supabase
          .from('weekly_suggestions')
          .select('*')
          .eq('user_id', uid)
          .eq('week_start', weekStart)
          .order('created_at', { ascending: true }),
        supabase
          .from('daily_tracking')
          .select('flashcard_id, date, user_local_date')
          .eq('user_id', uid)
          .eq('status', 'flashed')
          .gte('date', sinceStr),
        supabase
          .from('weekly_logs')
          .select('id')
          .eq('user_id', uid)
          .eq('week_start', weekStart)
          .eq('log_type', REVIEW_LOG_TYPE)
          .limit(1),
      ]);

      setRows(sugRes.data || []);

      const days = new Set();
      let flashed = false;
      (trackRes.data || []).forEach((r) => {
        const d = r.user_local_date || r.date;
        if (d >= sinceStr) days.add(d);
        if (cardIdFrom(r.flashcard_id)) flashed = true;
      });
      setPractisedDays(Math.min(days.size, 7));
      setFlashedRecently(flashed);
      setReviewed((logRes.data || []).length > 0);
    } catch (e) {
      console.error('This week load error:', e);
      setError("Couldn't load this week.");
    } finally {
      setLoading(false);
    }
  }, [uid, weekStart]);

  useEffect(() => { load(); }, [load]);

  const pending = useMemo(() => rows.filter((r) => r.status === 'pending_review'), [rows]);
  const accepted = useMemo(() => rows.filter((r) => r.status === 'accepted'), [rows]);

  const state =
    (forceReview || isReviewDay()) && flashedRecently && !reviewed
      ? 'notice'
      : accepted.length > 0
      ? 'doing'
      : 'plan';

  const generate = useCallback(async () => {
    if (!uid || generatingRef.current) return;
    generatingRef.current = true;
    setGenerating(true);
    setError('');
    setAlternatives({});
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-autopilot-suggestions', {
        body: { weekStart, numSets: 1 },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      await load();
    } catch (e) {
      console.error('Generate week error:', e);
      setError("Couldn't pick words just now. Try again in a moment.");
    } finally {
      generatingRef.current = false;
      setGenerating(false);
    }
  }, [uid, weekStart, load]);

  useEffect(() => {
    if (loading || !uid || autoTried.current) return;
    if (state !== 'plan' || rows.length > 0) return;
    autoTried.current = true;
    const key = `sprouttie-week-autogen:${uid}:${weekStart}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // Storage blocked: still generate once for this mount.
    }
    generate();
  }, [loading, uid, state, rows.length, weekStart, generate]);

  const accept = useCallback(async () => {
    if (!uid || acceptingRef.current || pending.length === 0) return { ok: false };
    acceptingRef.current = true;
    setAccepting(true);
    setError('');
    try {
      const result = await acceptWeek({ userId: uid, weekStart, suggestions: pending });
      if (typeof refreshFlashcards === 'function') await refreshFlashcards();
      await load();
      return { ok: true, ...result };
    } catch (e) {
      console.error('Accept week error:', e);
      setError('Could not add these words. Please try again.');
      return { ok: false };
    } finally {
      acceptingRef.current = false;
      setAccepting(false);
    }
  }, [uid, weekStart, pending, refreshFlashcards, load]);

  const loadAlternatives = useCallback(async (suggestion) => {
    if (alternatives[suggestion.id]) return;
    setLoadingAlternatives(suggestion.id);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-swap-alternatives', {
        body: { word: suggestion.word, category: suggestion.category },
      });
      if (fnError || data?.error) throw new Error(data?.error || 'swap failed');
      setAlternatives((prev) => ({ ...prev, [suggestion.id]: data.alternatives || [] }));
    } catch (e) {
      console.error('Swap alternatives error:', e);
      setAlternatives((prev) => ({ ...prev, [suggestion.id]: [] }));
    } finally {
      setLoadingAlternatives(null);
    }
  }, [alternatives]);

  // The reason and the everyday tip were written for the old word, so clear
  // them rather than show a rationale that no longer applies.
  const swap = useCallback(async (id, word) => {
    let { error: swapError } = await supabase
      .from('weekly_suggestions')
      .update({ word, reason: null, activity_tip: null })
      .eq('id', id);
    if (swapError && /activity_tip/.test(swapError.message || '')) {
      ({ error: swapError } = await supabase
        .from('weekly_suggestions')
        .update({ word, reason: null })
        .eq('id', id));
    }
    if (swapError) {
      console.error('Swap error:', swapError);
      setError('Could not swap that word.');
      return false;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, word, reason: null, activity_tip: null } : r)));
    return true;
  }, []);

  return {
    state,
    loading,
    generating,
    accepting,
    error,
    pending,
    accepted,
    practisedDays,
    reviewed,
    alternatives,
    loadingAlternatives,
    generate,
    accept,
    swap,
    loadAlternatives,
    reload: load,
  };
};
