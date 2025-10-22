import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MilestoneModal = ({ show, onClose, milestone }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!milestone) return null;

  const confettiColors = ['#FFD700', '#FF6B9D', '#4ECDC4', '#95E1D3', '#F38181'];
  const confettiPieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    color: confettiColors[i % confettiColors.length],
    x: Math.random() * 100 - 50,
    y: -20 - Math.random() * 20,
    rotation: Math.random() * 360,
    delay: Math.random() * 0.4
  }));

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm"
          role="dialog"
          aria-labelledby="milestone-title"
          aria-describedby="milestone-description"
          onClick={onClose}
        >
          {/* Confetti */}
          {confettiPieces.map((piece) => (
            <motion.div
              key={piece.id}
              initial={{ 
                x: '50vw',
                y: '30vh',
                rotate: 0,
                scale: 0,
                opacity: 1
              }}
              animate={{ 
                x: `calc(50vw + ${piece.x}vw)`,
                y: '100vh',
                rotate: piece.rotation,
                scale: [0, 1, 1, 0.8],
                opacity: [0, 1, 1, 0]
              }}
              transition={{ 
                duration: 2 + Math.random(),
                delay: piece.delay,
                ease: "easeOut"
              }}
              className="absolute w-4 h-4 rounded-sm pointer-events-none"
              style={{ backgroundColor: piece.color }}
              aria-hidden="true"
            />
          ))}

          {/* Milestone Card */}
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ 
              scale: [0, 1.1, 1],
              opacity: 1,
              y: 0
            }}
            exit={{ scale: 0, opacity: 0, y: 50 }}
            transition={{ 
              duration: 0.6,
              ease: [0.34, 1.56, 0.64, 1]
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-gradient-to-br from-white via-sprouttie-mint/20 to-sprouttie-beige rounded-3xl shadow-2xl p-10 max-w-lg mx-4 border-4 border-sprouttie-green"
          >
            {/* Badge/Icon */}
            <motion.div
              animate={{ 
                rotate: [0, -5, 5, -5, 5, 0],
                scale: [1, 1.15, 1]
              }}
              transition={{ 
                duration: 0.8,
                repeat: 3,
                delay: 0.4
              }}
              className="text-8xl text-center mb-4"
              aria-hidden="true"
            >
              {milestone.icon}
            </motion.div>
            
            {/* Title */}
            <motion.h2
              id="milestone-title"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-4xl font-bold text-sprouttie-green-dark text-center mb-3"
            >
              {milestone.title}
            </motion.h2>
            
            {/* Description */}
            <motion.p
              id="milestone-description"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-lg text-gray-700 text-center mb-6 leading-relaxed"
            >
              {milestone.description}
            </motion.p>

            {/* Reward Badge */}
            {milestone.reward && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-bold px-6 py-3 rounded-full text-center shadow-lg"
              >
                🏆 {milestone.reward}
              </motion.div>
            )}

            {/* Close hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="text-center text-sm text-gray-500 mt-6"
            >
              Click anywhere to continue
            </motion.p>

            {/* Close button for accessibility */}
            <button
              onClick={onClose}
              aria-label="Close milestone celebration"
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-sprouttie-green"
            >
              ✕
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MilestoneModal;
