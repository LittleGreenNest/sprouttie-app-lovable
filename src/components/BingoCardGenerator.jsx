import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../context/AuthContext';
import { useFlashcards } from '../context/FlashcardContext';
import jsPDF from 'jspdf';
import { toast } from 'react-toastify';

const BingoCardGenerator = () => {
  const { currentUser } = useAuth();
  const { categories, flashcards: localFlashcards } = useFlashcards();
  const [gridSize, setGridSize] = useState(3); // 3, 4, or 5
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'week', 'month'
  const [availableFlashcards, setAvailableFlashcards] = useState([]);
  const [flashedInTimeRange, setFlashedInTimeRange] = useState(new Set());
  const [selectedWords, setSelectedWords] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const wordsNeeded = gridSize * gridSize;

  useEffect(() => {
    fetchFlashcards();
    fetchTrackingData();
  }, [currentUser, localFlashcards, categories]);

  const fetchTrackingData = async () => {
    if (!currentUser) return;

    try {
      // Calculate dates for past week and month
      const now = new Date();
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(now.getDate() - 7);
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(now.getMonth() - 1);

      // Fetch tracking data for the past month (covers both week and month)
      const { data: tracking, error } = await supabase
        .from('daily_tracking')
        .select('flashcard_id, date')
        .eq('user_id', currentUser.id)
        .eq('status', 'flashed')
        .gte('date', oneMonthAgo.toISOString().split('T')[0]);

      if (error) throw error;

      // Store the flashed flashcard IDs with their most recent date
      const flashedMap = new Map();
      (tracking || []).forEach(t => {
        const existingDate = flashedMap.get(t.flashcard_id);
        if (!existingDate || t.date > existingDate) {
          flashedMap.set(t.flashcard_id, t.date);
        }
      });

      setFlashedInTimeRange(flashedMap);
    } catch (error) {
      console.error('Error fetching tracking data:', error);
    }
  };

  const fetchFlashcards = async () => {
    setLoading(true);
    
    if (!currentUser) {
      // Use local flashcards
      const catNameById = categories.reduce((acc, c) => { acc[c.id] = c.name; return acc; }, {});
      const formatted = (localFlashcards || []).map(card => ({
        id: card.id,
        front: card.word,
        back: card.english || card.pinyin || '',
        category: catNameById[card.categoryId] || 'Uncategorized'
      }));
      setAvailableFlashcards(formatted);
      setLoading(false);
      return;
    }

    try {
      const { data: dbFlashcards, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('folder', { ascending: true })
        .order('front', { ascending: true });

      if (error) throw error;

      if (dbFlashcards && dbFlashcards.length > 0) {
        const formatted = dbFlashcards.map(card => ({
          id: card.id,
          front: card.front,
          back: card.back,
          category: card.folder || 'Uncategorized'
        }));
        setAvailableFlashcards(formatted);
      } else {
        // Fallback to local
        const catNameById = categories.reduce((acc, c) => { acc[c.id] = c.name; return acc; }, {});
        const formatted = (localFlashcards || []).map(card => ({
          id: card.id,
          front: card.word,
          back: card.english || card.pinyin || '',
          category: catNameById[card.categoryId] || 'Uncategorized'
        }));
        setAvailableFlashcards(formatted);
      }
    } catch (error) {
      console.error('Error fetching flashcards:', error);
      toast.error('Failed to load flashcards');
    } finally {
      setLoading(false);
    }
  };

  const toggleWordSelection = (wordId) => {
    const newSelected = new Set(selectedWords);
    if (newSelected.has(wordId)) {
      newSelected.delete(wordId);
    } else {
      if (newSelected.size >= wordsNeeded) {
        toast.warning(`You can only select ${wordsNeeded} words for a ${gridSize}×${gridSize} grid`);
        return;
      }
      newSelected.add(wordId);
    }
    setSelectedWords(newSelected);
  };

  const getFilteredFlashcards = () => {
    let filtered = availableFlashcards;

    // Apply time filter
    if (timeFilter !== 'all' && currentUser) {
      const now = new Date();
      const cutoffDate = new Date(now);
      
      if (timeFilter === 'week') {
        cutoffDate.setDate(now.getDate() - 7);
      } else if (timeFilter === 'month') {
        cutoffDate.setMonth(now.getMonth() - 1);
      }

      const cutoffString = cutoffDate.toISOString().split('T')[0];
      
      filtered = filtered.filter(card => {
        const lastFlashedDate = flashedInTimeRange.get(card.id);
        return lastFlashedDate && lastFlashedDate >= cutoffString;
      });
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(card => card.category === selectedCategory);
    }

    return filtered;
  };

  const getUniqueCategories = () => {
    const cats = [...new Set(availableFlashcards.map(card => card.category))];
    return cats.sort();
  };

  const generateBingoCardsPDF = () => {
    if (selectedWords.size < wordsNeeded) {
      toast.error(`Please select ${wordsNeeded} words for a ${gridSize}×${gridSize} bingo card`);
      return;
    }

    const selectedFlashcards = availableFlashcards.filter(card => selectedWords.has(card.id));
    
    // Create multiple bingo cards with different random arrangements
    const numberOfCards = 6; // Generate 6 different bingo cards
    const doc = new jsPDF();
    
    for (let cardIndex = 0; cardIndex < numberOfCards; cardIndex++) {
      if (cardIndex > 0) {
        doc.addPage();
      }

      // Shuffle the selected words for this card
      const shuffled = [...selectedFlashcards].sort(() => Math.random() - 0.5);
      
      // Draw title
      doc.setFontSize(18);
      doc.text('Bingo Card', 105, 20, { align: 'center' });
      
      // Card dimensions
      const startX = 20;
      const startY = 35;
      const cellSize = 170 / gridSize;
      
      // Draw grid
      doc.setFontSize(10);
      
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const x = startX + col * cellSize;
          const y = startY + row * cellSize;
          const index = row * gridSize + col;
          const card = shuffled[index];
          
          // Draw cell border
          doc.rect(x, y, cellSize, cellSize);
          
          // Draw text (Chinese character)
          doc.setFontSize(Math.max(12, 24 - gridSize * 2));
          const text = card.front;
          doc.text(text, x + cellSize / 2, y + cellSize / 2 - 5, { 
            align: 'center',
            maxWidth: cellSize - 4
          });
          
          // Draw translation
          doc.setFontSize(Math.max(7, 10 - gridSize));
          doc.text(card.back, x + cellSize / 2, y + cellSize / 2 + 5, { 
            align: 'center',
            maxWidth: cellSize - 4
          });
        }
      }
      
      // Add card number at bottom
      doc.setFontSize(10);
      doc.text(`Card ${cardIndex + 1} of ${numberOfCards}`, 105, 280, { align: 'center' });
    }
    
    doc.save('bingo-cards.pdf');
    toast.success('Bingo cards PDF generated successfully!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const filteredFlashcards = getFilteredFlashcards();
  const uniqueCategories = getUniqueCategories();

  return (
    <div className="space-y-6">
      {/* Settings Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Bingo Card Settings</h3>
        
        {/* Grid Size Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Grid Size</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="gridSize"
                value="3"
                checked={gridSize === 3}
                onChange={() => {
                  setGridSize(3);
                  setSelectedWords(new Set());
                }}
                className="w-4 h-4 text-blue-600"
              />
              <span>3×3 (9 words)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="gridSize"
                value="4"
                checked={gridSize === 4}
                onChange={() => {
                  setGridSize(4);
                  setSelectedWords(new Set());
                }}
                className="w-4 h-4 text-blue-600"
              />
              <span>4×4 (16 words)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="gridSize"
                value="5"
                checked={gridSize === 5}
                onChange={() => {
                  setGridSize(5);
                  setSelectedWords(new Set());
                }}
                className="w-4 h-4 text-blue-600"
              />
              <span>5×5 (25 words)</span>
            </label>
          </div>
        </div>

        {/* Time Range Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Filter by Time</label>
          <div className="flex gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="timeFilter"
                value="all"
                checked={timeFilter === 'all'}
                onChange={() => setTimeFilter('all')}
                className="w-4 h-4 text-blue-600"
              />
              <span>All Words</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="timeFilter"
                value="week"
                checked={timeFilter === 'week'}
                onChange={() => setTimeFilter('week')}
                className="w-4 h-4 text-blue-600"
              />
              <span>Flashed in Past Week</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="timeFilter"
                value="month"
                checked={timeFilter === 'month'}
                onChange={() => setTimeFilter('month')}
                className="w-4 h-4 text-blue-600"
              />
              <span>Flashed in Past Month</span>
            </label>
          </div>
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 z-10 relative"
          >
            <option value="all">All Categories</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Word Selection Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          Select Words ({selectedWords.size} / {wordsNeeded} needed)
        </h3>
        
        {filteredFlashcards.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No flashcards available in this category.</p>
            <p className="mt-2">Go to "Manage Flashcards" to create flashcards.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFlashcards.map(card => (
              <label
                key={card.id}
                className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedWords.has(card.id)
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-white border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedWords.has(card.id)}
                  onChange={() => toggleWordSelection(card.id)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{card.front}</div>
                  <div className="text-sm text-gray-600">({card.back})</div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Generate Button */}
      <button
        onClick={generateBingoCardsPDF}
        disabled={selectedWords.size < wordsNeeded}
        className={`w-full py-4 rounded-lg text-white font-medium text-lg transition-colors ${
          selectedWords.size < wordsNeeded
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        📥 Generate Bingo Cards PDF
      </button>
    </div>
  );
};

export default BingoCardGenerator;
