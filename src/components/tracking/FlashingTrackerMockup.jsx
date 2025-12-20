import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Timer,
  TrendingUp,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';

/**
 * UI/UX MOCKUP: Daily Flashing Tracker
 * 
 * Features:
 * 1. Today's Set with day progress (1/5, 2/5, etc.)
 * 2. Skip Day button with streak warning
 * 3. Upcoming Retirements preview
 * 4. Next Cards in Queue
 */

const FlashingTrackerMockup = () => {
  // Mock data for demonstration
  const [sessionStarted, setSessionStarted] = useState(false);
  const [consecutiveSkips, setConsecutiveSkips] = useState(1);
  const [showSkipWarning, setShowSkipWarning] = useState(false);
  
  // Mock active set with 5 cards
  const mockActiveSet = [
    { id: 1, word: '苹果', pinyin: 'píngguǒ', english: 'Apple', dayCount: 5, isOldest: true },
    { id: 2, word: '香蕉', pinyin: 'xiāngjiāo', english: 'Banana', dayCount: 4 },
    { id: 3, word: '橙子', pinyin: 'chéngzi', english: 'Orange', dayCount: 3 },
    { id: 4, word: '葡萄', pinyin: 'pútao', english: 'Grape', dayCount: 2 },
    { id: 5, word: '西瓜', pinyin: 'xīguā', english: 'Watermelon', dayCount: 1, isNewest: true },
  ];

  // Cards waiting to enter
  const mockWaitingCards = [
    { id: 6, word: '草莓', pinyin: 'cǎoméi', english: 'Strawberry' },
    { id: 7, word: '芒果', pinyin: 'mángguǒ', english: 'Mango' },
    { id: 8, word: '樱桃', pinyin: 'yīngtáo', english: 'Cherry' },
  ];

  const handleSkipDay = () => {
    if (consecutiveSkips >= 1) {
      setShowSkipWarning(true);
    }
  };

  const confirmSkip = () => {
    setConsecutiveSkips(prev => prev + 1);
    setShowSkipWarning(false);
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
            <div className="text-2xl font-bold text-foreground">5</div>
            <div className="text-xs text-muted-foreground">Active Cards</div>
          </div>
          <div className="bg-background/60 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-orange-500">1</div>
            <div className="text-xs text-muted-foreground">Retiring Today</div>
          </div>
          <div className="bg-background/60 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-green-500">1</div>
            <div className="text-xs text-muted-foreground">Entering Queue</div>
          </div>
        </div>
      </div>

      {/* Session Controls */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Play className="w-5 h-5 text-primary" />
          Session Status
        </h2>
        
        <div className="flex flex-wrap gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSessionStarted(true)}
            disabled={sessionStarted}
            className={`flex-1 min-w-[140px] px-6 py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              sessionStarted
                ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                : 'bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/25'
            }`}
          >
            {sessionStarted ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Session Done! ✓
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Start Flashing
              </>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSkipDay}
            disabled={sessionStarted}
            className="flex-1 min-w-[140px] px-6 py-4 rounded-xl font-medium bg-secondary text-secondary-foreground hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-all flex items-center justify-center gap-2"
          >
            <Pause className="w-5 h-5" />
            Skip Today
          </motion.button>
        </div>

        {/* Consecutive Skip Warning */}
        <AnimatePresence>
          {consecutiveSkips >= 2 && !showSkipWarning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4"
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
      </div>

      {/* Skip Day Confirmation Modal */}
      <AnimatePresence>
        {showSkipWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowSkipWarning(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Skip Today?</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  You've already skipped {consecutiveSkips} day{consecutiveSkips > 1 ? 's' : ''} recently. 
                  Skipping again may affect your child's retention.
                </p>
                
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 mb-4">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    💡 Tip: Even a quick 1-minute flash session helps maintain neural pathways!
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSkipWarning(false)}
                    className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
                  >
                    Flash Now
                  </button>
                  <button
                    onClick={confirmSkip}
                    className="flex-1 px-4 py-3 bg-secondary text-secondary-foreground rounded-xl font-medium"
                  >
                    Skip Anyway
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Today's Active Set with Day Progress */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          Today's Set
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            5 cards • 3 rounds recommended
          </span>
        </h2>

        <div className="space-y-3">
          {mockActiveSet.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all ${
                card.isOldest 
                  ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800' 
                  : card.isNewest
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                    : 'bg-background border-border hover:border-primary/30'
              }`}
            >
              {/* Day Progress Indicator */}
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-primary/10 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-primary">{card.dayCount}</span>
                <span className="text-[10px] text-muted-foreground leading-none">/5 days</span>
              </div>

              {/* Card Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-foreground">{card.word}</span>
                  {card.isOldest && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full">
                      Retiring Soon
                    </span>
                  )}
                  {card.isNewest && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
                      New Today
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {card.pinyin} • {card.english}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-24 flex-shrink-0">
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(card.dayCount / 5) * 100}%` }}
                    className={`h-full rounded-full ${
                      card.dayCount === 5 ? 'bg-orange-500' : 'bg-primary'
                    }`}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
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

      {/* Next in Queue */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-2xl border border-green-200 dark:border-green-800 p-6">
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" />
          Next in Queue
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {mockWaitingCards.length} cards waiting
          </span>
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          These cards will enter rotation when a card retires
        </p>
        
        <div className="space-y-2">
          {mockWaitingCards.slice(0, 3).map((card, index) => (
            <div 
              key={card.id}
              className="flex items-center gap-3 p-3 bg-white dark:bg-background/50 rounded-xl"
            >
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-sm font-bold text-green-600">
                {index + 1}
              </div>
              <div className="flex-1">
                <span className="font-medium text-foreground">{card.word}</span>
                <span className="text-sm text-muted-foreground ml-2">{card.pinyin}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
          ))}
        </div>
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
