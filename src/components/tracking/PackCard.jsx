import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PronunciationButton from '../pronunciation/PronunciationButton';

const PackCard = ({
  index,
  set,
  flashcards,
  sessions,
  onToggleSession,
  onManageWords,
  flashedWords,
  categoryColor = "#5CBE7B",
  userPlan = 'free'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Calculate completion
  const completedRounds = Object.values(sessions).filter(s => s?.completed).length;
  const completionRatio = completedRounds / 3;
  
  // Get category name from first flashcard
  const categoryName = flashcards[0]?.categoryName || 'Flashcards';
  
  // Get last practiced info
  const lastSession = Object.values(sessions).find(s => s?.completed);
  const lastPracticed = lastSession?.time 
    ? new Date(lastSession.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : 'Not yet';
  const practicedBy = lastSession?.by || 'Nobody';

  // Mode configurations
  const modes = [
    { key: 'round1', label: 'Warmup', icon: '①', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-100', textColor: 'text-emerald-800' },
    { key: 'round2', label: 'Speed', icon: '②', bgColor: 'bg-sky-50', borderColor: 'border-sky-100', textColor: 'text-sky-800' },
    { key: 'round3', label: 'Review', icon: '③', bgColor: 'bg-amber-50', borderColor: 'border-amber-100', textColor: 'text-amber-900' }
  ];

  return (
    <div className="bg-white border border-[#F1D7B8] rounded-2xl overflow-hidden shadow-[0_6px_0_0_#E8CCAA]">
      {/* Colored strip */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: categoryColor }}
      />

      <div className="px-4 py-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#8B7A65]">
              Pack {index + 1}
            </p>
            <p className="font-semibold text-sm text-[#27333F]">
              {categoryName} · {flashcards.length} words
            </p>
          </div>
          <button
            onClick={() => onManageWords(set.id)}
            className="text-xs px-2 py-1 rounded-full border border-[#D6C3A5] text-[#6B5A43] hover:bg-[#FFF9F1] transition-colors"
          >
            Manage
          </button>
        </div>

        {/* Small progress row */}
        <div className="flex items-center justify-between text-xs text-[#8B7A65]">
          <span>
            {completedRounds} of 3 modes completed
          </span>
          <span>
            Last: {lastPracticed} · {practicedBy}
          </span>
        </div>

        <div className="h-1.5 w-full rounded-full bg-[#F3E3CF] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionRatio * 100}%` }}
            className="h-full bg-[#5CBE7B]"
          />
        </div>

        {/* Expandable Words Section */}
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full text-left text-xs text-[#8B7A65] hover:text-[#6B5A43] transition-colors flex items-center gap-1"
          >
            <span>{isExpanded ? '▼' : '▶'}</span>
            <span>{isExpanded ? 'Hide' : 'Show'} words</span>
          </button>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 mt-2">
                  {flashcards.map((card) => {
                    const isFlashed = flashedWords.has(card.id);
                    return (
                      <div
                        key={card.id}
                        className={`inline-flex items-center gap-1.5 rounded-xl border ${
                          isFlashed 
                            ? 'border-emerald-300 bg-emerald-50' 
                            : 'border-[#E5D3B5] bg-[#FFF9F1]'
                        } px-3 py-1.5 text-sm`}
                      >
                        {isFlashed && (
                          <span className="text-[10px] w-3 h-3 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                            ✓
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
                          中
                        </span>
                        <span className="text-[#27333F] font-medium">{card.word}</span>
                        {card.english && (
                          <span className="text-[#8B7A65] text-xs">({card.english})</span>
                        )}
                        <PronunciationButton
                          wordId={card.id}
                          wordText={card.word}
                          language="zh"
                          userPlan={userPlan}
                          size="xs"
                        />
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modes / Rounds */}
        <div className="flex flex-wrap gap-2 pt-1">
          {modes.map((mode, idx) => {
            const roundNum = idx + 1;
            const session = sessions[mode.key];
            const isCompleted = session?.completed;

            return (
              <motion.button
                key={mode.key}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onToggleSession(set.id, roundNum)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                  isCompleted
                    ? `${mode.bgColor} ${mode.borderColor} ${mode.textColor}`
                    : 'border-[#D6C3A5] bg-white text-[#8B7A65] hover:bg-[#FFF9F1]'
                }`}
              >
                <span>{mode.icon}</span>
                <span>{mode.label}</span>
                {isCompleted && session.by && (
                  <span className="text-[10px] opacity-70">· {session.by}</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PackCard;
