import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useThisWeek } from './useThisWeek';
import SnapshotScreen from './screens/SnapshotScreen';
import PlanScreen from './screens/PlanScreen';
import DuringScreen from './screens/DuringScreen';
import ReflectionScreen from './screens/ReflectionScreen';

const ThisWeekFlow = ({ show, onClose }) => {
  const [screen, setScreen] = useState(0);
  const hook = useThisWeek();

  if (!show) return null;

  const screens = [
    <SnapshotScreen key="snap" onNext={() => setScreen(1)} {...hook} />,
    <PlanScreen key="plan" onNext={() => setScreen(2)} onBack={() => setScreen(0)} {...hook} />,
    <DuringScreen key="during" onNext={() => setScreen(3)} onBack={() => setScreen(1)} {...hook} />,
    <ReflectionScreen key="reflect" onPlanNext={() => setScreen(1)} onClose={onClose} {...hook} />,
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto relative"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-[hsl(var(--muted))] transition-colors"
          >
            <X className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
          </button>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 pt-4 pb-2">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === screen
                    ? 'bg-[hsl(var(--sprouttie-green))] w-6'
                    : i < screen
                    ? 'bg-[hsl(var(--sprouttie-green)/0.4)]'
                    : 'bg-[hsl(var(--muted))]'
                }`}
              />
            ))}
          </div>

          <div className="p-6">
            {screens[screen]}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ThisWeekFlow;
