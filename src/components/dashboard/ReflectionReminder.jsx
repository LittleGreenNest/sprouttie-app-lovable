import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { getCurrentWeekStart } from '../thisweek/useThisWeek';

const ReflectionReminder = ({ onOpenThisWeek }) => {
  const { currentUser } = useAuth() || {};
  const [dismissed, setDismissed] = useState(false);
  const [hasReflection, setHasReflection] = useState(true); // default true to hide until checked
  const [logCount, setLogCount] = useState(0);

  const weekStart = useMemo(() => getCurrentWeekStart(), []);

  // Check if today is Friday (5), Saturday (6), or Sunday (0)
  const isReflectionWindow = useMemo(() => {
    const day = new Date().getDay();
    return day === 5 || day === 6 || day === 0;
  }, []);

  // Check dismissal from sessionStorage (persists per browser session)
  useEffect(() => {
    const key = `reflection-dismissed-${weekStart}`;
    if (sessionStorage.getItem(key)) {
      setDismissed(true);
    }
  }, [weekStart]);

  // Check if user already has a reflection log this week
  useEffect(() => {
    if (!currentUser || !isReflectionWindow) return;

    const check = async () => {
      const { data, error } = await supabase
        .from('weekly_logs')
        .select('id, log_type')
        .eq('user_id', currentUser.id)
        .eq('week_start', weekStart);

      if (!error && data) {
        const reflectionExists = data.some(l => l.log_type === 'reflection');
        setHasReflection(reflectionExists);
        setLogCount(data.length);
      }
    };
    check();
  }, [currentUser, weekStart, isReflectionWindow]);

  const handleDismiss = (e) => {
    e.stopPropagation();
    setDismissed(true);
    sessionStorage.setItem(`reflection-dismissed-${weekStart}`, '1');
  };

  // Don't show if: not in the window, already reflected, dismissed, or no user
  if (!isReflectionWindow || hasReflection || dismissed || !currentUser) return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        onClick={onOpenThisWeek}
        className="w-full mb-4 relative group"
      >
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-left shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[hsl(var(--sprouttie-ink))] text-sm">
              Time to reflect on your week! ✨
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              {logCount > 0
                ? `You logged ${logCount} activit${logCount === 1 ? 'y' : 'ies'}. See your weekly summary`
                : 'Take a moment to celebrate progress and plan ahead'}
            </p>
          </div>
          <span className="text-xs font-medium text-amber-600 flex-shrink-0">
            Reflect →
          </span>
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-amber-100 transition-all"
          >
            <X className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>
      </motion.button>
    </AnimatePresence>
  );
};

export default ReflectionReminder;
