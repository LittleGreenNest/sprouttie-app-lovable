import React from 'react';
import { motion } from 'framer-motion';

const StatCard = ({ 
  icon, 
  label, 
  value, 
  color = 'green', 
  className = '',
  trend,
  onClick 
}) => {
  const colorClasses = {
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    pink: 'bg-pink-50 text-pink-700 border-pink-200'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={`${colorClasses[color]} border-2 rounded-xl p-4 transition-all duration-200 hover:shadow-md ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="text-3xl">{icon}</div>
        <div className="flex-1">
          <div className="text-xs font-medium opacity-70 uppercase tracking-wide">
            {label}
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold">{value}</div>
            {trend && (
              <div className={`text-xs font-semibold ${
                trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'
              }`}>
                {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;
