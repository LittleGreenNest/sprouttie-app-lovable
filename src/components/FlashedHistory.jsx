import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../context/AuthContext';
import { useFlashcards } from '../context/FlashcardContext';
import { Calendar, Clock, Search, TrendingUp, BarChart3, BookOpen, FileText, Star, Download } from 'lucide-react';

// Helper to get category name from ID
const getCategoryName = (categoryId, categories) => {
  if (!categoryId) return 'Unknown';
  const category = categories.find(c => c.id === categoryId);
  return category?.name || categoryId;
};

const FlashedHistory = () => {
  const { currentUser } = useAuth();
  const { flashcards: localFlashcards, categories } = useFlashcards();
  const [flashedRecords, setFlashedRecords] = useState([]);
  const [allTrackingData, setAllTrackingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'week', 'month'

  useEffect(() => {
    if (currentUser) {
      loadFlashedHistory();
    }
  }, [currentUser, localFlashcards]);

  const loadFlashedHistory = async () => {
    try {
      setLoading(true);
      
      // Get all flashed tracking records
      const { data: trackingData, error: trackingError } = await supabase
        .from('daily_tracking')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('status', 'flashed')
        .order('date', { ascending: false });

      if (trackingError) throw trackingError;
      
      setAllTrackingData(trackingData || []);

      // Get all flashcards from Supabase for this user
      const { data: supabaseFlashcards, error: flashcardsError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', currentUser.id);

      if (flashcardsError) throw flashcardsError;

      // Create lookup maps for both localStorage and Supabase flashcards
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

      console.log('Flashed flashcard IDs from tracking:', [...new Set((trackingData || []).map(r => r.flashcard_id).filter(id => id && !id.startsWith('set-')))]);
      console.log('Using localStorage flashcards, IDs:', (localFlashcards || []).map(c => c.id));

      // Get unique flashcard_ids that have been flashed
      const flashedCardIds = new Set();
      const flashedByDate = {};

      (trackingData || []).forEach(record => {
        if (record.flashcard_id && !record.flashcard_id.startsWith('set-') && record.flashcard_id !== 'shared-note') {
          flashedCardIds.add(record.flashcard_id);
          
          // Track first flash date for each card
          if (!flashedByDate[record.flashcard_id] || record.date < flashedByDate[record.flashcard_id].firstFlashed) {
            flashedByDate[record.flashcard_id] = {
              ...flashedByDate[record.flashcard_id],
              firstFlashed: record.date
            };
          }
          // Track last flash date
          if (!flashedByDate[record.flashcard_id]?.lastFlashed || record.date > flashedByDate[record.flashcard_id].lastFlashed) {
            flashedByDate[record.flashcard_id] = {
              ...flashedByDate[record.flashcard_id],
              lastFlashed: record.date
            };
          }
          // Count total flashes
          flashedByDate[record.flashcard_id] = {
            ...flashedByDate[record.flashcard_id],
            flashCount: (flashedByDate[record.flashcard_id]?.flashCount || 0) + 1
          };
        }
      });

      // Build the final records with flashcard details
      const records = Array.from(flashedCardIds).map(cardId => {
        // Try localStorage first (for f123456 style IDs), then Supabase (for UUID style IDs)
        let card = localFlashcardMap[cardId] || supabaseFlashcardMapById[cardId];
        
        // Get additional metadata from Supabase if we found a localStorage card
        let supabaseCard = null;
        if (card && localFlashcardMap[cardId]) {
          // Match by word text to get Supabase metadata
          supabaseCard = supabaseFlashcardMapByFront[card.word || card.front];
        } else if (card) {
          supabaseCard = card;
        }
        
        const flashInfo = flashedByDate[cardId];
        
        // Extract word and english from different card structures
        const word = card?.word || card?.front || cardId;
        const english = card?.english || card?.back || '';
        // Get category name: use categoryId for localStorage cards, folder for Supabase cards
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
          hasValidCard: !!card
        };
      });

      // Filter out records without valid flashcard matches, then sort
      const validRecords = records.filter(r => r.hasValidCard);
      validRecords.sort((a, b) => new Date(b.lastFlashed) - new Date(a.lastFlashed));

      setFlashedRecords(validRecords);
    } catch (error) {
      console.error('Error loading flashed history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateFilteredRecords = () => {
    let filtered = flashedRecords;

    // Apply date filter
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

    // Apply search filter
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

  // Calculate monthly summary stats
  const monthlySummary = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Filter tracking data for current and last month
    const currentMonthData = allTrackingData.filter(record => {
      const date = new Date(record.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const lastMonthData = allTrackingData.filter(record => {
      const date = new Date(record.date);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    });

    // Total sessions (unique dates with flashed records)
    const currentMonthSessions = new Set(currentMonthData.map(r => r.date)).size;
    const lastMonthSessions = new Set(lastMonthData.map(r => r.date)).size;

    // Average engagement
    const currentEngagements = currentMonthData.filter(r => r.engagement !== null).map(r => r.engagement);
    const lastEngagements = lastMonthData.filter(r => r.engagement !== null).map(r => r.engagement);
    const currentAvgEngagement = currentEngagements.length > 0 
      ? (currentEngagements.reduce((a, b) => a + b, 0) / currentEngagements.length).toFixed(1)
      : 0;
    const lastAvgEngagement = lastEngagements.length > 0 
      ? (lastEngagements.reduce((a, b) => a + b, 0) / lastEngagements.length).toFixed(1)
      : 0;

    // Cards learned (unique cards flashed this month)
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

  // Group tracking data by date for daily notes view
  const dailyHistory = useMemo(() => {
    const grouped = {};
    
    allTrackingData.forEach(record => {
      const date = record.date;
      if (!grouped[date]) {
        grouped[date] = {
          date,
          flashcards: new Set(),
          sets: new Set(),
          engagements: [],
          notes: [],
          timeOfDay: record.time_of_day
        };
      }
      
      if (record.flashcard_id && !record.flashcard_id.startsWith('set-') && record.flashcard_id !== 'shared-note') {
        grouped[date].flashcards.add(record.flashcard_id);
      }
      
      if (record.flashcard_id && record.flashcard_id.startsWith('set-')) {
        grouped[date].sets.add(record.flashcard_id);
      }
      
      if (record.engagement !== null) {
        grouped[date].engagements.push(record.engagement);
      }
      
      if (record.notes) {
        grouped[date].notes.push(record.notes);
      }
    });
    
    // Convert to array and calculate averages
    return Object.values(grouped)
      .map(day => ({
        ...day,
        flashcardCount: day.flashcards.size,
        setCount: day.sets.size,
        avgEngagement: day.engagements.length > 0 
          ? (day.engagements.reduce((a, b) => a + b, 0) / day.engagements.length).toFixed(1)
          : null,
        allNotes: [...new Set(day.notes)].filter(n => n.trim())
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 30); // Last 30 days with data
  }, [allTrackingData]);

  const filteredRecords = getDateFilteredRecords();

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      retired: 'bg-slate-100 text-slate-600',
      waiting: 'bg-amber-100 text-amber-700',
      unknown: 'bg-gray-100 text-gray-500'
    };
    return styles[status] || styles.unknown;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Flashed History</h2>
          <p className="text-sm text-slate-500 mt-1">
            All {flashedRecords.length} words/phrases that have been flashed
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search words..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Date Filter */}
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'All Time' },
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'This Week' },
              { value: 'month', label: 'This Month' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setDateFilter(option.value)}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  dateFilter === option.value
                    ? 'bg-green-100 text-green-700 font-medium'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Notes Section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-slate-800">Daily Session History</h3>
          </div>
          <span className="text-sm text-slate-500">{dailyHistory.length} sessions</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Sets Used
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Flashcards
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Engagement
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    No tracking data found for this user yet.
                  </td>
                </tr>
              ) : (
                dailyHistory.map(day => (
                  <tr key={day.date} className="hover:bg-slate-50 transition-colors">
                    {/* Date */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">
                          {new Date(day.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        {day.timeOfDay && (
                          <span className="text-xs text-slate-500 capitalize">{day.timeOfDay}</span>
                        )}
                      </div>
                    </td>

                    {/* Sets Used */}
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                        {day.setCount}
                      </span>
                    </td>

                    {/* Flashcards */}
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                        {day.flashcardCount}
                      </span>
                    </td>

                    {/* Engagement */}
                    <td className="px-4 py-3 text-center">
                      {day.avgEngagement ? (
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          <span className="text-sm font-medium text-slate-700">{day.avgEngagement}/5</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>

                    {/* Notes */}
                    <td className="px-4 py-3">
                      {day.allNotes.length > 0 ? (
                        <div className="max-w-xs">
                          {day.allNotes.slice(0, 2).map((note, idx) => (
                            <p key={idx} className="text-sm text-slate-600 truncate">{note}</p>
                          ))}
                          {day.allNotes.length > 2 && (
                            <span className="text-xs text-slate-400">+{day.allNotes.length - 2} more</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 text-center mb-6">Monthly Summary</h3>
        <div className="space-y-4">
          {/* Total Sessions */}
          <div className="bg-slate-50 rounded-xl p-4 text-center border-l-4 border-green-500">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-600 mb-1">
              <BarChart3 className="w-4 h-4" />
              <span>Total Sessions</span>
            </div>
            <div className="text-3xl font-bold text-slate-800">{monthlySummary.totalSessions}</div>
            <div className="text-xs text-slate-500">This month</div>
          </div>

          {/* Avg Engagement */}
          <div className="bg-slate-50 rounded-xl p-4 text-center border-l-4 border-green-500">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span>Avg. Engagement</span>
            </div>
            <div className="text-3xl font-bold text-slate-800">{monthlySummary.avgEngagement}/5</div>
            <div className="text-xs">
              <span className={`font-medium ${parseFloat(monthlySummary.engagementDiff) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {parseFloat(monthlySummary.engagementDiff) >= 0 ? '↑' : '↓'} {Math.abs(monthlySummary.engagementDiff)}
              </span>
              <span className="text-slate-500"> from last month</span>
            </div>
          </div>

          {/* Cards Learned */}
          <div className="bg-slate-50 rounded-xl p-4 text-center border-l-4 border-green-500">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-600 mb-1">
              <BookOpen className="w-4 h-4" />
              <span>Cards Learned</span>
            </div>
            <div className="text-3xl font-bold text-slate-800">{monthlySummary.cardsLearned}</div>
            <div className="text-xs">
              <span className={`font-medium ${monthlySummary.cardsDiff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {monthlySummary.cardsDiff >= 0 ? '↑' : '↓'} {Math.abs(monthlySummary.cardsDiff)}
              </span>
              <span className="text-slate-500"> from last month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-slate-500">
        Showing {filteredRecords.length} of {flashedRecords.length} records
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Word / Phrase
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Times Flashed
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Dates
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    No flashed records found
                  </td>
                </tr>
              ) : (
                filteredRecords.map(record => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    {/* Word */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">{record.word}</span>
                        <span className="text-xs text-slate-500">{record.english}</span>
                        {record.card_type === 'phrase' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 mt-1 rounded text-[10px] font-medium bg-purple-100 text-purple-700 w-fit">
                            Phrase
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {record.folder}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(record.card_status)}`}>
                        {record.card_status}
                      </span>
                    </td>

                    {/* Times Flashed */}
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm">
                        {record.flashCount}
                      </span>
                    </td>

                    {/* Dates */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Added: {formatDate(record.created_at)}</span>
                        </div>
                        {record.date_introduced && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Started: {formatDate(record.date_introduced)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-green-600">
                          <span>First flash: {formatDate(record.firstFlashed)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-blue-600">
                          <span>Last flash: {formatDate(record.lastFlashed)}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FlashedHistory;
