import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RoundChips from './RoundChips';

const SetAccordion = ({ 
  set, 
  setIndex,
  flashcards, 
  sessions, 
  onToggleSession,
  onManageWords,
  flashedWords = new Set()
}) => {
  const [isOpen, setIsOpen] = useState(true);
  
  const completedRounds = ['round1', 'round2', 'round3'].filter(
    round => sessions?.[round]?.completed
  ).length;

  const totalRounds = 3;
  const progress = (completedRounds / totalRounds) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: setIndex * 0.05 }}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-200"
    >
      {/* Header - matching All Words CategoryCard */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-inset transition-colors hover:bg-slate-50"
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-800 truncate mb-1">
              Set {setIndex + 1}
            </h3>
            <p className="text-sm text-slate-500">
              {flashcards.length} words · {Math.round(progress)}% completed
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {progress === 100 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
                className="text-2xl"
              >
                🌸
              </motion.span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onManageWords(set.id);
              }}
              className="px-3 py-1 text-sm bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors border border-slate-200"
            >
              ✏️ Manage
            </button>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-slate-400"
            >
              <span className="text-xl">▼</span>
            </motion.div>
          </div>
        </div>

        {/* Preview words when collapsed */}
        {!isOpen && flashcards.length > 0 && (
          <div className="text-sm text-slate-600 truncate mb-3 opacity-70">
            {flashcards.slice(0, 6).map(f => f.word).join('、')}{flashcards.length > 6 ? '...' : ''}
          </div>
        )}

        {/* Progress bar matching All Words */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, delay: setIndex * 0.05 }}
          />
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 border-t-2 border-[hsl(var(--border))]">
              {/* Words list */}
              <div className="mb-4 flex flex-wrap gap-2">
                {flashcards.map((card, idx) => {
                  const isFlashed = flashedWords.has(card.id);
                  return (
                    <div
                      key={card.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border-2 transition-all ${
                        isFlashed 
                          ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-400' 
                          : 'bg-[hsl(var(--sprouttie-cream))] border-[hsl(var(--border))]'
                      }`}
                    >
                      {/* Flashed indicator */}
                      <div className="flex-shrink-0">
                        {isFlashed ? (
                          <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[9px] font-bold">
                            ✓
                          </div>
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 bg-white" />
                        )}
                      </div>
                      
                      <span className="font-medium text-[hsl(var(--foreground))]">{card.word}</span>
                      
                      {idx === 0 && (
                        <span className="text-xs text-amber-600">🌱</span>
                      )}
                      
                      {/* Status pill */}
                      <span className={`text-[9px] px-1.5 py-0.5 font-semibold rounded-full ${
                        isFlashed 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isFlashed ? '✓' : '○'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Round chips */}
              <RoundChips
                sessions={sessions}
                onToggle={(round) => onToggleSession(set.id, round)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SetAccordion;
