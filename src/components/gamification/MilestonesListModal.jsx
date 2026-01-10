import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MILESTONES } from '../../utils/milestones';

const MilestonesListModal = ({ show, onClose, achievedMilestones = [], stats = {} }) => {
  if (!show) return null;

  const allMilestones = Object.values(MILESTONES);
  
  // Group milestones by type
  const wordMilestones = allMilestones.filter(m => m.type === 'words').sort((a, b) => a.threshold - b.threshold);
  const streakMilestones = allMilestones.filter(m => m.type === 'streak').sort((a, b) => a.threshold - b.threshold);
  const sessionMilestones = allMilestones.filter(m => m.type === 'sessions').sort((a, b) => a.threshold - b.threshold);

  const isAchieved = (milestone) => achievedMilestones.includes(milestone.id);
  
  const getProgress = (milestone) => {
    const { learnedWords = 0, currentStreak = 0, totalSessions = 0 } = stats;
    
    switch (milestone.type) {
      case 'words':
        return Math.min(100, (learnedWords / milestone.threshold) * 100);
      case 'streak':
        return Math.min(100, (currentStreak / milestone.threshold) * 100);
      case 'sessions':
        return Math.min(100, (totalSessions / milestone.threshold) * 100);
      default:
        return 0;
    }
  };

  const MilestoneCard = ({ milestone }) => {
    const achieved = isAchieved(milestone);
    const progress = getProgress(milestone);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 rounded-xl border-2 transition-all ${
          achieved 
            ? 'bg-gradient-to-r from-sprouttie-green-light/30 to-sprouttie-mint border-sprouttie-green' 
            : 'bg-gray-50 border-gray-200'
        }`}
      >
        <div className="flex items-start gap-3">
          <span className={`text-3xl ${achieved ? '' : 'grayscale opacity-50'}`}>
            {milestone.icon}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className={`font-bold ${achieved ? 'text-sprouttie-green-dark' : 'text-gray-600'}`}>
                {milestone.title}
              </h4>
              {achieved && (
                <span className="text-xs bg-sprouttie-green text-white px-2 py-0.5 rounded-full">
                  ✓ Achieved
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500">🎁 {milestone.reward}</span>
            </div>
            {!achieved && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-sprouttie-green to-sprouttie-green-light h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const MilestoneSection = ({ title, emoji, milestones }) => (
    <div className="mb-6">
      <h3 className="text-lg font-bold text-sprouttie-green-dark mb-3 flex items-center gap-2">
        <span>{emoji}</span> {title}
      </h3>
      <div className="space-y-3">
        {milestones.map(milestone => (
          <MilestoneCard key={milestone.id} milestone={milestone} />
        ))}
      </div>
    </div>
  );

  const achievedCount = achievedMilestones.length;
  const totalCount = allMilestones.length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-sprouttie-green to-sprouttie-green-light p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">🏆 Your Milestones</h2>
                <p className="text-white/80 mt-1">
                  {achievedCount} of {totalCount} milestones achieved
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white text-2xl font-bold w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              >
                ×
              </button>
            </div>
            {/* Overall progress bar */}
            <div className="mt-4">
              <div className="w-full bg-white/30 rounded-full h-3">
                <div 
                  className="bg-white h-3 rounded-full transition-all"
                  style={{ width: `${(achievedCount / totalCount) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
            <MilestoneSection 
              title="Words Introduced" 
              emoji="📚" 
              milestones={wordMilestones} 
            />
            <MilestoneSection 
              title="Continuity" 
              emoji="🌿" 
              milestones={streakMilestones} 
            />
            <MilestoneSection 
              title="Sessions Completed" 
              emoji="🎯" 
              milestones={sessionMilestones} 
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MilestonesListModal;
