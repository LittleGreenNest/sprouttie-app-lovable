import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../context/AuthContext';
import { useFlashcards } from '../context/FlashcardContext';

const AllWords = () => {
  const { currentUser } = useAuth();
  const { categories, flashcards: localFlashcards, updateFlashcard } = useFlashcards();
  const [flashcardsByCategory, setFlashcardsByCategory] = useState({});
  const [flashedEver, setFlashedEver] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('db'); // 'db' | 'local'
  const [editingCard, setEditingCard] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [allCategories, setAllCategories] = useState([]);

  useEffect(() => {
    fetchFlashcardsAndTracking();
  }, [currentUser, localFlashcards, categories]);

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

      // Fetch all tracking data (ever flashed) from backend
      const { data: tracking, error: trackingError } = await supabase
        .from('daily_tracking')
        .select('flashcard_id')
        .eq('user_id', currentUser.id)
        .eq('status', 'flashed');

      if (trackingError) throw trackingError;

      // Create a set of ever-flashed flashcard IDs
      const flashedIds = new Set(tracking?.map(t => t.flashcard_id) || []);
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const categoryNames = Object.keys(flashcardsByCategory).sort();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-green-800">All Words</h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span>Flashed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
              <span>Not Flashed</span>
            </div>
          </div>
        </div>

        {categoryNames.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No flashcards yet.</p>
            <p className="mt-2">Go to "Manage Flashcards" to create your first flashcard.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {categoryNames.map(category => (
              <div key={category} className="space-y-2">
                {/* Category Header */}
                <div className="bg-yellow-200 border-2 border-yellow-400 rounded p-2 text-center">
                  <h3 className="font-bold text-gray-800 text-sm uppercase truncate" title={category}>
                    {category}
                  </h3>
                  <div className="text-xs text-gray-600 mt-1">
                    {flashcardsByCategory[category].filter(c => flashedEver.has(c.id)).length}/{flashcardsByCategory[category].length}
                  </div>
                </div>

                {/* Flashcards in this category */}
                <div className="space-y-1">
                  {flashcardsByCategory[category].map(card => {
                    const isFlashed = flashedEver.has(card.id);
                    return (
                      <div
                        key={card.id}
                        className={`p-2 rounded border-2 text-sm transition-colors relative group ${
                          isFlashed
                            ? 'bg-green-100 border-green-300 text-green-900'
                            : 'bg-white border-gray-300 text-gray-800'
                        }`}
                        title={card.title || ''}
                      >
                        <div className="truncate font-medium pr-6">{card.label}</div>
                        <button
                          onClick={() => handleEditClick(card, category)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                          title="Edit category"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {categoryNames.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-green-800 mb-4">Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded">
              <div className="text-3xl font-bold text-blue-600">{categoryNames.length}</div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded">
              <div className="text-3xl font-bold text-purple-600">
                {Object.values(flashcardsByCategory).flat().length}
              </div>
              <div className="text-sm text-gray-600">Total Words</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded">
              <div className="text-3xl font-bold text-green-600">{flashedEver.size}</div>
              <div className="text-sm text-gray-600">Ever Flashed</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded">
              <div className="text-3xl font-bold text-orange-600">
                {Object.values(flashcardsByCategory).flat().length - flashedEver.size}
              </div>
              <div className="text-sm text-gray-600">Never Flashed</div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Change Category</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Word: <span className="font-semibold">{editingCard.label}</span>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Current: <span className="font-semibold">{editingCard.currentCategory}</span>
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Category
              </label>
              {dataSource === 'db' ? (
                <div className="space-y-2">
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              ) : (
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingCard(null);
                  setNewCategory('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllWords;
