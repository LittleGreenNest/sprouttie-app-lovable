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
    <div className="bg-white rounded-xl shadow-md p-6 mb-6 sticky top-4 z-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onChangeDate(-1)}
            className="w-10 h-10 rounded-full bg-[hsl(var(--sprouttie-mint))] hover:bg-[hsl(var(--sprouttie-green-light))] flex items-center justify-center transition-colors"
          >
            ←
          </motion.button>
          
          <div>
            <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {formatDate(selectedDate)}
            </h2>
            {isToday() && (
              <div className="text-sm text-[hsl(var(--sprouttie-green))] font-semibold">
                Today 🌱
              </div>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onChangeDate(1)}
            className="w-10 h-10 rounded-full bg-[hsl(var(--sprouttie-mint))] hover:bg-[hsl(var(--sprouttie-green-light))] flex items-center justify-center transition-colors"
          >
            →
          </motion.button>
        </div>

        <div className="text-right">
          <div className="text-3xl font-bold text-[hsl(var(--sprouttie-green))]">
            {completedCount}/{totalGoal}
          </div>
          <div className="text-sm text-[hsl(var(--muted-foreground))]">Sessions</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-3 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-[hsl(var(--sprouttie-green))] to-[hsl(var(--sprouttie-green-dark))] rounded-full"
        />
      </div>
    </div>
  );
};

export default DayHeader;
