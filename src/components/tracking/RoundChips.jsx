import React from 'react';
import { motion } from 'framer-motion';

const RoundChips = ({ sessions = {}, onToggle }) => {
  const rounds = [
    { key: 'round1', label: 'Round 1', icon: '🌱' },
    { key: 'round2', label: 'Round 2', icon: '🌿' },
    { key: 'round3', label: 'Round 3', icon: '🌸' }
  ];

  const getChipClass = (roundKey) => {
    const isCompleted = sessions[roundKey]?.completed;
    
    if (isCompleted) {
      // Completed state - green leaf
      return 'bg-gradient-to-r from-green-100 to-green-200 border-green-400 text-green-800';
    } else {
      // Not completed - seed state
      return 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-300 text-amber-700 hover:border-amber-400';
    }
  };

  const getIcon = (roundKey) => {
    const isCompleted = sessions[roundKey]?.completed;
    const round = rounds.find(r => r.key === roundKey);
    
    return isCompleted ? round.icon : '○';
  };

  return (
    <div className="flex flex-wrap gap-2">
      {rounds.map((round) => {
        const isCompleted = sessions[round.key]?.completed;
        const sessionData = sessions[round.key];
        
        return (
          <motion.button
            key={round.key}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onToggle(parseInt(round.key.replace('round', '')))}
            className={`
              ${getChipClass(round.key)}
              px-4 py-2 rounded-full border-2 font-medium text-sm
              transition-all duration-200 shadow-sm hover:shadow-md
              flex items-center gap-2
            `}
          >
            <span className="text-lg">{getIcon(round.key)}</span>
            <span>{round.label}</span>
            {isCompleted && sessionData?.by && (
              <span className="text-xs opacity-75">
                by {sessionData.by}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

export default RoundChips;
