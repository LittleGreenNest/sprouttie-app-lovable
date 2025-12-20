import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../context/AuthContext';
import { useFlashcards } from '../context/FlashcardContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, Search, TrendingUp, BarChart3, BookOpen, 
  ChevronDown, ChevronUp, Sparkles, Target, Filter, Download,
  RefreshCw, Star, Zap
} from 'lucide-react';

// Helper to get category name from ID
const getCategoryName = (categoryId, categories) => {
  if (!categoryId) return 'Unknown';
  const category = categories.find(c => c.id === categoryId);
  return category?.name || categoryId;
};

// Mastery level based on flash count
const getMasteryLevel = (flashCount) => {
  if (flashCount >= 10) return { label: 'Mastered', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: Star };
  if (flashCount >= 5) return { label: 'Learning', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Zap };
  if (flashCount >= 2) return { label: 'Familiar', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Target };
  return { label: 'Needs Review', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: RefreshCw };
};

const FlashedHistory = () => {
  const { currentUser } = useAuth();
  const { flashcards: localFlashcards, categories } = useFlashcards();
  const [flashedRecords, setFlashedRecords] = useState([]);
  const [allTrackingData, setAllTrackingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    if (currentUser) {
      loadFlashedHistory();
    }
  }, [currentUser, localFlashcards]);

  const loadFlashedHistory = async () => {
    try {
      setLoading(true);
      
      const { data: trackingData, error: trackingError } = await supabase
        .from('daily_tracking')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('status', 'flashed')
        .order('date', { ascending: false });

      if (trackingError) throw trackingError;
      
      setAllTrackingData(trackingData || []);

      const { data: supabaseFlashcards, error: flashcardsError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', currentUser.id);

      if (flashcardsError) throw flashcardsError;

      const localFlashcardMap = {};
      (localFlashcards || []).forEach(card => {
        localFlashcardMap[card.id] = card;
      });

      const supabaseFlashcardMapById = {};
      const supabaseFlashcardMapByFront = {};
      (supabaseFlashcards || []).forEach(card => {
        supabaseFlashcardMapById[card.id] = card;
        supabaseFlashcardMapByFront[card.front] = card;
      });

      const flashedCardIds = new Set();
      const flashedByDate = {};
      const flashTimeline = {};

      (trackingData || []).forEach(record => {
        if (record.flashcard_id && !record.flashcard_id.startsWith('set-') && record.flashcard_id !== 'shared-note') {
          flashedCardIds.add(record.flashcard_id);
          
          // Build timeline for each card
          if (!flashTimeline[record.flashcard_id]) {
            flashTimeline[record.flashcard_id] = [];
          }
          flashTimeline[record.flashcard_id].push({
            date: record.date,
            engagement: record.engagement,
            time_of_day: record.time_of_day
          });
          
          if (!flashedByDate[record.flashcard_id] || record.date < flashedByDate[record.flashcard_id].firstFlashed) {
            flashedByDate[record.flashcard_id] = {
              ...flashedByDate[record.flashcard_id],
              firstFlashed: record.date
            };
          }
          if (!flashedByDate[record.flashcard_id]?.lastFlashed || record.date > flashedByDate[record.flashcard_id].lastFlashed) {
            flashedByDate[record.flashcard_id] = {
              ...flashedByDate[record.flashcard_id],
              lastFlashed: record.date
            };
          }
          flashedByDate[record.flashcard_id] = {
            ...flashedByDate[record.flashcard_id],
            flashCount: (flashedByDate[record.flashcard_id]?.flashCount || 0) + 1
          };
        }
      });

      const records = Array.from(flashedCardIds).map(cardId => {
        let card = localFlashcardMap[cardId] || supabaseFlashcardMapById[cardId];
        
        let supabaseCard = null;
        if (card && localFlashcardMap[cardId]) {
          supabaseCard = supabaseFlashcardMapByFront[card.word || card.front];
        } else if (card) {
          supabaseCard = card;
        }
        
        const flashInfo = flashedByDate[cardId];
        const word = card?.word || card?.front || cardId;
        const english = card?.english || card?.back || '';
        const folder = card?.categoryId 
          ? getCategoryName(card.categoryId, categories || [])
          : (supabaseCard?.folder || card?.folder || 'Unknown');
        
        return {
          id: cardId,
          word: word,
          english: english,
          folder: folder || 'Unknown',
          card_type: card?.card_type || supabaseCard?.card_type || 'word',
          created_at: supabaseCard?.created_at || card?.created_at,
          date_introduced: supabaseCard?.date_introduced || card?.date_introduced,
          card_status: supabaseCard?.card_status || card?.card_status || 'unknown',
          firstFlashed: flashInfo?.firstFlashed,
          lastFlashed: flashInfo?.lastFlashed,
          flashCount: flashInfo?.flashCount || 0,
          timeline: flashTimeline[cardId] || [],
          hasValidCard: !!card
        };
      });

      const validRecords = records.filter(r => r.hasValidCard);
      validRecords.sort((a, b) => new Date(b.lastFlashed) - new Date(a.lastFlashed));

      setFlashedRecords(validRecords);
    } catch (error) {
      console.error('Error loading flashed history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories for filter
  const uniqueCategories = useMemo(() => {
    const cats = new Set(flashedRecords.map(r => r.folder));
    return Array.from(cats).sort();
  }, [flashedRecords]);

  const getDateFilteredRecords = () => {
    let filtered = flashedRecords;

    const now = new Date();
    if (dateFilter === 'today') {
      const today = now.toISOString().split('T')[0];
      filtered = filtered.filter(r => r.lastFlashed === today);
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
      filtered = filtered.filter(r => r.lastFlashed >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
      filtered = filtered.filter(r => r.lastFlashed >= monthAgo);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(r => r.folder === categoryFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.word.toLowerCase().includes(query) ||
        r.english.toLowerCase().includes(query) ||
        r.folder.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const monthlySummary = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthData = allTrackingData.filter(record => {
      const date = new Date(record.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const lastMonthData = allTrackingData.filter(record => {
      const date = new Date(record.date);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    });

    const currentMonthSessions = new Set(currentMonthData.map(r => r.date)).size;
    const lastMonthSessions = new Set(lastMonthData.map(r => r.date)).size;

    const currentEngagements = currentMonthData.filter(r => r.engagement !== null).map(r => r.engagement);
    const lastEngagements = lastMonthData.filter(r => r.engagement !== null).map(r => r.engagement);
    const currentAvgEngagement = currentEngagements.length > 0 
      ? (currentEngagements.reduce((a, b) => a + b, 0) / currentEngagements.length).toFixed(1)
      : 0;
    const lastAvgEngagement = lastEngagements.length > 0 
      ? (lastEngagements.reduce((a, b) => a + b, 0) / lastEngagements.length).toFixed(1)
      : 0;

    const currentMonthCards = new Set(currentMonthData.map(r => r.flashcard_id).filter(id => id && !id.startsWith('set-'))).size;
    const lastMonthCards = new Set(lastMonthData.map(r => r.flashcard_id).filter(id => id && !id.startsWith('set-'))).size;

    return {
      totalSessions: currentMonthSessions,
      sessionsDiff: currentMonthSessions - lastMonthSessions,
      avgEngagement: currentAvgEngagement,
      engagementDiff: (currentAvgEngagement - lastAvgEngagement).toFixed(1),
      cardsLearned: currentMonthCards,
      cardsDiff: currentMonthCards - lastMonthCards
    };
  }, [allTrackingData]);

  const toggleRowExpansion = (id) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const exportToCSV = () => {
    const headers = ['Word', 'English', 'Category', 'Status', 'Times Flashed', 'First Flashed', 'Last Flashed'];
    const rows = filteredRecords.map(r => [
      r.word, r.english, r.folder, r.card_status, r.flashCount, r.firstFlashed, r.lastFlashed
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flashed-history.csv';
    a.click();
  };

  const filteredRecords = getDateFilteredRecords();

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Flashed History</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track your learning progress across {flashedRecords.length} words
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Monthly Summary - 3-column grid */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
        <h3 className="text-lg font-semibold text-foreground text-center mb-6">Monthly Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Sessions */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-muted/50 rounded-xl p-4 text-center border-l-4 border-primary"
          >
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-1">
              <BarChart3 className="w-4 h-4" />
              <span>Total Sessions</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{monthlySummary.totalSessions}</div>
            <div className="text-xs">
              <span className={`font-medium ${monthlySummary.sessionsDiff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {monthlySummary.sessionsDiff >= 0 ? '↑' : '↓'} {Math.abs(monthlySummary.sessionsDiff)}
              </span>
              <span className="text-muted-foreground"> from last month</span>
            </div>
          </motion.div>

          {/* Avg Engagement */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-muted/50 rounded-xl p-4 text-center border-l-4 border-amber-500"
          >
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              <span>Avg. Engagement</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{monthlySummary.avgEngagement}/5</div>
            <div className="text-xs">
              <span className={`font-medium ${parseFloat(monthlySummary.engagementDiff) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {parseFloat(monthlySummary.engagementDiff) >= 0 ? '↑' : '↓'} {Math.abs(monthlySummary.engagementDiff)}
              </span>
              <span className="text-muted-foreground"> from last month</span>
            </div>
          </motion.div>

          {/* Cards Learned */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-muted/50 rounded-xl p-4 text-center border-l-4 border-blue-500"
          >
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-1">
              <BookOpen className="w-4 h-4" />
              <span>Cards Reviewed</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{monthlySummary.cardsLearned}</div>
            <div className="text-xs">
              <span className={`font-medium ${monthlySummary.cardsDiff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {monthlySummary.cardsDiff >= 0 ? '↑' : '↓'} {Math.abs(monthlySummary.cardsDiff)}
              </span>
              <span className="text-muted-foreground"> from last month</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search words..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer min-w-[160px]"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'all', label: 'All Time' },
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setDateFilter(option.value)}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  dateFilter === option.value
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredRecords.length} of {flashedRecords.length} records
      </div>

      {/* Empty State */}
      {flashedRecords.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-2xl border border-border shadow-sm p-12 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No flashed words yet!</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Start your learning journey by flashing some flashcards. Each word you review will appear here, helping you track your progress over time.
          </p>
          <a 
            href="/tracker" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Start Flashing Cards
          </a>
        </motion.div>
      ) : (
        /* Table */
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Word / Phrase
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Mastery
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Times Flashed
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Last Reviewed
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-12">
                    
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      No matching records found
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map(record => {
                    const mastery = getMasteryLevel(record.flashCount);
                    const MasteryIcon = mastery.icon;
                    const isExpanded = expandedRows.has(record.id);

                    return (
                      <React.Fragment key={record.id}>
                        <tr 
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => toggleRowExpansion(record.id)}
                        >
                          {/* Word */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground">{record.word}</span>
                              <span className="text-xs text-muted-foreground">{record.english}</span>
                              {record.card_type === 'phrase' && (
                                <span className="inline-flex items-center px-1.5 py-0.5 mt-1 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 w-fit">
                                  Phrase
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Category */}
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {record.folder}
                          </td>

                          {/* Mastery */}
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${mastery.color}`}>
                              <MasteryIcon className="w-3 h-3" />
                              {mastery.label}
                            </span>
                          </td>

                          {/* Times Flashed */}
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                              {record.flashCount}
                            </span>
                          </td>

                          {/* Last Reviewed */}
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {formatDate(record.lastFlashed)}
                          </td>

                          {/* Expand Button */}
                          <td className="px-4 py-3 text-center">
                            <motion.div
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            </motion.div>
                          </td>
                        </tr>

                        {/* Expanded Timeline */}
                        <AnimatePresence>
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="px-0 py-0">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-6 py-4 bg-muted/20 border-t border-border">
                                    <h4 className="text-sm font-medium text-foreground mb-3">Flash Timeline</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {record.timeline.slice(0, 20).map((flash, idx) => (
                                        <div 
                                          key={idx}
                                          className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg border border-border text-xs"
                                        >
                                          <Calendar className="w-3 h-3 text-muted-foreground" />
                                          <span className="text-foreground">{formatDate(flash.date)}</span>
                                          {flash.engagement && (
                                            <span className="text-amber-600 font-medium">
                                              ⭐ {flash.engagement}/5
                                            </span>
                                          )}
                                          {flash.time_of_day && (
                                            <span className="text-muted-foreground capitalize">
                                              {flash.time_of_day}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                      {record.timeline.length > 20 && (
                                        <span className="text-xs text-muted-foreground self-center">
                                          +{record.timeline.length - 20} more
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                                      <span>First flashed: <strong className="text-foreground">{formatDate(record.firstFlashed)}</strong></span>
                                      <span>Added: <strong className="text-foreground">{formatDate(record.created_at)}</strong></span>
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlashedHistory;
