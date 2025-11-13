import React from 'react';
import { motion } from 'framer-motion';

const DayHeader = ({ selectedDate, onChangeDate, completedCount, totalGoal }) => {
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric' 
    });
  };

  const isToday = () => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  };

  const progress = totalGoal > 0 ? (completedCount / totalGoal) * 100 : 0;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 mb-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📅</span>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Today</p>
            <div className="flex items-center gap-2 text-sm text-slate-900">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onChangeDate(-1)}
                className="text-lg text-slate-600 hover:text-slate-900 transition-colors"
                aria-label="Previous day"
              >
                ←
              </motion.button>
              <span className="font-medium">{formatDate(selectedDate)}</span>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onChangeDate(1)}
                className="text-lg text-slate-600 hover:text-slate-900 transition-colors"
                aria-label="Next day"
              >
                →
              </motion.button>
              {isToday() && (
                <button
                  onClick={() => onChangeDate(0)}
                  className="ml-2 text-xs px-2 py-1 rounded-full border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                >
                  Today
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="text-sm text-slate-700">
          <p>
            <span className="font-semibold">{completedCount}</span> of{" "}
            <span className="font-semibold">{totalGoal}</span> sessions
          </p>
          {/* Progress bar matching All Words style */}
          <div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-emerald-500 rounded-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayHeader;
