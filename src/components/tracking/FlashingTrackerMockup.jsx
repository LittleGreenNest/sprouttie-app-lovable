import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2,
  Sparkles,
  TrendingUp,
  ArrowRight,
  Eye,
  Loader2,
  Plus,
  Check,
  Wand2
} from 'lucide-react';

/**
 * UI/UX MOCKUP: Daily Flashing Tracker
 * 
 * Features:
 * 1. Today's Set with day progress (1/5, 2/5, etc.) + Per-set round tracking
 * 2. Skip Day warning for consecutive skips
 * 3. Upcoming Retirements preview
 * 4. AI-Recommended words for queue with selection
 */

const FlashingTrackerMockup = () => {
  const [consecutiveSkips] = useState(1);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());
  
  // Per-set session tracking (like DailyTrackerImproved)
  const [sessions, setSessions] = useState({
    set1: { round1: null, round2: null, round3: null },
    set2: { round1: null, round2: null, round3: null },
  });

  const [familyMember, setFamilyMember] = useState('');
  
  // Mock active sets with cards
  const mockActiveSets = [
    {
      id: 'set1',
      name: 'Fruits Set',
      cards: [
        { id: 1, word: '苹果', pinyin: 'píngguǒ', english: 'Apple', dayCount: 5, isOldest: true },
        { id: 2, word: '香蕉', pinyin: 'xiāngjiāo', english: 'Banana', dayCount: 4 },
        { id: 3, word: '橙子', pinyin: 'chéngzi', english: 'Orange', dayCount: 3 },
        { id: 4, word: '葡萄', pinyin: 'pútao', english: 'Grape', dayCount: 2 },
        { id: 5, word: '西瓜', pinyin: 'xīguā', english: 'Watermelon', dayCount: 1, isNewest: true },
      ]
    },
    {
      id: 'set2',
      name: 'Animals Set',
      cards: [
        { id: 6, word: '小狗', pinyin: 'xiǎo gǒu', english: 'Puppy', dayCount: 3 },
        { id: 7, word: '小猫', pinyin: 'xiǎo māo', english: 'Kitten', dayCount: 3 },
        { id: 8, word: '小鸟', pinyin: 'xiǎo niǎo', english: 'Bird', dayCount: 2 },
        { id: 9, word: '小鱼', pinyin: 'xiǎo yú', english: 'Fish', dayCount: 2 },
        { id: 10, word: '小兔', pinyin: 'xiǎo tù', english: 'Bunny', dayCount: 1, isNewest: true },
      ]
    }
  ];

  // AI-suggested words
  const aiSuggestions = [
    { id: 's1', word: '草莓', pinyin: 'cǎoméi', english: 'Strawberry', reason: 'Follows fruit theme' },
    { id: 's2', word: '芒果', pinyin: 'mángguǒ', english: 'Mango', reason: 'Popular with toddlers' },
    { id: 's3', word: '樱桃', pinyin: 'yīngtáo', english: 'Cherry', reason: 'Simple pronunciation' },
    { id: 's4', word: '蓝莓', pinyin: 'lánméi', english: 'Blueberry', reason: 'Color association' },
    { id: 's5', word: '柠檬', pinyin: 'níngméng', english: 'Lemon', reason: 'Sensory word' },
  ];

  // Cards already in queue (user added)
  const [queueCards, setQueueCards] = useState([
    { id: 'q1', word: '桃子', pinyin: 'táozi', english: 'Peach' },
  ]);

  const rounds = [
    { key: 'round1', label: 'Round 1', icon: '🌱' },
    { key: 'round2', label: 'Round 2', icon: '🌿' },
    { key: 'round3', label: 'Round 3', icon: '🌸' }
  ];

  const toggleRound = (setId, roundNum) => {
    const roundKey = `round${roundNum}`;
    setSessions(prev => {
      const currentRound = prev[setId]?.[roundKey];
      const isCompleted = currentRound?.completed;
      
      return {
        ...prev,
        [setId]: {
          ...prev[setId],
          [roundKey]: isCompleted ? null : {
            completed: true,
            by: familyMember || 'Parent',
            time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          }
        }
      };
    });
  };

  const getSetProgress = (setId) => {
    const setSession = sessions[setId] || {};
    return ['round1', 'round2', 'round3'].filter(r => setSession[r]?.completed).length;
  };

  const handleGetAISuggestions = () => {
    setLoadingAI(true);
    // Simulate AI call
    setTimeout(() => {
      setLoadingAI(false);
      setShowAISuggestions(true);
    }, 1500);
  };

  const toggleSuggestionSelection = (id) => {
    setSelectedSuggestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const addSelectedToQueue = () => {
    const newCards = aiSuggestions
      .filter(s => selectedSuggestions.has(s.id))
      .map(s => ({ id: s.id, word: s.word, pinyin: s.pinyin, english: s.english }));
    
    setQueueCards(prev => [...prev, ...newCards]);
    setSelectedSuggestions(new Set());
    setShowAISuggestions(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header with Today's Status */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-6 border border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-6 h-6 text-primary" />
              Today's Flash Session
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          {/* Streak indicator */}
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">🔥 7</div>
            <div className="text-xs text-muted-foreground">Day Streak</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-background/60 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-foreground">10</div>
            <div className="text-xs text-muted-foreground">Active Cards</div>
          </div>
          <div className="bg-background/60 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-orange-500">1</div>
            <div className="text-xs text-muted-foreground">Retiring Today</div>
          </div>
          <div className="bg-background/60 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-green-500">{queueCards.length}</div>
            <div className="text-xs text-muted-foreground">In Queue</div>
          </div>
        </div>
      </div>

      {/* Family Member Selector */}
      <div className="bg-card rounded-xl border border-border p-4">
        <label className="block text-sm font-medium text-foreground mb-2">
          👤 Who is flashing today?
        </label>
        <input
          type="text"
          value={familyMember}
          onChange={(e) => setFamilyMember(e.target.value)}
          placeholder="Enter your name..."
          className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
        />
      </div>

      {/* Consecutive Skip Warning */}
      <AnimatePresence>
        {consecutiveSkips >= 2 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  {consecutiveSkips} days skipped this week
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                  Research shows 3+ consecutive missed days causes 20-40% recall decrease. 
                  Try a quick 2-minute session to maintain momentum!
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Sets with Per-Set Round Tracking */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          Today's Sets
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {mockActiveSets.length} sets • 3 rounds each
          </span>
        </h2>

        {mockActiveSets.map((set) => {
          const progress = getSetProgress(set.id);
          const setSession = sessions[set.id] || {};
          
          return (
            <div 
              key={set.id}
              className="bg-card rounded-2xl border border-border p-5 shadow-sm"
            >
              {/* Set Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{set.name}</h3>
                  <p className="text-sm text-muted-foreground">{set.cards.length} cards</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-primary">{progress}/3 rounds</div>
                  <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(progress / 3) * 100}%` }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* Round Chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {rounds.map((round) => {
                  const roundData = setSession[round.key];
                  const isCompleted = roundData?.completed;
                  
                  return (
                    <motion.button
                      key={round.key}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleRound(set.id, parseInt(round.key.replace('round', '')))}
                      className={`
                        px-4 py-2 rounded-full border-2 font-medium text-sm
                        transition-all duration-200 shadow-sm hover:shadow-md
                        flex items-center gap-2
                        ${isCompleted 
                          ? 'bg-gradient-to-r from-green-100 to-green-200 border-green-400 text-green-800 dark:from-green-900/30 dark:to-green-800/30 dark:border-green-600 dark:text-green-300' 
                          : 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-300 text-amber-700 hover:border-amber-400 dark:from-amber-900/20 dark:to-amber-800/20 dark:border-amber-600 dark:text-amber-300'
                        }
                      `}
                    >
                      <span className="text-lg">{isCompleted ? round.icon : '○'}</span>
                      <span>{round.label}</span>
                      {isCompleted && roundData?.by && (
                        <span className="text-xs opacity-75">
                          by {roundData.by}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Cards in Set (Collapsible preview) */}
              <div className="flex flex-wrap gap-2">
                {set.cards.map((card) => (
                  <div 
                    key={card.id}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm flex items-center gap-2
                      ${card.isOldest 
                        ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700' 
                        : card.isNewest
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700'
                          : 'bg-secondary text-secondary-foreground'
                      }
                    `}
                  >
                    <span className="font-medium">{card.word}</span>
                    <span className="text-xs opacity-70">Day {card.dayCount}/5</span>
                    {card.isOldest && <span className="text-xs">🏁</span>}
                    {card.isNewest && <span className="text-xs">🌱</span>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upcoming Retirements */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 rounded-2xl border border-orange-200 dark:border-orange-800 p-6">
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-orange-500" />
          Upcoming Retirements
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          These cards have completed their 5-day cycle and will retire after today's session
        </p>
        
        <div className="flex items-center gap-4 p-4 bg-white dark:bg-background/50 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <span className="text-2xl">🏁</span>
          </div>
          <div className="flex-1">
            <div className="font-bold text-foreground text-xl">苹果</div>
            <div className="text-sm text-muted-foreground">píngguǒ • Apple</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-orange-600 dark:text-orange-400">Day 5/5</div>
            <div className="text-xs text-muted-foreground">Flashed 15 times</div>
          </div>
        </div>
      </div>

      {/* Next in Queue with AI Recommendations */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-2xl border border-green-200 dark:border-green-800 p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Next in Queue
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {queueCards.length} cards waiting
            </span>
          </h2>
          
          {!showAISuggestions && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGetAISuggestions}
              disabled={loadingAI}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-primary/25 transition-all"
            >
              {loadingAI ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Getting suggestions...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Get AI Suggestions
                </>
              )}
            </motion.button>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          These cards will enter rotation when a card retires
        </p>

        {/* Current Queue */}
        {queueCards.length > 0 && (
          <div className="space-y-2 mb-4">
            {queueCards.map((card, index) => (
              <div 
                key={card.id}
                className="flex items-center gap-3 p-3 bg-white dark:bg-background/50 rounded-xl"
              >
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-sm font-bold text-green-600">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <span className="font-medium text-foreground">{card.word}</span>
                  <span className="text-sm text-muted-foreground ml-2">{card.pinyin} • {card.english}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}

        {queueCards.length === 0 && !showAISuggestions && (
          <div className="text-center py-6 text-muted-foreground">
            <p>No cards in queue. Click "Get AI Suggestions" to add some!</p>
          </div>
        )}

        {/* AI Suggestions Panel */}
        <AnimatePresence>
          {showAISuggestions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <div className="bg-white dark:bg-background/80 rounded-xl border border-primary/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    AI Recommended Words
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Based on your teaching method & progress
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {aiSuggestions.map((suggestion) => {
                    const isSelected = selectedSuggestions.has(suggestion.id);
                    const isAlreadyInQueue = queueCards.some(q => q.word === suggestion.word);
                    
                    return (
                      <motion.button
                        key={suggestion.id}
                        whileHover={{ scale: isAlreadyInQueue ? 1 : 1.01 }}
                        whileTap={{ scale: isAlreadyInQueue ? 1 : 0.99 }}
                        onClick={() => !isAlreadyInQueue && toggleSuggestionSelection(suggestion.id)}
                        disabled={isAlreadyInQueue}
                        className={`
                          w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left
                          ${isAlreadyInQueue 
                            ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed' 
                            : isSelected 
                              ? 'bg-primary/10 border-primary' 
                              : 'bg-background border-border hover:border-primary/50'
                          }
                        `}
                      >
                        <div className={`
                          w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                          ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'}
                        `}>
                          {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-lg">{suggestion.word}</span>
                            <span className="text-sm text-muted-foreground">{suggestion.pinyin}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">{suggestion.english}</div>
                        </div>
                        
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs text-primary font-medium">{suggestion.reason}</div>
                          {isAlreadyInQueue && (
                            <div className="text-xs text-muted-foreground">Already in queue</div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={addSelectedToQueue}
                    disabled={selectedSuggestions.size === 0}
                    className={`
                      flex-1 px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all
                      ${selectedSuggestions.size > 0 
                        ? 'bg-primary text-primary-foreground hover:shadow-lg' 
                        : 'bg-secondary text-muted-foreground cursor-not-allowed'
                      }
                    `}
                  >
                    <Plus className="w-4 h-4" />
                    Add {selectedSuggestions.size > 0 ? `${selectedSuggestions.size} ` : ''}to Queue
                  </motion.button>
                  
                  <button
                    onClick={() => {
                      setShowAISuggestions(false);
                      setSelectedSuggestions(new Set());
                    }}
                    className="px-4 py-3 bg-secondary text-secondary-foreground rounded-xl font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Research Note */}
      <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-200 dark:border-blue-800 p-6">
        <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
          📚 The Science Behind 5-Day Cycles
        </h3>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">•</span>
            <span><strong>Optimal exposure:</strong> 3x daily for 1-2 seconds per card maintains peak engagement</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">•</span>
            <span><strong>Skip tolerance:</strong> 1-2 missed days have minimal impact, but 3+ consecutive days cause 20-40% recall decrease</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">•</span>
            <span><strong>Neural pathways:</strong> Consistent reinforcement during first 5-7 exposures strengthens long-term memory</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default FlashingTrackerMockup;
