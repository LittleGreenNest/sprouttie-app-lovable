import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, Layers, BookOpen, MoreHorizontal, X, History, ListChecks, MessageCircle, Headphones, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PRIMARY_TABS = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'daily-tracking', label: 'Log', icon: CalendarCheck },
  { id: 'manage-flashcards', label: 'Cards', icon: Layers },
  { id: 'book-recommendations', label: 'Books', icon: BookOpen },
];

const MORE_TABS = [
  { id: 'flashed-history', label: 'Flashed History', icon: History },
  { id: 'all-words', label: 'All Words', icon: ListChecks },
  { id: 'spoken-words', label: 'Words He Says', icon: MessageCircle },
  { id: 'pronunciation', label: 'Pronunciation', icon: Headphones },
  { id: 'word-planner', label: 'Word Planner', icon: CalendarDays },
];

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
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setMoreOpen(false)}
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl pb-safe"
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <h3 className="text-base font-semibold text-[hsl(var(--sprouttie-ink))]">More</h3>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="px-3 pb-6 grid grid-cols-3 gap-2">
                {MORE_TABS.map(tab => {
                  const Icon = tab.icon;
                  const active = isActive(tab.id);
                  return (
                    <button
                      key={tab.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNav(tab.id);
                      }}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all text-center ${
                        active
                          ? 'bg-[hsl(var(--sprouttie-green)/0.12)] text-[hsl(var(--sprouttie-green-dark))]'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium leading-tight">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-lg border-t border-slate-200/80 pb-safe">
        <div className="max-w-lg mx-auto flex items-stretch justify-around px-1">
          {PRIMARY_TABS.map(tab => {
            const Icon = tab.icon;
            const active = isActive(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => handleNav(tab.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                  active
                    ? 'text-[hsl(var(--sprouttie-green-dark))]'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : ''}`} />
                <span className={`text-[10px] leading-tight ${active ? 'font-semibold' : 'font-medium'}`}>
                  {tab.label}
                </span>
                {active && (
                  <motion.div
                    layoutId="bottomTabIndicator"
                    className="absolute top-0 w-8 h-0.5 rounded-full bg-[hsl(var(--sprouttie-green))]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}

          {/* More button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMoreOpen(!moreOpen);
            }}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
              isMoreActive
                ? 'text-[hsl(var(--sprouttie-green-dark))]'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <MoreHorizontal className={`w-5 h-5 ${isMoreActive ? 'stroke-[2.5]' : ''}`} />
            <span className={`text-[10px] leading-tight ${isMoreActive ? 'font-semibold' : 'font-medium'}`}>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default BottomTabBar;
