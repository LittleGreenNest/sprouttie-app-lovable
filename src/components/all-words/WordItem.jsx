import React from 'react';
import { motion } from 'framer-motion';
import { Edit2 } from 'lucide-react';

const WordItem = ({ card, isFlashed, onEdit, index, isCompact = false }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.02 }}
      className={`group relative ${isCompact ? 'rounded-lg p-2 border' : 'rounded-xl p-3 border-2'} transition-all ${
        isFlashed
          ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-300'
          : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
      whileHover={{ scale: 1.01, x: 2 }}
    >
      <div className={`flex items-start ${isCompact ? 'gap-2' : 'gap-3'}`}>
        {/* Status indicator - hidden in compact mode */}
        {!isCompact && (
          <div className="flex-shrink-0 mt-0.5">
            {isFlashed ? (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold"
              >
                ✓
              </motion.div>
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white" />
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className={`font-medium text-slate-800 truncate ${isCompact ? 'text-xs' : 'text-sm'}`}>
            {card.label}
          </div>
          {!isCompact && card.title && (
            <div className="text-xs text-slate-500 truncate mt-0.5">
              {card.title}
            </div>
          )}
        </div>

        {/* Status pill - more compact in compact mode */}
        <div className={`flex-shrink-0 ${isCompact ? 'ml-auto' : ''}`}>
          <span className={`${isCompact ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'} font-semibold rounded-full ${
            isFlashed 
              ? 'bg-emerald-500 text-white' 
              : 'bg-slate-200 text-slate-600'
          }`}>
            {isFlashed ? (isCompact ? '✓' : 'Flashed') : (isCompact ? '○' : 'Not yet')}
          </span>
        </div>

        {/* Edit button - hidden in compact mode */}
        {!isCompact && (
          <button
            onClick={onEdit}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-slate-100 rounded-lg"
            title="Edit category"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-600" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default WordItem;
