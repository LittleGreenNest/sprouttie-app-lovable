import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const UpgradeBanner = ({ userPlan = 'free' }) => {
  const navigate = useNavigate();

  if (userPlan !== 'free') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-6 mb-6 shadow-md"
    >
      <div className="flex items-center gap-4">
        <div className="text-4xl">✨</div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-amber-900 mb-1">
            Unlock Family Tracking
          </h3>
          <p className="text-sm text-amber-800">
            Track who practiced with your child each day. Perfect for co-parents, grandparents, and caregivers working together!
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/plans')}
          className="px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all whitespace-nowrap"
        >
          View Plans
        </motion.button>
      </div>
    </motion.div>
  );
};

export default UpgradeBanner;
