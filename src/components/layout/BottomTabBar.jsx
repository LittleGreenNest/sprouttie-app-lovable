import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, Sprout, BookOpen, MoreHorizontal, X, History, ListChecks, CalendarDays, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PRIMARY_TABS = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'daily-tracking', label: 'Log', icon: CalendarCheck },
  { id: 'words', label: 'Words', icon: Sprout },
  { id: 'book-recommendations', label: 'Books', icon: BookOpen },
];

const MORE_TABS = [
  { id: 'word-planner', label: 'Word Planner', icon: CalendarDays },
  { id: 'flashed-history', label: 'Flashed History', icon: History },
  { id: 'all-words', label: 'All Words', icon: ListChecks },
  { id: 'scan-flashcards', label: 'Scan Cards', icon: Camera },
];

const TabButton = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className="flex-1 flex flex-col items-center gap-1 py-2 relative transition-all duration-200"
  >
    <div className={`relative flex items-center justify-center w-10 h-8 rounded-2xl transition-all duration-300 ${
      active 
        ? 'bg-[hsl(var(--sprouttie-green)/0.15)]' 
        : ''
    }`}>
      <Icon className={`w-[22px] h-[22px] transition-all duration-200 ${
        active 
          ? 'text-[hsl(var(--sprouttie-green-dark))] stroke-[2.2]' 
          : 'text-slate-400 stroke-[1.8]'
      }`} />
    </div>
    <span className={`text-[11px] leading-none transition-colors duration-200 ${
      active 
        ? 'text-[hsl(var(--sprouttie-green-dark))] font-semibold' 
        : 'text-slate-400 font-medium'
    }`}>
      {label}
    </span>
  </button>
);

const BottomTabBar = () => {
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname.replace('/', '');

  const handleNav = (id) => {
    navigate(`/${id}`);
    setMoreOpen(false);
  };

  const isActive = (id) => currentPath === id;
  const isMoreActive = MORE_TABS.some(t => isActive(t.id));

  return (
    <>
      {/* "More" overlay sheet */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl pb-safe"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
              </div>
              <div className="flex items-center justify-between px-5 pt-1 pb-3">
                <h3 className="text-base font-bold text-[hsl(var(--sprouttie-ink))]">More Features</h3>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="px-4 pb-8 grid grid-cols-3 gap-3">
                {MORE_TABS.map(tab => {
                  const Icon = tab.icon;
                  const active = isActive(tab.id);
                  return (
                    <motion.button
                      key={tab.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNav(tab.id);
                      }}
                      className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl transition-all text-center border ${
                        active
                          ? 'bg-[hsl(var(--sprouttie-green)/0.1)] border-[hsl(var(--sprouttie-green)/0.3)] text-[hsl(var(--sprouttie-green-dark))]'
                          : 'border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        active 
                          ? 'bg-[hsl(var(--sprouttie-green)/0.15)]' 
                          : 'bg-slate-50'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-medium leading-tight">{tab.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 pb-safe">
        {/* Gradient fade above the bar */}
        <div className="h-6 bg-gradient-to-t from-white/90 to-transparent pointer-events-none" />
        <div className="bg-white/95 backdrop-blur-xl border-t border-slate-100 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.08)]">
          <div className="max-w-lg mx-auto flex items-stretch justify-around px-2">
            {PRIMARY_TABS.map(tab => (
              <TabButton
                key={tab.id}
                icon={tab.icon}
                label={tab.label}
                active={isActive(tab.id)}
                onClick={() => handleNav(tab.id)}
              />
            ))}

            {/* More button */}
            <TabButton
              icon={MoreHorizontal}
              label="More"
              active={isMoreActive}
              onClick={(e) => {
                e?.stopPropagation?.();
                setMoreOpen(!moreOpen);
              }}
            />
          </div>
        </div>
      </nav>
    </>
  );
};

export default BottomTabBar;
