import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../context/AuthContext';
import { useFlashcards } from '../context/FlashcardContext';
import { cardIdFrom } from '../utils/cardId';
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
        const cardId = cardIdFrom(t.flashcard_id);
        if (!cardId) return;
        const existingDate = flashedMap.get(cardId);
        if (!existingDate || t.date > existingDate) {
          flashedMap.set(cardId, t.date);
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

  const generateBingoCardsPDF = async () => {
    if (selectedWords.size < wordsNeeded) {
      toast.error(`Please select ${wordsNeeded} words for a ${gridSize}×${gridSize} bingo card`);
      return;
    }

    const selectedFlashcards = availableFlashcards.filter(card => selectedWords.has(card.id));
    
    try {
      // Create multiple bingo cards with different random arrangements
      const numberOfCards = 6;
      const doc = new jsPDF();
      
      // Load Noto Sans SC font for Chinese character support
      const fontUrl = '/fonts/NotoSansSC-Regular.ttf';
      const response = await fetch(fontUrl);
      const fontBlob = await response.blob();
      const fontBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(fontBlob);
      });
      
      // Add the font to jsPDF
      doc.addFileToVFS('NotoSansSC-Regular.ttf', fontBase64);
      doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal');
      
      for (let cardIndex = 0; cardIndex < numberOfCards; cardIndex++) {
        if (cardIndex > 0) {
          doc.addPage();
        }

        // Shuffle the selected words for this card
        const shuffled = [...selectedFlashcards].sort(() => Math.random() - 0.5);
        
        // Draw title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text('Bingo Card', 105, 20, { align: 'center' });
        
        // Card dimensions
        const startX = 20;
        const startY = 40;
        const cellSize = 170 / gridSize;
        
        for (let row = 0; row < gridSize; row++) {
          for (let col = 0; col < gridSize; col++) {
            const x = startX + col * cellSize;
            const y = startY + row * cellSize;
            const index = row * gridSize + col;
            const card = shuffled[index];
            
            // Draw cell border
            doc.setDrawColor(0);
            doc.setLineWidth(0.5);
            doc.rect(x, y, cellSize, cellSize);
            
            // Draw Chinese text
            doc.setFont('NotoSansSC', 'normal');
            doc.setFontSize(Math.max(16, 28 - gridSize * 3));
            const chineseText = card.front || '';
            doc.text(chineseText, x + cellSize / 2, y + cellSize / 2 - 3, { 
              align: 'center',
              maxWidth: cellSize - 6
            });
            
            // Draw English translation
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(Math.max(8, 11 - gridSize));
            const englishText = card.back || '';
            doc.text(englishText, x + cellSize / 2, y + cellSize / 2 + 8, { 
              align: 'center',
              maxWidth: cellSize - 6
            });
          }
        }
        
        // Add card number at bottom
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Card ${cardIndex + 1} of ${numberOfCards}`, 105, 280, { align: 'center' });
      }
      
      doc.save('bingo-cards.pdf');
      
      // Log activity (fire and forget)
      import('@/utils/activityLogger').then(({ logActivity, ACTIVITY_TYPES }) => {
        logActivity(
          ACTIVITY_TYPES.BINGO_GENERATED,
          `Generated ${numberOfCards} bingo card${numberOfCards !== 1 ? 's' : ''} (${gridSize}×${gridSize})`,
          { count: numberOfCards, gridSize, wordsCount: selectedWords.size }
        );
      });
      
      toast.success('Bingo cards PDF generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
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
  const selectedFlashcards = availableFlashcards.filter(card => selectedWords.has(card.id));

  return (
    <div className="space-y-6">
      {/* Selection Counter Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl shadow-lg p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">🎯 Bingo Card Generator</h2>
            <p className="text-blue-100">Create custom bingo cards from your flashcards</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{selectedWords.size}/{wordsNeeded}</div>
            <div className="text-sm text-blue-100">words selected</div>
          </div>
        </div>
        
        {/* Progress Ring */}
        <div className="mt-4 w-full bg-blue-400/30 rounded-full h-3 overflow-hidden">
          <motion.div
            className="h-full bg-white rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(selectedWords.size / wordsNeeded) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </motion.div>
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

      {/* Mini Preview Section */}
      {selectedWords.size > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl shadow-md p-6 border-2 border-purple-200"
        >
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>👁️</span> Preview Grid ({gridSize}×{gridSize})
          </h3>
          
          <div 
            className="grid gap-2 max-w-md mx-auto"
            style={{ 
              gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            }}
          >
            {Array.from({ length: wordsNeeded }).map((_, idx) => {
              const card = selectedFlashcards[idx];
              return (
                <motion.div
                  key={idx}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center p-2 text-center ${
                    card 
                      ? 'bg-white border-purple-400 shadow-sm' 
                      : 'bg-gray-100 border-dashed border-gray-300'
                  }`}
                >
                  {card ? (
                    <>
                      <div className="font-bold text-gray-900 text-xs truncate w-full">{card.front}</div>
                      <div className="text-[10px] text-gray-600 truncate w-full mt-1">{card.back}</div>
                    </>
                  ) : (
                    <span className="text-gray-400 text-2xl">?</span>
                  )}
                </motion.div>
              );
            })}
          </div>
          
          {selectedWords.size < wordsNeeded && (
            <p className="text-center mt-4 text-sm text-gray-600">
              Select {wordsNeeded - selectedWords.size} more word{wordsNeeded - selectedWords.size !== 1 ? 's' : ''} to complete the grid
            </p>
          )}
        </motion.div>
      )}

      {/* Word Selection Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          Select Words
        </h3>
        
        {filteredFlashcards.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No flashcards available in this category.</p>
            <p className="mt-2">Go to "Manage Flashcards" to create flashcards.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredFlashcards.map((card, idx) => (
                <motion.label
                  key={card.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: idx * 0.02 }}
                  className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    selectedWords.has(card.id)
                      ? 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-500 shadow-md scale-105'
                      : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-sm'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <input
                    type="checkbox"
                    checked={selectedWords.has(card.id)}
                    onChange={() => toggleWordSelection(card.id)}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                      {card.front}
                      {selectedWords.has(card.id) && (
                        <motion.span
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className="text-blue-600"
                        >
                          ✓
                        </motion.span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">({card.back})</div>
                    {selectedWords.has(card.id) && (
                      <div className="text-xs text-blue-600 font-medium mt-1">
                        Position: {Array.from(selectedWords).indexOf(card.id) + 1}
                      </div>
                    )}
                  </div>
                </motion.label>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <motion.button
        onClick={generateBingoCardsPDF}
        disabled={selectedWords.size < wordsNeeded}
        className={`w-full py-6 rounded-xl text-white font-bold text-xl transition-all shadow-lg ${
          selectedWords.size < wordsNeeded
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
        }`}
        whileHover={selectedWords.size >= wordsNeeded ? { scale: 1.02, y: -2 } : {}}
        whileTap={selectedWords.size >= wordsNeeded ? { scale: 0.98 } : {}}
      >
        <div className="flex items-center justify-center gap-3">
          <span className="text-3xl">📥</span>
          <span>Generate Bingo Cards PDF</span>
          {selectedWords.size >= wordsNeeded && <span className="text-3xl">✨</span>}
        </div>
      </motion.button>
    </div>
  );
};

export default BingoCardGenerator;
