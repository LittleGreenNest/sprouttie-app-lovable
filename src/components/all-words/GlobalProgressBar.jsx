import React from 'react';
import { motion } from 'framer-motion';

const GlobalProgressBar = ({ flashedCount, totalCount }) => {
  const percentage = totalCount > 0 ? Math.round((flashedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">Overall Progress</span>
        <span className="text-sm font-bold text-emerald-600">{percentage}%</span>
      </div>
      
      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-slate-500">
          {flashedCount} of {totalCount} words flashed
        </span>
        {percentage === 100 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.5 }}
            className="text-lg"
          >
            🎉
          </motion.span>
        )}
      </div>
    </div>
  );
};

export default GlobalProgressBar;
