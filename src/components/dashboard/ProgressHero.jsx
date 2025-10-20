import React from 'react';
import { motion } from 'framer-motion';

const ProgressHero = ({ stats, progressPercent }) => {
  return (
    <div className="grid md:grid-cols-2 gap-6 mb-6">
      {/* Words Learned - Hero Element */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass rounded-3xl p-8 shadow-xl border border-white/50 hover-glow"
      >
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-semibold text-gray-600 mb-4">Words Learned</h3>
          
          {/* Large Circular Progress */}
          <div className="relative w-48 h-48 mb-4">
            <svg className="transform -rotate-90 w-48 h-48">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-sprouttie-beige"
              />
              <motion.circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 88}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 88 }}
                animate={{ 
                  strokeDashoffset: 2 * Math.PI * 88 * (1 - progressPercent / 100) 
                }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="text-sprouttie-green"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                className="text-5xl font-bold text-sprouttie-green-dark"
              >
                {progressPercent}%
              </motion.span>
              <motion.span 
                animate={{ 
                  y: [0, -8, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 1
                }}
                className="text-4xl mt-2"
              >
                🌱
              </motion.span>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-800 mb-1">
              {stats.learnedWords}
              <span className="text-xl text-gray-500 font-normal"> / {stats.totalFlashcards}</span>
            </p>
            <p className="text-sm text-gray-600">
              {stats.learnedWords === 0 
                ? "Start your learning journey!" 
                : stats.learnedWords < 10 
                ? "Great start! Keep going 🌿" 
                : stats.learnedWords < 25 
                ? "You're growing strong! 🌿✨"
                : "Amazing progress! 🌟"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Current Streak - Hero Element */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="glass rounded-3xl p-8 shadow-xl border border-white/50 hover-glow"
      >
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-semibold text-gray-600 mb-4">Current Streak</h3>
          
          {/* Large Streak Display */}
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3
            }}
            className="mb-4"
          >
            <div className="text-8xl mb-2">
              {stats.currentStreak === 0 ? '🌱' : 
               stats.currentStreak < 3 ? '🌿' :
               stats.currentStreak < 7 ? '🍃' :
               stats.currentStreak < 14 ? '🌸' :
               stats.currentStreak < 21 ? '🌻' : '🌺'}
            </div>
          </motion.div>
          
          <div className="text-center">
            <motion.p 
              key={stats.currentStreak}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="text-5xl font-bold text-gray-800 mb-1"
            >
              {stats.currentStreak}
            </motion.p>
            <p className="text-xl text-gray-600 mb-3">day{stats.currentStreak !== 1 ? 's' : ''}</p>
            
            <div className="bg-gradient-to-r from-orange-100 to-yellow-100 rounded-full px-6 py-2">
              <p className="text-sm font-medium text-orange-700">
                {stats.currentStreak === 0 
                  ? "Start today! 🔥" 
                  : stats.currentStreak < 3 
                  ? "Building momentum! 🔥"
                  : stats.currentStreak < 7
                  ? "On fire! Keep it up! 🔥🔥"
                  : stats.currentStreak < 14
                  ? "Unstoppable! 🔥🔥🔥"
                  : "Legendary streak! 🔥🔥🔥🔥"}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProgressHero;
