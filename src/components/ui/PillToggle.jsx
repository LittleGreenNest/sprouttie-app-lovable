import React from 'react';
import { motion } from 'framer-motion';

const PillToggle = ({ 
  options = [], 
  selected, 
  onChange, 
  className = '',
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  return (
    <div className={`inline-flex gap-2 flex-wrap ${className}`}>
      {options.map((option) => {
        const isSelected = selected === option.value;
        
        return (
          <motion.button
            key={option.value}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(option.value)}
            className={`
              ${sizeClasses[size]}
              rounded-full font-medium transition-all duration-200
              ${isSelected 
                ? 'bg-gradient-to-r from-[hsl(var(--sprouttie-green))] to-[hsl(var(--sprouttie-green-dark))] text-white shadow-md' 
                : 'bg-white text-gray-700 border-2 border-[hsl(var(--border))] hover:border-[hsl(var(--sprouttie-green))]'
              }
            `}
          >
            {option.icon && <span className="mr-1.5">{option.icon}</span>}
            {option.label}
          </motion.button>
        );
      })}
    </div>
  );
};

export default PillToggle;
