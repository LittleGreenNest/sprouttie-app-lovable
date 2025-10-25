import React from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, BookOpen, CheckCircle2, Circle } from 'lucide-react';

const StatsSummary = ({ categoryCount, totalWords, flashedWords, unflashedWords }) => {
  const stats = [
    {
      icon: <FolderOpen className="w-6 h-6" />,
      label: 'Categories',
      value: categoryCount,
      color: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      label: 'Total Words',
      value: totalWords,
      color: 'bg-purple-50 text-purple-700 border-purple-200'
    },
    {
      icon: <CheckCircle2 className="w-6 h-6" />,
      label: 'Ever Flashed',
      value: flashedWords,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      icon: <Circle className="w-6 h-6" />,
      label: 'Never Flashed',
      value: unflashedWords,
      color: 'bg-orange-50 text-orange-700 border-orange-200'
    }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-800 mb-5">Summary</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`${stat.color} border-2 rounded-xl p-5 text-center transition-all duration-200 hover:shadow-md`}
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <div className="flex justify-center mb-2">
              {stat.icon}
            </div>
            <div className="text-3xl font-bold mb-1">
              {stat.value}
            </div>
            <div className="text-xs font-medium uppercase tracking-wide opacity-80">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default StatsSummary;
