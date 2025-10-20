import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TipsCarousel = () => {
  const [currentTip, setCurrentTip] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef(null);

  const tips = [
    {
      icon: '⏱',
      title: 'Timing Is Key',
      description: '1 second per card keeps it fun and effective'
    },
    {
      icon: '🎈',
      title: 'Make It Fun',
      description: 'Always stop before your child loses interest'
    },
    {
      icon: '🌿',
      title: 'Short Daily Sessions Grow Big Results',
      description: 'Your consistency helps your child bloom!'
    },
    {
      icon: '📦',
      title: 'Introduce New Cards Gradually',
      description: 'Rotate ~20 weekly for best results'
    }
  ];

  // Auto-rotate tips with pause functionality
  useEffect(() => {
    const startInterval = () => {
      intervalRef.current = setInterval(() => {
        if (!isPaused) {
          setCurrentTip((prev) => (prev + 1) % tips.length);
        }
      }, 8000); // 8 seconds per tip
    };

    startInterval();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, tips.length]);

  const goToTip = (index) => {
    setCurrentTip(index);
    // Reset the interval when manually selecting
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6 shadow-lg mb-6 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-sprouttie-green-dark flex items-center gap-2">
          <span>🌿</span>
          Today's Tip
        </h2>
        <div className="flex gap-2">
          {tips.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goToTip(idx)}
              className={`transition-all duration-300 rounded-full ${
                idx === currentTip 
                  ? 'bg-sprouttie-green w-8 h-2' 
                  : 'bg-gray-300 w-2 h-2 hover:bg-gray-400'
              }`}
              aria-label={`Go to tip ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="relative h-36">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTip}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-gradient-to-br from-sprouttie-green-light to-sprouttie-mint rounded-2xl p-6 flex items-center gap-5"
          >
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              className="text-6xl flex-shrink-0"
            >
              {tips[currentTip].icon}
            </motion.div>
            <div className="flex-1">
              <motion.h3 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-lg font-bold text-sprouttie-green-dark mb-2"
              >
                {tips[currentTip].title}
              </motion.h3>
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-gray-700"
              >
                {tips[currentTip].description}
              </motion.p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {isPaused && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-gray-500 text-center mt-3"
        >
          Paused • Hover away to resume
        </motion.p>
      )}
    </motion.div>
  );
};

export default TipsCarousel;
