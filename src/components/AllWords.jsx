import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../context/AuthContext';

const AllWords = () => {
  const { currentUser } = useAuth();
  const [flashcardsByCategory, setFlashcardsByCategory] = useState({});
  const [flashedEver, setFlashedEver] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      fetchFlashcardsAndTracking();
    }
  }, [currentUser]);

  const fetchFlashcardsAndTracking = async () => {
    try {
      setLoading(true);
      
      // Fetch all flashcards
      const { data: flashcards, error: flashcardsError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', currentUser.uid)
        .order('folder', { ascending: true })
        .order('front', { ascending: true });

      if (flashcardsError) throw flashcardsError;

      // Fetch all tracking data (ever flashed)
      const { data: tracking, error: trackingError } = await supabase
        .from('daily_tracking')
        .select('flashcard_id')
        .eq('user_id', currentUser.uid)
        .eq('status', 'flashed');

      if (trackingError) throw trackingError;

      // Create a set of ever-flashed flashcard IDs
      const flashedIds = new Set(tracking?.map(t => t.flashcard_id) || []);
      setFlashedEver(flashedIds);

      // Group flashcards by category (folder)
      const grouped = {};
      flashcards?.forEach(card => {
        const category = card.folder || 'Uncategorized';
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(card);
      });

      setFlashcardsByCategory(grouped);
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const categories = Object.keys(flashcardsByCategory).sort();

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

        {categories.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No flashcards yet.</p>
            <p className="mt-2">Go to "Manage Flashcards" to create your first flashcard.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {categories.map(category => (
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
                        title={`${card.front}\n${card.back}`}
                      >
                        <div className="truncate font-medium">{card.front}</div>
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
      {categories.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-green-800 mb-4">Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded">
              <div className="text-3xl font-bold text-blue-600">{categories.length}</div>
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
