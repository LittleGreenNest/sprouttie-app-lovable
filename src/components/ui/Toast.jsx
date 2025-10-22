import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Toast = ({ 
  message, 
  type = 'success', 
  duration = 3000, 
  onClose,
  isVisible 
}) => {
  const typeStyles = {
    success: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-800',
      icon: '✓',
      ariaLabel: 'Success notification'
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      icon: '✕',
      ariaLabel: 'Error notification'
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-800',
      icon: '⚠',
      ariaLabel: 'Warning notification'
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      icon: 'ℹ',
      ariaLabel: 'Information notification'
    }
  };

  const style = typeStyles[type];

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-4 right-4 z-50"
          role="alert"
          aria-live={type === 'error' ? 'assertive' : 'polite'}
          aria-label={style.ariaLabel}
        >
          <div className={`${style.bg} ${style.text} border-2 rounded-lg shadow-lg p-4 flex items-center gap-3 min-w-[280px] max-w-md`}>
            <div className="text-2xl" aria-hidden="true">{style.icon}</div>
            <div className="flex-1 font-medium">{message}</div>
            <button
              onClick={onClose}
              aria-label="Close notification"
              className="text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 rounded"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
