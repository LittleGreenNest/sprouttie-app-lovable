import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { useFlashcards } from '../../context/FlashcardContext';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

const FlashedWordsGrid = () => {
  const { currentUser } = useAuth();
  const { sets, flashcards, getFlashcardsForSet } = useFlashcards();
  const [flashedWordsBySet, setFlashedWordsBySet] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedSets, setExpandedSets] = useState(new Set());

  useEffect(() => {
    if (currentUser) {
      loadFlashedWords();
    }
  }, [currentUser, sets, flashcards]);

  const loadFlashedWords = async () => {
    try {
      setLoading(true);
      
      // Fetch all flashed words for this user
      const { data: trackingData, error } = await supabase
        .from('daily_tracking')
        .select('flashcard_id, date')
        .eq('user_id', currentUser.id)
        .eq('status', 'flashed')
        .order('date', { ascending: false });

      if (error) throw error;

      // Get unique flashed flashcard IDs
      const flashedIds = new Set(
        trackingData
          .map(t => t.flashcard_id)
          .filter(id => id && !id.startsWith('set-') && id !== 'shared-note')
      );

      // Group flashed words by their sets
      const wordsBySet = {};
      
      sets.forEach(set => {
        const setFlashcards = getFlashcardsForSet(set.id);
        const flashedInSet = setFlashcards.filter(card => flashedIds.has(card.id));
        
        if (flashedInSet.length > 0) {
          wordsBySet[set.id] = {
            setNumber: set.id,
            setName: set.name || `Set ${set.id}`,
            words: flashedInSet,
            totalWords: setFlashcards.length
          };
        }
      });

      setFlashedWordsBySet(wordsBySet);
    } catch (error) {
      console.error('Error loading flashed words:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSet = (setId) => {
    const newExpanded = new Set(expandedSets);
    if (newExpanded.has(setId)) {
      newExpanded.delete(setId);
    } else {
      newExpanded.add(setId);
    }
    setExpandedSets(newExpanded);
  };

  if (loading) {
    return (
      <div className="glass rounded-3xl p-8 shadow-xl border border-white/50">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sprouttie-green"></div>
        </div>
      </div>
    );
  }

  const totalFlashed = Object.values(flashedWordsBySet).reduce(
    (sum, set) => sum + set.words.length,
    0
  );

  if (totalFlashed === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-8 shadow-xl border border-white/50"
      >
        <h2 className="text-2xl font-bold text-sprouttie-green-dark mb-4">
          📚 Flashed Words Progress
        </h2>
        <div className="text-center py-12">
          <p className="text-lg text-gray-600">
            Start flashing cards to see your progress here! 🌱
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-3xl p-8 shadow-xl border border-white/50"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-sprouttie-green-dark">
          📚 Flashed Words Progress
        </h2>
        <div className="bg-sprouttie-green-light/30 px-4 py-2 rounded-xl">
          <span className="text-sm font-semibold text-sprouttie-green-dark">
            {totalFlashed} words flashed
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(flashedWordsBySet).map(([setId, setData], index) => {
          const isExpanded = expandedSets.has(setId);
          const progressPercent = Math.round((setData.words.length / setData.totalWords) * 100);
          
          return (
            <motion.div
              key={setId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-md border-2 border-sprouttie-beige overflow-hidden"
            >
              {/* Set Header */}
              <button
                onClick={() => toggleSet(setId)}
                className="w-full px-4 py-3 bg-gradient-to-r from-sprouttie-beige to-sprouttie-cream hover:from-sprouttie-beige-dark hover:to-sprouttie-beige transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-sprouttie-green-dark">
                    {setData.setName}
                  </span>
                  <span className="text-xs bg-white px-2 py-1 rounded-full text-gray-600 font-medium">
                    {setData.words.length}/{setData.totalWords}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-sprouttie-green-dark" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-sprouttie-green-dark" />
                )}
              </button>

              {/* Progress Bar */}
              <div className="px-4 py-2 bg-gray-50">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="h-full bg-gradient-to-r from-sprouttie-green to-sprouttie-green-light"
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1 text-center">
                  {progressPercent}% complete
                </p>
              </div>

              {/* Words List */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 py-3 space-y-2 max-h-96 overflow-y-auto">
                      {setData.words.map((word, idx) => (
                        <motion.div
                          key={word.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center gap-2 p-2 bg-sprouttie-mint/30 rounded-lg hover:bg-sprouttie-mint/50 transition-colors"
                        >
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-sprouttie-green flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 truncate">
                              {word.front}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {word.back}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default FlashedWordsGrid;
