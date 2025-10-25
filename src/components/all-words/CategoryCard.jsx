import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import WordItem from './WordItem';

const CategoryCard = ({ 
  category, 
  words, 
  flashedIds,
  isExpanded, 
  onToggle,
  isCompact,
  onEditCard,
  filteredWords,
  index 
}) => {
  const flashedCount = words.filter(w => flashedIds.has(w.id)).length;
  const totalCount = words.length;
  const percentage = totalCount > 0 ? Math.round((flashedCount / totalCount) * 100) : 0;
  
  // Show preview of first 6 words
  const previewWords = words.slice(0, 6);
  const previewText = previewWords.map(w => w.label).join('、');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-200"
    >
      {/* Header - Always visible */}
      <button
        onClick={onToggle}
        className="w-full text-left p-5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-inset transition-colors hover:bg-slate-50"
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-800 truncate mb-1">
              {category}
            </h3>
            <p className="text-sm text-slate-500">
              {totalCount} words · {percentage}% flashed
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {percentage === 100 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
                className="text-2xl"
              >
                🌸
              </motion.span>
            )}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-slate-400"
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </div>
        </div>

        {/* Preview row - only in compact mode when collapsed */}
        {!isExpanded && !isCompact && previewWords.length > 0 && (
          <div className="text-sm text-slate-600 truncate mb-3 opacity-70">
            {previewText}{totalCount > 6 ? '...' : ''}
          </div>
        )}

        {/* Progress bar */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, delay: index * 0.05 }}
          />
        </div>
      </button>

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-2 space-y-2 border-t border-slate-100">
              <AnimatePresence mode="popLayout">
                {(filteredWords || words).map((card, idx) => (
                  <WordItem
                    key={card.id}
                    card={card}
                    isFlashed={flashedIds.has(card.id)}
                    onEdit={() => onEditCard(card, category)}
                    index={idx}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CategoryCard;
