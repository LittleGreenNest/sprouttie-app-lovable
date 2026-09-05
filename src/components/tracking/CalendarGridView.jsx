import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFlashcards } from '@/context/FlashcardContext';
import { cardIdFrom } from '@/utils/cardId';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const CalendarGridView = () => {
  const { currentUser } = useAuth();
  const { sets } = useFlashcards();
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    return new Date(today.setDate(diff));
  });
  const [trackingData, setTrackingData] = useState({}); // { 'YYYY-MM-DD': { setId: [round1, round2, round3] } }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // Track which cell is saving

  // Generate 7 days starting from weekStart
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  }, [weekStart]);

  // Load tracking data for the week
  useEffect(() => {
    if (currentUser) {
      loadWeekData();
    }
  }, [currentUser, weekStart]);

  const loadWeekData = async () => {
    setLoading(true);
    try {
      const startDate = weekStart.toISOString().split('T')[0];
      const endDate = new Date(weekStart);
      endDate.setDate(endDate.getDate() + 6);
      const endDateStr = endDate.toISOString().split('T')[0];

      // Fetch daily_tracking records for the week
      const { data, error } = await supabase
        .from('daily_tracking')
        .select('date, flashcard_id, status')
        .eq('user_id', currentUser.id)
        .gte('date', startDate)
        .lte('date', endDateStr);

      if (error) throw error;

      // Transform data into our format
      // For now, we'll use a simplified approach: count flashed cards per set per day
      // and distribute across rounds
      const transformed = {};
      
      // Initialize all days
      weekDays.forEach(day => {
        const dateStr = day.toISOString().split('T')[0];
        transformed[dateStr] = {};
        sets.forEach(set => {
          transformed[dateStr][set.id] = [false, false, false];
        });
      });

      // For each tracked flashcard, mark the corresponding set's rounds
      if (data) {
        const flashedByDate = {};
        data.forEach(record => {
          if (record.status === 'flashed') {
            if (!flashedByDate[record.date]) {
              flashedByDate[record.date] = new Set();
            }
            flashedByDate[record.date].add(cardIdFrom(record.flashcard_id));
          }
        });

        // Mark rounds based on flashed cards (if any cards from a set were flashed, mark rounds)
        Object.keys(flashedByDate).forEach(date => {
          const flashedIds = flashedByDate[date];
          sets.forEach(set => {
            const setFlashed = (set.flashcardIds || []).some(id => flashedIds.has(id));
            if (setFlashed) {
              // Mark all 3 rounds if set was used
              transformed[date][set.id] = [true, true, true];
            }
          });
        });
      }

      setTrackingData(transformed);
    } catch (error) {
      console.error('Error loading week data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRound = async (dateStr, setId, roundIndex) => {
    if (!currentUser) return;
    
    const cellKey = `${dateStr}-${setId}-${roundIndex}`;
    setSaving(cellKey);
    
    try {
      const currentState = trackingData[dateStr]?.[setId]?.[roundIndex] || false;
      const newState = !currentState;

      // Update local state immediately for responsiveness
      setTrackingData(prev => ({
        ...prev,
        [dateStr]: {
          ...prev[dateStr],
          [setId]: prev[dateStr]?.[setId]?.map((v, i) => 
            i === roundIndex ? newState : v
          ) || [false, false, false].map((v, i) => i === roundIndex ? newState : v)
        }
      }));

      // Get flashcards for this set
      const set = sets.find(s => s.id === setId);
      const flashcardIds = set?.flashcardIds || [];
      
      if (flashcardIds.length === 0) {
        setSaving(null);
        return;
      }

      if (newState) {
        // Insert tracking records for all cards in the set
        const records = flashcardIds.map(flashcardId => ({
          user_id: currentUser.id,
          flashcard_id: flashcardId,
          date: dateStr,
          status: 'flashed',
          flashed_at: new Date().toISOString()
        }));

        // Upsert to avoid duplicates
        for (const record of records) {
          await supabase
            .from('daily_tracking')
            .upsert(record, { onConflict: 'user_id,flashcard_id,date' });
        }
      } else {
        // If unchecking, only remove if all rounds are unchecked
        const otherRoundsChecked = trackingData[dateStr]?.[setId]?.some((v, i) => 
          i !== roundIndex && v
        );
        
        if (!otherRoundsChecked) {
          // Remove all tracking records for this set on this date
          await supabase
            .from('daily_tracking')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('date', dateStr)
            .in('flashcard_id', flashcardIds);
        }
      }
    } catch (error) {
      console.error('Error toggling round:', error);
      // Revert on error
      loadWeekData();
    } finally {
      setSaving(null);
    }
  };

  const navigateWeek = (direction) => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() + (direction * 7));
    setWeekStart(newStart);
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    setWeekStart(new Date(today.setDate(diff)));
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
  };

  const formatMonthYear = () => {
    const endOfWeek = new Date(weekStart);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    
    const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = endOfWeek.toLocaleDateString('en-US', { month: 'short' });
    const year = weekStart.getFullYear();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${year}`;
    }
    return `${startMonth} - ${endMonth} ${year}`;
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getSetProgress = (setId) => {
    let total = 0;
    let completed = 0;
    weekDays.forEach(day => {
      const dateStr = day.toISOString().split('T')[0];
      const rounds = trackingData[dateStr]?.[setId] || [false, false, false];
      total += 3;
      completed += rounds.filter(Boolean).length;
    });
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  if (!currentUser) {
    return (
      <div className="text-center py-8 text-slate-500">
        Please log in to track your flashcards.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <button
            onClick={() => navigateWeek(1)}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
          <span className="font-medium text-slate-700 ml-2">{formatMonthYear()}</span>
        </div>
        <button
          onClick={goToCurrentWeek}
          className="text-sm text-green-600 hover:text-green-700 font-medium"
        >
          Today
        </button>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left px-3 py-2 font-medium text-slate-600 sticky left-0 bg-slate-50 min-w-[80px]">
                Set
              </th>
              {weekDays.map((day, idx) => (
                <th 
                  key={idx} 
                  className={`text-center px-1 py-2 font-medium min-w-[72px] ${
                    isToday(day) ? 'bg-green-50 text-green-700' : 'text-slate-600'
                  }`}
                >
                  <div className="text-xs">{formatDate(day)}</div>
                  <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                    R1 R2 R3
                  </div>
                </th>
              ))}
              <th className="text-center px-2 py-2 font-medium text-slate-600 min-w-[50px]">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : sets.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-slate-400">
                  No sets configured. Add flashcards to sets first.
                </td>
              </tr>
            ) : (
              sets.map((set, setIdx) => {
                const progress = getSetProgress(set.id);
                const hasCards = (set.flashcardIds || []).length > 0;
                
                return (
                  <tr 
                    key={set.id} 
                    className={`border-t border-slate-100 ${setIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                  >
                    <td className={`px-3 py-2 font-medium text-slate-700 sticky left-0 ${setIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <div className="flex items-center gap-1.5">
                        <span>{set.name}</span>
                        <span className="text-xs text-slate-400">
                          ({(set.flashcardIds || []).length})
                        </span>
                      </div>
                    </td>
                    {weekDays.map((day, dayIdx) => {
                      const dateStr = day.toISOString().split('T')[0];
                      const rounds = trackingData[dateStr]?.[set.id] || [false, false, false];
                      
                      return (
                        <td 
                          key={dayIdx} 
                          className={`text-center px-1 py-1.5 ${isToday(day) ? 'bg-green-50/50' : ''}`}
                        >
                          <div className="flex justify-center gap-0.5">
                            {rounds.map((completed, roundIdx) => {
                              const cellKey = `${dateStr}-${set.id}-${roundIdx}`;
                              const isSaving = saving === cellKey;
                              
                              return (
                                <button
                                  key={roundIdx}
                                  onClick={() => hasCards && toggleRound(dateStr, set.id, roundIdx)}
                                  disabled={!hasCards || isSaving}
                                  className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
                                    !hasCards 
                                      ? 'bg-slate-100 border-slate-200 cursor-not-allowed'
                                      : completed
                                        ? 'bg-green-500 border-green-500 text-white'
                                        : 'bg-white border-slate-300 hover:border-green-400'
                                  } ${isSaving ? 'opacity-50' : ''}`}
                                >
                                  {completed && <Check className="w-3 h-3" />}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                    <td className="text-center px-2 py-2">
                      <span className={`text-xs font-medium ${
                        progress.percentage === 100 
                          ? 'text-green-600' 
                          : progress.percentage > 0 
                            ? 'text-amber-600' 
                            : 'text-slate-400'
                      }`}>
                        {progress.percentage}%
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Week Summary */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-sm">
        <div className="text-slate-600">
          {(() => {
            let totalChecked = 0;
            let totalPossible = 0;
            sets.forEach(set => {
              if ((set.flashcardIds || []).length > 0) {
                weekDays.forEach(day => {
                  const dateStr = day.toISOString().split('T')[0];
                  const rounds = trackingData[dateStr]?.[set.id] || [false, false, false];
                  totalPossible += 3;
                  totalChecked += rounds.filter(Boolean).length;
                });
              }
            });
            return (
              <span>
                <strong>{totalChecked}</strong> of <strong>{totalPossible}</strong> rounds completed this week
              </span>
            );
          })()}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border border-slate-300 bg-white" />
            Pending
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500 flex items-center justify-center">
              <Check className="w-2 h-2 text-white" />
            </div>
            Done
          </span>
        </div>
      </div>
    </div>
  );
};

export default CalendarGridView;
