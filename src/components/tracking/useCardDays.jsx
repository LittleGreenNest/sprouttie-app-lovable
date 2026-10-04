import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toLocalDateString } from '@/utils/week';
import { DAY_COUNT_WINDOW, daysFlashed } from '@/utils/cardDays';
import { useAuth } from '../../context/AuthContext';

const PAGE = 1000;
const MAX_PAGES = 8;

/**
 * Flashed-day counts for the cards currently in sets, worked out from the
 * round log each time so that unticking a round corrects the count with no
 * extra step. Returns a Map of card id to days, and a reload to call after a
 * round is ticked or unticked.
 */
export const useCardDays = (cards) => {
  const { currentUser } = useAuth() || {};
  const uid = currentUser?.id;
  const [rows, setRows] = useState([]);

  const inSets = useMemo(() => (cards || []).filter((c) => c.set_number), [cards]);

  const reload = useCallback(async () => {
    if (!uid) return;
    const since = new Date();
    since.setDate(since.getDate() - DAY_COUNT_WINDOW);
    const sinceStr = toLocalDateString(since);
    const all = [];
    try {
      // PostgREST returns 1000 rows at most, and three rounds a day across
      // five sets passes that in a fortnight.
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const { data, error } = await supabase
          .from('daily_tracking')
          .select('flashcard_id, date, user_local_date, status')
          .eq('user_id', uid)
          .gte('date', sinceStr)
          .order('date', { ascending: false })
          .range(page * PAGE, page * PAGE + PAGE - 1);
        if (error) throw error;
        all.push(...(data || []));
        if (!data || data.length < PAGE) break;
      }
      setRows(all);
    } catch (e) {
      console.error('Card day count error:', e);
    }
  }, [uid]);

  useEffect(() => { reload(); }, [reload]);

  const days = useMemo(() => daysFlashed(rows, inSets), [rows, inSets]);
  return { days, reload };
};
