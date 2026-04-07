import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { 
  TrendingUp, BarChart3, BookOpen, 
  Download, Eye, Edit3, Sparkles, Zap
} from 'lucide-react';

// Helper to get month options
const getMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  return options;
};

const FlashedHistory = () => {
  const { currentUser } = useAuth();
  const [sessionHistory, setSessionHistory] = useState([]);
  const [allTrackingData, setAllTrackingData] = useState([]);
  const [spokenWordsByDate, setSpokenWordsByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const monthOptions = useMemo(() => getMonthOptions(), []);

  useEffect(() => {
    if (currentUser) {
      loadSessionHistory();
    }
  }, [currentUser, selectedMonth]);

  const loadSessionHistory = async () => {
    try {
      setLoading(true);
      
      // Parse selected month
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of month
      
      // Fetch all tracking data for the month (handle >1000 rows with pagination)
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      let allTrackingRows = [];
      let from = 0;
      const PAGE_SIZE = 1000;
      
      while (true) {
        const { data: page, error: pageError } = await supabase
          .from('daily_tracking')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('status', 'flashed')
          .gte('date', startDateStr)
          .lte('date', endDateStr)
          .order('date', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);
        
        if (pageError) throw pageError;
        allTrackingRows = allTrackingRows.concat(page || []);
        if (!page || page.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      
      const trackingData = allTrackingRows;

      // trackingError handled above per-page
      
      setAllTrackingData(trackingData || []);

      // Fetch flashcards for reference
      const { data: flashcards } = await supabase
        .from('flashcards')
        .select('id, front, back, folder, set_number')
        .eq('user_id', currentUser.id);

      const flashcardMap = {};
      (flashcards || []).forEach(card => {
        flashcardMap[card.id] = card;
      });

      // Group by date to create session history
      const sessionsByDate = {};
      (trackingData || []).forEach(record => {
        const date = record.date;
        if (!sessionsByDate[date]) {
          sessionsByDate[date] = {
            date,
            setsUsed: new Set(),
            flashcardIds: new Set(),
            engagements: [],
            notes: []
          };
        }
        
        // Primary: extract setId from notes JSON metadata (how SessionLogTracker stores it)
        let isMetadataNote = false;
        if (record.notes) {
          try {
            const metadata = JSON.parse(record.notes);
            if (metadata && typeof metadata === 'object' && metadata.setId !== undefined) {
              sessionsByDate[date].setsUsed.add(metadata.setId);
              isMetadataNote = true; // Don't display this as a user note
            }
          } catch {
            // Not JSON metadata
          }
        }
        
        // Fallback: get set from flashcard's set_number
        const card = flashcardMap[record.flashcard_id];
        if (card?.set_number) {
          sessionsByDate[date].setsUsed.add(card.set_number);
        }
        
        sessionsByDate[date].flashcardIds.add(record.flashcard_id);
        
        if (record.engagement) {
          sessionsByDate[date].engagements.push(record.engagement);
        }
        // Only add non-metadata notes to display
        if (record.notes && !isMetadataNote) {
          try {
            const parsed = JSON.parse(record.notes);
            if (parsed && typeof parsed === 'object' && parsed.text) {
              sessionsByDate[date].notes.push(parsed.text);
            } else if (typeof parsed === 'string') {
              sessionsByDate[date].notes.push(parsed);
            } else {
              // Skip objects without text (likely metadata)
            }
          } catch {
            sessionsByDate[date].notes.push(record.notes);
          }
        }
      });

      // Convert to array
      const sessions = Object.values(sessionsByDate).map(session => {
        // Get unique notes and format nicely
        const uniqueNotes = session.notes.filter((n, i, arr) => arr.indexOf(n) === i);
        return {
          date: session.date,
          setsUsed: Array.from(session.setsUsed).sort((a, b) => a - b),
          flashcardCount: session.flashcardIds.size,
          avgEngagement: session.engagements.length > 0 
            ? (session.engagements.reduce((a, b) => a + b, 0) / session.engagements.length).toFixed(1)
            : null,
          notes: uniqueNotes.join('; ')
        };
      });

      sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
      setSessionHistory(sessions);
    } catch (error) {
      console.error('Error loading session history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate monthly summary for selected month
  const monthlySummary = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const lastMonth = month === 1 ? 12 : month - 1;
    const lastMonthYear = month === 1 ? year - 1 : year;

    // Current month data is already filtered by loadSessionHistory
    const totalSessions = sessionHistory.length;
    
    const engagements = allTrackingData.filter(r => r.engagement !== null).map(r => r.engagement);
    const avgEngagement = engagements.length > 0 
      ? (engagements.reduce((a, b) => a + b, 0) / engagements.length).toFixed(1)
      : 0;

    const cardsLearned = new Set(allTrackingData.map(r => r.flashcard_id).filter(id => id && !id.startsWith('set-'))).size;

    // For comparison, we'd need to fetch last month's data separately
    // For now, show simple values
    return {
      totalSessions,
      avgEngagement,
      cardsLearned,
      // These would require fetching previous month data
      sessionsDiff: 0,
      engagementDiff: 0,
      cardsDiff: 0
    };
  }, [sessionHistory, allTrackingData, selectedMonth]);

  const exportToCSV = () => {
    const headers = ['Date', 'Sets Used', 'Flashcards', 'Engagement', 'Notes'];
    const rows = sessionHistory.map(s => [
      s.date, 
      s.setsUsed.join(', ') || '-', 
      s.flashcardCount, 
      s.avgEngagement || '-', 
      s.notes || '-'
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flashcard-history-${selectedMonth}.csv`;
    a.click();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Title, Month Selector, and Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-semibold text-foreground">Flashcard History</h2>
        
        <div className="flex items-center gap-3">
          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer min-w-[160px]"
          >
            {monthOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          
          {/* Export Button */}
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Sets Used
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Flashcards
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Engagement
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sessionHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No tracking data found for this user yet.
                  </td>
                </tr>
              ) : (
                sessionHistory.map((session, idx) => (
                  <motion.tr 
                    key={session.date}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-foreground">
                      {formatDate(session.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {session.setsUsed.length > 0 
                        ? session.setsUsed.map(s => `Set ${s}`).join(', ')
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground font-medium">
                      {session.flashcardCount}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {session.avgEngagement ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-amber-600">⭐</span>
                          <span className="text-foreground font-medium">{session.avgEngagement}/5</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground max-w-[200px] truncate">
                      {session.notes || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Edit session"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="text-lg font-semibold text-foreground text-center mb-6">Monthly Summary</h3>
        
        <div className="space-y-4">
          {/* Total Sessions */}
          <div className="bg-muted/30 rounded-xl p-5 text-center">
            <div className="text-sm text-muted-foreground mb-2">Total Sessions</div>
            <div className="text-4xl font-bold text-foreground">{monthlySummary.totalSessions}</div>
            <div className="text-sm text-muted-foreground mt-1">This month</div>
          </div>

          {/* Avg Engagement */}
          <div className="bg-muted/30 rounded-xl p-5 text-center">
            <div className="text-sm text-muted-foreground mb-2">Avg. Engagement</div>
            <div className="text-4xl font-bold text-foreground">{monthlySummary.avgEngagement}/5</div>
            <div className="text-sm mt-1">
              <span className="text-emerald-600 font-medium">↑ {Math.abs(monthlySummary.engagementDiff)}</span>
              <span className="text-muted-foreground"> from last month</span>
            </div>
          </div>

          {/* Cards Introduced */}
          <div className="bg-muted/30 rounded-xl p-5 text-center">
            <div className="text-sm text-muted-foreground mb-2">Cards Introduced</div>
            <div className="text-4xl font-bold text-foreground">{monthlySummary.cardsLearned}</div>
            <div className="text-sm mt-1">
              <span className="text-emerald-600 font-medium">↑ {Math.abs(monthlySummary.cardsDiff)}</span>
              <span className="text-muted-foreground"> from last month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State CTA */}
      {sessionHistory.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-xl border border-border shadow-sm p-8 text-center"
        >
          <div className="w-14 h-14 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No sessions this month</h3>
          <p className="text-muted-foreground mb-5 max-w-md mx-auto">
            Start tracking your flashcard sessions to see your progress here.
          </p>
          <a 
            href="/tracker" 
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Start Tracking
          </a>
        </motion.div>
      )}
    </div>
  );
};

export default FlashedHistory;
