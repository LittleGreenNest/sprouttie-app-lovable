import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  RotateCcw, 
  AlertTriangle, 
  Sparkles,
  ArrowRight,
  Eye,
  Loader2,
  Plus,
  Check,
  Wand2,
  Lightbulb,
  ArrowDownRight
} from 'lucide-react';

/**
 * UI/UX MOCKUP: Daily Flashing Tracker
 * 
 * Features:
 * 1. Today's Set with day progress (1/5, 2/5, etc.) + Per-set round tracking
 * 2. Skip Day warning for consecutive skips
 * 3. Upcoming Retirements with clear "Up Next" replacement flow
 * 4. Separate "Discover Words" section for AI + manual entry
 */

const FlashingTrackerMockup = () => {
  const [consecutiveSkips] = useState(1);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualWord, setManualWord] = useState({ word: '', pinyin: '', english: '', set: 'set1' });
  
  // Per-set session tracking
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
      theme: 'fruits',
      cards: [
        { id: 1, word: '苹果', pinyin: 'píngguǒ', english: 'Apple', dayCount: 5, isOldest: true },
        { id: 2, word: '香蕉', pinyin: 'xiāngjiāo', english: 'Banana', dayCount: 4 },
        { id: 3, word: '橙子', pinyin: 'chéngzi', english: 'Orange', dayCount: 3 },
        { id: 4, word: '葡萄', pinyin: 'pútao', english: 'Grape', dayCount: 2 },
        { id: 5, word: '西瓜', pinyin: 'xīguā', english: 'Watermelon', dayCount: 1, isNewest: true },
      ],
      upNext: { word: '桃子', pinyin: 'táozi', english: 'Peach' }
    },
    {
      id: 'set2',
      name: 'Animals Set',
      theme: 'animals',
      cards: [
        { id: 6, word: '小狗', pinyin: 'xiǎo gǒu', english: 'Puppy', dayCount: 5, isOldest: true },
        { id: 7, word: '小猫', pinyin: 'xiǎo māo', english: 'Kitten', dayCount: 4 },
        { id: 8, word: '小鸟', pinyin: 'xiǎo niǎo', english: 'Bird', dayCount: 3 },
        { id: 9, word: '小鱼', pinyin: 'xiǎo yú', english: 'Fish', dayCount: 2 },
        { id: 10, word: '小兔', pinyin: 'xiǎo tù', english: 'Bunny', dayCount: 1, isNewest: true },
      ],
      upNext: null // No replacement queued
    }
  ];

  // AI-suggested words grouped by set theme
  const aiSuggestions = [
    { id: 's1', word: '草莓', pinyin: 'cǎoméi', english: 'Strawberry', reason: 'Continues fruit theme', forSet: 'set1' },
    { id: 's2', word: '芒果', pinyin: 'mángguǒ', english: 'Mango', reason: 'Popular with toddlers', forSet: 'set1' },
    { id: 's3', word: '大象', pinyin: 'dàxiàng', english: 'Elephant', reason: 'Zoo favorite', forSet: 'set2' },
    { id: 's4', word: '长颈鹿', pinyin: 'chángjǐnglù', english: 'Giraffe', reason: 'Visual appeal', forSet: 'set2' },
  ];

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

  const addSuggestionToSet = (suggestion) => {
    // In real implementation, this would add to the set's queue
    console.log(`Adding ${suggestion.word} to ${suggestion.forSet}`);
    setSelectedSuggestions(prev => {
      const newSet = new Set(prev);
      newSet.add(suggestion.id);
      return newSet;
    });
  };

  const handleManualAdd = () => {
    if (!manualWord.word.trim()) return;
    // In real implementation, this would add to the selected set
    console.log(`Adding ${manualWord.word} to ${manualWord.set}`);
    setManualWord({ word: '', pinyin: '', english: '', set: 'set1' });
    setShowManualAdd(false);
  };

  const getSetById = (setId) => mockActiveSets.find(s => s.id === setId);

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

      {/* Rotation Flow: Retiring → Up Next */}
      <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 dark:from-orange-900/10 dark:via-amber-900/5 dark:to-green-900/10 rounded-2xl border border-orange-200 dark:border-orange-800 p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-orange-500" />
          Today's Card Rotation
        </h2>
        
        {/* Per-Set Rotation Cards */}
        <div className="space-y-4">
          {mockActiveSets.map((set) => {
            const retiringCard = set.cards.find(c => c.isOldest);
            const hasUpNext = set.upNext;
            
            return (
              <div key={set.id} className="bg-white dark:bg-background/50 rounded-xl p-4">
                <div className="text-sm font-medium text-muted-foreground mb-3">{set.name}</div>
                
                <div className="flex items-center gap-3">
                  {/* Retiring Card */}
                  <div className="flex-1 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-700">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">🏁</span>
                      <span className="text-xs font-medium text-orange-600 dark:text-orange-400">RETIRING</span>
                    </div>
                    <div className="font-bold text-foreground text-xl">{retiringCard?.word}</div>
                    <div className="text-sm text-muted-foreground">{retiringCard?.pinyin} • {retiringCard?.english}</div>
                    <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">Day 5/5 complete</div>
                  </div>
                  
                  {/* Arrow */}
                  <div className="flex flex-col items-center">
                    <ArrowRight className="w-6 h-6 text-primary" />
                    <span className="text-xs text-muted-foreground">replaced by</span>
                  </div>
                  
                  {/* Up Next Card */}
                  <div className={`flex-1 p-3 rounded-xl border ${
                    hasUpNext 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' 
                      : 'bg-gray-50 dark:bg-gray-800/50 border-dashed border-gray-300 dark:border-gray-600'
                  }`}>
                    {hasUpNext ? (
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">🌱</span>
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">UP NEXT</span>
                        </div>
                        <div className="font-bold text-foreground text-xl">{set.upNext.word}</div>
                        <div className="text-sm text-muted-foreground">{set.upNext.pinyin} • {set.upNext.english}</div>
                        <div className="text-xs text-green-600 dark:text-green-400 mt-1">Starts tomorrow</div>
                      </>
                    ) : (
                      <div className="text-center py-2">
                        <div className="text-2xl mb-1">❓</div>
                        <div className="text-sm text-muted-foreground">No word queued</div>
                        <button 
                          onClick={() => setShowAISuggestions(true)}
                          className="text-xs text-primary font-medium mt-1 hover:underline"
                        >
                          Add from suggestions →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Discover New Words - Separate Section */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 rounded-2xl border border-purple-200 dark:border-purple-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-purple-500" />
              Discover New Words
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Add words to your sets for future rotation
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowManualAdd(!showManualAdd)}
              className="px-3 py-2 bg-white dark:bg-background text-foreground rounded-xl text-sm font-medium flex items-center gap-1.5 border border-border hover:border-primary/50 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Custom
            </motion.button>

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
                    Thinking...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Get AI Ideas
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>

        {/* Manual Add Form */}
        <AnimatePresence>
          {showManualAdd && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <div className="bg-white dark:bg-background/80 rounded-xl border border-border p-4">
                <h4 className="font-medium text-foreground mb-3">Add a Custom Word</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
                  <input
                    type="text"
                    value={manualWord.word}
                    onChange={(e) => setManualWord(prev => ({ ...prev, word: e.target.value }))}
                    placeholder="Chinese (汉字)"
                    className="px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                  />
                  <input
                    type="text"
                    value={manualWord.pinyin}
                    onChange={(e) => setManualWord(prev => ({ ...prev, pinyin: e.target.value }))}
                    placeholder="Pinyin"
                    className="px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                  />
                  <input
                    type="text"
                    value={manualWord.english}
                    onChange={(e) => setManualWord(prev => ({ ...prev, english: e.target.value }))}
                    placeholder="English"
                    className="px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                  />
                  <select
                    value={manualWord.set}
                    onChange={(e) => setManualWord(prev => ({ ...prev, set: e.target.value }))}
                    className="px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                  >
                    {mockActiveSets.map(set => (
                      <option key={set.id} value={set.id}>{set.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleManualAdd}
                    disabled={!manualWord.word.trim()}
                    className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                      manualWord.word.trim() 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary text-muted-foreground cursor-not-allowed'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    Add Word
                  </motion.button>
                  <button
                    onClick={() => setShowManualAdd(false)}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Suggestions - Grouped by Set */}
        <AnimatePresence>
          {showAISuggestions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="space-y-4">
                {mockActiveSets.map(set => {
                  const setSuggestions = aiSuggestions.filter(s => s.forSet === set.id);
                  if (setSuggestions.length === 0) return null;
                  
                  return (
                    <div key={set.id} className="bg-white dark:bg-background/80 rounded-xl border border-border p-4">
                      <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Suggestions for {set.name}
                      </h4>
                      
                      <div className="space-y-2">
                        {setSuggestions.map(suggestion => {
                          const isAdded = selectedSuggestions.has(suggestion.id);
                          
                          return (
                            <div 
                              key={suggestion.id}
                              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                isAdded 
                                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' 
                                  : 'bg-background border-border hover:border-primary/50'
                              }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-foreground text-lg">{suggestion.word}</span>
                                  <span className="text-sm text-muted-foreground">{suggestion.pinyin}</span>
                                </div>
                                <div className="text-sm text-muted-foreground">{suggestion.english}</div>
                                <div className="text-xs text-primary mt-1">{suggestion.reason}</div>
                              </div>
                              
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => addSuggestionToSet(suggestion)}
                                disabled={isAdded}
                                className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-1.5 ${
                                  isAdded 
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 cursor-default' 
                                    : 'bg-primary text-primary-foreground hover:shadow-md'
                                }`}
                              >
                                {isAdded ? (
                                  <>
                                    <Check className="w-4 h-4" />
                                    Queued
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-4 h-4" />
                                    Add
                                  </>
                                )}
                              </motion.button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setShowAISuggestions(false);
                    setSelectedSuggestions(new Set());
                  }}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-xl font-medium"
                >
                  Done
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state when neither form is shown */}
        {!showAISuggestions && !showManualAdd && (
          <div className="text-center py-6 text-muted-foreground bg-white/50 dark:bg-background/30 rounded-xl border border-dashed border-border">
            <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Click "Get AI Ideas" for personalized word suggestions</p>
          </div>
        )}
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
