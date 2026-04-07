import React from 'react';
import { motion } from 'framer-motion';
import { Sprout } from 'lucide-react';

const ThisWeekCard = ({ onOpen }) => (
  <motion.button
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onOpen}
    className="w-full bg-white rounded-2xl p-5 shadow-md border border-[hsl(var(--border))] text-left mb-6 transition-all hover:shadow-lg"
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[hsl(var(--sprouttie-green)/0.12)] flex items-center justify-center">
          <Sprout className="w-5 h-5 text-[hsl(var(--sprouttie-green))]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[hsl(var(--sprouttie-ink))]">This Week 🌱</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Your gentle weekly plan</p>
        </div>
      </div>
      <span className="text-[hsl(var(--sprouttie-green))] font-semibold text-sm">Open →</span>
    </div>
  </motion.button>
);

export default ThisWeekCard;
