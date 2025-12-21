import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Lock } from 'lucide-react';
import gardenStage0 from '../../assets/garden-stage-0.png';
import gardenStage1 from '../../assets/garden-stage-1.png';
import gardenStage2 from '../../assets/garden-stage-2.png';
import gardenStage3 from '../../assets/garden-stage-3.png';
import gardenStage4 from '../../assets/garden-stage-4.png';
import gardenStage5 from '../../assets/garden-stage-5.png';

const GARDEN_STAGES = [
  {
    stage: 0,
    image: gardenStage0,
    title: 'Empty Plot',
    streakRange: '0 days',
    description: 'Plant your first seed today!',
    tip: 'Start your journey by flashing cards consistently.',
  },
  {
    stage: 1,
    image: gardenStage1,
    title: 'Sprouting Seedling',
    streakRange: '1-3 days',
    description: 'Your seedling is taking root!',
    tip: 'Keep the momentum going for 3 days to see growth.',
  },
  {
    stage: 2,
    image: gardenStage2,
    title: 'Growing Plant',
    streakRange: '4-7 days',
    description: 'Beautiful blooms are emerging!',
    tip: 'One week of consistency unlocks beautiful blooms.',
  },
  {
    stage: 3,
    image: gardenStage3,
    title: 'Flourishing Garden',
    streakRange: '8-14 days',
    description: 'Your garden is flourishing!',
    tip: 'Two weeks of dedication creates a flourishing garden.',
  },
  {
    stage: 4,
    image: gardenStage4,
    title: 'Full Bloom',
    streakRange: '15-21 days',
    description: 'Gorgeous flowers in full bloom!',
    tip: 'Three weeks unlocks the most beautiful flowers.',
  },
  {
    stage: 5,
    image: gardenStage5,
    title: 'Master Garden',
    streakRange: '22+ days',
    description: 'A magnificent garden bursting with life!',
    tip: 'You are a Master Gardener! Keep nurturing your garden.',
  },
];

const GardenGuide = ({ currentStreak = 0 }) => {
  const navigate = useNavigate();

  const getCurrentStage = () => {
    if (currentStreak === 0) return 0;
    if (currentStreak <= 3) return 1;
    if (currentStreak <= 7) return 2;
    if (currentStreak <= 14) return 3;
    if (currentStreak <= 21) return 4;
    return 5;
  };

  const currentStageIndex = getCurrentStage();

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sprouttie-green-dark hover:text-sprouttie-green mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Dashboard</span>
        </button>
        
        <h1 className="text-3xl font-bold text-sprouttie-green-dark flex items-center gap-3">
          <span>🌿</span>
          Garden Growth Guide
        </h1>
        <p className="text-gray-600 mt-2">
          Watch your garden grow as you build your learning streak!
        </p>
      </motion.div>

      {/* Current Progress Indicator */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="glass p-6 rounded-2xl mb-8 bg-gradient-to-r from-sprouttie-mint to-sprouttie-beige"
      >
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 flex-shrink-0">
            <img
              src={GARDEN_STAGES[currentStageIndex].image}
              alt={GARDEN_STAGES[currentStageIndex].title}
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Your Current Stage</p>
            <h2 className="text-xl font-bold text-sprouttie-green-dark">
              {GARDEN_STAGES[currentStageIndex].title}
            </h2>
            <p className="text-gray-700">
              {currentStreak} day streak • {GARDEN_STAGES[currentStageIndex].description}
            </p>
          </div>
        </div>
      </motion.div>

      {/* All Stages Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {GARDEN_STAGES.map((stage, index) => {
          const isUnlocked = index <= currentStageIndex;
          const isCurrent = index === currentStageIndex;

          return (
            <motion.div
              key={stage.stage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-6 rounded-2xl border-2 transition-all ${
                isCurrent
                  ? 'border-sprouttie-green bg-gradient-to-br from-sprouttie-mint/50 to-white shadow-lg'
                  : isUnlocked
                  ? 'border-sprouttie-green/30 bg-white/80'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              {/* Status Badge */}
              <div className="absolute top-3 right-3">
                {isCurrent ? (
                  <span className="px-3 py-1 bg-sprouttie-green text-white text-xs font-bold rounded-full">
                    Current
                  </span>
                ) : isUnlocked ? (
                  <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    <Check size={12} />
                    Unlocked
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-500 text-xs font-medium rounded-full">
                    <Lock size={12} />
                    Locked
                  </span>
                )}
              </div>

              {/* Stage Image */}
              <div className={`w-32 h-32 mx-auto mb-4 ${!isUnlocked ? 'opacity-40 grayscale' : ''}`}>
                <motion.img
                  src={stage.image}
                  alt={stage.title}
                  className="w-full h-full object-contain"
                  animate={isCurrent ? { y: [0, -5, 0] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>

              {/* Stage Info */}
              <div className="text-center">
                <h3 className={`text-lg font-bold mb-1 ${isUnlocked ? 'text-sprouttie-green-dark' : 'text-gray-400'}`}>
                  {stage.title}
                </h3>
                <p className={`text-sm font-medium mb-2 ${isUnlocked ? 'text-sprouttie-green' : 'text-gray-400'}`}>
                  {stage.streakRange}
                </p>
                <p className={`text-sm ${isUnlocked ? 'text-gray-600' : 'text-gray-400'}`}>
                  {stage.description}
                </p>
              </div>

              {/* Tip */}
              {isUnlocked && (
                <div className="mt-4 p-3 bg-sprouttie-beige/50 rounded-xl">
                  <p className="text-xs text-gray-600">
                    💡 <span className="font-medium">Tip:</span> {stage.tip}
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Footer CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8 text-center"
      >
        <button
          onClick={() => navigate('/daily-tracking')}
          className="px-8 py-3 bg-sprouttie-green text-white font-semibold rounded-full hover:bg-sprouttie-green-dark transition-colors shadow-lg"
        >
          Start Flashing Cards 🌱
        </button>
      </motion.div>
    </div>
  );
};

export default GardenGuide;
