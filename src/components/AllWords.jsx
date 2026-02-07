import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../context/AuthContext';
import { useFlashcards } from '../context/FlashcardContext';
import { getFlashcardStatsByCategory } from '../utils/supabaseApi';
import { LayoutGrid, List, ChevronDown, ChevronUp, Download, Upload, FileSpreadsheet } from 'lucide-react';
import SearchFilterBar from './all-words/SearchFilterBar';
import GlobalProgressBar from './all-words/GlobalProgressBar';
import CategoryCard from './all-words/CategoryCard';
import StatsSummary from './all-words/StatsSummary';
import { useAllWordsUIState } from '../hooks/useAllWordsUIState';
import { generateCSVExport, downloadCSVFile } from '../utils/flashcardExport';
import CSVImport from './import/CSVImport';

const AllWords = () => {
  const { currentUser, plan: userPlan } = useAuth(); // Use plan from AuthContext - no extra fetch
  const { categories, flashcards: localFlashcards, updateFlashcard, loading: flashcardsLoading, sets } = useFlashcards();
  const [flashcardsByCategory, setFlashcardsByCategory] = useState({});
  const [flashedEver, setFlashedEver] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('db'); // 'db' | 'local'
  const [editingCard, setEditingCard] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [allCategories, setAllCategories] = useState([]);
  const [categoryStats, setCategoryStats] = useState({});
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [dbFlashcardsRaw, setDbFlashcardsRaw] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);

  // Initialize UI state management (must be before any conditional returns)
  const uiState = useAllWordsUIState(flashcardsByCategory, allCategories);

  useEffect(() => {
    if (!flashcardsLoading) {
      fetchFlashcardsAndTracking();
    }
  }, [currentUser, localFlashcards, categories, flashcardsLoading]);

  const fetchFlashcardsAndTracking = async () => {
    setLoading(true);
    
    // If no authenticated user, show local data from context
    if (!currentUser) {
      const groupedLocal = {};
      const catNameById = categories.reduce((acc, c) => { acc[c.id] = c.name; return acc; }, {});
      (localFlashcards || []).forEach(card => {
        const category = catNameById[card.categoryId] || 'Uncategorized';
        if (!groupedLocal[category]) groupedLocal[category] = [];
        groupedLocal[category].push({ 
          id: card.id, 
          label: card.word, 
          title: card.english || card.pinyin,
          categoryId: card.categoryId,
          rawData: card
        });
      });
      setDataSource('local');
      setFlashcardsByCategory(groupedLocal);
      setFlashedEver(new Set());
      setAllCategories(categories.map(c => c.name));
      setLoading(false);
      return;
    }

    try {
      // Fetch all flashcards from backend first
      const { data: dbFlashcards, error: flashcardsError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('folder', { ascending: true })
        .order('front', { ascending: true });

      if (flashcardsError) throw flashcardsError;

      // Store raw flashcards for export
      setDbFlashcardsRaw(dbFlashcards || []);

      // Fetch all tracking data (ever flashed) from backend
      const { data: tracking, error: trackingError } = await supabase
        .from('daily_tracking')
        .select('flashcard_id, flashed_at')
        .eq('user_id', currentUser.id)
        .eq('status', 'flashed')
        .order('flashed_at', { ascending: true });

      if (trackingError) throw trackingError;

      // Create a set of ever-flashed flashcard IDs and map of first flashed dates
      const flashedIds = new Set(tracking?.map(t => t.flashcard_id) || []);
      const firstFlashedDates = {};
      tracking?.forEach(t => {
        if (!firstFlashedDates[t.flashcard_id]) {
          firstFlashedDates[t.flashcard_id] = t.flashed_at;
        }
      });
      console.log('Flashed flashcard IDs from tracking:', Array.from(flashedIds));
      setFlashedEver(flashedIds);

      // Group flashcards by category
      const grouped = {};
      const uniqueCategories = new Set();

      if (dbFlashcards && dbFlashcards.length > 0) {
        setDataSource('db');
        dbFlashcards.forEach(card => {
          const category = card.folder || 'Uncategorized';
          uniqueCategories.add(category);
          if (!grouped[category]) grouped[category] = [];
          grouped[category].push({ 
            id: card.id, 
            label: card.front, 
            title: card.back,
            folder: card.folder,
            created_at: card.created_at,
            updated_at: card.updated_at,
            first_flashed_at: firstFlashedDates[card.id] || null,
            rawData: card
          });
        });
        setAllCategories(Array.from(uniqueCategories).sort());
      } else {
        // Fallback to local flashcards (from context)
        setDataSource('local');
        const catNameById = categories.reduce((acc, c) => { acc[c.id] = c.name; return acc; }, {});
        (localFlashcards || []).forEach(card => {
          const category = catNameById[card.categoryId] || 'Uncategorized';
          if (!grouped[category]) grouped[category] = [];
          grouped[category].push({ 
            id: card.id, 
            label: card.word, 
            title: card.english || card.pinyin,
            categoryId: card.categoryId,
            rawData: card
          });
        });
        setAllCategories(categories.map(c => c.name));
        console.log('Using localStorage flashcards, IDs:', localFlashcards.map(c => c.id));
      }

      setFlashcardsByCategory(grouped);
      
      // Fetch category statistics if authenticated
      if (currentUser) {
        try {
          const stats = await getFlashcardStatsByCategory(currentUser.id);
          setCategoryStats(stats);
        } catch (statsError) {
          console.error('Error fetching category stats:', statsError);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // On any error, still try to show local data
      const grouped = {};
      const catNameById = categories.reduce((acc, c) => { acc[c.id] = c.name; return acc; }, {});
      (localFlashcards || []).forEach(card => {
        const category = catNameById[card.categoryId] || 'Uncategorized';
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push({ 
          id: card.id, 
          label: card.word, 
          title: card.english || card.pinyin,
          categoryId: card.categoryId,
          rawData: card
        });
      });
      setDataSource('local');
      setFlashcardsByCategory(grouped);
      setAllCategories(categories.map(c => c.name));
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (card, currentCategory) => {
    setEditingCard({ ...card, currentCategory });
    setNewCategory(dataSource === 'db' ? card.folder : card.categoryId);
  };

  const handleCategoryChange = async () => {
    if (!editingCard || !newCategory) return;

    try {
      if (dataSource === 'db' && currentUser) {
        // Update in Supabase
        const { error } = await supabase
          .from('flashcards')
          .update({ folder: newCategory })
          .eq('id', editingCard.id)
          .eq('user_id', currentUser.id);

        if (error) throw error;
      } else {
        // Update in local storage via context
        const categoryId = categories.find(c => c.name === newCategory)?.id;
        if (categoryId && editingCard.rawData) {
          updateFlashcard(editingCard.id, {
            ...editingCard.rawData,
            categoryId
          });
        }
      }

      // Close modal and refresh data
      setEditingCard(null);
      setNewCategory('');
      fetchFlashcardsAndTracking();
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const totalWords = Object.values(flashcardsByCategory).flat().length;
  const flashedWords = flashedEver.size;
  const unflashedWords = totalWords - flashedWords;

  return (
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-1">All Words</h1>
          <p className="text-sm text-slate-500">
            {uiState.isCompact ? 'Compact view for quick scanning' : 'Browse and manage your flashcard collection'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Import Button */}
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-all flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </button>
          
          {/* Export Button */}
          <button
            onClick={() => {
              const flashcardsToExport = dataSource === 'db' ? dbFlashcardsRaw : localFlashcards;
              const csvContent = generateCSVExport(flashcardsToExport);
              downloadCSVFile(csvContent);
            }}
            className="px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          
          <button
            onClick={uiState.isCompact ? uiState.expandAll : uiState.collapseAll}
            className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1"
          >
            {uiState.expandedCategories.size > 0 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span className="hidden sm:inline">{uiState.expandedCategories.size > 0 ? 'Collapse' : 'Expand'}</span>
          </button>
          
          <button
            onClick={() => uiState.setIsCompact(!uiState.isCompact)}
            className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5"
          >
            {uiState.isCompact ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            <span className="hidden sm:inline">{uiState.isCompact ? 'Full' : 'Compact'}</span>
          </button>
        </div>
      </div>

      {totalWords === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No flashcards yet</h3>
          <p className="text-slate-500 mb-6">Go to "Manage Flashcards" to create your first flashcard.</p>
        </div>
      ) : (
        <>
          {/* Search, Filter, Sort Toolbar */}
          <SearchFilterBar
            query={uiState.query}
            onQueryChange={uiState.setQuery}
            selectedCategory={uiState.selectedCategory}
            onCategoryChange={uiState.setSelectedCategory}
            sortBy={uiState.sortBy}
            onSortChange={uiState.setSortBy}
            categories={allCategories}
          />

          {/* Global Progress Bar */}
          <GlobalProgressBar flashedCount={flashedWords} totalCount={totalWords} />

          {/* Category Cards */}
          <div className={uiState.isCompact ? 'space-y-2' : 'space-y-4'}>
            <AnimatePresence mode="popLayout">
              {uiState.filteredAndSortedCategories.map((category, idx) => (
                <CategoryCard
                  key={category}
                  category={category}
                  words={flashcardsByCategory[category]}
                  flashedIds={flashedEver}
                  isExpanded={uiState.expandedCategories.has(category)}
                  onToggle={() => uiState.toggleCategory(category)}
                  isCompact={uiState.isCompact}
                  onEditCard={handleEditClick}
                  filteredWords={uiState.getFilteredWords(flashcardsByCategory[category])}
                  index={idx}
                  userPlan={userPlan}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Summary Stats */}
          <StatsSummary
            categoryCount={Object.keys(flashcardsByCategory).length}
            totalWords={totalWords}
            flashedWords={flashedWords}
            unflashedWords={unflashedWords}
          />
        </>
      )}

      {/* Edit Category Modal */}
      <AnimatePresence>
        {editingCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setEditingCard(null);
                setNewCategory('');
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200"
            >
              <h3 className="text-xl font-bold text-slate-800 mb-4">Change Category</h3>
              
              <div className="mb-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <p className="text-sm text-slate-600 mb-2">
                  Word: <span className="font-semibold text-slate-800">{editingCard.label}</span>
                </p>
                <p className="text-sm text-slate-600">
                  Current: <span className="font-semibold text-slate-800">{editingCard.currentCategory}</span>
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  New Category
                </label>
                {dataSource === 'db' ? (
                  <div className="space-y-2">
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                    >
                      <option value="">Select a category</option>
                      {allCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Or type a new category name"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                ) : (
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                  >
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCategoryChange}
                  disabled={!newCategory}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingCard(null);
                    setNewCategory('');
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-medium"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Modal */}
      <CSVImport
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={() => {
          setShowImportModal(false);
          fetchFlashcardsAndTracking();
        }}
      />
    </div>
  );
};

export default AllWords;
