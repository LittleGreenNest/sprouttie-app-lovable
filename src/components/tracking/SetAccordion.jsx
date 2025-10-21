import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RoundChips from './RoundChips';

const SetAccordion = ({ 
  set, 
  setIndex,
  flashcards, 
  sessions, 
  onToggleSession,
  onManageWords 
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
                {flashcards.map((card, idx) => (
                  <div
                    key={card.id}
                    className="px-3 py-1 bg-[hsl(var(--sprouttie-cream))] text-[hsl(var(--foreground))] rounded-lg text-sm border border-[hsl(var(--border))]"
                  >
                    <span className="font-medium">{card.word}</span>
                    {idx === 0 && (
                      <span className="ml-1.5 text-xs text-amber-600">🌱 oldest</span>
                    )}
                  </div>
                ))}
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
