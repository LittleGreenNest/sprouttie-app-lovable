import React from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, BookOpen, CheckCircle2, Circle } from 'lucide-react';

const StatsSummary = ({ categoryCount, totalWords, flashedWords, unflashedWords }) => {
  const stats = [
    {
      icon: <FolderOpen className="w-6 h-6" />,
      label: 'Categories',
      value: categoryCount,
      color: 'bg-sprouttie-mint text-foreground'
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      label: 'Total Words',
      value: totalWords,
      color: 'bg-sprouttie-beige text-foreground'
    },
    {
      icon: <CheckCircle2 className="w-6 h-6" />,
      label: 'Ever Flashed',
      value: flashedWords,
      color: 'bg-sprouttie-green-light text-sprouttie-green-dark'
    },
    {
      icon: <Circle className="w-6 h-6" />,
      label: 'Never Flashed',
      value: unflashedWords,
      color: 'bg-sprouttie-coral-light text-sprouttie-coral-dark'
    }
  ];

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-md border-2 border-border p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-2 h-8 bg-gradient-sprouttie rounded-full"></div>
        <h3 className="text-xl font-bold text-foreground">Your Progress</h3>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            className={`${stat.color} rounded-2xl p-6 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}
            whileHover={{ scale: 1.03 }}
          >
            <div className="flex justify-center mb-3 opacity-80">
              {stat.icon}
            </div>
            <div className="text-3xl font-bold mb-2">
              {stat.value}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider opacity-70">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default StatsSummary;
