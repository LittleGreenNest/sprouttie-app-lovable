import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../context/AuthContext';
import { useFlashcards } from '../context/FlashcardContext';

// Helper to get category name from ID
const getCategoryName = (categoryId, categories) => {
  if (!categoryId) return 'Unknown';
  const category = categories.find(c => c.id === categoryId);
  return category?.name || categoryId;
};
import { Calendar, Clock, User, Search, Filter } from 'lucide-react';

const FlashedHistory = () => {
  const { currentUser } = useAuth();
  const { flashcards: localFlashcards, categories } = useFlashcards();
  const [flashedRecords, setFlashedRecords] = useState([]);
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
