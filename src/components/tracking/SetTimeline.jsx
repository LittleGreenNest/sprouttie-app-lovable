import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';

const STATUS_PILLS = {
  active: { bg: '#D1FAE5', text: '#065F46', label: 'In set' },
  introduced: { bg: '#DBEAFE', text: '#1E40AF', label: 'Added' },
  retired: { bg: '#F3F4F6', text: '#6B7280' },
  graduated: { bg: '#FEF3C7', text: '#92400E' },
};

const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const formatDayOfWeek = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long' });
};

const SetTimeline = ({ setId, currentWords = [] }) => {
  const { currentUser } = useAuth() || {};
  const [timelineEntries, setTimelineEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    loadTimeline();
  }, [currentUser, setId]);

  const loadTimeline = async () => {
    try {
      setLoading(true);

      // Get all flashcards that are or were in this set
      // Current words are passed in; retired words have date_retired set and set_number might be null
      // We query all flashcards that either currently have this set_number OR have date_retired + were in this set
      const { data: allCards, error } = await supabase
        .from('flashcards')
        .select('id, front, back, set_number, card_status, date_introduced, date_retired, created_at')
        .eq('user_id', currentUser.id);

      if (error) throw error;

      const entries = [];
      const currentWordIds = new Set(currentWords.map(w => w.id));

      (allCards || []).forEach(card => {
        const isCurrentlyInSet = card.set_number === setId;
        const wasInSet = !isCurrentlyInSet && currentWordIds.has(card.id);
        
        // For current words: show introduction event + active status
        if (isCurrentlyInSet) {
          const introDate = card.date_introduced || card.created_at;
          entries.push({
            id: `${card.id}-intro`,
            date: introDate,
            word: card.front,
            secondary: card.back,
            status: 'active',
            cardStatus: card.card_status,
          });
        }

        // For retired/graduated words that were in this set
        if (card.date_retired && card.set_number === null) {
          // We can't be 100% sure it was in THIS set without a history table,
          // but if it was retired and has no set, we skip unless we have other signals
        }
      });

      // Also build entries from current words for retired ones
      currentWords.forEach(word => {
        const existing = entries.find(e => e.id === `${word.id}-intro`);
        if (!existing) {
          const introDate = word.date_introduced || word.created_at;
          entries.push({
            id: `${word.id}-intro`,
            date: introDate,
            word: word.front || word.word,
            secondary: word.back,
            status: 'active',
            cardStatus: word.card_status,
          });
        }
      });

      // Query flashcards that were retired from this set (they'll have date_retired set)
      // Since we don't have a set_history table, we check cards with date_retired 
      // that are NOT in any set currently but might have been in this one
      // For now, focus on current set words + their lifecycle
      
      // Sort newest first
      entries.sort((a, b) => {
        const da = a.date ? new Date(a.date) : new Date(0);
        const db = b.date ? new Date(b.date) : new Date(0);
        return db - da;
      });

      setTimelineEntries(entries);
    } catch (err) {
      console.error('Error loading timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#2D6A4F]" />
      </div>
    );
  }

  if (timelineEntries.length === 0) {
    return (
      <p className="text-center text-[13px] text-[#9CA3AF] italic py-6">
        Timeline builds as you add and retire words.
      </p>
    );
  }

  return (
    <div className="max-h-[280px] overflow-y-auto pr-1">
      <div className="relative pl-[60px]">
        {/* Vertical timeline line — positioned on the left edge of content */}
        <div 
          className="absolute top-2 bottom-2 w-[2px] bg-[#D1D5DB] rounded-full" 
          style={{ left: '55px' }}
        />

        {timelineEntries.map((entry, idx) => {
          // Determine pill
          let pill = STATUS_PILLS.introduced;
          let pillLabel = 'Added';

          if (entry.status === 'active') {
            if (entry.cardStatus === 'retired') {
              pill = STATUS_PILLS.retired;
              pillLabel = `Retired${entry.retiredDate ? ` · ${formatShortDate(entry.retiredDate)}` : ''}`;
            } else if (entry.cardStatus === 'graduated' || entry.cardStatus === 'owned') {
              pill = STATUS_PILLS.graduated;
              pillLabel = `Owned${entry.retiredDate ? ` · ${formatShortDate(entry.retiredDate)}` : ''} ✓`;
            } else {
              pill = STATUS_PILLS.active;
              pillLabel = 'In set';
            }
          }

          return (
            <div key={entry.id} className="flex items-start py-2.5 relative">
              {/* Date column — absolutely positioned to the left */}
              <div className="absolute left-[-56px] w-[48px] text-right top-2.5">
                <div className="text-[11px] font-medium text-[#374151] leading-tight">
                  {formatShortDate(entry.date)}
                </div>
                <div className="text-[10px] text-[#9CA3AF] leading-tight">
                  {formatDayOfWeek(entry.date)}
                </div>
              </div>

              {/* Timeline node — sits exactly on the line */}
              <div 
                className="absolute flex items-center justify-center z-10"
                style={{ left: '-8px', top: '12px' }}
              >
                <div 
                  className="w-[10px] h-[10px] rounded-full bg-white border-[2.5px] border-[#9CA3AF]"
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[#1F2937] truncate">
                  {entry.word}
                  {entry.secondary && (
                    <span className="text-[#9CA3AF] font-normal ml-1">· {entry.secondary}</span>
                  )}
                </div>
                <span 
                  className="inline-block mt-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: pill.bg, color: pill.text }}
                >
                  {pillLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SetTimeline;
