import React from 'react';
import { motion } from 'framer-motion';

const MetricsRow = ({ stats }) => {
  const metrics = [
    {
      icon: '😊',
      label: 'Avg Engagement',
      value: stats.avgEngagement.toFixed(1),
      subtext: 'out of 5',
      color: 'yellow',
      bgColor: 'bg-[#FFF9E6]',
      iconBg: 'bg-[#FFE7B3]',
      delay: 0.1
    },
    {
      icon: '📚',
      label: 'Total Flashcards',
      value: stats.totalFlashcards,
      subtext: 'cards',
      color: 'green',
      bgColor: 'bg-[#E8F5E9]',
      iconBg: 'bg-[#B9E5BD]',
      delay: 0.2
    },
    {
      icon: '📅',
      label: 'Total Sessions',
      value: stats.totalSessions,
      subtext: 'completed',
      color: 'blue',
      bgColor: 'bg-[#E3F2FD]',
      iconBg: 'bg-[#B3D9F3]',
      delay: 0.3
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: metric.delay, duration: 0.4 }}
          whileHover={{ scale: 1.03, y: -4 }}
          className={`${metric.bgColor} rounded-2xl p-6 shadow-md hover:shadow-lg transition-all`}
        >
          <div className="flex items-start gap-4">
            {/* Icon */}
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: metric.delay + 0.2, type: "spring", stiffness: 200 }}
              className={`${metric.iconBg} w-14 h-14 rounded-xl flex items-center justify-center text-3xl`}
            >
              {metric.icon}
            </motion.div>
            
            {/* Content */}
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-600 mb-1">{metric.label}</h3>
              <motion.p 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: metric.delay + 0.3 }}
                className="text-3xl font-bold text-gray-800"
              >
                {metric.value}
              </motion.p>
              <p className="text-xs text-gray-500 mt-1">{metric.subtext}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default MetricsRow;
