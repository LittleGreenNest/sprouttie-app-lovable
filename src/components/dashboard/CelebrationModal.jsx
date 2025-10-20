import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CelebrationModal = ({ show, onClose, wordsFlashed = 0 }) => {
  useEffect(() => {
    if (show) {
      // Auto-close after 3 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  // Confetti animation
  const confettiColors = ['#FFD700', '#FF6B9D', '#4ECDC4', '#95E1D3', '#F38181'];
  const confettiPieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    color: confettiColors[i % confettiColors.length],
    x: Math.random() * 100 - 50,
    y: -20 - Math.random() * 20,
    rotation: Math.random() * 360,
    delay: Math.random() * 0.3
  }));

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
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
                duration: 1.5 + Math.random(),
                delay: piece.delay,
                ease: "easeOut"
              }}
              className="absolute w-3 h-3 rounded-sm"
              style={{ backgroundColor: piece.color }}
            />
          ))}

          {/* Celebration Message */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1.1, 1],
              opacity: 1
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ 
              duration: 0.5,
              ease: "easeOut"
            }}
            className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 max-w-md mx-4 border-4 border-sprouttie-green"
          >
            <motion.div
              animate={{ 
                rotate: [0, -10, 10, -10, 10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 0.6,
                repeat: 2,
                delay: 0.3
              }}
              className="text-7xl text-center mb-4"
            >
              ✨🌱✨
            </motion.div>
            
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-sprouttie-green-dark text-center mb-2"
            >
              Your garden grew today!
            </motion.h2>
            
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-gray-700 text-center mb-4"
            >
              {wordsFlashed > 0 && (
                <>You watered <span className="font-bold text-sprouttie-green-dark">{wordsFlashed} new sprout{wordsFlashed !== 1 ? 's' : ''}</span> today!</>
              )}
            </motion.p>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
              className="flex justify-center gap-3"
            >
              <div className="bg-gradient-to-r from-sprouttie-green to-sprouttie-green-light text-white font-semibold px-6 py-2 rounded-full">
                Keep growing! 🌿
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CelebrationModal;
