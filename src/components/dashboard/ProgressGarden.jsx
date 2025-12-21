import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import gardenStage0 from '../../assets/garden-stage-0.png';
import gardenStage1 from '../../assets/garden-stage-1.png';
import gardenStage2 from '../../assets/garden-stage-2.png';
import gardenStage3 from '../../assets/garden-stage-3.png';
import gardenStage4 from '../../assets/garden-stage-4.png';
import gardenStage5 from '../../assets/garden-stage-5.png';

const ProgressGarden = ({ stats }) => {
  const navigate = useNavigate();
  
  const gardenStages = [
    gardenStage0, gardenStage1, gardenStage2, 
    gardenStage3, gardenStage4, gardenStage5
  ];

  const getGardenStage = () => {
    if (stats.currentStreak === 0) return { stage: 0, image: gardenStages[0] };
    if (stats.currentStreak <= 3) return { stage: 1, image: gardenStages[1] };
    if (stats.currentStreak <= 7) return { stage: 2, image: gardenStages[2] };
    if (stats.currentStreak <= 14) return { stage: 3, image: gardenStages[3] };
    if (stats.currentStreak <= 21) return { stage: 4, image: gardenStages[4] };
    return { stage: 5, image: gardenStages[5] };
  };

  const getGardenMessage = () => {
    if (stats.currentStreak === 0) return "Plant your first seed today!";
    if (stats.currentStreak <= 3) return "Your seedling is taking root!";
    if (stats.currentStreak <= 7) return "Beautiful blooms are emerging!";
    if (stats.currentStreak <= 14) return "Your garden is flourishing!";
    if (stats.currentStreak <= 21) return "Gorgeous flowers in full bloom!";
    return "A magnificent garden bursting with life!";
  };

  // Calculate weekly growth (mock data for visualization)
  const weeklyGrowth = Array.from({ length: 7 }, (_, i) => {
    const dayAgo = 6 - i;
    const height = Math.max(0, Math.min(100, (stats.currentStreak - dayAgo) * 10));
    return height;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="glass p-8 rounded-3xl shadow-lg mb-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-sprouttie-green-dark flex items-center gap-2">
          <span>🌿</span>
          Your Progress Garden
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/garden-guide')}
            className="flex items-center gap-1 text-sm text-sprouttie-green hover:text-sprouttie-green-dark transition-colors"
            title="View Garden Guide"
          >
            <HelpCircle size={16} />
            <span className="hidden sm:inline">How it works</span>
          </button>
          <div className="text-sm text-gray-600 bg-white/50 px-4 py-2 rounded-full">
            Week {Math.ceil(stats.currentStreak / 7)}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Garden Image */}
        <div className="flex items-center justify-center">
          <motion.div
            key={getGardenStage().stage}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: [0.8, 1.05, 1],
              opacity: 1
            }}
            transition={{ 
              duration: 0.8,
              ease: "easeOut"
            }}
            className="relative w-64 h-64 flex items-center justify-center"
          >
            <motion.img 
              src={getGardenStage().image} 
              alt={`Garden growth stage ${getGardenStage().stage}`}
              className="w-full h-full object-contain drop-shadow-2xl"
              animate={{ 
                y: [0, -5, 0],
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            {/* Sparkle effects for high streaks */}
            {stats.currentStreak > 7 && (
              <>
                <motion.div
                  className="absolute top-10 right-10 text-2xl"
                  animate={{ 
                    scale: [0, 1, 0],
                    rotate: [0, 180, 360]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    delay: 0
                  }}
                >
                  ✨
                </motion.div>
                <motion.div
                  className="absolute bottom-10 left-10 text-2xl"
                  animate={{ 
                    scale: [0, 1, 0],
                    rotate: [0, -180, -360]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    delay: 1
                  }}
                >
                  ✨
                </motion.div>
              </>
            )}
          </motion.div>
        </div>

        {/* Weekly Growth Visualization */}
        <div className="flex flex-col justify-center">
          <div className="text-center mb-4">
            <motion.p 
              key={getGardenMessage()}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-lg text-gray-700 font-medium mb-2"
            >
              {getGardenMessage()}
            </motion.p>
            <p className="text-sm text-gray-600">
              {stats.currentStreak} day streak • Keep growing! 🌱
            </p>
          </div>

          {/* Weekly Growth Bars */}
          <div className="bg-white/50 rounded-2xl p-4 mb-4">
            <p className="text-xs font-semibold text-gray-600 mb-3 text-center">Weekly Growth</p>
            <div className="flex items-end justify-around gap-2 h-24">
              {weeklyGrowth.map((height, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: idx * 0.1, duration: 0.5 }}
                    className="w-full bg-gradient-to-t from-sprouttie-green to-sprouttie-green-light rounded-t-lg min-h-[4px]"
                  />
                  <span className="text-xs text-gray-500">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'][idx]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress to Next Milestone */}
          <div className="bg-gradient-to-r from-sprouttie-beige to-sprouttie-mint rounded-2xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-gray-700">Progress to Next Milestone</span>
              <span className="font-bold text-sprouttie-green-dark">
                {Math.min((stats.currentStreak / 30) * 100, 100).toFixed(0)}%
              </span>
            </div>
            <div className="bg-white/50 rounded-full h-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((stats.currentStreak / 30) * 100, 100)}%` }}
                transition={{ duration: 1.5, delay: 0.5 }}
                className="h-full bg-gradient-to-r from-sprouttie-green to-emerald-400 rounded-full"
              />
            </div>
            <p className="text-xs text-gray-600 text-center mt-2">
              {30 - stats.currentStreak > 0 
                ? `${30 - stats.currentStreak} days to Master Gardener! 🏆` 
                : 'Master Gardener achieved! 🎉'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProgressGarden;
