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
      className="bg-white rounded-xl shadow-md overflow-hidden border-2 border-[hsl(var(--border))] hover:border-[hsl(var(--sprouttie-green-light))] transition-colors"
    >
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-[hsl(var(--sprouttie-mint))] transition-colors"
      >
        <div className="flex items-center gap-4 flex-1">
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-[hsl(var(--muted-foreground))]"
          >
            ▶
          </motion.div>
          
          <div className="text-left flex-1">
            <div className="font-bold text-lg text-[hsl(var(--foreground))]">
              Set {setIndex + 1}
              <span className="ml-2 text-sm font-normal text-[hsl(var(--muted-foreground))]">
                ({flashcards.length} words)
              </span>
            </div>
            
            {/* Mini progress bar */}
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden max-w-[200px]">
                <div 
                  className="h-full bg-gradient-to-r from-[hsl(var(--sprouttie-green))] to-[hsl(var(--sprouttie-green-dark))] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs font-semibold text-[hsl(var(--sprouttie-green))]">
                {completedRounds}/{totalRounds}
              </div>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onManageWords(set.id);
            }}
            className="px-3 py-1 text-sm bg-[hsl(var(--sprouttie-beige))] hover:bg-[hsl(var(--sprouttie-beige-dark))] text-[hsl(var(--foreground))] rounded-full transition-colors"
          >
            ✏️ Manage
          </button>
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
                  const addedDate = card.created_at ? new Date(card.created_at) : null;
                  const timeAgo = addedDate ? (() => {
                    const now = new Date();
                    const diffMs = now - addedDate;
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffMins = Math.floor(diffMs / (1000 * 60));
                    
                    if (diffDays > 0) return `${diffDays}d ago`;
                    if (diffHours > 0) return `${diffHours}h ago`;
                    if (diffMins > 0) return `${diffMins}m ago`;
                    return 'just now';
                  })() : null;
                  
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
                      
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <span className="font-medium text-[hsl(var(--foreground))]">{card.word}</span>
                        {timeAgo && (
                          <span className="text-[9px] text-[hsl(var(--muted-foreground))] opacity-70">
                            Added {timeAgo}
                          </span>
                        )}
                      </div>
                      
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
