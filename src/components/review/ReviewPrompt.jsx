import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { getCurrentWeekStart } from '../thisweek/useThisWeek';
import { REVIEW_LOG_TYPE } from './useWeeklyReview';

/**
 * Dashboard nudge for the weekly review. Appears only when there is something
 * to review and the week has not been reviewed yet, so it is never noise.
 *
 * Kept deliberately cheap: two count queries, no card or word data. The review
 * screen itself does the real loading.
 */
const ReviewPrompt = () => {
  const { currentUser } = useAuth() || {};
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [count, setCount] = useState(0);

  const weekStart = useMemo(() => getCurrentWeekStart(), []);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    const check = async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

      const [logRes, trackRes] = await Promise.all([
        supabase
          .from('weekly_logs')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('week_start', weekStart)
          .eq('log_type', REVIEW_LOG_TYPE)
          .limit(1),
        supabase
          .from('daily_tracking')
          .select('flashcard_id')
          .eq('user_id', currentUser.id)
          .gte('date', since),
      ]);

      if (cancelled) return;
      if ((logRes.data || []).length) return; // already reviewed this week

      const cards = new Set(
        (trackRes.data || [])
          .map((r) => String(r.flashcard_id || '').split(':')[0])
          .filter((id) => id && !id.includes('sentinel'))
      );

      if (cards.size > 0) {
        setCount(cards.size);
        setShow(true);
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [currentUser, weekStart]);

  if (!show) return null;

  return (
    <button
      onClick={() => navigate('/weekly-review')}
      className="w-full mx-4 mb-3 text-left active:scale-[0.99] transition-transform"
      style={{
        width: 'calc(100% - 2rem)',
        background: '#FEF6E4',
        border: '1px solid #F0C040',
        borderRadius: 14,
        padding: '14px 16px',
        cursor: 'pointer',
      }}
    >
      <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
        Did he say any of these? 🌱
      </p>
      <p style={{ fontSize: 12, color: '#8A6B1A', margin: '2px 0 0' }}>
        {count} word{count === 1 ? '' : 's'} flashed this week · about 30 seconds
      </p>
    </button>
  );
};

export default ReviewPrompt;
