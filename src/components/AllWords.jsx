import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../context/AuthContext';
import { useFlashcards } from '../context/FlashcardContext';

const AllWords = () => {
  const { currentUser } = useAuth();
  const { categories, flashcards: localFlashcards } = useFlashcards();
  const [flashcardsByCategory, setFlashcardsByCategory] = useState({});
  const [flashedEver, setFlashedEver] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('db'); // 'db' | 'local'

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
        groupedLocal[category].push({ id: card.id, label: card.word, title: card.english || card.pinyin });
      });
      setDataSource('local');
      setFlashcardsByCategory(groupedLocal);
      setFlashedEver(new Set());
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
      setFlashedEver(flashedIds);

      // Group flashcards by category
      const grouped = {};

      if (dbFlashcards && dbFlashcards.length > 0) {
        setDataSource('db');
        dbFlashcards.forEach(card => {
          const category = card.folder || 'Uncategorized';
          if (!grouped[category]) grouped[category] = [];
          grouped[category].push({ id: card.id, label: card.front, title: card.back });
        });
      } else {
        // Fallback to local flashcards (from context)
        setDataSource('local');
        const catNameById = categories.reduce((acc, c) => { acc[c.id] = c.name; return acc; }, {});
        (localFlashcards || []).forEach(card => {
          const category = catNameById[card.categoryId] || 'Uncategorized';
          if (!grouped[category]) grouped[category] = [];
          grouped[category].push({ id: card.id, label: card.word, title: card.english || card.pinyin });
        });
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
        grouped[category].push({ id: card.id, label: card.word, title: card.english || card.pinyin });
      });
      setDataSource('local');
      setFlashcardsByCategory(grouped);
    } finally {
      setLoading(false);
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
                        className={`p-2 rounded border-2 text-sm transition-colors ${
                          isFlashed
                            ? 'bg-green-100 border-green-300 text-green-900'
                            : 'bg-white border-gray-300 text-gray-800'
                        }`}
                        title={card.title || ''}
                      >
                        <div className="truncate font-medium">{card.label}</div>
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
    </div>
  );
};

export default AllWords;
